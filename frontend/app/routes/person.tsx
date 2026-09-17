import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Building2, Lock, PieChart, UserRound } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Card, KpiCard } from '../components/charts';
import HealthPill from '../components/HealthPill';
import StatusPill from '../components/StatusPill';
import { DIVISION_SHORT, apiTry, forwardCookie, type PersonDetail, type PersonRole, type SessionUser } from '../lib/api';
import { notFound } from '../lib/pages';
import { SITE_NAME, companyPath, formatDate, formatNumber, pageMeta } from '../lib/site';

export async function loader({ params, request }: LoaderFunctionArgs) {
    const slug = (params.slug || '').toLowerCase();
    if (!/^[a-z0-9-]{1,120}$/.test(slug)) throw notFound('Person not found');
    const me = await apiTry<{ user: SessionUser | null }>('/api/v1/auth/me', { headers: forwardCookie(request) });
    const user = me.data?.user ?? null;
    if (!user) return { slug, user, person: null, error: null };
    const result = await apiTry<PersonDetail>(`/api/v1/people/${slug}`, { headers: forwardCookie(request) });
    if (result.status === 404) throw notFound('Nobody with that name is on the register');
    return { slug, user, person: result.data, error: result.data ? null : result.detail || 'The page could not be loaded.' };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: data?.person ? `${data.person.name} - directorships and shareholdings | ${SITE_NAME}` : `Person on the register | ${SITE_NAME}`,
    description: 'Companies a person is recorded against on the New Zealand Companies Office register. Sign in required.',
    robots: 'noindex, nofollow',
});

function RoleRows({ roles, kind }: { roles: PersonRole[]; kind: 'director' | 'shareholder' }) {
    if (roles.length === 0) return <p className="text-sm text-ink-muted py-4 text-center">None recorded.</p>;
    return (
        <ul className="divide-y divide-line">
            {roles.map((role, index) => (
                <li key={`${role.nzbn}-${index}`} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <Link to={companyPath(role.nzbn, role.company)} className="font-medium text-ink hover:text-brand-600 block truncate">{role.company}</Link>
                        <p className="text-xs text-ink-muted truncate">
                            {[[role.city, role.region].filter(Boolean).join(', '), role.division ? (DIVISION_SHORT[role.division] ?? role.division) : null].filter(Boolean).join(' · ')}
                            {kind === 'director' && role.appointed && <> · appointed {formatDate(role.appointed)}</>}
                            {kind === 'director' && role.asic_company && <> · via {role.asic_company}</>}
                            {kind === 'shareholder' && role.shares && <> · {formatNumber(Number(role.shares))} shares{role.since ? ` since ${formatDate(role.since)}` : ''}</>}
                            {role.removed && <> · removed {formatDate(role.removed)}</>}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0"><HealthPill label={role.health_label} /><StatusPill status={role.status} /></div>
                </li>
            ))}
        </ul>
    );
}

export default function Person() {
    const { slug, user, person, error } = useLoaderData<typeof loader>();
    return (
        <AppShell>
            <nav className="text-xs text-ink-muted mb-3 flex items-center gap-1.5" aria-label="Breadcrumb">
                <Link to="/people" className="hover:text-ink">People</Link><span>/</span><span className="text-ink">{person?.name ?? slug}</span>
            </nav>
            {!user ? (
                <div className="card max-w-xl p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Lock className="w-5 h-5" /></div>
                        <div className="text-sm text-ink-2 space-y-3">
                            <p className="font-semibold text-ink text-base">Sign in to see this person's companies</p>
                            <p>Person pages list every company someone is recorded against on the register. They are available to signed-in users only, and each view is kept in your account history.</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Link to={`/account/login?next=${encodeURIComponent(`/people/${slug}`)}`} className="btn-primary">Sign in</Link>
                                <Link to={`/account/register?next=${encodeURIComponent(`/people/${slug}`)}`} className="btn-secondary">Create a free account</Link>
                            </div>
                        </div>
                    </div>
                </div>
            ) : error || !person ? (
                <div className="card max-w-xl p-5 text-sm text-ink-2">
                    <p>{error ?? 'The page could not be loaded.'}</p>
                    <Link to="/account" className="btn-secondary text-sm mt-3">Go to your account</Link>
                </div>
            ) : (
                <>
                    <div className="mb-5">
                        <h1 className="text-2xl font-bold flex items-center gap-2"><UserRound className="w-6 h-6 text-brand-600" /> {person.name}</h1>
                        <p className="text-ink-muted text-sm mt-1">{person.note}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <KpiCard icon={Building2} label="Directorships" value={formatNumber(person.summary.directorships)} caption="current appointments on the register" />
                        <KpiCard icon={PieChart} label="Shareholdings" value={formatNumber(person.summary.shareholdings)} caption="parcels held as an individual" tone="teal" />
                        <KpiCard icon={Building2} label="Active companies" value={formatNumber(person.summary.active_companies)} caption="not removed from the register" tone="purple" />
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                        <Card title="Director of" icon={Building2}>
                            <RoleRows roles={person.directorships} kind="director" />
                        </Card>
                        <Card title="Shareholder in" icon={PieChart}>
                            <RoleRows roles={person.shareholdings} kind="shareholder" />
                        </Card>
                    </div>
                    <p className="text-xs text-ink-faint mt-4">Names appear exactly as filed with the Companies Office. Something wrong, or details that should be suppressed? <Link to={`/data-sources?company=${encodeURIComponent(person.name)}`} className="text-brand-600 hover:underline">Tell us</Link>.</p>
                </>
            )}
        </AppShell>
    );
}
