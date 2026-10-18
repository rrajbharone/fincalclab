const fs = require('fs');
const content = fs.readFileSync('src/pages/calculator/adu-loan-calculator.astro', 'utf8');
const articleMatch = content.match(/<article class="educational-guide prose">([\s\S]*?)<\/article>/);
if (articleMatch) {
  const text = articleMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(' ').filter(Boolean).length;
  console.log('Educational Guide Word Count:', words);
} else {
  console.log('Could not find article');
}
