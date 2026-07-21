// services/roles.ts
import { prisma } from '@/lib/db';
import {Prisma} from "@prisma/client";
import {parsed_resume} from "@/app/actions/resume"
import * as skills from '@/services/skills'
/**
 * Fetches a bounded list of profiles from the cloud database
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
 * Fetches a single profile matching a specific ID parameter
 */
export async function getProfileById(profile_ID: number) {
    return prisma.profile.findUnique({
        where: {
            profile_ID: profile_ID, // Uses the mapped 'Role ID' primary key
        },
    });
}

/**
 * Sets a profile's ideal/dream role.
 * @param profile_ID the profile to update
 * @param roleId the chosen role's id in the roles table
 */
export async function setDreamRole(profile_ID: number, roleId: number) {
    return prisma.profile.update({
        where: { profile_ID },
        data: { roleId },
    });
}

/**
 * Maps parsed resume fields onto the Profile columns shared by create and update.
 * @param resumeId the Resume row (raw resume text) this profile data was parsed from
 */
function resumeToProfileData(resume: parsed_resume, test: boolean, resumeId: number) {
    const totalYears = resume.experiences?.reduce((sum, exp) => sum + (exp.years || 0), 0);

    return {
        fullname: resume.name || "N/A",
        highestDegree: resume.education || "N/A",
        isTest: test,
        educationhistory: resume.educationHistory ?? Prisma.JsonNull,
        yearofexperience: totalYears ?? null,
        profexperience: resume.experiences ?? Prisma.JsonNull,
        skills: resume.skills?.length ? resume.skills.join(", ") : null,
        resumeid: resumeId,
    };
}

/**
 * Create profile based on passed in resume information
 * @param resume data to pass in
 * @param resumeId the Resume row (raw resume text) this profile data was parsed from
 * @param test if the user is a test user or not
 */
export async function createProfile(resume: parsed_resume, resumeId: number, test = false) {
    return prisma.profile.create({
        data: resumeToProfileData(resume, test, resumeId),
    });
}

/**
 * Update an existing profile in place with newly parsed resume information
 * (used when a user who already has a Profile uploads a new resume).
 * @param profile_ID the profile to update
 * @param resume data to pass in
 * @param resumeId the Resume row (raw resume text) this profile data was parsed from
 * @param test if the user is a test user or not
 */
export async function updateProfileFromResume(profile_ID: number, resume: parsed_resume, resumeId: number, test = false) {
    return prisma.profile.update({
        where: { profile_ID },
        data: resumeToProfileData(resume, test, resumeId),
    });
}

export async function getSkillsByProfile(profile_ID: number) {

    return prisma.profile_Skills.findMany({
        where:{
            profileId: profile_ID
        }
    })

}

/**
 * add [id] to a given profile
 * @param profile_ID to add [id] to
 * @param skills_ids array of skill id's to add [id]
 *
 * return the [id] table for the given profile id
 */
export async function addSkillsToProfile(profile_ID: number, skills_ids: number[]) {
    let success = true;
    try{
        for (let i = 0; i < skills_ids.length; i++) {
            await prisma.profile_Skills.create({
                data:{
                    profileId: profile_ID,

                    skillId: skills_ids[i],


                }
            })

        }

    }

    catch(error){
        success = false;
    }

    const data = await getSkillsByProfile(profile_ID);

    return {'success':success, 'data':data};

}

/**
 * add skills to user by name of skill
 * @param profile_ID to add skill to
 * @param skills_name array of skills to add
 */
/**
 * Replace all skills linked to a profile with a fresh set parsed from a resume.
 * Clears existing links first so re-uploads don't hit unique-constraint errors
 * on skills that were already linked.
 * @param profile_ID to replace skills for
 * @param skills_name array of skills to link
 */
export async function replaceProfileSkills(profile_ID: number, skills_name: string[]) {
    await prisma.profile_Skills.deleteMany({ where: { profileId: profile_ID } });
    return addSkillstoProfileByName(profile_ID, skills_name);
}

export async function addSkillstoProfileByName(profile_ID: number, skills_name: string[]) {
    const skills_ids = Array<number>();

    const success = false;

    for (let i = 0; i < skills_name.length; i++) {
        const skill = await skills.getSkillByName(skills_name[i]);
        if(skill != null){
            skills_ids.push(skill.skillId);
        }
    }

    if(skills_ids.length == 0){
        const data = await getSkillsByProfile(profile_ID);


        return {'success':success, 'data':data};
    }

    return await addSkillsToProfile(profile_ID, skills_ids);


}
