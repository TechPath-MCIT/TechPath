// services/roles.ts
import { prisma } from '@/lib/db';

/**
 * Fetches a bounded list of roles from the cloud database
 * @param limit Number of records to return
 */
export async function getRolesList(limit: number = 10) {
  return await prisma.role.findMany({
    take: limit,
    orderBy: {
      roleId: 'asc', // Keeps the output in a consistent order
    },
  });
}

/**
 * Fetches a single role matching a specific ID parameter
 */
export async function getRoleById(roleId: number) {
  return await prisma.role.findUnique({
    where: {
      roleId: roleId, // Uses the mapped 'Role ID' primary key
    },
  });
}

/**
 * 
 * Fetches top 4 skills of each role, along with their weight, 
 * and the role's main responsibilities and position in field.
 */
function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
}

export async function getLandscapeRoles() {
  const roles = await prisma.role.findMany({
    include: {
      role_skills: {
        include: {
          skills: true,
        },
        orderBy: {
          count: "desc",
        },
      },
    },
  });

  return roles.flatMap((role) =>
    role.role
      ? [
          {
            roleId: role.roleId,
            name: role.role,
            entrySalary: role.entrySalary,
            salaryOutlook: role.salaryOutlook,
            jobSatisfaction: role.jobSatisfaction,
            mainResponsibilities: toStringArray(
              role.mainResponsibilities,
            ),
            positionInField: role.positionInField,
            typicalJobTitles: toStringArray(
              role.typicalJobTitles,
            ),
            topSkills: role.role_skills
              .filter(
                (item) =>
                  item.Skill_ID !== null &&
                  typeof item.skills?.name === "string",
              )
              .slice(0, 4)
              .map((item) => ({
                skillId: item.Skill_ID as number,
                name: item.skills!.name as string,
                weight: item.count,
                score: null,
              })),
          },
        ]
      : [],
  );
}

/**
 * Fetches a role's skills with their weight, joined with the skill's name.
 * Sorted by weight descending so the most relevant skill comes first.
 */
export async function getRoleSkills(roleId: number) {
  const rows = await prisma.role_skills.findMany({
    where: {
      Role_ID: roleId,
    },
    include: {
      skills: true,
    },
    orderBy: {
      count: 'desc',
    },
  });

  return rows
    .filter((row) => row.Skill_ID !== null)
    .map((row) => ({
      skillId: row.Skill_ID as number,
      name: row.skills?.name ?? null,
      weight: row.count,
    }));
}

/**
 * Fetches a role's hiring industries with their share, sorted by share
 * descending so the most common industry comes first.
 */
export async function getRoleIndustries(roleId: number) {
  const rows = await prisma.role_industry.findMany({
    where: {
      Role_ID: roleId,
    },
    orderBy: {
      share: 'desc',
    },
  });

  return rows.map((row) => ({
    industry: row.industry,
    share: row.share,
  }));
}

/**
 * Inserts a brand new tracking role record down into AWS RDS

export async function createNewRole(title: string) {
  return await prisma.role.create({
    data: {
      role: title, // Maps to the text column 'role' in your DDL
      // Note: If you add custom inputs for salaries or importance values later,
      // you pass them directly here (e.g., entrySalary: 85000)
    },
  });
}
 */