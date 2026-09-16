import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowLeft, ArrowRight, Briefcase, Building2, MapPin, Scale } from 'lucide-react';
import AppShell from '../components/AppShell';
import { BarList, Card, KpiCard } from '../components/charts';
import { CompanyRows, Pager } from '../components/CompanyRows';
import { apiJson, browseQuery, type BrowseResponse } from '../lib/api';
import { MONTH_PATTERN, PAGE_SIZE, loadInsights, notFound, pageNumber } from '../lib/pages';
import { SITE_NAME, absoluteUrl, formatDate, formatMonth, formatNumber, insolvencyMonthPath, pageMeta, regionPath, shiftMonth } from '../lib/site';

export async function loader({ params, request }: LoaderFunctionArgs) {
    const month = params.month || '';
    if (!MONTH_PATTERN.test(month)) throw notFound('Month not found');
    const { insights, dataset } = await loadInsights();
    const months = insights.insolvency_months ?? [];
    const index = months.findIndex(item => item.month === month);
    if (index < 0) throw notFound('No insolvency appointments recorded for that month');
    const stats = months[index];
    const page = pageNumber(new URL(request.url));
    const list = await apiJson<BrowseResponse>(`/api/v1/companies/browse?${browseQuery({ insolvency_month: month, page, page_size: PAGE_SIZE, sort: 'insolvency' })}`);
    const divisionSlugs = Object.fromEntries(insights.divisions.map(item => [item.code, item.slug]));
    return { stats, hasPrevious: index > 0, hasNext: index < months.length - 1, list, overview: insights.overview, dataset, divisionSlugs };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    if (!data) return pageMeta({ title: `Month | ${SITE_NAME}`, description: '', robots: 'noindex' });
    const { stats, list, overview } = data;
    const path = insolvencyMonthPath(stats.month);
    return pageMeta({
        title: `Company liquidations in ${formatMonth(stats.month)} - ${formatNumber(stats.companies)} New Zealand companies | ${SITE_NAME}`,
        description: `${formatNumber(stats.liquidation)} liquidations, ${formatNumber(stats.receivership)} receiverships and ${formatNumber(stats.voluntary_administration)} voluntary administrations were appointed in New Zealand in ${formatMonth(stats.month)}, affecting ${formatNumber(stats.companies)} companies - by region and industry, with the list. Companies Office data as at ${formatDate(overview.as_at)}.`,
        path: list.page > 1 ? `${path}?page=${list.page}` : path,
        robots: list.page > 1 || !stats.complete ? 'noindex, follow' : undefined,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Insolvencies', item: absoluteUrl('/insolvencies') },
                { '@type': 'ListItem', position: 2, name: formatMonth(stats.month), item: absoluteUrl(path) },
            ],
        },
    });
};

export default function InsolvenciesMonth() {
    const { stats, hasPrevious, hasNext, list, overview, dataset, divisionSlugs } = useLoaderData<typeof loader>();
    const path = insolvencyMonthPath(stats.month);
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <nav className="text-xs text-ink-muted mb-3 flex items-center gap-1.5" aria-label="Breadcrumb">
                <Link to="/insolvencies" className="hover:text-ink">Insolvencies</Link><span>/</span><span className="text-ink">{formatMonth(stats.month)}</span>
            </nav>
            <div className="mb-5 flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Insolvency appointments in {formatMonth(stats.month)}</h1>
                    <p className="text-ink-muted text-sm mt-1">{formatNumber(stats.total)} appointments affecting {formatNumber(stats.companies)} companies{stats.complete ? '' : ' so far - the snapshot was taken part-way through this month'}.</p>
                </div>
                <div className="flex gap-2">
                    {hasPrevious && <Link to={insolvencyMonthPath(shiftMonth(stats.month, -1))} className="btn-secondary text-xs"><ArrowLeft className="w-3.5 h-3.5" /> {formatMonth(shiftMonth(stats.month, -1), true)}</Link>}
                    {hasNext && <Link to={insolvencyMonthPath(shiftMonth(stats.month, 1))} className="btn-secondary text-xs">{formatMonth(shiftMonth(stats.month, 1), true)} <ArrowRight className="w-3.5 h-3.5" /></Link>}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard icon={Scale} label="Liquidations" value={formatNumber(stats.liquidation)} caption="liquidator appointments" tone="amber" />
                <KpiCard icon={Scale} label="Receiverships" value={formatNumber(stats.receivership)} caption="receiver appointments" tone="purple" />
                <KpiCard icon={Scale} label="Voluntary administrations" value={formatNumber(stats.voluntary_administration)} caption="administrator appointments" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                <Card title="Companies by region" icon={MapPin}>
                    <BarList total={stats.companies} items={stats.by_region.filter(item => item.region !== 'Unknown').slice(0, 10).map(item => ({ label: item.region, value: item.companies, href: regionPath(item.region) }))} />
                </Card>
                <Card title="Companies by industry" icon={Briefcase}>
                    <BarList total={stats.companies} color="#F43F5E" items={stats.by_division.slice(0, 10).map(item => ({ label: item.name, value: item.companies, href: `/industries/${divisionSlugs[item.code] ?? item.code.toLowerCase()}` }))} />
                </Card>
            </div>

            <Card title={`Companies with an appointment in ${formatMonth(stats.month)}`} icon={Building2} className="mt-4" action={<span className="text-xs text-ink-muted tabular">{formatNumber(list.total)} companies</span>}>
                <CompanyRows rows={list.results} dateKey="insolvency_date" dateLabel="Appointed" />
                <Pager page={list.page} total={list.total} pageSize={list.page_size} hrefFor={page => (page === 1 ? path : `${path}?page=${page}`)} />
                <p className="text-xs text-ink-faint mt-3">Listed by the date of each company's most recent appointment; a company with several appointments appears under the latest one.</p>
            </Card>
        </AppShell>
    );
}
