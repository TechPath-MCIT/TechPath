// app/api/profiles/[id]/resume/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';
import * as resumes from '@/services/resumes';

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * @swagger
 * /api/profiles/{id}/resume:
 *   get:
 *     tags:
 *       - Resume of Profiles
 *     summary: Get a profile's raw resume text
 *     description:
 *       Resolves a profile's resumeid against the resumes table and returns the raw
 *       extracted resume text (null if the profile hasn't uploaded a resume yet).
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to look up
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description: Successfully fetched the profile's raw resume text.
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

        if (profile.resumeid === null) {
            return NextResponse.json({ success: true, data: { resumeid: null, rawtext: null } }, { status: 200 });
        }

        const resume = await resumes.getResumeById(profile.resumeid);
        return NextResponse.json(
            { success: true, data: { resumeid: profile.resumeid, rawtext: resume?.rawtext ?? null } },
            { status: 200 },
        );
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
