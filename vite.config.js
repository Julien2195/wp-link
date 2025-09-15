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
      input: 'src/main.jsx',
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          i18n: ['i18next', 'react-i18next'],
          stripe: ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          mui: ['@mui/material', '@mui/x-date-pickers', '@emotion/react', '@emotion/styled'],
        }
      }
    }
  }
});
