import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
    Briefcase, Building2, ChevronLeft, ChevronRight, Download, MapPin, Search, X
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ADMIN_API } from './api';
import { StatusPill } from './CompanyDetail';
import CompanyDrawer from './CompanyDrawer';
import EnrichmentPanel from './EnrichmentPanel';

const API = `${ADMIN_API}/new-companies`;
const PAGE_SIZE = 50;

const CONTACT_FILTERS = [
    { value: '', label: 'Any contact details' },
    { value: 'any', label: 'Has phone, email or website' },
    { value: 'email', label: 'Has email' },
    { value: 'phone', label: 'Has phone' },
    { value: 'website', label: 'Has website' },
];

interface MonthOption {
    month: string;
    companies: number;
}

interface Count {
    name: string;
    companies: number;
}

interface Summary {
    month: string;
    total: number;
    by_status: Count[];
    by_type: Count[];
    top_industries: Count[];
    top_cities: Count[];
}

interface CompanyRow {
    nzbn: string;
    entity_name: string;
    registration_date: string;
    entity_type: string | null;
    entity_status: string | null;
    industry_code: string | null;
    industry: string | null;
    city: string | null;
    address_for_service: string | null;
    registered_office: string | null;
    director_count: number;
    directors: string | null;
    shareholder_count: number;
    gst_number: string | null;
    website: string | null;
    trading_name: string | null;
    phones: string | null;
    emails: string | null;
    nzbn_websites: string | null;
    contact_fetched_at: string | null;
}

const monthLabel = (month: string) =>
    new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

const websiteOf = (company: CompanyRow) => company.website || company.nzbn_websites?.split('; ')[0] || null;
const firstEmail = (company: CompanyRow) => company.emails?.split('; ')[0] || null;

const Blank = () => <span className="text-gray-600">-</span>;

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
    return (
        <div className="glass-card p-4 sm:p-5 rounded-xl">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-1 truncate" title={value}>{value}</p>
            {detail && <p className="text-xs text-gray-500 mt-1 truncate" title={detail}>{detail}</p>}
        </div>
    );
}

