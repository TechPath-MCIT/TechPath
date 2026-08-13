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

    duration_minutes?: number | null

    new? : boolean
}

const ms_per_day = 1000 * 60 * 60 * 24;

// Parses a YouTube contentDetails.duration ISO 8601 string (e.g. "PT14M8S",
// "PT1H2M10S") into whole minutes, rounding up so a 45-second video doesn't
// display as "0 min". Returns null for anything that doesn't match.
function parseIso8601DurationToMinutes(duration: string): number | null {
    const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
    if (!match) return null;

    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2] ?? 0);
    const seconds = Number(match[3] ?? 0);

    return Math.max(1, Math.ceil(hours * 60 + minutes + seconds / 60));
}

// search.list doesn't return duration — only videos.list with contentDetails
// does, so a second call is needed to get it.
async function fetchVideoDurationMinutes(video_id: string): Promise<number | null> {
    try {
        const detailsResponse = await youtube.videos.list({
            part: ['contentDetails'],
            id: [video_id],
        });
        const isoDuration = detailsResponse.data.items?.[0]?.contentDetails?.duration;
        return isoDuration ? parseIso8601DurationToMinutes(isoDuration) : null;
    } catch {
        return null;
    }
}
dotenv.config({ path: '.env.local' });
// 1. Initialize the YouTube API client

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});


export async function saveYouTubeVideo(skill_id:number, role_id : number, video_id: string, duration_minutes?: number | null) {

    return  prisma.role_skills.updateManyAndReturn({
        where:{
            Role_ID: role_id,
            Skill_ID: skill_id,
        },

        data:{
            videoid : video_id,
            queryDate : new Date(),
            ...(duration_minutes !== undefined ? { videoDurationMinutes: duration_minutes } : {}),
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
            videoDurationMinutes : true,
        },
    });
    if (row && row.videoid && row.queryDate) {
        const video_id = row.videoid;
        const datediff = (new Date().valueOf() - new Date(row.queryDate).valueOf()) / ms_per_day;
        if(datediff < 7){
            // Cached videos saved before duration tracking existed have
            // videoDurationMinutes: null even though they're otherwise still
            // fresh — backfill it with one extra lookup instead of leaving it
            // blank for the rest of the 7-day cache window.
            let duration_minutes = row.videoDurationMinutes;
            if (duration_minutes === null) {
                duration_minutes = await fetchVideoDurationMinutes(video_id);
                if (duration_minutes !== null) {
                    await saveYouTubeVideo(skill_id, role_id, video_id, duration_minutes);
                }
            }

            return {
                success: true,
                video_id: row.videoid,
                duration_minutes,
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

        const duration_minutes = video_id ? await fetchVideoDurationMinutes(video_id) : null;

        await saveYouTubeVideo(skill_id, role_id, video_id, duration_minutes);
        return {
            success : true,
            video_id :video_id,
            duration_minutes,
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