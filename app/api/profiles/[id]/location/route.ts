// app/api/profiles/[id]/location/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * @swagger
 * /api/profiles/{id}/location:
 *   get:
 *     tags:
 *       - Location of Profiles
 *     summary: Get a profile's location
 *     description:
 *       Returns the profile's location string (null if not set).
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to look up
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description: Successfully fetched the profile's location.
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

        return NextResponse.json(
            { success: true, data: { location: profile.location } },
            { status: 200 },
        );
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
