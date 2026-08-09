// app/actions/skillProficiency.ts
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export type ProfileContext = {
  skills: string[];
  highestDegree: string | null;
  yearsOfExperience: number | null;
  experiences: Array<{
    company: string;
    title: string;
    years: number;
    bullets: string[];
  }>;
  educationHistory: Array<{
    school: string;
    degree: string;
    dateRange: string;
    gpa?: string;
  }>;
  projects: Array<{
    name: string;
    dateRange?: string;
    bullets: string[];
  }>;
  // The full original resume text, when available. Kept as a fallback since
  // the structured fields above (including `projects`) may still miss things
  // the model didn't extract at parse time — this lets the rater recover
  // skill-usage evidence not captured structurally.
  rawResumeText: string | null;
};

export type SkillToRate = {
  skillId: number;
  name: string;
};

export type SkillProficiency = {
  skillId: number;
  name: string;
  proficiency: number;
  rationale: string;
};

/**
 * Rates a candidate's proficiency (1-10) on a specific list of skills, based
 * on their resume-derived profile. The response schema is a plain ordered
 * array (not skill-name-keyed) so the result is zipped back to skillsToRate
 * positionally by index — this deliberately avoids re-matching free-text
 * skill names against IDs, the same normalization pitfall that limits
 * catalog-linking elsewhere in this codebase (services/skills.ts).
 */
export async function rateSkillProficiencies(
  profileContext: ProfileContext,
  skillsToRate: SkillToRate[],
): Promise<SkillProficiency[]> {
  if (skillsToRate.length === 0) return [];

  const experienceSummary = profileContext.experiences.length
    ? profileContext.experiences
        .map(
          (exp) =>
            `- ${exp.title} at ${exp.company} (${exp.years} yr${exp.years === 1 ? '' : 's'}): ${exp.bullets.join('; ')}`,
        )
        .join('\n')
    : 'No work experience listed.';

  const educationSummary = profileContext.educationHistory.length
    ? profileContext.educationHistory
        .map((entry) => `- ${entry.degree} at ${entry.school} (${entry.dateRange})${entry.gpa ? `, GPA ${entry.gpa}` : ''}`)
        .join('\n')
    : 'No education history listed.';

  const projectsSummary = profileContext.projects.length
    ? profileContext.projects
        .map((proj) => `- ${proj.name}${proj.dateRange ? ` (${proj.dateRange})` : ''}: ${proj.bullets.join('; ')}`)
        .join('\n')
    : 'No projects listed.';

  const rawResumeSection = profileContext.rawResumeText
    ? `\nFull original resume text (use this to catch project work, coursework, or tool usage not captured above):\n${profileContext.rawResumeText}\n`
    : '';

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    // Minimizes sampling variance so re-rating the same unchanged evidence
    // (e.g. after an unrelated profile edit invalidates the cache) produces
    // the same score rather than drifting by chance.
    temperature: 0,
    schema: z.object({
      ratings: z
        .array(
          z.object({
            proficiency: z
              .number()
              .int()
              .min(1)
              .max(10)
              .describe('1 = no evidence of this skill anywhere in the resume, 10 = expert, extensively evidenced across multiple years/roles/projects'),
            rationale: z.string().describe('One sentence justifying the score, citing where in the resume the evidence (or lack of it) comes from'),
          }),
        )
        .length(skillsToRate.length)
        .describe('Exactly one rating per requested skill, in the same order the skills were listed'),
    }),
    prompt:
      `Candidate profile:\n` +
      `Highest degree: ${profileContext.highestDegree ?? 'Not specified'}\n` +
      `Total years of experience: ${profileContext.yearsOfExperience ?? 'Not specified'}\n` +
      `Listed skills: ${profileContext.skills.join(', ') || 'None listed'}\n\n` +
      `Education history:\n${educationSummary}\n\n` +
      `Work experience:\n${experienceSummary}\n\n` +
      `Projects:\n${projectsSummary}\n` +
      rawResumeSection +
      `\nRate this candidate's proficiency, on a scale of 1 to 10, on EXACTLY these skills, ` +
      `in this exact order, returning one rating per skill even if there is no evidence for it ` +
      `(score it low rather than omitting it). Base the score primarily on cumulative real-world ` +
      `hands-on usage: add up time spent with the skill across ALL roles, academic projects, coursework, ` +
      `and personal projects mentioned anywhere above (including the raw resume text, which may describe ` +
      `usage not reflected in the structured fields) — a skill used substantially over multiple years/roles ` +
      `should score much higher (7-10) than one only briefly mentioned or listed without supporting evidence (1-3):\n` +
      skillsToRate.map((s, i) => `${i + 1}. ${s.name}`).join('\n'),
  });

  return object.ratings.map((rating, i) => ({
    skillId: skillsToRate[i].skillId,
    name: skillsToRate[i].name,
    proficiency: rating.proficiency,
    rationale: rating.rationale,
  }));
}
