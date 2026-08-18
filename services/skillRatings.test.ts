jest.mock('@/lib/db', () => ({
  prisma: {
    profileSkillRating: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { getCachedRatings, upsertRatings } from './skillRatings';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCachedRatings', () => {
  it('filters by profileId and roleId', async () => {
    await getCachedRatings(1, 3);
    expect(prisma.profileSkillRating.findMany).toHaveBeenCalledWith({ where: { profileId: 1, roleId: 3 } });
  });
});

describe('upsertRatings', () => {
  it('upserts one row per rating, keyed on the composite unique constraint', async () => {
    const ratings = [
      { skillId: 10, proficiency: 8, rationale: 'Strong resume evidence' },
      { skillId: 20, proficiency: 4, rationale: 'Limited evidence' },
    ];
    await upsertRatings(1, 3, ratings);
    expect(prisma.profileSkillRating.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.profileSkillRating.upsert).toHaveBeenCalledWith({
      where: { profileId_roleId_skillId: { profileId: 1, roleId: 3, skillId: 10 } },
      update: { proficiency: 8, rationale: 'Strong resume evidence' },
      create: { profileId: 1, roleId: 3, skillId: 10, proficiency: 8, rationale: 'Strong resume evidence' },
    });
  });

  it('resolves to [] for an empty ratings list without calling upsert', async () => {
    const result = await upsertRatings(1, 3, []);
    expect(result).toEqual([]);
    expect(prisma.profileSkillRating.upsert).not.toHaveBeenCalled();
  });
});
