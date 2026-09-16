import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowRight, Briefcase, Building2, Globe, TrendingUp } from 'lucide-react';
import AppShell from '../components/AppShell';
import { BarList, Card, KpiCard } from '../components/charts';
import { CompanyRows, Pager } from '../components/CompanyRows';
import { DIVISION_SHORT, apiJson, browseQuery, type BrowseResponse } from '../lib/api';
import { PAGE_SIZE, findRegion, loadInsights, notFound, pageNumber } from '../lib/pages';
import { SITE_NAME, absoluteUrl, cityPath, formatDate, formatNumber, pageMeta, percentChange, regionPath } from '../lib/site';

export async function loader({ params, request }: LoaderFunctionArgs) {
    const { insights, dataset } = await loadInsights();
    const region = findRegion(insights, params.region);
    const city = insights.cities.find(item => item.region === region.region && item.slug === params.city);
    if (!city) throw notFound('Town or city not found');
    const page = pageNumber(new URL(request.url));
    const list = await apiJson<BrowseResponse>(`/api/v1/companies/browse?${browseQuery({ city: city.city, region: region.region, status: 'Registered', page, page_size: PAGE_SIZE })}`);
    const divisionSlugs = Object.fromEntries(insights.divisions.map(item => [item.code, item.slug]));
    return { city, region: { region: region.region, live: region.live }, list, overview: insights.overview, dataset, divisionSlugs };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data) return pageMeta({ title: `City | ${SITE_NAME}`, description: '', robots: 'noindex' });
    const { city, region, list, overview } = data;
    const path = cityPath(region.region, city.city);
    return pageMeta({
        title: `Companies in ${city.city}, ${region.region} (${formatNumber(city.live)} active) | ${SITE_NAME}`,
        description: `${formatNumber(city.live)} active companies are registered in ${city.city}, ${region.region}: ${formatNumber(city.last12)} in the last 12 months, the main industries and the full list, newest first. Companies Office data as at ${formatDate(overview.as_at)}.`,
        path: list.page > 1 ? `${path}?page=${list.page}` : path,
        robots: list.page > 1 ? 'noindex, follow' : undefined,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Locations', item: absoluteUrl('/locations') },
                { '@type': 'ListItem', position: 2, name: region.region, item: absoluteUrl(regionPath(region.region)) },
                { '@type': 'ListItem', position: 3, name: city.city, item: absoluteUrl(path) },
            ],
        },
    });
};

export default function LocationCity() {
    const { city, region, list, overview, dataset, divisionSlugs } = useLoaderData<typeof loader>();
    const path = cityPath(region.region, city.city);
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <nav className="text-xs text-ink-muted mb-3 flex flex-wrap items-center gap-1.5" aria-label="Breadcrumb">
                <Link to="/locations" className="hover:text-ink">Locations</Link><span>/</span>
                <Link to={regionPath(region.region)} className="hover:text-ink">{region.region}</Link><span>/</span>
                <span className="text-ink">{city.city}</span>
            </nav>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">Companies in {city.city}</h1>
                <p className="text-ink-muted text-sm mt-1">{formatNumber(city.live)} active companies with a registered office in {city.city}, {region.region} - {region.live ? ((city.live / region.live) * 100).toFixed(1) : 0}% of the region.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard icon={Building2} label="Active companies" value={formatNumber(city.live)} caption={`in ${city.city}`} />
                <KpiCard icon={TrendingUp} label="Registered, last 12 months" value={formatNumber(city.last12)} change={percentChange(city.last12, city.prior12)} tone="teal" />
                <KpiCard icon={Globe} label="With a website" value={formatNumber(city.with_website)} caption={`${city.live ? Math.round((city.with_website / city.live) * 100) : 0}% of the town`} tone="purple" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.6fr] gap-4 mt-4 items-start">
                <Card title="Main industries" icon={Briefcase}>
                    <BarList total={city.live} items={city.top_divisions.map(item => ({ label: DIVISION_SHORT[item.code] ?? item.name, value: item.live, href: `/industries/${divisionSlugs[item.code] ?? item.code.toLowerCase()}/${city.region_slug}` }))} />
                </Card>
                <Card title={`Companies in ${city.city}, newest first`} icon={Building2} action={<span className="text-xs text-ink-muted tabular">{formatNumber(list.total)} registered</span>}>
                    <CompanyRows rows={list.results} showRegion={false} />
                    <Pager page={list.page} total={list.total} pageSize={list.page_size} hrefFor={page => (page === 1 ? path : `${path}?page=${page}`)} />
                </Card>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
                <Link to={regionPath(region.region)} className="btn-secondary text-xs">All of {region.region}</Link>
                <Link to={`/search?${browseQuery({ city: city.city, region: region.region, status: 'Registered', sort: 'health' })}`} className="btn-primary text-xs">Filter and sort these companies <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
        </AppShell>
    );
}
