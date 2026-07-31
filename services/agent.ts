// services/agent.ts
import { generateText, stepCountIs, tool } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import type { ChatMessage } from '@/services/conversations';
import * as profiles from '@/services/profiles';
import * as skills from '@/services/skills';
import * as roles from '@/services/roles';
import * as resourcesSvc from '@/services/resources';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export interface AgentAvailableRole {
  roleId: number;
  name: string;
}

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
  availableRoles: AgentAvailableRole[];
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
    "You can directly update the user's profile with the set_target_role, add_skills, remove_skills, set_location, set_years_of_experience, update_education, and add_work_experience tools. Only call one of these when the user has clearly asked for that specific change — don't call a tool just because a role, skill, job, or degree was mentioned in conversation.",
    "Use get_skill_gaps, find_resources_for_skill, and get_role_details freely and proactively — they're read-only, so no need to wait for an explicit request. Call them whenever they'd make your advice concrete: get_skill_gaps when discussing a role's requirements or the user's readiness, find_resources_for_skill before recommending how to learn something, get_role_details whenever salary, compensation, responsibilities, or job titles come up.",
    "Always check a tool's result before describing what happened. If it reports success: false, or lists any names under fields like notFound, notInCatalog, or notOnProfile, tell the user honestly what did and didn't work — never claim something was added, removed, or changed if the tool result says otherwise.",
    "After a successful profile update, always start your reply with a clear, explicit confirmation of exactly what changed (e.g. \"I've updated your target role to Front-End Developer.\") before adding any advice, skill-gap analysis, or commentary. Don't jump straight into advice without confirming the change first — the user needs to know the action actually happened.",
    context.availableRoles.length
      ? `Available target roles (use the exact id with set_target_role):\n${context.availableRoles
          .map((role) => `- ${role.roleId}: ${role.name}`)
          .join('\n')}`
      : null,
  ].filter((line): line is string => line !== null);

  return lines.join('\n');
}

