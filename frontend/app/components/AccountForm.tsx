import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

/** The small centred card the sign-in, register and password pages share. */
export function AccountCard({ title, intro, children, footer }: { title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
    return (
        <div className="max-w-md mx-auto mt-6">
            <div className="card p-6 sm:p-8">
                <h1 className="text-xl font-bold">{title}</h1>
                {intro && <div className="text-sm text-ink-muted mt-1">{intro}</div>}
                <div className="mt-5">{children}</div>
            </div>
            {footer && <div className="text-sm text-ink-muted text-center mt-4">{footer}</div>}
        </div>
    );
}

export function Field({ id, label, type = 'text', value, onChange, autoComplete, placeholder, minLength, required = true }: {
    id: string; label: string; type?: string; value: string; onChange: (value: string) => void; autoComplete?: string; placeholder?: string; minLength?: number; required?: boolean;
}) {
    return (
        <label htmlFor={id} className="block">
            <span className="block text-sm font-medium text-ink-2 mb-1">{label}</span>
            <input id={id} name={id} type={type} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} minLength={minLength} required={required} className="field" />
        </label>
    );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
    return (
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} {children}
        </button>
    );
}

export function FormError({ message }: { message: string }) {
    if (!message) return null;
    return <p className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {message}</p>;
}

export const preventDefault = (handler: () => void) => (event: FormEvent) => { event.preventDefault(); handler(); };
