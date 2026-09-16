/** Register status as a coloured pill: green while registered, amber for any insolvency state, grey once removed. */
export default function StatusPill({ status, large = false }: { status: string | null | undefined; large?: boolean }) {
    const text = status || 'Unknown';
    const tone = text === 'Registered'
        ? 'bg-green-500/10 text-green-400 border-green-500/30'
        : text === 'Removed'
            ? 'bg-gray-500/10 text-gray-300 border-gray-500/30'
            : 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    return (
        <span className={`inline-flex items-center rounded-full font-medium border whitespace-nowrap ${tone} ${large ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs'}`}>
            {text}
        </span>
    );
}
