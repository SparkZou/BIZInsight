import type { LucideIcon } from 'lucide-react';

export default function InfoCard({ label, value, icon: Icon, subValue, className = '' }: {
    label: string;
    value: string | number | null | undefined;
    icon?: LucideIcon;
    subValue?: string;
    className?: string;
}) {
    if (!value) return null;
    return (
        <div className={`rounded-lg bg-canvas border border-line p-4 flex items-start gap-3 ${className}`}>
            {Icon && <div className="w-9 h-9 rounded-lg bg-surface border border-line text-brand-600 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></div>}
            <div className="min-w-0">
                <p className="text-xs text-ink-muted">{label}</p>
                <p className="font-semibold text-ink break-words mt-0.5">{value}</p>
                {subValue && <p className="text-xs text-ink-muted mt-0.5">{subValue}</p>}
            </div>
        </div>
    );
}
