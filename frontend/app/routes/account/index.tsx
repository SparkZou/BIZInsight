import { useState } from 'react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, redirect, useLoaderData, useNavigate, useRevalidator, useSearchParams } from 'react-router';
import { Building2, CheckCircle, History, LogOut, MailCheck, Search, Trash2, UserRound, Users } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { Card } from '../../components/charts';
import { apiTry, forwardCookie, postJson, type SessionUser, type ViewEntry } from '../../lib/api';
import { SITE_NAME, companyPath, formatDate, formatNumber, pageMeta } from '../../lib/site';

export async function loader({ request }: LoaderFunctionArgs) {
    const me = await apiTry<{ user: SessionUser | null }>('/api/v1/auth/me', { headers: forwardCookie(request) });
    if (!me.data?.user) throw redirect('/account/login?next=/account');
    const views = await apiTry<{ total: number; retention_days: number; views: ViewEntry[] }>('/api/v1/auth/me/views?limit=200', { headers: forwardCookie(request) });
    return { user: me.data.user, history: views.data ?? { total: 0, retention_days: 365, views: [] } };
}

export const meta: MetaFunction = () => pageMeta({ title: `Your account | ${SITE_NAME}`, description: '', robots: 'noindex, nofollow' });

const KIND_LABEL: Record<ViewEntry['kind'], string> = { profile: 'Company', person: 'Person', person_search: 'Name search' };

export default function Account() {
    const { user, history } = useLoaderData<typeof loader>();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState('');

    const act = async (name: string, path: string, method: string, then?: () => void) => {
        setBusy(name);
        setMessage('');
        const result = await postJson(path, undefined, method);
        setBusy('');
        if (!result.ok) return setMessage(result.detail || 'That did not work. Please try again.');
        then?.();
    };

    return (
        <AppShell>
            <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><UserRound className="w-6 h-6 text-brand-600" /> Your account</h1>
                    <p className="text-ink-muted text-sm mt-1">{user.email}{user.name ? ` · ${user.name}` : ''} · joined {formatDate(user.created_at.slice(0, 10))}</p>
                </div>
                <button onClick={() => act('logout', '/api/v1/auth/logout', 'POST', () => { revalidator.revalidate(); navigate('/'); })} className="btn-secondary text-sm" disabled={busy === 'logout'}><LogOut className="w-4 h-4" /> Sign out</button>
            </div>

            {params.get('welcome') && (
                <p className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4"><CheckCircle className="w-4 h-4 mt-0.5" /> Your account is ready.{user.email_configured && !user.verified ? ' We have sent a link to confirm your email address; person pages open once it is confirmed.' : ''}</p>
            )}
            {message && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mb-4">{message}</p>}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-4 items-start">
                <div className="space-y-4">
                    <Card title="Email address" icon={MailCheck}>
                        {user.verified ? (
                            <p className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Confirmed.</p>
                        ) : user.email_configured ? (
                            <div className="text-sm text-ink-2 space-y-3">
                                <p>Not confirmed yet. Open the link we emailed you; searching people by name needs a confirmed address.</p>
                                <button onClick={() => act('resend', '/api/v1/auth/resend-verification', 'POST', () => setMessage('A new link is on its way - check your inbox and spam folder.'))} className="btn-secondary text-sm" disabled={busy === 'resend'}>Send the link again</button>
                            </div>
                        ) : (
                            <p className="text-sm text-ink-2">Email confirmation is not switched on yet, so your account works without it.</p>
                        )}
                    </Card>
                    <Card title="What you can do" icon={Users}>
                        <ul className="text-sm text-ink-2 space-y-2">
                            <li><Link to="/people" className="text-brand-600 hover:underline inline-flex items-center gap-1"><Search className="w-3.5 h-3.5" /> Search directors and shareholders by name</Link></li>
                            <li><Link to="/search" className="text-brand-600 hover:underline inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Search and filter companies</Link></li>
                        </ul>
                    </Card>
                    <Card title="Delete your account" icon={Trash2}>
                        <p className="text-sm text-ink-2 mb-3">Removes your account, sign-ins and history straight away. It cannot be undone.</p>
                        <button
                            onClick={() => { if (window.confirm('Delete your account and everything stored with it?')) act('delete', '/api/v1/auth/me', 'DELETE', () => { revalidator.revalidate(); navigate('/'); }); }}
                            className="btn-secondary text-sm text-rose-700 border-rose-200 hover:bg-rose-50" disabled={busy === 'delete'}
                        >
                            Delete account
                        </button>
                    </Card>
                </div>

                <Card title="Your history" icon={History} action={history.views.length > 0 ? (
                    <button onClick={() => { if (window.confirm('Clear your whole history?')) act('clear', '/api/v1/auth/me/views', 'DELETE', () => revalidator.revalidate()); }} className="text-xs text-rose-700 hover:underline" disabled={busy === 'clear'}>Clear history</button>
                ) : undefined}>
                    <p className="text-xs text-ink-muted mb-3">The companies and people you looked at and the names you searched, as described in the <Link to="/privacy" className="text-brand-600 hover:underline">privacy statement</Link>. Kept for {history.retention_days} days, then deleted. {history.total > history.views.length ? `Showing the latest ${history.views.length} of ${formatNumber(history.total)}.` : ''}</p>
                    {history.views.length === 0 ? <p className="text-sm text-ink-muted py-6 text-center">Nothing recorded yet.</p> : (
                        <ul className="divide-y divide-line">
                            {history.views.map((view, index) => (
                                <li key={index} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                                    <div className="min-w-0">
                                        <span className="text-xs text-ink-muted mr-2">{KIND_LABEL[view.kind]}</span>
                                        {view.kind === 'profile' ? (
                                            <Link to={companyPath(view.subject, view.label || 'company')} className="text-ink hover:text-brand-600 font-medium">{view.label || view.subject}</Link>
                                        ) : view.kind === 'person' ? (
                                            <Link to={`/people/${view.subject}`} className="text-ink hover:text-brand-600 font-medium">{view.label || view.subject}</Link>
                                        ) : (
                                            <Link to={`/people?q=${encodeURIComponent(view.subject)}`} className="text-ink hover:text-brand-600 font-medium">"{view.subject}"</Link>
                                        )}
                                    </div>
                                    <span className="text-xs text-ink-muted whitespace-nowrap tabular">{formatDate(view.viewed_at.slice(0, 10))}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </AppShell>
    );
}
