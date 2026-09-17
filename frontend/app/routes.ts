import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
    index('routes/home.tsx'),
    route('search', 'routes/search.tsx'),
    route('map', 'routes/map.tsx'),
    route('job-seekers', 'routes/job-seekers.tsx'),
    route('data-sources', 'routes/data-sources.tsx'),
    route('health-indicator', 'routes/health-indicator.tsx'),
    route('privacy', 'routes/privacy.tsx'),
    route('terms', 'routes/terms.tsx'),
    route('dashboard', 'routes/dashboard.tsx'),
    // Programmatic pages: one per industry division, region, city and month.
    route('industries', 'routes/industries.tsx'),
    route('industries/:division', 'routes/industry.tsx'),
    route('industries/:division/:region', 'routes/industry-region.tsx'),
    route('locations', 'routes/locations.tsx'),
    route('locations/:region', 'routes/location.tsx'),
    route('locations/:region/:city', 'routes/location-city.tsx'),
    route('new-companies', 'routes/new-companies.tsx'),
    route('new-companies/:month', 'routes/new-companies-month.tsx'),
    route('insolvencies', 'routes/insolvencies.tsx'),
    route('insolvencies/:month', 'routes/insolvencies-month.tsx'),
    // People (signed-in users only, never indexed) and accounts.
    route('people', 'routes/people.tsx'),
    route('people/:slug', 'routes/person.tsx'),
    route('account', 'routes/account/index.tsx'),
    route('account/login', 'routes/account/login.tsx'),
    route('account/register', 'routes/account/register.tsx'),
    route('account/verify', 'routes/account/verify.tsx'),
    route('account/forgot', 'routes/account/forgot.tsx'),
    route('account/reset', 'routes/account/reset.tsx'),
    // The slug is only there to carry the company name in the URL; the NZBN identifies the company
    // and a wrong or missing slug redirects to the right one.
    route('companies/:nzbn/:slug?', 'routes/company.tsx'),
    route('admin/*', 'routes/admin.tsx'),
    route('robots.txt', 'routes/robots.ts'),
    route('sitemap.xml', 'routes/sitemap-index.ts'),
    route('sitemaps/:name', 'routes/sitemap-file.ts'),
    route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
