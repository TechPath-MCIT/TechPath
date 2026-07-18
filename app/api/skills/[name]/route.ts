// app/api/skills/[name]/route.ts

import {NextRequest, NextResponse} from 'next/server';
import { getRolesList } from '@/services/roles';
import {getSkillByName, getSkillsList} from "@/services/skills"; // Imports your clean SQL service layer


/**
 * @swagger
 * /api/skills/{name}:
 *   get:
 *     summary: List skills or look up a single skill by name
 *     description:
 *       With no `name` field, returns a list of skills from our AWS RDS
 *       database cluster via the internal services query layer. When a `name`
 *       field is supplied as multipart/form-data, performs a case-insensitive
 *       lookup and returns the single matching skill instead.
 *     parameters:
 *        - name: skill_name
 *          in: query
 *          description: Name of skill to retrieve
 *          schema:
 *              type: string
 *     responses:
 *       200:
 *         description: >
 *           Successfully fetched skills. Returns a list when no name is given,
 *           or the single matching skill when a name is provided and found.
 *       404:
 *         description: A name was provided but no matching skill was found.
 *
 *       500:
 *         description: Core internal server network execution block.
 *
 */
export async function GET(request: NextRequest) {
    const skill_name = request.nextUrl.searchParams.get("skill_name");
    try{
        if(skill_name){
            const skills =  await getSkillByName(skill_name);
            if(skills){
                return NextResponse.json({ success: true, data: skills }, { status: 200 });
            }

            else{
                return NextResponse.json({ success: false, data: skills }, { status: 404 });
            }

        }

    }
    catch(error){
        return NextResponse.json({ success: false, data: "Error retrieving skill" }, { status: 500 });
    }


}