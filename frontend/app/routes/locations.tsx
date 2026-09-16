import type { MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Building2, MapPin } from 'lucide-react';
import AppShell from '../components/AppShell';
import { BarList, Card } from '../components/charts';
import NZMap from '../components/NZMap';
import { loadInsights } from '../lib/pages';
import { SITE_NAME, cityPath, formatDate, formatNumber, pageMeta, regionPath } from '../lib/site';

export async function loader() {
    const { insights, dataset } = await loadInsights();
    return {
        regions: insights.regions.filter(item => item.slug).map(({ top_cities, top_divisions, ...rest }) => rest),
        cities: insights.cities.slice(0, 40).map(({ top_divisions, ...rest }) => rest),
        overview: insights.overview,
        dataset,
    };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: `New Zealand companies by region and city | ${SITE_NAME}`,
    description: `Active companies in every New Zealand region and the largest towns and cities, with growth over the last 12 months, from the Companies Office register${data ? ` as at ${formatDate(data.overview.as_at)}` : ''}.`,
    path: '/locations',
});

export default function Locations() {
    const { regions, cities, overview, dataset } = useLoaderData<typeof loader>();
    return (
        <AppShell asAt={overview.as_at} importedAt={dataset.imported_at}>
            <div className="mb-5">
                <h1 className="text-2xl font-bold">Companies by region and city</h1>
                <p className="text-ink-muted text-sm mt-1">Where New Zealand's {formatNumber(overview.live)} active companies are registered, by the region and town of their registered office.</p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-4 items-start">
                <Card title="Regions" icon={MapPin}>
                    <div className="rounded-lg bg-canvas p-2 max-w-[420px] mx-auto mb-4"><NZMap counts={regions} hrefFor={region => regionPath(region)} compact /></div>
                    <BarList total={overview.live} items={regions.map(item => ({ label: item.region, value: item.live, href: regionPath(item.region) }))} />
                </Card>
                <Card title="Largest towns and cities" icon={Building2}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-ink-muted border-b border-line">
                                <tr><th className="py-2 pr-3 font-medium">City</th><th className="py-2 pr-3 font-medium">Region</th><th className="py-2 pr-3 font-medium text-right">Active</th><th className="py-2 font-medium text-right">New, 12 mo</th></tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {cities.map(city => (
                                    <tr key={`${city.region}-${city.city}`} className="hover:bg-canvas">
                                        <td className="py-2 pr-3"><Link to={cityPath(city.region, city.city)} className="font-medium text-ink hover:text-brand-600">{city.city}</Link></td>
                                        <td className="py-2 pr-3 text-ink-muted"><Link to={regionPath(city.region)} className="hover:text-ink">{city.region}</Link></td>
                                        <td className="py-2 pr-3 text-right tabular">{formatNumber(city.live)}</td>
                                        <td className="py-2 text-right tabular">{formatNumber(city.last12)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
