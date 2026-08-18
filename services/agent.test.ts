// Mocks for every heavy dependency agent.ts imports at module load time.
// The service mocks below are given real jest.fn() implementations (not
// empty stubs) so the tool `execute` functions can actually be exercised,
// not just the standalone pure helpers.
jest.mock('ai', () => ({
  streamText: jest.fn(),
  stepCountIs: jest.fn((n: number) => n),
  tool: jest.fn((config: unknown) => config),
}));
jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => jest.fn((modelName: string) => modelName)),
}));
jest.mock('@/services/profiles', () => ({
  setDreamRole: jest.fn(),
  getProfileById: jest.fn(),
  getSkillsByProfile: jest.fn(),
  addSkillsToProfile: jest.fn(),
  appendSkillsToField: jest.fn(),
  removeSkillsFromField: jest.fn(),
  removeSkillsFromProfile: jest.fn(),
  setProfileLocation: jest.fn(),
  setYearsOfExperience: jest.fn(),
  addWorkExperience: jest.fn(),
  removeWorkExperience: jest.fn(),
  addProject: jest.fn(),
  removeProject: jest.fn(),
  completeResourceForProfile: jest.fn(),
  setResourceStatusForProfile: jest.fn(),
  getResourcesByProfile: jest.fn(),
  setHighestDegree: jest.fn(),
  addEducationEntry: jest.fn(),
  buildSkillProficiencyContext: jest.fn(),
}));
jest.mock('@/services/skills', () => ({
  getSkillByName: jest.fn(),
}));
jest.mock('@/services/roles', () => ({
  getRoleSkills: jest.fn(),
  getRoleDetails: jest.fn(),
  getRoleTopSkillsBalanced: jest.fn(),
}));
jest.mock('@/services/resources', () => ({
  getResources: jest.fn(),
}));
jest.mock('@/services/match', () => ({
  getRoleMatchScores: jest.fn(),
}));
jest.mock('@/services/jobs', () => ({
  searchLiveJobs: jest.fn(),
}));
jest.mock('@/services/skillRatings', () => ({
  getCachedRatings: jest.fn(),
  upsertRatings: jest.fn(),
}));
jest.mock('@/app/actions/skillProficiency', () => ({
  rateSkillProficiencies: jest.fn(),
}));
jest.mock('@/services/onet', () => ({
  getInDemandTechnologies: jest.fn(),
}));

import { streamText } from 'ai';
import * as profiles from '@/services/profiles';
import * as skills from '@/services/skills';
import * as roles from '@/services/roles';
import * as resourcesSvc from '@/services/resources';
import * as match from '@/services/match';
import * as jobsSvc from '@/services/jobs';
import * as skillRatings from '@/services/skillRatings';
import { rateSkillProficiencies } from '@/app/actions/skillProficiency';
import * as onetSvc from '@/services/onet';
import {
  parseIsoDateLocal,
  computeDisplaySection,
  courseNameMatches,
  buildSystemPrompt,
  buildAgentTools,
  didUpdateProfile,
  streamAgentReply,
  type AgentProfileContext,
  type AgentAvailableRole,
} from './agent';

const baseContext: AgentProfileContext = {
  name: 'Zhenhua',
  currentRole: null,
  location: null,
  education: null,
  skills: [],
  yearsOfExperience: null,
  experienceHighlights: [],
  targetRole: null,
  matchScore: null,
  availableRoles: [],
  coursesInProgress: [],
  coursesCompleted: [],
};

