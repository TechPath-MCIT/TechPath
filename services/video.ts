import * as gapi from "googleapis"
import {Video} from "lucide-react";
import * as Skill from "@/services/skills"
import * as Role from "@/services/roles"
import { google, youtube_v3 } from 'googleapis';
import { prisma } from '@/lib/db';
import * as dotenv from 'dotenv';
import {boolean} from "zod";
type youtube_id = {
    success: boolean

    video_id: string

    new? : boolean
}

const ms_per_day = 1000 * 60 * 60 * 24;
dotenv.config({ path: '.env.local' });
// 1. Initialize the YouTube API client

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});


export async function saveYouTubeVideo(skill_id:number, role_id : number, video_id: string) {

    return  prisma.role_skills.updateManyAndReturn({
        where:{
            Role_ID: role_id,
            Skill_ID: skill_id,
        },

        data:{
            videoid : video_id,
            queryDate : new Date()
        }

        }
    );

}


export async function getYouTubeVideo(skill_id:number, role_id : number): Promise<youtube_id> {
    const row = await prisma.role_skills.findFirst({
        where: {
            Role_ID: role_id,
            Skill_ID: skill_id,
        },
        select:{
            videoid : true,
            queryDate : true,
        },
    });
    if (row && row.videoid && row.queryDate) {
        const video_id = row.videoid;
        const datediff = (new Date().valueOf() - new Date(row.queryDate).valueOf()) / ms_per_day;
        if(datediff < 7){
            return {
                success: true,
                video_id: row.videoid,
                new: false
            }
        }

    }
    try{
        const skill = await Skill.getSkillById(skill_id);
        const role = await Role.getRoleById(role_id);
        //check if both are null
        if (!skill && !role){
            return {
                success : false,
                video_id: ''
            }
        }
        const query = `${skill?.name ?? ''} for ${role?.role ?? ''}`;
        const response = await youtube.search.list({
                part: ['snippet'],
                q: query,
                relevanceLanguage: "en",
                videoDuration: "long",
                type: ['video'], // restrict results to videos only
                maxResults: 1,
            }
        )

        if (response.statusText != 'OK') {
            return  {
                success: false,
                video_id: '',

            };
        }
        // @ts-ignore
        const video_id = response.data.items[0].id.videoId || ''
        await saveYouTubeVideo(skill_id, role_id, video_id);
        return {
            success : true,
            video_id :video_id,
            new : true
        }

    }

    catch(error){
        return {
            success : false,
            video_id: ''
        }
    }




}