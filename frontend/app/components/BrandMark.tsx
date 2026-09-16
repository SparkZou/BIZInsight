/** Two peaks over a teal wave: land and sea, drawn once in the top bar and once in the favicon. */
export default function BrandMark({ className = 'w-10 h-10' }: { className?: string }) {
    return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
            <rect width="48" height="48" rx="12" fill="#EEF4FD" />
            <path d="M8 31 L19 15 L26 25 L30 20 L40 31 Z" fill="#2F7CF6" />
            <path d="M8 31 L19 15 L24.5 23 L16 31 Z" fill="#1F63D6" />
            <path d="M6 35 C 12 31, 18 39, 24 35 S 36 31, 42 35" fill="none" stroke="#14B8A6" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
