const fs = require('fs');
const path = require('path');

let contentPages = 0;
let redirectPages = 0;
let adsenseScriptCount = 0;
let adsensePubCount = 0;
let gaScriptCount = 0;
let gaConfigCount = 0;
let errors = 0;

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
        // Verify redirect stubs do NOT have AdSense or GA
        if (html.includes('ca-pub-7540535625351801') || html.includes('G-CKKLEGT7GR')) {
          console.error('Error: Redirect page has tracking scripts:', fullPath);
          errors++;
        }
        continue;
      }

      contentPages++;
      const adsenseMatches = html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-7540535625351801/g);
      const pubMatches = html.match(/ca-pub-7540535625351801/g);
      const gaMatches = html.match(/googletagmanager\.com\/gtag\/js\?id=G-CKKLEGT7GR/g);
      const configMatches = html.match(/gtag\('config',\s*'G-CKKLEGT7GR'\)/g);

      if (adsenseMatches && adsenseMatches.length === 1) {
        adsenseScriptCount++;
      } else {
        console.error('Mismatch AdSense script count in:', fullPath, adsenseMatches ? adsenseMatches.length : 0);
        errors++;
      }

      if (pubMatches && pubMatches.length === 1) {
        adsensePubCount++;
      } else {
        console.error('Mismatch AdSense pub ID count in:', fullPath, pubMatches ? pubMatches.length : 0);
        errors++;
      }

      if (gaMatches && gaMatches.length === 1) {
        gaScriptCount++;
      } else {
        console.error('Mismatch GA script count in:', fullPath, gaMatches ? gaMatches.length : 0);
        errors++;
      }

      if (configMatches && configMatches.length === 1) {
        gaConfigCount++;
      } else {
        console.error('Mismatch GA config count in:', fullPath, configMatches ? configMatches.length : 0);
        errors++;
      }
    }
  }
}

checkHtmlFiles('dist');
console.log('=== VERIFICATION AUDIT RESULTS ===');
console.log('Total content pages audited:', contentPages);
console.log('Total redirect stubs audited:', redirectPages);
console.log('Content pages with exactly 1 AdSense script:', adsenseScriptCount);
console.log('Content pages with exactly 1 AdSense Publisher ID:', adsensePubCount);
console.log('Content pages with exactly 1 Google Analytics script:', gaScriptCount);
console.log('Content pages with exactly 1 Google Analytics config:', gaConfigCount);
console.log('Total errors / duplicates found:', errors);
