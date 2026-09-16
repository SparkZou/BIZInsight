import type { ReactNode } from 'react';
import type { LinksFunction, MetaFunction } from 'react-router';
import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from 'react-router';
import stylesheet from './app.css?url';
import Navbar from './components/Navbar';
import { DEFAULT_DESCRIPTION, SITE_NAME } from './lib/site';

export const links: LinksFunction = () => [
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
        <html lang="en-NZ" className="bg-dark-bg">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#030712" />
                <Meta />
                <Links />
            </head>
            <body className="min-h-screen bg-dark-bg text-white antialiased">
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
        <div className="min-h-screen">
            <Navbar />
            <main className="pt-36 pb-24 px-6 max-w-2xl mx-auto text-center">
                <p className="font-mono text-sm text-neon-blue mb-3">{response ? `Error ${response.status}` : 'Error'}</p>
                <h1 className="text-3xl font-bold mb-4">{title}</h1>
                <p className="text-gray-400 mb-8">{detail}</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Link to="/" className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-neon-blue/10 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue hover:text-black transition-colors">
                        Home page
                    </Link>
                    <Link to="/search" className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-white/5 border border-dark-border hover:bg-white/10 transition-colors">
                        Search companies
                    </Link>
                </div>
            </main>
        </div>
    );
}
