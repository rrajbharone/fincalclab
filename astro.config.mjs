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
    '/super-salary-sacrifice-calculator': '/calculator/super-salary-sacrifice-calculator',
    '/capital-gains-tax-calculator': '/calculator/capital-gains-tax-calculator',
    '/child-education-cost-calculator': '/calculator/child-education-cost-calculator',
    '/fat-fire-calculator': '/calculator/fat-fire-calculator',
    '/house-hacking-calculator': '/calculator/house-hacking-calculator',
    '/minimum-payment-trap-calculator': '/calculator/minimum-payment-trap-calculator',
    '/coast-fire-number-calculator': '/calculator/coast-fire-number-calculator',
    '/when-can-i-stop-saving-for-retirement-calculator': '/calculator/when-can-i-stop-saving-for-retirement-calculator',
    '/brrrr-calculator': '/calculator/brrrr-calculator'
  },
  vite: {
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      minify: 'esbuild'
    }
  }
});