const availableRoles: AgentAvailableRole[] = [
  { roleId: 3, name: 'Data Scientist' },
  { roleId: 7, name: 'DevOps Engineer' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('parseIsoDateLocal', () => {
  it('parses a YYYY-MM-DD string as local midnight, not UTC midnight', () => {
    const date = parseIsoDateLocal('2026-08-24');
    expect(date).not.toBeNull();
    expect([date!.getFullYear(), date!.getMonth(), date!.getDate()]).toEqual([2026, 7, 24]);
  });

  it('rejects strings that are not in YYYY-MM-DD format', () => {
    expect(parseIsoDateLocal('not-a-date')).toBeNull();
    expect(parseIsoDateLocal('2026/08/24')).toBeNull();
    expect(parseIsoDateLocal('')).toBeNull();
  });
});

describe('computeDisplaySection', () => {
  const today = new Date(2026, 7, 15); // August 15, 2026

  it('is in_progress for a start date on or before today', () => {
    expect(computeDisplaySection(new Date(2026, 7, 1), today)).toBe('in_progress');
    expect(computeDisplaySection(today, today)).toBe('in_progress');
  });

  it('regression: is upcoming for a future start date, matching GrindPage.tsx', () => {
    expect(computeDisplaySection(new Date(2026, 7, 24), today)).toBe('upcoming');
  });
});

describe('courseNameMatches', () => {
  it('matches on course name alone', () => {
    expect(courseNameMatches('algorithms', 'Algorithms & Computation', 'CIT5960')).toBe(true);
  });

  it('matches on course code alone', () => {
    expect(courseNameMatches('cit5960', 'Algorithms & Computation', 'CIT5960')).toBe(true);
  });

  it('matches a combined "code - name" query the model might send', () => {
    expect(courseNameMatches('cit5960 - algorithms & computation', 'Algorithms & Computation', 'CIT5960')).toBe(true);
  });

  it('does not match an unrelated course', () => {
    expect(courseNameMatches('networked systems', 'Algorithms & Computation', 'CIT5960')).toBe(false);
  });

  it('handles a missing course code without throwing', () => {
    expect(courseNameMatches('algorithms', 'Algorithms & Computation', null)).toBe(true);
    expect(courseNameMatches('cit5960', 'Algorithms & Computation', undefined)).toBe(false);
  });
});

describe('buildSystemPrompt', () => {
  it("includes the user's name and a target-role placeholder when none is set", () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toContain("The user's name is Zhenhua.");
    expect(prompt).toContain("They haven't picked a target role yet.");
    expect(prompt).toContain("They haven't listed any skills yet.");
  });

  it('includes the target role and match score when both are set', () => {
    const prompt = buildSystemPrompt({ ...baseContext, targetRole: 'Data Scientist', matchScore: 72 });
    expect(prompt).toContain('Their target role is Data Scientist (current match score: 72%).');
  });

  it('omits the match score parenthetical when only targetRole is set', () => {
    const prompt = buildSystemPrompt({ ...baseContext, targetRole: 'Data Scientist' });
    expect(prompt).toContain('Their target role is Data Scientist.');
    expect(prompt).not.toContain('Data Scientist (current match score');
  });

  it('lists available roles with their numeric ids for tool-calling', () => {
    const prompt = buildSystemPrompt({ ...baseContext, availableRoles });
    expect(prompt).toContain('- 3: Data Scientist');
    expect(prompt).toContain('- 7: DevOps Engineer');
  });

  it('joins listed skills into a single sentence', () => {
    const prompt = buildSystemPrompt({ ...baseContext, skills: ['Python', 'Docker'] });
    expect(prompt).toContain('Their current skills: Python, Docker.');
  });

  it('includes current role, location, education, experience, and course fields when set', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      currentRole: 'Backend Engineer',
      location: 'Philadelphia, PA',
      education: "Bachelor's",
      yearsOfExperience: 3,
      experienceHighlights: ['Built a payments pipeline'],
      coursesInProgress: ['CIT5960'],
      coursesCompleted: ['CIT5920'],
    });
    expect(prompt).toContain('Their current role is Backend Engineer.');
    expect(prompt).toContain('They are based in Philadelphia, PA.');
    expect(prompt).toContain("Their highest level of education is Bachelor's.");
    expect(prompt).toContain('They have 3 years of experience.');
    expect(prompt).toContain('- Built a payments pipeline');
    expect(prompt).toContain('Courses currently in progress: CIT5960.');
    expect(prompt).toContain('Courses already completed: CIT5920.');
  });
});

describe('didUpdateProfile', () => {
  it('is true when a mutation tool reports success', () => {
    expect(didUpdateProfile([{ toolName: 'set_target_role', output: { success: true, roleId: 3 } }])).toBe(true);
  });

  it('is false when a mutation tool reports failure', () => {
    expect(
      didUpdateProfile([{ toolName: 'mark_course_status', output: { success: false, error: 'not found' } }]),
    ).toBe(false);
  });

  it('is false for a read-only tool call, even if its output has success: true', () => {
    expect(didUpdateProfile([{ toolName: 'get_skill_gaps', output: { success: true, missing: [] } }])).toBe(false);
  });

  it('is false for an empty tool-results list', () => {
    expect(didUpdateProfile([])).toBe(false);
  });
});

