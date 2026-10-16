import fs from 'node:fs';

const html = fs.readFileSync('dist/calculator/capital-gains-tax-calculator/index.html', 'utf8');

console.log('--- Verification Checks ---');
const starMatches = (html.match(/\*\*/g) || []).length;
console.log('1. Raw ** syntax count:', starMatches);
console.log('2. Has Singapore mobile option:', html.includes('value="SG"'));
console.log('3. Has Singapore desktop pill:', html.includes('data-country="SG"'));
console.log('4. Countries check:');
['US', 'UK', 'AU', 'IN', 'CA', 'SG'].forEach(c => {
  console.log(`   - Country ${c} pill:`, html.includes(`data-country="${c}"`));
});

const resultsIdx = html.indexOf('calc-results-card');
const resultsPart = html.substring(resultsIdx, resultsIdx + 4000);
const nestedCardCount = (resultsPart.match(/card card-elevation/g) || []).length;
console.log('5. Nested Card component count in results (should be 0):', nestedCardCount);

console.log('6. Has FAQ schema in head:', html.includes('"@type":"FAQPage"'));
console.log('7. Has WebApplication schema:', html.includes('"@type":"WebApplication"'));
console.log('8. Page size:', (html.length / 1024).toFixed(1), 'KB');
