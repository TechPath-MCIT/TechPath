// services/onet.ts
import * as skillsSvc from '@/services/skills';

// O*NET titles that refer to the same technology as one of our catalog
// skills but under a different name — verified by hand against a live
// O*NET response, not guessed. Anything not listed here is compared by
// exact (lowercased) name only, since fuzzy/substring matching produces
// false positives on short names like "R", "C", and "Go".
const ONET_TITLE_ALIASES: Record<string, string> = {
  'structured query language sql': 'sql',
  'the mathworks matlab': 'matlab',
  'oracle java': 'java',
  'apache cassandra': 'cassandra',
};

// Maps our internal roleId to a real O*NET-SOC occupation code, verified live
// against api-v2.onetcenter.org. O*NET's taxonomy predates several modern
// tech titles (DevOps, Cloud Engineer, Mobile Developer, Product Manager),
// so some entries fall back to the closest general match rather than an
// exact one — Product Manager (roleId 19) has no reasonable fit at all and
// is intentionally omitted.
export const ROLE_TO_ONET_CODE: Record<number, string> = {
  0: '15-1252.00', // AI/ML engineer -> Software Developers
  1: '15-1299.08', // Architect, software or solutions -> Computer Systems Engineers/Architects
  2: '15-1299.08', // Cloud infrastructure engineer -> Computer Systems Engineers/Architects
  3: '15-1212.00', // Cybersecurity or InfoSec professional -> Information Security Analysts
  4: '15-2051.00', // Data engineer -> Data Scientists
  5: '15-2051.01', // Data or business analyst -> Business Intelligence Analysts
  6: '15-2051.00', // Data scientist -> Data Scientists
  7: '15-1242.00', // Database administrator or engineer -> Database Administrators
  8: '15-1252.00', // DevOps engineer or professional -> Software Developers
  9: '15-1252.00', // Developer, AI apps or physical AI -> Software Developers
  10: '15-1253.00', // Developer, QA or test -> Software QA Analysts and Testers
  11: '15-1252.00', // Developer, back-end -> Software Developers
  12: '15-1252.00', // Developer, desktop or enterprise applications -> Software Developers
  13: '15-1252.00', // Developer, embedded applications or devices -> Software Developers
  14: '15-1254.00', // Developer, front-end -> Web Developers
  15: '15-1254.00', // Developer, full-stack -> Web Developers
  16: '15-1255.01', // Developer, game or graphics -> Video Game Designers
  17: '15-1252.00', // Developer, mobile -> Software Developers
  18: '11-9041.00', // Engineering manager -> Architectural and Engineering Managers
  20: '13-1082.00', // Project manager -> Project Management Specialists
  21: '15-1232.00', // Support engineer or analyst -> Computer User Support Specialists
  22: '15-1244.00', // System administrator -> Network and Computer Systems Administrators
  23: '15-1255.00', // UX, Research Ops or UI design professional -> Web and Digital Interface Designers
};

export type InDemandTechnology = {
  title: string;
  percentage: number | null;
  hotTechnology: boolean;
  inDemand: boolean;
};

// Fetches this many raw O*NET results before filtering out catalog overlap,
// so that after filtering we still have a good chance of returning `limit`
// genuinely-new technologies rather than running dry partway through.
const FETCH_MULTIPLIER = 4;

/**
 * Fetches the technologies most commonly requested in real job postings for
 * a role, via O*NET's hot_technology endpoint, excluding anything already
 * in our own skills catalog — this is meant to be a pure complement to
 * get_skill_gaps/get_skill_proficiency, not a duplicate of them. Returns
 * null if this roleId has no reasonable O*NET occupation mapping (see
 * ROLE_TO_ONET_CODE).
 */
export async function getInDemandTechnologies(roleId: number, limit: number = 10): Promise<InDemandTechnology[] | null> {
  const onetCode = ROLE_TO_ONET_CODE[roleId];
  if (!onetCode) return null;

  const apiKey = process.env.ONET_API_KEY;
  if (!apiKey) {
    throw new Error('ONET_API_KEY is not configured.');
  }

  const fetchLimit = limit * FETCH_MULTIPLIER;
  const url = new URL(`https://api-v2.onetcenter.org/online/occupations/${onetCode}/hot_technology`);
  url.searchParams.set('start', '1');
  url.searchParams.set('end', String(fetchLimit));

  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`O*NET API request failed with status ${response.status}.`);
  }

  const body = await response.json();
  const examples: any[] = Array.isArray(body.example) ? body.example : [];

  const catalogNames = await skillsSvc.getAllSkillNames();
  const catalogNamesLower = new Set(catalogNames.map((name) => name.toLowerCase()));

  const newTechnologies = examples.filter((item) => {
    const title: string = item.title ?? '';
    const key = title.toLowerCase();
    const resolvedKey = ONET_TITLE_ALIASES[key] ?? key;
    return !catalogNamesLower.has(resolvedKey);
  });

  return newTechnologies.slice(0, limit).map((item) => ({
    title: item.title ?? 'Unknown technology',
    percentage: typeof item.percentage === 'number' ? item.percentage : null,
    hotTechnology: Boolean(item.hot_technology),
    inDemand: Boolean(item.in_demand),
  }));
}
