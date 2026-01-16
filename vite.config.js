import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow access from network (including phone)
    port: 5173,
    strictPort: false,
    // Allow connections from network
    hmr: {
      clientPort: 5173
    }
  }
})
