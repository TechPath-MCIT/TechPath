// services/roles.ts
import { prisma } from '@/lib/db';
import {Prisma} from "@prisma/client";
import {parsed_resume} from "@/app/actions/resume"
import * as skills from '@/services/skills'
import * as resumes from '@/services/resumes'
import type { ProfileContext } from '@/app/actions/skillProficiency'
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
 * Sets a profile's location.
 * @param profile_ID the profile to update
 * @param location the new location string
 */
export async function setProfileLocation(profile_ID: number, location: string) {
    return prisma.profile.update({
        where: { profile_ID },
        data: { location },
    });
}

/**
 * Corrects a profile's total years of experience.
 * @param profile_ID the profile to update
 * @param years the corrected total years of experience
 */
export async function setYearsOfExperience(profile_ID: number, years: number) {
    return prisma.profile.update({
        where: { profile_ID },
        data: { yearofexperience: years },
    });
}

/**
 * Corrects a profile's highest level of education.
 * @param profile_ID the profile to update
 * @param degree the corrected highest degree, e.g. "M.S. Computer Science"
 */
export async function setHighestDegree(profile_ID: number, degree: string) {
    return prisma.profile.update({
        where: { profile_ID },
        data: { highestDegree: degree },
    });
}

export type WorkExperienceEntry = {
    company: string;
    title: string;
    years: number;
    bullets: string[];
};

/**
 * Prepends a new work experience entry to a profile's experience history
 * (most recent first, matching the convention set by resume parsing).
 * @param profile_ID the profile to update
 * @param entry the new work experience entry
 */
export async function addWorkExperience(profile_ID: number, entry: WorkExperienceEntry) {
    const current = await prisma.profile.findUnique({
        where: { profile_ID },
        select: { profexperience: true },
    });

    const existing = Array.isArray(current?.profexperience) ? current.profexperience : [];
    const updated = [entry, ...existing];

    return prisma.profile.update({
        where: { profile_ID },
        data: { profexperience: updated as unknown as Prisma.InputJsonValue },
    });
}

export type ProjectEntry = {
    name: string;
    dateRange?: string;
    bullets: string[];
};

/**
 * Prepends a new project to a profile's project list (most recent first,
 * matching the convention set by resume parsing).
 * @param profile_ID the profile to update
 * @param entry the new project entry
 */
export async function addProject(profile_ID: number, entry: ProjectEntry) {
    const current = await prisma.profile.findUnique({
        where: { profile_ID },
        select: { projects: true },
    });

    const existing = Array.isArray(current?.projects) ? current.projects : [];
    const updated = [entry, ...existing];

    return prisma.profile.update({
        where: { profile_ID },
        data: { projects: updated as unknown as Prisma.InputJsonValue },
    });
}

/**
 * Removes a project from a profile's project list by name (case-insensitive).
 * @param profile_ID the profile to update
 * @param projectName the name of the project to remove
 * @returns whether a matching project was actually found and removed
 */
export async function removeProject(profile_ID: number, projectName: string): Promise<boolean> {
    const current = await prisma.profile.findUnique({
        where: { profile_ID },
        select: { projects: true },
    });

    const existing = Array.isArray(current?.projects) ? current.projects : [];
    const query = projectName.trim().toLowerCase();

    const remaining = existing.filter((entry) => {
        const name = (entry as { name?: unknown })?.name;
        return typeof name !== 'string' || name.toLowerCase() !== query;
    });

    if (remaining.length === existing.length) {
        return false;
    }

    await prisma.profile.update({
        where: { profile_ID },
        data: { projects: remaining as unknown as Prisma.InputJsonValue },
    });

    return true;
}

export type EducationEntry = {
    school: string;
    degree: string;
    dateRange: string;
    gpa?: string;
};

/**
 * Prepends a new education entry to a profile's education history
 * (most recent first, matching the convention set by resume parsing).
 * @param profile_ID the profile to update
 * @param entry the new education entry
 */
export async function addEducationEntry(profile_ID: number, entry: EducationEntry) {
    const current = await prisma.profile.findUnique({
        where: { profile_ID },
        select: { educationhistory: true },
    });

    const existing = Array.isArray(current?.educationhistory) ? current.educationhistory : [];
    const updated = [entry, ...existing];

    return prisma.profile.update({
        where: { profile_ID },
        data: { educationhistory: updated as unknown as Prisma.InputJsonValue },
    });
}


