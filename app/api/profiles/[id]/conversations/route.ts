// app/api/profiles/[id]/conversations/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';
import * as conversations from '@/services/conversations';

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * @swagger
 * /api/profiles/{id}/conversations:
 *   get:
 *     tags:
 *       - Conversations of Profiles
 *     summary: Get a profile's n most recent conversations
 *     description:
 *       Returns up to n of the profile's conversation threads, most recently
 *       updated first.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to look up
 *          schema:
 *              type: string
 *        - name: n
 *          in: query
 *          required: true
 *          description: how many of the most recent conversations to return (1-50)
 *          schema:
 *              type: integer
 *     responses:
 *       200:
 *         description: Successfully fetched the profile's recent conversations.
 *       400:
 *         description: Missing or invalid profile id / n.
 *       404:
 *         description: No profile found for the given id.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const resolved_params = await context.params;
        const profile_id = Number(resolved_params.id);
        if (!Number.isInteger(profile_id)) {
            return NextResponse.json({ success: false, error: "A valid profile id is required." }, { status: 400 });
        }

        const n = Number(request.nextUrl.searchParams.get("n"));
        if (!Number.isInteger(n) || n < 1 || n > 50) {
            return NextResponse.json({ success: false, error: "n must be an integer between 1 and 50." }, { status: 400 });
        }

        const profile = await profiles.getProfileById(profile_id);
        if (!profile) {
            return NextResponse.json({ success: false, error: "No profile found for the given id." }, { status: 404 });
        }

        const recent = await conversations.getConversationsByProfile(profile_id, n);
        return NextResponse.json({ success: true, count: recent.length, data: recent }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/profiles/{id}/conversations:
 *   put:
 *     tags:
 *       - Conversations of Profiles
 *     summary: Add a conversation entry for a profile
 *     description:
 *       Creates a new conversation thread for a profile, storing the given
 *       message history so it can later be replayed as context to the AI agent.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to add a conversation to
 *          schema:
 *              type: string
 *     requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  title:
 *                      type: string
 *                  chatContext:
 *                      type: array
 *                      items:
 *                          type: object
 *                          properties:
 *                              role:
 *                                  type: string
 *                              content:
 *                                  type: string
 *     responses:
 *       201:
 *         description: Successfully created the conversation entry.
 *       400:
 *         description: Missing or invalid profile id / chatContext.
 *       404:
 *         description: No profile found for the given id.
 *       500:
 *         description: Core internal server network execution block.
 */
/**
 * @swagger
 * /api/profiles/{id}/conversations:
 *   delete:
 *     tags:
 *       - Conversations of Profiles
 *     summary: Delete a conversation thread
 *     description:
 *       Deletes a single conversation thread, after verifying it belongs to
 *       the given profile.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile that owns the conversation
 *          schema:
 *              type: string
 *        - name: conversationId
 *          in: query
 *          required: true
 *          description: id of the conversation to delete
 *          schema:
 *              type: integer
 *     responses:
 *       200:
 *         description: Successfully deleted the conversation.
 *       400:
 *         description: Missing or invalid profile id / conversationId.
 *       404:
 *         description: No profile or conversation found for the given ids.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const resolved_params = await context.params;
        const profile_id = Number(resolved_params.id);
        if (!Number.isInteger(profile_id)) {
            return NextResponse.json({ success: false, error: "A valid profile id is required." }, { status: 400 });
        }

        const conversationId = Number(request.nextUrl.searchParams.get("conversationId"));
        if (!Number.isInteger(conversationId)) {
            return NextResponse.json({ success: false, error: "A valid conversationId is required." }, { status: 400 });
        }

        const conversation = await conversations.getConversationById(conversationId);
        if (!conversation || conversation.profileId !== profile_id) {
            return NextResponse.json({ success: false, error: "No conversation found for the given ids." }, { status: 404 });
        }

        await conversations.deleteConversation(conversationId);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const resolved_params = await context.params;
        const profile_id = Number(resolved_params.id);
        if (!Number.isInteger(profile_id)) {
            return NextResponse.json({ success: false, error: "A valid profile id is required." }, { status: 400 });
        }

        const data = await request.json();
        const chatContext = data.chatContext;
        if (!Array.isArray(chatContext) || chatContext.length === 0) {
            return NextResponse.json({ success: false, error: "A valid chatContext array is required." }, { status: 400 });
        }
        const title = typeof data.title === "string" ? data.title.trim() : undefined;

        const profile = await profiles.getProfileById(profile_id);
        if (!profile) {
            return NextResponse.json({ success: false, error: "No profile found for the given id." }, { status: 404 });
        }

        const created = await conversations.createConversation(profile_id, title, chatContext);
        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
