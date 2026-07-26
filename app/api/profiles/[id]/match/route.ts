// app/api/profiles/[id]/match/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';
import * as match from '@/services/match';

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * @swagger
 * /api/profiles/{id}/match:
 *   get:
 *     tags:
 *       - Role Match of Profiles
 *     summary: Get a profile's match score against every role
 *     description:
 *       Computes an on-demand 0-100 match score for the given profile against each
 *       of the 24 roles in the roles table, based on the profile's linked skills
 *       (via Profile_Skills) weighted by each role's per-category skill importance
 *       (coding language / web framework / database). Not persisted. Sorted
 *       descending by score.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to score
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description: Successfully computed the profile's match scores.
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

        const data = await match.getRoleMatchScores(profile_id);

        return NextResponse.json({ success: true, count: data.length, data }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
