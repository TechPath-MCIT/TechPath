// services/match.ts
import { prisma } from '@/lib/db';
import * as profiles from '@/services/profiles';

export interface RoleMatchScore {
  roleId: number;
  role: string | null;
  score: number;
}

export type Category = 'CL' | 'WF' | 'DB';

export const CATEGORY_BY_SKILL_TYPE: Record<string, Category> = {
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

async function fetchRoleSkillCatalog() {
  return prisma.role.findMany({
    include: {
      role_skills: {
        include: { skills: true },
        orderBy: { count: 'desc' },
      },
    },
  });
}

const ROLE_SKILL_CATALOG_TTL_MS = 5 * 60 * 1000;
let roleSkillCatalogCache: { data: Awaited<ReturnType<typeof fetchRoleSkillCatalog>>; expiresAt: number } | null = null;

/**
 * Fetches every role joined with its role_skills + skills — the full skill-weight
 * catalog used both to compute match scores and to pick each role's top skills for
 * the Landscape page (see services/roles.ts getLandscapeRoles). This is static
 * reference data with no in-app editing UI, so it's cached rather than re-joined on
 * every request — that join was previously the dominant cost of loading /landscape.
 *
 * Uses a plain module-level cache rather than next/cache's unstable_cache: in dev,
 * unstable_cache measurably never warmed up when called from a Route Handler (this
 * function is also called from GET /api/profiles/[id]/match), even across repeated
 * calls to that same route — likely a Next.js dev-mode caching-layer quirk. A
 * hand-rolled cache avoids depending on that undocumented behavior.
 */
export async function getRoleSkillCatalog() {
  const now = Date.now();

  if (roleSkillCatalogCache && roleSkillCatalogCache.expiresAt > now) {
    return roleSkillCatalogCache.data;
  }

  const data = await fetchRoleSkillCatalog();
  roleSkillCatalogCache = { data, expiresAt: now + ROLE_SKILL_CATALOG_TTL_MS };
  return data;
}

/**
 * Only the role/skill-weight side of this computation (getRoleSkillCatalog) is
 * cached — it's the same regardless of which profile is asking. The profile's own
 * skills (profiles.getSkillsByProfile) are fetched fresh on every call, so editing
 * a profile's skills is reflected here on the very next fetch; nothing needs to be
 * invalidated for this score when skills change.
 *
 * Computes a 0-100 match score for a profile against every role, based on how much
 * of each role's weighted skill importance (role_skills.count, grouped by skill type)
 * the profile's linked skills (Profile_Skills) cover, itself weighted by the role's
 * per-category importance (coding language / web framework / database).
 * Sorted descending by score.
 */
export async function getRoleMatchScores(profileId: number): Promise<RoleMatchScore[]> {
  const [profileSkillRows, roleCatalog] = await Promise.all([
    profiles.getSkillsByProfile(profileId),
    getRoleSkillCatalog(),
  ]);

  const allRoleSkills = roleCatalog.flatMap((role) => role.role_skills);
  const allRoles = roleCatalog;

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
