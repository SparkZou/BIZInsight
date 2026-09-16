import type { MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { ArrowRight, BarChart3, Building2, FileSearch, Scale, Search, Users } from 'lucide-react';
import ContactForm from '../components/ContactForm';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import StatusPill from '../components/StatusPill';
import { apiJson, type DashboardData, type DatasetSummary } from '../lib/api';
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, SOURCE_NAME, companyPath, formatDate, formatMonth, formatNumber, pageMeta } from '../lib/site';

export async function loader() {
    const [dataset, dashboard] = await Promise.all([
        apiJson<DatasetSummary>('/api/v1/dataset'),
        apiJson<DashboardData>('/api/v1/dashboard'),
    ]);
    return { dataset, recent: dashboard.recentRegistrations };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: `${SITE_NAME} - Search New Zealand companies, directors and shareholders`,
    description: data
        ? `${DEFAULT_DESCRIPTION} ${formatNumber(data.dataset.total_companies)} companies, data as at ${formatDate(data.dataset.as_at)}.`
        : DEFAULT_DESCRIPTION,
    path: '/',
    jsonLd: [
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
            potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
                'query-input': 'required name=search_term_string',
            },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'New Zealand company register',
            description: DEFAULT_DESCRIPTION,
            url: SITE_URL,
            creator: { '@type': 'Organization', name: 'New Zealand Companies Office' },
            isBasedOn: 'https://www.companiesoffice.govt.nz/data-services/ways-to-get-our-data/request-access-to-bulk-data/',
            temporalCoverage: data?.dataset.as_at ? `1862/${data.dataset.as_at}` : undefined,
        },
    ],
});

const LOOKUPS = [
    {
        icon: Building2,
        title: 'Company profiles',
        text: 'Registration and removal dates, entity type and status, registered office and address for service, ANZSIC industry, GST and trading names.',
    },
    {
        icon: Users,
        title: 'Directors and shareholders',
        text: 'Current directors with appointment dates, and every shareholding parcel with the number of shares and the type of holder.',
    },
    {
        icon: Scale,
        title: 'Insolvency and status history',
        text: 'Liquidations, receiverships and voluntary administrations with the appointment date, the mechanism and the practitioner.',
    },
];

export default function Home() {
    const { dataset, recent } = useLoaderData<typeof loader>();

    const kpis = [
        { label: 'Companies on the register', value: formatNumber(dataset.total_companies), detail: 'since 1862, including removed companies' },
        { label: 'Currently registered', value: formatNumber(dataset.registered_companies), detail: `${((dataset.registered_companies / dataset.total_companies) * 100).toFixed(1)}% of all records` },
        { label: `Registered in ${formatMonth(dataset.last_full_month)}`, value: formatNumber(dataset.registered_last_month), detail: 'the latest complete month' },
        { label: 'Data as at', value: formatDate(dataset.as_at), detail: 'refreshed from the monthly extract' },
    ];

    return (
        <div className="min-h-screen bg-dark-bg">
            <Navbar />

            <section className="pt-32 pb-16 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.15fr,1fr] gap-12 items-start">
                    <div>
                        <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-xs font-medium mb-8">
                            <FileSearch className="w-3.5 h-3.5" /> Public register data, free to search
                        </p>
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight [text-wrap:balance]">
                            Every New Zealand company, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-purple">in one search</span>
                        </h1>
                        <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-2xl">
                            {formatNumber(dataset.total_companies)} companies from the Companies Office register: who runs them, who owns them,
                            where they are, what they do and what has happened to them. Search by company name, NZBN or director.
                        </p>
                        <div className="max-w-xl mb-10"><SearchBar id="hero-q" large autoFocus /></div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            {kpis.map(kpi => (
                                <div key={kpi.label} className="glass-card p-4 sm:p-5 rounded-xl">
                                    <p className="text-xs sm:text-sm text-gray-400">{kpi.label}</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1 tabular-nums">{kpi.value}</p>
                                    <p className="text-xs text-gray-500 mt-1">{kpi.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel rounded-2xl p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-neon-blue" /> Most recently registered</h2>
                            <Link to="/dashboard" className="text-sm text-neon-blue hover:underline">Dashboard</Link>
                        </div>
                        <ul className="divide-y divide-dark-border">
                            {recent.map(company => (
                                <li key={company.NZBN}>
                                    <Link to={companyPath(company.NZBN, company.ENTITY_NAME)} className="flex items-center justify-between gap-3 py-3 group">
                                        <div className="min-w-0">
                                            <p className="font-medium text-white truncate group-hover:text-neon-blue transition-colors">{company.ENTITY_NAME}</p>
                                            <p className="text-xs text-gray-500 font-mono">{company.NZBN} · {formatDate(company.REGISTRATION_DATE)}</p>
                                        </div>
                                        <StatusPill status={company.ENTITY_STATUS} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="py-20 px-6 bg-white/5">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-3">What you can look up</h2>
                    <p className="text-gray-400 mb-10 max-w-2xl">Everything below comes from the official register, shown as it was on {formatDate(dataset.as_at)}.</p>
                    <div className="grid md:grid-cols-3 gap-6">
                        {LOOKUPS.map(item => (
                            <div key={item.title} className="glass-card p-6 rounded-2xl">
                                <item.icon className="w-8 h-8 text-neon-blue mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{item.text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-10">
                        <Link to="/search" className="px-6 py-3 bg-neon-blue text-black rounded-xl font-bold hover:bg-white transition-colors flex items-center gap-2">
                            <Search className="w-4 h-4" /> Search companies
                        </Link>
                        <Link to="/dashboard" className="px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> Registration trends <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="py-20 px-6">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-3">About the data</h2>
                    <p className="text-gray-400 leading-relaxed mb-4">
                        {SITE_NAME} is built on the {SOURCE_NAME}, a monthly extract of the public registers kept by the New Zealand Companies
                        Office. Each page shows the date of the extract it was drawn from. For filings made since then, check the company on the
                        official <a href="https://companies-register.companiesoffice.govt.nz/" className="text-neon-blue hover:underline" target="_blank" rel="noopener noreferrer">Companies Register</a>.
                    </p>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        {SITE_NAME} is not affiliated with the Companies Office. Names of directors and shareholders are shown exactly as they appear on the
                        public register; if the register has suppressed your details and they still appear here, use the form below and they will be removed.
                    </p>
                </div>
            </section>

            <section id="contact" className="py-20 px-6 bg-white/5">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-3">Get in touch</h2>
                    <p className="text-gray-400 mb-8">Questions about the data, a correction, or a removal request.</p>
                    <div className="glass-panel p-6 sm:p-8 rounded-2xl"><ContactForm /></div>
                </div>
            </section>

            <Footer asAt={dataset.as_at} />
        </div>
    );
}
