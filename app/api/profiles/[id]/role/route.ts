// app/api/profiles/[id]/role/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';
import * as roles from '@/services/roles';

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * @swagger
 * /api/profiles/{id}/role:
 *   get:
 *     tags:
 *       - Role of Profiles
 *     summary: Get a profile's ideal role id
 *     description:
 *       Returns the roleId currently set on a profile's dream role (null if none set yet).
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to look up
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description: Successfully fetched the profile's roleId.
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

        return NextResponse.json({ success: true, data: { roleId: profile.roleId } }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/profiles/{id}/role:
 *   put:
 *     tags:
 *       - Role of Profiles
 *     summary: Set a profile's ideal role
 *     description:
 *       Sets a profile's dream role to one of the entries in the roles table. The
 *       given roleId must already exist in roles, otherwise the update is rejected.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to update
 *          schema:
 *              type: string
 *     requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  roleId:
 *                      type: number
 *     responses:
 *       200:
 *         description: Successfully set the profile's ideal role.
 *       400:
 *         description: Missing or invalid profile id / roleId.
 *       404:
 *         description: No profile or no role found for the given ids.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const resolved_params = await context.params;
        const profile_id = Number(resolved_params.id);
        if (!Number.isInteger(profile_id)) {
            return NextResponse.json({ success: false, error: "A valid profile id is required." }, { status: 400 });
        }

        const data = await request.json();
        const roleId = Number(data.roleId);
        if (!Number.isInteger(roleId)) {
            return NextResponse.json({ success: false, error: "A valid roleId is required." }, { status: 400 });
        }

        const role = await roles.getRoleById(roleId);
        if (!role) {
            return NextResponse.json({ success: false, error: "No role found for the given roleId." }, { status: 404 });
        }

        const profile = await profiles.getProfileById(profile_id);
        if (!profile) {
            return NextResponse.json({ success: false, error: "No profile found for the given id." }, { status: 404 });
        }

        const updated = await profiles.setDreamRole(profile_id, roleId);
        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
