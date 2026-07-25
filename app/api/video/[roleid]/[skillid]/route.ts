// app/api/video/[roleid]/[skillid]/route.ts

import {NextRequest, NextResponse} from 'next/server';
import { getYouTubeVideo, saveYouTubeVideo } from '@/services/video';
import {getSkillByName, getSkillsList} from "@/services/skills"; // Imports your clean SQL service layer

/**
 * @swagger
 * /api/video/{roleid}/{skillid}:
 *   get:
 *     tags:
 *          - video
 *     summary: get video for a role
 *     description:
 *       returns a youtube video id for a role id
 *     parameters:
 *        - name: skillId
 *          in: query
 *          description: id of skill to retrieve
 *          schema:
 *              type: number
 *        - name: roleId
 *          in : query
 *          description: id of role to reference
 *          schema:
 *              type: number
 *     responses:
 *       200:
 *         description: >
 *           Successfully fetched video
 *       404:
 *         description: success but no video id was returned
 *
 *       500:
 *         description: Core internal server network execution block.
 *
 */
export async function GET(request: NextRequest) {
    const skillId = Number(request.nextUrl.searchParams.get("skillId"));

    const roleId = Number(request.nextUrl.searchParams.get("roleId"));

    try{
        const videoId = await getYouTubeVideo(skillId, roleId);

        if (videoId.new) {
            await saveYouTubeVideo(skillId, roleId, videoId.video_id);
        }

        if(videoId.video_id){
            return NextResponse.json({ success: videoId.success, data : videoId.video_id}, { status: 200 });
        }
        return NextResponse.json({ success: videoId.success, data : ''}, { status: 404 });

    }
    catch(err){
        return NextResponse.json({ success: false}, { status: 500 });
    }

}



/**
 * @swagger
 * /api/video/{roleid}/{skillid}:
 *   put:
 *     tags:
 *          - video
 *     summary: add video for a role and a skill
 *     description:
 *       returns a youtube video id for a role id
 *     parameters:
 *        - name: skillId
 *          in: query
 *          description: id of skill to retrieve
 *          schema:
 *              type: number
 *        - name: roleId
 *          in : query
 *          description: id of role to reference
 *          schema:
 *              type: number
 *        - name: videoId
 *          in : query
 *          description: youtube video id
 *          schema:
 *              type: number
 *     responses:
 *       200:
 *         description: >
 *           Successfully fetched video
 *       404:
 *         description: success but no video id was returned
 *
 *       500:
 *         description: Core internal server network execution block.
 *
 */
export async function POST(request: NextRequest) {
    const skillId = Number(request.nextUrl.searchParams.get("skillId"));

    const roleId = Number(request.nextUrl.searchParams.get("roleId"));

    const videoId = request.nextUrl.searchParams.get("videoId");

    try{

        if(!videoId){
            return NextResponse.json({ success: false}, { status: 404 });
        }

        const result = await saveYouTubeVideo(skillId, roleId, videoId);

        return NextResponse.json({ success: false, data: result}, { status: 500 })

    }

    catch(err){
        return NextResponse.json({ success: false}, { status: 500 });
    }
}
