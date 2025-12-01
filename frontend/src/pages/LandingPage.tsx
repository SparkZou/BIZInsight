import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, Zap, Lock, TrendingUp, Check, ArrowRight, Building2, Cpu, Globe, Shield, Users, Activity } from 'lucide-react';
import Navbar from '../components/Navbar';
import ContactForm from '../components/ContactForm';
import Background3D from '../components/Background3D';

export default function LandingPage() {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const fullText = 'Unlock the Power of';

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
        <div className="min-h-screen relative overflow-hidden">
            <Background3D />

            <div className="relative z-10">
                <Navbar />

                {/* Hero Section */}
                <section className="pt-40 pb-20 px-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-sm font-medium mb-8 animate-pulse-slow">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue"></span>
                            </span>
                            Live Data Connection Active
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 min-h-[160px] tracking-tight">
                            {displayedText}
                            <span className="animate-pulse text-neon-blue">|</span>
                            <br />
                            <span className="text-gradient text-glow">
                                NZ Business Data
                            </span>
                        </h1>

                        <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                            Access real-time insights on <strong className="text-white">1.7M+ New Zealand companies</strong> via our high-performance API or futuristic dashboard.
                            <br />
                            <span className="text-neon-blue/80">Data-driven intelligence for the modern era.</span>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <Link
                                to="/dashboard"
                                className="group px-8 py-4 bg-neon-blue text-black rounded-xl font-bold hover:bg-white transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] flex items-center justify-center gap-2"
                            >
                                Initialize Dashboard
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a
                                href="#pricing"
                                className="px-8 py-4 bg-transparent text-white rounded-xl font-semibold border border-white/20 hover:border-neon-purple hover:text-neon-purple transition-all flex items-center justify-center backdrop-blur-sm"
                            >
                                View Access Plans
                            </a>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-24 max-w-5xl mx-auto">
                            {[
                                { label: 'Companies', value: '1.7M+', color: 'text-neon-blue' },
                                { label: 'Directors', value: '1.1M+', color: 'text-neon-purple' },
                                { label: 'Uptime', value: '99.9%', color: 'text-neon-green' },
                                { label: 'Updates', value: 'Real-time', color: 'text-white' },
                            ].map((stat, idx) => (
                                <div key={idx} className="glass-card p-6 rounded-2xl">
                                    <div className={`text-3xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
                                    <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Use Cases Section */}
                <section className="py-24 px-6 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-blue/5 to-transparent pointer-events-none" />
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-4xl font-bold text-white mb-4">Intelligence Matrix</h2>
                            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                                Empowering industries with precision data and actionable insights
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { title: 'Financial Services', icon: TrendingUp, desc: 'Risk assessment & KYC compliance', color: 'blue' },
                                { title: 'Recruitment & HR', icon: Users, desc: 'Employer verification & background checks', color: 'purple' },
                                { title: 'Sales & Marketing', icon: Globe, desc: 'Lead generation & market segmentation', color: 'green' },
                                { title: 'Legal & Compliance', icon: Shield, desc: 'Due diligence & regulatory checks', color: 'orange' },
                                { title: 'Research & Analytics', icon: Database, desc: 'Market trends & industry analysis', color: 'red' },
                                { title: 'Supply Chain', icon: Cpu, desc: 'Vendor verification & risk management', color: 'cyan' },
                            ].map((item, idx) => (
                                <div key={idx} className="glass-card p-8 rounded-2xl group hover:-translate-y-2 transition-transform">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br from-gray-800 to-black border border-gray-700 group-hover:border-${item.color}-500/50 transition-colors`}>
                                        <item.icon className={`w-7 h-7 text-gray-300 group-hover:text-neon-${item.color === 'cyan' ? 'blue' : item.color} transition-colors`} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-neon-blue transition-colors">{item.title}</h3>
                                    <p className="text-gray-400 mb-6">
                                        {item.desc}
                                    </p>
                                    <ul className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-gray-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-neon-blue/50" />
                                                <span>Data point verified</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-24 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-4xl font-bold text-white mb-4">System Capabilities</h2>
                            <p className="text-xl text-gray-400">Advanced tools for data extraction and analysis</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { title: 'Comprehensive Database', icon: Database, desc: 'Complete profiles including registration details, directors, and shareholders.' },
                                { title: 'Lightning Fast API', icon: Zap, desc: 'Sub-100ms response times with high-throughput architecture.' },
                                { title: 'Secure & Compliant', icon: Lock, desc: 'Enterprise-grade encryption and full regulatory compliance.' },
                                { title: 'Advanced Analytics', icon: TrendingUp, desc: 'AI-powered insights and predictive scoring models.' },
                                { title: 'Real-time Updates', icon: Activity, desc: 'Synchronized daily with official Companies Office registers.' },
                                { title: 'Flexible Queries', icon: Cpu, desc: 'Complex filtering by name, NZBN, address, or director.' },
                            ].map((feature, idx) => (
                                <div key={idx} className="glass-card p-8 rounded-2xl hover:bg-white/5">
                                    <div className="w-12 h-12 bg-neon-blue/10 rounded-lg flex items-center justify-center mb-6">
                                        <feature.icon className="w-6 h-6 text-neon-blue" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-24 px-6 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/10 to-transparent pointer-events-none" />
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-4xl font-bold text-white mb-4">Access Tiers</h2>
                            <p className="text-xl text-gray-400">Scalable solutions for every operation</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {/* Free Tier */}
                            <div className="glass-card p-8 rounded-2xl border-t-4 border-t-gray-500">
                                <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                                <div className="mb-8">
                                    <span className="text-4xl font-bold text-white">$0</span>
                                    <span className="text-gray-500">/mo</span>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {['100 API calls/month', 'Basic company search', 'Dashboard access', 'Community support'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-gray-300">
                                            <Check className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    to="/dashboard"
                                    className="block w-full py-3 px-6 text-center bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
                                >
                                    Get Started
                                </Link>
                            </div>

                            {/* Pro Tier */}
                            <div className="glass-card p-8 rounded-2xl border-t-4 border-t-neon-blue relative transform scale-105 z-10 bg-dark-card/80">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-neon-blue text-black px-4 py-1 rounded-full text-sm font-bold shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                                    RECOMMENDED
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                                <div className="mb-8">
                                    <span className="text-4xl font-bold text-white">$49</span>
                                    <span className="text-neon-blue">/mo</span>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {['10,000 API calls/month', 'Unlimited searches', 'Advanced filters', 'Priority support', 'Export to CSV/JSON'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-gray-300">
                                            <Check className="w-5 h-5 text-neon-blue flex-shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    to="/dashboard"
                                    className="block w-full py-3 px-6 text-center bg-neon-blue text-black rounded-lg font-bold hover:bg-white transition-colors shadow-[0_0_15px_rgba(0,243,255,0.3)]"
                                >
                                    Start Free Trial
                                </Link>
                            </div>

                            {/* Enterprise Tier */}
                            <div className="glass-card p-8 rounded-2xl border-t-4 border-t-neon-purple">
                                <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                                <div className="mb-8">
                                    <span className="text-4xl font-bold text-white">Custom</span>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    {['Unlimited API calls', 'Dedicated infrastructure', 'Custom integrations', '24/7 phone support', 'SLA guarantee'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-gray-300">
                                            <Check className="w-5 h-5 text-neon-purple flex-shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
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
                            <h2 className="text-4xl font-bold text-white mb-4">Initiate Contact</h2>
                            <p className="text-xl text-gray-400">Our team is ready to assist with your data requirements.</p>
                        </div>

                        <div className="glass-panel p-8 rounded-2xl">
                            <ContactForm />
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 px-6 border-t border-dark-border bg-black/50 backdrop-blur-xl">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-4 gap-8 mb-12">
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <Building2 className="w-6 h-6 text-neon-blue" />
                                    <span className="font-bold text-lg text-white">NZ<span className="text-neon-blue">Companies</span></span>
                                </div>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    The premier source for New Zealand business intelligence.
                                    <br />Powered by advanced data aggregation algorithms.
                                </p>
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-4">Platform</h4>
                                <ul className="space-y-3 text-sm text-gray-400">
                                    <li><a href="#features" className="hover:text-neon-blue transition-colors">Capabilities</a></li>
                                    <li><a href="#pricing" className="hover:text-neon-blue transition-colors">Pricing</a></li>
                                    <li><Link to="/dashboard" className="hover:text-neon-blue transition-colors">Dashboard</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-4">Company</h4>
                                <ul className="space-y-3 text-sm text-gray-400">
                                    <li><a href="#" className="hover:text-neon-blue transition-colors">About Us</a></li>
                                    <li><a href="#" className="hover:text-neon-blue transition-colors">Contact</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-4">Legal</h4>
                                <ul className="space-y-3 text-sm text-gray-400">
                                    <li><a href="#" className="hover:text-neon-blue transition-colors">Privacy Protocol</a></li>
                                    <li><a href="#" className="hover:text-neon-blue transition-colors">Terms of Service</a></li>
                                </ul>
                            </div>
                        </div>
                        <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-600">
                            © 2025 NZCompanies. All systems nominal.
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
