import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://srv1567353.hstgr.cloud/webzspot-studio-verse',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://srv1567353.hstgr.cloud/webzspot-studio-verse',
        changeOrigin: true,
      }
    }
  }
})
