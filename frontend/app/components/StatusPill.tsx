/** Register status as a coloured pill: green while registered, amber for any insolvency state, grey once removed. */
export default function StatusPill({ status, large = false }: { status: string | null | undefined; large?: boolean }) {
    const text = status || 'Unknown';
    const tone = text === 'Registered'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : text === 'Removed'
            ? 'bg-slate-100 text-slate-600 border-slate-200'
            : 'bg-amber-50 text-amber-700 border-amber-200';
    return (
        <span className={`inline-flex items-center rounded-full font-medium border whitespace-nowrap ${tone} ${large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`}>
            {text}
        </span>
    );
}
