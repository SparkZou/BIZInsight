export const SITE_NAME = 'NZ Company Intelligence';
export const SITE_TAGLINE = 'Explore New Zealand companies, directors and industries';
export const SITE_URL = 'https://companies.aicloud.co.nz';
export const SOURCE_NAME = 'New Zealand Companies Office and NZBN register bulk data';
export const DEFAULT_DESCRIPTION =
    'Free search of every company on the New Zealand Companies Office register: status, directors, '
    + 'shareholders, addresses, industry, region and insolvency history, with trends by industry and region.';

// Māori macrons are common in company names; keep the letter rather than breaking the word.
const MACRONS: Record<string, string> = { ā: 'a', ē: 'e', ī: 'i', ō: 'o', ū: 'u' };

/** Must produce the same slug as slugify() in backend/app/services/site_stats.py. */
export function slugify(name: string): string {
    const slug = (name || '')
        .toLowerCase()
        .replace(/[āēīōū]/g, letter => MACRONS[letter])
        .replace(/['’]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        .replace(/-+$/g, '');
    return slug || 'company';
}
export const companySlug = slugify;

export const companyPath = (nzbn: string, name: string) => `/companies/${nzbn}/${slugify(name)}`;
export const regionPath = (region: string) => `/locations/${slugify(region)}`;
export const cityPath = (region: string, city: string) => `/locations/${slugify(region)}/${slugify(city)}`;
export const monthPath = (month: string) => `/new-companies/${month}`;
export const insolvencyMonthPath = (month: string) => `/insolvencies/${month}`;

/** "2026-08" -> "2026-07"; "2026-01" -> "2025-12". */
export function shiftMonth(yyyyMm: string, delta: number): string {
    const [year, month] = yyyyMm.split('-').map(Number);
    const index = year * 12 + (month - 1) + delta;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}
export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = MONTHS.map(month => month.slice(0, 3));

/** "2026-08-27" -> "27 August 2026". Formatted by hand so the server and the browser agree. */
export function formatDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!match) return iso;
    return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

/** "2026-08" -> "August 2026". */
export function formatMonth(yyyyMm: string | null | undefined, short = false): string {
    if (!yyyyMm) return '';
    const [year, month] = yyyyMm.split('-');
    return `${(short ? MONTHS_SHORT : MONTHS)[Number(month) - 1]} ${year}`;
}

export const formatNumber = (value: number | null | undefined) => (value ?? 0).toLocaleString('en-NZ');

/** Compact figures for tight spaces: 1,723,065 -> "1.72M", 48,210 -> "48.2K", 2,621 -> "2.6K". */
export function formatCompact(value: number | null | undefined): string {
    const n = value ?? 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
    return formatNumber(n);
}

/** "Under 1 year" -> "<1y", "10-20 years" -> "10-20y": short enough for a column chart axis. */
export function shortAge(bucket: string): string {
    return bucket.replace('Under 1 year', '<1y').replace(/ years?/, 'y');
}

/** Percentage change between two counts, or null when the base is zero. */
export function percentChange(current: number, previous: number): number | null {
    return previous ? ((current - previous) / previous) * 100 : null;
}

interface PageMetaOptions {
    title: string;
    description: string;
    /** Site-relative path of the canonical URL; omit for pages that must not be indexed. */
    path?: string;
    robots?: string;
    jsonLd?: object | object[];
}

/** The full set of head tags for a page. Route meta replaces the root meta, so every page uses this. */
export function pageMeta({ title, description, path, robots, jsonLd }: PageMetaOptions) {
    const tags: Array<Record<string, unknown>> = [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: SITE_NAME },
        { name: 'twitter:card', content: 'summary' },
    ];
    if (path !== undefined) {
        tags.push({ tagName: 'link', rel: 'canonical', href: absoluteUrl(path) });
        tags.push({ property: 'og:url', content: absoluteUrl(path) });
    }
    if (robots) tags.push({ name: 'robots', content: robots });
    for (const block of Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []) {
        tags.push({ 'script:ld+json': block });
    }
    return tags;
}
