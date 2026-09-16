import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowRight, Building2, Lightbulb, Scale, TrendingUp, UserRound, Users } from 'lucide-react';
import AppShell from '../components/AppShell';
import { BarList, Card, Columns, KpiCard } from '../components/charts';
import StatusPill from '../components/StatusPill';
import { DIVISION_SHORT, apiJson, browseQuery, type BrowseResponse, type DatasetSummary, type Insights } from '../lib/api';
import { SITE_NAME, companyPath, formatDate, formatNumber, pageMeta, percentChange, shortAge } from '../lib/site';

export async function loader({ request }: LoaderFunctionArgs) {
    const code = (new URL(request.url).searchParams.get('division') || '').toUpperCase();
    const [insights, dataset] = await Promise.all([apiJson<Insights>('/api/v1/insights'), apiJson<DatasetSummary>('/api/v1/dataset')]);
    const selected = insights.divisions.find(item => item.code === code) ?? null;
    const newest = selected
        ? (await apiJson<BrowseResponse>(`/api/v1/companies/browse?${browseQuery({ division: selected.code, status: 'Registered', page_size: 8, count: 'false' })}`)).results
        : [];
    return { overview: insights.overview, divisions: insights.divisions, age: insights.age, selected, newest, asAt: dataset.as_at, importedAt: dataset.imported_at };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: data?.selected
        ? `${data.selected.name} companies in New Zealand - growth, age and insolvency | ${SITE_NAME}`
        : `Job Seeker Insights - which NZ industries are growing, established or risky | ${SITE_NAME}`,
    description: data?.selected
        ? `${formatNumber(data.selected.live)} active ${data.selected.name.toLowerCase()} companies in New Zealand: registrations in the last 12 months, share established 10+ years, liquidation rate, and the newest companies.`
        : 'Compare New Zealand industries by growth in new companies, how long companies have been established, and how often they fail - computed from the Companies Office register.',
    path: data?.selected ? `/job-seekers?division=${data.selected.code}` : '/job-seekers',
});

