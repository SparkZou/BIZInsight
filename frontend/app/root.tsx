import type { ReactNode } from 'react';
import type { LinksFunction, MetaFunction } from 'react-router';
import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from 'react-router';
import stylesheet from './app.css?url';
import AppShell from './components/AppShell';
import { DEFAULT_DESCRIPTION, SITE_NAME } from './lib/site';

export const links: LinksFunction = () => [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
    { rel: 'stylesheet', href: stylesheet },
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
];

// Only used when a route has no meta of its own, which is the case while showing an error.
export const meta: MetaFunction = ({ error }) => {
    if (error) {
        const notFound = isRouteErrorResponse(error) && error.status === 404;
        return [{ title: `${notFound ? 'Page not found' : 'Something went wrong'} | ${SITE_NAME}` }, { name: 'robots', content: 'noindex' }];
    }
    return [
        { title: `${SITE_NAME} - New Zealand company register data` },
        { name: 'description', content: DEFAULT_DESCRIPTION },
    ];
};

export function Layout({ children }: { children: ReactNode }) {
    return (
        <html lang="en-NZ">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#F4F7FB" />
                <Meta />
                <Links />
            </head>
            <body className="min-h-screen">
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function App() {
    return <Outlet />;
}

export function ErrorBoundary() {
    const error = useRouteError();
    const response = isRouteErrorResponse(error) ? error : null;
    const notFound = response?.status === 404;
    const title = notFound ? 'Page not found' : 'Something went wrong';
    const detail = notFound
        ? "There's nothing at this address. The link may be out of date, or the address was mistyped."
        : (response?.data as { message?: string } | undefined)?.message
            || 'The site hit an unexpected error. Please try again in a moment.';

    return (
        <AppShell>
            <div className="card max-w-xl mx-auto mt-16 p-10 text-center">
                <p className="text-xs font-semibold tracking-wider uppercase text-brand-600 mb-3">{response ? `Error ${response.status}` : 'Error'}</p>
                <h1 className="text-2xl font-bold mb-3">{title}</h1>
                <p className="text-ink-muted mb-8">{detail}</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Link to="/" className="btn-primary">Overview</Link>
                    <Link to="/search" className="btn-secondary">Search companies</Link>
                </div>
            </div>
        </AppShell>
    );
}
