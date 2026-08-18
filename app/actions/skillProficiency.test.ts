jest.mock('ai', () => ({ generateObject: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => jest.fn((modelName: string) => modelName)),
}));

import { generateObject } from 'ai';
import { rateSkillProficiencies, type ProfileContext, type SkillToRate } from './skillProficiency';

const baseContext: ProfileContext = {
  skills: [],
  highestDegree: null,
  yearsOfExperience: null,
  experiences: [],
  educationHistory: [],
  projects: [],
  rawResumeText: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('rateSkillProficiencies', () => {
  it('returns [] without calling generateObject when there are no skills to rate', async () => {
    const result = await rateSkillProficiencies(baseContext, []);
    expect(result).toEqual([]);
    expect(generateObject).not.toHaveBeenCalled();
  });

  it('zips the model ratings back onto the requested skills by position', async () => {
    (generateObject as jest.Mock).mockResolvedValue({
      object: { ratings: [{ proficiency: 8, rationale: 'Strong' }, { proficiency: 3, rationale: 'Weak' }] },
    });
    const skillsToRate: SkillToRate[] = [{ skillId: 1, name: 'Python' }, { skillId: 2, name: 'Rust' }];

    const result = await rateSkillProficiencies(baseContext, skillsToRate);

    expect(result).toEqual([
      { skillId: 1, name: 'Python', proficiency: 8, rationale: 'Strong' },
      { skillId: 2, name: 'Rust', proficiency: 3, rationale: 'Weak' },
    ]);
  });

  it('builds a prompt including experience, education, project, and raw-resume summaries', async () => {
    (generateObject as jest.Mock).mockResolvedValue({ object: { ratings: [{ proficiency: 5, rationale: 'x' }] } });

    await rateSkillProficiencies(
      {
        ...baseContext,
        experiences: [{ company: 'Acme', title: 'SWE', years: 1, bullets: ['Shipped X'] }],
        educationHistory: [{ school: 'Penn', degree: 'M.S.', dateRange: '2024-2026' }],
        projects: [{ name: 'TechPath', bullets: ['Built it'] }],
        rawResumeText: 'raw resume text',
      },
      [{ skillId: 1, name: 'Python' }],
    );

    const call = (generateObject as jest.Mock).mock.calls[0][0];
    expect(call.prompt).toContain('SWE at Acme (1 yr)');
    expect(call.prompt).toContain('M.S. at Penn (2024-2026)');
    expect(call.prompt).toContain('TechPath');
    expect(call.prompt).toContain('raw resume text');
  });

  it('falls back to "No X listed" placeholders when a section is empty', async () => {
    (generateObject as jest.Mock).mockResolvedValue({ object: { ratings: [{ proficiency: 5, rationale: 'x' }] } });
    await rateSkillProficiencies(baseContext, [{ skillId: 1, name: 'Python' }]);
    const call = (generateObject as jest.Mock).mock.calls[0][0];
    expect(call.prompt).toContain('No work experience listed.');
    expect(call.prompt).toContain('No education history listed.');
    expect(call.prompt).toContain('No projects listed.');
  });
});
