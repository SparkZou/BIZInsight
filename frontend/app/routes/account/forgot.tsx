import { useState } from 'react';
import type { MetaFunction } from 'react-router';
import { Link, useRouteLoaderData } from 'react-router';
import { CheckCircle } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { AccountCard, Field, FormError, SubmitButton, preventDefault } from '../../components/AccountForm';
import { postJson, type RootData } from '../../lib/api';
import { SITE_NAME, pageMeta } from '../../lib/site';

export const meta: MetaFunction = () => pageMeta({ title: `Reset your password | ${SITE_NAME}`, description: '', robots: 'noindex, nofollow' });

export default function Forgot() {
    const root = useRouteLoaderData('root') as RootData | undefined;
    const emailOn = root?.site?.features.email ?? false;
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        setError('');
        const result = await postJson('/api/v1/auth/forgot', { email });
        setBusy(false);
        if (!result.ok) return setError(result.detail || 'Please try again.');
        setSent(true);
    };

    return (
        <AppShell>
            <AccountCard title="Reset your password" intro="Enter the email address of your account and we will send a link to choose a new password." footer={<Link to="/account/login" className="text-brand-600 hover:underline">Back to sign in</Link>}>
                {!emailOn ? (
                    <p className="text-sm text-ink-2">Password resets by email are not switched on yet. Email <a href={`mailto:${root?.site?.operator.email}`} className="text-brand-600 hover:underline">{root?.site?.operator.email}</a> from the address on your account and we will reset it for you.</p>
                ) : sent ? (
                    <p className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"><CheckCircle className="w-4 h-4 mt-0.5" /> If that address has an account, a reset link is on its way. It works for one hour; check your spam folder too.</p>
                ) : (
                    <form onSubmit={preventDefault(submit)} className="space-y-4">
                        <Field id="email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />
                        <FormError message={error} />
                        <SubmitButton busy={busy}>Send reset link</SubmitButton>
                    </form>
                )}
            </AccountCard>
        </AppShell>
    );
}
