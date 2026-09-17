// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://fincalclab.com',
  integrations: [sitemap()],
  redirects: {
    '/monthly-savings-goal-calculator': '/calculator/monthly-savings-goal-calculator',
    '/savings-target-calculator': '/calculator/savings-target-calculator'
  },
  vite: {
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      minify: 'esbuild'
    }
  }
});