import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle, Briefcase, Building2, ExternalLink, Globe, MapPin, PieChart, Users
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

// The public GET /api/v1/companies/{nzbn} payload: each related table's rows keep the
// upper-case column names of the Companies Office CSV files.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function StatusPill({ status }: { status: string | null }) {
    const registered = status === 'Registered';
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${registered
            ? 'bg-green-500/10 text-green-400 border-green-500/30'
            : 'bg-gray-500/10 text-gray-300 border-gray-500/30'}`}>
            {status || 'Unknown'}
        </span>
    );
}

/** Whether a record dates from the registration day, or was added or changed afterwards. */
function Since({ start, registered }: { start?: string | null; registered?: string | null }) {
    if (!start) return null;
    if (start === registered) {
        return <span className="inline-flex px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap">At registration</span>;
    }
    const later = Boolean(registered && start > registered);
    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-xs border whitespace-nowrap ${later
            ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
            : 'bg-gray-500/10 text-gray-300 border-gray-500/20'}`}>
            {later ? `Changed ${start}` : `Since ${start}`}
        </span>
    );
}

const joinParts = (...parts: unknown[]) =>
    parts.filter(part => part !== null && part !== undefined && String(part).trim() !== '').join(', ');

const joinName = (...parts: unknown[]) =>
    parts.filter(part => part !== null && part !== undefined && String(part).trim() !== '').join(' ');

function Section({ title, icon: Icon, count, children }: { title: string; icon: LucideIcon; count?: number; children: ReactNode }) {
    return (
        <section className="glass-panel rounded-2xl p-5">
            <h3 className="flex items-center gap-2 font-semibold mb-4">
                <Icon className="w-4 h-4 text-neon-blue" /> {title}
                {count !== undefined && <span className="text-xs font-normal text-gray-500">({count})</span>}
            </h3>
            {children}
        </section>
    );
}

