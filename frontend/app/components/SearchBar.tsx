import { Form } from 'react-router';
import { Search } from 'lucide-react';

/** A plain GET form to /search, so it works before JavaScript loads and as a client-side navigation after. */
export default function SearchBar({ id = 'q', large = false, defaultValue = '', autoFocus = false }: {
    id?: string;
    large?: boolean;
    defaultValue?: string;
    autoFocus?: boolean;
}) {
    return (
        <Form method="get" action="/search" role="search" className="relative w-full group">
            <label htmlFor={id} className="sr-only">Search companies</label>
            <input
                id={id}
                name="q"
                type="search"
                defaultValue={defaultValue}
                autoFocus={autoFocus}
                required
                minLength={2}
                placeholder="Company name, NZBN or director"
                autoComplete="off"
                className={`w-full pl-11 pr-4 bg-dark-bg/60 border border-dark-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all ${large ? 'py-4 text-lg' : 'py-2.5 text-sm'}`}
            />
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors ${large ? 'w-5 h-5' : 'w-4 h-4'}`} />
        </Form>
    );
}
