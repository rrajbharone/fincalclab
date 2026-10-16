import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src/pages/calculator');
const list = [
  'freelance-hourly-rate-calculator.astro',
  'inflation-impact-calculator.astro',
  'lumpsum-vs-sip-calculator.astro',
  'pay-raise-calculator.astro',
  'in-hand-salary-calculator.astro',
  'kids-pocket-money-compounder-calculator.astro',
  'salary-increase-calculator.astro',
  'sales-commission-calculator.astro'
];

list.forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = c.match(/class="calculator-extra-seo-content[^"]*"[^>]*/);
  console.log(f, '-->', m ? m[0] : 'NONE');
  
  // also check styles for .calculator-extra-seo-content
  const styleMatch = c.match(/\.calculator-extra-seo-content\s*\{[^}]*\}/);
  console.log('  style rule:', styleMatch ? styleMatch[0].replace(/\s+/g, ' ') : 'NO RULE IN STYLE');
});
