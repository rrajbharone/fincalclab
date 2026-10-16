const fs = require('fs');

const content = fs.readFileSync('src/pages/calculator/house-hacking-calculator.astro', 'utf8');

// Extract prose section
const match = content.match(/<div class="prose">([\s\S]*?)<\/div>\s*<\/div>\s*<\/Layout>/);
if (match) {
  const text = match[1]
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\\(.*?\\\)/g, ' ')
    .replace(/\{.*?\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text.split(/\s+/).length;
  console.log(`Educational content word count: ${words} words`);
} else {
  console.log('Prose section not found');
}
