import type { MetaFunction } from 'react-router';
import { Link, useRouteLoaderData } from 'react-router';
import AppShell from '../components/AppShell';
import type { RootData } from '../lib/api';
import { SITE_NAME, pageMeta } from '../lib/site';

export const meta: MetaFunction = () => pageMeta({
    title: `Privacy statement | ${SITE_NAME}`,
    description: `What ${SITE_NAME} collects about visitors and account holders, why, how long it is kept, and how to have register information about you corrected or removed.`,
    path: '/privacy',
});

export default function Privacy() {
    const root = useRouteLoaderData('root') as RootData | undefined;
    const operator = root?.site?.operator ?? { name: 'the site operator', email: '', address: '' };
    const emailOn = root?.site?.features.email ?? false;
    return (
        <AppShell>
            <article className="card max-w-3xl p-6 sm:p-10 prose-sm">
                <h1 className="text-2xl font-bold">Privacy statement</h1>
                <p className="text-sm text-ink-muted mt-1 mb-6">Last updated 17 September 2026 · {SITE_NAME} is operated by {operator.name}{operator.address ? `, ${operator.address}` : ''}. This statement is written to meet the Privacy Act 2020.</p>

                <section className="space-y-3 text-sm text-ink-2 leading-relaxed">
                    <h2 className="text-base font-semibold text-ink">1. Register information about companies and people</h2>
                    <p>The site republishes the public registers kept by the New Zealand Companies Office (companies, incorporated societies, charitable trusts, limited partnerships and the NZBN register), loaded each month from the Companies Office bulk data extract. That includes the names of directors and shareholders and the dates of their appointments and shareholdings, exactly as filed. It does not include residential addresses, dates of birth or contact details of individuals: the extract does not contain them and we do not collect them from elsewhere.</p>
                    <p>We show this information for the purpose the register exists for - so that anyone can check who is behind a company - and under the Companies Office bulk data agreement, which prohibits using it for direct marketing or for building marketing lists. Looking a person up by name across the register is limited to signed-in users, and every such search or page view is recorded against the account (see section 3).</p>
                    <p><b>If the register has suppressed your details</b> (for example under a protection order) and they still appear here, or a filing about you is wrong, email {operator.email ? <a href={`mailto:${operator.email}`} className="text-brand-600 hover:underline">{operator.email}</a> : 'us'} or use the <Link to="/data-sources" className="text-brand-600 hover:underline">correction form</Link>. Suppressed details are removed at once and stay removed through later refreshes; other corrections follow the register.</p>

                    <h2 className="text-base font-semibold text-ink pt-3">2. Visitors without an account</h2>
                    <p>Pages can be read without an account. The web server keeps standard access logs (IP address, page requested, browser, time) for up to 30 days to run and protect the service. The contact form stores the name, email address, company and message you enter, so we can reply. No advertising or analytics cookies are used.</p>

                    <h2 className="text-base font-semibold text-ink pt-3">3. Account holders</h2>
                    <p>When you create an account we store your email address, your name if you give one, a hash of your password (never the password itself), the time you joined and last signed in, and a session cookie (<code>nzci_session</code>) that keeps you signed in for 30 days.{emailOn ? ' We send you a link to confirm your email address; person pages open once it is confirmed.' : ''}</p>
                    <p><b>Your history.</b> While you are signed in we record the company profiles you open, the person pages you open and the names you search for. We do this to show you your own history, to detect and stop bulk extraction and misuse of people's information, and to be able to demonstrate that the register data is used within its conditions. Entries are deleted after 12 months, and you can see and clear them at any time on <Link to="/account" className="text-brand-600 hover:underline">your account page</Link>. They are never sold, shared or used to contact you.</p>
                    <p><b>Emails.</b> We only email account holders about their account (confirmation and password-reset links). Any future optional notifications will be opt-in, and every such message will carry an unsubscribe link.</p>
                    <p><b>Deleting your account</b> removes your details, sessions and history immediately; it is available on your account page. Server backups may hold a copy for up to 30 days more.</p>

                    <h2 className="text-base font-semibold text-ink pt-3">4. Who else sees the information</h2>
                    <p>Your data is stored on a server in a data centre operated by our hosting provider and is only accessed by {operator.name} to run the service. Account emails are sent through {operator.name}'s own mailbox. We do not sell or share personal information, and only disclose it where the law requires.</p>

                    <h2 className="text-base font-semibold text-ink pt-3">5. Your rights</h2>
                    <p>Under the Privacy Act 2020 you can ask for the personal information we hold about you and ask for it to be corrected. Email {operator.email ? <a href={`mailto:${operator.email}`} className="text-brand-600 hover:underline">{operator.email}</a> : 'us'}; we answer within 20 working days. If you are not satisfied you can complain to the Office of the Privacy Commissioner (privacy.org.nz).</p>

                    <h2 className="text-base font-semibold text-ink pt-3">6. Changes</h2>
                    <p>If this statement changes materially, the date above changes and account holders are told on their account page. See also the <Link to="/terms" className="text-brand-600 hover:underline">terms of use</Link> and <Link to="/data-sources" className="text-brand-600 hover:underline">about the data</Link>.</p>
                </section>
            </article>
        </AppShell>
    );
}
