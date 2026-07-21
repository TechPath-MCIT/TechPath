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