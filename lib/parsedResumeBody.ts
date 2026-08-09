import { type parsed_resume } from "@/app/actions/resume";

function toStringOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function toStringArray(value: unknown): string[] | undefined {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : undefined;
}

/**
 * Coerces an arbitrary JSON request body into a parsed_resume shape, trusting
 * the client (the resume-review / profile-edit pages) to have already
 * validated field types client-side — this just guards against outright
 * wrong types reaching the DB.
 */
export function toParsedResume(body: any): parsed_resume {
    return {
        name: toStringOrUndefined(body?.name),
        email: toStringOrUndefined(body?.email),
        location: toStringOrUndefined(body?.location),
        skills: toStringArray(body?.skills),
        education: toStringOrUndefined(body?.education),
        educationHistory: Array.isArray(body?.educationHistory) ? body.educationHistory : undefined,
        experiences: Array.isArray(body?.experiences) ? body.experiences : undefined,
        projects: Array.isArray(body?.projects) ? body.projects : undefined,
        rawText: toStringOrUndefined(body?.rawText),
        success: true,
    };
}
