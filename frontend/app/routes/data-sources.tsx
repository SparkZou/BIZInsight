import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Database, FileText, Mail, ShieldCheck } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Card } from '../components/charts';
import ContactForm from '../components/ContactForm';
import { apiJson, type DatasetSummary, type Insights } from '../lib/api';
import { SITE_NAME, formatDate, formatNumber, pageMeta } from '../lib/site';

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const [dataset, insights] = await Promise.all([apiJson<DatasetSummary>('/api/v1/dataset'), apiJson<Insights>('/api/v1/insights')]);
    // Company pages link here with ?company=<name> (NZBN <nzbn>) so a correction request starts filled in.
    const company = (url.searchParams.get('company') || '').slice(0, 200);
    return { dataset, overview: insights.overview, computedAt: insights.computed_at, company };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: `Data sources, coverage and privacy | ${SITE_NAME}`,
    description: `Where the data comes from (Companies Office bulk data, NZBN register), how often it is refreshed, what it covers and how to have details corrected or removed. ${data ? `Snapshot as at ${formatDate(data.dataset.as_at)}.` : ''}`,
    path: '/data-sources',
});

export default function DataSources() {
    const { dataset, overview, computedAt, company } = useLoaderData<typeof loader>();
    return (
        <AppShell asAt={dataset.as_at} importedAt={dataset.imported_at}>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">Data Sources</h1>
                <p className="text-ink-muted text-sm mt-1">What the site is built on, how fresh it is, and what it does not contain.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Companies Office bulk data" icon={Database}>
                    <p className="text-sm text-ink-2 leading-relaxed">
                        The New Zealand Companies Office publishes a monthly extract of its public registers: the Companies Register plus incorporated societies,
                        charitable trusts, limited partnerships and the NZBN entities. {SITE_NAME} loads the whole extract each month and rebuilds every page from it.
                    </p>
                    <dl className="grid grid-cols-2 gap-3 mt-4 text-sm">
                        <div className="rounded-lg bg-canvas p-3"><dt className="text-xs text-ink-muted">Snapshot as at</dt><dd className="font-semibold">{formatDate(dataset.as_at)}</dd></div>
                        <div className="rounded-lg bg-canvas p-3"><dt className="text-xs text-ink-muted">Loaded</dt><dd className="font-semibold">{dataset.imported_at ? formatDate(dataset.imported_at.slice(0, 10)) : '-'}</dd></div>
                        <div className="rounded-lg bg-canvas p-3"><dt className="text-xs text-ink-muted">Companies, all time</dt><dd className="font-semibold tabular">{formatNumber(overview.total)}</dd></div>
                        <div className="rounded-lg bg-canvas p-3"><dt className="text-xs text-ink-muted">Active companies</dt><dd className="font-semibold tabular">{formatNumber(overview.live)}</dd></div>
                    </dl>
                    <p className="text-xs text-ink-faint mt-3">Statistics last computed {formatDate(computedAt.slice(0, 10))}. Source: <a href="https://www.companiesoffice.govt.nz/data-services/ways-to-get-our-data/request-access-to-bulk-data/" className="underline hover:text-ink" target="_blank" rel="noopener noreferrer">Companies Office data services</a>.</p>
                </Card>

                <Card title="What each page uses" icon={FileText}>
                    <ul className="text-sm text-ink-2 space-y-2 leading-relaxed">
                        <li><b>Company profiles</b>: core details, registered office and address for service, directors, shareholdings, industry classification, trading names, websites, trading areas and insolvency appointments - as filed.</li>
                        <li><b>Industry</b>: the ANZSIC 2006 code each company files; the first letter is the division used for charts and filters.</li>
                        <li><b>Region</b>: derived from the registered office postcode, so a few towns on regional borders fall on the wrong side.</li>
                        <li><b>Website</b>: only the {formatNumber(overview.live_with_website)} active companies that filed a website address; "no website" entries are ignored.</li>
                        <li><b>Growth and insolvency signals</b>: counts of registrations, removals and liquidator appointments in twelve-month windows ending at the start of the snapshot month.</li>
                    </ul>
                </Card>

                <Card title="Not in the data" icon={ShieldCheck}>
                    <ul className="text-sm text-ink-2 space-y-2 leading-relaxed">
                        <li>Employee numbers, revenue, or anything about how a company treats its staff.</li>
                        <li>Filings made after the snapshot date; check the <a href="https://companies-register.companiesoffice.govt.nz/" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">official register</a> for the latest.</li>
                        <li>GST registration for most companies (the extract only carries a sample), and phone numbers or email addresses.</li>
                        <li>Directors' and shareholders' residential addresses or dates of birth - the register does not release them in bulk, and this site does not collect them elsewhere.</li>
                    </ul>
                </Card>

                <Card title="Corrections and removals" icon={Mail}>
                    <p className="text-sm text-ink-2 leading-relaxed">
                        Names of directors and shareholders appear exactly as they do on the public register. If the Companies Office has suppressed your details
                        (for example under a protection order) and they still show here, or something about your company is wrong, tell us and it will be fixed
                        or removed at the next refresh - usually within a few days.
                    </p>
                    <p className="text-sm text-ink-2 leading-relaxed mt-3">{SITE_NAME} is not affiliated with the Companies Office or MBIE. See also the <Link to="/" className="text-brand-600 hover:underline">overview</Link>.</p>
                </Card>
            </div>

            <Card title={company ? 'Report an issue with a company profile' : 'Get in touch'} icon={Mail} className="mt-4 max-w-3xl">
                {company && <p className="text-sm text-ink-2 mb-4">Tell us what is wrong with the profile of <b>{company}</b> - a suppressed address, an outdated filing, or a score you disagree with - and we will check it within five working days.</p>}
                <ContactForm key={company} company={company} />
            </Card>
        </AppShell>
    );
}