function RankedList({ title, icon: Icon, items, className = '' }: { title: string; icon: typeof MapPin; items: Count[]; className?: string }) {
    const max = Math.max(1, ...items.map(item => item.companies));
    return (
        <section className={`glass-panel p-5 rounded-2xl ${className}`}>
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Icon className="w-4 h-4 text-neon-purple" /> {title}</h2>
            <ul className="space-y-2">
                {items.map(item => (
                    <li key={item.name} className="text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-300 truncate" title={item.name}>{item.name}</span>
                            <span className="font-mono text-neon-blue">{item.companies.toLocaleString()}</span>
                        </div>
                        <div className="h-1 mt-1 bg-dark-border rounded-full overflow-hidden">
                            <div className="h-full bg-neon-purple/60" style={{ width: `${(item.companies / max) * 100}%` }} />
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Phone and email, on one line each, for the table and the phone card. */
function ContactCell({ company }: { company: CompanyRow }) {
    if (!company.contact_fetched_at) return <Blank />;
    if (!company.phones && !company.emails) return <span className="text-xs text-gray-500">None listed</span>;
    return (
        <>
            {company.phones && <p className="truncate text-gray-300 font-mono" title={company.phones}>{company.phones}</p>}
            {company.emails && (
                <a
                    href={`mailto:${firstEmail(company)}`}
                    onClick={e => e.stopPropagation()}
                    className="block truncate text-neon-blue hover:underline"
                    title={company.emails}
                >
                    {company.emails}
                </a>
            )}
        </>
    );
}

export default function NewCompaniesPage({ onSessionExpired }: { onSessionExpired: () => void }) {
    const [months, setMonths] = useState<MonthOption[]>([]);
    const [month, setMonth] = useState('');
    const [summary, setSummary] = useState<Summary | null>(null);
    const [companies, setCompanies] = useState<CompanyRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [contact, setContact] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedNzbn, setSelectedNzbn] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const getJson = useCallback(async (url: string) => {
        const res = await fetch(url);
        if (res.status === 401) {
            onSessionExpired();
            throw new Error('Your session has expired');
        }
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (HTTP ${res.status})`);
        }
        return res.json();
    }, [onSessionExpired]);

    // Start on the latest month in the data, normally last month.
    useEffect(() => {
        getJson(`${API}/months`)
            .then(data => {
                setMonths(data.months);
                setMonth(data.latest);
            })
            .catch(e => {
                setError(e.message);
                setLoading(false);
            });
    }, [getJson]);

    useEffect(() => {
        if (!month) return;
        setSummary(null);
        getJson(`${API}/summary?month=${month}`).then(setSummary).catch(e => setError(e.message));
    }, [getJson, month]);

    const filterQuery = new URLSearchParams({ month, q: search, status, contact }).toString();

    useEffect(() => {
        if (!month) return;
        setLoading(true);
        getJson(`${API}?${filterQuery}&page=${page}&page_size=${PAGE_SIZE}`)
            .then(data => {
                setCompanies(data.companies);
                setTotal(data.total);
                setError('');
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [getJson, month, filterQuery, page, refreshKey]);

    const refreshList = useCallback(() => setRefreshKey(key => key + 1), []);

    const filterByContact = useCallback((kind: 'phone' | 'email' | 'website') => {
        setContact(kind);
        setPage(1);
    }, []);

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        setSearch(searchInput.trim());
        setPage(1);
    };

    const stillRegistered = summary?.by_status.find(s => s.name === 'Registered')?.companies ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">New companies</h1>
                    <p className="text-gray-400">
                        Companies registered {month ? <>in <span className="text-white">{monthLabel(month)}</span></> : 'by month'}.
                        Tap a company to see everything recorded against it.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={month}
                        onChange={e => { setMonth(e.target.value); setPage(1); setStatus(''); setContact(''); }}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-blue"
                    >
                        {months.map(option => (
                            <option key={option.month} value={option.month}>
                                {monthLabel(option.month)} ({option.companies.toLocaleString()})
                            </option>
                        ))}
                    </select>
                    <a
                        href={`${API}/export?${filterQuery}`}
                        className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-semibold bg-neon-blue/10 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue hover:text-black transition-all ${month ? '' : 'pointer-events-none opacity-40'}`}
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </a>
                </div>
            </div>

            {error && <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm">{error}</div>}

            {summary && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard label="Registered" value={summary.total.toLocaleString()} detail={monthLabel(summary.month)} />
                        <StatCard
                            label="Still registered"
                            value={stillRegistered.toLocaleString()}
                            detail={summary.total ? `${((stillRegistered / summary.total) * 100).toFixed(1)}% of the month` : undefined}
                        />
                        <StatCard label="Top industry" value={summary.top_industries[0]?.name ?? '-'} detail={summary.top_industries[0] ? `${summary.top_industries[0].companies} companies` : undefined} />
                        <StatCard label="Top city" value={summary.top_cities[0]?.name ?? '-'} detail={summary.top_cities[0] ? `${summary.top_cities[0].companies} companies` : undefined} />
                    </div>
                    <div className="grid lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                        <RankedList title="Industries" icon={Briefcase} items={summary.top_industries} />
                        <RankedList title="Cities (address for service)" icon={MapPin} items={summary.top_cities} />
                        {/* Only on very wide screens, where it fits beside the other two. */}
                        <RankedList title="Entity types" icon={Building2} items={summary.by_type} className="hidden 2xl:block" />
                    </div>
                </>
            )}

            {month && (
                <EnrichmentPanel
                    month={month} monthName={monthLabel(month)}
                    onSessionExpired={onSessionExpired} onFinished={refreshList} onFilter={filterByContact}
                />
            )}

            <section className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    <form onSubmit={applySearch} className="flex-1 flex gap-2 min-w-[14rem]">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder={month ? `Name or NZBN, in ${monthLabel(month)}` : 'Company name or NZBN'}
                                className="w-full pl-9 pr-9 py-2.5 bg-dark-bg/50 border border-dark-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-blue"
                            />
                            {search && (
                                <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" aria-label="Clear search">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button type="submit" className="px-4 py-2.5 rounded-lg text-sm bg-white/5 border border-dark-border hover:bg-white/10">Search</button>
                    </form>
                    <select
                        value={contact}
                        onChange={e => { setContact(e.target.value); setPage(1); }}
                        className={`px-4 py-2.5 bg-dark-card border rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-blue ${contact ? 'border-neon-green/50 text-neon-green' : 'border-dark-border'}`}
                    >
                        {CONTACT_FILTERS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <select
                        value={status}
                        onChange={e => { setStatus(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-blue"
                    >
                        <option value="">All statuses</option>
                        {summary?.by_status.map(s => <option key={s.name} value={s.name}>{s.name} ({s.companies.toLocaleString()})</option>)}
                    </select>
                </div>
                <p className="text-xs text-gray-500">
                    This searches the selected month only. To find any company, use <Link to="/admin/search" className="text-neon-blue hover:underline">Company search</Link>.
                    {contact && ' Export CSV downloads exactly what the filters show.'}
                </p>

                {loading ? <LoadingSpinner /> : companies.length === 0 ? (
                    <p className="text-gray-500 text-sm py-8 text-center">No companies match.</p>
                ) : (
                    <>
                        {/* Phones and narrow windows: one card per company. */}
                        <ul className="md:hidden divide-y divide-dark-border">
                            {companies.map(company => (
                                <li key={company.nzbn}>
                                    <button onClick={() => setSelectedNzbn(company.nzbn)} className="w-full text-left py-4 space-y-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="font-medium text-white">{company.entity_name}</p>
                                            <StatusPill status={company.entity_status} />
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono">{company.nzbn} · {company.registration_date}</p>
                                        {company.trading_name && <p className="text-xs text-gray-400">Trading as {company.trading_name}</p>}
                                        {company.industry && <p className="text-sm text-gray-300">{company.industry}</p>}
                                        <p className="text-sm text-gray-400">
                                            {[company.city, company.entity_type].filter(Boolean).join(' · ') || '-'}
                                            {' · '}{company.director_count} director{company.director_count === 1 ? '' : 's'}
                                        </p>
                                        <div className="text-sm"><ContactCell company={company} /></div>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {/* Tablets and up: a table that adds columns as the window gets wider. */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-gray-400 border-b border-dark-border">
                                    <tr>
                                        <th className="py-2 pr-4 font-medium">Registered</th>
                                        <th className="py-2 pr-4 font-medium">Company</th>
                                        <th className="py-2 pr-4 font-medium">Industry</th>
                                        <th className="py-2 pr-4 font-medium">City</th>
                                        <th className="py-2 pr-4 font-medium hidden xl:table-cell">Directors</th>
                                        <th className="py-2 pr-4 font-medium text-right hidden xl:table-cell">Shareholders</th>
                                        <th className="py-2 pr-4 font-medium">Contact</th>
                                        <th className="py-2 pr-4 font-medium hidden 2xl:table-cell">Type</th>
                                        <th className="py-2 pr-4 font-medium hidden 2xl:table-cell">Registered office</th>
                                        <th className="py-2 pr-4 font-medium hidden 2xl:table-cell">GST</th>
                                        <th className="py-2 pr-4 font-medium hidden 2xl:table-cell">Website</th>
                                        <th className="py-2 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-border align-top">
                                    {companies.map(company => {
                                        const website = websiteOf(company);
                                        return (
                                            <tr key={company.nzbn} onClick={() => setSelectedNzbn(company.nzbn)} className="cursor-pointer hover:bg-white/5">
                                                <td className="py-3 pr-4 whitespace-nowrap text-gray-400">{company.registration_date}</td>
                                                <td className="py-3 pr-4 max-w-[16rem]">
                                                    <p className="font-medium text-white truncate" title={company.entity_name}>{company.entity_name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{company.nzbn}</p>
                                                    {company.trading_name && <p className="text-xs text-gray-400 truncate" title={company.trading_name}>Trading as {company.trading_name}</p>}
                                                </td>
                                                <td className="py-3 pr-4 text-gray-300 max-w-[14rem] 2xl:max-w-[18rem]">
                                                    <p className="truncate" title={company.industry ?? ''}>{company.industry || <Blank />}</p>
                                                </td>
                                                <td className="py-3 pr-4 text-gray-300 whitespace-nowrap">{company.city || <Blank />}</td>
                                                <td className="py-3 pr-4 text-gray-300 max-w-[14rem] hidden xl:table-cell">
                                                    <p className="truncate" title={company.directors ?? ''}>{company.directors || <Blank />}</p>
                                                    {company.director_count > 1 && <p className="text-xs text-gray-500">{company.director_count} directors</p>}
                                                </td>
                                                <td className="py-3 pr-4 text-right font-mono hidden xl:table-cell">{company.shareholder_count}</td>
                                                <td className="py-3 pr-4 max-w-[14rem]"><ContactCell company={company} /></td>
                                                <td className="py-3 pr-4 text-gray-300 whitespace-nowrap hidden 2xl:table-cell">{company.entity_type || <Blank />}</td>
                                                <td className="py-3 pr-4 text-gray-300 max-w-[16rem] hidden 2xl:table-cell">
                                                    <p className="truncate" title={company.registered_office ?? ''}>{company.registered_office || <Blank />}</p>
                                                </td>
                                                <td className="py-3 pr-4 font-mono text-gray-300 whitespace-nowrap hidden 2xl:table-cell">{company.gst_number || <Blank />}</td>
                                                <td className="py-3 pr-4 max-w-[12rem] hidden 2xl:table-cell">
                                                    {website ? (
                                                        <a
                                                            href={website.startsWith('http') ? website : `https://${website}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            onClick={e => e.stopPropagation()}
                                                            className="block truncate text-neon-blue hover:underline"
                                                            title={website}
                                                        >
                                                            {website.replace(/^https?:\/\//, '')}
                                                        </a>
                                                    ) : <Blank />}
                                                </td>
                                                <td className="py-3"><StatusPill status={company.entity_status} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
                    <span>{firstRow.toLocaleString()}-{Math.min(page * PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="p-2 rounded-lg border border-dark-border hover:bg-white/5 disabled:opacity-30" aria-label="Previous page">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span>Page {page} of {pageCount}</span>
                        <button onClick={() => setPage(p => p + 1)} disabled={page >= pageCount} className="p-2 rounded-lg border border-dark-border hover:bg-white/5 disabled:opacity-30" aria-label="Next page">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </section>

            {selectedNzbn && <CompanyDrawer nzbn={selectedNzbn} onClose={() => setSelectedNzbn(null)} />}
        </div>
    );
}
