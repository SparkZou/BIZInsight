import { useState } from 'react';
import { Link } from 'react-router';
import { Menu, Search, X } from 'lucide-react';
import BizInsightLogo from './BizInsightLogo';
import SearchBar from './SearchBar';

const LINKS = [
    { to: '/search', label: 'Search' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/#contact', label: 'Contact' },
];

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-dark-border/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20 gap-6">
                    <Link to="/" className="flex items-center gap-2 group shrink-0">
                        <div className="p-2 bg-neon-blue/10 rounded-lg group-hover:bg-neon-blue/20 transition-colors">
                            <BizInsightLogo className="w-7 h-7" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white group-hover:text-neon-blue transition-colors">
                            Biz<span className="text-neon-blue">Insight</span>
                        </span>
                        <span className="hidden lg:inline text-sm text-gray-500 ml-2 pl-3 border-l border-white/10">NZ company register</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8 min-w-0">
                        <div className="w-80 lg:w-96"><SearchBar id="nav-q" /></div>
                        <div className="flex items-center gap-6">
                            {LINKS.map(link => (
                                <Link key={link.to} to={link.to} className="text-sm font-medium text-gray-300 hover:text-neon-blue transition-colors whitespace-nowrap">{link.label}</Link>
                            ))}
                        </div>
                    </div>

                    <div className="md:hidden flex items-center gap-4">
                        <button onClick={() => setSearchOpen(!searchOpen)} className="text-gray-300 hover:text-white" aria-label="Search" aria-expanded={searchOpen}>
                            <Search className="w-6 h-6" />
                        </button>
                        <button onClick={() => setMenuOpen(!menuOpen)} className="text-gray-300 hover:text-white" aria-label="Menu" aria-expanded={menuOpen}>
                            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {searchOpen && (
                <div className="md:hidden px-4 pb-4 border-t border-dark-border">
                    <div className="pt-4"><SearchBar id="mobile-q" autoFocus /></div>
                </div>
            )}

            {menuOpen && (
                <div className="md:hidden glass-panel border-t border-dark-border">
                    <div className="px-4 pt-2 pb-6 space-y-1">
                        {LINKS.map(link => (
                            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">{link.label}</Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
}
