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

async function verifyMinimumPayment() {
  const server = await startServer(8798);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const widths = [320, 360, 375, 390, 430, 768, 1024, 1280];

  console.log('\n--- VERIFYING RESPONSIVENESS & OVERLAP ACROSS ALL VIEWPORTS ---');
  for (const width of widths) {
    await page.setViewport({ width, height: 900 });
    await page.goto('http://localhost:8798/calculator/minimum-payment-trap-calculator/', { waitUntil: 'networkidle0' });

    const checks = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const hasOverflow = scrollWidth > clientWidth;

      function checkOverlap(labelSel, inputSel) {
        const l = document.querySelector(labelSel);
        const i = document.querySelector(inputSel);
        if (!l || !i) return false;
        const lr = l.getBoundingClientRect();
        const ir = i.getBoundingClientRect();
        return !(
          lr.right <= ir.left ||
          lr.left >= ir.right ||
          lr.bottom <= ir.top ||
          lr.top >= ir.bottom
        );
      }

      const curOverlap = checkOverlap('label[for="mpt-currency-select"]', '#mpt-currency-select');
      const methOverlap = checkOverlap('label[for="mpt-method-select"]', '#mpt-method-select');
      const balOverlap = checkOverlap('label[for="mpt-balance-input"]', '#mpt-balance-input');
      const aprOverlap = checkOverlap('label[for="mpt-apr-input"]', '#mpt-apr-input');
      const minPctOverlap = checkOverlap('label[for="mpt-minpct-input"]', '#mpt-minpct-input');
      const minDolOverlap = checkOverlap('label[for="mpt-mindollar-input"]', '#mpt-mindollar-input');

      const payoffText = document.getElementById('res-payoff-time')?.textContent;
      const interestText = document.getElementById('res-total-interest')?.textContent;
      const totalPaidText = document.getElementById('res-total-paid')?.textContent;

      return {
        hasOverflow,
        scrollWidth,
        clientWidth,
        curOverlap,
        methOverlap,
        balOverlap,
        aprOverlap,
        minPctOverlap,
        minDolOverlap,
        payoffText,
        interestText,
        totalPaidText
      };
    });

    console.log(`\nViewport ${width}px:`);
    console.log(`  Horizontal Overflow: ${checks.hasOverflow ? '❌ FAIL' : '✅ PASS'} (${checks.clientWidth}px / ${checks.scrollWidth}px)`);
    console.log(`  Currency Overlap: ${checks.curOverlap ? '❌ FAIL' : '✅ PASS'}`);
    console.log(`  Method Overlap: ${checks.methOverlap ? '❌ FAIL' : '✅ PASS'}`);
    console.log(`  Balance Overlap: ${checks.balOverlap ? '❌ FAIL' : '✅ PASS'}`);
    console.log(`  APR Overlap: ${checks.aprOverlap ? '❌ FAIL' : '✅ PASS'}`);
    console.log(`  Min Pct Overlap: ${checks.minPctOverlap ? '❌ FAIL' : '✅ PASS'}`);
    console.log(`  Min Dollar Overlap: ${checks.minDolOverlap ? '❌ FAIL' : '✅ PASS'}`);
    console.log(`  Payoff Time: ${checks.payoffText} | Interest: ${checks.interestText} | Total Paid: ${checks.totalPaidText}`);
  }

  // Interactive UI Test
  console.log('\n--- TESTING USER INTERACTION & CALCULATIONS ---');
  await page.setViewport({ width: 1024, height: 900 });
  await page.goto('http://localhost:8798/calculator/minimum-payment-trap-calculator/', { waitUntil: 'networkidle0' });

  // Test Method switch to Method A
  const methodTest = await page.evaluate(() => {
    const methodSel = document.getElementById('mpt-method-select');
    methodSel.value = 'A';
    methodSel.dispatchEvent(new Event('change', { bubbles: true }));

    const minPctVal = document.getElementById('mpt-minpct-input').value;
    const minPctSliderVal = document.getElementById('mpt-minpct-slider').value;
    const hint = document.getElementById('mpt-method-hint').textContent;
    const payoff = document.getElementById('res-payoff-time').textContent;

    return { minPctVal, minPctSliderVal, hint, payoff };
  });
  console.log('Method A Switch Result:', methodTest);

  // Test Reset button
  const resetTest = await page.evaluate(() => {
    const resetBtn = document.getElementById('mpt-reset-btn');
    resetBtn.click();

    return {
      balance: document.getElementById('mpt-balance-input').value,
      method: document.getElementById('mpt-method-select').value,
      minPct: document.getElementById('mpt-minpct-input').value,
      minPctSlider: document.getElementById('mpt-minpct-slider').value,
      minDollar: document.getElementById('mpt-mindollar-input').value,
      minDollarSlider: document.getElementById('mpt-mindollar-slider').value,
      payoff: document.getElementById('res-payoff-time').textContent
    };
  });
  console.log('Reset Button Result:', resetTest);

  // Capture Section 1 & 2 at 375px mobile
  await page.setViewport({ width: 375, height: 900 });
  await page.goto('http://localhost:8798/calculator/minimum-payment-trap-calculator/', { waitUntil: 'networkidle0' });
  const clip375 = await page.evaluate(() => {
    const el = document.getElementById('minimum-payment-calculator');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: 620 };
  });
  await page.screenshot({ path: 'scratch/mobile_375_inputs.png', clip: clip375 });

  // Capture Section 1 & 2 at 320px mobile
  await page.setViewport({ width: 320, height: 900 });
  await page.goto('http://localhost:8798/calculator/minimum-payment-trap-calculator/', { waitUntil: 'networkidle0' });
  const clip320 = await page.evaluate(() => {
    const el = document.getElementById('minimum-payment-calculator');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: 620 };
  });
  await page.screenshot({ path: 'scratch/mobile_320_inputs.png', clip: clip320 });

  console.log('\nConsole Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Console Errors:', consoleErrors);
  }

  await browser.close();
  server.close();
}

verifyMinimumPayment().catch(console.error);
