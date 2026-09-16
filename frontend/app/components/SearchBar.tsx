import { Form } from 'react-router';
import { Search } from 'lucide-react';

/** A plain GET form to /search, so it works before JavaScript loads and as a client-side navigation after. */
export default function SearchBar({ id = 'q', large = false, defaultValue = '', autoFocus = false, placeholder }: {
    id?: string;
    large?: boolean;
    defaultValue?: string;
    autoFocus?: boolean;
    placeholder?: string;
}) {
    return (
        <Form method="get" action="/search" role="search" className="relative w-full">
            <label htmlFor={id} className="sr-only">Search companies</label>
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint ${large ? 'w-5 h-5' : 'w-4 h-4'}`} />
            <input
                id={id}
                name="q"
                type="search"
                defaultValue={defaultValue}
                autoFocus={autoFocus}
                required
                minLength={2}
                placeholder={placeholder ?? 'Search company name, NZBN or company number'}
                autoComplete="off"
                className={`field pl-10 ${large ? 'py-3 text-base rounded-xl' : 'py-2 text-sm'}`}
            />
        </Form>
    );
}
