import { prisma } from "@/lib/db";

interface ResourceFilters {
  type?: string | string[];
  source?: string;
  limit?: number;
  // When provided, results are ranked by relevance to this role instead of
  // alphabetically — relevance is the sum of (skill's coverage weight on the
  // resource * skill's importance weight for the role), so a course teaching
  // several highly-weighted skills for this role ranks above one that only
  // touches skills irrelevant to it.
  roleId?: number;
}

export async function getResources({
  type,
  source,
  limit = 50,
  roleId,
}: ResourceFilters = {}) {
  const [rows, roleSkillRows] = await Promise.all([
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
      take: limit,
    }),
    roleId == null
      ? Promise.resolve([])
      : prisma.role_skills.findMany({ where: { Role_ID: roleId } }),
  ]);

  const roleSkillWeights = new Map(
    roleSkillRows
      .filter((row) => row.Skill_ID !== null)
      .map((row) => [row.Skill_ID as number, row.count ?? 0]),
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

  return withRelevance.map((entry) => entry.resource);
}