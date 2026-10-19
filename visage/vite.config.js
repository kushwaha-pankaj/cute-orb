import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';

// VISAGE_BASE is the path the site is served from, e.g. /cute-orb/ on GitHub Pages
// (set by .github/workflows/deploy-visage.yml). Local dev and root-hosted deploys use /.
export default defineConfig({
  base: process.env.VISAGE_BASE || '/',
  plugins: [tailwindcss()],
  esbuild: {jsx: 'automatic'},
});
