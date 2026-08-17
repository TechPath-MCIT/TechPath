jest.mock('@/lib/db', () => ({
  prisma: {
    skill: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { getSkillsList, getSkillById, getAllSkillNames, getSkillByName } from './skills';

describe('getSkillsList', () => {
  it('defaults to a limit of 10, ordered by skillId asc', async () => {
    await getSkillsList();
    expect(prisma.skill.findMany).toHaveBeenCalledWith({ take: 10, orderBy: { skillId: 'asc' } });
  });

  it('passes through a custom limit', async () => {
    await getSkillsList(5);
    expect(prisma.skill.findMany).toHaveBeenCalledWith({ take: 5, orderBy: { skillId: 'asc' } });
  });
});

describe('getSkillById', () => {
  it('looks up by skillId', async () => {
    await getSkillById(1);
    expect(prisma.skill.findUnique).toHaveBeenCalledWith({ where: { skillId: 1 } });
  });
});

describe('getAllSkillNames', () => {
  it('filters out the literal "nan" row case-insensitively and drops empty names', async () => {
    (prisma.skill.findMany as jest.Mock).mockResolvedValue([
      { name: 'Python' },
      { name: 'NaN' },
      { name: '' },
      { name: null },
      { name: 'Docker' },
    ]);
    expect(await getAllSkillNames()).toEqual(['Python', 'Docker']);
    expect(prisma.skill.findMany).toHaveBeenCalledWith({ select: { name: true } });
  });
});

describe('getSkillByName', () => {
  it('does a case-insensitive lookup on the lowercased name', async () => {
    await getSkillByName('Python');
    expect(prisma.skill.findFirst).toHaveBeenCalledWith({
      select: { skillId: true },
      where: { name: { equals: 'python', mode: 'insensitive' } },
    });
  });
});
