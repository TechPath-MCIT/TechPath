// services/roles.ts
import { prisma } from '@/lib/db';
import { CATEGORY_BY_SKILL_TYPE, getRoleSkillCatalog, type Category } from '@/services/match';

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

type RoleSkillRow = {
  Skill_ID: number | null;
  count: number | null;
  skills: { name: string | null; type: string | null } | null;
};

/**
 * Picks a role's top skills balanced across categories (Coding Language /
 * Web Framework / Database) rather than a single flat ranking by count —
 * a flat ranking lets Coding Language skills dominate every role's top N
 * (verified against real data: they occupy nearly all of the top 6-10 slots
 * for every sampled role), hiding the Web Framework/Database skills that
 * still factor into the overall match score (see services/match.ts, which
 * already does this same per-category split for that score).
 */
function selectBalancedTopSkills(rows: RoleSkillRow[], perCategory: number) {
  const byCategory: Record<Category, RoleSkillRow[]> = { CL: [], WF: [], DB: [] };

  for (const row of rows) {
    if (row.Skill_ID === null || typeof row.skills?.name !== "string") continue;
    const category = CATEGORY_BY_SKILL_TYPE[row.skills?.type ?? ""];
    if (!category) continue;
    byCategory[category].push(row);
  }

  return (["CL", "WF", "DB"] as const).flatMap((category) =>
    byCategory[category]
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, perCategory),
  );
}

/**
 * Fetches a role's top skills balanced across categories (see
 * selectBalancedTopSkills) — used for the landscape drawer's individual
 * skill list and the AI proficiency-rating skill set.
 */
export async function getRoleTopSkillsBalanced(roleId: number, perCategory: number = 2) {
  const rows = await prisma.role_skills.findMany({
    where: { Role_ID: roleId },
    include: { skills: true },
    orderBy: { count: "desc" },
  });

  return selectBalancedTopSkills(rows, perCategory).map((row) => ({
    skillId: row.Skill_ID as number,
    name: row.skills!.name as string,
    weight: row.count,
  }));
}

export async function getLandscapeRoles() {
  const roles = await getRoleSkillCatalog();

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
            topSkills: selectBalancedTopSkills(role.role_skills, 2).map(
              (item) => ({
                skillId: item.Skill_ID as number,
                name: item.skills!.name as string,
                weight: item.count,
                score: null,
                comment: null,
              }),
            ),
          },
        ]
      : [],
  );
}

/**
 * Fetches a single role's salary, satisfaction, and responsibility details
 * (no skill breakdown — see getRoleSkills for that).
 */
export async function getRoleDetails(roleId: number) {
  const role = await prisma.role.findUnique({ where: { roleId } });
  if (!role || !role.role) return null;

  return {
    roleId: role.roleId,
    name: role.role,
    entrySalary: role.entrySalary,
    salaryOutlook: role.salaryOutlook,
    jobSatisfaction: role.jobSatisfaction,
    mainResponsibilities: toStringArray(role.mainResponsibilities),
    positionInField: role.positionInField,
    typicalJobTitles: toStringArray(role.typicalJobTitles),
  };
}

/**
 * Fetches a role's skills with their weight, joined with the skill's name.
 * Sorted by weight descending so the most relevant skill comes first.
 */
export async function getRoleSkills(roleId: number, limit?: number) {
  let rows;
  if(!limit || limit < 0){
      rows = await prisma.role_skills.findMany({
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
  }

  else{
    rows = await prisma.role_skills.findMany({
      where: {
        Role_ID: roleId,
      },
      take: limit,
      include: {
        skills: true,
      },
      orderBy: {
        count: 'desc',
      },
    });

  }



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