import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src/pages/calculator');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.astro'));

const results = files.map(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  const hasPageContainer = content.includes('calculator-page-container');
  const hasProse = content.includes('class="prose"');
  const hasGuideSection = content.includes('calculator-guide-section');
  const hasContainer = content.includes('container');
  
  // Style tag search
  const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
  const styles = styleMatch ? styleMatch[1] : '';

  // Look for max-width in styles
  const maxWidths = [...styles.matchAll(/max-width:\s*([^;]+);/g)].map(m => m[1].trim());

  return {
    file,
    hasPageContainer,
    hasProse,
    hasGuideSection,
    hasContainer,
    hasStyles: styles.length > 0,
    maxWidths
  };
});

// Group by pattern
const patterns = {};
for (const r of results) {
  const key = `pageContainer:${r.hasPageContainer}|prose:${r.hasProse}|guideSection:${r.hasGuideSection}|maxWidths:${r.maxWidths.join(',')}`;
  if (!patterns[key]) patterns[key] = [];
  patterns[key].push(r.file);
}

console.log('Total files:', results.length);
for (const [key, group] of Object.entries(patterns)) {
  console.log(`\n--- Pattern (${group.length} files) ---`);
  console.log(key);
  console.log('Sample files:', group.slice(0, 5).join(', '));
}
