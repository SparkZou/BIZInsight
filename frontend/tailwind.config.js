/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // Public site: a light data-product palette. The /admin pages keep the older dark
            // theme (neon / dark tokens below) until they are restyled.
            colors: {
                canvas: '#F4F7FB',
                surface: '#FFFFFF',
                line: '#E3E9F1',
                ink: {
                    DEFAULT: '#0F1B2D',
                    2: '#334155',
                    muted: '#64748B',
                    faint: '#94A3B8',
                },
                brand: {
                    50: '#EEF4FD',
                    100: '#DCE8FB',
                    200: '#B9D1F7',
                    300: '#8EB4F1',
                    500: '#2F7CF6',
                    600: '#1F63D6',
                    700: '#194FAD',
                },
                teal: {
                    100: '#D6F5F1',
                    400: '#2DD4BF',
                    500: '#14B8A6',
                    600: '#0E9384',
                },
                neon: {
                    blue: '#00f3ff',
                    purple: '#bc13fe',
                    green: '#0aff00',
                },
                dark: {
                    bg: '#030712',
                    card: '#111827',
                    border: '#1f2937',
                },
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            boxShadow: {
                card: '0 1px 2px rgba(15, 27, 45, 0.04), 0 1px 3px rgba(15, 27, 45, 0.06)',
                pop: '0 10px 30px rgba(15, 27, 45, 0.10)',
            },
            borderRadius: {
                card: '12px',
            },
            keyframes: {
                'scroll-vertical': {
                    '0%': { transform: 'translateY(0)' },
                    '100%': { transform: 'translateY(-50%)' },
                },
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'scroll-vertical': 'scroll-vertical 30s linear infinite',
            },
        },
    },
    plugins: [],
}
