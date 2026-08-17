jest.mock('@/lib/db', () => ({
  prisma: {
    profile: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    profile_Skills: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    profile_resource: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    resource_status: { findUnique: jest.fn() },
    resource_skills: { findMany: jest.fn() },
    profileSkillRating: { deleteMany: jest.fn() },
  },
}));
jest.mock('@/services/skills', () => ({ getSkillByName: jest.fn() }));
jest.mock('@/services/resumes', () => ({ getResumeById: jest.fn() }));

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import * as skillsSvc from '@/services/skills';
import * as resumesSvc from '@/services/resumes';
import {
  getProfileList,
  getProfileById,
  setDreamRole,
  setProfileLocation,
  setYearsOfExperience,
  setHighestDegree,
  addWorkExperience,
  removeWorkExperience,
  addProject,
  removeProject,
  addEducationEntry,
  createProfile,
  updateProfileFromResume,
  updateProfileFields,
  extractResumeSummary,
  extractProjects,
  buildSkillProficiencyContext,
  getSkillsByProfile,
  getResourcesByProfile,
  setResourceStatusForProfile,
  completeResourceForProfile,
  appendSkillsToField,
  removeSkillsFromProfile,
  removeSkillsFromField,
  addSkillsToProfile,
  replaceProfileSkills,
  addSkillstoProfileByName,
} from './profiles';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('thin profile-field wrappers', () => {
  it('getProfileList defaults to limit 10, ordered by profile_ID asc', async () => {
    await getProfileList();
    expect(prisma.profile.findMany).toHaveBeenCalledWith({ take: 10, orderBy: { profile_ID: 'asc' } });
  });

  it('getProfileById looks up by profile_ID', async () => {
    await getProfileById(1);
    expect(prisma.profile.findUnique).toHaveBeenCalledWith({ where: { profile_ID: 1 } });
  });

  it('setDreamRole/setProfileLocation/setYearsOfExperience/setHighestDegree update the right column', async () => {
    await setDreamRole(1, 3);
    expect(prisma.profile.update).toHaveBeenCalledWith({ where: { profile_ID: 1 }, data: { roleId: 3 } });

    await setProfileLocation(1, 'Philadelphia, PA');
    expect(prisma.profile.update).toHaveBeenCalledWith({ where: { profile_ID: 1 }, data: { location: 'Philadelphia, PA' } });

    await setYearsOfExperience(1, 5);
    expect(prisma.profile.update).toHaveBeenCalledWith({ where: { profile_ID: 1 }, data: { yearofexperience: 5 } });

    await setHighestDegree(1, 'M.S. Computer Science');
    expect(prisma.profile.update).toHaveBeenCalledWith({ where: { profile_ID: 1 }, data: { highestDegree: 'M.S. Computer Science' } });
  });
});

describe('addWorkExperience / removeWorkExperience', () => {
  it('prepends a new entry ahead of existing ones', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ profexperience: [{ company: 'Old Co' }] });
    const entry = { company: 'Acme', title: 'SWE', years: 1, bullets: ['Shipped X'] };
    await addWorkExperience(1, entry);
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { profile_ID: 1 },
      data: { profexperience: [entry, { company: 'Old Co' }] },
    });
  });

  it('removes an entry matching company (case-insensitive), optionally narrowed by title', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({
      profexperience: [{ company: 'Acme', title: 'SWE' }, { company: 'Globex', title: 'PM' }],
    });
    const removed = await removeWorkExperience(1, 'ACME');
    expect(removed).toBe(true);
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { profile_ID: 1 },
      data: { profexperience: [{ company: 'Globex', title: 'PM' }] },
    });
  });

  it('returns false without updating when nothing matches', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ profexperience: [{ company: 'Globex' }] });
    const removed = await removeWorkExperience(1, 'Acme', 'CEO');
    expect(removed).toBe(false);
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });
});

