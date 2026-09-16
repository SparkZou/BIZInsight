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

/** Fetches JSON, turning a missing record into a 404 and anything else into a 502 for the error page. */
export async function apiJson<T>(path: string): Promise<T> {
    let res: Response;
    try {
        res = await apiFetch(path);
    } catch {
        throw data({ message: 'The company register is not available right now. Please try again in a moment.' }, { status: 502 });
    }
    if (res.status === 404) throw data({ message: 'Not found' }, { status: 404 });
    if (!res.ok) throw data({ message: 'The company register is not available right now. Please try again in a moment.' }, { status: 502 });
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

export interface DashboardData {
    totalCompanies: number;
    companiesByType: { name: string; value: number }[];
    registrationsPerYear: { year: number; count: number }[];
    recentRegistrations: { NZBN: string; ENTITY_NAME: string; REGISTRATION_DATE: string | null; ENTITY_STATUS: string }[];
}

export interface SearchResult {
    nzbn: string;
    name: string;
    status: string;
    type: string;
    registration_date: string | null;
}
