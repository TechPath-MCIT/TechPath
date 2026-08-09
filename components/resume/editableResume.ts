export type EducationEntry = {
  school: string;
  degree: string;
  dateRange: string;
  gpa: string;
};

export type ExperienceEntry = {
  company: string;
  title: string;
  years: string;
  bullets: string[];
};

export type ProjectEntry = {
  name: string;
  dateRange: string;
  bullets: string[];
};

export type EditableResume = {
  name: string;
  email: string;
  location: string;
  education: string;
  skills: string[];
  educationHistory: EducationEntry[];
  experiences: ExperienceEntry[];
  projects: ProjectEntry[];
  rawText: string;
};

/**
 * Defensively coerces an arbitrary parsed-resume-shaped object (e.g. the
 * response from POST /api/resumes/parse, or a Profile row adapted by a
 * caller) into the shape this form expects.
 */
export function normalizeParsedResume(raw: unknown): EditableResume {
  const r = (raw ?? {}) as Record<string, unknown>;

  const educationHistory = Array.isArray(r.educationHistory)
    ? r.educationHistory.map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>;
        return {
          school: typeof e.school === "string" ? e.school : "",
          degree: typeof e.degree === "string" ? e.degree : "",
          dateRange: typeof e.dateRange === "string" ? e.dateRange : "",
          gpa: typeof e.gpa === "string" ? e.gpa : "",
        };
      })
    : [];

  const experiences = Array.isArray(r.experiences)
    ? r.experiences.map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>;
        return {
          company: typeof e.company === "string" ? e.company : "",
          title: typeof e.title === "string" ? e.title : "",
          years: typeof e.years === "number" ? String(e.years) : typeof e.years === "string" ? e.years : "",
          bullets: Array.isArray(e.bullets)
            ? e.bullets.filter((b): b is string => typeof b === "string")
            : [],
        };
      })
    : [];

  const projects = Array.isArray(r.projects)
    ? r.projects.map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>;
        return {
          name: typeof e.name === "string" ? e.name : "",
          dateRange: typeof e.dateRange === "string" ? e.dateRange : "",
          bullets: Array.isArray(e.bullets)
            ? e.bullets.filter((b): b is string => typeof b === "string")
            : [],
        };
      })
    : [];

  return {
    name: typeof r.name === "string" ? r.name : "",
    email: typeof r.email === "string" ? r.email : "",
    location: typeof r.location === "string" ? r.location : "",
    education: typeof r.education === "string" ? r.education : "",
    skills: Array.isArray(r.skills)
      ? r.skills.filter((s): s is string => typeof s === "string")
      : [],
    educationHistory,
    experiences,
    projects,
    rawText: typeof r.rawText === "string" ? r.rawText : "",
  };
}

/**
 * Adapts a saved Profile row (DB field names/shapes) into the same generic
 * shape normalizeParsedResume expects, then delegates to it — keeping a
 * single place that defines what a "valid" EditableResume looks like,
 * whether the source is a freshly parsed resume or an already-saved profile.
 */
export function profileToEditableResume(
  profile: {
    fullname: string;
    highestDegree: string;
    location: string | null;
    skills: string | null;
    educationhistory: unknown;
    profexperience: unknown;
    projects: unknown;
  },
  email: string,
): EditableResume {
  return normalizeParsedResume({
    name: profile.fullname,
    email,
    location: profile.location ?? "",
    education: profile.highestDegree,
    skills: profile.skills
      ? profile.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    educationHistory: profile.educationhistory,
    experiences: profile.profexperience,
    projects: profile.projects,
  });
}

/**
 * Maps this form's editable shape back onto the parsed_resume wire shape
 * consumed by POST /api/profiles.
 */
export function toResumePayload(resume: EditableResume) {
  return {
    name: resume.name,
    email: resume.email,
    location: resume.location,
    education: resume.education,
    skills: resume.skills.filter((s) => s.trim().length > 0),
    educationHistory: resume.educationHistory.map((entry) => ({
      school: entry.school,
      degree: entry.degree,
      dateRange: entry.dateRange,
      ...(entry.gpa.trim() ? { gpa: entry.gpa } : {}),
    })),
    experiences: resume.experiences.map((entry) => ({
      company: entry.company,
      title: entry.title,
      years: Number(entry.years) || 0,
      bullets: entry.bullets.filter((b) => b.trim().length > 0),
    })),
    projects: resume.projects.map((entry) => ({
      name: entry.name,
      ...(entry.dateRange.trim() ? { dateRange: entry.dateRange } : {}),
      bullets: entry.bullets.filter((b) => b.trim().length > 0),
    })),
    rawText: resume.rawText,
  };
}
