import { useState } from 'react';
import type { MetaFunction } from 'react-router';
import { Link, useNavigate, useRevalidator, useSearchParams } from 'react-router';
import AppShell from '../../components/AppShell';
import { AccountCard, Field, FormError, SubmitButton, preventDefault } from '../../components/AccountForm';
import { postJson } from '../../lib/api';
import { SITE_NAME, pageMeta } from '../../lib/site';

export const meta: MetaFunction = () => pageMeta({ title: `Sign in | ${SITE_NAME}`, description: 'Sign in to your account.', robots: 'noindex, nofollow' });

export default function Login() {
    const [params] = useSearchParams();
    const next = params.get('next') && params.get('next')!.startsWith('/') ? params.get('next')! : '/account';
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        setError('');
        const result = await postJson('/api/v1/auth/login', { email, password });
        setBusy(false);
        if (!result.ok) return setError(result.detail || 'Sign-in failed. Please try again.');
        revalidator.revalidate();
        navigate(next);
    };

    return (
        <AppShell>
            <AccountCard
                title="Sign in"
                intro={<>Accounts unlock searching directors and shareholders by name and keep a history you control. <Link to="/privacy" className="text-brand-600 hover:underline">Privacy statement</Link>.</>}
                footer={<>No account yet? <Link to={`/account/register${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-brand-600 hover:underline">Create one</Link> · <Link to="/account/forgot" className="text-brand-600 hover:underline">Forgot your password?</Link></>}
            >
                <form onSubmit={preventDefault(submit)} className="space-y-4">
                    <Field id="email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.co.nz" />
                    <Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
                    <FormError message={error} />
                    <SubmitButton busy={busy}>Sign in</SubmitButton>
                </form>
            </AccountCard>
        </AppShell>
    );
}
