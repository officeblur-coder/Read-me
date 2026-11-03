import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps the build portable: it can live in any sub-folder of the existing site.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2019', cssCodeSplit: false, assetsInlineLimit: 0 },
});
