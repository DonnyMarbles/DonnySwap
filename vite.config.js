import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

const DEFAULT_PROXY_TARGET =
  process.env.VITE_PROXY_API_TARGET || 'https://donnyswap.xyz';
const DEFAULT_PROXY_PREFIX = '/api';

const normalizeProxyPrefix = (value) => {
  if (value === undefined || value === null) {
    return '';
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === '/') {
    return '';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const proxyPrefix =
  process.env.VITE_PROXY_API_PREFIX === undefined
    ? DEFAULT_PROXY_PREFIX
    : normalizeProxyPrefix(process.env.VITE_PROXY_API_PREFIX);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      buffer: 'buffer', // Polyfill Buffer
      global: 'global',
    },
  },
  optimizeDeps: {
    include: ['ethers'],
    esbuildOptions: {
      define: {
        global: 'globalThis', // Define globalThis for compatibility
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true, // Enable Buffer polyfill
        }),
      ],
    },
  },
  server: {
    proxy: {
      '/api': {
        target: DEFAULT_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, proxyPrefix),
      },
    },
  },
});
