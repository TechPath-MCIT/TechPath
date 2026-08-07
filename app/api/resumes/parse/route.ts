// app/api/resumes/parse/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { resumeParser } from "@/app/actions/resume";
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * @swagger
 * /api/resumes/parse:
 *   post:
 *     tags:
 *       - Profiles
 *     summary: Parse a resume without saving it
 *     description:
 *       Accepts a .pdf or .docx resume as multipart/form-data and returns the
 *       parsed fields (name, email, location, skills, education, experience)
 *       for review/editing. Does not write anything to the database — call
 *       POST /api/profiles with the (possibly edited) result to actually save it.
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
 *       200:
 *         description: Successfully parsed the resume.
 *       400:
 *         description: Missing file or the resume could not be parsed.
 *       401:
 *         description: No authenticated Clerk session.
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

        return NextResponse.json({ success: true, data: parsed }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        // Best-effort cleanup of the buffered upload.
        if (tempPath) {
            await fs.unlink(tempPath).catch(() => { });
        }
    }
}
