import type { LucideIcon } from 'lucide-react';

interface InfoCardProps {
    label: string;
    value: string | number | null | undefined;
    icon?: LucideIcon;
    subValue?: string;
    className?: string;
}

export default function InfoCard({ label, value, icon: Icon, subValue, className = '' }: InfoCardProps) {
    if (!value) return null;

    return (
        <div className={`p-4 bg-white/5 rounded-xl border border-white/10 hover:border-neon-blue/30 transition-colors ${className}`}>
            <div className="flex items-start gap-3">
                {Icon && (
                    <div className="p-2 rounded-lg bg-neon-blue/10 text-neon-blue">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                <div>
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</h3>
                    <div className="text-lg font-semibold text-white break-words">{value}</div>
                    {subValue && <div className="text-sm text-gray-500 mt-1">{subValue}</div>}
                </div>
            </div>
        </div>
    );
}
