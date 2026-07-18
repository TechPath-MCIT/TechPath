// app/api/profiles/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profile from '@/services/profiles'; // Imports your clean SQL service layer
import { parsed_resume, resumeParser } from "@/app/actions/resume";
import { createSwaggerSpec, withSwagger } from "next-swagger-doc";
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as profiles from '@/services/profiles';

interface RouteContext {
    params: Promise<{ id: string }>
}
/**
 * @swagger
 * /api/profiles/{id}/skills:
 *   get:
 *     summary: get skills by id
 *     description:
 *       return the skills based on given id, if it exists
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
export async function GET(request: NextRequest, context: RouteContext)  {
    const resolve_params = await context.params;

    try{
        const profile_id = Number(resolve_params.id);
        if(profile_id){
            const skills =  await profiles.getSkillsByProfile(profile_id);
            if(skills){
                return NextResponse.json({ success: true, data: skills }, { status: 200 });
            }

            else{
                return NextResponse.json({ success: false, data: skills }, { status: 404 });
            }

        }

    }
    catch(error){
        return NextResponse.json({ success: false, data: "Error retrieving profile" }, { status: 500 });
    }
}
/**
 * @swagger
 * /api/profiles/{id}/skills:
 *   put:
 *     summary: get skills by id
 *     description:
 *       return the skills based on given id, if it exists
 *     requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  profile_id:
 *                      type: number
 *                  skills:
 *                      type: array
 *                      items:
 *                          type: string
 *
 *     responses:
 *       200:
 *         description:
 *           Successfully fetched profile. Returns the single matching skill when a name is provided and found.
 *       409:
 *         description: failed update database due to conflict
 *
 *       500:
 *         description: Core internal server network execution block.
 *
 */
export async function PUT(request: NextRequest)  {
    try{

        const data = await request.json();

        const profile_id = Number(data.profile_id);

        const skills = data.skills as string[];

        const result = await profiles.addSkillstoProfileByName(profile_id, skills);


        if(result.success){
            return NextResponse.json({ success: true, data: result.data }, { status: 200 })
        }

        else{
            return NextResponse.json({ success: false, data: result.data }, { status: 409 })
        }


    }

    catch (error: any) {
        return NextResponse.json({success: false, error: error.message}, {status: 500});
    }
}