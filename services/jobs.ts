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

async function searchJSearch(query: string, limit: number): Promise<LiveJobListing[]> {
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

async function searchAdzuna(query: string, limit: number): Promise<LiveJobListing[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) {
        throw new Error('ADZUNA_APP_ID/ADZUNA_APP_KEY are not configured.');
    }

    const url = new URL('https://api.adzuna.com/v1/api/jobs/us/search/1');
    url.searchParams.set('app_id', appId);
    url.searchParams.set('app_key', appKey);
    url.searchParams.set('what', query);
    url.searchParams.set('results_per_page', String(limit));
    url.searchParams.set('content-type', 'application/json');

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Adzuna API request failed with status ${response.status}.`);
    }

    const body = await response.json();
    const jobs: any[] = Array.isArray(body.results) ? body.results : [];

    return jobs.slice(0, limit).map((job) => {
        const salary =
            job.salary_min && job.salary_max
                ? `$${Math.round(job.salary_min)}–$${Math.round(job.salary_max)}${job.salary_is_predicted === '1' ? ' (estimated)' : ''}`
                : null;
        const location = job.location?.display_name ?? null;

        return {
            title: job.title ?? 'Unknown title',
            company: job.company?.display_name ?? 'Unknown company',
            location,
            isRemote: /remote/i.test(location ?? '') || /remote/i.test(job.title ?? ''),
            employmentType: job.contract_time ?? null,
            postedAt: job.created ?? null,
            salary,
            applyUrl: job.redirect_url ?? null,
            source: 'Adzuna',
        };
    });
}

/**
 * Searches for real, currently open job postings across multiple live job
 * search APIs (JSearch via RapidAPI, Adzuna). Returns up to `limit` listings
 * for the given free-text query, deduped by title+company.
 */
export async function searchLiveJobs(query: string, limit: number = 5): Promise<LiveJobListing[]> {
    const results = await Promise.allSettled([searchJSearch(query, limit), searchAdzuna(query, limit)]);

    const sources = results.map((result) => (result.status === 'fulfilled' ? result.value : [])).filter((r) => r.length > 0);

    // Interleave round-robin across sources so one source filling `limit` on
    // its own doesn't crowd out the other before dedup/slice.
    const merged: LiveJobListing[] = [];
    for (let i = 0; merged.length < sources.reduce((sum, s) => sum + s.length, 0); i++) {
        for (const source of sources) {
            if (source[i]) merged.push(source[i]);
        }
    }

    if (merged.length === 0) {
        const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
        throw firstError ? firstError.reason : new Error('No live job results found.');
    }

    const seen = new Set<string>();
    const deduped: LiveJobListing[] = [];
    for (const job of merged) {
        const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(job);
    }

    return deduped.slice(0, limit);
}
