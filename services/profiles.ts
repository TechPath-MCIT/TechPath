// services/roles.ts
import { prisma } from '@/lib/db';
import {Prisma} from "@prisma/client";
import {parsed_resume} from "@/app/actions/resume"
import {email} from "zod";
/**
 * Fetches a bounded list of roles from the cloud database
 * @param limit Number of records to return
 */
export async function getProfileList(limit: number = 10) {
    return prisma.profile.findMany({
        take: limit,
        orderBy: {
            profile_ID: 'asc', // Keeps the output in a consistent order
        },
    });
}

/**
 * Fetches a single role matching a specific ID parameter
 */
export async function getProfileById(profile_ID: number) {
    return prisma.profile.findUnique({
        where: {
            profile_ID: profile_ID, // Uses the mapped 'Role ID' primary key
        },
    });
}

export async function createProfile( resume : parsed_resume, test = false): Promise<boolean> {

    if(!resume.success){
        return false;
    }

    const full_name = resume.name || "N/A";

    const highestDegree = resume.education ||"N/A";


    try{
        const result = await prisma.profile.create(
            {
                data : {
                    highestDegree : highestDegree,
                    fullname  : full_name,
                    isTest : test,
                }


            }

        )

        return true;

    }

    catch(err){
        return false;
    }








}
