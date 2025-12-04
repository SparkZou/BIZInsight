import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';
import SearchBar from './SearchBar';
import BizInsightLogo from './BizInsightLogo';

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
                            <BizInsightLogo className="w-8 h-8" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white group-hover:text-neon-blue transition-colors">
                            Biz<span className="text-neon-blue">Insight</span>
                        </span>
                    </Link>
                    <div className="hidden lg:flex items-center ml-3 pl-3 border-l border-white/10 h-8">
                        <span className="text-sm font-medium bg-gradient-to-r from-yellow-600 via-yellow-200 to-yellow-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                            AI-Powered Business Insights
                        </span>
                    </div>

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
                        <div className="px-3 py-2 mb-2">
                            <span className="text-sm font-medium bg-gradient-to-r from-yellow-600 via-yellow-200 to-yellow-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                                AI-Powered Business Insights
                            </span>
                        </div>
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
