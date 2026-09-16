import type { ReactNode } from 'react';
import type { HeadersFunction, LoaderFunctionArgs, MetaFunction } from 'react-router';
import { data, redirect, useLoaderData } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle, Briefcase, Building2, Calendar, CheckCircle, ExternalLink, Globe, MapPin, PieChart, Scale, Users
} from 'lucide-react';
import Footer from '../components/Footer';
import InfoCard from '../components/InfoCard';
import Navbar from '../components/Navbar';
import StatusPill from '../components/StatusPill';
import { apiFetch, apiJson, type DatasetSummary } from '../lib/api';
import { SITE_NAME, absoluteUrl, companyPath, companySlug, formatDate, formatNumber, pageMeta } from '../lib/site';
import type { Address, CompanyDetails } from '../types/company';

const ENTITY_TYPES: Record<string, string> = {
    LTD: 'limited company', ASIC: 'Australian (ASIC) company', NON_ASIC: 'overseas company',
    UNLTD: 'unlimited company', COOP: 'co-operative company',
};
const NO_VALUE = new Set(['', 'No trading name', 'No website']);

export async function loader({ params }: LoaderFunctionArgs) {
    const nzbn = params.nzbn || '';
    if (!/^\d{5,13}$/.test(nzbn)) throw data({ message: 'Company not found' }, { status: 404 });

    const [res, dataset] = await Promise.all([apiFetch(`/api/v1/companies/${nzbn}`), apiJson<DatasetSummary>('/api/v1/dataset')]);
    if (res.status === 404) throw data({ message: 'Company not found' }, { status: 404 });
    if (!res.ok) throw data({ message: 'The company register is not available right now. Please try again in a moment.' }, { status: 502 });
    const company = (await res.json()) as CompanyDetails;

    // One canonical address per company: the NZBN plus a slug of its current name.
    const slug = companySlug(company.ENTITY_NAME);
    if (params.slug !== slug || nzbn !== company.NZBN) throw redirect(companyPath(company.NZBN, company.ENTITY_NAME), 301);

    return { company, dataset };
}

export const headers: HeadersFunction = () => ({ 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' });

const lines = (address: Address | undefined, prefix: string) =>
    address ? [1, 2, 3, 4].map(n => address[`${prefix}_${n}`] as string | undefined).filter(v => v && v.trim()) : [];

export const meta: MetaFunction<typeof loader> = ({ data: loaded }) => {
    if (!loaded) return pageMeta({ title: `Company not found | ${SITE_NAME}`, description: '', robots: 'noindex' });
    const { company, dataset } = loaded;
    const office = company.addresses?.office?.[0];
    const city = office?.REGISTERED_OFFICE_ADDRESS_ADDRESS_3 || office?.REGISTERED_OFFICE_ADDRESS_ADDRESS_2;
    const industry = company.industry_classification?.[0]?.ANZSIC_DESCRIPTION;
    const status = company.ENTITY_STATUS === 'Registered' ? 'registered' : `${(company.ENTITY_STATUS || 'unknown status').toLowerCase()}`;
    const type = ENTITY_TYPES[company.ENTITY_TYPE] ?? 'company';
    const path = companyPath(company.NZBN, company.ENTITY_NAME);
    const description =
        `${company.ENTITY_NAME} (NZBN ${company.NZBN}) is a ${status} New Zealand ${type}, registered ${formatDate(company.REGISTRATION_DATE)}`
        + (industry ? `, ${industry.toLowerCase()}` : '') + (city ? `, ${city}` : '') + '. '
        + `${company.directors?.length ?? 0} director${company.directors?.length === 1 ? '' : 's'}, ${company.shareholders?.length ?? 0} shareholding${company.shareholders?.length === 1 ? '' : 's'}`
        + `, addresses and insolvency history from the Companies Office register as at ${formatDate(dataset.as_at)}.`;

    const websites = (company.websites || []).map(w => w.WEBSITE).filter(w => w && !NO_VALUE.has(w)).map(w => (w.startsWith('http') ? w : `https://${w}`));
    const tradingNames = (company.trading_names || []).map(t => t.TRADING_NAME).filter(t => t && !NO_VALUE.has(t));
    const jsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: company.ENTITY_NAME,
        legalName: company.ENTITY_NAME,
        identifier: { '@type': 'PropertyValue', propertyID: 'NZBN', value: company.NZBN },
        url: absoluteUrl(path),
        foundingDate: company.REGISTRATION_DATE || undefined,
        dissolutionDate: company.REMOVAL_DATE || undefined,
        alternateName: tradingNames.length ? tradingNames : undefined,
        sameAs: websites.length ? websites : undefined,
        address: office ? {
            '@type': 'PostalAddress',
            streetAddress: lines(office, 'REGISTERED_OFFICE_ADDRESS_ADDRESS').slice(0, 2).join(', ') || undefined,
            addressLocality: city || undefined,
            postalCode: office.REGISTERED_OFFICE_ADDRESS_POSTCODE || undefined,
            addressCountry: 'NZ',
        } : undefined,
    };
    return pageMeta({
        title: `${company.ENTITY_NAME} - NZBN ${company.NZBN} | ${SITE_NAME}`,
        description,
        path,
        jsonLd: [jsonLd, {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Companies', item: absoluteUrl('/search') },
                { '@type': 'ListItem', position: 2, name: company.ENTITY_NAME, item: absoluteUrl(path) },
            ],
        }],
    });
};

