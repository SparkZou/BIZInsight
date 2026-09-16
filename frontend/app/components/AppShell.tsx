import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { Briefcase, Database, Home, Map, Search, UserRound } from 'lucide-react';
import BrandMark from './BrandMark';
import SearchBar from './SearchBar';
import { SITE_NAME, SITE_TAGLINE, formatDate } from '../lib/site';

const NAV = [
    { to: '/', label: 'Overview', icon: Home, end: true },
    { to: '/search', label: 'Company Search', icon: Search, end: false },
    { to: '/industries', label: 'Industries', icon: Briefcase, end: false },
    { to: '/map', label: 'Map Explorer', icon: Map, end: false },
    { to: '/job-seekers', label: 'Job Seeker Insights', icon: UserRound, end: false },
    { to: '/data-sources', label: 'Data Sources', icon: Database, end: false },
];

const FOOTER_LINKS = [
    { to: '/industries', label: 'Industries' },
    { to: '/locations', label: 'Regions and cities' },
    { to: '/new-companies', label: 'New companies by month' },
    { to: '/insolvencies', label: 'Insolvencies by month' },
    { to: '/health-indicator', label: 'Company Health Indicator' },
    { to: '/data-sources', label: 'About the data' },
];

/** Top bar, side navigation and the content area every public page sits in. */
export default function AppShell({ children, asAt, importedAt }: { children: ReactNode; asAt?: string | null; importedAt?: string | null }) {
    return (
        <div className="min-h-screen bg-canvas text-ink">
            <header className="sticky top-0 z-40 h-16 bg-surface border-b border-line">
                <div className="h-full px-4 sm:px-6 flex items-center gap-4 lg:gap-8">
                    <Link to="/" className="flex items-center gap-3 shrink-0">
                        <BrandMark />
                        <span className="hidden sm:block">
                            <span className="block text-[15px] font-bold leading-tight">{SITE_NAME}</span>
                            <span className="block text-xs text-ink-muted leading-tight">{SITE_TAGLINE}</span>
                        </span>
                    </Link>
                    <div className="flex-1 max-w-2xl mx-auto"><SearchBar id="top-q" /></div>
                    <div className="hidden lg:flex items-center gap-6 text-xs shrink-0">
                        <div>
                            <p className="text-ink-muted flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Data updated</p>
                            <p className="font-medium text-ink">{asAt ? formatDate(asAt) : 'Monthly extract'}</p>
                        </div>
                        <div className="pl-6 border-l border-line">
                            <p className="text-ink-muted">Data sources</p>
                            <Link to="/data-sources" className="font-medium text-ink hover:text-brand-600">Companies Office · NZBN</Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                <aside className="hidden lg:flex w-60 shrink-0 flex-col sticky top-16 h-[calc(100vh-4rem)] bg-surface border-r border-line">
                    <nav className="p-3 space-y-1" aria-label="Main">
                        {NAV.map(item => (
                            <NavLink
                                key={item.to} to={item.to} end={item.end}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-brand-50 text-ink'
                                        : 'text-ink-2 hover:bg-canvas hover:text-ink'}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-brand-600' : 'text-ink-muted'}`} />
                                        {item.label}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="mt-auto relative overflow-hidden">
                        <svg viewBox="0 0 240 200" className="w-full block" aria-hidden="true">
                            <defs>
                                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#E8F1FB" /></linearGradient>
                                <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BFE7E1" /><stop offset="1" stopColor="#7FD1C6" /></linearGradient>
                            </defs>
                            <rect width="240" height="200" fill="url(#sky)" />
                            <path d="M0 120 L40 70 L70 100 L95 55 L130 105 L160 80 L200 110 L240 85 L240 200 L0 200 Z" fill="#C9DAF0" />
                            <path d="M0 140 L30 105 L60 130 L110 90 L150 125 L190 100 L240 130 L240 200 L0 200 Z" fill="#9DBDE6" />
                            <path d="M95 55 L88 70 L102 70 Z M110 90 L104 100 L117 100 Z" fill="#FFFFFF" opacity="0.9" />
                            <path d="M0 150 C 40 140, 80 160, 120 150 S 200 140, 240 152 L240 200 L0 200 Z" fill="url(#sea)" />
                        </svg>
                        <p className="absolute inset-x-0 bottom-0 px-4 pb-4 text-sm font-semibold text-ink leading-snug">
                            New Zealand companies.<br />Real opportunities.
                        </p>
                    </div>
                </aside>

                <div className="flex-1 min-w-0">
                    <nav className="lg:hidden flex gap-1 overflow-x-auto px-3 py-2 bg-surface border-b border-line" aria-label="Main">
                        {NAV.map(item => (
                            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${isActive ? 'bg-brand-50 text-ink' : 'text-ink-2'}`}>
                                <item.icon className="w-4 h-4 text-ink-muted" /> {item.label}
                            </NavLink>
                        ))}
                    </nav>
                    <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px]">{children}</main>
                    <footer className="px-4 sm:px-6 lg:px-8 pb-8 text-xs text-ink-faint space-y-2">
                        <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="More pages">
                            {FOOTER_LINKS.map(link => <Link key={link.to} to={link.to} className="hover:text-ink">{link.label}</Link>)}
                        </nav>
                        <p>
                            Data: New Zealand Companies Office and NZBN register bulk data{asAt ? `, as at ${formatDate(asAt)}` : ''}{importedAt ? ` (loaded ${formatDate(importedAt.slice(0, 10))})` : ''}.
                            {' '}{SITE_NAME} is not affiliated with the Companies Office.
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
