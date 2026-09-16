import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import {
    ArrowRight, Briefcase, Building2, Globe, Lightbulb, Map as MapIcon, MapPin, PieChart, Sparkles, TrendingUp, UserRound, Users
} from 'lucide-react';
import AppShell from '../components/AppShell';
import { BarList, Card, Columns, Donut, KpiCard, PALETTE, TrendLine } from '../components/charts';
import NZMap from '../components/NZMap';
import SearchPanel from '../components/SearchPanel';
import { DIVISION_SHORT, apiJson, browseQuery, type BrowseFilters, type BrowseResponse, type DatasetSummary, type Insights } from '../lib/api';
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, formatDate, formatNumber, pageMeta, percentChange, shortAge } from '../lib/site';

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const region = url.searchParams.get('region') || '';
    const [insights, dataset, browse] = await Promise.all([
        apiJson<Insights>('/api/v1/insights'),
        apiJson<DatasetSummary>('/api/v1/dataset'),
        apiJson<BrowseResponse>(`/api/v1/companies/browse?${browseQuery({ status: 'Registered', page_size: 6 })}`),
    ]);
    const selectedRegion = insights.regions.find(item => item.region === region) ?? insights.regions[0];
    return {
        dataset,
        overview: insights.overview,
        regions: insights.regions.map(({ top_cities, top_divisions, ...rest }) => rest),
        selectedRegion,
        divisions: insights.divisions,
        years: insights.years,
        directors: insights.directors,
        ownership: insights.ownership,
        age: insights.age,
        options: { regions: insights.region_names, divisions: Object.entries(insights.division_names).map(([code, name]) => ({ code, name })) },
        browse,
    };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: `${SITE_NAME} - New Zealand company register, searchable by industry and region`,
    description: data
        ? `${formatNumber(data.overview.live)} active New Zealand companies by region, industry, age and ownership, with search across the whole Companies Office register. Data as at ${formatDate(data.overview.as_at)}.`
        : DEFAULT_DESCRIPTION,
    path: '/',
    jsonLd: [
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
            potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
                'query-input': 'required name=search_term_string',
            },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'New Zealand company register',
            description: DEFAULT_DESCRIPTION,
            url: SITE_URL,
            creator: { '@type': 'Organization', name: 'New Zealand Companies Office' },
            temporalCoverage: data ? `1862/${data.overview.as_at}` : undefined,
        },
    ],
});

