import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowLeft, ArrowRight, Briefcase, Building2, MapPin, TrendingUp } from 'lucide-react';
import AppShell from '../components/AppShell';
import { BarList, Card, KpiCard } from '../components/charts';
import { CompanyRows, Pager } from '../components/CompanyRows';
import { apiJson, browseQuery, type BrowseResponse } from '../lib/api';
import { MONTH_PATTERN, PAGE_SIZE, loadInsights, notFound, pageNumber } from '../lib/pages';
import { SITE_NAME, absoluteUrl, formatDate, formatMonth, formatNumber, monthPath, pageMeta, regionPath, shiftMonth } from '../lib/site';

export async function loader({ params, request }: LoaderFunctionArgs) {
    const month = params.month || '';
    if (!MONTH_PATTERN.test(month)) throw notFound('Month not found');
    const { insights, dataset } = await loadInsights();
    const stats = insights.months.find(item => item.month === month);
    if (!stats) throw notFound('No registrations recorded for that month');
    const index = insights.months.findIndex(item => item.month === month);
    const previous = index > 0 ? insights.months[index - 1] : null;
    const page = pageNumber(new URL(request.url));
    const list = await apiJson<BrowseResponse>(`/api/v1/companies/browse?${browseQuery({ month, page, page_size: PAGE_SIZE, sort: 'newest' })}`);
    const divisionSlugs = Object.fromEntries(insights.divisions.map(item => [item.code, item.slug]));
    return {
        stats, previous: previous ? { month: previous.month, registrations: previous.registrations } : null,
        hasNext: index < insights.months.length - 1, list, overview: insights.overview, dataset, divisionSlugs,
    };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data) return pageMeta({ title: `Month | ${SITE_NAME}`, description: '', robots: 'noindex' });
    const { stats, list, overview } = data;
    const path = monthPath(stats.month);
    return pageMeta({
        title: `New companies registered in ${formatMonth(stats.month)} - ${formatNumber(stats.registrations)} in New Zealand | ${SITE_NAME}`,
        description: `${formatNumber(stats.registrations)} companies were registered in New Zealand in ${formatMonth(stats.month)}${stats.complete ? '' : ' (partial month)'}, ${formatNumber(stats.removals)} were removed. The new companies by region and industry, with the full list. Companies Office data as at ${formatDate(overview.as_at)}.`,
        path: list.page > 1 ? `${path}?page=${list.page}` : path,
        robots: list.page > 1 || !stats.complete ? 'noindex, follow' : undefined,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'New companies', item: absoluteUrl('/new-companies') },
                { '@type': 'ListItem', position: 2, name: formatMonth(stats.month), item: absoluteUrl(path) },
            ],
        },
    });
};

export default function NewCompaniesMonth() {
    const { stats, previous, hasNext, list, overview, dataset, divisionSlugs } = useLoaderData<typeof loader>();
    const path = monthPath(stats.month);
    const change = previous && previous.registrations ? ((stats.registrations - previous.registrations) / previous.registrations) * 100 : null;
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <nav className="text-xs text-ink-muted mb-3 flex items-center gap-1.5" aria-label="Breadcrumb">
                <Link to="/new-companies" className="hover:text-ink">New companies</Link><span>/</span><span className="text-ink">{formatMonth(stats.month)}</span>
            </nav>
            <div className="mb-5 flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">New companies registered in {formatMonth(stats.month)}</h1>
                    <p className="text-ink-muted text-sm mt-1">{formatNumber(stats.registrations)} registrations{stats.complete ? '' : ' so far - the snapshot was taken part-way through this month'}, {formatNumber(stats.removals)} companies removed from the register.</p>
                </div>
                <div className="flex gap-2">
                    {previous && <Link to={monthPath(shiftMonth(stats.month, -1))} className="btn-secondary text-xs"><ArrowLeft className="w-3.5 h-3.5" /> {formatMonth(shiftMonth(stats.month, -1), true)}</Link>}
                    {hasNext && <Link to={monthPath(shiftMonth(stats.month, 1))} className="btn-secondary text-xs">{formatMonth(shiftMonth(stats.month, 1), true)} <ArrowRight className="w-3.5 h-3.5" /></Link>}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard icon={Building2} label="Registered" value={formatNumber(stats.registrations)} change={change} caption="vs. the month before" />
                <KpiCard icon={TrendingUp} label="Removed" value={formatNumber(stats.removals)} caption="struck off or deregistered this month" tone="amber" />
                <KpiCard icon={MapPin} label="Regions" value={String(stats.by_region.filter(item => item.region !== 'Unknown').length)} caption={`led by ${stats.by_region[0]?.region ?? '-'}`} tone="teal" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                <Card title="By region" icon={MapPin}>
                    <BarList total={stats.registrations} items={stats.by_region.filter(item => item.region !== 'Unknown').slice(0, 10).map(item => ({ label: item.region, value: item.live, href: regionPath(item.region) }))} />
                </Card>
                <Card title="By industry" icon={Briefcase}>
                    <BarList total={stats.registrations} color="#14B8A6" items={stats.by_division.slice(0, 10).map(item => ({ label: item.name, value: item.live, href: `/industries/${divisionSlugs[item.code] ?? item.code.toLowerCase()}` }))} />
                    <p className="text-xs text-ink-faint mt-3">Companies that filed an industry classification.</p>
                </Card>
            </div>

            <Card title={`Companies registered in ${formatMonth(stats.month)}`} icon={Building2} className="mt-4" action={<span className="text-xs text-ink-muted tabular">{formatNumber(list.total)} companies</span>}>
                <CompanyRows rows={list.results} />
                <Pager page={list.page} total={list.total} pageSize={list.page_size} hrefFor={page => (page === 1 ? path : `${path}?page=${page}`)} />
            </Card>
        </AppShell>
    );
}
