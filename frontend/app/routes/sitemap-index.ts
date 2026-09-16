import { proxyXml } from '../lib/api';

export function loader() {
    return proxyXml('/api/v1/sitemap/index.xml');
}
