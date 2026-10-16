import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

function startServer(port = 8767) {
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

async function runTest() {
  const server = await startServer(8767);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const widths = [320, 360, 375, 390, 430];

  for (const width of widths) {
    await page.setViewport({ width, height: 900, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:8767/calculator/capital-gains-tax-calculator/', { waitUntil: 'networkidle0' });

    const scrollResult = await page.evaluate(() => {
      window.scrollTo(5000, 0);
      const scrolledX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft;
      return {
        scrolledX,
        docScrollWidth: document.documentElement.scrollWidth,
        docClientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth
      };
    });

    console.log(`Viewport ${width}px: scrolledX = ${scrollResult.scrolledX}px | doc: ${scrollResult.docScrollWidth}/${scrollResult.docClientWidth} | body: ${scrollResult.bodyScrollWidth}/${scrollResult.bodyClientWidth}`);
  }

  await browser.close();
  server.close();
}

runTest().catch(console.error);
