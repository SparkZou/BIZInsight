import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, CheckCircle, Loader2, Send } from 'lucide-react';

export default function ContactForm({ company = '', message = '' }: { company?: string; message?: string }) {
    const [form, setForm] = useState({ name: '', email: '', company, message });
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        setStatus('idle');
        try {
            const res = await fetch('/api/v1/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            setStatus(res.ok ? 'success' : 'error');
            if (res.ok) setForm({ name: '', email: '', company: '', message: '' });
        } catch {
            setStatus('error');
        } finally {
            setSubmitting(false);
        }
    };

    const change = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                    <span className="block text-sm font-medium text-ink-2 mb-1">Your name</span>
                    <input id="contact-name" name="name" required value={form.name} onChange={change} className="field" placeholder="Jane Smith" />
                </label>
                <label className="block">
                    <span className="block text-sm font-medium text-ink-2 mb-1">Email address</span>
                    <input id="contact-email" name="email" type="email" required value={form.email} onChange={change} className="field" placeholder="jane@example.co.nz" />
                </label>
            </div>
            <label className="block">
                <span className="block text-sm font-medium text-ink-2 mb-1">Company (optional)</span>
                <input id="contact-company" name="company" value={form.company} onChange={change} className="field" placeholder="Company name or NZBN" />
            </label>
            <label className="block">
                <span className="block text-sm font-medium text-ink-2 mb-1">Message</span>
                <textarea id="contact-message" name="message" required rows={4} value={form.message} onChange={change} className="field resize-none" placeholder="A question, a correction, or a removal request" />
            </label>
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send message
            </button>
            {status === 'success' && (
                <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"><CheckCircle className="w-4 h-4" /> Thanks - your message has been received.</p>
            )}
            {status === 'error' && (
                <p className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4" /> The message could not be sent. Please try again in a moment.</p>
            )}
        </form>
    );
}
