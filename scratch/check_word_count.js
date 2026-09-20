import fs from 'fs';

const content = fs.readFileSync('src/pages/calculator/tfsa-growth-calculator.astro', 'utf8');
const m = content.match(/<article[\s\S]*?<\/article>/);
const text = m ? m[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
console.log('Article word count:', text.split(' ').length);

// Also check faqSchema words
const faqMatch = content.match(/const faqSchema = ([\s\S]*?);/);
let faqWords = 0;
if (faqMatch) {
  try {
    const faqObj = eval('(' + faqMatch[1] + ')');
    const faqText = faqObj.mainEntity.map(e => e.name + ' ' + e.acceptedAnswer.text).join(' ');
    faqWords = faqText.split(/\s+/).length;
    console.log('FAQ word count:', faqWords);
  } catch(e) {}
}
console.log('Total educational words:', text.split(' ').length + faqWords);
