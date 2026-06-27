import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' is required — UiPath handles URL routing; assets must be relative.
export default defineConfig({
  plugins: [react()],
  base: './',
});
