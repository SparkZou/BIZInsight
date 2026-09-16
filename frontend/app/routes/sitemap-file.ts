import type { LoaderFunctionArgs } from 'react-router';
import { proxyXml } from '../lib/api';

export function loader({ params }: LoaderFunctionArgs) {
    const name = params.name || '';
    if (!/^[a-z]+(-\d+)?\.xml$/.test(name)) throw new Response('Not found', { status: 404 });
    return proxyXml(`/api/v1/sitemap/${name}`);
}
