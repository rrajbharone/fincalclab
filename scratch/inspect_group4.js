import fs from 'node:fs';
import path from 'node:path';

const files = [
  'pay-raise-calculator.astro',
  'in-hand-salary-calculator.astro',
  'kids-pocket-money-compounder-calculator.astro',
  'salary-increase-calculator.astro',
  'sales-commission-calculator.astro'
];

files.forEach(f => {
  const c = fs.readFileSync(path.join('src/pages/calculator', f), 'utf8');
  console.log('=== ' + f + ' ===');
  const m = c.match(/class="calculator-extra-seo-content[^"]*"[^>]*/);
  if (m) console.log('Container tag:', m[0]);
  const style = c.match(/<style>([\s\S]*?)<\/style>/);
  if (style) {
    const lines = style[1].trim().split('\n').slice(0, 15).join('\n');
    console.log('Style snippet:\n' + lines);
  }
});
