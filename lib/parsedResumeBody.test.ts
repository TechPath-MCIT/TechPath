import { toParsedResume } from './parsedResumeBody';

describe('toParsedResume', () => {
  it('passes through well-formed fields', () => {
    const body = {
      name: 'Zhenhua',
      email: 'z@example.com',
      location: 'PA',
      skills: ['Python', 'Docker'],
      education: "Bachelor's",
      educationHistory: [{ school: 'Penn' }],
      experiences: [{ company: 'Acme' }],
      projects: [{ name: 'TechPath' }],
      rawText: 'raw',
    };
    expect(toParsedResume(body)).toEqual({ ...body, success: true });
  });

  it('drops wrong-typed and missing fields to undefined', () => {
    const result = toParsedResume({ name: 42, skills: 'not-an-array', educationHistory: {} });
    expect(result).toEqual({
      name: undefined,
      email: undefined,
      location: undefined,
      skills: undefined,
      education: undefined,
      educationHistory: undefined,
      experiences: undefined,
      projects: undefined,
      rawText: undefined,
      success: true,
    });
  });

  it('filters non-string entries out of a skills array and handles a null/undefined body', () => {
    expect(toParsedResume({ skills: ['Python', 3, null] }).skills).toEqual(['Python']);
    expect(toParsedResume(null).name).toBeUndefined();
    expect(toParsedResume(undefined).success).toBe(true);
  });
});
