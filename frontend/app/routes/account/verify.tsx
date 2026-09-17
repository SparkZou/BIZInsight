import { useEffect, useState } from 'react';
import type { MetaFunction } from 'react-router';
import { Link, useRevalidator, useSearchParams } from 'react-router';
import { CheckCircle, Loader2 } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { AccountCard, FormError } from '../../components/AccountForm';
import { postJson } from '../../lib/api';
import { SITE_NAME, pageMeta } from '../../lib/site';

export const meta: MetaFunction = () => pageMeta({ title: `Confirm your email | ${SITE_NAME}`, description: '', robots: 'noindex, nofollow' });

export default function Verify() {
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const revalidator = useRevalidator();
    const [state, setState] = useState<'working' | 'done' | 'failed'>(token ? 'working' : 'failed');
    const [error, setError] = useState(token ? '' : 'This link is missing its code. Open the link from the email again.');

    // The link is opened with a GET, so the one-time token is spent from the browser, not while the
    // page renders on the server (a preview fetch would otherwise use it up).
    useEffect(() => {
        if (!token) return;
        postJson('/api/v1/auth/verify', { token }).then(result => {
            if (result.ok) {
                setState('done');
                revalidator.revalidate();
            } else {
                setState('failed');
                setError(result.detail || 'The link could not be confirmed.');
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    return (
        <AppShell>
            <AccountCard title="Confirm your email address">
                {state === 'working' && <p className="flex items-center gap-2 text-sm text-ink-muted"><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</p>}
                {state === 'done' && (
                    <div className="space-y-4">
                        <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"><CheckCircle className="w-4 h-4" /> Your email address is confirmed.</p>
                        <Link to="/people" className="btn-primary w-full">Search people on the register</Link>
                    </div>
                )}
                {state === 'failed' && (
                    <div className="space-y-4">
                        <FormError message={error} />
                        <Link to="/account" className="btn-secondary w-full">Go to your account</Link>
                    </div>
                )}
            </AccountCard>
        </AppShell>
    );
}
