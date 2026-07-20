// services/resumes.ts
import { prisma } from '@/lib/db';

/**
 * Stores the raw extracted text of an uploaded resume.
 * @param rawText the unified plain text extracted from the .pdf/.docx upload
 */
export async function createResume(rawText: string) {
    return prisma.resume.create({
        data: { rawtext: rawText },
    });
}
