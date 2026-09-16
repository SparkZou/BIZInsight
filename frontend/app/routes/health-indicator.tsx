import type { MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Activity, HeartPulse, Scale, ShieldCheck } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Card, Donut } from '../components/charts';
import HealthPill, { HEALTH_DOT } from '../components/HealthPill';
import type { HealthLabel } from '../lib/api';
import { loadInsights } from '../lib/pages';
import { SITE_NAME, formatDate, formatNumber, pageMeta } from '../lib/site';

export async function loader() {
    const { insights, dataset } = await loadInsights();
    return { health: insights.health, factors: insights.health_factors, overview: insights.overview, dataset };
}

export const meta: MetaFunction<typeof loader> = () => pageMeta({
    title: `Company Health Indicator - how the score is computed | ${SITE_NAME}`,
    description: 'The Company Health Indicator scores every New Zealand company from 0 to 100 using only facts on the Companies Office register: age, status, insolvency history, directors, ownership and presence. Here is exactly how.',
    path: '/health-indicator',
});

export const FACTOR_ROWS = [
    { key: 'age', name: 'Age on the register', max: 30, how: 'Under 2 years 10 · 2-5 years 18 · 5-10 years 24 · 10-20 years 28 · 20 years or more 30' },
    { key: 'status', name: 'Register status', max: 25, how: 'Registered 25 · in liquidation, receivership or administration 0' },
    { key: 'insolvency', name: 'Insolvency history', max: 15, how: 'No appointment ever recorded 15 · a past appointment while now registered 5 · current appointment 0' },
    { key: 'directors', name: 'Directors', max: 12, how: 'Two or three directors 12 · four or more 10 · one 8 · none 0' },
    { key: 'ownership', name: 'Ownership', max: 8, how: 'Shareholders recorded 5, plus 3 when one of them is a company' },
    { key: 'presence', name: 'Presence', max: 10, how: 'Website filed 5 · trading name 2 · industry classification 3' },
];

const LABELS: { label: HealthLabel; range: string; meaning: string }[] = [
    { label: 'Established', range: '80-100', meaning: 'Ten or more years on the register with no insolvency record, and either more than one director or filed details such as a website.' },
    { label: 'Developing', range: '60-79', meaning: 'Registered and clean, but younger or more thinly recorded - where most companies in their first years sit.' },
    { label: 'Watch', range: '40-59', meaning: 'A young company with a past insolvency appointment, or one with almost nothing filed beyond its registration.' },
    { label: 'Distressed', range: '0-39', meaning: 'A liquidator, receiver or administrator is currently appointed.' },
    { label: 'Removed', range: 'not scored', meaning: 'The company has been removed from the register; its page stays for the record.' },
];

export default function HealthIndicator() {
    const { health, overview, dataset } = useLoaderData<typeof loader>();
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <div className="mb-5">
                <h1 className="text-2xl font-bold flex items-center gap-2"><HeartPulse className="w-6 h-6 text-brand-600" /> Company Health Indicator</h1>
                <p className="text-ink-muted text-sm mt-1">A 0-100 score for every company, computed only from what is on the public register. This page is the whole method.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 items-start">
                <Card title="Six factors, 100 points" icon={Activity}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-ink-muted border-b border-line">
                                <tr><th className="py-2 pr-3 font-medium">Factor</th><th className="py-2 pr-3 font-medium text-right">Max</th><th className="py-2 font-medium">Points</th></tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {FACTOR_ROWS.map(row => (
                                    <tr key={row.key}>
                                        <td className="py-2.5 pr-3 font-medium text-ink whitespace-nowrap">{row.name}</td>
                                        <td className="py-2.5 pr-3 text-right tabular">{row.max}</td>
                                        <td className="py-2.5 text-ink-2">{row.how}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <h3 className="text-sm font-semibold mt-6 mb-2">Labels</h3>
                    <ul className="space-y-2 text-sm">
                        {LABELS.map(item => (
                            <li key={item.label} className="flex flex-wrap items-start gap-3">
                                <span className="w-28 shrink-0"><HealthPill label={item.label} /></span>
                                <span className="w-20 shrink-0 tabular text-ink-muted">{item.range}</span>
                                <span className="flex-1 min-w-[16rem] text-ink-2">{item.meaning}</span>
                            </li>
                        ))}
                    </ul>
                </Card>

                <div className="space-y-4">
                    <Card title="Active companies by label" icon={HeartPulse}>
                        <Donut
                            centerValue={formatNumber(overview.live)} centerLabel="active companies"
                            items={health.filter(item => item.label !== 'Removed').map(item => ({ label: item.label, value: item.live, color: HEALTH_DOT[item.label] }))}
                        />
                    </Card>
                    <Card title="What it is not" icon={ShieldCheck}>
                        <ul className="text-sm text-ink-2 space-y-2 leading-relaxed">
                            <li>It is not a credit rating, a review, or an opinion about the people involved. No financial statements, employee numbers or customer feedback go into it - the register does not hold them.</li>
                            <li>A registered company with no insolvency record always has at least 40 points, so "Developing" is where most young companies sit; it says nothing bad about them. "Established" needs ten years on the register plus a second director or filed details.</li>
                            <li>The score is recomputed from the monthly Companies Office extract (currently as at {formatDate(overview.as_at)}); it lags the register by up to a month.</li>
                        </ul>
                    </Card>
                    <Card title="Disagree with a score?" icon={Scale}>
                        <p className="text-sm text-ink-2 leading-relaxed">
                            Every point comes from a filed fact, so a wrong score means a wrong or outdated filing. If a company's register entry has changed since the extract,
                            or you believe a fact is misrecorded, <Link to="/data-sources" className="text-brand-600 hover:underline">tell us</Link> and it will be checked within five working days.
                        </p>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}
