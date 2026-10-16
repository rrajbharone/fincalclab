const fs = require('fs');

const files = [
  'src/components/calculator/FatFireCalculator.astro',
  'src/pages/calculator/fat-fire-calculator.astro',
  'src/pages/all-calculators.astro',
  'src/pages/calculator/barista-fire-calculator.astro',
  'src/pages/calculator/lean-fire-calculator.astro'
];

let totalViolations = 0;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check for ** not in a comment or regex
    // Rule: Never use raw markdown bold syntax (**) inside .astro files
    if (line.includes('**')) {
      console.log(`Violation in ${file}:${idx + 1}: ${line.trim()}`);
      totalViolations++;
    }
  });
});

if (totalViolations === 0) {
  console.log('✅ Rule 14 Passed: No raw ** markdown bold found in modified files!');
} else {
  console.log(`❌ Rule 14 Failed: Found ${totalViolations} violations.`);
}
