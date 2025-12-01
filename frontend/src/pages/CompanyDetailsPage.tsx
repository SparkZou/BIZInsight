import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Building2, MapPin, Users, Briefcase, Calendar,
    FileText, CheckCircle, XCircle, Globe, Shield,
    AlertTriangle, Activity, Database, LayoutGrid
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Background3D from '../components/Background3D';
import LoadingSpinner from '../components/LoadingSpinner';
import CompanyMap from '../components/CompanyMap';
import InfoCard from '../components/InfoCard';
import type { CompanyDetails } from '../types/company';

export default function CompanyDetailsPage() {
    const { id } = useParams();
    const [company, setCompany] = useState<CompanyDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/v1/companies/${id}`);
                if (!res.ok) throw new Error('Company not found');
                const data = await res.json();
                console.log('Company data received:', data);
                setCompany(data);
            } catch (err) {
                setError('Failed to load company details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-bg text-white">
                <Navbar />
                <div className="pt-24">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (error || !company) {
        return (
            <div className="min-h-screen bg-dark-bg text-white">
                <Navbar />
                <div className="max-w-7xl mx-auto px-6 py-32 text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Entity Not Found</h1>
                    <p className="text-gray-400">The requested entity could not be located in the database.</p>
                </div>
            </div>
        );
    }

    // Prepare map locations
    const mapLocations = [
        ...company.addresses.service.map(a => ({
            lat: -36.8485, // Default for now
            lng: 174.7633,
            label: 'Service Address',
            address: `${a.ADDRESS_FOR_SERVICE_1}, ${a.ADDRESS_FOR_SERVICE_POSTCODE}`,
            type: 'Service'
        })),
        ...company.addresses.office.map(a => ({
            lat: -36.8585, // Slight offset for demo
            lng: 174.7633,
            label: 'Registered Office',
            address: `${a.REGISTERED_OFFICE_ADDRESS_ADDRESS_1}, ${a.REGISTERED_OFFICE_ADDRESS_POSTCODE}`,
            type: 'Office'
        }))
    ];

    const hasInsolvency = company.insolvency && company.insolvency.length > 0;
    const isSpecialEntity = Object.values(company.special_entity).some(v => v !== null);

    return (
        <div className="min-h-screen bg-dark-bg text-white relative">
            <Background3D />
            <div className="relative z-10">
                <Navbar />

                <main className="pt-32 pb-12 px-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="glass-panel p-8 mb-8 rounded-2xl relative overflow-hidden">
                        {hasInsolvency && (
                            <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 px-4 py-1 text-xs font-bold uppercase tracking-wider border-bl rounded-bl-xl border-l border-b border-red-500/20">
                                Insolvency Record Found
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">{company.ENTITY_NAME}</h1>
                                <div className="flex flex-wrap items-center gap-4 text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Building2 className="w-4 h-4 text-neon-blue" />
                                        NZBN: <span className="font-mono text-neon-blue">{company.NZBN}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4 text-neon-purple" />
                                        Registered: {company.REGISTRATION_DATE}
                                    </span>
                                    {company.gst && (
                                        <span className="flex items-center gap-1">
                                            <Activity className="w-4 h-4 text-neon-green" />
                                            GST: {company.gst.GST_STATUS_CODE}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 border ${company.ENTITY_STATUS === 'Registered'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                }`}>
                                {company.ENTITY_STATUS === 'Registered' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {company.ENTITY_STATUS}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2 bg-white/5 p-1 rounded-xl mb-8 w-fit border border-white/10">
                        {[
                            { id: 'overview', label: 'Overview', icon: FileText },
                            { id: 'addresses', label: 'Addresses', icon: MapPin },
                            { id: 'people', label: 'People', icon: Users },
                            { id: 'business', label: 'Business', icon: Briefcase },
                            { id: 'compliance', label: 'Compliance', icon: Shield },
                            ...(isSpecialEntity ? [{ id: 'special', label: 'Special Entity', icon: Building2 }] : []),
                            { id: 'raw', label: 'Raw Data', icon: Database },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    ${activeTab === tab.id
                                        ? 'bg-neon-blue/10 text-neon-blue shadow-sm border border-neon-blue/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="glass-panel p-8 rounded-2xl min-h-[400px]">

                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <LayoutGrid className="w-5 h-5 text-neon-blue" />
                                        Core Information
                                    </h2>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <InfoCard label="Entity Type" value={company.ENTITY_TYPE} icon={Building2} />
                                        <InfoCard label="Registration Date" value={company.REGISTRATION_DATE} icon={Calendar} />
                                        <InfoCard label="Status" value={company.ENTITY_STATUS} icon={Activity} />
                                        {company.abn && (
                                            <InfoCard label="Australian Business Number (ABN)" value={company.abn.ABN} subValue={company.abn.STATUS} icon={Globe} />
                                        )}
                                        {company.gst && (
                                            <InfoCard label="GST Status" value={company.gst.GST_STATUS_CODE} subValue={`Effective: ${company.gst.GST_REGISTRATION_DATE}`} icon={CheckCircle} />
                                        )}
                                    </div>
                                </div>

                                {company.industry_classification.length > 0 && (
                                    <div>
                                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                            <Briefcase className="w-5 h-5 text-neon-purple" />
                                            Industry Classification
                                        </h2>
                                        <div className="grid gap-4">
                                            {company.industry_classification.map((ind, idx) => (
                                                <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10">
                                                    <div className="text-neon-purple font-mono font-bold mb-1">{ind.ANZSIC_CODE}</div>
                                                    <div className="text-white">{ind.ANZSIC_DESCRIPTION}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(company.trading_names.length > 0 || company.websites.length > 0) && (
                                    <div className="grid md:grid-cols-2 gap-8">
                                        {company.trading_names.length > 0 && (
                                            <div>
                                                <h2 className="text-xl font-bold text-white mb-4">Trading Names</h2>
                                                <ul className="space-y-2">
                                                    {company.trading_names.map((name, idx) => (
                                                        <li key={idx} className="flex items-center gap-2 text-gray-300 p-3 bg-white/5 rounded-lg">
                                                            <div className="w-2 h-2 rounded-full bg-neon-blue"></div>
                                                            {name.TRADING_NAME}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {company.websites.length > 0 && (
                                            <div>
                                                <h2 className="text-xl font-bold text-white mb-4">Online Presence</h2>
                                                <ul className="space-y-2">
                                                    {company.websites.map((site, idx) => {
                                                        const url = site.WEBSITE;
                                                        if (!url || url === 'No website') return null;

                                                        return (
                                                            <li key={idx}>
                                                                <a
                                                                    href={url.startsWith('http') ? url : `https://${url}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-neon-blue hover:underline p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                                                                >
                                                                    <Globe className="w-4 h-4" />
                                                                    {url}
                                                                </a>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ADDRESSES TAB */}
                        {activeTab === 'addresses' && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-neon-green" />
                                    Locations
                                </h2>
                                <div className="grid lg:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        {/* Service Addresses */}
                                        {company.addresses.service.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Service Addresses</h3>
                                                <div className="space-y-3">
                                                    {company.addresses.service.map((addr, idx) => (
                                                        <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10">
                                                            <div className="text-white">{addr.ADDRESS_FOR_SERVICE_1}</div>
                                                            {addr.ADDRESS_FOR_SERVICE_2 && <div className="text-white">{addr.ADDRESS_FOR_SERVICE_2}</div>}
                                                            <div className="text-gray-400">{addr.ADDRESS_FOR_SERVICE_POSTCODE} {addr.ADDRESS_FOR_SERVICE_COUNTRY}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Registered Office */}
                                        {company.addresses.office.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Registered Office</h3>
                                                <div className="space-y-3">
                                                    {company.addresses.office.map((addr, idx) => (
                                                        <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10">
                                                            <div className="text-white">{addr.REGISTERED_OFFICE_ADDRESS_ADDRESS_1}</div>
                                                            {addr.REGISTERED_OFFICE_ADDRESS_ADDRESS_2 && <div className="text-white">{addr.REGISTERED_OFFICE_ADDRESS_ADDRESS_2}</div>}
                                                            <div className="text-gray-400">{addr.REGISTERED_OFFICE_ADDRESS_POSTCODE} {addr.REGISTERED_OFFICE_ADDRESS_COUNTRY}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-[500px]">
                                        <CompanyMap locations={mapLocations} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PEOPLE TAB */}
                        {activeTab === 'people' && (
                            <div className="space-y-10">
                                {/* Directors */}
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-neon-blue" />
                                        Directors
                                    </h2>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {company.directors.length > 0 ? (
                                            company.directors.map((director, idx) => (
                                                <div key={idx} className="p-4 border border-white/10 rounded-xl bg-white/5 flex items-center gap-4 hover:border-neon-blue/50 transition-colors">
                                                    <div className="w-12 h-12 bg-neon-blue/10 rounded-full flex items-center justify-center text-neon-blue font-bold border border-neon-blue/20 text-lg">
                                                        {director.FIRST_NAME?.[0]}{director.LAST_NAME?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-lg">
                                                            {director.FIRST_NAME} {director.MIDDLE_NAMES && director.MIDDLE_NAMES + ' '}{director.LAST_NAME}
                                                        </div>
                                                        <div className="text-sm text-gray-400 mt-1">
                                                            Appointed: <span className="text-white">{director.START_DATE}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500">No director information available.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Shareholders */}
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-neon-purple" />
                                        Shareholders
                                    </h2>
                                    <div className="overflow-hidden rounded-xl border border-white/10">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5">
                                                <tr>
                                                    <th className="p-4 font-semibold text-gray-400">Name</th>
                                                    <th className="p-4 font-semibold text-gray-400 text-right">Total Shares</th>
                                                    <th className="p-4 font-semibold text-gray-400 text-right">Allocation</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/10">
                                                {company.shareholders.length > 0 ? (
                                                    company.shareholders.map((shareholder, idx) => (
                                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                            <td className="p-4 text-white font-medium">
                                                                {shareholder.SHAREHOLDER_1_FIRST_NAMES} {shareholder.SHAREHOLDER_1_LAST_NAME}
                                                            </td>
                                                            <td className="p-4 font-mono text-neon-blue text-right">
                                                                {shareholder.TOTAL_SHARES}
                                                            </td>
                                                            <td className="p-4 text-gray-400 text-right">
                                                                {shareholder.SHARE_ALLOCATION ? `${shareholder.SHARE_ALLOCATION}%` : '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3} className="p-8 text-center text-gray-500">No shareholder information available.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BUSINESS TAB */}
                        {activeTab === 'business' && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-neon-blue" />
                                    Trading Areas
                                </h2>
                                {company.trading_areas.length > 0 ? (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {company.trading_areas.map((area, idx) => (
                                            <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                                                <MapPin className="w-5 h-5 text-neon-blue" />
                                                <span className="text-white font-medium">{area.TRADING_AREA}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500">No trading area information available.</p>
                                )}
                            </div>
                        )}

                        {/* COMPLIANCE TAB */}
                        {activeTab === 'compliance' && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-neon-green" />
                                    Compliance & Risk
                                </h2>

                                <div className="grid gap-6">
                                    {/* Insolvency */}
                                    {hasInsolvency ? (
                                        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
                                            <div className="flex items-start gap-4">
                                                <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
                                                <div>
                                                    <h3 className="text-lg font-bold text-red-400 mb-2">Insolvency Records Found</h3>
                                                    <div className="space-y-4">
                                                        {company.insolvency.map((rec, idx) => (
                                                            <div key={idx} className="p-4 bg-black/20 rounded-lg">
                                                                <div className="font-bold text-white">{rec.INSOLVENCY_TYPE}</div>
                                                                <div className="text-gray-400 text-sm mt-1">Appointed: {rec.DATE_APPOINTED}</div>
                                                                {rec.PRACTITIONER_NAME && (
                                                                    <div className="text-gray-400 text-sm">Practitioner: {rec.PRACTITIONER_NAME}</div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-4">
                                            <CheckCircle className="w-8 h-8 text-green-500" />
                                            <div>
                                                <h3 className="text-lg font-bold text-green-400">No Insolvency Records</h3>
                                                <p className="text-green-500/70">This entity has no recorded insolvency proceedings.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* SPECIAL ENTITY TAB */}
                        {activeTab === 'special' && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6">Special Entity Designations</h2>
                                <div className="grid gap-4">
                                    {company.special_entity.maori_business && (
                                        <InfoCard
                                            label="Maori Business"
                                            value="Yes"
                                            subValue="Registered as a Maori Business"
                                            icon={Building2}
                                            className="border-neon-purple/50 bg-neon-purple/5"
                                        />
                                    )}
                                    {/* Add other special entity types as needed */}
                                </div>
                            </div>
                        )}

                        {/* RAW DATA TAB */}
                        {activeTab === 'raw' && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Database className="w-5 h-5 text-gray-400" />
                                    Raw Data
                                </h2>
                                <div className="bg-black/50 p-6 rounded-xl border border-white/10 overflow-auto max-h-[600px]">
                                    <pre className="text-xs font-mono text-neon-blue">
                                        {JSON.stringify(company, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