function buildAgentTools(profileId: number, availableRoles: AgentAvailableRole[]) {
  return {
    set_target_role: tool({
      description:
        "Set the user's target/dream career role. Only call this when the user explicitly asks to set or change their target role to a specific role from the available list.",
      inputSchema: z.object({
        roleId: z
          .number()
          .int()
          .describe('The numeric id of the target role, taken from the available roles list.'),
      }),
      execute: async ({ roleId }) => {
        const role = availableRoles.find((candidate) => candidate.roleId === roleId);
        if (!role) {
          return { success: false, error: `${roleId} is not a valid role id.` };
        }

        await profiles.setDreamRole(profileId, roleId);
        return { success: true, roleId, roleName: role.name };
      },
    }),
    add_skills: tool({
      description:
        "Add one or more skills to the user's profile. Only call this when the user explicitly asks to add specific skill(s).",
      inputSchema: z.object({
        skillNames: z
          .array(z.string())
          .describe('Skill names to add, e.g. ["Python", "Docker"].'),
      }),
      execute: async ({ skillNames }) => {
        const resolved = await Promise.all(
          skillNames.map(async (name) => ({ name, match: await skills.getSkillByName(name) })),
        );

        const found = resolved.filter(
          (entry): entry is { name: string; match: { skillId: number } } => entry.match !== null,
        );
        const notFound = resolved.filter((entry) => entry.match === null).map((entry) => entry.name);

        if (found.length === 0) {
          return { success: false, added: [], notFound };
        }

        const addResult = await profiles.addSkillsToProfile(
          profileId,
          found.map((entry) => entry.match.skillId),
        );

        if (addResult.success) {
          await profiles.appendSkillsToField(
            profileId,
            found.map((entry) => entry.name),
          );
        }

        return {
          success: addResult.success,
          added: addResult.success ? found.map((entry) => entry.name) : [],
          notFound,
        };
      },
    }),
    remove_skills: tool({
      description:
        "Remove one or more skills from the user's profile. Only call this when the user explicitly asks to remove specific skill(s).",
      inputSchema: z.object({
        skillNames: z
          .array(z.string())
          .describe('Skill names to remove, e.g. ["Java", "Perl"].'),
      }),
      execute: async ({ skillNames }) => {
        const resolved = await Promise.all(
          skillNames.map(async (name) => ({ name, match: await skills.getSkillByName(name) })),
        );

        const found = resolved.filter(
          (entry): entry is { name: string; match: { skillId: number } } => entry.match !== null,
        );
        const notInCatalog = resolved.filter((entry) => entry.match === null).map((entry) => entry.name);

        if (found.length === 0) {
          return { success: false, removed: [], notInCatalog, notOnProfile: [] };
        }

        const currentLinks = await profiles.getSkillsByProfile(profileId);
        const linkedSkillIds = new Set(currentLinks.map((row) => row.skillId));

        const linked = found.filter((entry) => linkedSkillIds.has(entry.match.skillId));
        const notOnProfile = found
          .filter((entry) => !linkedSkillIds.has(entry.match.skillId))
          .map((entry) => entry.name);

        if (linked.length === 0) {
          return { success: false, removed: [], notInCatalog, notOnProfile };
        }

        await profiles.removeSkillsFromProfile(
          profileId,
          linked.map((entry) => entry.match.skillId),
        );
        await profiles.removeSkillsFromField(
          profileId,
          linked.map((entry) => entry.name),
        );

        return {
          success: true,
          removed: linked.map((entry) => entry.name),
          notInCatalog,
          notOnProfile,
        };
      },
    }),
    set_location: tool({
      description:
        "Set the user's location. Only call this when the user explicitly asks to change their location to a specific place.",
      inputSchema: z.object({
        location: z.string().describe('The new location, e.g. "Seattle, WA, USA".'),
      }),
      execute: async ({ location }) => {
        await profiles.setProfileLocation(profileId, location);
        return { success: true, location };
      },
    }),
    set_years_of_experience: tool({
      description:
        "Correct the user's total years of experience. Only call this when the user explicitly states or corrects their years of experience.",
      inputSchema: z.object({
        years: z.number().min(0).describe('Total years of professional experience.'),
      }),
      execute: async ({ years }) => {
        await profiles.setYearsOfExperience(profileId, years);
        return { success: true, years };
      },
    }),
    add_work_experience: tool({
      description:
        "Add a new work experience entry to the user's profile — e.g. when they mention starting a new job. Only call this when the user explicitly describes a new role they've taken.",
      inputSchema: z.object({
        company: z.string().describe('Company or organization name.'),
        title: z.string().describe('Job title.'),
        years: z.number().min(0).describe('Years spent in this role (estimate if ongoing, e.g. 0.5).'),
        bullets: z.array(z.string()).describe('Key responsibilities or accomplishments in this role.'),
      }),
      execute: async ({ company, title, years, bullets }) => {
        await profiles.addWorkExperience(profileId, { company, title, years, bullets });
        return { success: true, company, title };
      },
    }),
    update_education: tool({
      description:
        "Update the user's education — corrects their highest degree, and if they give a school and date range, also adds a full new entry to their education history. Only call this when the user explicitly states or corrects their education.",
      inputSchema: z.object({
        degree: z.string().describe('The degree, e.g. "M.S. Computer Science" or "B.S.". Always required.'),
        school: z
          .string()
          .optional()
          .describe('School or institution name — only if the user is describing a full new education entry, not just correcting the degree level.'),
        dateRange: z
          .string()
          .optional()
          .describe('Date range attended, e.g. "2023 - 2026" — only if adding a full new education entry.'),
        gpa: z.string().optional().describe('GPA if mentioned.'),
      }),
      execute: async ({ degree, school, dateRange, gpa }) => {
        await profiles.setHighestDegree(profileId, degree);

        if (school && dateRange) {
          await profiles.addEducationEntry(profileId, { school, degree, dateRange, gpa });
          return { success: true, degree, addedEntry: true, school };
        }

        return { success: true, degree, addedEntry: false };
      },
    }),
    get_skill_gaps: tool({
      description:
        "Get the top skills required for a role and which of them the user already has vs is missing. Use this whenever discussing a role's requirements or the user's readiness for a role, so advice is specific rather than generic.",
      inputSchema: z.object({
        roleId: z
          .number()
          .int()
          .describe(
            'The numeric id of the role to check, from the available roles list. Use the target role id if the user does not specify a role.',
          ),
      }),
      execute: async ({ roleId }) => {
        const role = availableRoles.find((candidate) => candidate.roleId === roleId);
        if (!role) {
          return { success: false, error: `${roleId} is not a valid role id.` };
        }

        const [roleSkills, profileLinks] = await Promise.all([
          roles.getRoleSkills(roleId),
          profiles.getSkillsByProfile(profileId),
        ]);

        const linkedSkillIds = new Set(profileLinks.map((link) => link.skillId));
        const topRoleSkills = roleSkills.slice(0, 10);

        return {
          success: true,
          roleName: role.name,
          have: topRoleSkills.filter((skill) => linkedSkillIds.has(skill.skillId)).map((skill) => skill.name),
          missing: topRoleSkills
            .filter((skill) => !linkedSkillIds.has(skill.skillId))
            .map((skill) => skill.name),
        };
      },
    }),
    find_resources_for_skill: tool({
      description:
        "Find real learning resources (courses, tutorials, etc.) that teach a specific skill. Use this when recommending how the user can learn or improve a skill, instead of suggesting generic resources from general knowledge.",
      inputSchema: z.object({
        skillName: z.string().describe('The skill to find learning resources for, e.g. "Kubernetes".'),
      }),
      execute: async ({ skillName }) => {
        const match = await skills.getSkillByName(skillName);
        if (!match) {
          return { success: false, resources: [], error: `"${skillName}" is not a recognized skill.` };
        }

        const allResources = await resourcesSvc.getResources({ limit: 200 });
        const matching = allResources
          .filter((resource) => resource.skills.some((entry) => entry.skillId === match.skillId))
          .sort((a, b) => {
            const weightA = a.skills.find((entry) => entry.skillId === match.skillId)?.coverageWeight ?? 0;
            const weightB = b.skills.find((entry) => entry.skillId === match.skillId)?.coverageWeight ?? 0;
            return weightB - weightA;
          })
          .slice(0, 5)
          .map((resource) => ({
            name: resource.name,
            type: resource.type,
            source: resource.source,
            url: resource.url,
            pricing: resource.pricing.type,
          }));

        return { success: true, resources: matching };
      },
    }),
    get_role_details: tool({
      description:
        "Get real details about a role: salary range, job satisfaction, main responsibilities, and typical job titles. Use this whenever the user asks about salary, compensation, day-to-day responsibilities, or job titles for a specific role — never answer those from general knowledge.",
      inputSchema: z.object({
        roleId: z.number().int().describe('The numeric id of the role, from the available roles list.'),
      }),
      execute: async ({ roleId }) => {
        const role = availableRoles.find((candidate) => candidate.roleId === roleId);
        if (!role) {
          return { success: false, error: `${roleId} is not a valid role id.` };
        }

        const details = await roles.getRoleDetails(roleId);
        if (!details) {
          return { success: false, error: `No details found for role ${roleId}.` };
        }

        return { success: true, ...details };
      },
    }),
  };
}

