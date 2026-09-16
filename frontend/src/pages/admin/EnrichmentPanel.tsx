import { useCallback, useEffect, useRef, useState } from 'react';
import { Contact, Loader2, Play, Square } from 'lucide-react';
import { ADMIN_API } from './api';

const API = `${ADMIN_API}/enrichment`;

interface Job {
    id: number;
    status: 'queued' | 'running' | 'succeeded' | 'stopped' | 'failed';
    total: number;
    done: number;
    found: number;
    failed: number;
    error: string | null;
    log: string;
    started_at: string | null;
    finished_at: string | null;
}

interface Status {
    month: string;
    coverage: { companies: number; fetched: number; unreadable: number; with_phone: number; with_email: number; with_website: number };
    busy: boolean;
    delay_seconds: number;
    jobs: Job[];
}

const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

/** Fetches NZBN contact details (phones, emails, websites) for a month's new companies. */
export default function EnrichmentPanel({ month, monthName, onSessionExpired, onFinished, onFilter }: {
    month: string;
    monthName: string;
    onSessionExpired: () => void;
    onFinished: () => void;
    /** Show only the companies with this kind of contact detail in the list below. */
    onFilter: (contact: 'phone' | 'email' | 'website') => void;
}) {
    const [status, setStatus] = useState<Status | null>(null);
    const [message, setMessage] = useState('');
    const [showLog, setShowLog] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch(`${API}/status?month=${month}`);
        if (res.status === 401) return onSessionExpired();
        if (res.ok) setStatus(await res.json());
    }, [month, onSessionExpired]);

    useEffect(() => {
        setStatus(null);
        load();
    }, [load]);

    const job = status?.jobs[0];
    const running = job && (job.status === 'queued' || job.status === 'running');

    // Poll while running, and refresh the company list once the job ends.
    const wasRunning = useRef(false);
    useEffect(() => {
        if (running) {
            wasRunning.current = true;
            const timer = setInterval(load, 5000);
            return () => clearInterval(timer);
        }
        if (wasRunning.current) {
            wasRunning.current = false;
            onFinished();
        }
    }, [running, load, onFinished]);

    const post = async (url: string, body?: object) => {
        setMessage('');
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (res.status === 401) return onSessionExpired();
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setMessage(typeof data.detail === 'string' ? data.detail : `Request failed (HTTP ${res.status})`);
        }
        load();
    };

    if (!status) return null;
    const { coverage } = status;
    const remaining = coverage.companies - coverage.fetched;
    const progress = job && job.total ? Math.round((job.done / job.total) * 100) : 0;
    const secondsLeft = job ? (job.total - job.done) * status.delay_seconds * 1.3 : 0;
    const tiles: Array<{ label: string; value: string; contact?: 'phone' | 'email' | 'website' }> = [
        { label: 'Fetched', value: `${coverage.fetched.toLocaleString()} / ${coverage.companies.toLocaleString()}` },
        { label: 'With phone', value: coverage.with_phone.toLocaleString(), contact: 'phone' },
        { label: 'With email', value: coverage.with_email.toLocaleString(), contact: 'email' },
        { label: 'With website', value: coverage.with_website.toLocaleString(), contact: 'website' },
    ];

    return (
        <section className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h2 className="font-semibold flex items-center gap-2"><Contact className="w-4 h-4 text-neon-green" /> Contact details (NZBN)</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Phone numbers, emails and websites the companies published on the NZBN register, read one company about every {status.delay_seconds}s
                        from the Companies Office website until the NZBN API subscription is approved.
                    </p>
                </div>
                {running ? (
                    <button onClick={() => job && post(`${API}/jobs/${job.id}/stop`)} className="flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-500/10 text-red-300 border border-red-500/40 hover:bg-red-500/20">
                        <Square className="w-4 h-4" /> Stop
                    </button>
                ) : (
                    <button
                        onClick={() => post(`${API}/jobs`, { month })}
                        disabled={remaining === 0 || status.busy}
                        className="flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-semibold bg-neon-green/10 text-neon-green border border-neon-green/40 hover:bg-neon-green/20 disabled:opacity-40"
                    >
                        <Play className="w-4 h-4" />
                        {remaining === 0 ? 'All fetched' : `Fetch ${remaining.toLocaleString()} for ${monthName}`}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {tiles.map(tile => (
                    <button
                        key={tile.label}
                        onClick={() => tile.contact && onFilter(tile.contact)}
                        disabled={!tile.contact}
                        className={`text-left rounded-xl border border-dark-border px-4 py-3 ${tile.contact ? 'hover:border-neon-green/50 hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
                        title={tile.contact ? 'Show these companies in the list below' : undefined}
                    >
                        <p className="text-xs text-gray-500">{tile.label}</p>
                        <p className="font-mono text-white text-lg">{tile.value}</p>
                    </button>
                ))}
            </div>

            {job && (
                <div className="space-y-2">
                    {running && (
                        <>
                            <div className="h-2 bg-dark-border rounded-full overflow-hidden">
                                <div className="h-full bg-neon-green transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-sm text-gray-400 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {job.status === 'queued' ? 'Starting...' : `${job.done.toLocaleString()} of ${job.total.toLocaleString()} companies - ${job.found.toLocaleString()} with contact details - about ${formatDuration(secondsLeft)} left`}
                            </p>
                        </>
                    )}
                    {!running && (
                        <p className={`text-sm ${job.status === 'failed' ? 'text-red-300' : 'text-gray-400'}`}>
                            Last run: {job.status} - {job.done.toLocaleString()} of {job.total.toLocaleString()} companies
                            {job.finished_at && `, finished ${new Date(job.finished_at).toLocaleString()}`}
                            {job.error && ` - ${job.error}`}
                        </p>
                    )}
                    {job.log && (
                        <button onClick={() => setShowLog(!showLog)} className="text-xs text-neon-blue hover:underline">
                            {showLog ? 'Hide log' : 'Show log'}
                        </button>
                    )}
                    {showLog && (
                        <pre className="bg-black/50 border border-dark-border rounded-xl p-3 text-xs font-mono text-gray-300 max-h-64 overflow-auto whitespace-pre-wrap">{job.log}</pre>
                    )}
                </div>
            )}

            {message && <p className="text-sm text-red-300">{message}</p>}
        </section>
    );
}
