import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowRight, Briefcase, Building2, Globe, MapPin, Scale, TrendingUp } from 'lucide-react';
import AppShell from '../components/AppShell';
import { BarList, Card, KpiCard } from '../components/charts';
import { CompanyRows } from '../components/CompanyRows';
import NZMap from '../components/NZMap';
import { DIVISION_SHORT, apiJson, browseQuery, type BrowseResponse } from '../lib/api';
import { findRegion, loadInsights } from '../lib/pages';
import { SITE_NAME, absoluteUrl, cityPath, formatDate, formatNumber, pageMeta, percentChange, regionPath, slugify } from '../lib/site';

export async function loader({ params }: LoaderFunctionArgs) {
    const { insights, dataset } = await loadInsights();
    const region = findRegion(insights, params.region);
    const newest = await apiJson<BrowseResponse>(`/api/v1/companies/browse?${browseQuery({ region: region.region, status: 'Registered', page_size: 10, count: 'false' })}`);
    const divisionSlugs = Object.fromEntries(insights.divisions.map(item => [item.code, item.slug]));
    return {
        region, newest: newest.results, overview: insights.overview, dataset, divisionSlugs,
        allRegions: insights.regions.filter(item => item.slug).map(item => ({ region: item.region, live: item.live })),
    };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data) return pageMeta({ title: `Region | ${SITE_NAME}`, description: '', robots: 'noindex' });
    const { region, overview } = data;
    return pageMeta({
        title: `Companies in ${region.region}, New Zealand (${formatNumber(region.live)} active) | ${SITE_NAME}`,
        description: `${formatNumber(region.live)} active companies have their registered office in ${region.region}: ${formatNumber(region.last12)} registered in the last 12 months, the biggest industries and towns, and the newest companies. Companies Office data as at ${formatDate(overview.as_at)}.`,
        path: regionPath(region.region),
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Locations', item: absoluteUrl('/locations') },
                { '@type': 'ListItem', position: 2, name: region.region, item: absoluteUrl(regionPath(region.region)) },
            ],
        },
    });
};

export default function Location() {
    const { region, newest, overview, dataset, divisionSlugs, allRegions } = useLoaderData<typeof loader>();
    const growth = percentChange(region.last12, region.prior12);
    const liquidationRate = region.live ? (region.liquidations_last12 * 1000) / region.live : 0;
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <nav className="text-xs text-ink-muted mb-3 flex items-center gap-1.5" aria-label="Breadcrumb">
                <Link to="/locations" className="hover:text-ink">Locations</Link><span>/</span><span className="text-ink">{region.region}</span>
            </nav>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">Companies in {region.region}</h1>
                <p className="text-ink-muted text-sm mt-1">{formatNumber(region.live)} active companies, {((region.live / overview.live) * 100).toFixed(1)}% of New Zealand, by registered office postcode, as at {formatDate(overview.as_at)}.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard icon={Building2} label="Active companies" value={formatNumber(region.live)} caption={`${formatNumber(region.established)} rated Established`} />
                <KpiCard icon={TrendingUp} label="Registered, last 12 months" value={formatNumber(region.last12)} change={growth} tone="teal" />
                <KpiCard icon={Globe} label="With a website" value={formatNumber(region.with_website)} caption={`${region.live ? Math.round((region.with_website / region.live) * 100) : 0}% of the region`} tone="purple" />
                <KpiCard icon={Scale} label="Liquidations per 1,000" value={liquidationRate.toFixed(1)} caption={`${formatNumber(region.liquidations_last12)} in the last 12 months`} tone="amber" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                <Card title="Industries" icon={Briefcase}>
                    <BarList total={region.live} items={region.top_divisions.map(item => ({ label: DIVISION_SHORT[item.code] ?? item.name, value: item.live, href: `/industries/${divisionSlugs[item.code] ?? item.code.toLowerCase()}/${slugify(region.region)}` }))} />
                </Card>
                <Card title="Towns and cities" icon={MapPin}>
                    <BarList total={region.live} color="#14B8A6" items={region.top_cities.map(item => ({ label: item.city, value: item.live, href: cityPath(region.region, item.city) }))} />
                </Card>
                <Card title="On the map" icon={MapPin}>
                    <div className="rounded-lg bg-canvas p-2"><NZMap counts={allRegions} selected={region.region} hrefFor={other => regionPath(other)} compact /></div>
                </Card>
            </div>

            <Card title={`Newest companies in ${region.region}`} icon={Building2} className="mt-4" action={<Link to={`/search?${browseQuery({ region: region.region, status: 'Registered' })}`} className="text-xs text-brand-600 hover:underline">All {formatNumber(region.live)} <ArrowRight className="inline w-3 h-3" /></Link>}>
                <CompanyRows rows={newest} showRegion={false} />
            </Card>
        </AppShell>
    );
}
