import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { Building2, Loader2, Lock, LogOut, MailX, Search, UploadCloud } from 'lucide-react';
import BizInsightLogo from '../../components/BizInsightLogo';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ADMIN_API } from './api';
import CompanySearchPage from './CompanySearchPage';
import ImportPage from './ImportPage';
import NewCompaniesPage from './NewCompaniesPage';
import UnsubscribesPage from './UnsubscribesPage';

const NAV_ITEMS = [
    { to: '/admin', label: 'Data import', icon: UploadCloud, end: true },
    { to: '/admin/new-companies', label: 'New companies', icon: Building2, end: false },
    { to: '/admin/search', label: 'Company search', icon: Search, end: false },
    { to: '/admin/unsubscribes', label: 'Unsubscribes', icon: MailX, end: false },
];

// The admin pages are data-heavy, so they use the full window width on desktop screens and only
// stop growing on very wide monitors, where lines would get too long to read.
const PAGE_WIDTH = 'max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-10';

function Header({ actions }: { actions?: ReactNode }) {
    return (
        <header className="glass-panel border-b border-dark-border/50">
            <div className={`${PAGE_WIDTH} h-16 flex items-center justify-between gap-3`}>
                <Link to="/" className="flex items-center gap-2 min-w-0">
                    <BizInsightLogo className="w-7 h-7 shrink-0" />
                    <span className="font-bold text-lg truncate">Biz<span className="text-neon-blue">Insight</span></span>
                    <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded bg-neon-purple/10 text-neon-purple border border-neon-purple/30">Admin</span>
                </Link>
                {actions}
            </div>
        </header>
    );
}

export default function AdminPage() {
    // undefined while checking the session, null when logged out
    const [username, setUsername] = useState<string | null | undefined>(undefined);

    useEffect(() => {
        fetch(`${ADMIN_API}/session`)
            .then(res => (res.ok ? res.json() : null))
            .then(data => setUsername(data?.username ?? null))
            .catch(() => setUsername(null));
    }, []);

    const sessionExpired = useCallback(() => setUsername(null), []);

    const logout = useCallback(async () => {
        await fetch(`${ADMIN_API}/logout`, { method: 'POST' }).catch(() => undefined);
        setUsername(null);
    }, []);

    if (username === undefined) {
        return <div className="min-h-screen bg-dark-bg text-white"><Header /><LoadingSpinner /></div>;
    }
    if (!username) {
        return <div className="min-h-screen bg-dark-bg text-white"><Header /><LoginForm onLogin={setUsername} /></div>;
    }

    return (
        <div className="min-h-screen bg-dark-bg text-white">
            <Header actions={
                <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white shrink-0">
                    <LogOut className="w-4 h-4" /> {username}
                </button>
            } />
            <div className={`${PAGE_WIDTH} py-6 lg:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8`}>
                <aside className="lg:w-60 shrink-0">
                    <nav className="glass-panel rounded-2xl p-2 flex lg:flex-col gap-1 lg:sticky lg:top-8 overflow-x-auto">
                        {NAV_ITEMS.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border whitespace-nowrap transition-colors ${isActive
                                        ? 'bg-neon-blue/10 text-neon-blue border-neon-blue/30'
                                        : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'}`
                                }
                            >
                                <item.icon className="w-4 h-4" /> {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                {/* min-w-0 keeps wide tables inside their own scroll area instead of stretching the page */}
                <main className="flex-1 min-w-0">
                    <Routes>
                        <Route index element={<ImportPage onSessionExpired={sessionExpired} />} />
                        <Route path="new-companies" element={<NewCompaniesPage onSessionExpired={sessionExpired} />} />
                        <Route path="search" element={<CompanySearchPage onSessionExpired={sessionExpired} />} />
                        <Route path="unsubscribes" element={<UnsubscribesPage onSessionExpired={sessionExpired} />} />
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
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
            const res = await fetch(`${ADMIN_API}/login`, {
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
        <form onSubmit={submit} className="glass-panel max-w-sm mx-4 sm:mx-auto mt-16 p-8 rounded-2xl space-y-5">
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
