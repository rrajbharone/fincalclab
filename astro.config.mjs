// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://fincalclab.com',
  integrations: [sitemap()],
  vite: {
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      minify: 'esbuild'
    }
  }
});