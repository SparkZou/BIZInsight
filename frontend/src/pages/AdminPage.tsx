import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent, FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertTriangle, CheckCircle, Database, FileText, Loader2, Lock, LogOut, UploadCloud, X, XCircle
} from 'lucide-react';
import BizInsightLogo from '../components/BizInsightLogo';
import LoadingSpinner from '../components/LoadingSpinner';

const API = '/api/v1/admin';

interface ImportJob {
    id: number;
    status: 'queued' | 'running' | 'succeeded' | 'failed';
    created_by: string;
    source_files: string;
    files_total: number;
    files_done: number;
    rows_imported: number;
    error: string | null;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
    log?: string;
}

interface Dataset {
    tableName: string;
    name: string;
    count: number;
}

const formatBytes = (bytes: number) =>
    bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
        : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB`
            : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const formatTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '-');

function Shell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
    return (
        <div className="min-h-screen bg-dark-bg text-white">
            <header className="glass-panel border-b border-dark-border/50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <BizInsightLogo className="w-7 h-7" />
                        <span className="font-bold text-lg">Biz<span className="text-neon-blue">Insight</span></span>
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded bg-neon-purple/10 text-neon-purple border border-neon-purple/30">Admin</span>
                    </Link>
                    {actions}
                </div>
            </header>
            <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
        </div>
    );
}

export default function AdminPage() {
    // undefined while checking the session, null when logged out
    const [username, setUsername] = useState<string | null | undefined>(undefined);

    useEffect(() => {
        fetch(`${API}/session`)
            .then(res => (res.ok ? res.json() : null))
            .then(data => setUsername(data?.username ?? null))
            .catch(() => setUsername(null));
    }, []);

    const logout = useCallback(async () => {
        await fetch(`${API}/logout`, { method: 'POST' }).catch(() => undefined);
        setUsername(null);
    }, []);

    if (username === undefined) {
        return <Shell><LoadingSpinner /></Shell>;
    }
    if (!username) {
        return <Shell><LoginForm onLogin={setUsername} /></Shell>;
    }
    return (
        <Shell actions={
            <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
                <LogOut className="w-4 h-4" /> {username}
            </button>
        }>
            <ImportDashboard onSessionExpired={() => setUsername(null)} />
        </Shell>
    );
}

function LoginForm({ onLogin }: { onLogin: (username: string) => void }) {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`${API}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                onLogin(data.username);
            } else {
                setError(typeof data.detail === 'string' ? data.detail : 'Login failed');
            }
        } catch {
            setError('Could not reach the server');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={submit} className="glass-panel max-w-sm mx-auto mt-16 p-8 rounded-2xl space-y-5">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20"><Lock className="w-5 h-5 text-neon-blue" /></div>
                <h1 className="text-xl font-bold">Admin login</h1>
            </div>
            <input
                className="w-full px-4 py-3 bg-dark-bg/50 border border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-neon-blue"
                placeholder="Username" autoComplete="username" required
                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
            />
            <input
                type="password"
                className="w-full px-4 py-3 bg-dark-bg/50 border border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-neon-blue"
                placeholder="Password" autoComplete="current-password" required
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
                type="submit" disabled={submitting}
                className="w-full py-3 rounded-lg font-semibold bg-neon-blue/10 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue hover:text-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Log in
            </button>
        </form>
    );
}

function StatusBadge({ status }: { status: ImportJob['status'] }) {
    const styles = {
        queued: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
        running: 'bg-neon-blue/10 text-neon-blue border-neon-blue/30',
        succeeded: 'bg-green-500/10 text-green-400 border-green-500/30',
        failed: 'bg-red-500/10 text-red-400 border-red-500/30',
    }[status];
    const Icon = { queued: Loader2, running: Loader2, succeeded: CheckCircle, failed: XCircle }[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
            <Icon className={`w-3 h-3 ${status === 'running' || status === 'queued' ? 'animate-spin' : ''}`} /> {status}
        </span>
    );
}

