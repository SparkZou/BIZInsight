import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowRight, Building2, MapPin, TrendingUp } from 'lucide-react';
import AppShell from '../components/AppShell';
import { BarList, Card } from '../components/charts';
import NZMap from '../components/NZMap';
import StatusPill from '../components/StatusPill';
import { DIVISION_SHORT, apiJson, browseQuery, type BrowseResponse, type DatasetSummary, type Insights } from '../lib/api';
import { SITE_NAME, companyPath, formatDate, formatNumber, pageMeta, percentChange, regionPath } from '../lib/site';

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const [insights, dataset] = await Promise.all([apiJson<Insights>('/api/v1/insights'), apiJson<DatasetSummary>('/api/v1/dataset')]);
    const requested = url.searchParams.get('region') || '';
    const known = insights.regions.filter(item => item.region !== 'Unknown');
    const selected = known.find(item => item.region === requested) ?? known[0];
    const newest = await apiJson<BrowseResponse>(`/api/v1/companies/browse?${browseQuery({ region: selected.region, status: 'Registered', page_size: 6, count: 'false' })}`);
    return { overview: insights.overview, regions: known, selected, newest: newest.results, asAt: dataset.as_at, importedAt: dataset.imported_at };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: data ? `Companies by region - ${data.selected.region} and all of New Zealand | ${SITE_NAME}` : `Map Explorer | ${SITE_NAME}`,
    description: data
        ? `Active New Zealand companies by region on a map. ${data.selected.region}: ${formatNumber(data.selected.live)} active companies, ${formatNumber(data.selected.last12)} registered in the last 12 months, top industries and towns.`
        : 'Active New Zealand companies by region.',
    path: '/map',
});

export default function MapExplorer() {
    const { overview, regions, selected, newest, asAt, importedAt } = useLoaderData<typeof loader>();
    const change = percentChange(selected.last12, selected.prior12);
    const share = overview.live ? (selected.live / overview.live) * 100 : 0;

    return (
        <AppShell asAt={asAt} importedAt={importedAt}>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">Map Explorer</h1>
                <p className="text-ink-muted text-sm mt-1">Active companies by region, from the registered office postcode. Click a region.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
                <Card title="New Zealand" icon={MapPin} action={<span className="text-xs text-ink-muted tabular">{formatNumber(overview.live)} active companies</span>}>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {regions.slice(0, 8).map(region => (
                            <Link key={region.region} to={`/map?region=${encodeURIComponent(region.region)}`} className={`chip ${selected.region === region.region ? 'chip-active' : ''}`}>{region.region}</Link>
                        ))}
                    </div>
                    <div className="rounded-lg bg-canvas p-3 max-w-[560px] mx-auto">
                        <NZMap counts={regions} selected={selected.region} hrefFor={region => `/map?region=${encodeURIComponent(region)}`} />
                    </div>
                </Card>

                <div className="space-y-4">
                    <section className="card p-5">
                        <p className="text-xs text-ink-muted">Selected region</p>
                        <h2 className="text-xl font-bold">{selected.region}</h2>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="rounded-lg bg-canvas p-3">
                                <p className="text-xs text-ink-muted">Active companies</p>
                                <p className="text-lg font-bold tabular">{formatNumber(selected.live)}</p>
                                <p className="text-xs text-ink-muted">{share.toFixed(1)}% of NZ</p>
                            </div>
                            <div className="rounded-lg bg-canvas p-3">
                                <p className="text-xs text-ink-muted">Registered, last 12 months</p>
                                <p className="text-lg font-bold tabular">{formatNumber(selected.last12)}</p>
                                {change !== null && <p className={`text-xs ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{change >= 0 ? '+' : ''}{change.toFixed(1)}% vs. prior 12</p>}
                            </div>
                            <div className="rounded-lg bg-canvas p-3">
                                <p className="text-xs text-ink-muted">With a website</p>
                                <p className="text-lg font-bold tabular">{formatNumber(selected.with_website)}</p>
                                <p className="text-xs text-ink-muted">{selected.live ? Math.round((selected.with_website / selected.live) * 100) : 0}% of the region</p>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-5 mt-5">
                            <div>
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Building2 className="w-4 h-4 text-brand-600" /> Top industries</h3>
                                <BarList total={selected.live} items={selected.top_divisions.map(item => ({ label: DIVISION_SHORT[item.code] ?? item.name, value: item.live, href: `/search?${browseQuery({ region: selected.region, division: item.code, status: 'Registered' })}` }))} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-600" /> Top towns and cities</h3>
                                <BarList total={selected.live} color="#14B8A6" items={selected.top_cities.map(item => ({ label: item.city, value: item.live, href: `/search?${browseQuery({ region: selected.region, city: item.city, status: 'Registered' })}` }))} />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-5">
                            <Link to={regionPath(selected.region)} className="btn-primary">{selected.region} in detail <ArrowRight className="w-4 h-4" /></Link>
                            <Link to={`/search?${browseQuery({ region: selected.region, status: 'Registered' })}`} className="btn-secondary">Search companies</Link>
                        </div>
                    </section>

                    <section className="card p-5">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-600" /> Newest companies in {selected.region}</h3>
                        <ul className="divide-y divide-line">
                            {newest.map(company => (
                                <li key={company.nzbn} className="py-2.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <Link to={companyPath(company.nzbn, company.name)} className="font-medium text-ink hover:text-brand-600 block truncate">{company.name}</Link>
                                        <p className="text-xs text-ink-muted truncate">{[company.city, company.industry].filter(Boolean).join(' · ')} · {formatDate(company.registration_date)}</p>
                                    </div>
                                    <StatusPill status={company.status} />
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>

            <Card title="All regions" icon={MapPin} className="mt-4">
                <BarList total={overview.live} items={regions.map(item => ({ label: item.region, value: item.live, href: regionPath(item.region) }))} />
                <p className="text-xs text-ink-faint mt-3">Region is derived from the registered office postcode; a few border towns fall on the wrong side, and {formatNumber(overview.live - regions.reduce((sum, item) => sum + item.live, 0))} companies have no usable postcode.</p>
            </Card>
        </AppShell>
    );
}
