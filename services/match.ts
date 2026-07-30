// services/match.ts
import { prisma } from '@/lib/db';
import * as profiles from '@/services/profiles';
import * as roles from '@/services/roles';

export interface RoleMatchScore {
  roleId: number;
  role: string | null;
  score: number;
}

export interface SkillMatchDetail {
  skillId: number;
  name: string;
  weight: number | null;
  matched: boolean;
}

/**
 * Returns a role's most important skills (by weight), each flagged with
 * whether the given profile already has it linked via Profile_Skills.
 * Filters out the "nan" catalog artifact (see services/skills.ts).
 */
export async function getRoleSkillMatchDetail(
  profileId: number,
  roleId: number,
  limit?: number,
): Promise<SkillMatchDetail[]> {
  const [profileSkillRows, roleSkills] = await Promise.all([
    profiles.getSkillsByProfile(profileId),
    roles.getRoleSkills(roleId, limit),
  ]);

  const profileSkillIds = new Set(profileSkillRows.map((row) => row.skillId));

  return roleSkills
    .filter((skill): skill is typeof skill & { name: string } =>
      !!skill.name && skill.name.trim().toLowerCase() !== 'nan')
    .map((skill) => ({
      skillId: skill.skillId,
      name: skill.name,
      weight: skill.weight,
      matched: profileSkillIds.has(skill.skillId),
    }));
}

type Category = 'CL' | 'WF' | 'DB';

const CATEGORY_BY_SKILL_TYPE: Record<string, Category> = {
  'Coding Language': 'CL',
  'Web Framework': 'WF',
  'Database': 'DB',
};

type CategoryTotals = { total: number; matched: number };
type RoleTotals = Record<Category, CategoryTotals>;

function newTotals(): RoleTotals {
  return {
    CL: { total: 0, matched: 0 },
    WF: { total: 0, matched: 0 },
    DB: { total: 0, matched: 0 },
  };
}

function coverage(totals: CategoryTotals): number {
  return totals.total > 0 ? totals.matched / totals.total : 0;
}

// Coverage is only computed over each role's top-N skills per category (by weight),
// not the entire ~40-57 skill catalog — otherwise a long tail of niche, role-varying
// skills the profile doesn't have dilutes coverage into a narrow band for everyone,
// regardless of how well the profile actually matches the skills that define the role.
const TOP_N_SKILLS_PER_CATEGORY = 10;

/**
 * Computes a 0-100 match score for a profile against every role, based on how much
 * of each role's weighted skill importance (role_skills.count, grouped by skill type)
 * the profile's linked skills (Profile_Skills) cover, itself weighted by the role's
 * per-category importance (coding language / web framework / database).
 * Sorted descending by score.
 */
export async function getRoleMatchScores(profileId: number): Promise<RoleMatchScore[]> {
  const [profileSkillRows, allRoleSkills, allRoles] = await Promise.all([
    profiles.getSkillsByProfile(profileId),
    prisma.role_skills.findMany({ include: { skills: true } }),
    prisma.role.findMany({ orderBy: { roleId: 'asc' } }),
  ]);

  const profileSkillIds = new Set(profileSkillRows.map((row) => row.skillId));

  const rowsByRoleCategory = new Map<number, Record<Category, { skillId: number; count: number }[]>>();

  for (const row of allRoleSkills) {
    if (row.Role_ID === null || row.Skill_ID === null) continue;

    const category = CATEGORY_BY_SKILL_TYPE[row.skills?.type ?? ''];
    if (!category) continue;

    if (!rowsByRoleCategory.has(row.Role_ID)) {
      rowsByRoleCategory.set(row.Role_ID, { CL: [], WF: [], DB: [] });
    }
    rowsByRoleCategory.get(row.Role_ID)![category].push({ skillId: row.Skill_ID, count: row.count ?? 0 });
  }

  const totalsByRole = new Map<number, RoleTotals>();

  for (const [roleId, byCategory] of rowsByRoleCategory) {
    const totals = newTotals();

    (['CL', 'WF', 'DB'] as Category[]).forEach((category) => {
      const top = [...byCategory[category]]
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_N_SKILLS_PER_CATEGORY);

      for (const skill of top) {
        totals[category].total += skill.count;
        if (profileSkillIds.has(skill.skillId)) totals[category].matched += skill.count;
      }
    });

    totalsByRole.set(roleId, totals);
  }

  const results = allRoles.map((role) => {
    const totals = totalsByRole.get(role.roleId) ?? newTotals();

    const wCL = role.codingLanguageImportance ?? 0;
    const wWF = role.webFrameworkImportance ?? 0;
    const wDB = role.databaseImportance ?? 0;
    const totalWeight = wCL + wWF + wDB;

    const rawScore = totalWeight > 0
      ? (100 * (wCL * coverage(totals.CL) + wWF * coverage(totals.WF) + wDB * coverage(totals.DB))) / totalWeight
      : 0;

    return {
      roleId: role.roleId,
      role: role.role ?? null,
      score: Math.max(0, Math.min(100, Math.round(rawScore))),
    };
  });

  return results.sort((a, b) => b.score - a.score);
}
