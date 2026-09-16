import { useEffect, useState } from 'react';
import { Form, Link, useSubmit } from 'react-router';
import {
    ArrowRight, Building2, ChevronLeft, ChevronRight, ExternalLink, Globe, MapPin, Search, Users, X
} from 'lucide-react';
import StatusPill from './StatusPill';
import { DIVISION_SHORT, ENTITY_TYPE_NAMES, browseQuery, type BrowseFilters, type BrowseResponse, type CompanyRow } from '../lib/api';
import { companyPath, formatDate, formatNumber } from '../lib/site';

export interface SearchOptions {
    regions: string[];
    divisions: { code: string; name: string }[];
}

const STATUSES = ['Registered', 'In Liquidation', 'In Receivership', 'Voluntary Administration', 'Removed'];

const websiteHref = (site: string) => (site.startsWith('http') ? site : `https://${site}`);

function FilterForm({ filters, options, action }: { filters: BrowseFilters; options: SearchOptions; action: string }) {
    const submit = useSubmit();
    const select = 'field appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2364748B%27 stroke-width=%272.5%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.75rem_center] pr-8';
    return (
        <Form method="get" action={action} className="space-y-3" onChange={event => submit(event.currentTarget)}>
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input id="browse-q" name="q" type="search" defaultValue={filters.q ?? ''} placeholder="Company name or NZBN" autoComplete="off" className="field pl-10" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="block">
                    <span className="block text-xs text-ink-muted mb-1">Industry</span>
                    <select name="division" defaultValue={filters.division ?? ''} className={select}>
                        <option value="">All industries</option>
                        {options.divisions.map(division => <option key={division.code} value={division.code}>{DIVISION_SHORT[division.code] ?? division.name}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="block text-xs text-ink-muted mb-1">Region</span>
                    <select name="region" defaultValue={filters.region ?? ''} className={select}>
                        <option value="">All regions</option>
                        {options.regions.map(region => <option key={region} value={region}>{region}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="block text-xs text-ink-muted mb-1">Company type</span>
                    <select name="entity_type" defaultValue={filters.entity_type ?? ''} className={select}>
                        <option value="">All types</option>
                        {Object.entries(ENTITY_TYPE_NAMES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="block text-xs text-ink-muted mb-1">Status</span>
                    <select name="status" defaultValue={filters.status ?? ''} className={select}>
                        <option value="">Any status</option>
                        {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="block text-xs text-ink-muted mb-1">Website</span>
                    <select name="website" defaultValue={filters.website ?? ''} className={select}>
                        <option value="">Any</option>
                        <option value="true">Has a website</option>
                        <option value="false">No website</option>
                    </select>
                </label>
                <label className="block">
                    <span className="block text-xs text-ink-muted mb-1">City / town</span>
                    <input name="city" defaultValue={filters.city ?? ''} placeholder="e.g. Hamilton" className="field" />
                </label>
                <label className="block">
                    <span className="block text-xs text-ink-muted mb-1">Sort</span>
                    <select name="sort" defaultValue={filters.sort ?? 'newest'} className={select}>
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="name">Name A-Z</option>
                    </select>
                </label>
                <div className="flex items-end">
                    <button type="submit" className="btn-primary w-full">Apply filters</button>
                </div>
            </div>
        </Form>
    );
}

function ActiveFilters({ filters, options, action }: { filters: BrowseFilters; options: SearchOptions; action: string }) {
    const labels: Array<[keyof BrowseFilters, string]> = [];
    if (filters.q) labels.push(['q', `"${filters.q}"`]);
    if (filters.division) labels.push(['division', DIVISION_SHORT[filters.division] ?? options.divisions.find(d => d.code === filters.division)?.name ?? filters.division]);
    if (filters.region) labels.push(['region', filters.region]);
    if (filters.city) labels.push(['city', filters.city]);
    if (filters.entity_type) labels.push(['entity_type', ENTITY_TYPE_NAMES[filters.entity_type] ?? filters.entity_type]);
    if (filters.status) labels.push(['status', filters.status]);
    if (filters.website) labels.push(['website', filters.website === 'true' ? 'Has a website' : 'No website']);
    if (labels.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center gap-2">
            {labels.map(([key, label]) => (
                <Link key={key} to={`${action}?${browseQuery({ ...filters, [key]: undefined, page: undefined })}`} className="chip chip-active">
                    {label} <X className="w-3 h-3" />
                </Link>
            ))}
            <Link to={action} className="text-xs text-brand-600 hover:underline ml-1">Clear all filters</Link>
        </div>
    );
}

function Preview({ company }: { company: CompanyRow }) {
    return (
        <aside className="card p-5 h-full">
            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5" /></div>
                <div className="min-w-0">
                    <h3 className="font-semibold leading-snug">{company.name}</h3>
                    <div className="mt-1.5"><StatusPill status={company.status} /></div>
                </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
                {(company.city || company.region) && (
                    <div className="flex items-center gap-2 text-ink-2"><MapPin className="w-4 h-4 text-ink-faint shrink-0" /><dd>{[company.city, company.region].filter(Boolean).join(', ')}</dd></div>
                )}
                {company.industry && (
                    <div className="flex items-center gap-2 text-ink-2"><Building2 className="w-4 h-4 text-ink-faint shrink-0" /><dd className="truncate" title={company.industry}>{company.industry}</dd></div>
                )}
                {company.website && (
                    <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-ink-faint shrink-0" /><dd className="truncate"><a href={websiteHref(company.website)} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">{company.website}</a></dd></div>
                )}
                <div className="flex items-center gap-2 text-ink-2"><Users className="w-4 h-4 text-ink-faint shrink-0" /><dd>{company.director_count} director{company.director_count === 1 ? '' : 's'} · {company.shareholder_count} shareholder{company.shareholder_count === 1 ? '' : 's'}{company.corporate_shareholder ? ' · corporate shareholder' : ''}</dd></div>
            </dl>
            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div className="rounded-lg bg-canvas p-3">
                    <p className="text-xs text-ink-muted">Company type</p>
                    <p className="font-medium mt-0.5">{ENTITY_TYPE_NAMES[company.type ?? ''] ?? company.type ?? '-'}</p>
                </div>
                <div className="rounded-lg bg-canvas p-3">
                    <p className="text-xs text-ink-muted">Registered</p>
                    <p className="font-medium mt-0.5">{formatDate(company.registration_date) || '-'}</p>
                </div>
            </div>
            {company.trading_name && <p className="text-sm text-ink-2 mt-4">Trades as <span className="font-medium">{company.trading_name}</span>.</p>}
            {company.insolvency_type && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                    {company.insolvency_type} recorded{company.insolvency_date ? ` (${formatDate(company.insolvency_date)})` : ''}.
                </p>
            )}
            {company.removal_date && <p className="text-sm text-ink-muted mt-4">Removed from the register {formatDate(company.removal_date)}.</p>}
            <Link to={companyPath(company.nzbn, company.name)} className="btn-primary w-full mt-5">View full profile <ArrowRight className="w-4 h-4" /></Link>
        </aside>
    );
}

/** The filter form, the result table and the preview of the selected row. Used on the overview (compact) and the search page. */
export default function SearchPanel({ filters, options, result, action = '/search', compact = false, title = 'Multi-dimensional Company Search' }: {
    filters: BrowseFilters; options: SearchOptions; result: BrowseResponse; action?: string; compact?: boolean; title?: string;
}) {
    const [selectedNzbn, setSelectedNzbn] = useState<string | null>(result.results[0]?.nzbn ?? null);
    useEffect(() => {
        setSelectedNzbn(result.results[0]?.nzbn ?? null);
    }, [result]);
    const selected = result.results.find(row => row.nzbn === selectedNzbn) ?? result.results[0];
    // A compact list is fetched without a total (count=false), so it shows what it has.
    const knownTotal = result.total > 0 || result.results.length === 0;
    const pageCount = Math.max(1, Math.ceil(result.total / result.page_size));
    const pageHref = (page: number) => `${action}?${browseQuery({ ...filters, page, count: undefined })}`;

    return (
        <section className="card p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h2 className="card-title"><Search className="w-4 h-4 text-brand-600" /> {title}</h2>
                    <p className="text-sm text-ink-muted mt-1">Find New Zealand companies by name, industry, region, type and status.</p>
                </div>
                {compact && <Link to="/search" className="text-sm text-brand-600 hover:underline whitespace-nowrap">Open full search</Link>}
            </div>

            <FilterForm filters={filters} options={options} action={action} />
            <div className="mt-3"><ActiveFilters filters={filters} options={options} action={action} /></div>

            <div className={`mt-4 grid gap-4 ${compact ? 'xl:grid-cols-[1fr_18rem]' : 'xl:grid-cols-[1fr_20rem]'}`}>
                <div className="min-w-0">
                    <p className="text-xs text-ink-muted mb-2 tabular">
                        {!knownTotal
                            ? `Newest ${result.results.length} registered companies`
                            : result.total === 0 ? 'No companies match.' : `${formatNumber(result.total)} ${result.total === 1 ? 'company' : 'companies'}${result.total > result.page_size ? ` · showing ${(result.page - 1) * result.page_size + 1}-${Math.min(result.page * result.page_size, result.total)}` : ''}`}
                    </p>
                    <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-sm text-left min-w-[640px]">
                            <thead className="text-xs text-ink-muted border-b border-line">
                                <tr>
                                    <th className="py-2 px-2 font-medium">Company</th>
                                    <th className="py-2 px-2 font-medium">Location</th>
                                    <th className="py-2 px-2 font-medium">Industry</th>
                                    <th className="py-2 px-2 font-medium">Website</th>
                                    <th className="py-2 px-2 font-medium">Status</th>
                                    <th className="py-2 px-2 font-medium">Registered</th>
                                    <th className="py-2 px-1"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {result.results.map(row => (
                                    <tr
                                        key={row.nzbn}
                                        onClick={() => setSelectedNzbn(row.nzbn)}
                                        className={`cursor-pointer transition-colors ${selected?.nzbn === row.nzbn ? 'bg-brand-50/60' : 'hover:bg-canvas'}`}
                                    >
                                        <td className="py-2.5 px-2 max-w-[16rem]">
                                            <Link to={companyPath(row.nzbn, row.name)} className="font-medium text-ink hover:text-brand-600 block truncate" title={row.name}>{row.name}</Link>
                                            <span className="text-xs text-ink-faint tabular">{row.nzbn}</span>
                                        </td>
                                        <td className="py-2.5 px-2 text-ink-2 whitespace-nowrap">{row.city || row.region || '-'}</td>
                                        <td className="py-2.5 px-2 text-ink-2 max-w-[12rem]"><span className="block truncate" title={row.industry ?? ''}>{row.division ? (DIVISION_SHORT[row.division] ?? row.division) : '-'}</span></td>
                                        <td className="py-2.5 px-2 max-w-[10rem]">
                                            {row.website ? <a href={websiteHref(row.website)} target="_blank" rel="noopener noreferrer nofollow" onClick={e => e.stopPropagation()} className="text-brand-600 hover:underline flex items-center gap-1 truncate"><ExternalLink className="w-3 h-3 shrink-0" /><span className="truncate">{row.website.replace(/^https?:\/\/(www\.)?/, '')}</span></a> : <span className="text-ink-faint">-</span>}
                                        </td>
                                        <td className="py-2.5 px-2"><StatusPill status={row.status} /></td>
                                        <td className="py-2.5 px-2 text-ink-2 whitespace-nowrap tabular">{row.registration_date?.slice(0, 4) ?? '-'}</td>
                                        <td className="py-2.5 px-1 text-ink-faint"><ChevronRight className="w-4 h-4" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {!compact && result.total > result.page_size && (
                        <nav className="flex items-center justify-between mt-4 text-sm" aria-label="Pages">
                            {result.page > 1 ? <Link to={pageHref(result.page - 1)} className="btn-secondary"><ChevronLeft className="w-4 h-4" /> Previous</Link> : <span />}
                            <span className="text-ink-muted tabular">Page {result.page} of {formatNumber(pageCount)}</span>
                            {result.page < pageCount ? <Link to={pageHref(result.page + 1)} className="btn-secondary">Next <ChevronRight className="w-4 h-4" /></Link> : <span />}
                        </nav>
                    )}
                    {compact && (result.total > result.results.length || !knownTotal) && (
                        <Link to={`/search?${browseQuery({ ...filters, count: undefined })}`} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline mt-3">
                            {knownTotal ? `See all ${formatNumber(result.total)} results` : 'See all results'} <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
                {selected && <Preview company={selected} />}
            </div>
        </section>
    );
}
