import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuration Vite pour produire un build compatible WordPress plugin
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: 'src/main.jsx'
    }
  }
});

