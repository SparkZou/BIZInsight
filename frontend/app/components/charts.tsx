import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import ClientOnly from './ClientOnly';
import { formatNumber } from '../lib/site';

export const PALETTE = ['#2F7CF6', '#14B8A6', '#8B5CF6', '#22C55E', '#F59E0B', '#38BDF8', '#F43F5E', '#A3A3A3'];

const tooltipStyle = { borderRadius: 8, border: '1px solid #E3E9F1', boxShadow: '0 10px 30px rgba(15,27,45,0.10)', fontSize: 12 };

export function Card({ title, icon: Icon, action, children, className = '' }: {
    title: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string;
}) {
    return (
        <section className={`card p-5 ${className}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="card-title">{Icon && <Icon className="w-4 h-4 text-brand-600" />} {title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

export function KpiCard({ icon: Icon, label, value, change, caption, tone = 'brand' }: {
    icon: LucideIcon; label: string; value: string; change?: number | null; caption?: string; tone?: 'brand' | 'teal' | 'purple' | 'amber';
}) {
    const tones = {
        brand: 'bg-brand-50 text-brand-600', teal: 'bg-teal-100 text-teal-600',
        purple: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600',
    };
    return (
        <div className="card p-5 flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon className="w-5 h-5" /></div>
            <div className="min-w-0">
                <p className="text-sm text-ink-muted">{label}</p>
                <p className="text-2xl font-bold tabular leading-tight mt-0.5">{value}</p>
                {change !== undefined && change !== null ? (
                    <p className={`text-xs mt-1.5 flex items-center gap-1 ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span className="font-semibold">{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
                        <span className="text-ink-muted">{caption ?? 'vs. previous 12 months'}</span>
                    </p>
                ) : caption ? <p className="text-xs text-ink-muted mt-1.5">{caption}</p> : null}
            </div>
        </div>
    );
}

/** Ranked rows with a proportional bar: label, bar, value, share. Plain HTML, so it renders on the server too. */
export function BarList({ items, total, color = PALETTE[0], limit }: {
    items: { label: string; value: number; href?: string; color?: string }[]; total?: number; color?: string; limit?: number;
}) {
    const shown = limit ? items.slice(0, limit) : items;
    const max = Math.max(1, ...shown.map(item => item.value));
    const denominator = total ?? items.reduce((sum, item) => sum + item.value, 0);
    return (
        <ul className="space-y-2.5">
            {shown.map(item => (
                <li key={item.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto_auto] items-center gap-3 text-sm">
                    <span className="truncate text-ink-2" title={item.label}>
                        {item.href ? <a href={item.href} className="hover:text-brand-600">{item.label}</a> : item.label}
                    </span>
                    <div className="h-2.5 rounded-full bg-canvas overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: item.color ?? color }} />
                    </div>
                    <span className="tabular font-medium text-ink w-16 text-right">{formatNumber(item.value)}</span>
                    <span className="tabular text-ink-muted w-10 text-right">{denominator ? `${Math.round((item.value / denominator) * 100)}%` : ''}</span>
                </li>
            ))}
        </ul>
    );
}

/** A donut with a figure in the middle and a legend beside it. The legend is HTML (server-rendered); the ring draws in the browser. */
export function Donut({ items, centerValue, centerLabel, height = 190 }: {
    items: { label: string; value: number; color?: string }[]; centerValue: string; centerLabel: string; height?: number;
}) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const data = items.map((item, index) => ({ ...item, fill: item.color ?? PALETTE[index % PALETTE.length] }));
    return (
        <div className="flex items-center gap-5">
            <div className="relative shrink-0" style={{ width: height, height }}>
                <ClientOnly fallback={<div className="w-full h-full rounded-full border-[18px] border-canvas" />}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="label" innerRadius="66%" outerRadius="100%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                                {data.map(entry => <Cell key={entry.label} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip formatter={value => formatNumber(Number(value ?? 0))} contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                </ClientOnly>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold tabular">{centerValue}</span>
                    <span className="text-[11px] text-ink-muted">{centerLabel}</span>
                </div>
            </div>
            <ul className="space-y-2 text-sm min-w-0 flex-1">
                {data.map(item => (
                    <li key={item.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.fill }} />
                        <span className="truncate text-ink-2 flex-1" title={item.label}>{item.label}</span>
                        <span className="tabular text-ink-muted">{total ? `${Math.round((item.value / total) * 100)}%` : ''}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Vertical columns with the share printed above each one. */
export function Columns({ items, height = 210, color = PALETTE[0] }: {
    items: { label: string; value: number; color?: string }[]; height?: number; color?: string;
}) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const data = items.map((item, index) => ({
        ...item, share: total ? Math.round((item.value / total) * 100) : 0, fill: item.color ?? (index === 0 ? color : PALETTE[index % PALETTE.length]),
    }));
    return (
        <div style={{ height }}>
            <ClientOnly fallback={
                <ul className="grid gap-2 text-sm" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
                    {data.map(item => <li key={item.label} className="text-center"><span className="block font-semibold tabular">{item.share}%</span><span className="text-xs text-ink-muted">{item.label}</span></li>)}
                </ul>
            }>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
                        <CartesianGrid vertical={false} stroke="#EEF2F7" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} interval={0} />
                        <YAxis hide />
                        <Tooltip formatter={value => formatNumber(Number(value ?? 0))} contentStyle={tooltipStyle} cursor={{ fill: '#F4F7FB' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                            {data.map(entry => <Cell key={entry.label} fill={entry.fill} />)}
                            <LabelList dataKey="share" position="top" formatter={(value: unknown) => `${value}%`} style={{ fontSize: 12, fontWeight: 600, fill: '#0F1B2D' }} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ClientOnly>
        </div>
    );
}

/** A trend line with dots and a soft fill underneath. */
export function TrendLine({ points, height = 210, color = '#14B8A6', valueLabel = 'Registrations' }: {
    points: { label: string; value: number }[]; height?: number; color?: string; valueLabel?: string;
}) {
    return (
        <div style={{ height }}>
            <ClientOnly fallback={
                <ul className="flex justify-between text-xs text-ink-muted">
                    {points.map(point => <li key={point.label} className="text-center"><span className="block font-semibold text-ink tabular">{formatNumber(point.value)}</span>{point.label}</li>)}
                </ul>
            }>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                                <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#EEF2F7" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={value => (value >= 1000 ? `${Math.round(value / 1000)}K` : String(value))} />
                        <Tooltip formatter={value => [formatNumber(Number(value ?? 0)), valueLabel]} contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#trendFill)" dot={{ r: 3.5, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </ClientOnly>
        </div>
    );
}
