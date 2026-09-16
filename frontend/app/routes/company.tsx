import type { ReactNode } from 'react';
import type { HeadersFunction, LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, data, redirect, useLoaderData } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle, ArrowRight, Briefcase, Building2, Calendar, CheckCircle, ExternalLink, Globe, MapPin, PieChart, Scale, Users
} from 'lucide-react';
import AppShell from '../components/AppShell';
import HealthPill from '../components/HealthPill';
import InfoCard from '../components/InfoCard';
import StatusPill from '../components/StatusPill';
import { DIVISION_SHORT, ENTITY_TYPE_NAMES, apiFetch, apiJson, browseQuery, type BrowseResponse, type CompanyRow, type DatasetSummary } from '../lib/api';
import { SITE_NAME, absoluteUrl, cityPath, companyPath, companySlug, formatDate, formatNumber, pageMeta, regionPath, slugify } from '../lib/site';
import type { Address, CompanyDetails } from '../types/company';

const NO_VALUE = new Set(['', 'No trading name', 'No website']);

const HEALTH_FACTORS: { key: 'pts_age' | 'pts_status' | 'pts_insolvency' | 'pts_directors' | 'pts_ownership' | 'pts_presence'; name: string; max: number }[] = [
    { key: 'pts_age', name: 'Age on the register', max: 30 },
    { key: 'pts_status', name: 'Register status', max: 25 },
    { key: 'pts_insolvency', name: 'Insolvency history', max: 15 },
    { key: 'pts_directors', name: 'Directors', max: 12 },
    { key: 'pts_ownership', name: 'Ownership', max: 8 },
    { key: 'pts_presence', name: 'Presence', max: 10 },
];
const divisionSlug = (code: string) => `${code.toLowerCase()}-${slugify(DIVISION_SHORT[code] ?? code)}`;

export async function loader({ params }: LoaderFunctionArgs) {
    const nzbn = params.nzbn || '';
    if (!/^\d{5,13}$/.test(nzbn)) throw data({ message: 'Company not found' }, { status: 404 });

    const [res, dataset, index] = await Promise.all([
        apiFetch(`/api/v1/companies/${nzbn}`),
        apiJson<DatasetSummary>('/api/v1/dataset'),
        apiFetch(`/api/v1/companies/browse?${browseQuery({ q: nzbn, page_size: 1 })}`).then(r => (r.ok ? (r.json() as Promise<BrowseResponse>) : null)).catch(() => null),
    ]);
    if (res.status === 404) throw data({ message: 'Company not found' }, { status: 404 });
    if (!res.ok) throw data({ message: 'The company register is not available right now. Please try again in a moment.' }, { status: 502 });
    const company = (await res.json()) as CompanyDetails;

    // One canonical address per company: the NZBN plus a slug of its current name.
    const slug = companySlug(company.ENTITY_NAME);
    if (params.slug !== slug || nzbn !== company.NZBN) throw redirect(companyPath(company.NZBN, company.ENTITY_NAME), 301);

    const summary: CompanyRow | null = index?.results.find(row => row.nzbn === company.NZBN) ?? null;
    return { company, dataset, summary };
}

