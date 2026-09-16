import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
    index('routes/home.tsx'),
    route('search', 'routes/search.tsx'),
    route('dashboard', 'routes/dashboard.tsx'),
    // The slug is only there to carry the company name in the URL; the NZBN identifies the company
    // and a wrong or missing slug redirects to the right one.
    route('companies/:nzbn/:slug?', 'routes/company.tsx'),
    route('admin/*', 'routes/admin.tsx'),
    route('robots.txt', 'routes/robots.ts'),
    route('sitemap.xml', 'routes/sitemap-index.ts'),
    route('sitemaps/:name', 'routes/sitemap-file.ts'),
    route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
