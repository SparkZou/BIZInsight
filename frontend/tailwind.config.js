/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                neon: {
                    blue: '#00f3ff',
                    purple: '#bc13fe',
                    green: '#0aff00',
                },
                dark: {
                    bg: '#030712',
                    card: '#111827',
                    border: '#1f2937',
                }
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
