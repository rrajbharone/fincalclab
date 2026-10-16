import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src/pages/calculator');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.astro'));

const referenceStyles = `  .calculator-page-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: var(--space-4) var(--space-4);
  }

  .prose h2 {
    font-size: 1.5rem;
    font-weight: 800;
    margin-top: var(--space-8);
    margin-bottom: var(--space-3);
    color: var(--color-text-base);
  }

  .prose h3 {
    font-size: 1.2rem;
    font-weight: 700;
    margin-top: var(--space-5);
    margin-bottom: var(--space-2);
    color: var(--color-text-base);
  }

  .prose p {
    margin-bottom: var(--space-4);
    font-size: 1rem;
    line-height: 1.7;
    color: var(--color-text-muted);
  }

  .prose ul, .prose ol {
    margin-bottom: var(--space-4);
    padding-left: var(--space-6);
  }

  .prose li {
    margin-bottom: var(--space-2);
    color: var(--color-text-muted);
    line-height: 1.6;
  }`;

let identicalCount = 0;
const diffs = [];

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    const s = styleMatch[1].trim();
    if (s.includes('max-width: 1000px') && s.includes('.prose h2') && s.includes('font-size: 1.5rem')) {
      identicalCount++;
    } else {
      diffs.push(f);
    }
  } else {
    diffs.push(f);
  }
});

console.log('Total pages with exact Barista FIRE prose styles:', identicalCount);
console.log('Pages needing update:', diffs.length);
console.log('Diff pages:', diffs.join(', '));
