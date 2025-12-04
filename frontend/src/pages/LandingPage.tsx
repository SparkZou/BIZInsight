import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Database, Zap, Lock, TrendingUp, ArrowRight,
    Building2, Globe, Shield, Users, Activity,
    Briefcase, DollarSign, Star, AlertTriangle, Search,
    BarChart3
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ContactForm from '../components/ContactForm';
import Background3D from '../components/Background3D';
import BizInsightLogo from '../components/BizInsightLogo';

// Mock Data for Ticker
const TICKER_ITEMS = [
    { type: 'new', text: 'New Registration: TECH INNOVATORS LTD (Auckland)', rating: 4 },
    { type: 'risk', text: 'High Risk Alert: CONSTRUCTION PLUS (Liquidation)', rating: 1 },
    { type: 'growth', text: 'Growth Spike: GREEN ENERGY SOL (Revenue +150%)', rating: 5 },
    { type: 'new', text: 'New Registration: FUTURE AI SYSTEMS (Wellington)', rating: 3 },
    { type: 'info', text: 'Market Update: Construction Sector Volatility Index +2.3%', rating: 2 },
    { type: 'growth', text: 'Top Rated: DIGITAL FRONTIER (AI Score 9.8/10)', rating: 5 },
];

export default function LandingPage() {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const fullText = 'Data Intelligence for';

    useEffect(() => {
        const typingSpeed = isDeleting ? 50 : 100;
        const pauseTime = 2000;

        const timeout = setTimeout(() => {
            if (!isDeleting && currentIndex < fullText.length) {
                setDisplayedText(prev => prev + fullText[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            } else if (!isDeleting && currentIndex === fullText.length) {
                setTimeout(() => setIsDeleting(true), pauseTime);
            } else if (isDeleting && currentIndex > 0) {
                setDisplayedText(prev => prev.slice(0, -1));
                setCurrentIndex(prev => prev - 1);
            } else if (isDeleting && currentIndex === 0) {
                setIsDeleting(false);
            }
        }, typingSpeed);

        return () => clearTimeout(timeout);
    }, [currentIndex, isDeleting]);

    return (
        <div className="min-h-screen relative overflow-hidden bg-dark-bg font-sans">
            <Background3D />

            <div className="relative z-10">
                <Navbar />


                {/* Hero Section with Vertical Scrolling Table */}
                <section id="features" className="pt-32 pb-16 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-[1.2fr,1fr] gap-12 items-stretch">
                            {/* Left: Hero Content */}
                            <div className="flex flex-col">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-sm font-medium mb-8 animate-pulse-slow">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue"></span>
                                    </span>
                                    Live NZ Companies Data Stream
                                </div>

                                <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight">
                                    {displayedText}
                                    <span className="animate-pulse text-neon-blue">|</span>
                                    <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-purple">
                                        Modern Business
                                    </span>
                                </h1>

                                <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl">
                                    BizInsight is an AI-powered business insight platform for SMEs and enterprises.
                                    It combines enterprise knowledge, data analytics, and intelligent automation to deliver instant answers, insights, and decisions.
                                    <br /><br />
                                    <span className="text-gray-300">Stop guessing. Start knowing. Access real-time insights, AI-powered risk scores, and comprehensive data on <strong className="text-white">1.7M+ New Zealand companies</strong>.</span>
                                </p>

                                <div className="flex flex-wrap gap-4 mb-12">
                                    <Link
                                        to="/search"
                                        className="px-8 py-4 bg-neon-blue text-black rounded-xl font-bold hover:bg-white transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,243,255,0.3)] flex items-center gap-2"
                                    >
                                        <Search className="w-5 h-5" />
                                        Search Companies
                                    </Link>
                                    <Link
                                        to="/dashboard"
                                        className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                                    >
                                        <BarChart3 className="w-5 h-5" />
                                        View Dashboard
                                    </Link>
                                </div>

                                {/* Metro Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-neon-blue/10 border border-neon-blue/30 p-6 rounded-2xl backdrop-blur-sm hover:bg-neon-blue/20 transition-colors group">
                                        <Users className="w-8 h-8 text-neon-blue mb-4 group-hover:scale-110 transition-transform" />
                                        <div className="text-4xl font-bold text-white mb-1">1.7M+</div>
                                        <div className="text-sm text-neon-blue font-medium">Active Companies</div>
                                    </div>
                                    <div className="bg-neon-purple/10 border border-neon-purple/30 p-6 rounded-2xl backdrop-blur-sm hover:bg-neon-purple/20 transition-colors group">
                                        <Activity className="w-8 h-8 text-neon-purple mb-4 group-hover:scale-110 transition-transform" />
                                        <div className="text-4xl font-bold text-white mb-1">24/7</div>
                                        <div className="text-sm text-neon-purple font-medium">Real-time Updates</div>
                                    </div>
                                    <div className="bg-neon-green/10 border border-neon-green/30 p-6 rounded-2xl backdrop-blur-sm hover:bg-neon-green/20 transition-colors group">
                                        <Database className="w-8 h-8 text-neon-green mb-4 group-hover:scale-110 transition-transform" />
                                        <div className="text-4xl font-bold text-white mb-1">50M+</div>
                                        <div className="text-sm text-neon-green font-medium">Data Points</div>
                                    </div>
                                    <div className="bg-orange-500/10 border border-orange-500/30 p-6 rounded-2xl backdrop-blur-sm hover:bg-orange-500/20 transition-colors group">
                                        <Zap className="w-8 h-8 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
                                        <div className="text-4xl font-bold text-white mb-1">AI</div>
                                        <div className="text-sm text-orange-500 font-medium">Predictive Scoring</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Vertical Scrolling Table */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex flex-col h-0 min-h-full">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-neon-blue" />
                                    Live Company Activity
                                </h3>
                                <div className="flex-1 overflow-hidden relative">
                                    {/* Gradient fade at top and bottom */}
                                    <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-dark-card to-transparent z-10 pointer-events-none"></div>
                                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-dark-card to-transparent z-10 pointer-events-none"></div>

                                    {/* Scrolling Table */}
                                    <div className="animate-scroll-vertical">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-dark-card/95 backdrop-blur-sm z-20">
                                                <tr className="border-b border-white/10">
                                                    <th className="text-left py-3 px-2 text-gray-400 font-semibold text-xs uppercase">Type</th>
                                                    <th className="text-left py-3 px-2 text-gray-400 font-semibold text-xs uppercase">Company</th>
                                                    <th className="text-left py-3 px-2 text-gray-400 font-semibold text-xs uppercase">Location</th>
                                                    <th className="text-left py-3 px-2 text-gray-400 font-semibold text-xs uppercase">Rating</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
                                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="py-3 px-2">
                                                            {item.type === 'new' && <span className="text-neon-blue font-bold text-xs px-2 py-1 bg-neon-blue/10 rounded">NEW</span>}
                                                            {item.type === 'risk' && <span className="text-red-500 font-bold text-xs px-2 py-1 bg-red-500/10 rounded">ALERT</span>}
                                                            {item.type === 'growth' && <span className="text-neon-green font-bold text-xs px-2 py-1 bg-neon-green/10 rounded">GROWTH</span>}
                                                            {item.type === 'info' && <span className="text-neon-purple font-bold text-xs px-2 py-1 bg-neon-purple/10 rounded">INFO</span>}
                                                        </td>
                                                        <td className="py-3 px-2 text-white/90 font-medium">
                                                            {item.text.split('(')[0].replace('New Registration: ', '').replace('High Risk Alert: ', '').replace('Growth Spike: ', '').replace('Top Rated: ', '').replace('Market Update: ', '')}
                                                        </td>
                                                        <td className="py-3 px-2 text-gray-400">
                                                            {item.text.includes('(') ? item.text.split('(')[1]?.replace(')', '') : '-'}
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <div className="flex gap-0.5">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        className={`w-3 h-3 ${i < item.rating ? 'text-neon-blue fill-neon-blue' : 'text-gray-600'}`}
                                                                    />
                                                                ))}
                                                            </div>
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
                </section>

                {/* Persona Section */}
                <section className="py-20 px-6 bg-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Tailored Intelligence</h2>
                            <p className="text-gray-400 text-lg">Data solutions designed for your specific needs</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Job Seeker Persona */}
                            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 to-black p-8 hover:border-neon-blue/50 transition-all duration-500">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Briefcase className="w-48 h-48 text-neon-blue" />
                                </div>

                                <div className="relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-neon-blue/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                                        <Briefcase className="w-8 h-8 text-neon-blue" />
                                    </div>

                                    <h3 className="text-3xl font-bold text-white mb-4">For Job Seekers</h3>
                                    <p className="text-gray-400 mb-8 text-lg">
                                        Don't join blindly. Know the company before you apply.
                                    </p>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                            <Star className="w-6 h-6 text-yellow-500" />
                                            <div>
                                                <div className="text-white font-bold">Employee Rating AI</div>
                                                <div className="text-sm text-gray-400">Predicted satisfaction score</div>
                                            </div>
                                            <div className="ml-auto text-xl font-bold text-yellow-500">9.2/10</div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                            <TrendingUp className="w-6 h-6 text-neon-green" />
                                            <div>
                                                <div className="text-white font-bold">Growth Stability</div>
                                                <div className="text-sm text-gray-400">Historical trend analysis</div>
                                            </div>
                                            <div className="ml-auto text-xl font-bold text-neon-green">High</div>
                                        </div>
                                    </div>

                                    <Link to="/search" className="inline-flex items-center gap-2 text-neon-blue font-bold group-hover:translate-x-2 transition-transform">
                                        Find Your Next Employer <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </div>
                            </div>

                            {/* Lender/B2B Persona */}
                            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 to-black p-8 hover:border-neon-purple/50 transition-all duration-500">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <DollarSign className="w-48 h-48 text-neon-purple" />
                                </div>

                                <div className="relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-neon-purple/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                                        <Building2 className="w-8 h-8 text-neon-purple" />
                                    </div>

                                    <h3 className="text-3xl font-bold text-white mb-4">For Lenders & B2B</h3>
                                    <p className="text-gray-400 mb-8 text-lg">
                                        Mitigate risk. Validate partners. Secure your investments.
                                    </p>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                            <Shield className="w-6 h-6 text-neon-blue" />
                                            <div>
                                                <div className="text-white font-bold">Credit Risk AI</div>
                                                <div className="text-sm text-gray-400">Default probability score</div>
                                            </div>
                                            <div className="ml-auto text-xl font-bold text-neon-blue">A+</div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                                            <div>
                                                <div className="text-white font-bold">Red Flag Alerts</div>
                                                <div className="text-sm text-gray-400">Instant director warnings</div>
                                            </div>
                                            <div className="ml-auto text-xl font-bold text-orange-500">0</div>
                                        </div>
                                    </div>

                                    <Link to="/search" className="inline-flex items-center gap-2 text-neon-purple font-bold group-hover:translate-x-2 transition-transform">
                                        Assess Business Risk <ArrowRight className="w-5 h-5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { icon: Globe, title: 'National Coverage', desc: 'Complete database of every registered entity in New Zealand.' },
                                { icon: Zap, title: 'Instant API', desc: 'Sub-100ms response times for high-frequency trading and analysis.' },
                                { icon: Lock, title: 'Bank-Grade Security', desc: 'Enterprise encryption and compliance with NZ privacy laws.' },
                            ].map((feature, idx) => (
                                <div key={idx} className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                    <feature.icon className="w-10 h-10 text-white mb-6" />
                                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                    <p className="text-gray-400">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-24 px-6 bg-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Access Tiers</h2>
                            <p className="text-gray-400 text-lg">Scalable solutions for every operation</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {/* Starter Tier */}
                            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
                                <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                                <div className="mb-8">
                                    <span className="text-4xl font-bold text-white">$0</span>
                                    <span className="text-gray-500">/mo</span>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-gray-500">✓</span>
                                        <span>100 API calls/month</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-gray-500">✓</span>
                                        <span>Basic company search</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-gray-500">✓</span>
                                        <span>Dashboard access</span>
                                    </li>
                                </ul>
                                <Link
                                    to="/dashboard"
                                    className="block w-full py-3 px-6 text-center bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
                                >
                                    Get Started
                                </Link>
                            </div>

                            {/* Pro Tier */}
                            <div className="bg-neon-blue/10 border-2 border-neon-blue/50 p-8 rounded-2xl relative transform scale-105">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-neon-blue text-black px-4 py-1 rounded-full text-sm font-bold">
                                    RECOMMENDED
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                                <div className="mb-8">
                                    <span className="text-4xl font-bold text-white">$49</span>
                                    <span className="text-neon-blue">/mo</span>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-neon-blue">✓</span>
                                        <span>10,000 API calls/month</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-neon-blue">✓</span>
                                        <span>Unlimited searches</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-neon-blue">✓</span>
                                        <span>Advanced filters</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-neon-blue">✓</span>
                                        <span>Priority support</span>
                                    </li>
                                </ul>
                                <Link
                                    to="/dashboard"
                                    className="block w-full py-3 px-6 text-center bg-neon-blue text-black rounded-lg font-bold hover:bg-white transition-colors"
                                >
                                    Start Free Trial
                                </Link>
                            </div>

                            {/* Enterprise Tier */}
                            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
                                <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                                <div className="mb-8">
                                    <span className="text-4xl font-bold text-white">Custom</span>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-neon-purple">✓</span>
                                        <span>Unlimited API calls</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-neon-purple">✓</span>
                                        <span>Dedicated infrastructure</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-neon-purple">✓</span>
                                        <span>Custom integrations</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300">
                                        <span className="text-neon-purple">✓</span>
                                        <span>24/7 phone support</span>
                                    </li>
                                </ul>
                                <a
                                    href="mailto:sales@nzcompanies.com"
                                    className="block w-full py-3 px-6 text-center bg-neon-purple/20 text-neon-purple border border-neon-purple/50 rounded-lg font-semibold hover:bg-neon-purple hover:text-white transition-colors"
                                >
                                    Contact Sales
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section id="contact" className="py-24 px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Get In Touch</h2>
                            <p className="text-gray-400 text-lg">
                                Questions about our data, API, or enterprise solutions? We're here to help.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
                            <ContactForm />
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 px-6 border-t border-white/10 bg-black/50 backdrop-blur-xl">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <BizInsightLogo className="w-6 h-6" />
                            <span className="font-bold text-lg text-white">Biz<span className="text-neon-blue">Insight</span></span>
                        </div>
                        <div className="text-gray-500 text-sm">
                            © 2025 BizInsight. All systems nominal.
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
