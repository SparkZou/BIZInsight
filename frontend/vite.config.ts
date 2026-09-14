import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The app calls /api on its own origin: nginx proxies it in production,
    // this proxy forwards it to the local backend during development.
    proxy: {
      '/api': 'http://127.0.0.1:8001',
    },
  },
})
