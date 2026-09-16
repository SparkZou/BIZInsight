/** Shared loader helpers for the programmatic pages (industry, region, city, month). */
import { data, redirect } from 'react-router';
import { apiJson, type DatasetSummary, type DivisionStats, type Insights, type RegionStats } from './api';
import { slugify } from './site';

export const PAGE_SIZE = 25;
export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function loadInsights() {
    const [insights, dataset] = await Promise.all([apiJson<Insights>('/api/v1/insights'), apiJson<DatasetSummary>('/api/v1/dataset')]);
    return { insights, dataset };
}

export const notFound = (message: string) => data({ message }, { status: 404 });

/** The division for a URL segment like "e-construction"; redirects a stale slug to the current one. */
export function findDivision(insights: Insights, segment: string | undefined, path: (slug: string) => string): DivisionStats {
    const code = (segment || '').charAt(0).toUpperCase();
    const division = insights.divisions.find(item => item.code === code);
    if (!division) throw notFound('Industry not found');
    if (segment !== division.slug) throw redirect(path(division.slug), 301);
    return division;
}

export function findRegion(insights: Insights, segment: string | undefined): RegionStats {
    const region = insights.regions.find(item => item.slug && item.slug === segment);
    if (!region) throw notFound('Region not found');
    return region;
}

export function pageNumber(url: URL): number {
    return Math.max(1, Number(url.searchParams.get('page')) || 1);
}

export const slugsMatch = (a: string, b: string) => slugify(a) === slugify(b);
