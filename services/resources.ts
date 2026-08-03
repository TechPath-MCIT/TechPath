import { prisma } from "@/lib/db";

interface ResourceFilters {
  type?: string | string[];
  source?: string;
  limit?: number;
}

export async function getResources({
  type,
  source,
  limit = 50,
}: ResourceFilters = {}) {
  const rows = await prisma.resources.findMany({
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
  });

  return rows.map((resource) => ({
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
}