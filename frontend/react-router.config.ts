import type { Config } from '@react-router/dev/config';

// Server-rendered so that every company page arrives as complete HTML: search engines index the
// content, and visitors see it before any JavaScript runs.
export default {
    ssr: true,
    appDirectory: 'app',
} satisfies Config;
