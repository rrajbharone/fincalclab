import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src/pages/calculator');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.astro'));

const audit = [];

for (const file of files) {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check top level container tag
  const containerMatch = content.match(/<div class="([^"]*container[^"]*)"/);
  const containerClass = containerMatch ? containerMatch[1] : 'NONE';

  // Check style block
  const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
  const styles = styleMatch ? styleMatch[1] : '';

  // Check max-width of container or page-container
  const cpcRule = styles.match(/\.calculator-page-container\s*\{([^}]*)\}/);
  const cpcBody = cpcRule ? cpcRule[1] : '';
  const cpcMaxWidth = cpcBody.match(/max-width:\s*([^;]+);/);
  const cpcMargin = cpcBody.match(/margin:\s*([^;]+);/);

  // Check guide article or guide section or prose
  const hasProse = content.includes('class="prose"');
  const hasGuideSection = content.includes('calculator-guide-section');
  const hasCgtGuide = content.includes('cgt-guide-article');

  // Check prose styles
  const proseH2 = styles.match(/\.prose\s+h2\s*\{([^}]*)\}/);
  const proseP = styles.match(/\.prose\s+p\s*\{([^}]*)\}/);

  const isMatched = (
    cpcMaxWidth && cpcMaxWidth[1].trim() === '1000px' &&
    cpcMargin && cpcMargin[1].includes('auto') &&
    hasProse
  );

  audit.push({
    file,
    containerClass,
    hasCpcRule: !!cpcRule,
    maxWidth: cpcMaxWidth ? cpcMaxWidth[1].trim() : (styles.match(/max-width:\s*([^;]+);/)?.[1]?.trim() || 'none'),
    margin: cpcMargin ? cpcMargin[1].trim() : 'none',
    hasProse,
    hasGuideSection,
    hasCgtGuide,
    isMatched
  });
}

console.log('=== MATCHED PAGES (' + audit.filter(a => a.isMatched).length + ') ===');
audit.filter(a => a.isMatched).forEach(a => console.log('MATCHED:', a.file));

console.log('\n=== UNMATCHED PAGES (' + audit.filter(a => !a.isMatched).length + ') ===');
audit.filter(a => !a.isMatched).forEach(a => {
  console.log(`UNMATCHED: ${a.file} | container: "${a.containerClass}" | maxW: ${a.maxWidth} | margin: ${a.margin} | prose: ${a.hasProse} | cgtGuide: ${a.hasCgtGuide}`);
});