function Field({ label, children }: { label: string; children?: ReactNode }) {
    const empty = children === null || children === undefined || children === '';
    return (
        <div>
            <dt className="text-xs text-gray-500 uppercase tracking-wider">{label}</dt>
            <dd className="text-sm text-white mt-0.5 break-words">{empty ? '-' : children}</dd>
        </div>
    );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm text-gray-500">{children}</p>;

function AddressCard({ label, careOf, lines, start, registered }: {
    label: string; careOf?: string | null; lines: unknown[]; start?: string | null; registered?: string | null;
}) {
    return (
        <div className="rounded-xl border border-dark-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
                <Since start={start} registered={registered} />
            </div>
            {careOf && <p className="text-sm text-gray-400">c/o {careOf}</p>}
            <p className="text-sm text-white">{joinParts(...lines) || '-'}</p>
        </div>
    );
}

export default function CompanyDetail({ nzbn }: { nzbn: string }) {
    const [company, setCompany] = useState<Row | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        setCompany(null);
        setError('');
        fetch(`/api/v1/companies/${nzbn}`)
            .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status === 404 ? 'Company not found' : `HTTP ${res.status}`))))
            .then(setCompany)
            .catch(e => setError(e.message));
    }, [nzbn]);

    if (error) return <p className="p-8 text-red-400">{error}</p>;
    if (!company) return <LoadingSpinner />;

    const registered: string | null = company.REGISTRATION_DATE;
    const addresses: Row = company.addresses || {};
    const special: Row = company.special_entity || {};
    const directors: Row[] = company.directors || [];
    const industries: Row[] = company.industry_classification || [];
    const tradingNames: Row[] = (company.trading_names || []).filter((row: Row) => row.TRADING_NAME && row.TRADING_NAME !== 'No trading name');
    const websites: Row[] = (company.websites || []).filter((row: Row) => row.WEBSITE && row.WEBSITE !== 'No website');
    const tradingAreas: Row[] = company.trading_areas || [];
    const insolvency: Row[] = company.insolvency || [];
    const maoriFactors = special.maori_business
        ? Object.entries(special.maori_business)
            .filter(([key, value]) => /^IDENTIFYING_FACTOR(_\d+)?$/.test(key) && value)
            .map(([, value]) => String(value).replace(/_/g, ' ').toLowerCase())
            .join(', ')
        : '';

    // Shares are allocated in parcels; joint holders appear once per holder with the same parcel.
    const parcelMap = new Map<string, { shares: number; start: string | null; holders: Row[] }>();
    for (const holder of (company.shareholders || []) as Row[]) {
        const key = String(holder.PARCEL_IDENTIFIER ?? holder.SH_NAME);
        const parcel = parcelMap.get(key) ?? { shares: Number(holder.NUMBER_OF_SHARES) || 0, start: holder.START_DATE, holders: [] as Row[] };
        parcel.holders.push(holder);
        parcelMap.set(key, parcel);
    }
    const parcels = Array.from(parcelMap.entries()).sort((a, b) => b[1].shares - a[1].shares);
    const totalShares = parcels.reduce((sum, [, parcel]) => sum + parcel.shares, 0);

    return (
        <div className="p-6 sm:p-8 space-y-5">
            <div className="pr-10">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{company.ENTITY_NAME}</h2>
                    <StatusPill status={company.ENTITY_STATUS} />
                </div>
                <p className="text-sm text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>NZBN <span className="font-mono text-neon-blue">{company.NZBN}</span></span>
                    {registered && <span>Registered {registered}</span>}
                    {company.REMOVAL_DATE && <span>Removed {company.REMOVAL_DATE}</span>}
                    <a href={`/companies/${company.NZBN}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-neon-blue hover:underline">
                        Public page <ExternalLink className="w-3 h-3" />
                    </a>
                </p>
                <p className="text-xs text-gray-500 mt-3">
                    Latest Companies Office data. Records marked "At registration" date from the day the company was registered;
                    anything added or changed later shows its own date.
                </p>
            </div>

            <Section title="Company" icon={Building2}>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Field label="Company number">{company.COMPANY_IDENTIFIER ?? company.INCORPORATION_NUMBER}</Field>
                    <Field label="Type">{company.ENTITY_TYPE}</Field>
                    <Field label="Status">{company.ENTITY_STATUS}</Field>
                    <Field label="Registered">{registered}</Field>
                    <Field label="GST number">
                        {company.gst ? <span className="inline-flex flex-wrap items-center gap-2">{company.gst.GST_NUMBER} <Since start={company.gst.START_DATE} registered={registered} /></span> : null}
                    </Field>
                    <Field label="ABN">{company.abn?.ABN}</Field>
                    {maoriFactors && <Field label="Māori business">{maoriFactors}</Field>}
                </dl>
            </Section>

            <Section title="Industry" icon={Briefcase} count={industries.length}>
                {industries.length === 0 ? <Empty>No industry code recorded.</Empty> : (
                    <ul className="space-y-2">
                        {industries.map((row, index) => (
                            <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-mono text-neon-purple">{row.INDUSTRY_CLASSIFICATION_CODE}</span>
                                <span>{row.INDUSTRY_CLASSIFICATION_DESCRIPTION}</span>
                                <Since start={row.START_DATE} registered={registered} />
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <Section title="Addresses" icon={MapPin}>
                <div className="grid sm:grid-cols-2 gap-3">
                    {(addresses.office || []).map((a: Row, index: number) => (
                        <AddressCard
                            key={`office-${index}`} label="Registered office" careOf={a.REGISTERED_OFFICE_ADDRESS_CARE_OF}
                            lines={[a.REGISTERED_OFFICE_ADDRESS_ADDRESS_1, a.REGISTERED_OFFICE_ADDRESS_ADDRESS_2, a.REGISTERED_OFFICE_ADDRESS_ADDRESS_3,
                                a.REGISTERED_OFFICE_ADDRESS_ADDRESS_4, a.REGISTERED_OFFICE_ADDRESS_POSTCODE, a.REGISTERED_OFFICE_ADDRESS_COUNTRY]}
                            start={a.START_DATE} registered={registered}
                        />
                    ))}
                    {(addresses.service || []).map((a: Row, index: number) => (
                        <AddressCard
                            key={`service-${index}`} label="Address for service" careOf={a.ADDRESS_FOR_SERVICE_CARE_OF}
                            lines={[a.ADDRESS_FOR_SERVICE_1, a.ADDRESS_FOR_SERVICE_2, a.ADDRESS_FOR_SERVICE_3,
                                a.ADDRESS_FOR_SERVICE_4, a.ADDRESS_FOR_SERVICE_POSTCODE, a.ADDRESS_FOR_SERVICE_COUNTRY]}
                            start={a.START_DATE} registered={registered}
                        />
                    ))}
                    {(addresses.public || []).map((a: Row, index: number) => (
                        <AddressCard
                            key={`public-${index}`} label={`Public ${String(a.TYPE || 'address').toLowerCase()} address`} careOf={a.ADDRESS_CARE_OF}
                            lines={[a.ADDRESS_1, a.ADDRESS_2, a.ADDRESS_3, a.ADDRESS_4, a.ADDRESS_POSTCODE, a.ADDRESS_COUNTRY]}
                            start={a.START_DATE} registered={registered}
                        />
                    ))}
                </div>
            </Section>

            <Section title="Directors" icon={Users} count={directors.length}>
                {directors.length === 0 ? <Empty>No current directors recorded.</Empty> : (
                    <ul className="divide-y divide-dark-border">
                        {directors.map((director, index) => (
                            <li key={index} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                                <span>
                                    {joinName(director.FIRST_NAME, director.MIDDLE_NAMES, director.LAST_NAME)}
                                    {director.ASIC_DIR_YN === 'Y' && (
                                        <span className="ml-2 text-xs text-gray-500">
                                            ASIC director{director.ASIC_COMPANY_NAME ? ` - ${director.ASIC_COMPANY_NAME}` : ''}
                                        </span>
                                    )}
                                </span>
                                <Since start={director.START_DATE} registered={registered} />
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <Section title="Shareholding" icon={PieChart} count={parcels.length}>
                {parcels.length === 0 ? <Empty>No shareholders recorded.</Empty> : (
                    <>
                        <p className="text-sm text-gray-400 mb-3">
                            {totalShares.toLocaleString()} shares in {parcels.length} {parcels.length === 1 ? 'parcel' : 'parcels'}
                        </p>
                        <div className="space-y-3">
                            {parcels.map(([key, parcel]) => (
                                <div key={key} className="rounded-xl border border-dark-border p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                        <span className="font-mono text-neon-blue">
                                            {parcel.shares.toLocaleString()} shares
                                            {totalShares > 0 && ` - ${((parcel.shares / totalShares) * 100).toFixed(1)}%`}
                                        </span>
                                        <Since start={parcel.start} registered={registered} />
                                    </div>
                                    <ul className="space-y-2 text-sm">
                                        {parcel.holders.map((holder, index) => {
                                            const address = joinParts(holder.SH_ADDRESS_1, holder.SH_ADDRESS_2, holder.SH_ADDRESS_3,
                                                holder.SH_ADDRESS_4, holder.SH_ADDRESS_POSTCODE, holder.SH_ADDRESS_COUNTRY);
                                            return (
                                                <li key={index}>
                                                    <span className="text-white">{holder.SH_NAME}</span>
                                                    {holder.SH_TYPE && <span className="ml-2 text-xs text-gray-500">{String(holder.SH_TYPE).replace(/^Shareholder\s*/, '')}</span>}
                                                    {address && <div className="text-xs text-gray-500">{address}</div>}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {parcel.holders.length > 1 && <p className="text-xs text-gray-500 mt-2">Held jointly</p>}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Section>

            <Section title="Trading names, areas and websites" icon={Globe}>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Trading names</p>
                        {tradingNames.length === 0 ? <Empty>None</Empty> : tradingNames.map((row, index) => (
                            <div key={index} className="flex flex-wrap items-center gap-2 mb-1">{row.TRADING_NAME} <Since start={row.START_DATE} registered={registered} /></div>
                        ))}
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Trading areas</p>
                        {tradingAreas.length === 0 ? <Empty>None</Empty> : tradingAreas.map((row, index) => (
                            <div key={index} className="flex flex-wrap items-center gap-2 mb-1">{row.TRADING_AREA} <Since start={row.START_DATE} registered={registered} /></div>
                        ))}
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Websites</p>
                        {websites.length === 0 ? <Empty>None</Empty> : websites.map((row, index) => (
                            <div key={index} className="flex flex-wrap items-center gap-2 mb-1">
                                <a
                                    href={String(row.WEBSITE).startsWith('http') ? row.WEBSITE : `https://${row.WEBSITE}`}
                                    target="_blank" rel="noopener noreferrer" className="text-neon-blue hover:underline break-all"
                                >
                                    {row.WEBSITE}
                                </a>
                                <Since start={row.START_DATE} registered={registered} />
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {insolvency.length > 0 && (
                <Section title="Insolvency" icon={AlertTriangle} count={insolvency.length}>
                    <ul className="space-y-3 text-sm">
                        {insolvency.map((row, index) => (
                            <li key={index} className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                                <p className="font-semibold text-red-300">{row.INSOLVENCY_TYPE} <span className="font-normal text-gray-400">- {row.APPOINTMENT_TYPE}</span></p>
                                <p className="text-gray-300 mt-1">
                                    {joinName(row.APPOINTEE_FIRST_NAME, row.APPOINTEE_MIDDLE_NAMES, row.APPOINTEE_LAST_NAME)}
                                    {row.ORGANISATION && <span className="text-gray-500"> ({row.ORGANISATION})</span>}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Appointed {row.APPOINTMENT_DATE || '-'}{row.APPOINTMENT_VACATED_DATE && ` - vacated ${row.APPOINTMENT_VACATED_DATE}`}
                                </p>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </div>
    );
}
