import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Lock, Search, Users } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Card } from '../components/charts';
import SearchBar from '../components/SearchBar';
import { apiTry, forwardCookie, type PersonSummary, type SessionUser } from '../lib/api';
import { SITE_NAME, formatNumber, pageMeta } from '../lib/site';

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const me = await apiTry<{ user: SessionUser | null }>('/api/v1/auth/me', { headers: forwardCookie(request) });
    const user = me.data?.user ?? null;
    if (!user || q.length < 2) return { q, user, results: null, error: null };
    const search = await apiTry<{ q: string; persons: PersonSummary[]; truncated: boolean }>(`/api/v1/people/search?q=${encodeURIComponent(q)}`, { headers: forwardCookie(request) });
    return { q, user, results: search.data, error: search.data ? null : search.detail || 'The search could not be run.' };
}

// Person-level pages are for signed-in users and are never indexed.
export const meta: MetaFunction = () => pageMeta({
    title: `Search directors and shareholders by name | ${SITE_NAME}`,
    description: 'Find every company a person is a director or shareholder of, from the New Zealand Companies Office register. Sign in required.',
    robots: 'noindex, nofollow',
});

export default function People() {
    const { q, user, results, error } = useLoaderData<typeof loader>();
    return (
        <AppShell>
            <div className="mb-5">
                <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-brand-600" /> People on the register</h1>
                <p className="text-ink-muted text-sm mt-1">Directors and individual shareholders by name, with every company they are recorded against.</p>
            </div>

            {!user ? (
                <div className="card max-w-xl p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Lock className="w-5 h-5" /></div>
                        <div className="text-sm text-ink-2 space-y-3">
                            <p className="font-semibold text-ink text-base">Sign in to search people</p>
                            <p>Company pages are open to everyone. Looking someone up by name across the whole register is only available to signed-in users, and each search is kept in your account history - the register's information about people is published for checking who is behind a company, not for building lists.</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Link to={`/account/login?next=${encodeURIComponent(q ? `/people?q=${q}` : '/people')}`} className="btn-primary">Sign in</Link>
                                <Link to={`/account/register?next=${encodeURIComponent(q ? `/people?q=${q}` : '/people')}`} className="btn-secondary">Create a free account</Link>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="max-w-2xl mb-6"><SearchBar id="people-q" large defaultValue={q} autoFocus={!q} placeholder="First and last name, e.g. Jane Smith" action="/people" /></div>
                    {error && (
                        <div className="card max-w-xl p-5 text-sm text-ink-2">
                            <p>{error}</p>
                            {!user.can_view_people && <Link to="/account" className="btn-secondary text-sm mt-3">Go to your account</Link>}
                        </div>
                    )}
                    {results && (
                        <Card title={`People matching "${results.q}"`} icon={Search} action={<span className="text-xs text-ink-muted">{results.persons.length}{results.truncated ? '+' : ''} {results.persons.length === 1 ? 'name' : 'names'}</span>}>
                            {results.persons.length === 0 ? <p className="text-sm text-ink-muted py-6 text-center">Nobody with that name is on the register. Try fewer words, or a different spelling.</p> : (
                                <ul className="divide-y divide-line">
                                    {results.persons.map(person => (
                                        <li key={person.slug} className="py-3 flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <Link to={`/people/${person.slug}`} className="font-medium text-ink hover:text-brand-600">{person.name}</Link>
                                                <p className="text-xs text-ink-muted truncate">{person.companies.join(' · ')}</p>
                                            </div>
                                            <p className="text-xs text-ink-muted whitespace-nowrap tabular">{formatNumber(person.directorships)} director · {formatNumber(person.shareholdings)} shareholder</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {results.truncated && <p className="text-xs text-ink-faint mt-3">Only the first matches are shown; add a first name or middle name to narrow it down.</p>}
                        </Card>
                    )}
                    {!q && (
                        <p className="text-xs text-ink-muted max-w-2xl">A "person" here is everyone on the register with exactly the same name; the register does not say whether two entries are the same individual. Searches are recorded in <Link to="/account" className="text-brand-600 hover:underline">your history</Link>.</p>
                    )}
                </>
            )}
        </AppShell>
    );
}
