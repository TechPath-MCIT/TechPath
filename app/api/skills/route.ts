// app/api/roles/route.ts
import {NextRequest, NextResponse} from 'next/server';
import { getRolesList } from '@/services/roles';
import {getSkillByName, getSkillsList} from "@/services/skills"; // Imports your clean SQL service layer

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/skills:
 *   get:
 *     tags:
 *       - Skills
 *     summary: Grab a list of skills
 *     description: Fetches a bounded tracking array directly from our AWS RDS database cluster using the internal services query layer.
 *     responses:
 *       200:
 *         description: Successfully fetched positions.
 *       500:
 *         description: Core internal server network execution block.
 */
export async function GET() {
    try {
        const skills = await getSkillsList(10);
        return NextResponse.json({ success: true, count: skills.length, data: skills }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

}
