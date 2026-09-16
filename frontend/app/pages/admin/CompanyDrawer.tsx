import { useEffect } from 'react';
import { X } from 'lucide-react';
import CompanyDetail from './CompanyDetail';

/** Slide-over panel with everything recorded against one entity; closes on Escape or outside click. */
export default function CompanyDrawer({ nzbn, onClose }: { nzbn: string; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-3xl xl:max-w-5xl 2xl:max-w-7xl h-full overflow-y-auto bg-dark-bg border-l border-dark-border shadow-2xl">
                <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5" aria-label="Close">
                    <X className="w-5 h-5" />
                </button>
                <CompanyDetail nzbn={nzbn} />
            </div>
        </div>
    );
}
