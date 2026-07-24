// app/api/profiles/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as profile from '@/services/profiles'; // Imports your clean SQL service layer
import * as users from '@/services/users';
import * as resumes from '@/services/resumes';
import { parsed_resume, resumeParser } from "@/app/actions/resume";
import { createSwaggerSpec, withSwagger } from "next-swagger-doc";
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';


export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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
 *     summary: Create a profile from an uploaded resume
 *     description: Accepts a .pdf or .docx resume as multipart/form-data, parses it, and saves the result as a new profile via the create profile service.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The candidate's resume (.pdf or .docx).
 *     responses:
 *       201:
 *         description: Profile created successfully.
 *       200:
 *         description: Existing profile updated with the newly parsed resume.
 *       400:
 *         description: Missing file or the resume could not be parsed.
 *       401:
 *         description: No authenticated Clerk session.
 *       404:
 *         description: The signed-in user hasn't been synced to userinfo yet.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function POST(request: NextRequest) {
    let tempPath: string | null = null;

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

        const formData = await request.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json(
                { success: false, error: "A resume file is required under the 'file' field." },
                { status: 400 },
            );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { success: false, error: "File is too large. Please upload a resume under 5MB." },
                { status: 400 },
            );
        }

        // resumeParser reads from disk, so buffer the upload to a temp file it can open.
        const buffer = Buffer.from(await file.arrayBuffer());
        const extension = path.extname(file.name).toLowerCase();
        tempPath = path.join(os.tmpdir(), `resume-${file.name}${extension ? '' : '.tmp'}`);
        await fs.writeFile(tempPath, buffer);

        const parsed = await resumeParser(tempPath);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error_msg ?? 'Failed to parse resume.' },
                { status: 400 },
            );
        }

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
    } finally {
        // Best-effort cleanup of the buffered upload.
        if (tempPath) {
            await fs.unlink(tempPath).catch(() => { });
        }
    }
}


