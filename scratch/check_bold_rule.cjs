const fs = require('fs');

const files = [
  'src/components/calculator/HouseHackingCalculator.astro',
  'src/pages/calculator/house-hacking-calculator.astro',
  'astro.config.mjs',
  'src/pages/all-calculators.astro'
];

let totalViolations = 0;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
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