function ImportDashboard({ onSessionExpired }: { onSessionExpired: () => void }) {
    const [jobs, setJobs] = useState<ImportJob[]>([]);
    const [busy, setBusy] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [selectedJob, setSelectedJob] = useState<ImportJob | null>(null);
    const [datasets, setDatasets] = useState<Dataset[]>([]);

    const [files, setFiles] = useState<File[]>([]);
    const [allowRowDrop, setAllowRowDrop] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [problems, setProblems] = useState<string[]>([]);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const loadJobs = useCallback(async () => {
        const res = await fetch(`${API}/imports`);
        if (res.status === 401) return onSessionExpired();
        if (!res.ok) return;
        const data = await res.json();
        setJobs(data.jobs);
        setBusy(data.busy);
    }, [onSessionExpired]);

    const loadDatasets = useCallback(async () => {
        const res = await fetch('/api/stats/datasets');
        if (res.ok) setDatasets((await res.json()).datasets);
    }, []);

    useEffect(() => {
        loadJobs();
        loadDatasets();
    }, [loadJobs, loadDatasets]);

    // Poll while an import runs; refresh the row counts once it has finished.
    const wasBusy = useRef(false);
    useEffect(() => {
        if (busy) {
            wasBusy.current = true;
            const timer = setInterval(loadJobs, 3000);
            return () => clearInterval(timer);
        }
        if (wasBusy.current) {
            wasBusy.current = false;
            loadDatasets();
        }
    }, [busy, loadJobs, loadDatasets]);

    // Keep the open log in step with the job list.
    useEffect(() => {
        if (selectedJobId === null) return;
        fetch(`${API}/imports/${selectedJobId}`)
            .then(res => (res.ok ? res.json() : null))
            .then(job => job && setSelectedJob(job))
            .catch(() => undefined);
    }, [jobs, selectedJobId]);

    const addFiles = (list: FileList | null) => {
        if (!list) return;
        const added = Array.from(list);
        setFiles(prev => [...prev.filter(f => !added.some(a => a.name === f.name)), ...added]);
        setProblems([]);
        setMessage('');
    };

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
    };

    const upload = () => {
        const body = new FormData();
        files.forEach(file => body.append('files', file));
        body.append('allow_row_drop', String(allowRowDrop));

        // XMLHttpRequest rather than fetch, for upload progress.
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API}/imports`);
        xhr.upload.onprogress = e => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
            setUploadProgress(null);
            let data: { id?: number; detail?: string | { message: string; problems: string[] } } = {};
            try {
                data = JSON.parse(xhr.responseText);
            } catch {
                // e.g. an HTML error page from the proxy
            }
            if (xhr.status === 202 && data.id !== undefined) {
                setFiles([]);
                setAllowRowDrop(false);
                setMessage(`Import #${data.id} started. The site keeps serving the current data until each table is replaced.`);
                setSelectedJobId(data.id);
                loadJobs();
            } else if (xhr.status === 401) {
                onSessionExpired();
            } else if (typeof data.detail === 'object') {
                setMessage(data.detail.message);
                setProblems(data.detail.problems);
            } else {
                setMessage(data.detail || (xhr.status === 413 ? 'The upload is too large.' : `Upload failed (HTTP ${xhr.status}).`));
            }
        };
        xhr.onerror = () => {
            setUploadProgress(null);
            setMessage('Upload failed: the connection was lost.');
        };

        setMessage('');
        setProblems([]);
        setUploadProgress(0);
        xhr.send(body);
    };

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const uploading = uploadProgress !== null;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Bulk data import</h1>
                <p className="text-gray-400">
                    Upload the monthly Companies Office bulk data: the original <span className="text-white">.zip</span> (recommended)
                    or its <span className="text-white">.csv</span> files. Don't open and re-save the files in Excel - it cuts the
                    1.8 million-row companies file short.
                </p>
            </div>

            {/* Upload */}
            <section className="glass-panel p-6 rounded-2xl space-y-4">
                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`cursor-pointer border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragging ? 'border-neon-blue bg-neon-blue/5' : 'border-dark-border hover:border-neon-blue/50'}`}
                >
                    <UploadCloud className="w-10 h-10 mx-auto text-neon-blue mb-3" />
                    <p className="font-medium">Drop the zip or CSV files here, or click to choose</p>
                    <p className="text-sm text-gray-500 mt-1">Only the files you upload are replaced; other datasets stay as they are.</p>
                    <input
                        ref={inputRef} type="file" multiple accept=".zip,.csv" className="hidden"
                        onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
                    />
                </div>

                {files.length > 0 && (
                    <ul className="divide-y divide-dark-border border border-dark-border rounded-xl">
                        {files.map(file => (
                            <li key={file.name} className="flex items-center justify-between px-4 py-2 text-sm">
                                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" />{file.name}</span>
                                <span className="flex items-center gap-4 text-gray-400">
                                    {formatBytes(file.size)}
                                    {!uploading && (
                                        <button onClick={() => setFiles(files.filter(f => f !== file))} className="hover:text-white" aria-label={`Remove ${file.name}`}>
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                <label className="flex items-start gap-2 text-sm text-gray-400">
                    <input type="checkbox" className="mt-1" checked={allowRowDrop} onChange={e => setAllowRowDrop(e.target.checked)} />
                    <span>Allow big row-count drops (more than 20% fewer rows than the live table - e.g. when Companies Office splits a dataset)</span>
                </label>

                {uploading && (
                    <div>
                        <div className="h-2 bg-dark-border rounded-full overflow-hidden">
                            <div className="h-full bg-neon-blue transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                            {uploadProgress === 100 ? 'Checking files on the server...' : `Uploading ${uploadProgress}%`}
                        </p>
                    </div>
                )}

                {message && (
                    <div className={`p-4 rounded-lg border text-sm ${problems.length ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-neon-blue/5 border-neon-blue/20 text-gray-200'}`}>
                        <p className="flex items-center gap-2 font-medium">
                            {problems.length > 0 && <AlertTriangle className="w-4 h-4" />}{message}
                        </p>
                        {problems.length > 0 && (
                            <ul className="list-disc ml-6 mt-2 space-y-1">
                                {problems.map(problem => <li key={problem}>{problem}</li>)}
                            </ul>
                        )}
                    </div>
                )}

                <button
                    onClick={upload}
                    disabled={files.length === 0 || uploading || busy}
                    className="px-6 py-3 rounded-lg font-semibold bg-neon-blue/10 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue hover:text-black transition-all disabled:opacity-40 disabled:hover:bg-neon-blue/10 disabled:hover:text-neon-blue flex items-center gap-2"
                >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    {busy ? 'An import is running...' : `Upload and import${files.length ? ` (${formatBytes(totalSize)})` : ''}`}
                </button>
            </section>

            {/* Import history */}
            <section className="glass-panel p-6 rounded-2xl">
                <h2 className="text-lg font-semibold mb-4">Imports</h2>
                {jobs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No imports yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-400">
                                <tr>
                                    <th className="py-2 pr-4">#</th>
                                    <th className="py-2 pr-4">Status</th>
                                    <th className="py-2 pr-4">Files</th>
                                    <th className="py-2 pr-4 text-right">Progress</th>
                                    <th className="py-2 pr-4 text-right">Rows</th>
                                    <th className="py-2 pr-4">Started</th>
                                    <th className="py-2">Finished</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-border">
                                {jobs.map(job => (
                                    <tr
                                        key={job.id}
                                        onClick={() => setSelectedJobId(job.id)}
                                        className={`cursor-pointer hover:bg-white/5 ${selectedJobId === job.id ? 'bg-white/5' : ''}`}
                                    >
                                        <td className="py-2 pr-4 font-mono">{job.id}</td>
                                        <td className="py-2 pr-4"><StatusBadge status={job.status} /></td>
                                        <td className="py-2 pr-4 max-w-xs truncate" title={job.source_files}>{job.source_files}</td>
                                        <td className="py-2 pr-4 text-right font-mono">{job.files_done}/{job.files_total}</td>
                                        <td className="py-2 pr-4 text-right font-mono">{job.rows_imported.toLocaleString()}</td>
                                        <td className="py-2 pr-4 text-gray-400">{formatTime(job.started_at)}</td>
                                        <td className="py-2 text-gray-400">{formatTime(job.finished_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedJob && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Import #{selectedJob.id} log</h3>
                            <button onClick={() => { setSelectedJobId(null); setSelectedJob(null); }} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        {selectedJob.error && <p className="text-sm text-red-400 mb-2">{selectedJob.error}</p>}
                        <pre className="bg-black/50 border border-dark-border rounded-xl p-4 text-xs font-mono text-gray-300 max-h-96 overflow-auto whitespace-pre-wrap">
                            {selectedJob.log || 'Waiting to start...'}
                        </pre>
                    </div>
                )}
            </section>

            {/* Live data */}
            <section className="glass-panel p-6 rounded-2xl">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Database className="w-5 h-5 text-neon-purple" /> Live datasets</h2>
                <div className="grid sm:grid-cols-2 gap-x-8">
                    {datasets.map(dataset => (
                        <div key={dataset.tableName} className="flex justify-between py-2 border-b border-dark-border text-sm">
                            <span className="text-gray-300">{dataset.name}</span>
                            <span className="font-mono text-neon-blue">{dataset.count.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