export default function Overview() {
    const { dataset, overview, regions, selectedRegion, divisions, years, directors, ownership, age, options, browse } = useLoaderData<typeof loader>();

    const netLast12 = overview.registered_last12 - overview.removed_last12;
    const stockGrowth = percentChange(overview.live, overview.live - netLast12);
    const registrationsChange = percentChange(overview.registered_last12, overview.registered_prior12);
    const websiteShare = overview.live ? (overview.live_with_website / overview.live) * 100 : 0;

    const knownRegions = regions.filter(item => item.region !== 'Unknown');
    const topRegions = knownRegions.slice(0, 6);
    const otherRegions = knownRegions.slice(6).reduce((sum, item) => sum + item.live, 0);
    const topDivisions = divisions.slice(0, 5);
    const otherDivisions = divisions.slice(5).reduce((sum, item) => sum + item.live, 0);
    const snapshotYear = Number(overview.as_at.slice(0, 4));
    const trend = years.filter(item => item.year < snapshotYear && item.year >= snapshotYear - 7).map(item => ({ label: String(item.year), value: item.registrations }));
    const growth = [...divisions].filter(item => item.prior12 >= 500).map(item => ({ ...item, growth: percentChange(item.last12, item.prior12) ?? 0 })).sort((a, b) => b.growth - a.growth);
    const established = [...divisions].filter(item => item.live >= 2000).sort((a, b) => (b.established_share ?? 0) - (a.established_share ?? 0));
    const safest = [...divisions].filter(item => item.live >= 2000 && item.liquidations_per_1000 !== null).sort((a, b) => (a.liquidations_per_1000 ?? 0) - (b.liquidations_per_1000 ?? 0));
    const ownershipItems = [
        { label: 'Individually owned', value: ownership.find(item => item.kind === 'individual')?.live ?? 0, color: PALETTE[1] },
        { label: 'Has a corporate shareholder', value: ownership.find(item => item.kind === 'corporate')?.live ?? 0, color: PALETTE[0] },
        { label: 'No shareholders recorded', value: ownership.find(item => item.kind === 'none')?.live ?? 0, color: PALETTE[7] },
    ];
    const individualShare = Math.round((ownershipItems[0].value / Math.max(1, overview.live)) * 100);
    const chips = ['All', ...divisions.slice(0, 6).map(item => item.code)];
    const filters: BrowseFilters = { status: 'Registered' };

    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">Overview</h1>
                <p className="text-ink-muted text-sm mt-1">Key insights into New Zealand's business landscape, from the Companies Office register as at {formatDate(overview.as_at)}.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard icon={Building2} label="Active NZ companies" value={formatNumber(overview.live)} change={stockGrowth} caption="net change over 12 months" tone="brand" />
                <KpiCard icon={TrendingUp} label="Registered in the last 12 months" value={formatNumber(overview.registered_last12)} change={registrationsChange} tone="teal" />
                <KpiCard icon={Globe} label="Companies with a website" value={formatNumber(overview.live_with_website)} caption={`${websiteShare.toFixed(1)}% of active companies`} tone="purple" />
                <KpiCard icon={Briefcase} label="Industry categories" value={String(overview.divisions)} caption="ANZSIC divisions across the register" tone="amber" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-5 gap-4 mt-4">
                <Card title="Companies by region" icon={MapPin} action={<Link to="/map" className="text-xs text-brand-600 hover:underline">Map</Link>}>
                    <BarList
                        total={overview.live}
                        items={[
                            ...topRegions.map(item => ({ label: item.region, value: item.live, href: `/search?${browseQuery({ region: item.region, status: 'Registered' })}` })),
                            { label: 'Other NZ', value: otherRegions, color: '#94A3B8' },
                        ]}
                    />
                </Card>
                <Card title="By industry classification" icon={PieChart}>
                    <Donut
                        centerValue={String(overview.divisions)} centerLabel="industries"
                        items={[
                            ...topDivisions.map(item => ({ label: DIVISION_SHORT[item.code] ?? item.name, value: item.live })),
                            { label: 'Other', value: otherDivisions, color: '#CBD5E1' },
                        ]}
                    />
                </Card>
                <Card title="Directors per company" icon={Users}>
                    <Columns items={directors.filter(item => item.bucket !== '0').map(item => ({ label: item.bucket, value: item.live }))} />
                    <p className="text-xs text-ink-faint mt-1 text-center">number of directors</p>
                </Card>
                <Card title="Ownership" icon={Sparkles}>
                    <Donut centerValue={`${individualShare}%`} centerLabel="individually owned" items={ownershipItems} />
                </Card>
                <Card title="Incorporation trends" icon={TrendingUp}>
                    <TrendLine points={trend} />
                </Card>
            </div>

            <section className="mt-4 rounded-card border border-brand-100 bg-brand-50/60 p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-surface border border-brand-100 text-brand-600 flex items-center justify-center"><UserRound className="w-5 h-5" /></div>
                        <div>
                            <h2 className="text-lg font-bold">Job Seeker Insights</h2>
                            <p className="text-sm text-ink-muted">Which industries are growing, which are established, and where companies fail most often.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {chips.map(code => (
                            <Link key={code} to={code === 'All' ? '/job-seekers' : `/job-seekers?division=${code}`} className={`chip ${code === 'All' ? 'chip-active' : ''}`}>
                                {code === 'All' ? 'All' : DIVISION_SHORT[code] ?? code}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 mt-5 items-start">
                    <div className="card p-5">
                        <h3 className="text-sm font-semibold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-teal-500" /> Company age profile</h3>
                        <p className="text-xs text-ink-muted mb-3">How long active companies have been on the register</p>
                        <Columns items={age.map(item => ({ label: shortAge(item.bucket), value: item.live }))} height={180} color="#14B8A6" />
                    </div>
                    <div className="card p-5">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-600" /> Fastest-growing industries</h3>
                        <ol className="space-y-2 text-sm">
                            {growth.slice(0, 5).map((item, index) => (
                                <li key={item.code} className="flex items-center gap-2">
                                    <span className="text-ink-faint w-4 tabular">{index + 1}.</span>
                                    <Link to={`/job-seekers?division=${item.code}`} className="flex-1 truncate text-ink-2 hover:text-brand-600">{DIVISION_SHORT[item.code] ?? item.name}</Link>
                                    <span className={`tabular font-medium ${item.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{item.growth >= 0 ? '+' : ''}{item.growth.toFixed(0)}%</span>
                                </li>
                            ))}
                        </ol>
                        <p className="text-[11px] text-ink-faint mt-3">New registrations, last 12 months vs. the 12 before.</p>
                    </div>
                    <div className="card p-5">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-brand-600" /> Most established</h3>
                        <ol className="space-y-2 text-sm">
                            {established.slice(0, 5).map((item, index) => (
                                <li key={item.code} className="flex items-center gap-2">
                                    <span className="text-ink-faint w-4 tabular">{index + 1}.</span>
                                    <Link to={`/job-seekers?division=${item.code}`} className="flex-1 truncate text-ink-2 hover:text-brand-600">{DIVISION_SHORT[item.code] ?? item.name}</Link>
                                    <span className="tabular font-medium text-ink">{Math.round((item.established_share ?? 0) * 100)}%</span>
                                </li>
                            ))}
                        </ol>
                        <p className="text-[11px] text-ink-faint mt-3">Share of companies registered 10+ years ago.</p>
                    </div>
                    <div className="card p-5">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-brand-600" /> Lowest insolvency rate</h3>
                        <ol className="space-y-2 text-sm">
                            {safest.slice(0, 5).map((item, index) => (
                                <li key={item.code} className="flex items-center gap-2">
                                    <span className="text-ink-faint w-4 tabular">{index + 1}.</span>
                                    <Link to={`/job-seekers?division=${item.code}`} className="flex-1 truncate text-ink-2 hover:text-brand-600">{DIVISION_SHORT[item.code] ?? item.name}</Link>
                                    <span className="tabular font-medium text-ink">{item.liquidations_per_1000}‰</span>
                                </li>
                            ))}
                        </ol>
                        <p className="text-[11px] text-ink-faint mt-3">Liquidations per 1,000 active companies, last 12 months.</p>
                    </div>
                </div>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted mt-4">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Computed from register facts only - registration, removal and insolvency dates. They describe industries, not employers; a per-company Company Health Indicator is coming.
                    <Link to="/job-seekers" className="inline-flex items-center gap-1 text-brand-600 hover:underline font-medium">Explore by industry <ArrowRight className="w-3.5 h-3.5" /></Link>
                </p>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4 mt-4">
                <SearchPanel filters={filters} options={options} result={browse} compact />

                <section className="card p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                            <h2 className="card-title"><MapIcon className="w-4 h-4 text-brand-600" /> Map Explorer</h2>
                            <p className="text-sm text-ink-muted mt-1">Active companies by region</p>
                        </div>
                        <Link to="/map" className="text-xs text-brand-600 hover:underline whitespace-nowrap">Open map</Link>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {['Auckland', 'Wellington', 'Canterbury', 'Otago', 'Waikato'].map(region => (
                            <Link key={region} to={`/?region=${encodeURIComponent(region)}#map`} className={`chip ${selectedRegion?.region === region ? 'chip-active' : ''}`}>{region}</Link>
                        ))}
                    </div>
                    <div id="map" className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] xl:grid-cols-1 2xl:grid-cols-[1fr_1fr] gap-4 items-start">
                        <div className="rounded-lg bg-canvas p-2"><NZMap counts={knownRegions} selected={selectedRegion?.region} hrefFor={region => `/?region=${encodeURIComponent(region)}#map`} compact /></div>
                        {selectedRegion && (
                            <div className="rounded-lg border border-line p-4">
                                <p className="text-xs text-ink-muted">Selected region</p>
                                <h3 className="font-semibold text-lg">{selectedRegion.region}</h3>
                                <p className="text-sm text-ink-2 mt-1"><span className="font-semibold tabular">{formatNumber(selectedRegion.live)}</span> active companies · {Math.round((selectedRegion.live / overview.live) * 100)}% of NZ</p>
                                <p className="text-sm text-ink-2"><span className="font-semibold tabular">{formatNumber(selectedRegion.last12)}</span> registered in the last 12 months
                                    {(() => { const change = percentChange(selectedRegion.last12, selectedRegion.prior12); return change === null ? null : <span className={change >= 0 ? 'text-emerald-600' : 'text-rose-600'}> ({change >= 0 ? '+' : ''}{change.toFixed(1)}%)</span>; })()}
                                </p>
                                <p className="text-xs text-ink-muted mt-3 mb-1">Top industries</p>
                                <ul className="space-y-1 text-sm">
                                    {selectedRegion.top_divisions.slice(0, 3).map(item => (
                                        <li key={item.code} className="flex justify-between gap-2"><span className="truncate text-ink-2">{DIVISION_SHORT[item.code] ?? item.name}</span><span className="tabular text-ink-muted">{formatNumber(item.live)}</span></li>
                                    ))}
                                </ul>
                                <div className="flex gap-2 mt-4">
                                    <Link to={`/map?region=${encodeURIComponent(selectedRegion.region)}`} className="btn-primary text-xs px-3 py-1.5">View details <ArrowRight className="w-3.5 h-3.5" /></Link>
                                    <Link to={`/search?${browseQuery({ region: selectedRegion.region, status: 'Registered' })}`} className="btn-secondary text-xs px-3 py-1.5">Companies</Link>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
