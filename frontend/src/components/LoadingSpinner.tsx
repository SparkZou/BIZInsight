import { Activity } from 'lucide-react';

export default function LoadingSpinner() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-neon-blue/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-neon-blue rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-neon-blue animate-pulse" />
                </div>
            </div>
            <div className="text-neon-blue font-mono text-sm animate-pulse">LOADING DATA STREAM...</div>
        </div>
    );
}
