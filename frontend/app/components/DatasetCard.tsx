import { Building2, Users, Database } from 'lucide-react';

interface DatasetCardProps {
    name: string;
    description: string;
    count: number;
    category: 'companies' | 'entities' | 'other';
}

const categoryConfig = {
    companies: {
        icon: Building2,
        gradient: 'from-cyan-500 to-blue-600',
        bgGradient: 'from-cyan-500/10 to-blue-600/10'
    },
    entities: {
        icon: Users,
        gradient: 'from-purple-500 to-pink-600',
        bgGradient: 'from-purple-500/10 to-pink-600/10'
    },
    other: {
        icon: Database,
        gradient: 'from-green-500 to-emerald-600',
        bgGradient: 'from-green-500/10 to-emerald-600/10'
    }
};

export default function DatasetCard({ name, description, count, category }: DatasetCardProps) {
    const config = categoryConfig[category];
    const Icon = config.icon;

    return (
        <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${config.bgGradient} backdrop-blur-sm p-6 transition-all duration-300 hover:scale-105 hover:border-white/20 hover:shadow-xl hover:shadow-${category === 'companies' ? 'cyan' : category === 'entities' ? 'purple' : 'green'}-500/20`}>
            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${config.gradient} mb-4`}>
                <Icon className="w-6 h-6 text-white" />
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white mb-2">{name}</h3>

            {/* Description */}
            <p className="text-sm text-gray-400 mb-4 line-clamp-3">{description}</p>

            {/* Count */}
            <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                    {count.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">records</span>
            </div>

            {/* Decorative gradient overlay */}
            <div className={`absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br ${config.gradient} opacity-10 rounded-full blur-2xl`}></div>
        </div>
    );
}
