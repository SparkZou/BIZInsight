import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Menu, X, Building2 } from 'lucide-react';
import SearchBar from './SearchBar';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-dark-border/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="p-2 bg-neon-blue/10 rounded-lg group-hover:bg-neon-blue/20 transition-colors">
                            <Building2 className="w-6 h-6 text-neon-blue" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white group-hover:text-neon-blue transition-colors">
                            NZ<span className="text-neon-blue">Companies</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <div className="w-96">
                            <SearchBar />
                        </div>

                        <div className="flex items-center gap-6">
                            <a href="/#features" className="text-sm font-medium text-gray-300 hover:text-neon-blue transition-colors">Features</a>
                            <a href="/#pricing" className="text-sm font-medium text-gray-300 hover:text-neon-blue transition-colors">Pricing</a>
                            <a href="/#contact" className="text-sm font-medium text-gray-300 hover:text-neon-blue transition-colors">Contact</a>
                            <Link
                                to="/dashboard"
                                className="px-5 py-2.5 bg-neon-blue/10 text-neon-blue border border-neon-blue/50 rounded-lg text-sm font-semibold hover:bg-neon-blue hover:text-black transition-all shadow-[0_0_10px_rgba(0,243,255,0.2)] hover:shadow-[0_0_20px_rgba(0,243,255,0.5)]"
                            >
                                Dashboard
                            </Link>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <button
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className="text-gray-300 hover:text-white"
                        >
                            <Search className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-gray-300 hover:text-white"
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Search */}
            {isSearchOpen && (
                <div className="md:hidden px-4 pb-4 border-t border-dark-border">
                    <div className="pt-4">
                        <SearchBar />
                    </div>
                </div>
            )}

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden glass-panel border-t border-dark-border">
                    <div className="px-4 pt-2 pb-6 space-y-2">
                        <a href="/#features" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">Features</a>
                        <a href="/#pricing" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">Pricing</a>
                        <a href="/#contact" className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg">Contact</a>
                        <Link to="/dashboard" className="block px-3 py-2 text-base font-medium text-neon-blue hover:bg-neon-blue/10 rounded-lg">Dashboard</Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
