import { useState } from 'react';
import type { MetaFunction } from 'react-router';
import { Link, useNavigate, useRevalidator, useSearchParams } from 'react-router';
import AppShell from '../../components/AppShell';
import { AccountCard, Field, FormError, SubmitButton, preventDefault } from '../../components/AccountForm';
import { postJson } from '../../lib/api';
import { SITE_NAME, pageMeta } from '../../lib/site';

export const meta: MetaFunction = () => pageMeta({ title: `Create an account | ${SITE_NAME}`, description: 'Create a free account.', robots: 'noindex, nofollow' });

export default function Register() {
    const [params] = useSearchParams();
    const next = params.get('next') && params.get('next')!.startsWith('/') ? params.get('next')! : '/account';
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        setError('');
        const result = await postJson('/api/v1/auth/register', { name, email, password });
        setBusy(false);
        if (!result.ok) return setError(result.detail || 'The account could not be created. Please try again.');
        revalidator.revalidate();
        navigate(next === '/account' ? '/account?welcome=1' : next);
    };

    return (
        <AppShell>
            <AccountCard
                title="Create an account"
                intro={<>Free. We store your email address, your name if you give one, and a history of the companies and people you look up - which you can clear at any time. <Link to="/privacy" className="text-brand-600 hover:underline">Privacy statement</Link> · <Link to="/terms" className="text-brand-600 hover:underline">Terms of use</Link>.</>}
                footer={<>Already have an account? <Link to="/account/login" className="text-brand-600 hover:underline">Sign in</Link></>}
            >
                <form onSubmit={preventDefault(submit)} className="space-y-4">
                    <Field id="name" label="Your name (optional)" value={name} onChange={setName} autoComplete="name" required={false} />
                    <Field id="email" label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.co.nz" />
                    <Field id="password" label="Password (at least 8 characters)" type="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} />
                    <FormError message={error} />
                    <SubmitButton busy={busy}>Create account</SubmitButton>
                    <p className="text-xs text-ink-muted">By creating an account you agree to the terms of use, including not using the data for direct marketing lists.</p>
                </form>
            </AccountCard>
        </AppShell>
    );
}
