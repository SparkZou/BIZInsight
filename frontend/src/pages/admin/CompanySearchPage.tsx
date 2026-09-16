import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { ADMIN_API } from './api';
import { StatusPill } from './CompanyDetail';
import CompanyDrawer from './CompanyDrawer';

const PAGE_SIZE = 50;

interface SearchResult {
    nzbn: string;
    register: string;
    number: string | null;
    entity_name: string;
    entity_type: string | null;
    entity_status: string | null;
    registration_date: string | null;
    matched_on: string;
}

export default function CompanySearchPage({ onSessionExpired }: { onSessionExpired: () => void }) {
    const [input, setInput] = useState('');
    const [query, setQuery] = useState('');
    const [includePeople, setIncludePeople] = useState(true);
    const [page, setPage] = useState(1);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedNzbn, setSelectedNzbn] = useState<string | null>(null);

    useEffect(() => {
        if (query.length < 2) return;
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ q: query, people: String(includePeople), page: String(page), page_size: String(PAGE_SIZE) });
        fetch(`${ADMIN_API}/search?${params}`)
            .then(async res => {
                if (res.status === 401) {
                    onSessionExpired();
                    return null;
                }
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Search failed (HTTP ${res.status})`);
                return data;
            })
            .then(data => {
                if (!data) return;
                setResults(data.results);
                setTotal(data.total);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [query, includePeople, page, onSessionExpired]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setQuery(input.trim());
        setPage(1);
    };

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Company search</h1>
                <p className="text-gray-400">
                    Search every register in the bulk data - companies, incorporated societies and limited partnerships,
                    charitable trust boards, sole traders and trusts, and public sector entities - by name, NZBN or company number,
                    and find companies by the name of a director or shareholder.
                </p>
            </div>

            <form onSubmit={submit} className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            autoFocus
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="e.g. AICLOUD LIMITED, 9429050877966, 9268180 or John Smith"
                            className="w-full pl-12 pr-4 py-3 bg-dark-bg/50 border border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-neon-blue"
                        />
                    </div>
                    <button
                        type="submit" disabled={input.trim().length < 2}
                        className="px-6 py-3 rounded-lg font-semibold bg-neon-blue/10 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue hover:text-black transition-all disabled:opacity-40 disabled:hover:bg-neon-blue/10 disabled:hover:text-neon-blue"
                    >
                        Search
                    </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" checked={includePeople} onChange={e => { setIncludePeople(e.target.checked); setPage(1); }} />
                    Also find companies by director and shareholder names
                </label>
            </form>

            {error && <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm">{error}</div>}

            {query && (
                <section className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-2">
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Searching...' : `${total.toLocaleString()} ${total === 1 ? 'match' : 'matches'} for "${query}"`}
                        </span>
                        {total > PAGE_SIZE && <span className="whitespace-nowrap">Page {page} of {pageCount}</span>}
                    </div>

                    {!loading && results.length === 0 ? (
                        <p className="text-gray-500 text-sm py-8 text-center">Nothing found. Try part of the name, or the NZBN or company number.</p>
                    ) : (
                        <div className={loading ? 'opacity-50' : ''}>
                            {/* Phones and narrow windows: one card per result. */}
                            <ul className="md:hidden divide-y divide-dark-border">
                                {results.map(result => (
                                    <li key={result.nzbn}>
                                        <button onClick={() => setSelectedNzbn(result.nzbn)} className="w-full text-left py-4 space-y-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="font-medium text-white">{result.entity_name || 'Unnamed'}</p>
                                                <StatusPill status={result.entity_status} />
                                            </div>
                                            <p className="text-xs text-gray-500 font-mono">
                                                NZBN {result.nzbn}{result.number && ` · No. ${result.number}`}
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                {result.register}{result.registration_date && ` · registered ${result.registration_date}`}
                                            </p>
                                            <p className="text-sm text-gray-400">{result.matched_on}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-400 border-b border-dark-border">
                                        <tr>
                                            <th className="py-2 pr-4 font-medium">Name</th>
                                            <th className="py-2 pr-4 font-medium">Register</th>
                                            <th className="py-2 pr-4 font-medium">Status</th>
                                            <th className="py-2 pr-4 font-medium hidden lg:table-cell">Registered</th>
                                            <th className="py-2 font-medium">Matched on</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dark-border align-top">
                                        {results.map(result => (
                                            <tr key={result.nzbn} onClick={() => setSelectedNzbn(result.nzbn)} className="cursor-pointer hover:bg-white/5">
                                                <td className="py-3 pr-4 max-w-[20rem]">
                                                    <p className="font-medium text-white truncate" title={result.entity_name}>{result.entity_name || 'Unnamed'}</p>
                                                    <p className="text-xs text-gray-500 font-mono">
                                                        NZBN {result.nzbn}{result.number && ` · No. ${result.number}`}
                                                    </p>
                                                </td>
                                                <td className="py-3 pr-4 text-gray-300 max-w-[14rem]">
                                                    <p className="truncate" title={result.register}>{result.register}</p>
                                                    {result.entity_type && <p className="text-xs text-gray-500 truncate">{result.entity_type}</p>}
                                                </td>
                                                <td className="py-3 pr-4"><StatusPill status={result.entity_status} /></td>
                                                <td className="py-3 pr-4 text-gray-400 whitespace-nowrap hidden lg:table-cell">{result.registration_date || '-'}</td>
                                                <td className="py-3 text-gray-400 max-w-[24rem]">
                                                    <p className="truncate" title={result.matched_on}>{result.matched_on}</p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {total > PAGE_SIZE && (
                        <div className="flex justify-end items-center gap-2 text-sm text-gray-400">
                            <button onClick={() => setPage(p => p - 1)} disabled={page <= 1 || loading} className="p-2 rounded-lg border border-dark-border hover:bg-white/5 disabled:opacity-30" aria-label="Previous page">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => setPage(p => p + 1)} disabled={page >= pageCount || loading} className="p-2 rounded-lg border border-dark-border hover:bg-white/5 disabled:opacity-30" aria-label="Next page">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </section>
            )}

            {selectedNzbn && <CompanyDrawer nzbn={selectedNzbn} onClose={() => setSelectedNzbn(null)} />}
        </div>
    );
}
