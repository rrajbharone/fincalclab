const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

function startServer(port = 8798) {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2'
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(process.cwd(), 'dist', req.url);
    if (filePath.endsWith('/') || !path.extname(filePath)) {
      filePath = path.join(filePath, 'index.html');
    }
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(data);
    });
  });

  return new Promise(resolve => {
    server.listen(port, () => resolve(server));
  });
}

async function verifyUI() {
  const server = await startServer(8798);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const widths = [320, 360, 375, 390, 430, 1024];

  for (const width of widths) {
    await page.setViewport({ width, height: 1000 });
    await page.goto('http://localhost:8798/calculator/house-hacking-calculator/', { waitUntil: 'networkidle0' });

    // Wait for client-side JS to render dynamic units & formula steps
    await page.waitForSelector('.tenant-unit-card');
    await page.waitForSelector('.formula-step-highlight');

    const details = await page.evaluate(() => {
      const cards = document.querySelectorAll('.tenant-unit-card');
      const cardStyles = [];
      cards.forEach((c, idx) => {
        const rect = c.getBoundingClientRect();
        const main = c.querySelector('.tenant-unit-main');
        const mainStyle = window.getComputedStyle(main);
        const sym = c.querySelector('.currency-symbol');
        const symStyle = sym ? window.getComputedStyle(sym) : null;
        const inp = c.querySelector('.hh-unit-rent-input');
        const inpStyle = inp ? window.getComputedStyle(inp) : null;
        const btn = c.querySelector('.unit-delete-btn');
        const btnStyle = btn ? window.getComputedStyle(btn) : null;

        cardStyles.push({
          idx,
          width: rect.width,
          height: rect.height,
          mainDisplay: mainStyle.display,
          symPosition: symStyle ? symStyle.position : null,
          symLeft: symStyle ? symStyle.left : null,
          inpPaddingLeft: inpStyle ? inpStyle.paddingLeft : null,
          btnDisplay: btnStyle ? btnStyle.display : null
        });
      });

      const highlight = document.querySelector('.formula-step-highlight');
      const hlStyle = highlight ? window.getComputedStyle(highlight) : null;
      const hlRect = highlight ? highlight.getBoundingClientRect() : null;

      // Check overflow
      const docSW = document.documentElement.scrollWidth;
      const docCW = document.documentElement.clientWidth;
      const bodySW = document.body.scrollWidth;
      const bodyCW = document.body.clientWidth;

      return {
        cardStyles,
        highlightPaddingLeft: hlStyle ? hlStyle.paddingLeft : null,
        highlightBorderLeft: hlStyle ? hlStyle.borderLeft : null,
        highlightBackground: hlStyle ? hlStyle.backgroundColor : null,
        overflow: docSW > docCW + 1 || bodySW > bodyCW + 1
      };
    });

    console.log(`\n=== VIEWPORT ${width}px ===`);
    console.log(`Overflow: ${details.overflow ? '❌ FAIL' : '✅ PASS'}`);
    console.log(`Tenant Cards count: ${details.cardStyles.length}`);
    details.cardStyles.forEach(c => {
      console.log(`  Card ${c.idx + 1}: height=${Math.round(c.height)}px, mainDisplay=${c.mainDisplay}, symPosition=${c.symPosition}, symLeft=${c.symLeft}, inpPaddingLeft=${c.inpPaddingLeft}`);
    });
    console.log(`Step 6 Highlight: paddingLeft=${details.highlightPaddingLeft}, borderLeft=${details.highlightBorderLeft}`);

    // Take screenshot on 375px (mobile) and 1024px (desktop)
    if (width === 375) {
      await page.screenshot({ path: 'scratch/screenshot_mobile_375.png', fullPage: true });
    }
    if (width === 1024) {
      await page.screenshot({ path: 'scratch/screenshot_desktop_1024.png', fullPage: true });
    }
  }

  await browser.close();
  server.close();
  console.log('\n🎉 ALL CHECKS COMPLETED SUCCESSFULLY!');
}

verifyUI().catch(err => {
  console.error(err);
  process.exit(1);
});
