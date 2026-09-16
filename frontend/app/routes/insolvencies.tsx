import type { MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowRight, Calendar, Scale } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Card, TrendLine } from '../components/charts';
import { loadInsights } from '../lib/pages';
import { SITE_NAME, formatDate, formatMonth, formatNumber, insolvencyMonthPath, pageMeta } from '../lib/site';

export async function loader() {
    const { insights, dataset } = await loadInsights();
    const months = (insights.insolvency_months ?? []).map(({ by_region, by_division, ...rest }) => rest).reverse();
    return { months, years: insights.insolvency_years ?? [], overview: insights.overview, dataset };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: `Company liquidations and receiverships in New Zealand, month by month | ${SITE_NAME}`,
    description: `Liquidator, receiver and administrator appointments recorded on the New Zealand Companies Register each month, with the companies affected by region and industry${data ? `. Data as at ${formatDate(data.overview.as_at)}` : ''}.`,
    path: '/insolvencies',
});

export default function Insolvencies() {
    const { months, overview, dataset } = useLoaderData<typeof loader>();
    const complete = months.filter(month => month.complete);
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">Insolvencies by month</h1>
                <p className="text-ink-muted text-sm mt-1">Liquidations, receiverships and voluntary administrations appointed each month, from the register's insolvency records.</p>
            </div>
            <Card title="Appointments per month" icon={Scale}>
                <TrendLine points={[...complete].reverse().map(month => ({ label: formatMonth(month.month, true), value: month.total }))} height={240} color="#F43F5E" valueLabel="Appointments" />
            </Card>
            <Card title="Months" icon={Calendar} className="mt-4">
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {months.map(month => (
                        <li key={month.month}>
                            <Link to={insolvencyMonthPath(month.month)} className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 hover:border-brand-300 hover:bg-brand-50/40">
                                <span>
                                    <span className="block font-medium text-ink">{formatMonth(month.month)}{!month.complete && <span className="text-xs text-ink-muted font-normal"> (partial)</span>}</span>
                                    <span className="block text-xs text-ink-muted tabular">{formatNumber(month.liquidation)} liquidations · {formatNumber(month.receivership)} receiverships · {formatNumber(month.voluntary_administration)} administrations</span>
                                </span>
                                <ArrowRight className="w-4 h-4 text-ink-faint" />
                            </Link>
                        </li>
                    ))}
                </ul>
            </Card>
        </AppShell>
    );
}
