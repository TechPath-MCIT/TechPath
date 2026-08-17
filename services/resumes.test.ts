jest.mock('@/lib/db', () => ({
  prisma: {
    resume: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { createResume, getResumeById } from './resumes';

describe('createResume', () => {
  it('stores rawText under the rawtext column', async () => {
    await createResume('resume text');
    expect(prisma.resume.create).toHaveBeenCalledWith({ data: { rawtext: 'resume text' } });
  });
});

describe('getResumeById', () => {
  it('looks up by resumeid', async () => {
    await getResumeById(3);
    expect(prisma.resume.findUnique).toHaveBeenCalledWith({ where: { resumeid: 3 } });
  });
});
