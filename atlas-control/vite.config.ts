import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build can be hosted from any sub-path (static hosting, artifact preview).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
});
