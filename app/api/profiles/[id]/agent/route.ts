// app/api/profiles/[id]/agent/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';
import * as roles from '@/services/roles';
import * as match from '@/services/match';
import * as conversations from '@/services/conversations';
import { didUpdateProfile, streamAgentReply, type AgentAvailableRole, type AgentProfileContext } from '@/services/agent';
import type { ChatMessage } from '@/services/conversations';

interface RouteContext {
    params: Promise<{ id: string }>
}

// Caps how many prior messages get resent to the model each turn, so a
// long-running conversation doesn't grow the request (and cost/latency)
// without bound. The full conversation is still persisted in the DB
// regardless — see fullHistory vs history below.
const MAX_HISTORY_MESSAGES = 20;

function isChatMessage(entry: unknown): entry is ChatMessage {
    if (typeof entry !== 'object' || entry === null) return false;

    const { role, content } = entry as Record<string, unknown>;
    return (role === 'user' || role === 'assistant') && typeof content === 'string';
}

/**
 * @swagger
 * /api/profiles/{id}/agent:
 *   post:
 *     tags:
 *       - AI Agent
 *     summary: Send a message to the AI career agent
 *     description:
 *       Streams a reply from the AI career agent using the profile's skills,
 *       target role, and match score as context, then persists the exchange
 *       to the profile's conversation history (creating a new conversation if
 *       no conversationId is given). Response body is newline-delimited JSON,
 *       one {"type":"delta","text":"..."} line per text chunk, followed by a
 *       final {"type":"done","conversationId":N,"profileUpdated":bool} line
 *       (or {"type":"error","error":"..."} if generation fails mid-stream).
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile chatting with the agent
 *          schema:
 *              type: string
 *     requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                      type: string
 *                  conversationId:
 *                      type: integer
 *                  history:
 *                      type: array
 *                      items:
 *                          type: object
 *                          properties:
 *                              role:
 *                                  type: string
 *                              content:
 *                                  type: string
 *     responses:
 *       200:
 *         description: Successfully generated a reply.
 *       400:
 *         description: Missing or invalid profile id / message.
 *       404:
 *         description: No profile found for the given id.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const resolved_params = await context.params;
        const profile_id = Number(resolved_params.id);
        if (!Number.isInteger(profile_id)) {
            return NextResponse.json({ success: false, error: "A valid profile id is required." }, { status: 400 });
        }

        const data = await request.json();
        const message = typeof data.message === "string" ? data.message.trim() : "";
        if (!message) {
            return NextResponse.json({ success: false, error: "A non-empty message is required." }, { status: 400 });
        }

        const conversationId = Number.isInteger(data.conversationId) ? Number(data.conversationId) : null;
        const fullHistory: ChatMessage[] = Array.isArray(data.history) ? data.history.filter(isChatMessage) : [];
        // Caps what gets sent to the model each turn so a long-running
        // conversation doesn't grow the request (and cost/latency) forever —
        // older messages are dropped, not summarized, so very old context
        // is lost rather than condensed. The full history still stays in
        // the DB either way; this only bounds what's resent per turn.
        const history = fullHistory.slice(-MAX_HISTORY_MESSAGES);

        const profile = await profiles.getProfileById(profile_id);
        if (!profile) {
            return NextResponse.json({ success: false, error: "No profile found for the given id." }, { status: 404 });
        }

        const targetRole = profile.roleId ? await roles.getRoleById(profile.roleId) : null;

        let matchScore: number | null = null;
        if (targetRole) {
            const scores = await match.getRoleMatchScores(profile_id);
            matchScore = scores.find((entry) => entry.roleId === targetRole.roleId)?.score ?? null;
        }

        const { currentRole, experienceHighlights } = profiles.extractResumeSummary(profile.profexperience);

        const allRoles = await roles.getRolesList(100);
        const availableRoles: AgentAvailableRole[] = allRoles.flatMap((role) =>
            role.role ? [{ roleId: role.roleId, name: role.role }] : [],
        );

        // Statuses match the "In Progress" (1) / "Complete" (2) convention
        // already used by GrindContainer/GrindPage for profile_resource rows.
        const IN_PROGRESS_STATUS_ID = 1;
        const COMPLETED_STATUS_ID = 2;

        const profileCourses = await profiles.getResourcesByProfile(profile_id, undefined, "course");
        const courseName = (item: (typeof profileCourses)[number]) =>
            item.resource?.courses
                ? `${item.resource.courses.course_id} - ${item.resource.name}`
                : item.resource?.name ?? null;

        const coursesInProgress = profileCourses
            .filter((item) => item.statusId === IN_PROGRESS_STATUS_ID)
            .map(courseName)
            .filter((name): name is string => Boolean(name));
        const coursesCompleted = profileCourses
            .filter((item) => item.statusId === COMPLETED_STATUS_ID)
            .map(courseName)
            .filter((name): name is string => Boolean(name));

        const agentContext: AgentProfileContext = {
            name: profile.fullname ?? "there",
            currentRole,
            location: profile.location,
            education: profile.highestDegree && profile.highestDegree !== "N/A" ? profile.highestDegree : null,
            skills: profile.skills
                ? profile.skills.split(",").map((skill: string) => skill.trim()).filter(Boolean)
                : [],
            yearsOfExperience: profile.yearofexperience,
            experienceHighlights,
            targetRole: targetRole?.role ?? null,
            matchScore,
            availableRoles,
            coursesInProgress,
            coursesCompleted,
        };

        const result = streamAgentReply(agentContext, history, message, profile_id);

        // Streams the reply as newline-delimited JSON: one {"type":"delta",...}
        // line per text chunk, then a final {"type":"done",...} line once the
        // full reply is generated and persisted (or {"type":"error",...} if
        // something fails after streaming has already started, since the
        // response status is already committed by then).
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                try {
                    for await (const chunk of result.textStream) {
                        controller.enqueue(encoder.encode(JSON.stringify({ type: 'delta', text: chunk }) + '\n'));
                    }

                    const [reply, toolResults] = await Promise.all([result.text, result.toolResults]);
                    const profileUpdated = didUpdateProfile(toolResults);

                    const now = new Date().toISOString();
                    const updatedHistory: ChatMessage[] = [
                        ...fullHistory,
                        { role: 'user', content: message, timestamp: now },
                        { role: 'assistant', content: reply, timestamp: now },
                    ];

                    const conversation = conversationId
                        ? await conversations.updateConversationContext(conversationId, updatedHistory)
                        : await conversations.createConversation(profile_id, message.slice(0, 60), updatedHistory);

                    controller.enqueue(encoder.encode(JSON.stringify({
                        type: 'done',
                        conversationId: conversation.conversationId,
                        profileUpdated,
                    }) + '\n'));
                } catch (error: any) {
                    controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', error: error.message }) + '\n'));
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