describe('addProject / removeProject', () => {
  it('prepends a new project', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ projects: [] });
    const entry = { name: 'TechPath', bullets: ['Built it'] };
    await addProject(1, entry);
    expect(prisma.profile.update).toHaveBeenCalledWith({ where: { profile_ID: 1 }, data: { projects: [entry] } });
  });

  it('removes a project by name (case-insensitive) and reports whether it found one', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ projects: [{ name: 'TechPath' }] });
    expect(await removeProject(1, 'techpath')).toBe(true);

    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ projects: [{ name: 'TechPath' }] });
    expect(await removeProject(1, 'Ghost Project')).toBe(false);
  });
});

describe('addEducationEntry', () => {
  it('prepends a new education entry', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ educationhistory: [] });
    const entry = { school: 'Penn', degree: 'M.S.', dateRange: '2024-2026' };
    await addEducationEntry(1, entry);
    expect(prisma.profile.update).toHaveBeenCalledWith({ where: { profile_ID: 1 }, data: { educationhistory: [entry] } });
  });
});

describe('createProfile / updateProfileFromResume / updateProfileFields', () => {
  const fullResume = {
    success: true,
    name: 'Zhenhua',
    education: "M.S. Computer Science",
    experiences: [{ company: 'Acme', title: 'SWE', years: 2, bullets: [] }, { company: 'Globex', title: 'PM', years: 1, bullets: [] }],
    projects: [{ name: 'TechPath', bullets: [] }],
    skills: ['Python', 'Docker'],
    location: 'Philadelphia, PA',
  };

  it('createProfile sums experience years and joins skills into a display string', async () => {
    await createProfile(fullResume, 42, true);
    expect(prisma.profile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fullname: 'Zhenhua',
        highestDegree: 'M.S. Computer Science',
        yearofexperience: 3,
        skills: 'Python, Docker',
        location: 'Philadelphia, PA',
        isTest: true,
        resumeid: 42,
      }),
    });
  });

  it('defaults missing name/education to "N/A" and JSON fields to Prisma.JsonNull', async () => {
    await createProfile({ success: true }, 42);
    expect(prisma.profile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fullname: 'N/A',
        highestDegree: 'N/A',
        yearofexperience: null,
        skills: null,
        location: null,
        educationhistory: Prisma.JsonNull,
        profexperience: Prisma.JsonNull,
        projects: Prisma.JsonNull,
        isTest: false,
      }),
    });
  });

  it('updateProfileFromResume updates the same shape by profile_ID', async () => {
    await updateProfileFromResume(1, fullResume, 42);
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { profile_ID: 1 },
      data: expect.objectContaining({ fullname: 'Zhenhua', resumeid: 42 }),
    });
  });

  it('updateProfileFields omits isTest/resumeid', async () => {
    await updateProfileFields(1, fullResume);
    const call = (prisma.profile.update as jest.Mock).mock.calls[0][0];
    expect(call.data).not.toHaveProperty('isTest');
    expect(call.data).not.toHaveProperty('resumeid');
    expect(call.data.fullname).toBe('Zhenhua');
  });
});

describe('extractResumeSummary', () => {
  it('pulls the first title as currentRole and up to 3 bullets across entries', () => {
    const result = extractResumeSummary([
      { title: 'SWE', bullets: ['A', 'B'] },
      { title: 'Intern', bullets: ['C', 'D'] },
    ]);
    expect(result).toEqual({ currentRole: 'SWE', experienceHighlights: ['A', 'B', 'C'] });
  });

  it('returns nulls/empty for non-array or empty input', () => {
    expect(extractResumeSummary(null)).toEqual({ currentRole: null, experienceHighlights: [] });
  });
});

describe('extractProjects', () => {
  it('discards entries without a string name and coerces the rest', () => {
    const result = extractProjects([{ name: 'TechPath', bullets: ['Built it', 5] }, { bullets: [] }, 'not-an-object']);
    expect(result).toEqual([{ name: 'TechPath', dateRange: undefined, bullets: ['Built it'] }]);
  });
});

