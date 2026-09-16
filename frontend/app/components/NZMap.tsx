import { useNavigate } from 'react-router';
import geo from '../data/nz-regions.json';
import { formatCompact, formatNumber } from '../lib/site';

interface RegionCount {
    region: string;
    live: number;
}

/**
 * New Zealand's regions as an SVG choropleth with a count bubble on each. The outlines are
 * pre-projected (app/data/nz-regions.json, built from Natural Earth), so this is plain SVG.
 */
export default function NZMap({ counts, selected, hrefFor, compact = false }: {
    counts: RegionCount[];
    selected?: string | null;
    /** Where clicking a region goes, e.g. the map page with ?region=. */
    hrefFor: (region: string) => string;
    compact?: boolean;
}) {
    const navigate = useNavigate();
    const byRegion = new Map(counts.map(item => [item.region, item.live]));
    const max = Math.max(1, ...counts.map(item => item.live));

    const fill = (region: string) => {
        const value = byRegion.get(region) ?? 0;
        const t = Math.sqrt(value / max);
        // Light blue to the brand blue.
        const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
        return `rgb(${mix(220, 47)}, ${mix(232, 124)}, ${mix(251, 246)})`;
    };

    return (
        <svg viewBox={`0 0 ${geo.width} ${geo.height}`} className="w-full h-auto max-w-full" role="img" aria-label="Map of New Zealand regions with company counts">
            <text x="60" y="330" className="fill-brand-300" style={{ fontSize: 22, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>Tasman Sea</text>
            <text x="440" y="600" className="fill-brand-300" style={{ fontSize: 22, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>Pacific Ocean</text>
            {geo.regions.map(region => {
                const isSelected = selected === region.region;
                return (
                    <path
                        key={region.region}
                        d={region.path}
                        fill={fill(region.region)}
                        stroke={isSelected ? '#0F1B2D' : '#FFFFFF'}
                        strokeWidth={isSelected ? 2.5 : 1.2}
                        strokeLinejoin="round"
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() => navigate(hrefFor(region.region))}
                    >
                        <title>{region.region}: {formatNumber(byRegion.get(region.region) ?? 0)} active companies</title>
                    </path>
                );
            })}
            {geo.regions.map(region => {
                const value = byRegion.get(region.region) ?? 0;
                if (!value) return null;
                const radius = 13 + Math.sqrt(value / max) * (compact ? 12 : 16);
                const [cx, cy] = region.centroid;
                return (
                    <g key={`bubble-${region.region}`} className="cursor-pointer" onClick={() => navigate(hrefFor(region.region))}>
                        <circle cx={cx} cy={cy} r={radius} fill="#1F63D6" fillOpacity={0.92} stroke="#FFFFFF" strokeWidth={2} />
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" style={{ fontSize: compact ? 11 : 12, fontWeight: 600 }}>
                            {formatCompact(value)}
                        </text>
                        <title>{region.region}: {formatNumber(value)} active companies</title>
                    </g>
                );
            })}
        </svg>
    );
}
