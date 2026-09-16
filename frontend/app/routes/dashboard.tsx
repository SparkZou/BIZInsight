import type { MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ClientOnly from '../components/ClientOnly';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import StatusPill from '../components/StatusPill';
import { apiJson, type DashboardData, type DatasetSummary } from '../lib/api';
import { SITE_NAME, companyPath, formatDate, formatMonth, formatNumber, pageMeta } from '../lib/site';

const COLORS = ['#00f3ff', '#bc13fe', '#0aff00', '#ff0055', '#ffe600'];
const ENTITY_TYPES: Record<string, string> = {
    LTD: 'Limited company', ASIC: 'Australian (ASIC) company', NON_ASIC: 'Overseas company',
    UNLTD: 'Unlimited company', COOP: 'Co-operative company',
};

export async function loader() {
    const [dashboard, dataset] = await Promise.all([
        apiJson<DashboardData>('/api/v1/dashboard'),
        apiJson<DatasetSummary>('/api/v1/dataset'),
    ]);
    return { dashboard, dataset };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: `Company registrations in New Zealand by year and type | ${SITE_NAME}`,
    description: `How many companies are registered in New Zealand each year, the split by entity type, and the latest registrations. ${data ? `Data as at ${formatDate(data.dataset.as_at)}.` : ''}`,
    path: '/dashboard',
});

export default function Dashboard() {
    const { dashboard, dataset } = useLoaderData<typeof loader>();
    const byType = dashboard.companiesByType.map(row => ({ ...row, label: ENTITY_TYPES[row.name] ?? row.name }));

    const kpis = [
        { label: 'Companies on the register', value: formatNumber(dataset.total_companies) },
        { label: 'Currently registered', value: formatNumber(dataset.registered_companies) },
        { label: `Registered in ${formatMonth(dataset.last_full_month)}`, value: formatNumber(dataset.registered_last_month) },
        { label: 'Removed from the register', value: formatNumber(dataset.removed_companies) },
    ];

    return (
        <div className="min-h-screen bg-dark-bg">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 pt-32 pb-16 space-y-8">
                <header>
                    <h1 className="text-3xl font-bold text-white mb-2">Company registrations in New Zealand</h1>
                    <p className="text-gray-400">From the Companies Office register, as at {formatDate(dataset.as_at)}.</p>
                </header>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpis.map(kpi => (
                        <div key={kpi.label} className="glass-card p-5 rounded-xl">
                            <p className="text-sm text-gray-400">{kpi.label}</p>
                            <p className="text-2xl sm:text-3xl font-bold text-white mt-1 tabular-nums">{kpi.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <section className="glass-panel p-6 rounded-xl">
                        <h2 className="text-lg font-semibold text-white mb-1">Registrations per year</h2>
                        <p className="text-sm text-gray-500 mb-4">The current year is only partly in the data.</p>
                        <div className="h-80">
                            <ClientOnly>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboard.registrationsPerYear}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                                        <XAxis dataKey="year" stroke="#9ca3af" tickLine={false} />
                                        <YAxis stroke="#9ca3af" tickLine={false} tickFormatter={value => `${Math.round(value / 1000)}k`} />
                                        <Tooltip formatter={value => [formatNumber(Number(value ?? 0)), 'Registered']} contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                        <Bar dataKey="count" fill="#00f3ff" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ClientOnly>
                        </div>
                    </section>

                    <section className="glass-panel p-6 rounded-xl">
                        <h2 className="text-lg font-semibold text-white mb-1">Entity types</h2>
                        <p className="text-sm text-gray-500 mb-4">Limited companies are 99% of the register; the rest are shown for completeness.</p>
                        <div className="h-80">
                            <ClientOnly>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={byType} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4}>
                                            {byType.map((_entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />)}
                                        </Pie>
                                        <Tooltip formatter={value => formatNumber(Number(value ?? 0))} contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#9ca3af' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ClientOnly>
                        </div>
                        <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                            {byType.map((row, index) => (
                                <li key={row.name} className="flex justify-between gap-3">
                                    <span className="flex items-center gap-2 text-gray-300"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />{row.label}</span>
                                    <span className="font-mono text-gray-400 tabular-nums">{formatNumber(row.value)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

                <section className="glass-panel rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-dark-border">
                        <h2 className="text-lg font-semibold text-white">Most recently registered</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-white/5 text-gray-200 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Company</th>
                                    <th className="px-6 py-3">NZBN</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Registered</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-border">
                                {dashboard.recentRegistrations.map(company => (
                                    <tr key={company.NZBN} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-3 font-medium">
                                            <Link to={companyPath(company.NZBN, company.ENTITY_NAME)} className="text-white hover:text-neon-blue transition-colors">{company.ENTITY_NAME}</Link>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-neon-blue">{company.NZBN}</td>
                                        <td className="px-6 py-3"><StatusPill status={company.ENTITY_STATUS} /></td>
                                        <td className="px-6 py-3 whitespace-nowrap">{formatDate(company.REGISTRATION_DATE)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
            <Footer asAt={dataset.as_at} />
        </div>
    );
}
