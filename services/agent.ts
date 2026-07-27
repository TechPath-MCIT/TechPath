// services/agent.ts
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { ChatMessage } from '@/services/conversations';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export interface AgentProfileContext {
  name: string;
  currentRole: string | null;
  location: string | null;
  education: string | null;
  skills: string[];
  yearsOfExperience: number | null;
  experienceHighlights: string[];
  targetRole: string | null;
  matchScore: number | null;
}

function buildSystemPrompt(context: AgentProfileContext): string {
  const lines = [
    "You are the TechPath AI Career Agent, a helpful assistant that helps users plan their career, close skill gaps, and find learning resources.",
    `The user's name is ${context.name}.`,
    context.currentRole ? `Their current role is ${context.currentRole}.` : null,
    context.location ? `They are based in ${context.location}.` : null,
    context.education ? `Their highest level of education is ${context.education}.` : null,
    context.skills.length
      ? `Their current skills: ${context.skills.join(', ')}.`
      : "They haven't listed any skills yet.",
    context.yearsOfExperience != null
      ? `They have ${context.yearsOfExperience} years of experience.`
      : null,
    context.experienceHighlights.length
      ? `Notable experience highlights:\n${context.experienceHighlights.map((highlight) => `- ${highlight}`).join('\n')}`
      : null,
    context.targetRole
      ? `Their target role is ${context.targetRole}${
          context.matchScore != null ? ` (current match score: ${context.matchScore}%)` : ''
        }.`
      : "They haven't picked a target role yet.",
    "Keep responses concise, encouraging, and actionable. Suggest concrete next steps or resources when relevant.",
  ].filter((line): line is string => line !== null);

  return lines.join('\n');
}

/**
 * Generates the agent's reply for one turn of a conversation, given the
 * profile's context and the prior message history.
 */
export async function generateAgentReply(
  context: AgentProfileContext,
  history: ChatMessage[],
  message: string,
): Promise<string> {
  const result = await generateText({
    model: google('gemini-2.5-flash'),
    system: buildSystemPrompt(context),
    messages: [
      ...history.map((entry) => ({ role: entry.role, content: entry.content })),
      { role: 'user' as const, content: message },
    ],
  });

  return result.text;
}
