// services/agent.ts
import { streamText, stepCountIs, tool } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import type { ChatMessage } from '@/services/conversations';
import * as profiles from '@/services/profiles';
import * as skills from '@/services/skills';
import * as roles from '@/services/roles';
import * as resourcesSvc from '@/services/resources';
import * as match from '@/services/match';
import * as jobsSvc from '@/services/jobs';
import * as skillRatings from '@/services/skillRatings';
import { rateSkillProficiencies } from '@/app/actions/skillProficiency';
import * as onetSvc from '@/services/onet';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// resource_status.status_id convention — matches GrindPage.tsx.
const IN_PROGRESS_STATUS_ID = 1;
const COMPLETED_STATUS_ID = 2;
const CANCELLED_STATUS_ID = 0;

// `new Date("YYYY-MM-DD")` parses as UTC midnight, which reads back one
// calendar day earlier on a server running behind UTC — same fix as the
// resources API route and GrindPage.tsx use for the same reason.
function parseIsoDateLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Matches a free-text course query (e.g. "CIT5960", "Algorithms & Computation",
// or the model's own combined "CIT5960 - Algorithms & Computation") against a
// course's name and code. Checked in both directions — plain .includes(query)
// alone misses combined code+name queries, since neither field individually
// contains the full combined string.
function courseNameMatches(query: string, name: string, courseId: string | null | undefined): boolean {
  const normalizedName = name.toLowerCase();
  const normalizedCode = courseId?.toLowerCase();

  const nameMatches = normalizedName.includes(query) || query.includes(normalizedName);
  const codeMatches = normalizedCode !== undefined && (normalizedCode.includes(query) || query.includes(normalizedCode));

  return nameMatches || codeMatches;
}

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
  coursesInProgress: string[];
  coursesCompleted: string[];
}

