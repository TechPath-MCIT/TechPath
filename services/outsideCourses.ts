import { prisma } from "@/lib/db";

interface OutsideCourseFilters {
  limit?: number;
}

/**
 * Fetches external courses (e.g. Coursera specializations) shaped to match
 * the Grind page's ResourceApiItem, so the existing card-rendering/filtering
 * code in GrindPage.tsx works without changes. Deliberately does not attempt
 * to link `skills`/`instructors` (free text on this table) against the Skill
 * catalog — see services/skills.ts:getSkillByName for why exact-string
 * matching against free text is fragile; these are label-only tags here,
 * purely for display and substring search, not real skill relations.
 */
export async function getOutsideCourses({ limit = 150 }: OutsideCourseFilters = {}) {
  const rows = await prisma.outsideCourseResource.findMany({
    orderBy: [{ rating: "desc" }, { title: "asc" }],
    take: limit,
  });

  return rows.map((row) => ({
    id: `outside-${row.id}`,
    type: "course",
    name: row.title,
    description: row.shortIntro,
    source: row.site,
    url: row.url,

    pricing: {
      type: "unknown",
      amount: null,
      currency: null,
      note: null,
    },

    durationMinutes: null,
    durationText: row.duration,
    instructorText: row.instructors,
    publicationStatus: "published",

    skills: (row.skills ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, index) => ({
        skillId: -(index + 1),
        name,
        coverageWeight: 0,
      })),

    course: null,
    isExternal: true,
  }));
}
