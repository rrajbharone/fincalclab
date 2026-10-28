const fs = require('fs');
const path = require('path');

let contentPages = 0;
let redirectPages = 0;
let gtmFoundCount = 0;
let configFoundCount = 0;
let duplicates = 0;

function checkHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkHtmlFiles(fullPath);
    } else if (file.endsWith('.html')) {
      const html = fs.readFileSync(fullPath, 'utf8');
      if (html.includes('http-equiv="refresh"')) {
        redirectPages++;
        continue;
      }
      contentPages++;
      const gtmMatches = html.match(/googletagmanager\.com\/gtag\/js\?id=G-CKKLEGT7GR/g);
      const configMatches = html.match(/gtag\('config',\s*'G-CKKLEGT7GR'\)/g);
      
      if (gtmMatches && gtmMatches.length === 1) {
        gtmFoundCount++;
      } else {
        console.error('Mismatch GTM script in:', fullPath, gtmMatches ? gtmMatches.length : 0);
        duplicates++;
      }
      if (configMatches && configMatches.length === 1) {
        configFoundCount++;
      } else {
        console.error('Mismatch config in:', fullPath, configMatches ? configMatches.length : 0);
        duplicates++;
      }
    }
  }
}

checkHtmlFiles('dist');
console.log('Results:');
console.log('- Total content pages checked:', contentPages);
console.log('- Total redirect stubs skipped:', redirectPages);
console.log('- Content pages with exactly 1 gtag.js script:', gtmFoundCount);
console.log('- Content pages with exactly 1 gtag config:', configFoundCount);
console.log('- Errors or duplicates:', duplicates);
