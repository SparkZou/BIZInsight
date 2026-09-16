import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { MailX, Search, Trash2 } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ADMIN_API } from './api';

const API = `${ADMIN_API}/unsubscribes`;

const REASONS = [
    { value: 'unsubscribe', label: 'Unsubscribed' },
    { value: 'bounce', label: 'Bounced' },
    { value: 'complaint', label: 'Complained' },
    { value: 'manual', label: 'Do not contact' },
];

interface Suppression {
    email: string;
    reason: string;
    note: string | null;
    created_by: string;
    created_at: string;
    companies: number;
}

export default function UnsubscribesPage({ onSessionExpired }: { onSessionExpired: () => void }) {
    const [rows, setRows] = useState<Suppression[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [text, setText] = useState('');
    const [reason, setReason] = useState('unsubscribe');
    const [note, setNote] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`${API}?q=${encodeURIComponent(query)}`);
        if (res.status === 401) return onSessionExpired();
        if (res.ok) {
            const data = await res.json();
            setRows(data.suppressions);
            setTotal(data.total);
        }
        setLoading(false);
    }, [query, onSessionExpired]);

    useEffect(() => {
        load();
    }, [load]);

    const add = async (e: FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, reason, note: note || null }),
        });
        if (res.status === 401) return onSessionExpired();
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setError(typeof data.detail === 'string' ? data.detail : `Could not add (HTTP ${res.status})`);
            return;
        }
        setText('');
        setNote('');
        setMessage(
            `Added ${data.added.length} address${data.added.length === 1 ? '' : 'es'}`
            + (data.already_listed.length ? `, ${data.already_listed.length} already on the list` : '')
        );
        load();
    };

    const remove = async (email: string) => {
        setMessage('');
        setError('');
        const res = await fetch(`${API}/${encodeURIComponent(email)}`, { method: 'DELETE' });
        if (res.status === 401) return onSessionExpired();
        if (!res.ok) {
            setError(`Could not remove ${email}`);
            return;
        }
        setMessage(`${email} can be emailed again`);
        load();
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Unsubscribes</h1>
                <p className="text-gray-400">
                    Addresses that must never be emailed again. The block follows the address, so it covers every company
                    that lists it, in every month. These addresses are left out of the "has email" filter and of the email
                    column in the CSV export.
                </p>
            </div>

            <form onSubmit={add} className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={3}
                    placeholder="Paste one or more email addresses - or the whole unsubscribe email; every address in it is added."
                    className="w-full px-4 py-3 bg-dark-bg/50 border border-dark-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-blue"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-blue"
                    >
                        {REASONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Note (optional), e.g. replied asking to unsubscribe"
                        className="flex-1 px-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-blue"
                    />
                    <button
                        type="submit" disabled={!text.trim()}
                        className="flex items-center justify-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-500/10 text-red-300 border border-red-500/40 hover:bg-red-500/20 disabled:opacity-40"
                    >
                        <MailX className="w-4 h-4" /> Add to unsubscribes
                    </button>
                </div>
                {message && <p className="text-sm text-neon-green">{message}</p>}
                {error && <p className="text-sm text-red-300">{error}</p>}
            </form>

            <section className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="font-semibold">{total.toLocaleString()} address{total === 1 ? '' : 'es'} on the list</h2>
                    <form
                        onSubmit={e => { e.preventDefault(); setQuery(search.trim()); }}
                        className="relative w-full sm:w-72"
                    >
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Find an address"
                            className="w-full pl-9 pr-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-neon-blue"
                        />
                    </form>
                </div>

                {loading ? <LoadingSpinner /> : rows.length === 0 ? (
                    <p className="text-gray-500 text-sm py-8 text-center">
                        {query ? 'No address matches.' : 'Nobody has unsubscribed yet.'}
                    </p>
                ) : (
                    <>
                        <ul className="md:hidden divide-y divide-dark-border">
                            {rows.map(row => (
                                <li key={row.email} className="py-4 space-y-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="font-medium text-white break-all">{row.email}</p>
                                        <button onClick={() => remove(row.email)} className="text-gray-500 hover:text-red-300 shrink-0" aria-label={`Remove ${row.email}`}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        {REASONS.find(r => r.value === row.reason)?.label ?? row.reason} · {row.companies} compan{row.companies === 1 ? 'y' : 'ies'}
                                    </p>
                                    {row.note && <p className="text-sm text-gray-400">{row.note}</p>}
                                    <p className="text-xs text-gray-500">{new Date(row.created_at).toLocaleString()} · {row.created_by}</p>
                                </li>
                            ))}
                        </ul>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-gray-400 border-b border-dark-border">
                                    <tr>
                                        <th className="py-2 pr-4 font-medium">Email</th>
                                        <th className="py-2 pr-4 font-medium">Reason</th>
                                        <th className="py-2 pr-4 font-medium text-right">Companies</th>
                                        <th className="py-2 pr-4 font-medium">Note</th>
                                        <th className="py-2 pr-4 font-medium">Added</th>
                                        <th className="py-2 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-border align-top">
                                    {rows.map(row => (
                                        <tr key={row.email}>
                                            <td className="py-3 pr-4 text-white break-all">{row.email}</td>
                                            <td className="py-3 pr-4 text-gray-300 whitespace-nowrap">{REASONS.find(r => r.value === row.reason)?.label ?? row.reason}</td>
                                            <td className="py-3 pr-4 text-right font-mono text-gray-300">{row.companies}</td>
                                            <td className="py-3 pr-4 text-gray-400 max-w-[20rem]"><p className="truncate" title={row.note ?? ''}>{row.note || '-'}</p></td>
                                            <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">
                                                {new Date(row.created_at).toLocaleDateString()} · {row.created_by}
                                            </td>
                                            <td className="py-3 text-right">
                                                <button onClick={() => remove(row.email)} className="text-gray-500 hover:text-red-300" aria-label={`Remove ${row.email}`}>
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
