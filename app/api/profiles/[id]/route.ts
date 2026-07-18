// app/api/profiles/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import * as profile from '@/services/profiles'; // Imports your clean SQL service layer
import { parsed_resume, resumeParser } from "@/app/actions/resume";
import { createSwaggerSpec, withSwagger } from "next-swagger-doc";
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as profiles from '@/services/profiles';
/**
 * @swagger
 * /api/profiles/{id}:
 *   get:
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