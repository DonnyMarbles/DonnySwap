import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      'buffer': 'buffer',
      'global': 'global',
    },
  },
  optimizeDeps: {
    include: ['ethers'],
  },
  // Optionally, specify where the static assets are located
  publicDir: 'public', // or wherever your static assets are located
});
