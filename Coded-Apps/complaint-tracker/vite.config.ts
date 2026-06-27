import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  // OAuth redirect_uri must match a URI registered on the external app
  // (clientId 6a08dcbc…): http://localhost:5174/ . strictPort makes the dev
  // server fail loudly if 5174 is taken rather than silently moving to another
  // port (which is NOT registered and breaks the login redirect).
  server: { port: 5174, strictPort: true },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      path: 'path-browserify',
    },
  },
  optimizeDeps: {
    include: ['@uipath/uipath-typescript'],
  },
})
