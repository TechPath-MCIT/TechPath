jest.mock('@/lib/db', () => ({
  prisma: {
    resources: { findMany: jest.fn() },
    role_skills: { findMany: jest.fn() },
    role: { findUnique: jest.fn() },
  },
}));
jest.mock('@/services/match', () => jest.requireActual('@/services/match'));

import { prisma } from '@/lib/db';
import { getResources } from './resources';

const resourceRow = (id: number, name: string, skillId: number, coverageWeight: number) => ({
  resource_id: id,
  resource_type: 'course',
  name,
  description: 'desc',
  source: 'MCIT',
  source_url: `https://example.com/${id}`,
  pricing_type: 'free',
  cost_amount: null,
  cost_currency: null,
  pricing_note: null,
  duration_minutes: 60,
  publication_status: 'published',
  resource_skills: [{ skill_id: skillId, coverage_weight: coverageWeight, skills: { name: `Skill${skillId}` } }],
  courses: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.role_skills.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
});

describe('getResources', () => {
  it('shapes rows and returns them unordered by relevance when no roleId is given', async () => {
    (prisma.resources.findMany as jest.Mock).mockResolvedValue([resourceRow(1, 'Intro to CS', 10, 5)]);

    const result = await getResources();

    expect(result).toEqual([
      {
        id: 1,
        type: 'course',
        name: 'Intro to CS',
        description: 'desc',
        source: 'MCIT',
        url: 'https://example.com/1',
        pricing: { type: 'free', amount: null, currency: null, note: null },
        durationMinutes: 60,
        publicationStatus: 'published',
        skills: [{ skillId: 10, name: 'Skill10', coverageWeight: 5 }],
        course: null,
      },
    ]);
    expect(prisma.resources.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });

  it('ranks by role relevance (weighted by category importance) when roleId is given', async () => {
    (prisma.resources.findMany as jest.Mock).mockResolvedValue([
      resourceRow(1, 'Low Relevance', 10, 1),
      resourceRow(2, 'High Relevance', 20, 1),
    ]);
    (prisma.role_skills.findMany as jest.Mock).mockResolvedValue([
      { Skill_ID: 10, count: 1, skills: { type: 'Coding Language' } },
      { Skill_ID: 20, count: 10, skills: { type: 'Coding Language' } },
    ]);
    (prisma.role.findUnique as jest.Mock).mockResolvedValue({ codingLanguageImportance: 1, webFrameworkImportance: 0, databaseImportance: 0 });

    const result = await getResources({ roleId: 3, limit: 5 });

    expect(result.map((r) => r.name)).toEqual(['High Relevance', 'Low Relevance']);
    expect(prisma.resources.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: undefined }));
  });

  it('maps course details when a resource has a linked course', async () => {
    (prisma.resources.findMany as jest.Mock).mockResolvedValue([
      {
        ...resourceRow(1, 'CIT5960', 10, 5),
        courses: { course_id: 'CIT5960', course_units: 1, prerequisites: null, creators: 'Penn' },
      },
    ]);
    const result = await getResources();
    expect(result[0].course).toEqual({ courseId: 'CIT5960', units: 1, prerequisites: null, creators: 'Penn' });
  });
});
