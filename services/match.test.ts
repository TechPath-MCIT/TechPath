jest.mock('@/lib/db', () => ({
  prisma: {
    role: { findMany: jest.fn() },
  },
}));
jest.mock('@/services/profiles', () => ({
  getSkillsByProfile: jest.fn(),
}));

import { prisma } from '@/lib/db';
import * as profiles from '@/services/profiles';
import { getRoleMatchScores } from './match';

const roleCatalog = [
  {
    roleId: 1,
    role: 'Data Scientist',
    codingLanguageImportance: 3,
    webFrameworkImportance: 1,
    databaseImportance: 0,
    role_skills: [
      { Role_ID: 1, Skill_ID: 10, count: 8, skills: { type: 'Coding Language' } },
      { Role_ID: 1, Skill_ID: 20, count: 4, skills: { type: 'Web Framework' } },
      { Role_ID: 1, Skill_ID: 30, count: 2, skills: { type: 'Unrelated Type' } },
    ],
  },
  {
    roleId: 2,
    role: 'No-Skills Role',
    codingLanguageImportance: 0,
    webFrameworkImportance: 0,
    databaseImportance: 0,
    role_skills: [],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.role.findMany as jest.Mock).mockResolvedValue(roleCatalog);
});

describe('getRoleMatchScores', () => {
  it('weights coverage by per-category importance and sorts descending', async () => {
    (profiles.getSkillsByProfile as jest.Mock).mockResolvedValue([{ skillId: 10 }]);

    const results = await getRoleMatchScores(1);

    // Role 1: CL fully matched (8/8), WF unmatched (0/4) -> (3*1 + 1*0)/4 * 100 = 75
    expect(results).toEqual([
      { roleId: 1, role: 'Data Scientist', score: 75 },
      { roleId: 2, role: 'No-Skills Role', score: 0 },
    ]);
  });

  it('scores 0 when the profile has none of the role skills', async () => {
    (profiles.getSkillsByProfile as jest.Mock).mockResolvedValue([]);
    const results = await getRoleMatchScores(1);
    expect(results[0]).toEqual({ roleId: 1, role: 'Data Scientist', score: 0 });
  });
});

