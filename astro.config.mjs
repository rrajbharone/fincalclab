// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://fincalclab.com',
  integrations: [sitemap()],
  redirects: {
    '/monthly-savings-goal-calculator': '/calculator/monthly-savings-goal-calculator',
    '/savings-target-calculator': '/calculator/savings-target-calculator',
    '/salary-percentage-increase-calculator': '/calculator/salary-percentage-increase-calculator',
    '/compound-percentage-decrease-calculator': '/calculator/compound-percentage-decrease-calculator',
    '/salary-sacrifice-pension-calculator': '/calculator/salary-sacrifice-pension-calculator',
    '/pension-tax-relief-calculator': '/calculator/pension-tax-relief-calculator',
    '/buy-to-let-tax-calculator': '/calculator/buy-to-let-tax-calculator',
    '/mortgage-early-repayment-calculator': '/calculator/mortgage-early-repayment-calculator',
    '/rrsp-contribution-calculator': '/calculator/rrsp-contribution-calculator',
    '/rrsp-tax-savings-calculator': '/calculator/rrsp-tax-savings-calculator',
    '/tfsa-contribution-calculator': '/calculator/tfsa-contribution-calculator',
    '/tfsa-growth-calculator': '/calculator/tfsa-growth-calculator',
    '/super-salary-sacrifice-calculator': '/calculator/super-salary-sacrifice-calculator'
  },
  vite: {
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      minify: 'esbuild'
    }
  }
});