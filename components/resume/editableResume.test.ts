import {
  normalizeProjects,
  mergeProjects,
  normalizeParsedResume,
  profileToEditableResume,
  toResumePayload,
} from './editableResume';

describe('normalizeProjects', () => {
  it('coerces valid entries and drops non-string bullets', () => {
    expect(normalizeProjects([{ name: 'TechPath', dateRange: '2025', bullets: ['Built it', 42] }])).toEqual([
      { name: 'TechPath', dateRange: '2025', bullets: ['Built it'] },
    ]);
  });

  it('returns [] for non-array input and fills missing fields on partial entries', () => {
    expect(normalizeProjects(null)).toEqual([]);
    expect(normalizeProjects([{}])).toEqual([{ name: '', dateRange: '', bullets: [] }]);
  });
});

describe('mergeProjects', () => {
  it('lets incoming win on a case-insensitive name collision and preserves the rest', () => {
    const existing = [
      { name: 'TechPath', dateRange: '2024', bullets: ['old'] },
      { name: 'Side Project', dateRange: '2023', bullets: [] },
    ];
    const incoming = [{ name: 'techpath', dateRange: '2025', bullets: ['new'] }];
    expect(mergeProjects(existing, incoming)).toEqual([
      { name: 'techpath', dateRange: '2025', bullets: ['new'] },
      { name: 'Side Project', dateRange: '2023', bullets: [] },
    ]);
  });
});

describe('normalizeParsedResume', () => {
  it('defaults every field for an empty/null input', () => {
    expect(normalizeParsedResume(null)).toEqual({
      name: '',
      email: '',
      location: '',
      education: '',
      skills: [],
      educationHistory: [],
      experiences: [],
      projects: [],
      rawText: '',
    });
  });

  it('coerces a fully-populated shape, including numeric years to string', () => {
    const result = normalizeParsedResume({
      name: 'Zhenhua',
      skills: ['Python', 3],
      educationHistory: [{ school: 'Penn', degree: 'M.S.', dateRange: '2024-2026', gpa: '3.9' }],
      experiences: [{ company: 'Acme', title: 'SWE', years: 2, bullets: ['Shipped X'] }],
      projects: [{ name: 'TechPath', dateRange: '2025', bullets: ['Built it'] }],
    });
    expect(result.skills).toEqual(['Python']);
    expect(result.educationHistory).toEqual([{ school: 'Penn', degree: 'M.S.', dateRange: '2024-2026', gpa: '3.9' }]);
    expect(result.experiences).toEqual([{ company: 'Acme', title: 'SWE', years: '2', bullets: ['Shipped X'] }]);
    expect(result.projects).toEqual([{ name: 'TechPath', dateRange: '2025', bullets: ['Built it'] }]);
  });
});

describe('profileToEditableResume', () => {
  it('adapts a saved profile row into an EditableResume via normalizeParsedResume', () => {
    const result = profileToEditableResume(
      {
        fullname: 'Zhenhua',
        highestDegree: "Bachelor's",
        location: 'Philadelphia, PA',
        skills: 'Python, Docker, ',
        educationhistory: [],
        profexperience: [],
        projects: [],
      },
      'zhenhua@example.com',
    );
    expect(result.name).toBe('Zhenhua');
    expect(result.email).toBe('zhenhua@example.com');
    expect(result.skills).toEqual(['Python', 'Docker']);
  });

  it('defaults skills to [] when the profile has none', () => {
    const result = profileToEditableResume(
      {
        fullname: 'Zhenhua',
        highestDegree: '',
        location: null,
        skills: null,
        educationhistory: null,
        profexperience: null,
        projects: null,
      },
      'zhenhua@example.com',
    );
    expect(result.skills).toEqual([]);
    expect(result.location).toBe('');
  });
});

describe('toResumePayload', () => {
  it('filters blank skills/bullets and omits empty optional fields', () => {
    const payload = toResumePayload({
      name: 'Zhenhua',
      email: 'z@example.com',
      location: 'PA',
      education: "Bachelor's",
      skills: ['Python', '  '],
      educationHistory: [{ school: 'Penn', degree: 'M.S.', dateRange: '2024', gpa: '' }],
      experiences: [{ company: 'Acme', title: 'SWE', years: '3', bullets: ['Shipped X', ' '] }],
      projects: [{ name: 'TechPath', dateRange: '', bullets: ['Built it', ''] }],
      rawText: 'raw',
    });
    expect(payload.skills).toEqual(['Python']);
    expect(payload.educationHistory[0]).toEqual({ school: 'Penn', degree: 'M.S.', dateRange: '2024' });
    expect(payload.experiences[0]).toEqual({ company: 'Acme', title: 'SWE', years: 3, bullets: ['Shipped X'] });
    expect(payload.projects[0]).toEqual({ name: 'TechPath', bullets: ['Built it'] });
  });

  it('falls back years to 0 when not numeric', () => {
    const payload = toResumePayload({
      name: '',
      email: '',
      location: '',
      education: '',
      skills: [],
      educationHistory: [],
      experiences: [{ company: 'Acme', title: 'SWE', years: 'n/a', bullets: [] }],
      projects: [],
      rawText: '',
    });
    expect(payload.experiences[0].years).toBe(0);
  });
});
