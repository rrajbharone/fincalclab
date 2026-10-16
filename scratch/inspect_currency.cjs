const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

function startServer(port = 8795) {
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
      } else {
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(data);
      }
    });
  });

  return new Promise(resolve => {
    server.listen(port, () => resolve(server));
  });
}

async function inspectCurrency() {
  const server = await startServer(8795);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const widths = [320, 360, 375, 390, 430, 768, 1024];

  for (const width of widths) {
    await page.setViewport({ width, height: 900 });
    await page.goto('http://localhost:8795/calculator/house-hacking-calculator/', { waitUntil: 'networkidle0' });

    const data = await page.evaluate(() => {
      const label = document.querySelector('label[for="hh-currency-select"]');
      const select = document.getElementById('hh-currency-select');
      const parent = label ? label.parentElement : null;
      
      const lr = label ? label.getBoundingClientRect() : null;
      const sr = select ? select.getBoundingClientRect() : null;
      const pr = parent ? parent.getBoundingClientRect() : null;

      // 2D bounding box intersection
      const is2dOverlapping = (lr && sr) ? !(
        lr.right <= sr.left ||
        lr.left >= sr.right ||
        lr.bottom <= sr.top ||
        lr.top >= sr.bottom
      ) : false;

      // Vertical distance between bottom of label and top of select (if stacked)
      const verticalGap = (lr && sr) ? (sr.top - lr.bottom) : null;
      // Horizontal distance between right of label and left of select (if side-by-side)
      const horizontalGap = (lr && sr) ? (sr.left - lr.right) : null;

      return {
        parentWidth: pr ? pr.width : null,
        labelRect: lr ? { left: lr.left, right: lr.right, top: lr.top, bottom: lr.bottom, width: lr.width, height: lr.height } : null,
        selectRect: sr ? { left: sr.left, right: sr.right, top: sr.top, bottom: sr.bottom, width: sr.width, height: sr.height } : null,
        is2dOverlapping,
        verticalGap,
        horizontalGap
      };
    });

    console.log(`\n=== Viewport ${width}px ===`);
    console.log(`Parent width: ${data.parentWidth}`);
    console.log(`Label rect:`, data.labelRect);
    console.log(`Select rect:`, data.selectRect);
    console.log(`2D Overlap: ${data.is2dOverlapping ? '❌ YES' : '✅ NO'}`);
    if (data.verticalGap >= 0) {
      console.log(`Layout: Vertically stacked (gap: ${data.verticalGap}px)`);
    } else {
      console.log(`Layout: Side-by-side (gap: ${data.horizontalGap}px)`);
    }
  }

  // Screenshot at 375px
  await page.setViewport({ width: 375, height: 900 });
  const clip375 = await page.evaluate(() => {
    const el = document.querySelector('label[for="hh-currency-select"]').closest('.calc-inputs-wrapper');
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: 260 };
  });
  await page.screenshot({ path: 'scratch/currency_card_375.png', clip: clip375 });

  // Screenshot at 320px
  await page.setViewport({ width: 320, height: 900 });
  const clip320 = await page.evaluate(() => {
    const el = document.querySelector('label[for="hh-currency-select"]').closest('.calc-inputs-wrapper');
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: 260 };
  });
  await page.screenshot({ path: 'scratch/currency_card_320.png', clip: clip320 });

  await browser.close();
  server.close();
}

inspectCurrency().catch(console.error);
