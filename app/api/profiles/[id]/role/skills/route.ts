// app/api/profiles/[id]/role/skills/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profiles from '@/services/profiles';
import * as roles from '@/services/roles';

interface RouteContext {
    params: Promise<{ id: string }>
}

/**
 * @swagger
 * /api/profiles/{id}/role/skills:
 *   get:
 *     tags:
 *       - Role of Profiles
 *     summary: Get a profile's ideal role name and its weighted skills
 *     description:
 *       Resolves a profile's roleId against the roles table and returns the role's
 *       display name along with the skills tied to that role (via role_skills),
 *       each including its weight and resolved skill name.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to look up
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description: Successfully fetched the profile's role name and weighted skills.
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
            return NextResponse.json(
                { success: true, data: { roleId: null, roleName: null, skills: [] } },
                { status: 200 },
            );
        }

        const role = await roles.getRoleById(profile.roleId);
        const skills = await roles.getRoleSkills(profile.roleId);

        return NextResponse.json(
            { success: true, data: { roleId: profile.roleId, roleName: role?.role ?? null, skills } },
            { status: 200 },
        );
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
