import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Building2, Calendar, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Background3D from '../components/Background3D';
import LoadingSpinner from '../components/LoadingSpinner';

interface Company {
    nzbn: string;
    name: string;
    status: string;
    type: string;
    registration_date: string;
}

export default function SearchPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q');
    const [results, setResults] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchResults = async () => {
            if (!query) return;

            setLoading(true);
            setError('');
            try {
                const res = await fetch(`http://localhost:8001/api/v1/companies/search?q=${encodeURIComponent(query)}`);
                if (!res.ok) throw new Error('Failed to fetch results');
                const data = await res.json();
                setResults(data.results);
            } catch (err) {
                setError('An error occurred while searching. Please try again.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query]);

    return (
        <div className="min-h-screen bg-dark-bg text-white relative">
            <Background3D />
            <div className="relative z-10">
                <Navbar />

                <main className="pt-32 pb-12 px-6 max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white">
                            Search Results for "<span className="text-neon-blue">{query}</span>"
                        </h1>
                        <p className="text-gray-400 mt-2">
                            Found {results.length} matching entities
                        </p>
                    </div>

                    {loading && (
                        <LoadingSpinner />
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    {!loading && !error && results.length === 0 && query && (
                        <div className="text-center py-12 glass-panel rounded-xl">
                            <p className="text-gray-400 text-lg">No entities found matching your criteria.</p>
                        </div>
                    )}

                    <div className="grid gap-4">
                        {results.map((company) => (
                            <Link
                                key={company.nzbn}
                                to={`/companies/${company.nzbn}`}
                                className="block glass-card p-6 rounded-xl hover:border-neon-blue/50 transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-semibold text-white mb-1 group-hover:text-neon-blue transition-colors">
                                            {company.name}
                                        </h2>
                                        <div className="flex items-center gap-4 text-sm text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Building2 className="w-4 h-4 text-neon-blue" />
                                                <span className="font-mono">{company.nzbn}</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4 text-neon-purple" />
                                                Registered: {company.registration_date}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${company.status === 'Registered'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                        {company.status}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
