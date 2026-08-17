jest.mock('fs/promises', () => ({ access: jest.fn(), readFile: jest.fn() }));
jest.mock('mammoth', () => ({ __esModule: true, default: { extractRawText: jest.fn() } }));
jest.mock('unpdf', () => ({ extractText: jest.fn(), getDocumentProxy: jest.fn() }));
jest.mock('ai', () => ({ generateObject: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => jest.fn((modelName: string) => modelName)),
}));
jest.mock('@/services/profiles', () => ({ createProfile: jest.fn() }));
jest.mock('@/services/skills', () => ({ getAllSkillNames: jest.fn() }));

import * as fs from 'fs/promises';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';
import { generateObject } from 'ai';
import * as skills from '@/services/skills';
import { resumeParser } from './resume';

beforeEach(() => {
  jest.clearAllMocks();
  (fs.access as jest.Mock).mockResolvedValue(undefined);
  (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('file bytes'));
  (skills.getAllSkillNames as jest.Mock).mockResolvedValue(['Python', 'Docker']);
});

describe('resumeParser', () => {
  it('fails with "File not found" when the path does not exist', async () => {
    (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
    const result = await resumeParser('missing.pdf');
    expect(result).toEqual({ success: false, error_msg: 'File not found' });
  });

  it('fails for an unsupported file extension', async () => {
    const result = await resumeParser('resume.txt');
    expect(result).toEqual({ success: false, error_msg: 'only .docx or .pdf is allowed' });
  });

  it('fails when the extracted text is empty', async () => {
    (mammoth.extractRawText as jest.Mock).mockResolvedValue({ value: '   ' });
    const result = await resumeParser('resume.docx');
    expect(result.success).toBe(false);
    expect(result.error_msg).toContain('No readable text');
  });

  it('parses a .pdf into a structured resume on the success path', async () => {
    (getDocumentProxy as jest.Mock).mockResolvedValue('pdf-proxy');
    (extractText as jest.Mock).mockResolvedValue({ text: 'Resume plain text' });
    (generateObject as jest.Mock).mockResolvedValue({
      object: {
        name: 'Zhenhua',
        email: 'z@example.com',
        location: 'PA',
        skills: ['Python'],
        education: "Bachelor's",
        educationHistory: [],
        experience: [{ company: 'Acme', title: 'SWE', years: 2, bullets: ['Shipped X'] }],
        projects: [],
      },
    });

    const result = await resumeParser('resume.pdf');

    expect(result).toMatchObject({
      success: true,
      name: 'Zhenhua',
      experiences: [{ company: 'Acme', title: 'SWE', years: 2, bullets: ['Shipped X'] }],
      rawText: 'Resume plain text',
    });
  });

  it('parses a .docx via mammoth', async () => {
    (mammoth.extractRawText as jest.Mock).mockResolvedValue({ value: 'Docx plain text' });
    (generateObject as jest.Mock).mockResolvedValue({
      object: {
        name: 'Zhenhua',
        email: 'z@example.com',
        skills: [],
        education: "Bachelor's",
        educationHistory: [],
        experience: [],
        projects: [],
      },
    });

    const result = await resumeParser('resume.docx');
    expect(result).toMatchObject({ success: true, rawText: 'Docx plain text' });
  });

  it('catches an unexpected error and reports a generic failure', async () => {
    (mammoth.extractRawText as jest.Mock).mockResolvedValue({ value: 'Some text' });
    (generateObject as jest.Mock).mockRejectedValue(new Error('model error'));

    const result = await resumeParser('resume.docx');
    expect(result).toEqual({ success: false, error_msg: 'Unable to process this resume. Please try another PDF.' });
  });
});
