// app/api/profiles/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as profile from '@/services/profiles'; // Imports your clean SQL service layer
import * as users from '@/services/users';
import * as resumes from '@/services/resumes';
import { createSwaggerSpec, withSwagger } from "next-swagger-doc";
import { toParsedResume } from "@/lib/parsedResumeBody";


export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/profiles:
 *   get:
 *     tags:
 *       - Profiles
 *     summary: Grab a list of profiles
 *     description: Fetches a bounded tracking array directly from our AWS RDS database cluster using the internal services query layer.
 *     responses:
 *       200:
 *         description: Successfully fetched positions.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function GET() {
    try {
        const profiles = await profile.getProfileList(10);
        return NextResponse.json({ success: true, count: profiles.length, data: profiles }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/profiles:
 *   post:
 *     tags:
 *       - Profiles
 *     summary: Save a (possibly user-edited) parsed resume as a profile
 *     description:
 *       Accepts the JSON result of POST /api/resumes/parse — after the user has
 *       reviewed and optionally corrected it on the resume-review page — and
 *       persists it as a new profile, or updates the caller's existing one.
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
 *               rawText:
 *                   type: string
 *     responses:
 *       201:
 *         description: Profile created successfully.
 *       200:
 *         description: Existing profile updated with the reviewed resume.
 *       401:
 *         description: No authenticated Clerk session.
 *       404:
 *         description: The signed-in user hasn't been synced to userinfo yet.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function POST(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
        }

        const localUser = await users.getUserByClerkId(clerkId);
        if (!localUser) {
            return NextResponse.json(
                { success: false, error: 'User not found — sign in again to sync your account.' },
                { status: 404 },
            );
        }

        const body = await request.json();
        const parsed = toParsedResume(body);

        const resume = await resumes.createResume(parsed.rawText ?? "");

        // Re-uploads update the user's existing profile in place instead of creating a new one.
        const isUpdate = localUser.profile_ID !== null;
        const created = isUpdate
            ? await profile.updateProfileFromResume(localUser.profile_ID!, parsed, resume.resumeid)
            : await profile.createProfile(parsed, resume.resumeid);

        if (!isUpdate) {
            await users.linkProfileToUser(clerkId, created.profile_ID);
        }

        if (parsed.skills) {
            await profile.replaceProfileSkills(created.profile_ID, parsed.skills);
        }

        return NextResponse.json(
            { success: true, data: created, skills: await profile.getSkillsByProfile(created.profile_ID) },
            { status: isUpdate ? 200 : 201 },
        );

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}


