// services/jobs.ts
export type LiveJobListing = {
    title: string;
    company: string;
    location: string | null;
    isRemote: boolean;
    employmentType: string | null;
    postedAt: string | null;
    salary: string | null;
    applyUrl: string | null;
    source: string | null;
};

/**
 * Searches for real, currently open job postings via the JSearch API
 * (RapidAPI). Returns up to `limit` listings for the given free-text query.
 */
export async function searchLiveJobs(query: string, limit: number = 5): Promise<LiveJobListing[]> {
    const apiKey = process.env.JSEARCH_API_KEY;
    if (!apiKey) {
        throw new Error('JSEARCH_API_KEY is not configured.');
    }

    const url = new URL('https://jsearch.p.rapidapi.com/search');
    url.searchParams.set('query', query);
    url.searchParams.set('page', '1');
    url.searchParams.set('num_pages', '1');

    const response = await fetch(url, {
        headers: {
            'x-rapidapi-host': 'jsearch.p.rapidapi.com',
            'x-rapidapi-key': apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`JSearch API request failed with status ${response.status}.`);
    }

    const body = await response.json();
    const jobs: any[] = Array.isArray(body.data) ? body.data : [];

    return jobs.slice(0, limit).map((job) => {
        const salary =
            job.job_salary_string ??
            (job.job_min_salary && job.job_max_salary
                ? `$${job.job_min_salary}–$${job.job_max_salary}${job.job_salary_period ? ` per ${String(job.job_salary_period).toLowerCase()}` : ''}`
                : null);

        return {
            title: job.job_title ?? 'Unknown title',
            company: job.employer_name ?? 'Unknown company',
            location: job.job_is_remote ? 'Remote' : job.job_location ?? null,
            isRemote: Boolean(job.job_is_remote),
            employmentType: job.job_employment_type ?? null,
            postedAt: job.job_posted_at ?? null,
            salary,
            applyUrl: job.job_apply_link ?? null,
            source: job.job_publisher ?? null,
        };
    });
}
