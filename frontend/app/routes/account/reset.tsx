import { useState } from 'react';
import type { MetaFunction } from 'react-router';
import { Link, useNavigate, useRevalidator, useSearchParams } from 'react-router';
import AppShell from '../../components/AppShell';
import { AccountCard, Field, FormError, SubmitButton, preventDefault } from '../../components/AccountForm';
import { postJson } from '../../lib/api';
import { SITE_NAME, pageMeta } from '../../lib/site';

export const meta: MetaFunction = () => pageMeta({ title: `Choose a new password | ${SITE_NAME}`, description: '', robots: 'noindex, nofollow' });

export default function Reset() {
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    const [password, setPassword] = useState('');
    const [error, setError] = useState(token ? '' : 'This link is missing its code. Open the link from the email again.');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        setError('');
        const result = await postJson('/api/v1/auth/reset', { token, password });
        setBusy(false);
        if (!result.ok) return setError(result.detail || 'The password could not be changed.');
        revalidator.revalidate();
        navigate('/account');
    };

    return (
        <AppShell>
            <AccountCard title="Choose a new password" footer={<Link to="/account/forgot" className="text-brand-600 hover:underline">Need a new link?</Link>}>
                <form onSubmit={preventDefault(submit)} className="space-y-4">
                    <Field id="password" label="New password (at least 8 characters)" type="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} />
                    <FormError message={error} />
                    <SubmitButton busy={busy || !token}>Save password and sign in</SubmitButton>
                </form>
            </AccountCard>
        </AppShell>
    );
}
