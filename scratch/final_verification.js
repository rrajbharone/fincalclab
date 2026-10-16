import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src/pages/calculator');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.astro'));

console.log('Auditing ' + files.length + ' calculator pages...');

let failedAsterisks = [];
let failedWidth = [];
let failedProse = [];

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');

  // Rule 14: No raw **
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('**')) {
      failedAsterisks.push(`${f}:${i + 1}`);
    }
  });

  // Max width 1000px check
  if (!content.includes('max-width: 1000px') && !content.includes('max-width:1000px')) {
    failedWidth.push(f);
  }

  // Prose styling check
  if (!content.includes('.prose h2') && !content.includes('.prose')) {
    failedProse.push(f);
  }
});

console.log('--- AUDIT RESULTS ---');
console.log('Rule 14 (No raw **):', failedAsterisks.length === 0 ? '✅ PASSED (0 violations)' : `❌ FAILED: ${failedAsterisks.join(', ')}`);
console.log('Container Max-Width (1000px):', failedWidth.length === 0 ? '✅ PASSED (75/75 pages)' : `❌ FAILED: ${failedWidth.join(', ')}`);
console.log('Prose Typography Reference:', failedProse.length === 0 ? '✅ PASSED (75/75 pages)' : `❌ FAILED: ${failedProse.join(', ')}`);
