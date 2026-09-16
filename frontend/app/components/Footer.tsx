import { Link } from 'react-router';
import BizInsightLogo from './BizInsightLogo';
import { SITE_NAME, SOURCE_NAME, formatDate } from '../lib/site';

export default function Footer({ asAt }: { asAt: string | null | undefined }) {
    return (
        <footer className="py-10 px-6 border-t border-dark-border bg-black/40">
            <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-[auto,1fr,auto] md:items-start text-sm text-gray-500">
                <Link to="/" className="flex items-center gap-2 text-white">
                    <BizInsightLogo className="w-6 h-6" />
                    <span className="font-bold text-lg">Biz<span className="text-neon-blue">Insight</span></span>
                </Link>
                <p className="max-w-xl leading-relaxed">
                    Data: {SOURCE_NAME}{asAt ? `, as at ${formatDate(asAt)}` : ''}. {SITE_NAME} is not affiliated with the
                    New Zealand Companies Office; for filings made since the extract, check the{' '}
                    <a href="https://companies-register.companiesoffice.govt.nz/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-neon-blue">official register</a>.
                </p>
                <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
                    <Link to="/search" className="hover:text-neon-blue">Search</Link>
                    <Link to="/dashboard" className="hover:text-neon-blue">Dashboard</Link>
                    <Link to="/#contact" className="hover:text-neon-blue">Contact</Link>
                </nav>
            </div>
            <p className="max-w-7xl mx-auto mt-8 text-xs text-gray-600">© {new Date().getFullYear()} {SITE_NAME}</p>
        </footer>
    );
}
