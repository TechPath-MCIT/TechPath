jest.mock('@/lib/db', () => ({
  prisma: {
    outsideCourseResource: { findMany: jest.fn() },
  },
}));

import { prisma } from '@/lib/db';
import { getOutsideCourses } from './outsideCourses';

const row = (id: number, title: string, skills: string | null = 'Python, Docker') => ({
  id,
  title,
  shortIntro: 'intro',
  site: 'Coursera',
  url: `https://example.com/${id}`,
  duration: '4 weeks',
  instructors: 'Jane Doe',
  skills,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getOutsideCourses', () => {
  it('filters to tech categories and dedupes by case-insensitive title', async () => {
    (prisma.outsideCourseResource.findMany as jest.Mock).mockResolvedValue([
      row(1, 'Intro to Python'),
      row(2, 'intro to python'),
    ]);

    const result = await getOutsideCourses();

    expect(prisma.outsideCourseResource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { category: { in: ['Computer Science', 'Data Science', 'Information Technology'] } } }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'outside-1',
      name: 'Intro to Python',
      isExternal: true,
      skills: [
        { skillId: -1, name: 'Python', coverageWeight: 0 },
        { skillId: -2, name: 'Docker', coverageWeight: 0 },
      ],
    });
  });

  it('caps results to limit after dedup and handles a null skills column', async () => {
    (prisma.outsideCourseResource.findMany as jest.Mock).mockResolvedValue([
      row(1, 'Course A', null),
      row(2, 'Course B'),
    ]);

    const result = await getOutsideCourses({ limit: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].skills).toEqual([]);
  });
});