/**
 * Maps parsed resume fields onto the Profile columns shared by create, update,
 * and in-place edits — everything except `resumeid`/`isTest`, which only make
 * sense in the context of a fresh resume upload (see resumeToProfileData).
 */
function resumeFieldsForUpdate(resume: parsed_resume) {
    const totalYears = resume.experiences?.reduce((sum, exp) => sum + (exp.years || 0), 0);

    return {
        fullname: resume.name || "N/A",
        highestDegree: resume.education || "N/A",
        educationhistory: resume.educationHistory ?? Prisma.JsonNull,
        yearofexperience: totalYears ?? null,
        profexperience: resume.experiences ?? Prisma.JsonNull,
        projects: resume.projects ?? Prisma.JsonNull,
        skills: resume.skills?.length ? resume.skills.join(", ") : null,
        location: resume.location || null,
    };
}

/**
 * Maps parsed resume fields onto the Profile columns shared by create and update.
 * @param resumeId the Resume row (raw resume text) this profile data was parsed from
 */
function resumeToProfileData(resume: parsed_resume, test: boolean, resumeId: number) {
    return {
        ...resumeFieldsForUpdate(resume),
        isTest: test,
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

/**
 * Updates an already-saved profile's fields in place from user edits (e.g. the
 * profile-edit page), without touching its linked `resumeid`/`isTest` — unlike
 * updateProfileFromResume, this isn't tied to a new resume upload.
 * @param profile_ID the profile to update
 * @param resume the edited field values
 */
export async function updateProfileFields(profile_ID: number, resume: parsed_resume) {
    return prisma.profile.update({
        where: { profile_ID },
        data: resumeFieldsForUpdate(resume),
    });
}

type ResumeExperienceEntry = {
    title?: unknown;
    bullets?: unknown;
};

/**
 * Pulls the current role (most recent job title) and top experience bullets
 * out of a profile's stored `profexperience` JSON blob.
 */
export function extractResumeSummary(profexperience: unknown): {
    currentRole: string | null;
    experienceHighlights: string[];
} {
    const experiences = Array.isArray(profexperience)
        ? (profexperience as ResumeExperienceEntry[])
        : [];

    const currentRole = experiences.find(
        (experience): experience is ResumeExperienceEntry & { title: string } =>
            typeof experience.title === 'string',
    )?.title ?? null;

    const experienceHighlights = experiences
        .flatMap((experience) =>
            Array.isArray(experience.bullets)
                ? experience.bullets.filter((bullet): bullet is string => typeof bullet === 'string')
                : [],
        )
        .slice(0, 3);

    return { currentRole, experienceHighlights };
}

type ResumeProjectEntry = {
    name?: unknown;
    dateRange?: unknown;
    bullets?: unknown;
};

/**
 * Parses a profile's `projects` JSON blob (from resume parsing) into a
 * typed array, discarding anything malformed rather than throwing.
 */
export function extractProjects(projects: unknown): {
    name: string;
    dateRange?: string;
    bullets: string[];
}[] {
    const entries = Array.isArray(projects) ? (projects as ResumeProjectEntry[]) : [];

    return entries.flatMap((entry) => {
        if (typeof entry.name !== 'string') return [];

        return [{
            name: entry.name,
            dateRange: typeof entry.dateRange === 'string' ? entry.dateRange : undefined,
            bullets: Array.isArray(entry.bullets)
                ? entry.bullets.filter((bullet): bullet is string => typeof bullet === 'string')
                : [],
        }];
    });
}

/**
 * Builds the ProfileContext shape rateSkillProficiencies expects, from a raw
 * profile row (plus its linked resume's raw text, when available). Shared by
 * the skill-ratings route and the agent's get_skill_proficiency tool so both
 * feed the AI rater identically-shaped evidence.
 */
export async function buildSkillProficiencyContext(profile: {
    skills: string | null;
    highestDegree: string | null;
    yearofexperience: number | null;
    profexperience: unknown;
    educationhistory: unknown;
    projects: unknown;
    resumeid: number | null;
}): Promise<ProfileContext> {
    const experiences = Array.isArray(profile.profexperience)
        ? (profile.profexperience as ProfileContext['experiences'])
        : [];

    const educationHistory = Array.isArray(profile.educationhistory)
        ? (profile.educationhistory as ProfileContext['educationHistory'])
        : [];

    const projects = extractProjects(profile.projects);

    const resume = profile.resumeid ? await resumes.getResumeById(profile.resumeid) : null;

    return {
        skills: profile.skills
            ? profile.skills.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        highestDegree: profile.highestDegree || null,
        yearsOfExperience: profile.yearofexperience,
        experiences,
        educationHistory,
        projects,
        rawResumeText: resume?.rawtext ?? null,
    };
}

export async function getSkillsByProfile(profile_ID: number) {

    return prisma.profile_Skills.findMany({
        where:{
            profileId: profile_ID
        },
        include: {
            Skills: true,
        },
    })

}

/**
 * Fetches the resources associated with a profile (via profile_resource),
 * optionally filtered by resource status id and/or resource type.
 * Includes the underlying resource row and the linked status for each entry.
 * @param profile_ID the profile whose resources to fetch
 * @param statusId optional resource_status.status_id to filter by; omit for all statuses
 * @param resourceType optional resources.resource_type to filter by; omit for all types
 */
export async function getResourcesByProfile(profile_ID: number, statusId?: number, resourceType?: string) {
    return prisma.profile_resource.findMany({
        where: {
            profile_id: profile_ID,
            ...(statusId !== undefined ? { statusId } : {}),
            ...(resourceType ? { resource: { resource_type: resourceType } } : {}),
        },
        include: {
            resource: {
                include: {
                    courses: true,
                    resource_skills: {
                        include: {
                            skills: true,
                        },
                    },
                },
            },
            status: true,
        },
        // Without an explicit order, Postgres doesn't guarantee row order for
        // a plain scan — updating a row (e.g. editing its end date) can shift
        // its physical position and reshuffle the list. Ordering by id keeps
        // it stable (insertion order) regardless of later updates.
        orderBy: { id: 'asc' },
    });
}

export interface ResourceDateUpdates {
    startDate?: Date | null;
    expectedEndDate?: Date | null;
}

/**
 * Sets the status of a resource for a profile. If a profile_resource row
 * already exists for this (profile, resource) pair, its status is updated;
 * otherwise a new row is inserted.
 *
 * `dates`, when given, are written alongside the status (used when enrolling
 * with a start/end date, or when only updating the end date). Omitting a key
 * — or omitting `dates` entirely — leaves that date column untouched, so
 * completing or cancelling a resource doesn't erase its enrollment dates.
 * @param profile_ID the profile the resource belongs to
 * @param resource_id the resource to set status for
 * @param statusId the resource_status.status_id to set
 * @param dates optional startDate/expectedEndDate to write alongside the status
 */
export async function setResourceStatusForProfile(
    profile_ID: number,
    resource_id: string,
    statusId: number,
    dates?: ResourceDateUpdates,
) {
    const statusRow = await prisma.resource_status.findUnique({
        where: { status_id: statusId },
        select: { status_id: true },
    });

    if (!statusRow) {
        throw new Error(`Unknown resource status id: ${statusId}`);
    }

    const dateFields: ResourceDateUpdates = {};
    if (dates?.startDate !== undefined) dateFields.startDate = dates.startDate;
    if (dates?.expectedEndDate !== undefined) dateFields.expectedEndDate = dates.expectedEndDate;

    const existing = await prisma.profile_resource.findFirst({
        where: {
            profile_id: profile_ID,
            resource_id,
        },
        select: { id: true },
    });

    if (existing) {
        return prisma.profile_resource.update({
            where: { id: existing.id },
            data: { statusId, ...dateFields },
        });
    }

    return prisma.profile_resource.create({
        data: {
            profile_id: profile_ID,
            resource_id,
            statusId,
            ...dateFields,
        },
    });
}

/**
 * Marks a resource as complete for a profile and rolls the skills that the
 * resource teaches onto the profile. Sets the profile_resource status to the
 * given statusId (defaults to the "Complete" status), then links every skill
 * associated with the resource to the profile and appends their names to the
 * profile's `skills` display string so the UI and agent stay in sync.
 * @param profile_ID the profile completing the resource
 * @param resource_id the resource to mark complete
 * @param statusId the resource_status.status_id representing completion
 */
export async function completeResourceForProfile(profile_ID: number, resource_id: string, statusId: number) {
    const link = await setResourceStatusForProfile(profile_ID, resource_id, statusId);

    const resourceSkills = await prisma.resource_skills.findMany({
        where: { resource_id },
        include: { skills: true },
    });

    const skillIds = resourceSkills.map((row) => row.skill_id);
    const skillNames = resourceSkills
        .map((row) => row.skills?.name)
        .filter((name): name is string => Boolean(name));

    let addedSkills: string[] = [];
    if (skillIds.length > 0) {
        const addResult = await addSkillsToProfile(profile_ID, skillIds);
        if (addResult.success && skillNames.length > 0) {
            await appendSkillsToField(profile_ID, skillNames);
            addedSkills = skillNames;
        }
    }

    return { link, addedSkills };
}

/**
 * Appends newly linked skill names onto the profile's `skills` display
 * string (used by the UI and the AI agent's context), so it stays in sync
 * after skills are added via addSkillsToProfile/addSkillstoProfileByName.
 * Additive only — never removes or reorders names already present, since
 * Profile_Skills isn't guaranteed to be a complete mirror of every name in
 * the display string (e.g. resume-parsed skills that don't exactly match
 * the skill catalog never get linked there in the first place).
 */
export async function appendSkillsToField(profile_ID: number, newNames: string[]): Promise<string[]> {
    const current = await prisma.profile.findUnique({
        where: { profile_ID },
        select: { skills: true },
    });

    const existing = current?.skills
        ? current.skills.split(',').map((name) => name.trim()).filter(Boolean)
        : [];

    const existingLower = new Set(existing.map((name) => name.toLowerCase()));
    const merged = [...existing];

    for (const name of newNames) {
        if (!existingLower.has(name.toLowerCase())) {
            merged.push(name);
            existingLower.add(name.toLowerCase());
        }
    }

    await prisma.profile.update({
        where: { profile_ID },
        data: { skills: merged.length ? merged.join(', ') : null },
    });

    return merged;
}

/**
 * Unlinks the given skills from a profile (Profile_Skills rows).
 * @param profile_ID to remove skills from
 * @param skills_ids skill ids to unlink
 */
export async function removeSkillsFromProfile(profile_ID: number, skills_ids: number[]) {
    const result = await prisma.profile_Skills.deleteMany({
        where: {
            profileId: profile_ID,
            skillId: { in: skills_ids },
        },
    });

    return { success: true, count: result.count };
}

/**
 * Removes names from the profile's `skills` display string. Counterpart to
 * appendSkillsToField — only removes names that are present, case-insensitive.
 */
export async function removeSkillsFromField(profile_ID: number, namesToRemove: string[]): Promise<string[]> {
    const current = await prisma.profile.findUnique({
        where: { profile_ID },
        select: { skills: true },
    });

    const existing = current?.skills
        ? current.skills.split(',').map((name) => name.trim()).filter(Boolean)
        : [];

    const toRemoveLower = new Set(namesToRemove.map((name) => name.toLowerCase()));
    const remaining = existing.filter((name) => !toRemoveLower.has(name.toLowerCase()));

    await prisma.profile.update({
        where: { profile_ID },
        data: { skills: remaining.length ? remaining.join(', ') : null },
    });

    return remaining;
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
        await prisma.profile_Skills.createMany({
            data: skills_ids.map((skillId) => ({
                profileId: profile_ID,
                skillId,
            })),
            skipDuplicates: true,
        });
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
 * on skills that were already linked. Also invalidates any cached AI skill
 * proficiency ratings for this profile, since they were computed against the
 * skill set/experience this call is about to change.
 * @param profile_ID to replace skills for
 * @param skills_name array of skills to link
 */
export async function replaceProfileSkills(profile_ID: number, skills_name: string[]) {
    await prisma.profile_Skills.deleteMany({ where: { profileId: profile_ID } });
    await prisma.profileSkillRating.deleteMany({ where: { profileId: profile_ID } });
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
