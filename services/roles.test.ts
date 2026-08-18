jest.mock('@/lib/db', () => ({
  prisma: {
    role: { findMany: jest.fn(), findUnique: jest.fn() },
    role_skills: { findMany: jest.fn() },
    role_industry: { findMany: jest.fn() },
  },
}));
jest.mock('@/services/match', () => {
  const actual = jest.requireActual('@/services/match');
  return { ...actual, getRoleSkillCatalog: jest.fn() };
});

import { prisma } from '@/lib/db';
import * as matchSvc from '@/services/match';
import {
  getRolesList,
  getRoleById,
  getRoleTopSkillsBalanced,
  getLandscapeRoles,
  getRoleDetails,
  getRoleSkills,
  getRoleIndustries,
} from './roles';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getRolesList', () => {
  it('defaults to a limit of 10, ordered by roleId asc', async () => {
    await getRolesList();
    expect(prisma.role.findMany).toHaveBeenCalledWith({ take: 10, orderBy: { roleId: 'asc' } });
  });
});

describe('getRoleById', () => {
  it('looks up by roleId', async () => {
    await getRoleById(3);
    expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { roleId: 3 } });
  });
});

const skillRow = (Skill_ID: number, count: number, type: string, name = `Skill${Skill_ID}`) => ({
  Skill_ID,
  count,
  skills: { name, type },
});

describe('getRoleTopSkillsBalanced', () => {
  it('picks the top N per category, skipping unrecognized types and null Skill_IDs', async () => {
    (prisma.role_skills.findMany as jest.Mock).mockResolvedValue([
      skillRow(1, 8, 'Coding Language'),
      skillRow(2, 5, 'Coding Language'),
      skillRow(3, 2, 'Coding Language'),
      skillRow(4, 9, 'Web Framework'),
      skillRow(5, 1, 'Unrelated Type'),
      { Skill_ID: null, count: 100, skills: { name: 'Ghost', type: 'Coding Language' } },
    ]);

    const result = await getRoleTopSkillsBalanced(1, 2);

    expect(result).toEqual([
      { skillId: 1, name: 'Skill1', weight: 8 },
      { skillId: 2, name: 'Skill2', weight: 5 },
      { skillId: 4, name: 'Skill4', weight: 9 },
    ]);
  });
});

describe('getLandscapeRoles', () => {
  it('shapes each role and filters out rows with a null role name', async () => {
    (matchSvc.getRoleSkillCatalog as jest.Mock).mockResolvedValue([
      {
        roleId: 1,
        role: 'Data Scientist',
        entrySalary: 90000,
        salaryOutlook: 'Growing',
        jobSatisfaction: 4.2,
        mainResponsibilities: ['Analyze data', 42],
        positionInField: 'Mid',
        typicalJobTitles: ['Data Scientist I'],
        role_skills: [skillRow(1, 8, 'Coding Language')],
      },
      { roleId: 2, role: null, role_skills: [] },
    ]);

    const result = await getLandscapeRoles();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      roleId: 1,
      name: 'Data Scientist',
      mainResponsibilities: ['Analyze data'],
      topSkills: [{ skillId: 1, name: 'Skill1', weight: 8, score: null, comment: null }],
    });
  });
});

describe('getRoleDetails', () => {
  it('returns null when the role is missing or unnamed', async () => {
    (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
    expect(await getRoleDetails(1)).toBeNull();

    (prisma.role.findUnique as jest.Mock).mockResolvedValue({ roleId: 1, role: null });
    expect(await getRoleDetails(1)).toBeNull();
  });

  it('shapes the details for a found role', async () => {
    (prisma.role.findUnique as jest.Mock).mockResolvedValue({
      roleId: 1,
      role: 'Data Scientist',
      entrySalary: 90000,
      salaryOutlook: 'Growing',
      jobSatisfaction: 4.2,
      mainResponsibilities: ['Analyze data'],
      positionInField: 'Mid',
      typicalJobTitles: [],
    });
    expect(await getRoleDetails(1)).toMatchObject({ roleId: 1, name: 'Data Scientist' });
  });
});

describe('getRoleSkills', () => {
  it('fetches without a take when limit is omitted or negative, filtering null Skill_IDs', async () => {
    (prisma.role_skills.findMany as jest.Mock).mockResolvedValue([
      skillRow(1, 5, 'Coding Language'),
      { Skill_ID: null, count: 1, skills: null },
    ]);
    const result = await getRoleSkills(1);
    expect(prisma.role_skills.findMany).toHaveBeenCalledWith({
      where: { Role_ID: 1 },
      include: { skills: true },
      orderBy: { count: 'desc' },
    });
    expect(result).toEqual([{ skillId: 1, name: 'Skill1', weight: 5 }]);
  });

  it('passes a take when a positive limit is given', async () => {
    (prisma.role_skills.findMany as jest.Mock).mockResolvedValue([]);
    await getRoleSkills(1, 5);
    expect(prisma.role_skills.findMany).toHaveBeenCalledWith({
      where: { Role_ID: 1 },
      take: 5,
      include: { skills: true },
      orderBy: { count: 'desc' },
    });
  });
});

describe('getRoleIndustries', () => {
  it('orders by share desc and shapes the result', async () => {
    (prisma.role_industry.findMany as jest.Mock).mockResolvedValue([{ industry: 'Tech', share: 0.6 }]);
    const result = await getRoleIndustries(1);
    expect(prisma.role_industry.findMany).toHaveBeenCalledWith({ where: { Role_ID: 1 }, orderBy: { share: 'desc' } });
    expect(result).toEqual([{ industry: 'Tech', share: 0.6 }]);
  });
});
