import { data } from 'react-router';

/**
 * Loaders run on the server for the first request and in the browser for later navigations.
 * On the server the API is reached over the internal network; in the browser it is /api on the
 * site's own origin (Caddy in production, the Vite proxy in development).
 */
function apiBase(): string {
    if (typeof document !== 'undefined') return '';
    return (typeof process !== 'undefined' && process.env.API_INTERNAL_URL) || 'http://127.0.0.1:8001';
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${apiBase()}${path}`, init);
}

const UNAVAILABLE = 'The company register is not available right now. Please try again in a moment.';

/** Fetches JSON, turning a missing record into a 404 and anything else into a 502 for the error page. */
export async function apiJson<T>(path: string): Promise<T> {
    let res: Response;
    try {
        res = await apiFetch(path);
    } catch {
        throw data({ message: UNAVAILABLE }, { status: 502 });
    }
    if (res.status === 404) throw data({ message: 'Not found' }, { status: 404 });
    if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        throw data({ message: typeof body.detail === 'string' ? body.detail : UNAVAILABLE }, { status: 503 });
    }
    if (!res.ok) throw data({ message: UNAVAILABLE }, { status: 502 });
    return res.json() as Promise<T>;
}

/** Serves an XML document produced by the API (sitemaps) from the site's own origin. */
export async function proxyXml(path: string): Promise<Response> {
    const res = await apiFetch(path);
    if (!res.ok) throw new Response('Not found', { status: 404 });
    return new Response(await res.text(), {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    });
}

export interface DatasetSummary {
    as_at: string | null;
    imported_at: string | null;
    total_companies: number;
    registered_companies: number;
    removed_companies: number;
    registered_last_month: number;
    last_full_month: string | null;
    source: string;
}

export interface SearchResult {
    nzbn: string;
    name: string;
    status: string;
    type: string;
    registration_date: string | null;
}

/** One row of company_index, as returned by GET /api/v1/companies/browse. */
export interface CompanyRow {
    nzbn: string;
    name: string;
    company_identifier: string | null;
    type: string | null;
    status: string | null;
    registration_date: string | null;
    removal_date: string | null;
    division: string | null;
    industry_code: string | null;
    industry: string | null;
    city: string | null;
    region: string | null;
    website: string | null;
    trading_name: string | null;
    director_count: number;
    shareholder_count: number;
    corporate_shareholder: boolean;
    insolvency_count: number;
    insolvency_type: string | null;
    insolvency_date: string | null;
}

export interface BrowseResponse {
    total: number;
    page: number;
    page_size: number;
    results: CompanyRow[];
}

export interface BrowseFilters {
    q?: string;
    region?: string;
    division?: string;
    entity_type?: string;
    status?: string;
    city?: string;
    website?: '' | 'true' | 'false';
    sort?: string;
    page?: number;
    page_size?: number;
}

export function browseQuery(filters: BrowseFilters): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== '' && value !== null) params.set(key, String(value));
    }
    return params.toString();
}

/** Everything in the site_stats table, as returned by GET /api/v1/insights. */
export interface Insights {
    computed_at: string;
    division_names: Record<string, string>;
    region_names: string[];
    overview: {
        as_at: string; window_end: string; total: number; live: number; registered: number; removed: number; distressed: number;
        registered_last12: number; registered_prior12: number; removed_last12: number; removed_prior12: number;
        live_with_website: number; live_with_industry: number; liquidations_last12: number; cities: number; regions: number; divisions: number;
    };
    regions: {
        region: string; live: number; last12: number; prior12: number; with_website: number;
        top_cities: { city: string; live: number }[]; top_divisions: { code: string; name: string; live: number }[];
    }[];
    divisions: {
        code: string; name: string; live: number; last12: number; prior12: number; liquidations_last12: number;
        live_10y_plus: number; with_website: number; liquidations_per_1000: number | null; established_share: number | null;
    }[];
    top_industries: { code: string; description: string; live: number }[];
    years: { year: number; registrations: number; removals: number }[];
    months: { month: string; registrations: number; removals: number }[];
    directors: { bucket: string; live: number }[];
    ownership: { kind: 'individual' | 'corporate' | 'none'; live: number }[];
    shareholders: { bucket: string; live: number }[];
    age: { bucket: string; live: number }[];
    cities: { city: string; region: string | null; live: number }[];
    entity_types: { type: string; live: number }[];
    status_mix: { status: string; companies: number }[];
    insolvency_years?: { year: number; liquidation: number; receivership: number; voluntary_administration: number }[];
    newest: { nzbn: string; entity_name: string; entity_status: string; registration_date: string; city: string | null; region: string | null; division: string | null; industry: string | null }[];
}

export const ENTITY_TYPE_NAMES: Record<string, string> = {
    LTD: 'Limited company', ASIC: 'Australian (ASIC) company', NON_ASIC: 'Overseas company',
    UNLTD: 'Unlimited company', COOP: 'Co-operative company',
};

/** Short division labels for charts and chips; the full ANZSIC names come from the API. */
export const DIVISION_SHORT: Record<string, string> = {
    A: 'Agriculture & fishing', B: 'Mining', C: 'Manufacturing', D: 'Utilities', E: 'Construction', F: 'Wholesale',
    G: 'Retail', H: 'Hospitality', I: 'Transport & logistics', J: 'Media & telecoms', K: 'Finance & insurance',
    L: 'Property & rental', M: 'Professional services', N: 'Admin & support', O: 'Public administration',
    P: 'Education', Q: 'Health care', R: 'Arts & recreation', S: 'Other services',
};
