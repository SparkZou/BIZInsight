import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HealthPill from './HealthPill';
import StatusPill from './StatusPill';
import type { CompanyRow } from '../lib/api';
import { DIVISION_SHORT } from '../lib/api';
import { companyPath, formatDate, formatNumber } from '../lib/site';

/** A plain list of companies: name, where, what, when, status and health. */
export function CompanyRows({ rows, showRegion = true, dateKey = 'registration_date', dateLabel = 'Registered', emptyText = 'No companies to show.' }: {
    rows: CompanyRow[]; showRegion?: boolean; dateKey?: 'registration_date' | 'insolvency_date' | 'removal_date'; dateLabel?: string; emptyText?: string;
}) {
    if (rows.length === 0) return <p className="text-sm text-ink-muted py-6 text-center">{emptyText}</p>;
    return (
        <ul className="divide-y divide-line">
            {rows.map(company => (
                <li key={company.nzbn} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <Link to={companyPath(company.nzbn, company.name)} className="font-medium text-ink hover:text-brand-600 block truncate">{company.name}</Link>
                        <p className="text-xs text-ink-muted truncate">
                            {[showRegion ? [company.city, company.region].filter(Boolean).join(', ') : company.city, company.division ? (DIVISION_SHORT[company.division] ?? company.division) : null].filter(Boolean).join(' · ')}
                            {company[dateKey] && <> · {dateLabel} {formatDate(company[dateKey])}</>}
                            {dateKey === 'insolvency_date' && company.insolvency_type && <> · {company.insolvency_type}</>}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <HealthPill label={company.health_label} />
                        <StatusPill status={company.status} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** Previous / next page links for a paginated list; hrefFor builds the URL for a page number. */
export function Pager({ page, total, pageSize, hrefFor }: { page: number; total: number; pageSize: number; hrefFor: (page: number) => string }) {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (pageCount <= 1) return null;
    return (
        <nav className="flex items-center justify-between mt-4 text-sm" aria-label="Pages">
            {page > 1 ? <Link to={hrefFor(page - 1)} className="btn-secondary"><ChevronLeft className="w-4 h-4" /> Previous</Link> : <span />}
            <span className="text-ink-muted tabular">Page {page} of {formatNumber(pageCount)}</span>
            {page < pageCount ? <Link to={hrefFor(page + 1)} className="btn-secondary">Next <ChevronRight className="w-4 h-4" /></Link> : <span />}
        </nav>
    );
}
