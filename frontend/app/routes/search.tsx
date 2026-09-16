import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { Building2, Calendar } from 'lucide-react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import StatusPill from '../components/StatusPill';
import { apiJson, type DatasetSummary, type SearchResult } from '../lib/api';
import { SITE_NAME, companyPath, formatDate, pageMeta } from '../lib/site';

const MIN_QUERY = 2;

export async function loader({ request }: LoaderFunctionArgs) {
    const q = (new URL(request.url).searchParams.get('q') || '').trim();
    const datasetPromise = apiJson<DatasetSummary>('/api/v1/dataset');
    if (q.length < MIN_QUERY) {
        return { q, results: [] as SearchResult[], dataset: await datasetPromise };
    }
    const [search, dataset] = await Promise.all([
        apiJson<{ count: number; results: SearchResult[] }>(`/api/v1/companies/search?q=${encodeURIComponent(q)}&limit=50`),
        datasetPromise,
    ]);
    return { q, results: search.results, dataset };
}

// Search pages are for people, not search engines: every query would otherwise become its own indexed URL.
export const meta: MetaFunction<typeof loader> = ({ data }) => pageMeta({
    title: data?.q ? `"${data.q}" - company search | ${SITE_NAME}` : `Search companies | ${SITE_NAME}`,
    description: 'Search the New Zealand company register by company name, NZBN or director name.',
    robots: 'noindex, follow',
});

export default function SearchPage() {
    const { q, results, dataset } = useLoaderData<typeof loader>();

    return (
        <div className="min-h-screen bg-dark-bg">
            <Navbar />
            <main className="pt-32 pb-16 px-6 max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-6">
                    {q ? <>Results for "<span className="text-neon-blue">{q}</span>"</> : 'Search companies'}
                </h1>
                <div className="max-w-2xl mb-8"><SearchBar key={q} id="search-q" large defaultValue={q} autoFocus={!q} /></div>

                {q.length >= MIN_QUERY && (
                    <p className="text-gray-400 mb-6">
                        {results.length === 0 ? 'No companies match.' : `${results.length}${results.length === 50 ? '+' : ''} matching ${results.length === 1 ? 'company' : 'companies'}`}
                        {results.length === 50 && <span className="text-gray-500"> - showing the first 50; add more of the name to narrow it down.</span>}
                    </p>
                )}
                {q && q.length < MIN_QUERY && <p className="text-gray-400 mb-6">Type at least {MIN_QUERY} characters.</p>}
                {!q && (
                    <p className="text-gray-400 mb-6">
                        Company name, NZBN, or the name of a director. Matches are found anywhere in the name.
                    </p>
                )}

                <ul className="grid gap-3">
                    {results.map(company => (
                        <li key={company.nzbn}>
                            <Link to={companyPath(company.nzbn, company.name)} className="block glass-card p-5 rounded-xl group">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-semibold text-white mb-1 group-hover:text-neon-blue transition-colors">{company.name}</h2>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                                            <span className="flex items-center gap-1"><Building2 className="w-4 h-4 text-neon-blue" /><span className="font-mono">{company.nzbn}</span></span>
                                            {company.registration_date && (
                                                <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-neon-purple" />Registered {formatDate(company.registration_date)}</span>
                                            )}
                                            {company.type && <span className="text-gray-500">{company.type}</span>}
                                        </div>
                                    </div>
                                    <StatusPill status={company.status} />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </main>
            <Footer asAt={dataset.as_at} />
        </div>
    );
}
