import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <form onSubmit={handleSearch} className="relative w-full group">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search companies..."
                className="w-full pl-10 pr-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all group-hover:bg-dark-bg/80"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
        </form>
    );
}
