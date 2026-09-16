import { useEffect, useState, type ReactNode } from 'react';

/**
 * Renders its children only in the browser. For components that measure the DOM or need window
 * (charts), which would otherwise render differently on the server and fail to hydrate.
 */
export default function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        setReady(true);
    }, []);
    return <>{ready ? children : fallback}</>;
}