export const headers: HeadersFunction = () => ({ 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' });

const lines = (address: Address | undefined, prefix: string) =>
    address ? [1, 2, 3, 4].map(n => address[`${prefix}_${n}`] as string | undefined).filter(v => v && v.trim()) : [];

export const meta: MetaFunction<typeof loader> = ({ data: loaded }) => {
    if (!loaded) return pageMeta({ title: `Company not found | ${SITE_NAME}`, description: '', robots: 'noindex' });
    const { company, dataset, summary } = loaded;
    const office = company.addresses?.office?.[0];
    const city = summary?.city || office?.REGISTERED_OFFICE_ADDRESS_ADDRESS_3 || office?.REGISTERED_OFFICE_ADDRESS_ADDRESS_2;
    const industry = company.industry_classification?.[0]?.ANZSIC_DESCRIPTION;
    const status = company.ENTITY_STATUS === 'Registered' ? 'registered' : `${(company.ENTITY_STATUS || 'unknown status').toLowerCase()}`;
    const type = (ENTITY_TYPE_NAMES[company.ENTITY_TYPE] ?? 'company').toLowerCase();
    const path = companyPath(company.NZBN, company.ENTITY_NAME);
    const description =
        `${company.ENTITY_NAME} (NZBN ${company.NZBN}) is a ${status} New Zealand ${type}, registered ${formatDate(company.REGISTRATION_DATE)}`
        + (industry ? `, ${industry.toLowerCase()}` : '') + (city ? `, ${city}${summary?.region && summary.region !== city ? `, ${summary.region}` : ''}` : '') + '. '
        + `${company.directors?.length ?? 0} director${company.directors?.length === 1 ? '' : 's'}, ${company.shareholders?.length ?? 0} shareholding${company.shareholders?.length === 1 ? '' : 's'}`
        + `, addresses and insolvency history from the Companies Office register as at ${formatDate(dataset.as_at)}.`;

    const websites = (company.websites || []).map(w => w.WEBSITE).filter(w => w && !NO_VALUE.has(w)).map(w => (w.startsWith('http') ? w : `https://${w}`));
    const tradingNames = (company.trading_names || []).map(t => t.TRADING_NAME).filter(t => t && !NO_VALUE.has(t));
    const organization: Record<string, unknown> = {
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
            addressRegion: summary?.region || undefined,
            postalCode: office.REGISTERED_OFFICE_ADDRESS_POSTCODE || undefined,
            addressCountry: 'NZ',
        } : undefined,
    };
    return pageMeta({
        title: `${company.ENTITY_NAME} - NZBN ${company.NZBN} | ${SITE_NAME}`,
        description,
        path,
        jsonLd: [organization, {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Companies', item: absoluteUrl('/search') },
                ...(summary?.region ? [{ '@type': 'ListItem', position: 2, name: summary.region, item: absoluteUrl(regionPath(summary.region)) }] : []),
                { '@type': 'ListItem', position: summary?.region ? 3 : 2, name: company.ENTITY_NAME, item: absoluteUrl(path) },
            ],
        }],
    });
};

function Section({ id, title, icon: Icon, count, children }: { id: string; title: string; icon: LucideIcon; count?: number; children: ReactNode }) {
    return (
        <section id={id} className="card p-5 sm:p-6 scroll-mt-24">
            <h2 className="card-title mb-4"><Icon className="w-4 h-4 text-brand-600" /> {title}{count !== undefined && <span className="text-xs font-normal text-ink-muted">({count})</span>}</h2>
            {children}
        </section>
    );
}

function AddressCard({ label, address, prefix, careOf }: { label: string; address: Address; prefix: string; careOf?: string | null }) {
    return (
        <div className="rounded-lg bg-canvas border border-line p-4">
            <p className="text-xs text-ink-muted mb-1">{label}</p>
            {careOf && <p className="text-sm text-ink-muted">c/o {careOf}</p>}
            {lines(address, prefix).map((line, index) => <p key={index} className="text-sm text-ink">{line}</p>)}
            <p className="text-sm text-ink-2">{[address[`${prefix}_POSTCODE`], address[`${prefix}_COUNTRY`]].filter(Boolean).join(' ')}</p>
            {address.START_DATE && <p className="text-xs text-ink-faint mt-2">Since {formatDate(address.START_DATE)}</p>}
        </div>
    );
}

