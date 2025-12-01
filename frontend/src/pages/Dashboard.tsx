import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Building2, Users, TrendingUp, Activity } from 'lucide-react';
import Navbar from '../components/Navbar';
import Background3D from '../components/Background3D';
import LoadingSpinner from '../components/LoadingSpinner';

// Types
interface DashboardData {
    totalCompanies: number;
    companiesByType: { name: string; value: number }[];
    registrationsPerYear: { year: number; count: number }[];
    recentRegistrations: { NZBN: string; ENTITY_NAME: string; REGISTRATION_DATE: string; ENTITY_STATUS: string }[];
}

const COLORS = ['#00f3ff', '#bc13fe', '#0aff00', '#ff0055', '#ffe600'];

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch from Python Backend
                const res = await fetch('http://localhost:8000/api/v1/dashboard');
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

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

    if (!data) {
        return (
            <div className="min-h-screen bg-dark-bg text-white">
                <Navbar />
                <div className="p-8 text-center text-red-500 pt-32">Failed to load data stream.</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-bg text-white relative">
            <Background3D />
            <div className="relative z-10">
                <Navbar />
                <div className="max-w-7xl mx-auto space-y-8 p-8 pt-32">

                    {/* Header */}
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Command Center</h1>
                        <p className="text-gray-400">Real-time surveillance of registered entities</p>
                    </header>

                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="glass-card p-6 rounded-xl flex items-center space-x-4">
                            <div className="p-3 bg-neon-blue/10 rounded-lg border border-neon-blue/20">
                                <Building2 className="w-6 h-6 text-neon-blue" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Total Companies</p>
                                <h3 className="text-2xl font-bold text-white">{data.totalCompanies.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-xl flex items-center space-x-4">
                            <div className="p-3 bg-neon-green/10 rounded-lg border border-neon-green/20">
                                <TrendingUp className="w-6 h-6 text-neon-green" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Active Entities</p>
                                <h3 className="text-2xl font-bold text-white">--</h3> {/* Placeholder if not fetched */}
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-xl flex items-center space-x-4">
                            <div className="p-3 bg-neon-purple/10 rounded-lg border border-neon-purple/20">
                                <Users className="w-6 h-6 text-neon-purple" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Directors</p>
                                <h3 className="text-2xl font-bold text-white">--</h3>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-xl flex items-center space-x-4">
                            <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                <Activity className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">New This Year</p>
                                <h3 className="text-2xl font-bold text-white">--</h3>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Bar Chart: Registrations per Year */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="text-lg font-semibold text-white mb-6">Registration Trend</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.registrationsPerYear}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                        <XAxis dataKey="year" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="count" fill="#00f3ff" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pie Chart: Entity Types */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="text-lg font-semibold text-white mb-6">Entity Distribution</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.companiesByType}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {data.companiesByType.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#9ca3af' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Recent Registrations Table */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-dark-border">
                            <h3 className="text-lg font-semibold text-white">Recent Activity Log</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-white/5 text-gray-200 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Entity Name</th>
                                        <th className="px-6 py-4">NZBN</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Registration Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-border">
                                    {data.recentRegistrations.map((company) => (
                                        <tr key={company.NZBN} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">{company.ENTITY_NAME}</td>
                                            <td className="px-6 py-4 font-mono text-neon-blue">{company.NZBN}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                            ${company.ENTITY_STATUS === 'Registered'
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}
                        `}>
                                                    {company.ENTITY_STATUS}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {new Date(company.REGISTRATION_DATE).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
