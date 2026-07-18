// app/api/profiles/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profile from '@/services/profiles'; // Imports your clean SQL service layer
import {parsed_resume, resumeParser} from "@/app/actions/resume";
import {createSwaggerSpec, withSwagger} from "next-swagger-doc";
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';


export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/profiles:
 *   get:
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
 *       400:
 *         description: Missing file or the resume could not be parsed.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function POST(request: NextRequest) {
    let tempPath: string | null = null;

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json(
                { success: false, error: "A resume file is required under the 'file' field." },
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

        const created = await profile.createProfile(parsed);

        return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        // Best-effort cleanup of the buffered upload.
        if (tempPath) {
            await fs.unlink(tempPath).catch(() => {});
        }
    }
}