describe('buildSkillProficiencyContext', () => {
  it('splits the skills string and pulls raw resume text when resumeid is set', async () => {
    (resumesSvc.getResumeById as jest.Mock).mockResolvedValue({ rawtext: 'raw text' });
    const result = await buildSkillProficiencyContext({
      skills: 'Python, Docker',
      highestDegree: "M.S.",
      yearofexperience: 3,
      profexperience: [],
      educationhistory: [],
      projects: [],
      resumeid: 42,
    });
    expect(result.skills).toEqual(['Python', 'Docker']);
    expect(result.rawResumeText).toBe('raw text');
  });

  it('defaults skills to [] and rawResumeText to null when there is no resumeid', async () => {
    const result = await buildSkillProficiencyContext({
      skills: null,
      highestDegree: null,
      yearofexperience: null,
      profexperience: null,
      educationhistory: null,
      projects: null,
      resumeid: null,
    });
    expect(result.skills).toEqual([]);
    expect(result.rawResumeText).toBeNull();
    expect(resumesSvc.getResumeById).not.toHaveBeenCalled();
  });
});

describe('getSkillsByProfile / getResourcesByProfile', () => {
  it('getSkillsByProfile filters by profileId and includes Skills', async () => {
    await getSkillsByProfile(1);
    expect(prisma.profile_Skills.findMany).toHaveBeenCalledWith({ where: { profileId: 1 }, include: { Skills: true } });
  });

  it('getResourcesByProfile adds optional statusId/resourceType filters and orders by id', async () => {
    await getResourcesByProfile(1, 2, 'course');
    expect(prisma.profile_resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profile_id: 1, statusId: 2, resource: { resource_type: 'course' } },
        orderBy: { id: 'asc' },
      }),
    );
  });

  it('getResourcesByProfile omits filters when not given', async () => {
    await getResourcesByProfile(1);
    expect(prisma.profile_resource.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { profile_id: 1 } }));
  });
});

describe('setResourceStatusForProfile', () => {
  it('throws for an unknown status id', async () => {
    (prisma.resource_status.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(setResourceStatusForProfile(1, 'r1', 99)).rejects.toThrow('Unknown resource status id: 99');
  });

  it('updates an existing profile_resource row when one is found', async () => {
    (prisma.resource_status.findUnique as jest.Mock).mockResolvedValue({ status_id: 1 });
    (prisma.profile_resource.findFirst as jest.Mock).mockResolvedValue({ id: 7 });
    await setResourceStatusForProfile(1, 'r1', 1, { startDate: new Date('2026-01-01') });
    expect(prisma.profile_resource.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { statusId: 1, startDate: new Date('2026-01-01') },
    });
  });

  it('creates a new profile_resource row when none exists yet', async () => {
    (prisma.resource_status.findUnique as jest.Mock).mockResolvedValue({ status_id: 1 });
    (prisma.profile_resource.findFirst as jest.Mock).mockResolvedValue(null);
    await setResourceStatusForProfile(1, 'r1', 1);
    expect(prisma.profile_resource.create).toHaveBeenCalledWith({
      data: { profile_id: 1, resource_id: 'r1', statusId: 1 },
    });
  });
});

describe('completeResourceForProfile', () => {
  it('sets status, links resource skills, and appends their names to the display string', async () => {
    (prisma.resource_status.findUnique as jest.Mock).mockResolvedValue({ status_id: 2 });
    (prisma.profile_resource.findFirst as jest.Mock).mockResolvedValue({ id: 7 });
    (prisma.profile_resource.update as jest.Mock).mockResolvedValue({ id: 7, statusId: 2 });
    (prisma.resource_skills.findMany as jest.Mock).mockResolvedValue([
      { skill_id: 10, skills: { name: 'C' } },
      { skill_id: 11, skills: { name: 'Assembly' } },
    ]);
    (prisma.profile_Skills.createMany as jest.Mock).mockResolvedValue({ count: 2 });
    (prisma.profile_Skills.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ skills: null });

    const result = await completeResourceForProfile(1, 'r1', 2);

    expect(result.addedSkills).toEqual(['C', 'Assembly']);
    expect(prisma.profile.update).toHaveBeenCalledWith({
      where: { profile_ID: 1 },
      data: { skills: 'C, Assembly' },
    });
  });

  it('skips the skill-linking step when the resource has no linked skills', async () => {
    (prisma.resource_status.findUnique as jest.Mock).mockResolvedValue({ status_id: 2 });
    (prisma.profile_resource.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.resource_skills.findMany as jest.Mock).mockResolvedValue([]);

    const result = await completeResourceForProfile(1, 'r1', 2);

    expect(result.addedSkills).toEqual([]);
    expect(prisma.profile_Skills.createMany).not.toHaveBeenCalled();
  });
});

