import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowRight, Building2, MapPin, TrendingUp } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Card, KpiCard } from '../components/charts';
import { CompanyRows, Pager } from '../components/CompanyRows';
import { apiJson, browseQuery, type BrowseResponse } from '../lib/api';
import { PAGE_SIZE, findDivision, findRegion, loadInsights, pageNumber } from '../lib/pages';
import { SITE_NAME, absoluteUrl, formatDate, formatNumber, pageMeta, percentChange, regionPath } from '../lib/site';

export async function loader({ params, request }: LoaderFunctionArgs) {
    const { insights, dataset } = await loadInsights();
    const division = findDivision(insights, params.division, slug => `/industries/${slug}/${params.region}`);
    const region = findRegion(insights, params.region);
    const stats = division.regions.find(item => item.region === region.region) ?? { region: region.region, slug: region.slug ?? '', live: 0, last12: 0, prior12: 0 };
    const page = pageNumber(new URL(request.url));
    const list = await apiJson<BrowseResponse>(`/api/v1/companies/browse?${browseQuery({ division: division.code, region: region.region, status: 'Registered', page, page_size: PAGE_SIZE })}`);
    return { division: { code: division.code, name: division.name, short: division.short, slug: division.slug, live: division.live }, region: { region: region.region, slug: region.slug, live: region.live }, stats, list, overview: insights.overview, dataset };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data) return pageMeta({ title: `Industry | ${SITE_NAME}`, description: '', robots: 'noindex' });
    const { division, region, stats, list, overview } = data;
    const path = `/industries/${division.slug}/${region.slug}`;
    return pageMeta({
        title: `${division.name} companies in ${region.region} (${formatNumber(stats.live)}) | ${SITE_NAME}`,
        description: `${formatNumber(stats.live)} active ${division.name.toLowerCase()} companies registered in ${region.region}, New Zealand, ${formatNumber(stats.last12)} of them in the last 12 months. Names, status and registration dates from the Companies Office register as at ${formatDate(overview.as_at)}.`,
        path: list.page > 1 ? `${path}?page=${list.page}` : path,
        robots: list.page > 1 ? 'noindex, follow' : undefined,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Industries', item: absoluteUrl('/industries') },
                { '@type': 'ListItem', position: 2, name: division.name, item: absoluteUrl(`/industries/${division.slug}`) },
                { '@type': 'ListItem', position: 3, name: region.region, item: absoluteUrl(path) },
            ],
        },
    });
};

export default function IndustryRegion() {
    const { division, region, stats, list, overview, dataset } = useLoaderData<typeof loader>();
    const path = `/industries/${division.slug}/${region.slug}`;
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <nav className="text-xs text-ink-muted mb-3 flex flex-wrap items-center gap-1.5" aria-label="Breadcrumb">
                <Link to="/industries" className="hover:text-ink">Industries</Link><span>/</span>
                <Link to={`/industries/${division.slug}`} className="hover:text-ink">{division.name}</Link><span>/</span>
                <span className="text-ink">{region.region}</span>
            </nav>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">{division.name} companies in {region.region}</h1>
                <p className="text-ink-muted text-sm mt-1">{formatNumber(stats.live)} active companies - {stats.live && region.live ? ((stats.live / region.live) * 100).toFixed(1) : 0}% of {region.region}'s companies and {stats.live && division.live ? ((stats.live / division.live) * 100).toFixed(1) : 0}% of New Zealand's {division.short.toLowerCase()} companies.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard icon={Building2} label="Active companies" value={formatNumber(stats.live)} caption={`in ${region.region}`} />
                <KpiCard icon={TrendingUp} label="Registered, last 12 months" value={formatNumber(stats.last12)} change={percentChange(stats.last12, stats.prior12)} tone="teal" />
                <KpiCard icon={MapPin} label="Region" value={region.region} caption={`${formatNumber(region.live)} active companies in all industries`} tone="purple" />
            </div>

            <Card title={`${division.short} companies in ${region.region}, newest first`} icon={Building2} className="mt-4" action={<span className="text-xs text-ink-muted tabular">{formatNumber(list.total)} registered</span>}>
                <CompanyRows rows={list.results} showRegion={false} />
                <Pager page={list.page} total={list.total} pageSize={list.page_size} hrefFor={page => (page === 1 ? path : `${path}?page=${page}`)} />
            </Card>

            <div className="flex flex-wrap gap-2 mt-4">
                <Link to={regionPath(region.region)} className="btn-secondary text-xs">All industries in {region.region}</Link>
                <Link to={`/industries/${division.slug}`} className="btn-secondary text-xs">{division.short} across New Zealand</Link>
                <Link to={`/search?${browseQuery({ division: division.code, region: region.region, status: 'Registered', sort: 'health' })}`} className="btn-primary text-xs">Filter and sort these companies <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
        </AppShell>
    );
}
