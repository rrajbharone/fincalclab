import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

function startServer(port = 8768) {
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

  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

async function deepAudit() {
  const server = await startServer(8768);
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
    await page.goto('http://localhost:8768/calculator/capital-gains-tax-calculator/', { waitUntil: 'networkidle0' });

    const audit = await page.evaluate(w => {
      const items = [];
      const all = document.querySelectorAll('*');

      for (const el of all) {
        if (el === document.documentElement || el === document.body) continue;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        // Check if element's outer box exceeds viewport
        const isPastViewport = rect.right > w || rect.left < 0;
        // Check if element has fixed or min-width wider than viewport
        const computedWidth = parseFloat(style.width);
        const computedMinWidth = parseFloat(style.minWidth);
        const hasLargeMin = computedMinWidth > w;

        // Check parent container
        const parent = el.parentElement;
        const parentRect = parent ? parent.getBoundingClientRect() : null;
        const exceedsParent = parentRect && (rect.width > parentRect.width + 1);

        // Exclude legitimate scroll containers (like .table-responsive-wrapper table)
        let isInsideTableScroll = false;
        let p = parent;
        while (p) {
          if (p.classList && p.classList.contains('table-responsive-wrapper')) {
            isInsideTableScroll = true;
            break;
          }
          p = p.parentElement;
        }

        if ((isPastViewport || hasLargeMin || (exceedsParent && !isInsideTableScroll)) && !isInsideTableScroll) {
          items.push({
            tag: el.tagName.toLowerCase(),
            id: el.id,
            className: typeof el.className === 'string' ? el.className : '',
            rectWidth: Math.round(rect.width),
            rectLeft: Math.round(rect.left),
            rectRight: Math.round(rect.right),
            parentTag: parent?.tagName.toLowerCase() || '',
            parentClass: typeof parent?.className === 'string' ? parent.className : '',
            parentWidth: parentRect ? Math.round(parentRect.width) : 0,
            styleWidth: style.width,
            styleMinWidth: style.minWidth,
            styleMaxWidth: style.maxWidth,
            display: style.display,
            overflowX: style.overflowX
          });
        }
      }

      return items;
    }, width);

    console.log(`\n=== Viewport ${width}px: Found ${audit.length} potentially problematic elements ===`);
    audit.forEach((a, i) => {
      console.log(`${i + 1}. <${a.tag} id="${a.id}" class="${a.className}">: rectWidth=${a.rectWidth}px, left=${a.rectLeft}px, right=${a.rectRight}px, parent <${a.parentTag} class="${a.parentClass}"> width=${a.parentWidth}px | minW=${a.styleMinWidth}, maxW=${a.styleMaxWidth}, display=${a.display}, overflowX=${a.overflowX}`);
    });
  }

  await browser.close();
  server.close();
}

deepAudit().catch(console.error);
