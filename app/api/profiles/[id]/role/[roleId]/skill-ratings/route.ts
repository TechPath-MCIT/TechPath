// app/api/profiles/[id]/role/[roleId]/skill-ratings/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';
import * as roles from '@/services/roles';
import * as resumes from '@/services/resumes';
import * as skillRatings from '@/services/skillRatings';
import { rateSkillProficiencies, type ProfileContext } from '@/app/actions/skillProficiency';

interface RouteContext {
    params: Promise<{ id: string; roleId: string }>;
}

const SKILLS_PER_CATEGORY = 2;

type ProfileExperience = {
    company: string;
    title: string;
    years: number;
    bullets: string[];
};

type ProfileEducationEntry = {
    school: string;
    degree: string;
    dateRange: string;
    gpa?: string;
};

type ProfileProjectEntry = {
    name: string;
    dateRange?: string;
    bullets: string[];
};

async function toProfileContext(profile: {
    skills: string | null;
    highestDegree: string;
    yearofexperience: number | null;
    profexperience: unknown;
    educationhistory: unknown;
    projects: unknown;
    resumeid: number | null;
}): Promise<ProfileContext> {
    const experiences = Array.isArray(profile.profexperience)
        ? (profile.profexperience as ProfileExperience[])
        : [];

    const educationHistory = Array.isArray(profile.educationhistory)
        ? (profile.educationhistory as ProfileEducationEntry[])
        : [];

    const projects = Array.isArray(profile.projects)
        ? (profile.projects as ProfileProjectEntry[])
        : [];

    const resume = profile.resumeid ? await resumes.getResumeById(profile.resumeid) : null;

    return {
        skills: profile.skills
            ? profile.skills.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        highestDegree: profile.highestDegree || null,
        yearsOfExperience: profile.yearofexperience,
        experiences,
        educationHistory,
        projects,
        rawResumeText: resume?.rawtext ?? null,
    };
}

/**
 * @swagger
 * /api/profiles/{id}/role/{roleId}/skill-ratings:
 *   get:
 *     tags:
 *       - Role of Profiles
 *     summary: Get AI-rated skill proficiency for a profile against a role's top skills
 *     description:
 *       Returns the role's top skills (by role_skills.count, same selection used
 *       for the landscape drawer) each annotated with an AI-estimated 1-10
 *       proficiency score for the given profile. Cached per (profile, role,
 *       skill) in profile_skill_ratings; only skills missing from the cache
 *       trigger a Gemini call.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to score
 *          schema:
 *              type: string
 *        - name: roleId
 *          in: path
 *          required: true
 *          description: id of the role whose top skills to rate
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description: Successfully fetched (and, if needed, computed) the profile's skill ratings for this role.
 *       400:
 *         description: Missing or invalid profile/role id.
 *       404:
 *         description: No profile found for the given id.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const resolved_params = await context.params;
        const profile_id = Number(resolved_params.id);
        const role_id = Number(resolved_params.roleId);

        if (!Number.isInteger(profile_id) || !Number.isInteger(role_id)) {
            return NextResponse.json({ success: false, error: 'A valid profile id and role id are required.' }, { status: 400 });
        }

        const profile = await profiles.getProfileById(profile_id);
        if (!profile) {
            return NextResponse.json({ success: false, error: 'No profile found for the given id.' }, { status: 404 });
        }

        const topSkills = await roles.getRoleTopSkillsBalanced(role_id, SKILLS_PER_CATEGORY);
        const ratedSkills = topSkills.filter(
            (skill): skill is typeof skill & { name: string } => typeof skill.name === 'string',
        );

        const cached = await skillRatings.getCachedRatings(profile_id, role_id);
        const cachedBySkillId = new Map(cached.map((row) => [row.skillId, row]));

        const missing = ratedSkills.filter((skill) => !cachedBySkillId.has(skill.skillId));

        if (missing.length > 0) {
            const profileContext = await toProfileContext(profile);
            const newRatings = await rateSkillProficiencies(
                profileContext,
                missing.map((skill) => ({ skillId: skill.skillId, name: skill.name })),
            );

            await skillRatings.upsertRatings(profile_id, role_id, newRatings);

            for (const rating of newRatings) {
                cachedBySkillId.set(rating.skillId, {
                    id: 0,
                    profileId: profile_id,
                    roleId: role_id,
                    skillId: rating.skillId,
                    proficiency: rating.proficiency,
                    rationale: rating.rationale,
                    updatedAt: new Date(),
                });
            }
        }

        const data = ratedSkills.map((skill) => {
            const rating = cachedBySkillId.get(skill.skillId);
            return {
                skillId: skill.skillId,
                name: skill.name,
                weight: skill.weight,
                score: rating ? rating.proficiency : null,
            };
        });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
