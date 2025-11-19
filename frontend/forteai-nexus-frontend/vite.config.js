import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      host: true, // bind to 0.0.0.0 so the dev server is reachable on the LAN
      port: 5173,
      strictPort: true,
      // If HMR from other devices is unreliable, set hmr.host to your machine's LAN IP:
      // hmr: { host: '192.168.x.x' },
      allowedHosts: [
        'nexus.forteai.in',
        'nexus-poc.forteai.in','localhost:5173','localhost',
        '10.40.0.24:5173'],
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          ws: false
        }
      }
    }
  }
})