function buildSystemPrompt(context: AgentProfileContext): string {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const lines = [
    "You are the TechPath AI Career Agent, a helpful assistant that helps users plan their career, close skill gaps, and find learning resources.",
    `Today's date is ${todayIso}. Use this as the anchor for any relative date the user mentions (e.g. "next month", "in 3 weeks", "starting tomorrow") — never guess or invent a date, and never use a date from your own training data as "today."`,
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
    context.coursesInProgress.length
      ? `Courses currently in progress: ${context.coursesInProgress.join(', ')}.`
      : null,
    context.coursesCompleted.length
      ? `Courses already completed: ${context.coursesCompleted.join(', ')}.`
      : null,
    "Keep responses concise, encouraging, and actionable. Suggest concrete next steps or resources when relevant.",
    "You can directly update the user's profile with the set_target_role, add_skills, remove_skills, set_location, set_years_of_experience, update_education, add_work_experience, remove_work_experience, add_project, remove_project, mark_course_status, and remove_course tools. Only call one of these when the user has clearly asked for that specific change — don't call a tool just because a role, skill, job, or degree was mentioned in conversation. In particular, a question like \"what steps should I take to become a data scientist\" or \"how do I become a data scientist\" is asking for information, not asking you to set that as their target role — only an explicit instruction like \"set my target role to Data Scientist\" or \"I want my goal to be Data Scientist\" should trigger set_target_role.",
    "Use get_skill_gaps, find_mcit_courses_for_skill, get_role_details, recommend_roles_for_skills, and recommend_courses_for_role freely and proactively — they're read-only, so no need to wait for an explicit request. Call them whenever they'd make your advice concrete: get_skill_gaps when discussing a role's requirements or the user's readiness, find_mcit_courses_for_skill before recommending how to learn one specific skill, get_role_details whenever salary, compensation, responsibilities, or job titles come up, recommend_roles_for_skills when the user asks what role fits their skills or wants suggestions without a target role in mind, recommend_courses_for_role when the user wants course recommendations for a whole role rather than a single skill — prefer it over chaining get_skill_gaps and find_mcit_courses_for_skill yourself.",
    "find_live_job_postings calls a real external job search API with limited quota, so only call it when the user explicitly asks about actual current job openings or what's hiring right now — not for general questions about a role, salary, or responsibilities, which get_role_details already answers from the database for free.",
    "When the user asks for a career plan, roadmap, or wants everything about a role summarized in one place, use generate_career_plan instead of chaining the individual tools yourself — it combines skill gaps, course recommendations, role details, and live job openings into one result. Present its output as a structured report (skill gaps, recommended courses per skill, role outlook, and current openings with applyUrl + source for each), not as a single dense paragraph.",
    "Use get_skill_proficiency when the user asks how strong, how good, or how ready they are on a role's skills — it's a deeper, AI-rated 1-10 score with a rationale per skill, versus get_skill_gaps' plain have/missing split. Mention the rationale when it adds useful context, and be upfront that these scores are AI estimates based on their resume, not a certified assessment.",
    "find_onet_technologies calls a real external API with an unknown rate limit, so only call it when the user specifically asks about tools/technologies (cloud platforms, BI tools, ML frameworks, dev tools like AWS, Docker, Tableau, TensorFlow) rather than on every skill or role question — our own skill catalog (used by get_skill_gaps and get_skill_proficiency) only covers coding languages, web frameworks, and databases, so this is the only source for anything outside those three categories. Never mention 'O*NET' by name to the user — it's just an internal data source, not something they need to know about; if it returns unavailable for a role, don't dead-end there and don't just offer to help further — immediately call get_skill_gaps and/or get_role_details in that same turn and include their results in your reply, so the user gets real information about the role right away instead of having to ask again.",
    "get_skill_gaps and find_onet_technologies are complementary, not interchangeable — get_skill_gaps is a personalized readiness check (does the user specifically have these skills), find_onet_technologies is a broader industry-landscape check (what tools the market wants for this role generally), and they never return overlapping items. For a broad question like \"what should I know for this role\" or \"what skills/technologies do I need,\" call both in the same turn and present one combined reply with two clearly labeled sections — e.g. \"Your skill gaps\" (from get_skill_gaps) and \"Other in-demand tools\" (from find_onet_technologies) — rather than picking just one and leaving the other half of the picture out.",
    "You can't fetch YouTube videos yourself, but the Grind page already shows a personalized YouTube video for each skill in the user's target role. When discussing how to learn a skill, mention they can find a video for it on the Grind page alongside the course(s) from find_mcit_courses_for_skill — don't claim to find or list specific videos yourself. If find_mcit_courses_for_skill returns success: false, say plainly that there's no MCIT course for that skill in the catalog, and that they may find a YouTube video for it on the Grind page — don't invent a course or video as a substitute.",
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
        "Set the user's target/dream career role. Only call this when the user explicitly asks to set or change their target role to a specific role from the available list. Do not call this when the user asks an informational question about a role, like \"what steps should I take to become a data scientist\" or \"how do I become a data scientist\" — that's a request for advice, not a request to change their goal.",
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
        // Removability is based on the profile's `skills` display string —
        // that's what the user actually sees (e.g. on Landscape) — not on
        // whether the skill happens to be linked in Profile_Skills, since
        // that table isn't guaranteed to mirror every name in the string
        // (e.g. resume-parsed skills that were never linked to the catalog).
        const profile = await profiles.getProfileById(profileId);
        const currentNames = profile?.skills
          ? profile.skills.split(',').map((name) => name.trim()).filter(Boolean)
          : [];
        const currentNamesLower = new Set(currentNames.map((name) => name.toLowerCase()));

        const onProfile = skillNames.filter((name) => currentNamesLower.has(name.toLowerCase()));
        const notOnProfile = skillNames.filter((name) => !currentNamesLower.has(name.toLowerCase()));

        if (onProfile.length === 0) {
          return { success: false, removed: [], notOnProfile };
        }

        await profiles.removeSkillsFromField(profileId, onProfile);

        // Best-effort: also unlink relationally wherever a catalog match and
        // an existing Profile_Skills link happen to exist.
        const resolved = await Promise.all(
          onProfile.map(async (name) => ({ name, match: await skills.getSkillByName(name) })),
        );
        const catalogMatches = resolved.filter(
          (entry): entry is { name: string; match: { skillId: number } } => entry.match !== null,
        );

        if (catalogMatches.length > 0) {
          const currentLinks = await profiles.getSkillsByProfile(profileId);
          const linkedSkillIds = new Set(currentLinks.map((row) => row.skillId));
          const linkedIdsToRemove = catalogMatches
            .filter((entry) => linkedSkillIds.has(entry.match.skillId))
            .map((entry) => entry.match.skillId);

          if (linkedIdsToRemove.length > 0) {
            await profiles.removeSkillsFromProfile(profileId, linkedIdsToRemove);
          }
        }

        return { success: true, removed: onProfile, notOnProfile };
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
    remove_work_experience: tool({
      description:
        "Remove a work experience entry from the user's profile by company (optionally narrowed by job title, if they had more than one role there). Only call this when the user explicitly asks to remove a job from their profile.",
      inputSchema: z.object({
        company: z.string().describe('The company name of the entry to remove.'),
        title: z.string().optional().describe('The job title, if needed to disambiguate multiple roles at the same company.'),
      }),
      execute: async ({ company, title }) => {
        const removed = await profiles.removeWorkExperience(profileId, company, title);
        return removed
          ? { success: true, company, title }
          : { success: false, error: `No work experience entry found at "${company}"${title ? ` with title "${title}"` : ''}.` };
      },
    }),
    add_project: tool({
      description:
        "Add a new project to the user's profile — e.g. when they mention something they built or worked on outside a job. Only call this when the user explicitly describes a project they want added.",
      inputSchema: z.object({
        name: z.string().describe('Project name.'),
        dateRange: z.string().optional().describe('Date range, e.g. "2025 - 2026", if mentioned.'),
        bullets: z.array(z.string()).describe('Key details, technologies used, or accomplishments for this project.'),
      }),
      execute: async ({ name, dateRange, bullets }) => {
        await profiles.addProject(profileId, { name, dateRange, bullets });
        return { success: true, name };
      },
    }),
    remove_project: tool({
      description:
        "Remove a project from the user's profile by name. Only call this when the user explicitly asks to remove or delete a specific project.",
      inputSchema: z.object({
        name: z.string().describe('The name of the project to remove, matched case-insensitively.'),
      }),
      execute: async ({ name }) => {
        const removed = await profiles.removeProject(profileId, name);
        if (!removed) {
          return { success: false, error: `No project named "${name}" found on the profile.` };
        }
        return { success: true, name };
      },
    }),
    mark_course_status: tool({
      description:
        "Add or update an MCIT course on the user's profile — in progress or completed, with optional start/end dates, exactly like the Add dialog and pencil-edit on the Grind page. Only call this when the user explicitly says they've started, are planning to take, or finished a specific course by name. There's no separate 'upcoming' status and no separate 'move to upcoming' action — calling this with status: 'in_progress' and a future startDate is how a course (new OR already-tracked) shows under Upcoming instead of In Progress; calling it again on a course already on the profile updates its dates/status in place rather than erroring. If the user specifically asks to mark or move a course to 'upcoming' but hasn't given a date, ask them for the start date instead of guessing or inventing one — do not call this tool until you have a real date for that case. Completing a course also adds the skills it teaches to the user's profile.",
      inputSchema: z.object({
        courseName: z
          .string()
          .describe('The course name or code the user mentioned, e.g. "Networked Systems" or "CIS5530".'),
        status: z
          .enum(['in_progress', 'complete'])
          .describe('Whether the user started/is planning the course, or already finished it.'),
        startDate: z
          .string()
          .optional()
          .describe('Start date as YYYY-MM-DD, if the user mentions or confirms one. A future date puts it under Upcoming instead of In Progress.'),
        endDate: z
          .string()
          .optional()
          .describe('Expected end date as YYYY-MM-DD, if the user mentions one. If startDate is given without this, it defaults the same way the Add dialog does (14 weeks out for a full course, 7 for a half-unit course).'),
      }),
      execute: async ({ courseName, status, startDate, endDate }) => {
        const allCourses = await resourcesSvc.getResources({ type: 'course', limit: 200 });
        const query = courseName.trim().toLowerCase();
        const matches = allCourses.filter((resource) =>
          courseNameMatches(query, resource.name, resource.course?.courseId),
        );

        if (matches.length === 0) {
          return { success: false, error: `No MCIT course found matching "${courseName}".` };
        }

        if (matches.length > 1) {
          return {
            success: false,
            error: `Multiple courses match "${courseName}" — ask the user to be more specific.`,
            candidates: matches.slice(0, 5).map((resource) => resource.name),
          };
        }

        const course = matches[0];

        const parsedStart = startDate ? parseIsoDateLocal(startDate) : null;
        if (startDate && !parsedStart) {
          return { success: false, error: `"${startDate}" isn't a valid date — use YYYY-MM-DD.` };
        }

        let parsedEnd = endDate ? parseIsoDateLocal(endDate) : null;
        if (endDate && !parsedEnd) {
          return { success: false, error: `"${endDate}" isn't a valid date — use YYYY-MM-DD.` };
        }
        if (parsedStart && !parsedEnd) {
          // Same default the Add dialog uses: 14 weeks for a full course,
          // 7 for a half-unit one.
          const weeks = course.course?.units === 0.5 ? 7 : 14;
          parsedEnd = new Date(parsedStart);
          parsedEnd.setDate(parsedEnd.getDate() + weeks * 7);
        }

        const dates = parsedStart || parsedEnd
          ? { startDate: parsedStart ?? undefined, expectedEndDate: parsedEnd ?? undefined }
          : undefined;

        if (status === 'complete') {
          const { addedSkills } = await profiles.completeResourceForProfile(
            profileId,
            course.id,
            COMPLETED_STATUS_ID,
          );
          return { success: true, courseName: course.name, status: 'complete', addedSkills };
        }

        await profiles.setResourceStatusForProfile(profileId, course.id, IN_PROGRESS_STATUS_ID, dates);
        return {
          success: true,
          courseName: course.name,
          status: 'in_progress',
          startDate: parsedStart ? startDate : null,
          expectedEndDate: parsedEnd ? parsedEnd.toISOString().slice(0, 10) : null,
        };
      },
    }),
    remove_course: tool({
      description:
        "Remove an MCIT course from the user's My Progress list (In Progress, Upcoming, or Completed), exactly like the trash-icon button on the Grind page. Only call this when the user explicitly asks to remove or delete a specific course they're tracking — not for skills, projects, or anything not already added to their progress.",
      inputSchema: z.object({
        courseName: z
          .string()
          .describe('The course name or code the user wants removed, e.g. "Networked Systems" or "CIS5530".'),
      }),
      execute: async ({ courseName }) => {
        const enrolled = await profiles.getResourcesByProfile(profileId);
        const query = courseName.trim().toLowerCase();
        const matches = enrolled.filter(
          (item) =>
            item.statusId !== CANCELLED_STATUS_ID &&
            item.resource !== null &&
            courseNameMatches(query, item.resource.name, item.resource.courses?.course_id),
        );

        if (matches.length === 0) {
          return { success: false, error: `"${courseName}" isn't currently in the user's My Progress list.` };
        }

        if (matches.length > 1) {
          return {
            success: false,
            error: `Multiple tracked courses match "${courseName}" — ask the user to be more specific.`,
            candidates: matches.slice(0, 5).map((item) => item.resource?.name).filter(Boolean),
          };
        }

        const match = matches[0];
        await profiles.setResourceStatusForProfile(profileId, match.resource_id, CANCELLED_STATUS_ID);
        return { success: true, courseName: match.resource?.name ?? courseName };
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
    find_mcit_courses_for_skill: tool({
      description:
        "Find real MCIT courses that teach a specific skill. Use this when recommending how the user can learn or improve a skill, instead of suggesting generic resources from general knowledge.",
      inputSchema: z.object({
        skillName: z.string().describe('The skill to find MCIT courses for, e.g. "Kubernetes".'),
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
    recommend_roles_for_skills: tool({
      description:
        "Recommend the roles that best fit the user's current skills, ranked by match score. Use this when the user asks what role suits their skills, or wants suggestions and hasn't picked a target role.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe('How many top roles to return. Defaults to 5.'),
      }),
      execute: async ({ limit }) => {
        const scores = await match.getRoleMatchScores(profileId);
        const top = scores.slice(0, limit ?? 5);

        return {
          success: true,
          roles: top.map((entry) => ({
            roleId: entry.roleId,
            roleName: entry.role,
            matchScore: entry.score,
          })),
        };
      },
    }),
    recommend_courses_for_role: tool({
      description:
        "Recommend real MCIT courses covering a role's missing skills, combining skill-gap analysis and course lookup in one call. Prefer this over calling get_skill_gaps and find_mcit_courses_for_skill separately when the user wants course recommendations for a whole role.",
      inputSchema: z.object({
        roleId: z
          .number()
          .int()
          .describe(
            'The numeric id of the role to recommend courses for, from the available roles list. Use the target role id if the user does not specify a role.',
          ),
      }),
      execute: async ({ roleId }) => {
        const role = availableRoles.find((candidate) => candidate.roleId === roleId);
        if (!role) {
          return { success: false, error: `${roleId} is not a valid role id.` };
        }

        const [roleSkills, profileLinks, allResources] = await Promise.all([
          roles.getRoleSkills(roleId),
          profiles.getSkillsByProfile(profileId),
          resourcesSvc.getResources({ limit: 200 }),
        ]);

        const linkedSkillIds = new Set(profileLinks.map((link) => link.skillId));
        const missingSkills = roleSkills.slice(0, 10).filter((skill) => !linkedSkillIds.has(skill.skillId));

        const recommendations = missingSkills.map((skill) => {
          const matchingCourses = allResources
            .filter((resource) => resource.skills.some((entry) => entry.skillId === skill.skillId))
            .sort((a, b) => {
              const weightA = a.skills.find((entry) => entry.skillId === skill.skillId)?.coverageWeight ?? 0;
              const weightB = b.skills.find((entry) => entry.skillId === skill.skillId)?.coverageWeight ?? 0;
              return weightB - weightA;
            })
            .slice(0, 3)
            .map((resource) => ({ name: resource.name, url: resource.url, pricing: resource.pricing.type }));

          return { skillName: skill.name, courses: matchingCourses };
        });

        return {
          success: true,
          roleName: role.name,
          missingSkillCount: missingSkills.length,
          recommendations,
        };
      },
    }),
    find_live_job_postings: tool({
      description:
        "Search for real, currently open job postings matching a query. Use this when the user asks what's actually hiring right now, wants to see real job listings, or asks about current openings for a role — not for general role information, which get_role_details already covers. Each result includes an applyUrl and a source (the site the listing came from) — always include both for every job you list in your reply (as a markdown link and its source), don't just name the job and company. These listings can go stale between when they were indexed and when the user clicks — after listing the jobs, briefly note that some postings may have already been filled or taken down, and suggest checking the company's careers page directly if a link doesn't work.",
      inputSchema: z.object({
        query: z
          .string()
          .describe('The job search query, e.g. "software engineer in Chicago" or "data scientist remote".'),
      }),
      execute: async ({ query }) => {
        try {
          const jobs = await jobsSvc.searchLiveJobs(query, 10);
          return { success: true, jobs };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to search live job postings.',
          };
        }
      },
    }),
    get_skill_proficiency: tool({
      description:
        "Get an AI-estimated 1-10 proficiency score, with a one-sentence rationale grounded in the resume, for each of a role's top skills — deeper than get_skill_gaps' plain have/missing split. Use this when the user asks how strong, how good, or how ready they are on a role's skills, not just whether they're missing entirely. Results are cached per profile+role+skill, so repeat calls for the same role are free; only newly-seen skills trigger a rating pass.",
      inputSchema: z.object({
        roleId: z
          .number()
          .int()
          .optional()
          .describe(
            "The numeric id of the role whose top skills to rate, from the available roles list. Defaults to the target role already on the profile if omitted.",
          ),
      }),
      execute: async ({ roleId }) => {
        let resolvedRoleId = roleId;
        const profile = await profiles.getProfileById(profileId);
        if (resolvedRoleId == null) {
          resolvedRoleId = profile?.roleId ?? undefined;
        }
        if (resolvedRoleId == null) {
          return { success: false, error: 'No role was specified and the user has not set a target role yet.' };
        }
        if (!profile) {
          return { success: false, error: 'Profile not found.' };
        }

        const role = availableRoles.find((candidate) => candidate.roleId === resolvedRoleId);
        if (!role) {
          return { success: false, error: `${resolvedRoleId} is not a valid role id.` };
        }

        const topSkills = await roles.getRoleTopSkillsBalanced(resolvedRoleId, 2);
        const ratedSkills = topSkills.filter(
          (skill): skill is typeof skill & { name: string } => typeof skill.name === 'string',
        );

        const cached = await skillRatings.getCachedRatings(profileId, resolvedRoleId);
        const cachedBySkillId = new Map(cached.map((row) => [row.skillId, row]));
        const missing = ratedSkills.filter((skill) => !cachedBySkillId.has(skill.skillId));

        if (missing.length > 0) {
          const profileContext = await profiles.buildSkillProficiencyContext(profile);
          const newRatings = await rateSkillProficiencies(
            profileContext,
            missing.map((skill) => ({ skillId: skill.skillId, name: skill.name })),
          );
          await skillRatings.upsertRatings(profileId, resolvedRoleId, newRatings);
          for (const rating of newRatings) {
            cachedBySkillId.set(rating.skillId, {
              id: 0,
              profileId,
              roleId: resolvedRoleId,
              skillId: rating.skillId,
              proficiency: rating.proficiency,
              rationale: rating.rationale,
              updatedAt: new Date(),
            });
          }
        }

        return {
          success: true,
          roleName: role.name,
          ratings: ratedSkills.map((skill) => {
            const rating = cachedBySkillId.get(skill.skillId);
            return {
              skillName: skill.name,
              proficiency: rating?.proficiency ?? null,
              rationale: rating?.rationale ?? null,
            };
          }),
        };
      },
    }),
    generate_career_plan: tool({
      description:
        "Generate one full career plan report for a role, combining everything else this agent can look up: skill gap analysis, recommended courses for each missing skill, role details (salary, outlook, responsibilities), and real current job openings for that role. Use this when the user asks for a career plan, roadmap, or wants everything summarized together — not for narrower single-topic questions, which the more specific tools (get_skill_gaps, get_role_details, recommend_courses_for_role, find_live_job_postings) already answer more directly. This calls the live job search API as part of the report, so don't call it repeatedly in the same conversation without the user asking again.",
      inputSchema: z.object({
        roleId: z
          .number()
          .int()
          .optional()
          .describe(
            'The numeric id of the role to build the plan for, from the available roles list. Defaults to the target role already on the profile if omitted.',
          ),
      }),
      execute: async ({ roleId }) => {
        let resolvedRoleId = roleId;
        if (resolvedRoleId == null) {
          const profile = await profiles.getProfileById(profileId);
          resolvedRoleId = profile?.roleId ?? undefined;
        }
        if (resolvedRoleId == null) {
          return { success: false, error: 'No role was specified and the user has not set a target role yet.' };
        }

        const role = availableRoles.find((candidate) => candidate.roleId === resolvedRoleId);
        if (!role) {
          return { success: false, error: `${resolvedRoleId} is not a valid role id.` };
        }

        const [roleSkills, profileLinks, allResources, roleDetails, matchScores, liveJobs] = await Promise.all([
          roles.getRoleSkills(resolvedRoleId),
          profiles.getSkillsByProfile(profileId),
          resourcesSvc.getResources({ limit: 200 }),
          roles.getRoleDetails(resolvedRoleId),
          match.getRoleMatchScores(profileId),
          jobsSvc.searchLiveJobs(role.name, 5).catch(() => null),
        ]);

        const linkedSkillIds = new Set(profileLinks.map((link) => link.skillId));
        const topRoleSkills = roleSkills.slice(0, 10);
        const haveSkills = topRoleSkills.filter((skill) => linkedSkillIds.has(skill.skillId));
        const missingSkills = topRoleSkills.filter((skill) => !linkedSkillIds.has(skill.skillId));

        const recommendations = missingSkills.map((skill) => {
          const matchingCourses = allResources
            .filter((resource) => resource.skills.some((entry) => entry.skillId === skill.skillId))
            .sort((a, b) => {
              const weightA = a.skills.find((entry) => entry.skillId === skill.skillId)?.coverageWeight ?? 0;
              const weightB = b.skills.find((entry) => entry.skillId === skill.skillId)?.coverageWeight ?? 0;
              return weightB - weightA;
            })
            .slice(0, 3)
            .map((resource) => ({ name: resource.name, url: resource.url, pricing: resource.pricing.type }));

          return { skillName: skill.name, courses: matchingCourses };
        });

        return {
          success: true,
          roleName: role.name,
          matchScore: matchScores.find((entry) => entry.roleId === resolvedRoleId)?.score ?? null,
          roleDetails: roleDetails ?? null,
          have: haveSkills.map((skill) => skill.name),
          missing: missingSkills.map((skill) => skill.name),
          recommendations,
          liveJobs: liveJobs ?? [],
          liveJobsUnavailable: liveJobs === null,
        };
      },
    }),
    find_onet_technologies: tool({
      description:
        "Find the specific tools and technologies (cloud platforms, BI tools, ML frameworks, dev tools, etc.) most commonly requested in real job postings for a role, sourced from O*NET, ranked by how often they appear. This covers technologies outside our own skill catalog (which only tracks coding languages, web frameworks, and databases) — use it when the user asks what tools/technologies to learn for a role, or asks about something like AWS, Docker, Tableau, or similar tools not covered by get_skill_gaps. Not available for every role (e.g. Product Manager has no good O*NET match) — if it returns unavailable, say so honestly rather than guessing.",
      inputSchema: z.object({
        roleId: z
          .number()
          .int()
          .optional()
          .describe(
            'The numeric id of the role to look up, from the available roles list. Defaults to the target role already on the profile if omitted.',
          ),
      }),
      execute: async ({ roleId }) => {
        let resolvedRoleId = roleId;
        if (resolvedRoleId == null) {
          const profile = await profiles.getProfileById(profileId);
          resolvedRoleId = profile?.roleId ?? undefined;
        }
        if (resolvedRoleId == null) {
          return { success: false, error: 'No role was specified and the user has not set a target role yet.' };
        }

        const role = availableRoles.find((candidate) => candidate.roleId === resolvedRoleId);
        if (!role) {
          return { success: false, error: `${resolvedRoleId} is not a valid role id.` };
        }

        try {
          const technologies = await onetSvc.getInDemandTechnologies(resolvedRoleId, 10);
          if (technologies === null) {
            return {
              success: false,
              error: `No specific tools/technologies data is available for ${role.name}.`,
            };
          }
          return { success: true, roleName: role.name, technologies };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to look up in-demand technologies.',
          };
        }
      },
    }),
  };
}

export interface AgentReplyResult {
  reply: string;
  profileUpdated: boolean;
}

const MUTATION_TOOL_NAMES = new Set([
  'set_target_role',
  'add_skills',
  'remove_skills',
  'set_location',
  'set_years_of_experience',
  'update_education',
  'add_work_experience',
  'remove_work_experience',
  'add_project',
  'remove_project',
  'mark_course_status',
  'remove_course',
]);

/**
 * Given the resolved toolResults from a generateText/streamText call, reports
 * whether any mutation tool actually succeeded — used to decide whether the
 * frontend needs to refresh the profile after this turn.
 */
export function didUpdateProfile(toolResults: readonly { toolName: string; output: unknown }[]): boolean {
  return toolResults.some(
    (toolResult) =>
      MUTATION_TOOL_NAMES.has(toolResult.toolName) &&
      typeof toolResult.output === 'object' &&
      toolResult.output !== null &&
      (toolResult.output as { success?: boolean }).success === true,
  );
}

/**
 * Starts streaming the agent's reply for one turn of a conversation, given
 * the profile's context and the prior message history. The agent can call
 * tools to actually update the profile (target role, skills, location) when
 * the user explicitly asks for a change. Callers consume `.textStream` for
 * incremental text, and await `.text` / `.toolResults` once it's drained for
 * the final full reply and whether the profile was updated.
 */
export function streamAgentReply(
  context: AgentProfileContext,
  history: ChatMessage[],
  message: string,
  profileId: number,
) {
  return streamText({
    model: google('gemini-2.5-flash'),
    system: buildSystemPrompt(context),
    messages: [
      ...history.map((entry) => ({ role: entry.role, content: entry.content })),
      { role: 'user' as const, content: message },
    ],
    tools: buildAgentTools(profileId, context.availableRoles),
    stopWhen: stepCountIs(6),
  });
}