describe('buildAgentTools', () => {
  const profileId = 42;

  describe('set_target_role', () => {
    it('sets the role and returns its name on a valid id', async () => {
      (profiles.setDreamRole as jest.Mock).mockResolvedValue(undefined);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.set_target_role.execute({ roleId: 3 }, {} as never);
      expect(profiles.setDreamRole).toHaveBeenCalledWith(profileId, 3);
      expect(result).toEqual({ success: true, roleId: 3, roleName: 'Data Scientist' });
    });

    it('fails without touching the database on an invalid id', async () => {
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.set_target_role.execute({ roleId: 999 }, {} as never);
      expect(profiles.setDreamRole).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, error: '999 is not a valid role id.' });
    });
  });

  describe('add_skills', () => {
    it('adds skills found in the catalog and reports the rest as notFound', async () => {
      (skills.getSkillByName as jest.Mock).mockImplementation(async (name: string) =>
        name === 'Python' ? { skillId: 10 } : null,
      );
      (profiles.addSkillsToProfile as jest.Mock).mockResolvedValue({ success: true });
      (profiles.appendSkillsToField as jest.Mock).mockResolvedValue(undefined);

      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.add_skills.execute({ skillNames: ['Python', 'Fakeskill'] }, {} as never);

      expect(profiles.addSkillsToProfile).toHaveBeenCalledWith(profileId, [10]);
      expect(result).toEqual({ success: true, added: ['Python'], notFound: ['Fakeskill'] });
    });

    it('fails when none of the requested skills are in the catalog', async () => {
      (skills.getSkillByName as jest.Mock).mockResolvedValue(null);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.add_skills.execute({ skillNames: ['Fakeskill'] }, {} as never);
      expect(profiles.addSkillsToProfile).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, added: [], notFound: ['Fakeskill'] });
    });
  });

  describe('remove_skills', () => {
    it('removes a skill listed on the profile and unlinks it relationally when catalog-matched', async () => {
      (profiles.getProfileById as jest.Mock).mockResolvedValue({ skills: 'Python, Docker, SQL' });
      (skills.getSkillByName as jest.Mock).mockImplementation(async (name: string) =>
        name === 'Docker' ? { skillId: 20 } : null,
      );
      (profiles.getSkillsByProfile as jest.Mock).mockResolvedValue([{ skillId: 20 }]);

      const tools = buildAgentTools(profileId, availableRoles);
      const result: any = await tools.remove_skills.execute({ skillNames: ['Docker', 'Rust'] }, {} as never);

      expect(profiles.removeSkillsFromField).toHaveBeenCalledWith(profileId, ['Docker']);
      expect(profiles.removeSkillsFromProfile).toHaveBeenCalledWith(profileId, [20]);
      expect(result).toEqual({ success: true, removed: ['Docker'], notOnProfile: ['Rust'] });
    });

    it('fails without mutating anything when no requested skill is on the profile', async () => {
      (profiles.getProfileById as jest.Mock).mockResolvedValue({ skills: 'Python' });
      const tools = buildAgentTools(profileId, availableRoles);
      const result: any = await tools.remove_skills.execute({ skillNames: ['Rust'] }, {} as never);
      expect(profiles.removeSkillsFromField).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, removed: [], notOnProfile: ['Rust'] });
    });
  });

  describe('simple profile-field mutations', () => {
    it('set_location calls setProfileLocation with the new value', async () => {
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.set_location.execute({ location: 'Seattle, WA' }, {} as never);
      expect(profiles.setProfileLocation).toHaveBeenCalledWith(profileId, 'Seattle, WA');
      expect(result).toEqual({ success: true, location: 'Seattle, WA' });
    });

    it('set_years_of_experience calls setYearsOfExperience with the new value', async () => {
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.set_years_of_experience.execute({ years: 3 }, {} as never);
      expect(profiles.setYearsOfExperience).toHaveBeenCalledWith(profileId, 3);
      expect(result).toEqual({ success: true, years: 3 });
    });

    it('add_work_experience passes company/title/years/bullets through', async () => {
      const tools = buildAgentTools(profileId, availableRoles);
      const args = { company: 'Acme', title: 'SWE', years: 1, bullets: ['Shipped X'] };
      const result = await tools.add_work_experience.execute(args, {} as never);
      expect(profiles.addWorkExperience).toHaveBeenCalledWith(profileId, args);
      expect(result).toEqual({ success: true, company: 'Acme', title: 'SWE' });
    });

    it('remove_work_experience succeeds when a matching entry is removed', async () => {
      (profiles.removeWorkExperience as jest.Mock).mockResolvedValue(true);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.remove_work_experience.execute({ company: 'Acme' }, {} as never);
      expect(result).toEqual({ success: true, company: 'Acme', title: undefined });
    });

    it('remove_work_experience fails with a descriptive error when nothing matches', async () => {
      (profiles.removeWorkExperience as jest.Mock).mockResolvedValue(false);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.remove_work_experience.execute({ company: 'Ghost Co', title: 'CEO' }, {} as never);
      expect(result).toEqual({
        success: false,
        error: 'No work experience entry found at "Ghost Co" with title "CEO".',
      });
    });

    it('add_project passes name/dateRange/bullets through', async () => {
      const tools = buildAgentTools(profileId, availableRoles);
      const args = { name: 'TechPath', dateRange: '2025 - 2026', bullets: ['Built an agent'] };
      const result = await tools.add_project.execute(args, {} as never);
      expect(profiles.addProject).toHaveBeenCalledWith(profileId, args);
      expect(result).toEqual({ success: true, name: 'TechPath' });
    });

    it('remove_project fails with a descriptive error when the project is not found', async () => {
      (profiles.removeProject as jest.Mock).mockResolvedValue(false);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.remove_project.execute({ name: 'Ghost Project' }, {} as never);
      expect(result).toEqual({ success: false, error: 'No project named "Ghost Project" found on the profile.' });
    });
  });

  describe('update_education', () => {
    it('only corrects the degree when school/dateRange are omitted', async () => {
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.update_education.execute({ degree: 'M.S. Computer Science' }, {} as never);
      expect(profiles.addEducationEntry).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, degree: 'M.S. Computer Science', addedEntry: false });
    });

    it('adds a full education entry when school and dateRange are both given', async () => {
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.update_education.execute(
        { degree: 'M.S. Computer Science', school: 'Penn', dateRange: '2024 - 2026' },
        {} as never,
      );
      expect(profiles.addEducationEntry).toHaveBeenCalledWith(profileId, {
        school: 'Penn',
        degree: 'M.S. Computer Science',
        dateRange: '2024 - 2026',
        gpa: undefined,
      });
      expect(result).toEqual({ success: true, degree: 'M.S. Computer Science', addedEntry: true, school: 'Penn' });
    });
  });

  describe('remove_course', () => {
    const enrolled = [
      { statusId: 1, resource_id: 501, resource: { name: 'Algorithms & Computation', courses: { course_id: 'CIT5960' } } },
    ];

    it('cancels the single matching tracked course', async () => {
      (profiles.getResourcesByProfile as jest.Mock).mockResolvedValue(enrolled);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.remove_course.execute({ courseName: 'CIT5960' }, {} as never);
      // 0 = CANCELLED_STATUS_ID (internal, not exported) — matches GrindPage.tsx's convention.
      expect(profiles.setResourceStatusForProfile).toHaveBeenCalledWith(profileId, 501, 0);
      expect(result).toEqual({ success: true, courseName: 'Algorithms & Computation' });
    });

    it('fails when the course is not currently tracked', async () => {
      (profiles.getResourcesByProfile as jest.Mock).mockResolvedValue(enrolled);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.remove_course.execute({ courseName: 'Nonexistent' }, {} as never);
      expect(result).toEqual({ success: false, error: '"Nonexistent" isn\'t currently in the user\'s My Progress list.' });
    });
  });

  describe('find_mcit_courses_for_skill', () => {
    it('returns matching resources sorted by coverage weight, capped at 5', async () => {
      (skills.getSkillByName as jest.Mock).mockResolvedValue({ skillId: 1 });
      (resourcesSvc.getResources as jest.Mock).mockResolvedValue([
        { name: 'Low Coverage', type: 'course', source: 'MCIT', url: 'a', pricing: { type: 'free' }, skills: [{ skillId: 1, coverageWeight: 1 }] },
        { name: 'High Coverage', type: 'course', source: 'MCIT', url: 'b', pricing: { type: 'free' }, skills: [{ skillId: 1, coverageWeight: 5 }] },
      ]);
      const tools = buildAgentTools(profileId, availableRoles);
      const result: any = await tools.find_mcit_courses_for_skill.execute({ skillName: 'Kubernetes' }, {} as never);
      expect(result.resources[0].name).toBe('High Coverage');
    });

    it('fails for a skill not in the catalog', async () => {
      (skills.getSkillByName as jest.Mock).mockResolvedValue(null);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.find_mcit_courses_for_skill.execute({ skillName: 'Fakeskill' }, {} as never);
      expect(result).toEqual({ success: false, resources: [], error: '"Fakeskill" is not a recognized skill.' });
    });
  });

  describe('recommend_courses_for_role', () => {
    it('recommends up to 3 courses per missing skill', async () => {
      (roles.getRoleSkills as jest.Mock).mockResolvedValue([{ skillId: 1, name: 'Python' }]);
      (profiles.getSkillsByProfile as jest.Mock).mockResolvedValue([]);
      (resourcesSvc.getResources as jest.Mock).mockResolvedValue([
        { name: 'CIT5920', url: 'a', pricing: { type: 'free' }, skills: [{ skillId: 1, coverageWeight: 1 }] },
      ]);
      const tools = buildAgentTools(profileId, availableRoles);
      const result: any = await tools.recommend_courses_for_role.execute({ roleId: 3 }, {} as never);
      expect(result).toMatchObject({ success: true, roleName: 'Data Scientist', missingSkillCount: 1 });
      expect(result.recommendations[0]).toEqual({ skillName: 'Python', courses: [{ name: 'CIT5920', url: 'a', pricing: 'free' }] });
    });
  });

  describe('find_live_job_postings', () => {
    it('returns jobs from the live search API', async () => {
      (jobsSvc.searchLiveJobs as jest.Mock).mockResolvedValue([{ title: 'SWE' }]);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.find_live_job_postings.execute({ query: 'swe remote' }, {} as never);
      expect(result).toEqual({ success: true, jobs: [{ title: 'SWE' }] });
    });

    it('catches a thrown error and reports it instead of crashing', async () => {
      (jobsSvc.searchLiveJobs as jest.Mock).mockRejectedValue(new Error('quota exceeded'));
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.find_live_job_postings.execute({ query: 'swe remote' }, {} as never);
      expect(result).toEqual({ success: false, error: 'quota exceeded' });
    });
  });

  describe('get_skill_proficiency', () => {
    it('rates only the skills missing from cache and merges them with cached ratings', async () => {
      (profiles.getProfileById as jest.Mock).mockResolvedValue({ roleId: 3 });
      (roles.getRoleTopSkillsBalanced as jest.Mock).mockResolvedValue([
        { skillId: 1, name: 'Python' },
        { skillId: 2, name: 'Docker' },
      ]);
      (skillRatings.getCachedRatings as jest.Mock).mockResolvedValue([
        { skillId: 1, proficiency: 8, rationale: 'Strong resume evidence' },
      ]);
      (profiles.buildSkillProficiencyContext as jest.Mock).mockResolvedValue({ skills: ['Python'] });
      (rateSkillProficiencies as jest.Mock).mockResolvedValue([
        { skillId: 2, proficiency: 4, rationale: 'Limited evidence' },
      ]);

      const tools = buildAgentTools(profileId, availableRoles);
      const result: any = await tools.get_skill_proficiency.execute({ roleId: 3 }, {} as never);

      expect(rateSkillProficiencies).toHaveBeenCalledWith({ skills: ['Python'] }, [{ skillId: 2, name: 'Docker' }]);
      expect(skillRatings.upsertRatings).toHaveBeenCalled();
      expect(result.ratings).toEqual([
        { skillName: 'Python', proficiency: 8, rationale: 'Strong resume evidence' },
        { skillName: 'Docker', proficiency: 4, rationale: 'Limited evidence' },
      ]);
    });

    it('defaults to the profile\'s own target role when roleId is omitted', async () => {
      (profiles.getProfileById as jest.Mock).mockResolvedValue({ roleId: 7 });
      (roles.getRoleTopSkillsBalanced as jest.Mock).mockResolvedValue([]);
      (skillRatings.getCachedRatings as jest.Mock).mockResolvedValue([]);

      const tools = buildAgentTools(profileId, availableRoles);
      const result: any = await tools.get_skill_proficiency.execute({}, {} as never);
      expect(roles.getRoleTopSkillsBalanced).toHaveBeenCalledWith(7, 2);
      expect(result.roleName).toBe('DevOps Engineer');
    });

    it('fails when no role is specified and the profile has no target role', async () => {
      (profiles.getProfileById as jest.Mock).mockResolvedValue({ roleId: null });
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.get_skill_proficiency.execute({}, {} as never);
      expect(result).toEqual({
        success: false,
        error: 'No role was specified and the user has not set a target role yet.',
      });
    });
  });

  describe('find_onet_technologies', () => {
    it('returns in-demand technologies for a valid role', async () => {
      (onetSvc.getInDemandTechnologies as jest.Mock).mockResolvedValue([{ name: 'AWS', count: 12 }]);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.find_onet_technologies.execute({ roleId: 3 }, {} as never);
      expect(result).toEqual({ success: true, roleName: 'Data Scientist', technologies: [{ name: 'AWS', count: 12 }] });
    });

    it('reports unavailable (not an error) when O*NET has no data for the role', async () => {
      (onetSvc.getInDemandTechnologies as jest.Mock).mockResolvedValue(null);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.find_onet_technologies.execute({ roleId: 3 }, {} as never);
      expect(result).toEqual({
        success: false,
        error: 'No specific tools/technologies data is available for Data Scientist.',
      });
    });

    it('catches a thrown error from the O*NET client', async () => {
      (onetSvc.getInDemandTechnologies as jest.Mock).mockRejectedValue(new Error('ONET unavailable'));
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.find_onet_technologies.execute({ roleId: 3 }, {} as never);
      expect(result).toEqual({ success: false, error: 'ONET unavailable' });
    });
  });

  describe('mark_course_status', () => {
    const cit5930 = { id: 501, name: 'Introduction to Computer Systems', course: { courseId: 'CIT5930', units: 1 } };

    beforeEach(() => {
      (resourcesSvc.getResources as jest.Mock).mockResolvedValue([cit5930]);
    });

    it('regression: reports displaySection upcoming for a future start date, not just status in_progress', async () => {
      (profiles.setResourceStatusForProfile as jest.Mock).mockResolvedValue(undefined);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.mark_course_status.execute(
        { courseName: 'CIT5930', status: 'in_progress', startDate: '2099-01-01' },
        {} as never,
      );
      expect(result).toMatchObject({ success: true, status: 'in_progress', displaySection: 'upcoming' });
    });

    it('reports displaySection in_progress for a start date of today', async () => {
      (profiles.setResourceStatusForProfile as jest.Mock).mockResolvedValue(undefined);
      const todayIso = new Date().toISOString().slice(0, 10);
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.mark_course_status.execute(
        { courseName: 'CIT5930', status: 'in_progress', startDate: todayIso },
        {} as never,
      );
      expect(result).toMatchObject({ success: true, displaySection: 'in_progress' });
    });

    it('fails when no course matches the query', async () => {
      const tools = buildAgentTools(profileId, availableRoles);
      const result: any = await tools.mark_course_status.execute(
        { courseName: 'Nonexistent Course', status: 'in_progress' },
        {} as never,
      );
      expect(result.success).toBe(false);
      expect(profiles.setResourceStatusForProfile).not.toHaveBeenCalled();
    });

    it('adds skills and marks complete via completeResourceForProfile on status: complete', async () => {
      (profiles.completeResourceForProfile as jest.Mock).mockResolvedValue({ addedSkills: ['C', 'Assembly'] });
      const tools = buildAgentTools(profileId, availableRoles);
      const result = await tools.mark_course_status.execute(
        { courseName: 'CIT5930', status: 'complete' },
        {} as never,
      );
      expect(profiles.completeResourceForProfile).toHaveBeenCalled();
      expect(result).toMatchObject({ success: true, status: 'complete', addedSkills: ['C', 'Assembly'] });
    });
  });

  describe('get_skill_gaps', () => {
    it('splits a role\'s top skills into have vs missing based on the profile', async () => {
      (roles.getRoleSkills as jest.Mock).mockResolvedValue([
        { skillId: 1, name: 'Python' },
        { skillId: 2, name: 'Docker' },
      ]);
      (profiles.getSkillsByProfile as jest.Mock).mockResolvedValue([{ skillId: 1 }]);

      const tools = buildAgentTools(42, availableRoles);
      const result = await tools.get_skill_gaps.execute({ roleId: 3 }, {} as never);
      expect(result).toEqual({ success: true, roleName: 'Data Scientist', have: ['Python'], missing: ['Docker'] });
    });

    it('fails on an invalid role id without querying the database', async () => {
      const tools = buildAgentTools(42, availableRoles);
      const result = await tools.get_skill_gaps.execute({ roleId: 999 }, {} as never);
      expect(result).toEqual({ success: false, error: '999 is not a valid role id.' });
      expect(roles.getRoleSkills).not.toHaveBeenCalled();
    });
  });

  describe('get_role_details', () => {
    it('spreads the role details into the result', async () => {
      (roles.getRoleDetails as jest.Mock).mockResolvedValue({ salaryRange: '$100k-$140k', responsibilities: [] });
      const tools = buildAgentTools(42, availableRoles);
      const result = await tools.get_role_details.execute({ roleId: 3 }, {} as never);
      expect(result).toEqual({ success: true, salaryRange: '$100k-$140k', responsibilities: [] });
    });
  });

  describe('recommend_roles_for_skills', () => {
    it("ranks roles by the profile's match score, defaulting to the top 5", async () => {
      const scores = Array.from({ length: 7 }, (_, i) => ({ roleId: i, role: `Role ${i}`, score: 100 - i }));
      (match.getRoleMatchScores as jest.Mock).mockResolvedValue(scores);
      const tools = buildAgentTools(42, availableRoles);
      const result: any = await tools.recommend_roles_for_skills.execute({}, {} as never);
      expect(result.roles).toHaveLength(5);
      expect(result.roles[0]).toEqual({ roleId: 0, roleName: 'Role 0', matchScore: 100 });
    });
  });

  describe('generate_career_plan', () => {
    it('combines skill gaps, courses, role details, match score, and live jobs in parallel', async () => {
      (roles.getRoleSkills as jest.Mock).mockResolvedValue([{ skillId: 1, name: 'Python' }]);
      (profiles.getSkillsByProfile as jest.Mock).mockResolvedValue([]);
      (resourcesSvc.getResources as jest.Mock).mockResolvedValue([
        { name: 'CIT5920', url: 'https://example.com', pricing: { type: 'free' }, skills: [{ skillId: 1, coverageWeight: 1 }] },
      ]);
      (roles.getRoleDetails as jest.Mock).mockResolvedValue({ salaryRange: '$100k-$140k' });
      (match.getRoleMatchScores as jest.Mock).mockResolvedValue([{ roleId: 3, role: 'Data Scientist', score: 55 }]);
      (jobsSvc.searchLiveJobs as jest.Mock).mockResolvedValue([{ title: 'Data Scientist I' }]);

      const tools = buildAgentTools(42, availableRoles);
      const result: any = await tools.generate_career_plan.execute({ roleId: 3 }, {} as never);

      expect(result).toMatchObject({
        success: true,
        roleName: 'Data Scientist',
        matchScore: 55,
        missing: ['Python'],
        liveJobsUnavailable: false,
      });
      expect(result.recommendations[0].courses[0].name).toBe('CIT5920');
    });

    it('marks liveJobsUnavailable instead of failing when the job search API errors', async () => {
      (roles.getRoleSkills as jest.Mock).mockResolvedValue([]);
      (profiles.getSkillsByProfile as jest.Mock).mockResolvedValue([]);
      (resourcesSvc.getResources as jest.Mock).mockResolvedValue([]);
      (roles.getRoleDetails as jest.Mock).mockResolvedValue(null);
      (match.getRoleMatchScores as jest.Mock).mockResolvedValue([]);
      (jobsSvc.searchLiveJobs as jest.Mock).mockRejectedValue(new Error('quota exceeded'));

      const tools = buildAgentTools(42, availableRoles);
      const result = await tools.generate_career_plan.execute({ roleId: 3 }, {} as never);
      expect(result).toMatchObject({ success: true, liveJobs: [], liveJobsUnavailable: true });
    });
  });
});

describe('streamAgentReply', () => {
  it('passes the rebuilt system prompt, full message history, and a 6-step cap to streamText', () => {
    streamAgentReply(
      { ...baseContext, availableRoles },
      [{ role: 'user', content: 'hi' } as never],
      'what are my skill gaps?',
      42,
    );

    expect(streamText).toHaveBeenCalledTimes(1);
    const call = (streamText as jest.Mock).mock.calls[0][0];
    expect(call.system).toContain("The user's name is Zhenhua.");
    expect(call.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'user', content: 'what are my skill gaps?' },
    ]);
    expect(call.stopWhen).toBe(6);
    expect(typeof call.tools.set_target_role).not.toBe('undefined');
  });
});
