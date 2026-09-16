import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowRight, Briefcase, Building2, MapPin, Scale, TrendingUp, Users } from 'lucide-react';
import AppShell from '../components/AppShell';
import { BarList, Card, KpiCard } from '../components/charts';
import { CompanyRows } from '../components/CompanyRows';
import { apiJson, browseQuery, type BrowseResponse } from '../lib/api';
import { findDivision, loadInsights } from '../lib/pages';
import { SITE_NAME, absoluteUrl, formatDate, formatNumber, pageMeta, percentChange } from '../lib/site';

export async function loader({ params }: LoaderFunctionArgs) {
    const { insights, dataset } = await loadInsights();
    const division = findDivision(insights, params.division, slug => `/industries/${slug}`);
    const newest = await apiJson<BrowseResponse>(`/api/v1/companies/browse?${browseQuery({ division: division.code, status: 'Registered', page_size: 10, count: 'false' })}`);
    const national = {
        liquidations: insights.overview.live ? (insights.overview.liquidations_last12 * 1000) / insights.overview.live : 0,
        growth: percentChange(insights.overview.registered_last12, insights.overview.registered_prior12),
    };
    return { division, overview: insights.overview, dataset, newest: newest.results, national };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data) return pageMeta({ title: `Industry | ${SITE_NAME}`, description: '', robots: 'noindex' });
    const { division, overview } = data;
    const path = `/industries/${division.slug}`;
    return pageMeta({
        title: `${division.name} companies in New Zealand (${formatNumber(division.live)}) | ${SITE_NAME}`,
        description: `${formatNumber(division.live)} active ${division.name.toLowerCase()} companies on the New Zealand register: ${formatNumber(division.last12)} registered in the last 12 months, by region and speciality, with the newest companies. Data as at ${formatDate(overview.as_at)}.`,
        path,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Industries', item: absoluteUrl('/industries') },
                { '@type': 'ListItem', position: 2, name: division.name, item: absoluteUrl(path) },
            ],
        },
    });
};

export default function Industry() {
    const { division, overview, dataset, newest, national } = useLoaderData<typeof loader>();
    const growth = percentChange(division.last12, division.prior12);
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <nav className="text-xs text-ink-muted mb-3 flex items-center gap-1.5" aria-label="Breadcrumb">
                <Link to="/industries" className="hover:text-ink">Industries</Link><span>/</span><span className="text-ink">{division.name}</span>
            </nav>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">{division.name} companies in New Zealand</h1>
                <p className="text-ink-muted text-sm mt-1">ANZSIC division {division.code}. {formatNumber(division.live)} active companies, {((division.live / overview.live) * 100).toFixed(1)}% of the register, as at {formatDate(overview.as_at)}.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard icon={Building2} label="Active companies" value={formatNumber(division.live)} caption={`${formatNumber(division.with_website)} list a website`} />
                <KpiCard icon={TrendingUp} label="Registered, last 12 months" value={formatNumber(division.last12)} change={growth} tone="teal" />
                <KpiCard icon={Users} label="Established 10+ years" value={`${Math.round((division.established_share ?? 0) * 100)}%`} caption={`${formatNumber(division.established)} rated Established`} tone="purple" />
                <KpiCard icon={Scale} label="Liquidations per 1,000" value={String(division.liquidations_per_1000 ?? '-')} caption={`NZ average ${national.liquidations.toFixed(1)} · last 12 months`} tone="amber" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                <Card title="By region" icon={MapPin}>
                    <BarList total={division.live} items={division.regions.slice(0, 10).map(item => ({ label: item.region, value: item.live, href: `/industries/${division.slug}/${item.slug}` }))} />
                    <p className="text-xs text-ink-faint mt-3">Registered office region. Click a region for the companies there.</p>
                </Card>
                <Card title="Specialities" icon={Briefcase}>
                    <BarList total={division.live} color="#14B8A6" items={division.top_classes.slice(0, 10).map(item => ({ label: item.description, value: item.live }))} />
                    <p className="text-xs text-ink-faint mt-3">The most common ANZSIC classes filed within this division.</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 mt-4">
                <Card title={`Newest ${division.short.toLowerCase()} companies`} icon={Building2} action={<Link to={`/search?${browseQuery({ division: division.code, status: 'Registered' })}`} className="text-xs text-brand-600 hover:underline">All {formatNumber(division.live)} <ArrowRight className="inline w-3 h-3" /></Link>}>
                    <CompanyRows rows={newest} />
                </Card>
                <Card title="Outlook for job seekers" icon={Users}>
                    <ul className="text-sm text-ink-2 space-y-2 leading-relaxed">
                        <li><b>Growth</b>: {formatNumber(division.last12)} new companies in the last 12 months, {(growth ?? 0) >= 0 ? 'up' : 'down'} {Math.abs(growth ?? 0).toFixed(1)}% on the year before (all industries {(national.growth ?? 0) >= 0 ? 'up' : 'down'} {Math.abs(national.growth ?? 0).toFixed(1)}%).</li>
                        <li><b>Stability</b>: {Math.round((division.established_share ?? 0) * 100)}% of active companies have been registered for ten years or more; the average Company Health Indicator is {division.avg_health ?? '-'} / 100.</li>
                        <li><b>Risk</b>: {division.liquidations_per_1000 ?? '-'} liquidations per 1,000 active companies in the last 12 months, against {national.liquidations.toFixed(1)} nationally.</li>
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-4">
                        <Link to={`/job-seekers?division=${division.code}`} className="btn-secondary text-xs">Compare industries</Link>
                        <Link to={`/search?${browseQuery({ division: division.code, status: 'Registered', health: 'Established', sort: 'health' })}`} className="btn-primary text-xs">Established {division.short.toLowerCase()} companies <ArrowRight className="w-3.5 h-3.5" /></Link>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
