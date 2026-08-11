import { prisma } from "@/lib/db";

interface OutsideCourseFilters {
  limit?: number;
}

// The full table spans 13 categories (Business, Health, Arts and Humanities,
// etc.) with Business alone outnumbering every tech category combined, so an
// unfiltered rating-sorted slice skews mostly non-tech. Restricted to the
// categories that are unambiguously tech-relevant for this platform.
const TECH_CATEGORIES = ["Computer Science", "Data Science", "Information Technology"];

/**
 * Fetches external courses (e.g. Coursera specializations) shaped to match
 * the Grind page's ResourceApiItem, so the existing card-rendering/filtering
 * code in GrindPage.tsx works without changes. Deliberately does not attempt
 * to link `skills`/`instructors` (free text on this table) against the Skill
 * catalog — see services/skills.ts:getSkillByName for why exact-string
 * matching against free text is fragile; these are label-only tags here,
 * purely for display and substring search, not real skill relations.
 */
// The import scraped the same course multiple times under different URLs
// (e.g. once standalone, once via a specialization page) — 207 distinct
// titles are duplicated this way, one as many as 7 times. Over-fetch and
// dedupe by title so a `limit`-sized page still returns `limit` distinct
// courses rather than being padded out with repeats.
const DEDUPE_FETCH_MULTIPLIER = 3;

export async function getOutsideCourses({ limit = 150 }: OutsideCourseFilters = {}) {
  const rows = await prisma.outsideCourseResource.findMany({
    where: { category: { in: TECH_CATEGORIES } },
    orderBy: [{ rating: "desc" }, { title: "asc" }],
    take: limit * DEDUPE_FETCH_MULTIPLIER,
  });

  const seenTitles = new Set<string>();
  const deduped = rows.filter((row) => {
    const key = row.title.trim().toLowerCase();
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  return deduped.slice(0, limit).map((row) => ({
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
