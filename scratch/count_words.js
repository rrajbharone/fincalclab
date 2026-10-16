import fs from 'node:fs';

const content = fs.readFileSync('src/pages/calculator/fat-fire-calculator.astro', 'utf8');
const articleMatch = content.match(/<article class="educational-guide prose">([\s\S]*?)<\/article>/);
if (articleMatch) {
  const text = articleMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(' ').filter(Boolean).length;
  console.log('Educational Guide Word Count (raw text in article):', words);
} else {
  console.log('Article not matched');
}

// Also count FAQ text
const faqCount = content.match(/"text":\s*"([^"]+)"/g);
console.log('FAQ items count:', faqCount ? faqCount.length : 0);
