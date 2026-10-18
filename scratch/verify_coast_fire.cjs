const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

function startServer(port = 8801) {
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

async function verifyCoastFire() {
  const server = await startServer(8801);
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

  console.log('\n======================================================');
  console.log('1. VERIFYING RESPONSIVENESS & OVERFLOW ACROSS ALL VIEWPORTS');
  console.log('======================================================');
  for (const width of widths) {
    await page.setViewport({ width, height: 900 });
    await page.goto('http://localhost:8801/calculator/coast-fire-number-calculator/', { waitUntil: 'networkidle0' });

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

      const curOverlap = checkOverlap('label[for="cf-currency-select"]', '#cf-currency-select');
      const curAgeOverlap = checkOverlap('label[for="cf-current-age-input"]', '#cf-current-age-input');
      const retAgeOverlap = checkOverlap('label[for="cf-retire-age-input"]', '#cf-retire-age-input');
      const expOverlap = checkOverlap('label[for="cf-expenses-input"]', '#cf-expenses-input');
      const invOverlap = checkOverlap('label[for="cf-investments-input"]', '#cf-investments-input');
      const retOverlap = checkOverlap('label[for="cf-return-input"]', '#cf-return-input');
      const infOverlap = checkOverlap('label[for="cf-inflation-input"]', '#cf-inflation-input');
      const swrOverlap = checkOverlap('label[for="cf-swr-input"]', '#cf-swr-input');

      const coastNum = document.getElementById('res-coast-fire-num')?.textContent;
      const statusText = document.getElementById('res-surplus-shortfall')?.textContent;
      const bannerTitle = document.getElementById('res-alert-title')?.textContent;

      return {
        hasOverflow,
        scrollWidth,
        clientWidth,
        curOverlap,
        curAgeOverlap,
        retAgeOverlap,
        expOverlap,
        invOverlap,
        retOverlap,
        infOverlap,
        swrOverlap,
        coastNum,
        statusText,
        bannerTitle
      };
    });

    console.log(`\nViewport ${width}px:`);
    console.log(`  Horizontal Overflow: ${checks.hasOverflow ? '❌ FAIL' : '✅ PASS'} (${checks.clientWidth}px / ${checks.scrollWidth}px)`);
    console.log(`  Input Overlaps: ${(!checks.curOverlap && !checks.curAgeOverlap && !checks.retAgeOverlap && !checks.expOverlap && !checks.invOverlap && !checks.retOverlap && !checks.infOverlap && !checks.swrOverlap) ? '✅ ZERO OVERLAP' : '❌ OVERLAP DETECTED'}`);
    console.log(`  Coast FIRE Number: ${checks.coastNum} | Status: ${checks.statusText}`);
    console.log(`  Alert Banner: ${checks.bannerTitle}`);
  }

  console.log('\n======================================================');
  console.log('2. TESTING MATHEMATICAL ACCURACY & INTERACTION');
  console.log('======================================================');
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:8801/calculator/coast-fire-number-calculator/', { waitUntil: 'networkidle0' });

  // Test Case A: Default Baseline Validation
  const defaultResults = await page.evaluate(() => {
    return {
      coastNum: document.getElementById('res-coast-fire-num')?.textContent,
      fullFire: document.getElementById('tile-full-fire')?.textContent,
      projected: document.getElementById('tile-projected-port')?.textContent,
      gap: document.getElementById('tile-gap-amount')?.textContent,
      progress: document.getElementById('res-progress-pct')?.textContent,
      banner: document.getElementById('res-alert-title')?.textContent
    };
  });
  console.log('Baseline Defaults Test (Age 30->65, $50k exp, $100k inv, 8% return, 2.5% inf, 4% SWR):');
  console.log(defaultResults);

  // Test Case B: User Reaches Coast FIRE ($250,000 investments)
  console.log('\nTesting Surpassed Target ($250,000 investments):');
  const surplusResults = await page.evaluate(() => {
    const invInput = document.getElementById('cf-investments-input');
    invInput.value = '250000';
    invInput.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      coastNum: document.getElementById('res-coast-fire-num')?.textContent,
      statusBox: document.getElementById('res-surplus-shortfall')?.textContent,
      statusTitle: document.getElementById('lbl-surplus-title')?.textContent,
      projected: document.getElementById('tile-projected-port')?.textContent,
      progress: document.getElementById('res-progress-pct')?.textContent,
      banner: document.getElementById('res-alert-title')?.textContent
    };
  });
  console.log(surplusResults);

  // Test Case C: Zero Real Return (Return 3%, Inflation 3%)
  console.log('\nTesting Zero Real Return (Nominal 3%, Inflation 3%):');
  const zeroRealResults = await page.evaluate(() => {
    const retInput = document.getElementById('cf-return-input');
    retInput.value = '3.0';
    retInput.dispatchEvent(new Event('input', { bubbles: true }));

    const infInput = document.getElementById('cf-inflation-input');
    infInput.value = '3.0';
    infInput.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      coastNum: document.getElementById('res-coast-fire-num')?.textContent,
      fullFire: document.getElementById('tile-full-fire')?.textContent,
      projected: document.getElementById('tile-projected-port')?.textContent,
      isEqual: document.getElementById('res-coast-fire-num')?.textContent === document.getElementById('tile-full-fire')?.textContent
    };
  });
  console.log(zeroRealResults);

  // Test Case D: Zero Inflation (Nominal 7%, Inflation 0%)
  console.log('\nTesting Zero Inflation (Nominal 7%, Inflation 0%):');
  const zeroInfResults = await page.evaluate(() => {
    const retInput = document.getElementById('cf-return-input');
    retInput.value = '7.0';
    retInput.dispatchEvent(new Event('input', { bubbles: true }));

    const infInput = document.getElementById('cf-inflation-input');
    infInput.value = '0.0';
    infInput.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      coastNum: document.getElementById('res-coast-fire-num')?.textContent,
      fullFire: document.getElementById('tile-full-fire')?.textContent,
      projected: document.getElementById('tile-projected-port')?.textContent
    };
  });
  console.log(zeroInfResults);

  // Test Case E: Invalid Age (Current 65, Retire 60)
  console.log('\nTesting Invalid Age Handling (Current 65, Retire 60):');
  const invalidAgeResults = await page.evaluate(() => {
    const curAge = document.getElementById('cf-current-age-input');
    curAge.value = '65';
    curAge.dispatchEvent(new Event('input', { bubbles: true }));

    const retAge = document.getElementById('cf-retire-age-input');
    retAge.value = '60';
    retAge.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      banner: document.getElementById('res-alert-title')?.textContent,
      coastNum: document.getElementById('res-coast-fire-num')?.textContent,
      yearsText: document.getElementById('tile-years-left')?.textContent
    };
  });
  console.log(invalidAgeResults);

  // Test Case F: Reset Button
  console.log('\nTesting Reset Button:');
  const resetResults = await page.evaluate(() => {
    document.getElementById('cf-reset-btn').click();

    return {
      currentAge: document.getElementById('cf-current-age-input').value,
      retireAge: document.getElementById('cf-retire-age-input').value,
      expenses: document.getElementById('cf-expenses-input').value,
      investments: document.getElementById('cf-investments-input').value,
      returnVal: document.getElementById('cf-return-input').value,
      inflationVal: document.getElementById('cf-inflation-input').value,
      swrVal: document.getElementById('cf-swr-input').value,
      coastNum: document.getElementById('res-coast-fire-num').textContent,
      banner: document.getElementById('res-alert-title').textContent
    };
  });
  console.log(resetResults);

  // Test Case G: Redirect from /coast-fire-number-calculator
  console.log('\n======================================================');
  console.log('3. TESTING ROUTE REDIRECT');
  console.log('======================================================');
  await page.goto('http://localhost:8801/coast-fire-number-calculator/', { waitUntil: 'networkidle0' });
  console.log('Redirect URL landed at:', page.url());

  // Capture Verification Screenshots
  console.log('\n======================================================');
  console.log('4. CAPTURING VISUAL VERIFICATION SCREENSHOTS');
  console.log('======================================================');
  
  // Desktop Full Page
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:8801/calculator/coast-fire-number-calculator/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'scratch/cf_desktop_full.png', fullPage: true });

  // Desktop Results Card
  const resultsClip = await page.evaluate(() => {
    const el = document.querySelector('.calc-results-card');
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y + window.scrollY), width: r.width, height: r.height };
  });
  await page.screenshot({ path: 'scratch/cf_results_card.png', clip: resultsClip });

  // Mobile 375px Full Page
  await page.setViewport({ width: 375, height: 900 });
  await page.goto('http://localhost:8801/calculator/coast-fire-number-calculator/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'scratch/cf_mobile_375.png', fullPage: true });

  // Mobile 320px Inputs
  await page.setViewport({ width: 320, height: 900 });
  await page.goto('http://localhost:8801/calculator/coast-fire-number-calculator/', { waitUntil: 'networkidle0' });
  const inputsClip320 = await page.evaluate(() => {
    const el = document.getElementById('coast-fire-calculator');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: 500 };
  });
  await page.screenshot({ path: 'scratch/cf_mobile_320_inputs.png', clip: inputsClip320 });

  console.log('\nConsole Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Console Errors:', consoleErrors);
  }

  await browser.close();
  server.close();
}

verifyCoastFire().catch(console.error);
