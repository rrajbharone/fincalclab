const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

function startServer(port = 8799) {
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

async function testSection2() {
  const server = await startServer(8799);
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Test across multiple viewport widths: 1280, 1024, 768, 600, 500, 375
  const widths = [1280, 1024, 768, 650, 500, 375];
  for (const width of widths) {
    await page.setViewport({ width, height: 900 });
    await page.goto('http://localhost:8799/calculator/minimum-payment-trap-calculator/', { waitUntil: 'networkidle0' });

    const data = await page.evaluate(() => {
      const mRow = document.querySelector('label[for="mpt-method-select"]')?.parentElement;
      const mLabel = document.querySelector('label[for="mpt-method-select"]');
      const mSelect = document.getElementById('mpt-method-select');

      const pctLabel = document.querySelector('label[for="mpt-minpct-input"]');
      const pctInput = document.getElementById('mpt-minpct-input');
      const pctParent = pctLabel ? pctLabel.parentElement : null;

      const dollarLabel = document.querySelector('label[for="mpt-mindollar-input"]');
      const dollarInput = document.getElementById('mpt-mindollar-input');
      const dollarParent = dollarLabel ? dollarLabel.parentElement : null;

      const lr = mLabel ? mLabel.getBoundingClientRect() : null;
      const sr = mSelect ? mSelect.getBoundingClientRect() : null;
      const methodOverlap = (lr && sr) ? (lr.right > sr.left && lr.bottom > sr.top && lr.top < sr.bottom) : false;

      const plr = pctLabel ? pctLabel.getBoundingClientRect() : null;
      const pir = pctInput ? pctInput.getBoundingClientRect() : null;
      const pctOverlap = (plr && pir) ? (plr.right > pir.left && plr.bottom > pir.top && plr.top < pir.bottom) : false;

      const dlr = dollarLabel ? dollarLabel.getBoundingClientRect() : null;
      const dir = dollarInput ? dollarInput.getBoundingClientRect() : null;
      const dollarOverlap = (dlr && dir) ? (dlr.right > dir.left && dlr.bottom > dir.top && dlr.top < dir.bottom) : false;

      return {
        mRowWidth: mRow ? mRow.getBoundingClientRect().width : null,
        methodOverlap,
        pctRowWidth: pctParent ? pctParent.getBoundingClientRect().width : null,
        pctOverlap,
        plr,
        pir,
        dollarOverlap,
        dlr,
        dir
      };
    });

    console.log(`\nWidth ${width}px:`);
    console.log(`  Method Row width: ${data.mRowWidth} | Method Overlap: ${data.methodOverlap ? '❌ YES' : '✅ NO'}`);
    console.log(`  Pct Col width: ${data.pctRowWidth} | Pct Overlap: ${data.pctOverlap ? '❌ YES' : '✅ NO'}`);
    console.log(`  Dollar Col width: ${data.pctRowWidth} | Dollar Overlap: ${data.dollarOverlap ? '❌ YES' : '✅ NO'}`);
  }

  // Screenshot at 1280px
  await page.setViewport({ width: 1280, height: 900 });
  const clip1280 = await page.evaluate(() => {
    const el = document.querySelector('label[for="mpt-method-select"]').closest('.input-group').parentElement;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: 350 };
  });
  await page.screenshot({ path: 'scratch/desktop_1280_section2.png', clip: clip1280 });

  // Screenshot at 768px
  await page.setViewport({ width: 768, height: 900 });
  const clip768 = await page.evaluate(() => {
    const el = document.querySelector('label[for="mpt-method-select"]').closest('.input-group').parentElement;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: 350 };
  });
  await page.screenshot({ path: 'scratch/tablet_768_section2.png', clip: clip768 });

  await browser.close();
  server.close();
}

testSection2().catch(console.error);
