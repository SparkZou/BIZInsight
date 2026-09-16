import type { MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowRight, Calendar, TrendingUp } from 'lucide-react';
import AppShell from '../components/AppShell';
import { Card, TrendLine } from '../components/charts';
import { loadInsights } from '../lib/pages';
import { SITE_NAME, formatDate, formatMonth, formatNumber, monthPath, pageMeta } from '../lib/site';

export async function loader() {
    const { insights, dataset } = await loadInsights();
    return { months: insights.months.map(({ by_region, by_division, ...rest }) => rest).reverse(), overview: insights.overview, dataset };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: `New companies registered in New Zealand, month by month | ${SITE_NAME}`,
    description: `How many companies were registered in New Zealand each month over the last three years, with every month's new companies by region and industry${data ? `. Data as at ${formatDate(data.overview.as_at)}` : ''}.`,
    path: '/new-companies',
});

export default function NewCompanies() {
    const { months, overview, dataset } = useLoaderData<typeof loader>();
    const complete = months.filter(month => month.complete);
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">New companies by month</h1>
                <p className="text-ink-muted text-sm mt-1">Registrations on the New Zealand register, month by month. Open a month for its companies by region and industry.</p>
            </div>
            <Card title="Registrations per month" icon={TrendingUp}>
                <TrendLine points={[...complete].reverse().map(month => ({ label: formatMonth(month.month, true), value: month.registrations }))} height={240} />
            </Card>
            <Card title="Months" icon={Calendar} className="mt-4">
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {months.map(month => (
                        <li key={month.month}>
                            <Link to={monthPath(month.month)} className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 hover:border-brand-300 hover:bg-brand-50/40">
                                <span>
                                    <span className="block font-medium text-ink">{formatMonth(month.month)}{!month.complete && <span className="text-xs text-ink-muted font-normal"> (partial)</span>}</span>
                                    <span className="block text-xs text-ink-muted tabular">{formatNumber(month.registrations)} registered · {formatNumber(month.removals)} removed</span>
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
