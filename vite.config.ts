import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // Support both local dev/Vercel (root '/') and GitHub Pages ('/VINOTH-BOOKS/')
  const isDev = process.env.NODE_ENV !== 'production';
  const isVercel = Boolean(process.env.VERCEL || process.env.NOW_BUILDER);
  const basePath = process.env.VITE_BASE_PATH || (isDev || isVercel ? '/' : '/VINOTH-BOOKS/');

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],

resolve: {
  alias: {
    '@': path.resolve(__dirname, '.'),
  },
},

server: {
  // HMR is disabled in AI Studio via DISABLE_HMR env var.
  // Do not modify—file watching is disabled to prevent flickering during agent edits.
  hmr: process.env.DISABLE_HMR !== 'true',

  // Disable file watching when DISABLE_HMR is true.
  watch: process.env.DISABLE_HMR === 'true' ? null : {},
},


};
});