export default function JobSeekers() {
    const { overview, divisions, age, selected, newest, asAt, importedAt } = useLoaderData<typeof loader>();
    const withGrowth = divisions.map(item => ({ ...item, growth: percentChange(item.last12, item.prior12) }));
    const national = {
        growth: percentChange(overview.registered_last12, overview.registered_prior12),
        liquidations: overview.live ? (overview.liquidations_last12 * 1000) / overview.live : 0,
    };
    const ranked = (key: 'growth' | 'established_share' | 'liquidations_per_1000', direction: 'asc' | 'desc', minimum = 2000) =>
        withGrowth.filter(item => item.live >= minimum && item[key] !== null).sort((a, b) => (direction === 'desc' ? (b[key] ?? 0) - (a[key] ?? 0) : (a[key] ?? 0) - (b[key] ?? 0)));

    return (
        <AppShell asAt={asAt} importedAt={importedAt}>
            <div className="mb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><UserRound className="w-6 h-6 text-brand-600" /> Job Seeker Insights</h1>
                    <p className="text-ink-muted text-sm mt-1">Before you apply: how an industry is doing, from what companies file with the register.</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
                <Link to="/job-seekers" className={`chip ${!selected ? 'chip-active' : ''}`}>All industries</Link>
                {divisions.map(item => (
                    <Link key={item.code} to={`/job-seekers?division=${item.code}`} className={`chip ${selected?.code === item.code ? 'chip-active' : ''}`}>{DIVISION_SHORT[item.code] ?? item.name}</Link>
                ))}
            </div>

            {selected ? (
                <>
                    <div className="mb-4">
                        <h2 className="text-xl font-bold">{selected.name}</h2>
                        <p className="text-sm text-ink-muted">ANZSIC division {selected.code} · compared with all of New Zealand</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <KpiCard icon={Building2} label="Active companies" value={formatNumber(selected.live)} caption={`${((selected.live / overview.live) * 100).toFixed(1)}% of all active companies`} />
                        <KpiCard icon={TrendingUp} label="Registered, last 12 months" value={formatNumber(selected.last12)} change={percentChange(selected.last12, selected.prior12)} tone="teal" />
                        <KpiCard icon={Users} label="Established 10+ years" value={`${Math.round((selected.established_share ?? 0) * 100)}%`} caption={`NZ average ${Math.round((age.filter(item => item.bucket === '10-20 years' || item.bucket === '20+ years').reduce((sum, item) => sum + item.live, 0) / overview.live) * 100)}%`} tone="purple" />
                        <KpiCard icon={Scale} label="Liquidations per 1,000" value={String(selected.liquidations_per_1000 ?? '-')} caption={`NZ average ${national.liquidations.toFixed(1)} · last 12 months`} tone="amber" />
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4 mt-4">
                        <Card title="How to read this" icon={Lightbulb}>
                            <ul className="text-sm text-ink-2 space-y-2 leading-relaxed">
                                <li>
                                    <b>Growth</b>: {formatNumber(selected.last12)} new {selected.name.toLowerCase()} companies were registered in the last 12 months, {(percentChange(selected.last12, selected.prior12) ?? 0) >= 0 ? 'up' : 'down'} {Math.abs(percentChange(selected.last12, selected.prior12) ?? 0).toFixed(1)}% on the year before
                                    (all industries: {(national.growth ?? 0) >= 0 ? 'up' : 'down'} {Math.abs(national.growth ?? 0).toFixed(1)}%).
                                </li>
                                <li>
                                    <b>Stability</b>: {Math.round((selected.established_share ?? 0) * 100)}% of active companies here have been registered for ten years or more. Older companies are more likely to have settled teams and processes.
                                </li>
                                <li>
                                    <b>Risk</b>: {selected.liquidations_per_1000 ?? '-'} liquidations per 1,000 active companies in the last 12 months, against {national.liquidations.toFixed(1)} nationally. A high rate means more employers in this industry closed abruptly.
                                </li>
                                <li className="text-ink-muted">These figures describe the industry as a whole, not any single employer. Check the company's own profile - status, age, directors, insolvency records - before deciding.</li>
                            </ul>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <Link to={`/industries/${selected.slug}`} className="btn-primary">{DIVISION_SHORT[selected.code] ?? selected.name} by region and speciality <ArrowRight className="w-4 h-4" /></Link>
                                <Link to={`/search?${browseQuery({ division: selected.code, status: 'Registered', sort: 'health' })}`} className="btn-secondary">Search companies</Link>
                            </div>
                        </Card>
                        <Card title={`Newest ${DIVISION_SHORT[selected.code] ?? selected.name} companies`} icon={Building2}>
                            <ul className="divide-y divide-line">
                                {newest.map(company => (
                                    <li key={company.nzbn} className="py-2.5 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <Link to={companyPath(company.nzbn, company.name)} className="font-medium text-ink hover:text-brand-600 block truncate">{company.name}</Link>
                                            <p className="text-xs text-ink-muted truncate">{[company.city, company.region].filter(Boolean).join(', ')} · {formatDate(company.registration_date)}</p>
                                        </div>
                                        <StatusPill status={company.status} />
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card title="Fastest-growing industries" icon={TrendingUp}>
                            <BarList items={ranked('growth', 'desc').slice(0, 8).map(item => ({ label: DIVISION_SHORT[item.code] ?? item.name, value: item.last12, href: `/job-seekers?division=${item.code}` }))} total={overview.registered_last12} />
                            <p className="text-xs text-ink-faint mt-3">New registrations in the last 12 months; ordered by growth on the 12 months before.</p>
                        </Card>
                        <Card title="Most established industries" icon={Building2}>
                            <ol className="space-y-2.5 text-sm">
                                {ranked('established_share', 'desc').slice(0, 8).map((item, index) => (
                                    <li key={item.code} className="flex items-center gap-3">
                                        <span className="text-ink-faint w-4 tabular">{index + 1}.</span>
                                        <Link to={`/job-seekers?division=${item.code}`} className="flex-1 truncate text-ink-2 hover:text-brand-600">{DIVISION_SHORT[item.code] ?? item.name}</Link>
                                        <div className="w-24 h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${(item.established_share ?? 0) * 100}%` }} /></div>
                                        <span className="tabular w-10 text-right font-medium">{Math.round((item.established_share ?? 0) * 100)}%</span>
                                    </li>
                                ))}
                            </ol>
                            <p className="text-xs text-ink-faint mt-3">Share of active companies registered 10 or more years ago.</p>
                        </Card>
                        <Card title="Insolvency rate by industry" icon={Scale}>
                            <ol className="space-y-2.5 text-sm">
                                {ranked('liquidations_per_1000', 'asc').slice(0, 8).map((item, index) => (
                                    <li key={item.code} className="flex items-center gap-3">
                                        <span className="text-ink-faint w-4 tabular">{index + 1}.</span>
                                        <Link to={`/job-seekers?division=${item.code}`} className="flex-1 truncate text-ink-2 hover:text-brand-600">{DIVISION_SHORT[item.code] ?? item.name}</Link>
                                        <span className="tabular font-medium">{item.liquidations_per_1000}‰</span>
                                    </li>
                                ))}
                            </ol>
                            <p className="text-xs text-ink-faint mt-3">Liquidations per 1,000 active companies in the last 12 months, lowest first. NZ average {national.liquidations.toFixed(1)}‰.</p>
                        </Card>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mt-4">
                        <Card title="Company age profile" icon={Users}>
                            <Columns items={age.map(item => ({ label: shortAge(item.bucket), value: item.live }))} height={220} color="#14B8A6" />
                            <p className="text-xs text-ink-faint mt-2">How long active companies have been on the register.</p>
                        </Card>
                        <Card title="What these signals are" icon={Lightbulb}>
                            <p className="text-sm text-ink-2 leading-relaxed">
                                Everything here is computed from facts companies file with the Companies Office: when they registered, when they were removed,
                                and whether a liquidator or receiver was appointed. There are no employee counts or reviews in the register, so the signals
                                describe industries rather than individual employers.
                            </p>
                            <p className="text-sm text-ink-2 leading-relaxed mt-3">
                                Pick an industry above to see it against the national picture, then open a company's profile for its own status, age, directors and history.
                            </p>
                        </Card>
                    </div>
                </>
            )}
        </AppShell>
    );
}