describe('appendSkillsToField / removeSkillsFromField', () => {
  it('appendSkillsToField dedupes case-insensitively and joins into a display string', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ skills: 'Python' });
    const result = await appendSkillsToField(1, ['python', 'Docker']);
    expect(result).toEqual(['Python', 'Docker']);
    expect(prisma.profile.update).toHaveBeenCalledWith({ where: { profile_ID: 1 }, data: { skills: 'Python, Docker' } });
  });

  it('removeSkillsFromField removes matching names case-insensitively, nulling out when empty', async () => {
    (prisma.profile.findUnique as jest.Mock).mockResolvedValue({ skills: 'Python' });
    const result = await removeSkillsFromField(1, ['python']);
    expect(result).toEqual([]);
    expect(prisma.profile.update).toHaveBeenCalledWith({ where: { profile_ID: 1 }, data: { skills: null } });
  });
});

describe('removeSkillsFromProfile', () => {
  it('deletes matching Profile_Skills rows and reports the count', async () => {
    (prisma.profile_Skills.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
    const result = await removeSkillsFromProfile(1, [10, 20]);
    expect(prisma.profile_Skills.deleteMany).toHaveBeenCalledWith({ where: { profileId: 1, skillId: { in: [10, 20] } } });
    expect(result).toEqual({ success: true, count: 2 });
  });
});

describe('addSkillsToProfile', () => {
  it('creates links and returns success: true with the profile\'s skills', async () => {
    (prisma.profile_Skills.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.profile_Skills.findMany as jest.Mock).mockResolvedValue([{ skillId: 10 }]);
    const result = await addSkillsToProfile(1, [10]);
    expect(result).toEqual({ success: true, data: [{ skillId: 10 }] });
  });

  it('reports success: false when the insert throws, without crashing', async () => {
    (prisma.profile_Skills.createMany as jest.Mock).mockRejectedValue(new Error('constraint violation'));
    (prisma.profile_Skills.findMany as jest.Mock).mockResolvedValue([]);
    const result = await addSkillsToProfile(1, [10]);
    expect(result.success).toBe(false);
  });
});

describe('addSkillstoProfileByName / replaceProfileSkills', () => {
  it('resolves catalog matches to ids and links them', async () => {
    (skillsSvc.getSkillByName as jest.Mock).mockImplementation(async (name: string) =>
      name === 'Python' ? { skillId: 10 } : null,
    );
    (prisma.profile_Skills.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.profile_Skills.findMany as jest.Mock).mockResolvedValue([{ skillId: 10 }]);

    const result = await addSkillstoProfileByName(1, ['Python', 'Fakeskill']);
    expect(result).toEqual({ success: true, data: [{ skillId: 10 }] });
  });

  it('reports success: false without touching the DB when nothing matches the catalog', async () => {
    (skillsSvc.getSkillByName as jest.Mock).mockResolvedValue(null);
    (prisma.profile_Skills.findMany as jest.Mock).mockResolvedValue([]);
    const result = await addSkillstoProfileByName(1, ['Fakeskill']);
    expect(result).toEqual({ success: false, data: [] });
    expect(prisma.profile_Skills.createMany).not.toHaveBeenCalled();
  });

  it('replaceProfileSkills clears existing links and cached ratings before re-adding', async () => {
    (skillsSvc.getSkillByName as jest.Mock).mockResolvedValue({ skillId: 10 });
    (prisma.profile_Skills.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.profile_Skills.findMany as jest.Mock).mockResolvedValue([{ skillId: 10 }]);

    await replaceProfileSkills(1, ['Python']);

    expect(prisma.profile_Skills.deleteMany).toHaveBeenCalledWith({ where: { profileId: 1 } });
    expect(prisma.profileSkillRating.deleteMany).toHaveBeenCalledWith({ where: { profileId: 1 } });
  });
});
