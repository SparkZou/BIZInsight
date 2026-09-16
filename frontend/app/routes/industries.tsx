import type { MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowRight, Briefcase } from 'lucide-react';
import AppShell from '../components/AppShell';
import { BarList, Card } from '../components/charts';
import { loadInsights } from '../lib/pages';
import { SITE_NAME, formatDate, formatNumber, pageMeta, percentChange } from '../lib/site';

export async function loader() {
    const { insights, dataset } = await loadInsights();
    return { divisions: insights.divisions.map(({ top_classes, regions, ...rest }) => rest), overview: insights.overview, dataset };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: `New Zealand companies by industry - all 19 ANZSIC divisions | ${SITE_NAME}`,
    description: `How many active New Zealand companies there are in each industry, how fast each is growing and how often companies fail, from the Companies Office register${data ? ` as at ${formatDate(data.overview.as_at)}` : ''}.`,
    path: '/industries',
});

export default function Industries() {
    const { divisions, overview, dataset } = useLoaderData<typeof loader>();
    const withIndustry = divisions.reduce((sum, item) => sum + item.live, 0);
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">Companies by industry</h1>
                <p className="text-ink-muted text-sm mt-1">{formatNumber(withIndustry)} of {formatNumber(overview.live)} active companies have filed an ANZSIC industry classification. Pick an industry for its regions, specialities and newest companies.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-4 items-start">
                <Card title="Active companies by industry" icon={Briefcase}>
                    <BarList total={withIndustry} items={divisions.map(item => ({ label: item.short, value: item.live, href: `/industries/${item.slug}` }))} />
                </Card>
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[560px]">
                            <thead className="text-xs text-ink-muted border-b border-line bg-canvas">
                                <tr>
                                    <th className="py-2.5 px-4 font-medium">Industry</th>
                                    <th className="py-2.5 px-3 font-medium text-right">Active</th>
                                    <th className="py-2.5 px-3 font-medium text-right">New, 12 mo</th>
                                    <th className="py-2.5 px-3 font-medium text-right">Growth</th>
                                    <th className="py-2.5 px-3 font-medium text-right">10+ yrs</th>
                                    <th className="py-2.5 px-3 font-medium text-right">Liq. ‰</th>
                                    <th className="py-2.5 px-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {divisions.map(item => {
                                    const growth = percentChange(item.last12, item.prior12);
                                    return (
                                        <tr key={item.code} className="hover:bg-canvas">
                                            <td className="py-2.5 px-4"><Link to={`/industries/${item.slug}`} className="font-medium text-ink hover:text-brand-600">{item.name}</Link></td>
                                            <td className="py-2.5 px-3 text-right tabular">{formatNumber(item.live)}</td>
                                            <td className="py-2.5 px-3 text-right tabular">{formatNumber(item.last12)}</td>
                                            <td className={`py-2.5 px-3 text-right tabular ${growth === null ? 'text-ink-muted' : growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{growth === null ? '-' : `${growth >= 0 ? '+' : ''}${growth.toFixed(0)}%`}</td>
                                            <td className="py-2.5 px-3 text-right tabular">{Math.round((item.established_share ?? 0) * 100)}%</td>
                                            <td className="py-2.5 px-3 text-right tabular">{item.liquidations_per_1000 ?? '-'}</td>
                                            <td className="py-2.5 px-2 text-ink-faint"><ArrowRight className="w-4 h-4" /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-ink-faint px-4 py-3 border-t border-line">Growth: new registrations in the last 12 months against the 12 before. 10+ yrs: share of active companies registered ten or more years ago. Liq. ‰: liquidations per 1,000 active companies in the last 12 months.</p>
                </div>
            </div>
        </AppShell>
    );
}