export default function CompanyPage() {
    const { company, dataset, summary } = useLoaderData<typeof loader>();
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
    const typeName = ENTITY_TYPE_NAMES[company.ENTITY_TYPE] ?? company.ENTITY_TYPE;

    const nav = [
        ['overview', 'Overview'], ['addresses', 'Addresses'], ['directors', 'Directors'], ['shareholders', 'Shareholders'],
        ['trading', 'Trading'], ['compliance', 'Insolvency'], ...(specialEntries.length ? [['special', 'Designations']] : []),
    ];

    return (
        <AppShell asAt={dataset.as_at} importedAt={dataset.imported_at}>
            <nav className="text-xs text-ink-muted mb-3 flex flex-wrap items-center gap-1.5" aria-label="Breadcrumb">
                <Link to="/search" className="hover:text-ink">Companies</Link>
                {summary?.region && <><span>/</span><Link to={regionPath(summary.region)} className="hover:text-ink">{summary.region}</Link></>}
                {summary?.division && <><span>/</span><Link to={`/industries/${divisionSlug(summary.division)}`} className="hover:text-ink">{DIVISION_SHORT[summary.division] ?? summary.division}</Link></>}
                <span>/</span><span className="text-ink truncate max-w-[16rem]">{company.ENTITY_NAME}</span>
            </nav>

            <header className="card p-5 sm:p-6 mb-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Building2 className="w-6 h-6" /></div>
                        <div className="min-w-0">
                            <p className="text-xs text-ink-muted uppercase tracking-wider">New Zealand {typeName.toLowerCase()}</p>
                            <h1 className="text-2xl sm:text-3xl font-bold leading-tight mt-1 [text-wrap:balance]">{company.ENTITY_NAME}</h1>
                            <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-muted mt-2">
                                <div className="flex items-center gap-1.5"><dt>NZBN</dt><dd className="font-medium text-ink tabular">{company.NZBN}</dd></div>
                                {company.COMPANY_IDENTIFIER && <div className="flex items-center gap-1.5"><dt>Company number</dt><dd className="font-medium text-ink tabular">{company.COMPANY_IDENTIFIER}</dd></div>}
                                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><dt>Registered</dt><dd className="font-medium text-ink">{formatDate(company.REGISTRATION_DATE)}</dd></div>
                                {company.REMOVAL_DATE && <div className="flex items-center gap-1.5"><dt>Removed</dt><dd className="font-medium text-ink">{formatDate(company.REMOVAL_DATE)}</dd></div>}
                                {(summary?.city || summary?.region) && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /><dd className="font-medium text-ink">{[summary.city, summary.region].filter(Boolean).join(', ')}</dd></div>}
                            </dl>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {insolvency.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><AlertTriangle className="w-3.5 h-3.5" /> Insolvency record</span>
                        )}
                        <StatusPill status={company.ENTITY_STATUS} large />
                    </div>
                </div>
                <nav className="flex flex-wrap gap-2 mt-5" aria-label="On this page">
                    {nav.map(([id, label]) => <a key={id} href={`#${id}`} className="chip">{label}</a>)}
                </nav>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-4 items-start">
                <div className="space-y-4 min-w-0">
                    <Section id="overview" title="Overview" icon={Building2}>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                            <InfoCard label="Status" value={company.ENTITY_STATUS} icon={registered ? CheckCircle : AlertTriangle} />
                            <InfoCard label="Entity type" value={typeName} icon={Building2} />
                            <InfoCard label="Registration date" value={formatDate(company.REGISTRATION_DATE)} icon={Calendar} />
                            {company.REMOVAL_DATE && <InfoCard label="Removal date" value={formatDate(company.REMOVAL_DATE)} icon={Calendar} />}
                            {company.gst?.GST_NUMBER && <InfoCard label="GST number" value={company.gst.GST_NUMBER} subValue={company.gst.START_DATE ? `Since ${formatDate(company.gst.START_DATE)}` : undefined} icon={CheckCircle} />}
                            {company.abn?.ABN && <InfoCard label="Australian Business Number" value={company.abn.ABN} icon={Globe} />}
                        </div>
                        <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Industry (ANZSIC)</h3>
                        {industries.length === 0 ? <p className="text-sm text-ink-muted">No industry classification recorded.</p> : (
                            <ul className="grid gap-2">
                                {industries.map((industry, index) => (
                                    <li key={index} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3">
                                        <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 text-xs font-semibold tabular">{industry.ANZSIC_CODE}</span>
                                        <span className="text-sm text-ink">{industry.ANZSIC_DESCRIPTION}</span>
                                        {industry.START_DATE && <span className="text-xs text-ink-faint">since {formatDate(industry.START_DATE)}</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    <Section id="addresses" title="Addresses" icon={MapPin}>
                        <div className="grid sm:grid-cols-2 gap-3">
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
                            <p className="text-sm text-ink-muted">No current address on the register{company.REMOVAL_DATE ? ' - the company has been removed' : ''}.</p>
                        )}
                    </Section>

                    <Section id="directors" title="Directors" icon={Users} count={directors.length}>
                        {directors.length === 0 ? <p className="text-sm text-ink-muted">No current directors on the register.</p> : (
                            <ul className="grid sm:grid-cols-2 gap-3">
                                {directors.map((director, index) => (
                                    <li key={index} className="rounded-lg border border-line p-3 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-semibold shrink-0">{director.FIRST_NAME?.[0]}{director.LAST_NAME?.[0]}</div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-ink">{[director.FIRST_NAME, director.MIDDLE_NAMES, director.LAST_NAME].filter(Boolean).join(' ')}</p>
                                            <p className="text-xs text-ink-muted">Appointed {formatDate(director.START_DATE)}{director.ASIC_DIR_YN === 'Y' && director.ASIC_COMPANY_NAME ? ` · ${director.ASIC_COMPANY_NAME}` : ''}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    <Section id="shareholders" title="Shareholders" icon={PieChart} count={shareholders.length}>
                        {shareholders.length === 0 ? <p className="text-sm text-ink-muted">No shareholders on the register.</p> : (
                            <div className="overflow-x-auto rounded-lg border border-line">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-canvas text-xs text-ink-muted">
                                        <tr>
                                            <th className="p-3 font-medium">Shareholder</th>
                                            <th className="p-3 font-medium">Type</th>
                                            <th className="p-3 font-medium text-right">Shares</th>
                                            <th className="p-3 font-medium text-right">Share</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {shareholders.map((holder, index) => (
                                            <tr key={index}>
                                                <td className="p-3 text-ink">{holder.SH_NAME}{holder.START_DATE && <span className="block text-xs text-ink-faint">since {formatDate(holder.START_DATE)}</span>}</td>
                                                <td className="p-3 text-ink-muted">{(holder.SH_TYPE || '').replace(/^Shareholder\s*/, '') || '-'}</td>
                                                <td className="p-3 text-right tabular">{formatNumber(Number(holder.NUMBER_OF_SHARES))}</td>
                                                <td className="p-3 text-right text-ink-muted tabular">{totalShares ? `${((Number(holder.NUMBER_OF_SHARES) / totalShares) * 100).toFixed(1)}%` : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {shareholders.length > 0 && <p className="text-xs text-ink-faint mt-2">{formatNumber(totalShares)} shares in total. Joint holders of one parcel are listed separately.</p>}
                    </Section>

                    <Section id="trading" title="Trading names, websites and areas" icon={Briefcase}>
                        <div className="grid sm:grid-cols-3 gap-5 text-sm">
                            <div>
                                <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Trading names</h3>
                                {tradingNames.length === 0 ? <p className="text-ink-muted">None recorded</p> : tradingNames.map((name, index) => <p key={index} className="text-ink mb-1">{name.TRADING_NAME}</p>)}
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Websites</h3>
                                {websites.length === 0 ? <p className="text-ink-muted">None recorded</p> : websites.map((site, index) => (
                                    <a key={index} href={site.WEBSITE.startsWith('http') ? site.WEBSITE : `https://${site.WEBSITE}`} target="_blank" rel="noopener noreferrer nofollow" className="block text-brand-600 hover:underline break-all mb-1">{site.WEBSITE}</a>
                                ))}
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Trading areas</h3>
                                {tradingAreas.length === 0 ? <p className="text-ink-muted">None recorded</p> : tradingAreas.map((area, index) => <p key={index} className="text-ink mb-1">{area.TRADING_AREA}</p>)}
                            </div>
                        </div>
                    </Section>

                    <Section id="compliance" title="Insolvency" icon={Scale} count={insolvency.length || undefined}>
                        {insolvency.length === 0 ? (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-sm text-emerald-800">
                                <CheckCircle className="w-5 h-5 shrink-0" /> No liquidation, receivership or voluntary administration is recorded against this company.
                            </div>
                        ) : (
                            <ul className="grid gap-3">
                                {insolvency.map((record, index) => (
                                    <li key={index} className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm">
                                        <p className="font-semibold text-rose-800">{record.INSOLVENCY_TYPE}{record.APPOINTMENT_TYPE && <span className="font-normal text-ink-muted"> · {record.APPOINTMENT_TYPE}</span>}</p>
                                        <p className="text-ink-2 mt-1">{[record.APPOINTEE_FIRST_NAME, record.APPOINTEE_MIDDLE_NAMES, record.APPOINTEE_LAST_NAME].filter(Boolean).join(' ')}{record.ORGANISATION && <span className="text-ink-muted"> ({record.ORGANISATION})</span>}</p>
                                        <p className="text-xs text-ink-muted mt-1">Appointed {formatDate(record.APPOINTMENT_DATE) || '-'}{record.APPOINTMENT_VACATED_DATE && ` · vacated ${formatDate(record.APPOINTMENT_VACATED_DATE)}`}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    {specialEntries.length > 0 && (
                        <Section id="special" title="Register designations" icon={Building2}>
                            <div className="grid sm:grid-cols-2 gap-3">
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

                    <p className="text-xs text-ink-muted px-1">
                        Source: New Zealand Companies Office register, monthly bulk data extract as at <span className="text-ink">{formatDate(dataset.as_at)}</span>.
                        Filings made since then are not shown - see the <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline inline-flex items-center gap-1">official register entry <ExternalLink className="w-3 h-3" /></a>.
                        Something wrong, or a suppressed address showing? <Link to="/data-sources" className="text-brand-600 hover:underline">Tell us</Link>.
                    </p>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-20">
                    {summary && (
                        <section className="card p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold">Company Health Indicator</h2>
                                    <p className="text-xs text-ink-muted">From register facts only</p>
                                </div>
                                <HealthPill label={summary.health_label} />
                            </div>
                            {summary.health_label === 'Removed' ? (
                                <p className="text-sm text-ink-muted mt-3">Not scored: the company has been removed from the register.</p>
                            ) : (
                                <>
                                    <p className="mt-3"><span className="text-3xl font-bold tabular">{summary.health_score}</span><span className="text-ink-muted text-sm"> / 100</span></p>
                                    <ul className="mt-3 space-y-2">
                                        {HEALTH_FACTORS.map(factor => (
                                            <li key={factor.key} className="text-xs">
                                                <div className="flex justify-between gap-2 text-ink-2"><span>{factor.name}</span><span className="tabular text-ink-muted">{summary[factor.key]} / {factor.max}</span></div>
                                                <div className="h-1.5 rounded-full bg-canvas mt-1 overflow-hidden"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(summary[factor.key] / factor.max) * 100}%` }} /></div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            <p className="text-xs text-ink-muted mt-3">
                                <Link to="/health-indicator" className="text-brand-600 hover:underline">How this is computed</Link> · <Link to="/data-sources" className="text-brand-600 hover:underline">Report an issue</Link>
                            </p>
                        </section>
                    )}
                    <section className="card p-5">
                        <h2 className="text-sm font-semibold mb-3">At a glance</h2>
                        <dl className="text-sm space-y-2.5">
                            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Status</dt><dd><StatusPill status={company.ENTITY_STATUS} /></dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Age</dt><dd className="font-medium">{company.REGISTRATION_DATE ? `${Math.max(0, Math.floor((new Date(`${dataset.as_at}T00:00:00`).getTime() - new Date(`${company.REGISTRATION_DATE}T00:00:00`).getTime()) / 31557600000))} years` : '-'}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Directors</dt><dd className="font-medium tabular">{directors.length}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Shareholdings</dt><dd className="font-medium tabular">{shareholders.length}</dd></div>
                            {summary?.division && <div className="flex justify-between gap-3"><dt className="text-ink-muted">Industry</dt><dd className="font-medium text-right">{DIVISION_SHORT[summary.division] ?? summary.division}</dd></div>}
                            {summary?.region && <div className="flex justify-between gap-3"><dt className="text-ink-muted">Region</dt><dd className="font-medium">{summary.region}</dd></div>}
                        </dl>
                    </section>
                    {(summary?.region || summary?.division) && (
                        <section className="card p-5">
                            <h2 className="text-sm font-semibold mb-3">Explore similar companies</h2>
                            <ul className="text-sm space-y-2">
                                {summary.division && summary.region && (
                                    <li><Link to={`/industries/${divisionSlug(summary.division)}/${slugify(summary.region)}`} className="text-brand-600 hover:underline inline-flex items-center gap-1">{DIVISION_SHORT[summary.division] ?? summary.division} companies in {summary.region} <ArrowRight className="w-3.5 h-3.5" /></Link></li>
                                )}
                                {summary.city && summary.region && <li><Link to={cityPath(summary.region, summary.city)} className="text-brand-600 hover:underline inline-flex items-center gap-1">Companies in {summary.city} <ArrowRight className="w-3.5 h-3.5" /></Link></li>}
                                {summary.division && <li><Link to={`/industries/${divisionSlug(summary.division)}`} className="text-brand-600 hover:underline inline-flex items-center gap-1">{DIVISION_SHORT[summary.division] ?? summary.division} across New Zealand <ArrowRight className="w-3.5 h-3.5" /></Link></li>}
                                {summary.region && <li><Link to={regionPath(summary.region)} className="text-brand-600 hover:underline inline-flex items-center gap-1">All companies in {summary.region} <ArrowRight className="w-3.5 h-3.5" /></Link></li>}
                                {summary.registration_date && <li><Link to={`/new-companies/${summary.registration_date.slice(0, 7)}`} className="text-brand-600 hover:underline inline-flex items-center gap-1">Registered the same month <ArrowRight className="w-3.5 h-3.5" /></Link></li>}
                            </ul>
                        </section>
                    )}
                </aside>
            </div>
        </AppShell>
    );
}
