import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
    Briefcase, Building2, ChevronLeft, ChevronRight, Download, MapPin, Search, X
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ADMIN_API } from './api';
import CompanyDetail, { StatusPill } from './CompanyDetail';

const API = `${ADMIN_API}/new-companies`;
const PAGE_SIZE = 50;

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
}

const monthLabel = (month: string) =>
    new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
    return (
        <div className="glass-card p-5 rounded-xl">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-white mt-1 truncate" title={value}>{value}</p>
            {detail && <p className="text-xs text-gray-500 mt-1 truncate" title={detail}>{detail}</p>}
        </div>
    );
}

function RankedList({ title, icon: Icon, items }: { title: string; icon: typeof MapPin; items: Count[] }) {
    const max = Math.max(1, ...items.map(item => item.companies));
    return (
        <section className="glass-panel p-5 rounded-2xl">
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedNzbn, setSelectedNzbn] = useState<string | null>(null);

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

    const filterQuery = new URLSearchParams({ month, q: search, status }).toString();

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
    }, [getJson, month, filterQuery, page]);

    // Close the detail panel with Escape.
    useEffect(() => {
        if (!selectedNzbn) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelectedNzbn(null);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedNzbn]);

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
                    <h1 className="text-3xl font-bold mb-2">New companies</h1>
                    <p className="text-gray-400">
                        Companies registered {month ? <>in <span className="text-white">{monthLabel(month)}</span></> : 'by month'}.
                        Click a company to see everything recorded against it.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={month}
                        onChange={e => { setMonth(e.target.value); setPage(1); setStatus(''); }}
                        className="px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-blue"
                    >
                        {months.map(option => (
                            <option key={option.month} value={option.month}>
                                {monthLabel(option.month)} ({option.companies.toLocaleString()})
                            </option>
                        ))}
                    </select>
                    <a
                        href={`${API}/export?${filterQuery}`}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-neon-blue/10 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue hover:text-black transition-all ${month ? '' : 'pointer-events-none opacity-40'}`}
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </a>
                </div>
            </div>

            {error && <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm">{error}</div>}

            {summary && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Registered" value={summary.total.toLocaleString()} detail={monthLabel(summary.month)} />
                        <StatCard
                            label="Still registered"
                            value={stillRegistered.toLocaleString()}
                            detail={summary.total ? `${((stillRegistered / summary.total) * 100).toFixed(1)}% of the month` : undefined}
                        />
                        <StatCard label="Top industry" value={summary.top_industries[0]?.name ?? '-'} detail={summary.top_industries[0] ? `${summary.top_industries[0].companies} companies` : undefined} />
                        <StatCard label="Top city" value={summary.top_cities[0]?.name ?? '-'} detail={summary.top_cities[0] ? `${summary.top_cities[0].companies} companies` : undefined} />
                    </div>
                    <div className="grid lg:grid-cols-2 gap-4">
                        <RankedList title="Industries" icon={Briefcase} items={summary.top_industries} />
                        <RankedList title="Cities (address for service)" icon={MapPin} items={summary.top_cities} />
                    </div>
                </>
            )}

            <section className="glass-panel rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <form onSubmit={applySearch} className="flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder="Company name or NZBN"
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
                        value={status}
                        onChange={e => { setStatus(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-blue"
                    >
                        <option value="">All statuses</option>
                        {summary?.by_status.map(s => <option key={s.name} value={s.name}>{s.name} ({s.companies.toLocaleString()})</option>)}
                    </select>
                </div>

                {loading ? <LoadingSpinner /> : companies.length === 0 ? (
                    <p className="text-gray-500 text-sm py-8 text-center">No companies match.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-400 border-b border-dark-border">
                                <tr>
                                    <th className="py-2 pr-4 font-medium">Registered</th>
                                    <th className="py-2 pr-4 font-medium">Company</th>
                                    <th className="py-2 pr-4 font-medium">Industry</th>
                                    <th className="py-2 pr-4 font-medium">City</th>
                                    <th className="py-2 pr-4 font-medium">Directors</th>
                                    <th className="py-2 pr-4 font-medium text-right">Shareholders</th>
                                    <th className="py-2 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-border">
                                {companies.map(company => (
                                    <tr key={company.nzbn} onClick={() => setSelectedNzbn(company.nzbn)} className="cursor-pointer hover:bg-white/5 align-top">
                                        <td className="py-3 pr-4 whitespace-nowrap text-gray-400">{company.registration_date}</td>
                                        <td className="py-3 pr-4 min-w-[14rem]">
                                            <p className="font-medium text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-neon-blue shrink-0" />{company.entity_name}</p>
                                            <p className="text-xs text-gray-500 font-mono mt-0.5">{company.nzbn}</p>
                                            {company.trading_name && <p className="text-xs text-gray-400 mt-0.5">Trading as {company.trading_name}</p>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-300 max-w-[16rem]">{company.industry || <span className="text-gray-600">-</span>}</td>
                                        <td className="py-3 pr-4 text-gray-300 whitespace-nowrap">{company.city || <span className="text-gray-600">-</span>}</td>
                                        <td className="py-3 pr-4 text-gray-300 max-w-[16rem]">
                                            <p className="truncate" title={company.directors ?? ''}>{company.directors || <span className="text-gray-600">-</span>}</p>
                                            {company.director_count > 1 && <p className="text-xs text-gray-500">{company.director_count} directors</p>}
                                        </td>
                                        <td className="py-3 pr-4 text-right font-mono">{company.shareholder_count}</td>
                                        <td className="py-3"><StatusPill status={company.entity_status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-400">
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

            {selectedNzbn && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedNzbn(null)} />
                    <div className="relative w-full max-w-3xl h-full overflow-y-auto bg-dark-bg border-l border-dark-border shadow-2xl">
                        <button onClick={() => setSelectedNzbn(null)} className="absolute top-5 right-5 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5" aria-label="Close">
                            <X className="w-5 h-5" />
                        </button>
                        <CompanyDetail nzbn={selectedNzbn} />
                    </div>
                </div>
            )}
        </div>
    );
}
