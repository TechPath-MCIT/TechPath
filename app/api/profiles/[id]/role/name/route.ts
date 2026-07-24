// app/api/profiles/[id]/role/name/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';
import * as roles from '@/services/roles';

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * @swagger
 * /api/profiles/{id}/role/name:
 *   get:
 *     tags:
 *       - Role of Profiles
 *     summary: Get a profile's ideal role name
 *     description:
 *       Resolves a profile's roleId against the roles table and returns the role's
 *       display name (null if the profile hasn't set an ideal role yet).
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to look up
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description: Successfully fetched the profile's role name.
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

        if (profile.roleId === null) {
            return NextResponse.json({ success: true, data: { roleId: null, roleName: null } }, { status: 200 });
        }

        const role = await roles.getRoleById(profile.roleId);
        return NextResponse.json(
            { success: true, data: { roleId: profile.roleId, roleName: role?.role ?? null } },
            { status: 200 },
        );
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
