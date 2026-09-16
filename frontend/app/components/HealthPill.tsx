import type { HealthLabel } from '../lib/api';

const TONES: Record<HealthLabel, string> = {
    Established: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Developing: 'bg-brand-50 text-brand-700 border-brand-200',
    Watch: 'bg-amber-50 text-amber-700 border-amber-200',
    Distressed: 'bg-rose-50 text-rose-700 border-rose-200',
    Removed: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const HEALTH_DOT: Record<HealthLabel, string> = {
    Established: '#22C55E', Developing: '#2F7CF6', Watch: '#F59E0B', Distressed: '#F43F5E', Removed: '#94A3B8',
};

/** The Company Health Indicator label, optionally with the score. */
export default function HealthPill({ label, score, large = false }: { label: HealthLabel | null | undefined; score?: number | null; large?: boolean }) {
    if (!label) return null;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border whitespace-nowrap ${TONES[label] ?? TONES.Removed} ${large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`} title="Company Health Indicator">
            {label}
            {score !== undefined && score !== null && label !== 'Removed' && <span className="tabular opacity-80">{score}</span>}
        </span>
    );
}
