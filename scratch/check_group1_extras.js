import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src/pages/calculator');
const list = [
  'buy-to-let-tax-calculator.astro',
  'compound-percentage-decrease-calculator.astro',
  'monthly-savings-goal-calculator.astro',
  'mortgage-early-repayment-calculator.astro',
  'pension-tax-relief-calculator.astro',
  'rrsp-contribution-calculator.astro',
  'salary-percentage-increase-calculator.astro',
  'salary-sacrifice-pension-calculator.astro',
  'savings-target-calculator.astro',
  'sinking-fund-calculator.astro'
];

list.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    const s = styleMatch[1].trim();
    // remove standard prose rules to see what remains
    const cleaned = s
      .replace(/\.calculator-page-container\s*\{[^}]*\}/g, '')
      .replace(/\.prose\s+h2\s*\{[^}]*\}/g, '')
      .replace(/\.prose\s+h3\s*\{[^}]*\}/g, '')
      .replace(/\.prose\s+p[^{]*\{[^}]*\}/g, '')
      .replace(/\.prose\s+strong\s*\{[^}]*\}/g, '')
      .replace(/\.prose\s+ol[^{]*\{[^}]*\}/g, '')
      .replace(/\.prose\s+a[^{]*\{[^}]*\}/g, '')
      .trim();
    console.log(f, 'extra rules in style:', cleaned ? cleaned : 'NONE');
  }
});
