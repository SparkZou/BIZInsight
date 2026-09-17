import type { MetaFunction } from 'react-router';
import { Link, useRouteLoaderData } from 'react-router';
import AppShell from '../components/AppShell';
import type { RootData } from '../lib/api';
import { SITE_NAME, pageMeta } from '../lib/site';

export const meta: MetaFunction = () => pageMeta({
    title: `Terms of use | ${SITE_NAME}`,
    description: `The conditions for using ${SITE_NAME}: what the data is, how current it is, what you may do with it, and what the Company Health Indicator does and does not mean.`,
    path: '/terms',
});

export default function Terms() {
    const root = useRouteLoaderData('root') as RootData | undefined;
    const operator = root?.site?.operator ?? { name: 'the site operator', email: '', address: '' };
    return (
        <AppShell>
            <article className="card max-w-3xl p-6 sm:p-10">
                <h1 className="text-2xl font-bold">Terms of use</h1>
                <p className="text-sm text-ink-muted mt-1 mb-6">Last updated 17 September 2026 · {SITE_NAME} is operated by {operator.name}. By using the site you accept these terms.</p>

                <section className="space-y-3 text-sm text-ink-2 leading-relaxed">
                    <h2 className="text-base font-semibold text-ink">1. What the site is</h2>
                    <p>{SITE_NAME} presents information from the public registers of the New Zealand Companies Office, loaded from its monthly bulk data extract, together with statistics and an indicator computed from that information. Every page shows the date of the extract it is drawn from. The site is not affiliated with, endorsed by or a substitute for the Companies Office; the official register at companies-register.companiesoffice.govt.nz is the authoritative record and is updated continuously.</p>

                    <h2 className="text-base font-semibold text-ink pt-3">2. What you may do</h2>
                    <p>You may read, search and link to the site for research, business and personal purposes, including checking companies you deal with, apply to or compete with.</p>
                    <p>You may not: use the site or its data for direct marketing, or to build or sell lists of people or businesses to contact (the Companies Office bulk data agreement forbids it, and so does this site); copy the site's pages or data in bulk, by scraping or otherwise, or resell them; use information about individuals for any purpose unrelated to their role in a company; or try to identify, locate or profile individuals beyond what the register itself shows. Accounts used in breach of these terms are closed.</p>

                    <h2 className="text-base font-semibold text-ink pt-3">3. Accounts</h2>
                    <p>Accounts are free. You are responsible for keeping your password private and for what is done with your account. Person-level searches and pages are recorded against your account as described in the <Link to="/privacy" className="text-brand-600 hover:underline">privacy statement</Link>. You can delete your account at any time.</p>

                    <h2 className="text-base font-semibold text-ink pt-3">4. Accuracy and the Company Health Indicator</h2>
                    <p>We take care to load and present the register faithfully, but the site is provided "as is": the data lags the register by up to a month, filings can be wrong, and the site can contain errors. Check the official register before relying on anything important.</p>
                    <p>The <Link to="/health-indicator" className="text-brand-600 hover:underline">Company Health Indicator</Link> is a score computed mechanically from facts filed on the register - age, status, insolvency history, directors, ownership and filed details - by the published method. It is an aid to reading the register, not a credit rating, a review, financial advice, or a statement of opinion about any company or person, and it takes no account of anything not on the register. Do not rely on it as the basis of an employment, credit or investment decision. If you believe a score is wrong because a filing is wrong or out of date, use the <Link to="/data-sources" className="text-brand-600 hover:underline">correction form</Link>.</p>

                    <h2 className="text-base font-semibold text-ink pt-3">5. Liability</h2>
                    <p>To the extent the law allows, {operator.name} is not liable for any loss arising from use of the site or reliance on its content. Nothing in these terms limits rights you have under the Consumer Guarantees Act 1993 where it applies.</p>

                    <h2 className="text-base font-semibold text-ink pt-3">6. Intellectual property</h2>
                    <p>Register information belongs to the Crown and is used under the Companies Office bulk data agreement. The site's design, text, statistics and the indicator method are the property of {operator.name}; you may quote them with attribution and a link.</p>

                    <h2 className="text-base font-semibold text-ink pt-3">7. Changes and law</h2>
                    <p>These terms may change; the date above shows the current version. New Zealand law governs them and the New Zealand courts have jurisdiction. Questions: {operator.email ? <a href={`mailto:${operator.email}`} className="text-brand-600 hover:underline">{operator.email}</a> : 'use the contact form'}.</p>
                </section>
            </article>
        </AppShell>
    );
}