function Section({ id, title, icon: Icon, count, children }: { id: string; title: string; icon: LucideIcon; count?: number; children: ReactNode }) {
    return (
        <section id={id} className="glass-panel rounded-2xl p-6 sm:p-8 scroll-mt-28">
            <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <Icon className="w-5 h-5 text-neon-blue" /> {title}
                {count !== undefined && <span className="text-sm font-normal text-gray-500">({count})</span>}
            </h2>
            {children}
        </section>
    );
}

function AddressCard({ label, address, prefix, careOf }: { label: string; address: Address; prefix: string; careOf?: string | null }) {
    return (
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            {careOf && <p className="text-gray-400 text-sm">c/o {careOf}</p>}
            {lines(address, prefix).map((line, index) => <p key={index} className="text-white">{line}</p>)}
            <p className="text-gray-400">{[address[`${prefix}_POSTCODE`], address[`${prefix}_COUNTRY`]].filter(Boolean).join(' ')}</p>
            {address.START_DATE && <p className="text-xs text-gray-500 mt-2">Since {formatDate(address.START_DATE)}</p>}
        </div>
    );
}

export default function CompanyPage() {
    const { company, dataset } = useLoaderData<typeof loader>();
    const registered = company.ENTITY_STATUS === 'Registered';
    const insolvency = company.insolvency || [];
    const directors = company.directors || [];
    const shareholders = [...(company.shareholders || [])].sort((a, b) => Number(b.NUMBER_OF_SHARES) - Number(a.NUMBER_OF_SHARES));
    const totalShares = shareholders.reduce((sum, holder) => sum + (Number(holder.NUMBER_OF_SHARES) || 0), 0);
    const tradingNames = (company.trading_names || []).filter(t => t.TRADING_NAME && !NO_VALUE.has(t.TRADING_NAME));
    const websites = (company.websites || []).filter(w => w.WEBSITE && !NO_VALUE.has(w.WEBSITE));
    const tradingAreas = company.trading_areas || [];
    const industries = company.industry_classification || [];
    const special = company.special_entity || {};
    const specialEntries = Object.entries(special).filter(([, value]) => value);
    const officialUrl = company.COMPANY_IDENTIFIER
        ? `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/${company.COMPANY_IDENTIFIER}`
        : `https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/search?q=${company.NZBN}`;

    const nav = [
        ['overview', 'Overview'], ['addresses', 'Addresses'], ['directors', 'Directors'], ['shareholders', 'Shareholders'],
        ['trading', 'Trading'], ['compliance', 'Compliance'], ...(specialEntries.length ? [['special', 'Designations']] : []),
    ];

    return (
        <div className="min-h-screen bg-dark-bg">
            <Navbar />
            <main className="pt-32 pb-16 px-6 max-w-6xl mx-auto space-y-6">
                <header className="glass-panel p-6 sm:p-8 rounded-2xl">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">New Zealand {ENTITY_TYPES[company.ENTITY_TYPE] ?? 'company'}</p>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 [text-wrap:balance]">{company.ENTITY_NAME}</h1>
                            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
                                <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-neon-blue" /><dt>NZBN</dt><dd className="font-mono text-neon-blue">{company.NZBN}</dd></div>
                                {company.COMPANY_IDENTIFIER && <div className="flex items-center gap-1.5"><dt>Company number</dt><dd className="font-mono text-white">{company.COMPANY_IDENTIFIER}</dd></div>}
                                <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-neon-purple" /><dt>Registered</dt><dd className="text-white">{formatDate(company.REGISTRATION_DATE)}</dd></div>
                                {company.REMOVAL_DATE && <div className="flex items-center gap-1.5"><dt>Removed</dt><dd className="text-white">{formatDate(company.REMOVAL_DATE)}</dd></div>}
                            </dl>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {insolvency.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/30">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Insolvency record
                                </span>
                            )}
                            <StatusPill status={company.ENTITY_STATUS} large />
                        </div>
                    </div>
                    <nav className="flex flex-wrap gap-2 mt-6" aria-label="On this page">
                        {nav.map(([id, label]) => (
                            <a key={id} href={`#${id}`} className="px-3 py-1.5 rounded-lg text-sm text-gray-300 bg-white/5 border border-white/10 hover:text-neon-blue hover:border-neon-blue/40 transition-colors">{label}</a>
                        ))}
                    </nav>
                </header>

                <Section id="overview" title="Overview" icon={Building2}>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <InfoCard label="Status" value={company.ENTITY_STATUS} icon={registered ? CheckCircle : AlertTriangle} />
                        <InfoCard label="Entity type" value={ENTITY_TYPES[company.ENTITY_TYPE] ?? company.ENTITY_TYPE} icon={Building2} />
                        <InfoCard label="Registration date" value={formatDate(company.REGISTRATION_DATE)} icon={Calendar} />
                        {company.REMOVAL_DATE && <InfoCard label="Removal date" value={formatDate(company.REMOVAL_DATE)} icon={Calendar} />}
                        {company.gst?.GST_NUMBER && <InfoCard label="GST number" value={company.gst.GST_NUMBER} subValue={company.gst.START_DATE ? `Since ${formatDate(company.gst.START_DATE)}` : undefined} icon={CheckCircle} />}
                        {company.abn?.ABN && <InfoCard label="Australian Business Number" value={company.abn.ABN} icon={Globe} />}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Industry (ANZSIC)</h3>
                    {industries.length === 0 ? <p className="text-gray-500 text-sm">No industry classification recorded.</p> : (
                        <ul className="grid gap-2">
                            {industries.map((industry, index) => (
                                <li key={index} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                                    <span className="px-2.5 py-1 bg-white/10 rounded-lg font-mono text-sm text-neon-purple">{industry.ANZSIC_CODE}</span>
                                    <span className="text-white">{industry.ANZSIC_DESCRIPTION}</span>
                                    {industry.START_DATE && <span className="text-xs text-gray-500">since {formatDate(industry.START_DATE)}</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section id="addresses" title="Addresses" icon={MapPin}>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {(company.addresses?.office || []).map((address, index) => (
                            <AddressCard key={`office-${index}`} label="Registered office" address={address} prefix="REGISTERED_OFFICE_ADDRESS_ADDRESS" careOf={address.REGISTERED_OFFICE_ADDRESS_CARE_OF} />
                        ))}
                        {(company.addresses?.service || []).map((address, index) => (
                            <AddressCard key={`service-${index}`} label="Address for service" address={address} prefix="ADDRESS_FOR_SERVICE" careOf={address.ADDRESS_FOR_SERVICE_CARE_OF} />
                        ))}
                        {(company.addresses?.public || []).map((address, index) => (
                            <AddressCard key={`public-${index}`} label={`${(address.TYPE || 'Public').toString().toLowerCase().replace(/^./, c => c.toUpperCase())} address`} address={address} prefix="ADDRESS" careOf={address.ADDRESS_CARE_OF} />
                        ))}
                    </div>
                    {!company.addresses?.office?.length && !company.addresses?.service?.length && !company.addresses?.public?.length && (
                        <p className="text-gray-500 text-sm">No current address on the register{company.REMOVAL_DATE ? ' - the company has been removed' : ''}.</p>
                    )}
                </Section>

                <Section id="directors" title="Directors" icon={Users} count={directors.length}>
                    {directors.length === 0 ? <p className="text-gray-500 text-sm">No current directors on the register.</p> : (
                        <ul className="grid sm:grid-cols-2 gap-3">
                            {directors.map((director, index) => (
                                <li key={index} className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue font-bold shrink-0">
                                        {director.FIRST_NAME?.[0]}{director.LAST_NAME?.[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-white">{[director.FIRST_NAME, director.MIDDLE_NAMES, director.LAST_NAME].filter(Boolean).join(' ')}</p>
                                        <p className="text-sm text-gray-400">Appointed {formatDate(director.START_DATE)}{director.ASIC_DIR_YN === 'Y' && director.ASIC_COMPANY_NAME ? ` · ${director.ASIC_COMPANY_NAME}` : ''}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section id="shareholders" title="Shareholders" icon={PieChart} count={shareholders.length}>
                    {shareholders.length === 0 ? <p className="text-gray-500 text-sm">No shareholders on the register.</p> : (
                        <div className="overflow-x-auto rounded-xl border border-white/10">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 text-gray-400">
                                    <tr>
                                        <th className="p-3 font-medium">Shareholder</th>
                                        <th className="p-3 font-medium">Type</th>
                                        <th className="p-3 font-medium text-right">Shares</th>
                                        <th className="p-3 font-medium text-right">Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {shareholders.map((holder, index) => (
                                        <tr key={index}>
                                            <td className="p-3 text-white">
                                                {holder.SH_NAME}
                                                {holder.START_DATE && <span className="block text-xs text-gray-500">since {formatDate(holder.START_DATE)}</span>}
                                            </td>
                                            <td className="p-3 text-gray-400">{(holder.SH_TYPE || '').replace(/^Shareholder\s*/, '') || '-'}</td>
                                            <td className="p-3 text-right font-mono text-neon-blue tabular-nums">{formatNumber(Number(holder.NUMBER_OF_SHARES))}</td>
                                            <td className="p-3 text-right text-gray-400 tabular-nums">{totalShares ? `${((Number(holder.NUMBER_OF_SHARES) / totalShares) * 100).toFixed(1)}%` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {shareholders.length > 0 && <p className="text-xs text-gray-500 mt-3">{formatNumber(totalShares)} shares in total. Joint holders of one parcel are listed separately.</p>}
                </Section>

                <Section id="trading" title="Trading names, websites and areas" icon={Briefcase}>
                    <div className="grid sm:grid-cols-3 gap-6 text-sm">
                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Trading names</h3>
                            {tradingNames.length === 0 ? <p className="text-gray-500">None recorded</p> : tradingNames.map((name, index) => <p key={index} className="text-white mb-1">{name.TRADING_NAME}</p>)}
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Websites</h3>
                            {websites.length === 0 ? <p className="text-gray-500">None recorded</p> : websites.map((site, index) => (
                                <a key={index} href={site.WEBSITE.startsWith('http') ? site.WEBSITE : `https://${site.WEBSITE}`} target="_blank" rel="noopener noreferrer nofollow" className="block text-neon-blue hover:underline break-all mb-1">{site.WEBSITE}</a>
                            ))}
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Trading areas</h3>
                            {tradingAreas.length === 0 ? <p className="text-gray-500">None recorded</p> : tradingAreas.map((area, index) => <p key={index} className="text-white mb-1">{area.TRADING_AREA}</p>)}
                        </div>
                    </div>
                </Section>

                <Section id="compliance" title="Insolvency" icon={Scale} count={insolvency.length || undefined}>
                    {insolvency.length === 0 ? (
                        <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-4">
                            <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
                            <p className="text-green-300">No liquidation, receivership or voluntary administration is recorded against this company.</p>
                        </div>
                    ) : (
                        <ul className="grid gap-3">
                            {insolvency.map((record, index) => (
                                <li key={index} className="p-5 bg-red-500/10 border border-red-500/30 rounded-xl">
                                    <p className="font-semibold text-red-300">{record.INSOLVENCY_TYPE}{record.APPOINTMENT_TYPE && <span className="font-normal text-gray-400"> · {record.APPOINTMENT_TYPE}</span>}</p>
                                    <p className="text-gray-300 mt-1">
                                        {[record.APPOINTEE_FIRST_NAME, record.APPOINTEE_MIDDLE_NAMES, record.APPOINTEE_LAST_NAME].filter(Boolean).join(' ')}
                                        {record.ORGANISATION && <span className="text-gray-500"> ({record.ORGANISATION})</span>}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Appointed {formatDate(record.APPOINTMENT_DATE) || '-'}{record.APPOINTMENT_VACATED_DATE && ` · vacated ${formatDate(record.APPOINTMENT_VACATED_DATE)}`}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                {specialEntries.length > 0 && (
                    <Section id="special" title="Register designations" icon={Building2}>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {special.maori_business && (
                                <InfoCard label="Māori business" value="Yes" icon={Building2} subValue={Object.entries(special.maori_business)
                                    .filter(([key, value]) => /^IDENTIFYING_FACTOR(_\d+)?$/.test(key) && value)
                                    .map(([, value]) => String(value).replace(/_/g, ' ').toLowerCase()).join(', ') || undefined} />
                            )}
                            {special.charitable_trust_board && <InfoCard label="Charitable trust board" value={special.charitable_trust_board.ENTITY_NAME || 'Yes'} icon={Building2} subValue={special.charitable_trust_board.CHARITIES_REGISTER_NUMBER ? `Charities register ${special.charitable_trust_board.CHARITIES_REGISTER_NUMBER}` : undefined} />}
                            {special.other_incorporated && <InfoCard label="Other incorporated entity" value={special.other_incorporated.ENTITY_NAME || 'Yes'} icon={Building2} subValue={special.other_incorporated.ENTITY_TYPE} />}
                            {special.public_sector && <InfoCard label="Public sector entity" value={special.public_sector.ENTITY_NAME || 'Yes'} icon={Building2} subValue={special.public_sector.ENTITY_TYPE} />}
                            {special.unincorporated && <InfoCard label="Unincorporated entity" value={special.unincorporated.ENTITY_NAME || 'Yes'} icon={Building2} subValue={special.unincorporated.ENTITY_TYPE} />}
                        </div>
                    </Section>
                )}

                <section className="text-sm text-gray-500 px-2">
                    <p>
                        Source: New Zealand Companies Office register, monthly bulk data extract as at <span className="text-gray-300">{formatDate(dataset.as_at)}</span>.
                        Filings made since then are not shown here - see the{' '}
                        <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline inline-flex items-center gap-1">official register entry <ExternalLink className="w-3 h-3" /></a>.
                        Something wrong or a suppressed address showing? <a href="/#contact" className="text-neon-blue hover:underline">Tell us</a> and it will be corrected.
                    </p>
                </section>
            </main>
            <Footer asAt={dataset.as_at} />
        </div>
    );
}