export interface AgentReplyResult {
  reply: string;
  profileUpdated: boolean;
}

/**
 * Generates the agent's reply for one turn of a conversation, given the
 * profile's context and the prior message history. The agent can call tools
 * to actually update the profile (target role, skills, location) when the
 * user explicitly asks for a change.
 */
export async function generateAgentReply(
  context: AgentProfileContext,
  history: ChatMessage[],
  message: string,
  profileId: number,
): Promise<AgentReplyResult> {
  const result = await generateText({
    model: google('gemini-2.5-flash'),
    system: buildSystemPrompt(context),
    messages: [
      ...history.map((entry) => ({ role: entry.role, content: entry.content })),
      { role: 'user' as const, content: message },
    ],
    tools: buildAgentTools(profileId, context.availableRoles),
    stopWhen: stepCountIs(6),
  });

  const MUTATION_TOOL_NAMES = new Set([
    'set_target_role',
    'add_skills',
    'remove_skills',
    'set_location',
    'set_years_of_experience',
    'update_education',
    'add_work_experience',
  ]);

  const profileUpdated = result.toolResults.some(
    (toolResult) =>
      MUTATION_TOOL_NAMES.has(toolResult.toolName) &&
      typeof toolResult.output === 'object' &&
      toolResult.output !== null &&
      (toolResult.output as { success?: boolean }).success === true,
  );

  return { reply: result.text, profileUpdated };
}
