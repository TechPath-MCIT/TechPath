// app/api/profiles/[id]/resume/context/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';
import * as resumes from '@/services/resumes';
import * as roles from '@/services/roles';

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * @swagger
 * /api/profiles/{id}/resume/context:
 *   get:
 *     tags:
 *       - Resume of Profiles
 *     summary: Get a profile's resume text plus its dream role and weighted skills
 *     description:
 *       Combines a profile's raw resume text with its dream role name and the
 *       role's weighted skills (via role_skills) into a single flat response,
 *       intended as one-shot input context for resume-related processing.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to look up
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description: Successfully fetched the profile's resume and dream role context.
 *       400:
 *         description: Missing or invalid profile id.
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

        const profile = await profiles.getProfileById(profile_id);
        if (!profile) {
            return NextResponse.json({ success: false, error: "No profile found for the given id." }, { status: 404 });
        }

        const resume = profile.resumeid === null ? null : await resumes.getResumeById(profile.resumeid);
        const role = profile.roleId === null ? null : await roles.getRoleById(profile.roleId);
        const skills = profile.roleId === null ? [] : await roles.getRoleSkills(profile.roleId);

        return NextResponse.json(
            {
                success: true,
                data: {
                    resumeid: profile.resumeid,
                    rawtext: resume?.rawtext ?? null,
                    roleId: profile.roleId,
                    roleName: role?.role ?? null,
                    skills,
                },
            },
            { status: 200 },
        );
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
