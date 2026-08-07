// app/api/profiles/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profile from '@/services/profiles'; // Imports your clean SQL service layer
import { parsed_resume, resumeParser } from "@/app/actions/resume";
import { createSwaggerSpec, withSwagger } from "next-swagger-doc";
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as profiles from '@/services/profiles';
import * as users from '@/services/users';
import { auth } from '@clerk/nextjs/server';
import { toParsedResume } from '@/lib/parsedResumeBody';
/**
 * @swagger
 * /api/profiles/{id}:
 *   get:
 *     tags:
 *       - Skills of Profiles
 *     summary: search profile by id
 *     description:
 *       return the profile based on given id, if it exists
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of profile to retrieve
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description:
 *           Successfully fetched profile. Returns the single matching skill when a name is provided and found.
 *       404:
 *         description: A id was provided but no matching profile was found.
 *
 *       500:
 *         description: Core internal server network execution block.
 *
 */
interface RouteContext {
    params: Promise<{ id: string }>
}
export async function GET(request: NextRequest, context: RouteContext)  {
    const resolve_params = await context.params;

    try{
        const profile_id = Number(resolve_params.id);
        if(profile_id){
            const profile =  await profiles.getProfileById(profile_id);
            if(profile){
                return NextResponse.json({ success: true, data: profile }, { status: 200 });
            }

            else{
                return NextResponse.json({ success: false, data: profile }, { status: 404 });
            }

        }

    }
    catch(error){
        return NextResponse.json({ success: false, data: "Error retrieving profile" }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/profiles/{id}:
 *   put:
 *     tags:
 *       - Profiles
 *     summary: Save edits to an already-saved profile
 *     description:
 *       Updates the caller's own profile in place from user-edited fields
 *       (name, email, location, highest degree, skills, education history,
 *       work experience) — used by the profile-edit page. Unlike POST
 *       /api/profiles, this never touches the linked resume.
 *     parameters:
 *        - name: id
 *          in: path
 *          required: true
 *          description: id of the profile to update
 *          schema:
 *              type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                   type: string
 *               email:
 *                   type: string
 *               location:
 *                   type: string
 *               education:
 *                   type: string
 *               skills:
 *                   type: array
 *                   items:
 *                       type: string
 *               educationHistory:
 *                   type: array
 *                   items:
 *                       type: object
 *               experiences:
 *                   type: array
 *                   items:
 *                       type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       401:
 *         description: No authenticated Clerk session.
 *       403:
 *         description: The authenticated user doesn't own this profile.
 *       404:
 *         description: No matching profile found.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
    const resolved_params = await context.params;

    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
        }

        const profile_id = Number(resolved_params.id);
        if (!profile_id) {
            return NextResponse.json({ success: false, error: 'Invalid profile id.' }, { status: 404 });
        }

        const localUser = await users.getUserByClerkId(clerkId);
        if (!localUser || localUser.profile_ID !== profile_id) {
            return NextResponse.json(
                { success: false, error: "You don't have permission to edit this profile." },
                { status: 403 },
            );
        }

        const body = await request.json();
        const parsed = toParsedResume(body);

        const updated = await profiles.updateProfileFields(profile_id, parsed);
        await profiles.replaceProfileSkills(profile_id, parsed.skills ?? []);

        return NextResponse.json(
            { success: true, data: updated, skills: await profiles.getSkillsByProfile(profile_id) },
            { status: 200 },
        );
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}