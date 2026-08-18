import { searchLiveJobs } from './jobs';

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

const jsearchJob = (title: string, company: string) => ({
  job_title: title,
  employer_name: company,
  job_is_remote: false,
  job_location: 'Remote',
});

const adzunaJob = (title: string, company: string) => ({
  title,
  company: { display_name: company },
  location: { display_name: 'Remote' },
});

beforeEach(() => {
  process.env.JSEARCH_API_KEY = 'jsearch-key';
  process.env.ADZUNA_APP_ID = 'adzuna-id';
  process.env.ADZUNA_APP_KEY = 'adzuna-key';
  global.fetch = jest.fn();
});

describe('searchLiveJobs', () => {
  it('interleaves both sources and dedupes by title+company', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: [jsearchJob('SWE', 'Acme'), jsearchJob('SRE', 'Acme')] }))
      .mockResolvedValueOnce(jsonResponse({ results: [adzunaJob('SWE', 'Acme'), adzunaJob('PM', 'Globex')] }));

    const result = await searchLiveJobs('engineer', 10);

    const keys = result.map((j) => `${j.title}|${j.company}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(expect.arrayContaining(['SWE|Acme', 'SRE|Acme', 'PM|Globex']));
  });

  it('returns results from whichever source succeeds when the other fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({}, false, 500))
      .mockResolvedValueOnce(jsonResponse({ results: [adzunaJob('SWE', 'Acme')] }));

    const result = await searchLiveJobs('engineer', 10);
    expect(result).toEqual([expect.objectContaining({ title: 'SWE', company: 'Acme', source: 'Adzuna' })]);
  });

  it('throws when both sources fail', async () => {
    delete process.env.JSEARCH_API_KEY;
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({}, false, 500));
    await expect(searchLiveJobs('engineer', 10)).rejects.toThrow();
  });

  it('caps merged results at the requested limit', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: [jsearchJob('A', 'X'), jsearchJob('B', 'Y'), jsearchJob('C', 'Z')] }))
      .mockResolvedValueOnce(jsonResponse({ results: [] }));

    const result = await searchLiveJobs('engineer', 2);
    expect(result).toHaveLength(2);
  });
});
