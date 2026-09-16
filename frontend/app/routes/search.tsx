import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData } from 'react-router';
import AppShell from '../components/AppShell';
import SearchPanel from '../components/SearchPanel';
import { apiJson, browseQuery, type BrowseFilters, type BrowseResponse, type DatasetSummary, type Insights } from '../lib/api';
import { SITE_NAME, pageMeta } from '../lib/site';

export function filtersFromUrl(url: URL): BrowseFilters {
    const get = (key: string) => (url.searchParams.get(key) || '').trim();
    const website = get('website');
    return {
        q: get('q'),
        region: get('region'),
        division: get('division').toUpperCase(),
        entity_type: get('entity_type'),
        status: get('status'),
        city: get('city'),
        website: website === 'true' || website === 'false' ? website : '',
        health: ['Established', 'Developing', 'Watch', 'Distressed', 'Removed'].includes(get('health')) ? get('health') : '',
        sort: get('sort') || 'newest',
        page: Math.max(1, Number(get('page')) || 1),
    };
}

export async function loader({ request }: LoaderFunctionArgs) {
    const filters = filtersFromUrl(new URL(request.url));
    const [result, insights, dataset] = await Promise.all([
        apiJson<BrowseResponse>(`/api/v1/companies/browse?${browseQuery({ ...filters, page_size: 25 })}`),
        apiJson<Insights>('/api/v1/insights'),
        apiJson<DatasetSummary>('/api/v1/dataset'),
    ]);
    return {
        filters,
        result,
        asAt: dataset.as_at,
        importedAt: dataset.imported_at,
        options: { regions: insights.region_names, divisions: Object.entries(insights.division_names).map(([code, name]) => ({ code, name })) },
    };
}

// Search pages are for people, not search engines: every combination of filters would otherwise
// become its own indexed URL.
export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: data?.filters.q ? `"${data.filters.q}" - company search | ${SITE_NAME}` : `Company search | ${SITE_NAME}`,
    description: 'Search New Zealand companies by name or NZBN and filter by industry, region, city, company type, status and website.',
    robots: 'noindex, follow',
});

export default function SearchPage() {
    const { filters, result, options, asAt, importedAt } = useLoaderData<typeof loader>();
    return (
        <AppShell asAt={asAt} importedAt={importedAt}>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">Company Search</h1>
                <p className="text-ink-muted text-sm mt-1">Every company on the New Zealand register, filtered any way you need.</p>
            </div>
            <SearchPanel filters={filters} options={options} result={result} title="Search and filter" />
        </AppShell>
    );
}
