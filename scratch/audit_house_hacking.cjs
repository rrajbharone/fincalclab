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
  const server = await startServer(8799);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const widths = [320, 360, 375, 390, 430, 768, 1024];
  let overallPassed = true;

  for (const width of widths) {
    await page.setViewport({ width, height: 900 });
    await page.goto('http://localhost:8799/calculator/house-hacking-calculator/', { waitUntil: 'networkidle0' });

    // Test 1: Default view
    let res = await checkOverflow(page, width, 'Default View');
    if (!res.passed) overallPassed = false;

    // Test 2: Multi-Currency Switcher (USD, CAD, GBP, EUR, INR, JPY)
    const currencies = ['USD', 'CAD', 'GBP', 'EUR', 'INR', 'JPY'];
    for (const cur of currencies) {
      await page.select('#hh-currency-select', cur);
      await new Promise(r => setTimeout(r, 60));
      res = await checkOverflow(page, width, `Currency ${cur}`);
      if (!res.passed) overallPassed = false;
    }

    // Test 3: Units Stepper / Dynamic Addition (3 units, 4 units)
    await page.select('#hh-units-count-select', '4');
    await new Promise(r => setTimeout(r, 60));
    res = await checkOverflow(page, width, '4 Units Configuration');
    if (!res.passed) overallPassed = false;

    // Test 4: Positive Cash Flow Scenario (High Rents)
    await page.$eval('#hh-price-input', el => { el.value = '350000'; el.dispatchEvent(new Event('input')); });
    await page.$eval('#hh-dp-pct-input', el => { el.value = '20'; el.dispatchEvent(new Event('input')); });
    await page.$eval('#hh-other-income-input', el => { el.value = '300'; el.dispatchEvent(new Event('input')); });
    await new Promise(r => setTimeout(r, 60));
    res = await checkOverflow(page, width, 'Positive Cash Flow State');
    if (!res.passed) overallPassed = false;

    // Test 5: Extreme High Numbers (e.g. $1,800,000 Luxury House Hack with INR currency)
    await page.select('#hh-currency-select', 'INR');
    await page.$eval('#hh-price-input', el => { el.value = '18000000'; el.dispatchEvent(new Event('input')); });
    await page.$eval('#hh-tax-input', el => { el.value = '50000'; el.dispatchEvent(new Event('input')); });
    await new Promise(r => setTimeout(r, 60));
    res = await checkOverflow(page, width, 'Extreme High Numbers (INR)');
    if (!res.passed) overallPassed = false;

    // Test 6: Reset Back to Defaults
    await page.click('#hh-reset-btn');
    await new Promise(r => setTimeout(r, 60));
    res = await checkOverflow(page, width, 'Reset Defaults');
    if (!res.passed) overallPassed = false;
  }

  await browser.close();
  server.close();

  if (overallPassed) {
    console.log('\n🎉 ALL VIEWPORTS PASSED! Zero horizontal overflow detected (320px - 1024px).');
  } else {
    console.error('\n❌ OVERFLOW DETECTED IN ONE OR MORE VIEWPORTS.');
    process.exit(1);
  }
}

async function checkOverflow(page, width, context) {
  const result = await page.evaluate(w => {
    const docSW = document.documentElement.scrollWidth;
    const docCW = document.documentElement.clientWidth;
    const bodySW = document.body.scrollWidth;
    const bodyCW = document.body.clientWidth;

    function isInsideScrollContainer(el) {
      let curr = el.parentElement;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        const style = window.getComputedStyle(curr);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
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
            rect: { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) },
            text: (el.textContent || '').trim().substring(0, 40)
          });
        }
      }
    }

    return {
      docSW, docCW, bodySW, bodyCW,
      overflow: docSW > docCW + 1 || bodySW > bodyCW + 1 || badElements.length > 0,
      badElements: badElements.slice(0, 5)
    };
  }, width);

  if (result.overflow) {
    console.log(`❌ FAIL [${width}px - ${context}]: docSW=${result.docSW}, docCW=${result.docCW}, bodySW=${result.bodySW}, bodyCW=${result.bodyCW}`);
    result.badElements.forEach(b => {
      console.log(`   Element <${b.tag} id="${b.id}" class="${b.className}"> right=${b.rect.right}px: "${b.text}"`);
    });
    return { passed: false };
  } else {
    console.log(`✅ PASS [${width}px - ${context}]: perfectly fits viewport.`);
    return { passed: true };
  }
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
