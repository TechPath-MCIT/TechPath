import { prisma } from "@/lib/db";
import { CATEGORY_BY_SKILL_TYPE, type Category } from "@/services/match";

interface ResourceFilters {
  type?: string | string[];
  source?: string;
  limit?: number;
  // When provided, results are ranked by relevance to this role instead of
  // alphabetically — relevance is the sum of (skill's coverage weight on the
  // resource * skill's importance weight for the role * the role's importance
  // weight for that skill's category), so a course teaching several
  // highly-weighted skills for this role ranks above one that only touches
  // skills irrelevant to it. The category weighting matters because raw
  // role_skills counts skew toward Coding Language skills for nearly every
  // role (confirmed live: even Product Manager's top-weighted skills are
  // dominated by SQL/Java/C/C++/JS) — without it, courses effectively rank
  // the same regardless of target role, since MCIT courses are only tagged
  // with a handful of Coding Language/Database skills.
  roleId?: number;
}

export async function getResources({
  type,
  source,
  limit = 50,
  roleId,
}: ResourceFilters = {}) {
  const [rows, roleSkillRows, role] = await Promise.all([
    prisma.resources.findMany({
      where: {
        publication_status: "published",
        resource_type: Array.isArray(type) ? { in: type } : type,
        source: source
          ? {
              equals: source,
              mode: "insensitive",
            }
          : undefined,
      },
      include: {
        courses: true,
        resource_skills: {
          include: {
            skills: true,
          },
          orderBy: {
            coverage_weight: "desc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      // Capping via `take` here would slice the candidate pool BEFORE
      // relevance sorting runs below, silently dropping resources that would
      // have ranked highest for this role. Only safe to cap up front when
      // there's no relevance ranking to apply.
      take: roleId == null ? limit : undefined,
    }),
    roleId == null
      ? Promise.resolve([])
      : prisma.role_skills.findMany({ where: { Role_ID: roleId }, include: { skills: true } }),
    roleId == null ? Promise.resolve(null) : prisma.role.findUnique({ where: { roleId } }),
  ]);

  const categoryImportance: Record<Category, number> = {
    CL: role?.codingLanguageImportance ?? 0,
    WF: role?.webFrameworkImportance ?? 0,
    DB: role?.databaseImportance ?? 0,
  };

  const roleSkillWeights = new Map(
    roleSkillRows
      .filter((row) => row.Skill_ID !== null)
      .map((row) => {
        const category = CATEGORY_BY_SKILL_TYPE[row.skills?.type ?? ""];
        const weight = category ? (row.count ?? 0) * categoryImportance[category] : 0;
        return [row.Skill_ID as number, weight];
      }),
  );

  const mapped = rows.map((resource) => ({
    id: resource.resource_id,
    type: resource.resource_type,
    name: resource.name,
    description: resource.description,
    source: resource.source,
    url: resource.source_url,

    pricing: {
      type: resource.pricing_type,
      amount:
        resource.cost_amount === null
          ? null
          : Number(resource.cost_amount),
      currency: resource.cost_currency,
      note: resource.pricing_note,
    },

    durationMinutes: resource.duration_minutes,
    publicationStatus: resource.publication_status,

    skills: resource.resource_skills.map((item) => ({
      skillId: item.skill_id,
      name: item.skills.name,
      coverageWeight: Number(item.coverage_weight),
    })),

    course: resource.courses
      ? {
          courseId: resource.courses.course_id,
          units:
            resource.courses.course_units === null
              ? null
              : Number(resource.courses.course_units),
          prerequisites: resource.courses.prerequisites,
          creators: resource.courses.creators,
        }
      : null,
  }));

  if (roleId == null) return mapped;

  const withRelevance = mapped.map((resource) => ({
    resource,
    relevance: resource.skills.reduce(
      (sum, skill) => sum + skill.coverageWeight * (roleSkillWeights.get(skill.skillId) ?? 0),
      0,
    ),
  }));

  withRelevance.sort((a, b) => b.relevance - a.relevance || (a.resource.name ?? "").localeCompare(b.resource.name ?? ""));

  return withRelevance.slice(0, limit).map((entry) => entry.resource);
}