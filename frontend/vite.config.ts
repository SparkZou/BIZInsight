import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [reactRouter()],
    server: {
        // In the browser the app calls /api on its own origin (Caddy proxies it in production);
        // this forwards it to the local backend during development. Server-side loaders call the
        // backend directly, see app/lib/api.ts.
        proxy: {
            '/api': 'http://127.0.0.1:8001',
        },
    },
});
