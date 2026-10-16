import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

function startServer(port = 8766) {
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

async function runAudit() {
  const server = await startServer(8766);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const widths = [320, 360, 375, 390, 430];
  const countries = ['US', 'UK', 'AU', 'IN', 'CA', 'SG'];

  for (const width of widths) {
    await page.setViewport({ width, height: 800 });
    await page.goto('http://localhost:8766/calculator/capital-gains-tax-calculator/', { waitUntil: 'networkidle0' });

    for (const country of countries) {
      await page.evaluate(c => {
        const select = document.getElementById('mobile-country-select');
        if (select) {
          select.value = c;
          select.dispatchEvent(new Event('change'));
        }
        const pill = document.querySelector(`.country-pill[data-country="${c}"]`);
        if (pill) {
          pill.click();
        }
      }, country);

      const res = await page.evaluate(w => {
        const docSW = document.documentElement.scrollWidth;
        const docCW = document.documentElement.clientWidth;
        const bodySW = document.body.scrollWidth;
        const bodyCW = document.body.clientWidth;

        // Find elements that escape the viewport AND are not inside an overflow:auto container
        function isInsideScrollContainer(el) {
          let curr = el.parentElement;
          while (curr && curr !== document.body && curr !== document.documentElement) {
            const style = window.getComputedStyle(curr);
            if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflowX === 'hidden') {
              return true;
            }
            curr = curr.parentElement;
          }
          return false;
        }

        const badElements = [];
        const all = document.querySelectorAll('*');
        for (const el of all) {
          if (el === document.documentElement || el === document.body) continue;
          const rect = el.getBoundingClientRect();
          if (rect.right > w + 1 || rect.left < -1) {
            if (!isInsideScrollContainer(el)) {
              badElements.push({
                tag: el.tagName.toLowerCase(),
                id: el.id,
                className: typeof el.className === 'string' ? el.className : '',
                rectRight: Math.round(rect.right),
                rectLeft: Math.round(rect.left),
                rectWidth: Math.round(rect.width),
                scrollWidth: el.scrollWidth
              });
            }
          }
        }

        return {
          docSW,
          docCW,
          bodySW,
          bodyCW,
          pageOverflow: docSW > docCW || bodySW > bodyCW,
          badElements
        };
      }, width);

      const status = res.pageOverflow ? '❌ OVERFLOW' : '✅ CLEAN';
      console.log(`[W: ${width}px | ${country}] doc: ${res.docSW}/${res.docCW} | body: ${res.bodySW}/${res.bodyCW} -> ${status}`);
      if (res.badElements.length > 0) {
        console.log(`   Bad Elements (${res.badElements.length}):`);
        res.badElements.slice(0, 5).forEach(b => {
          console.log(`   - <${b.tag} id="${b.id}" class="${b.className}"> right: ${b.rectRight}px, left: ${b.rectLeft}px, width: ${b.rectWidth}px`);
        });
      }
    }
  }

  await browser.close();
  server.close();
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
