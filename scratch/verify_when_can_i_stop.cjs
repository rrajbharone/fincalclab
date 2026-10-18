const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

function startServer(port = 8802) {
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

async function verifyWhenCanIStop() {
  const server = await startServer(8802);
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
    await page.goto('http://localhost:8802/calculator/when-can-i-stop-saving-for-retirement-calculator/', { waitUntil: 'networkidle0' });

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

      const curOverlap = checkOverlap('label[for="wss-currency-select"]', '#wss-currency-select');
      const curAgeOverlap = checkOverlap('label[for="wss-current-age-input"]', '#wss-current-age-input');
      const retAgeOverlap = checkOverlap('label[for="wss-retire-age-input"]', '#wss-retire-age-input');
      const expOverlap = checkOverlap('label[for="wss-expenses-input"]', '#wss-expenses-input');
      const invOverlap = checkOverlap('label[for="wss-investments-input"]', '#wss-investments-input');
      const contribOverlap = checkOverlap('label[for="wss-contrib-input"]', '#wss-contrib-input');
      const retOverlap = checkOverlap('label[for="wss-return-input"]', '#wss-return-input');
      const infOverlap = checkOverlap('label[for="wss-inflation-input"]', '#wss-inflation-input');
      const swrOverlap = checkOverlap('label[for="wss-swr-input"]', '#wss-swr-input');

      const stopAge = document.getElementById('res-stop-age')?.textContent;
      const projPort = document.getElementById('res-projected-port')?.textContent;
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
        contribOverlap,
        retOverlap,
        infOverlap,
        swrOverlap,
        stopAge,
        projPort,
        bannerTitle
      };
    });

    console.log(`\nViewport ${width}px:`);
    console.log(`  Horizontal Overflow: ${checks.hasOverflow ? '❌ FAIL' : '✅ PASS'} (${checks.clientWidth}px / ${checks.scrollWidth}px)`);
    console.log(`  Input Overlaps: ${(!checks.curOverlap && !checks.curAgeOverlap && !checks.retAgeOverlap && !checks.expOverlap && !checks.invOverlap && !checks.contribOverlap && !checks.retOverlap && !checks.infOverlap && !checks.swrOverlap) ? '✅ ZERO OVERLAP' : '❌ OVERLAP DETECTED'}`);
    console.log(`  Stop Age: ${checks.stopAge} | Projected at Retirement: ${checks.projPort}`);
    console.log(`  Alert Banner: ${checks.bannerTitle}`);
  }

  console.log('\n======================================================');
  console.log('2. TESTING MATHEMATICAL SIMULATION & USER INTERACTIONS');
  console.log('======================================================');
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:8802/calculator/when-can-i-stop-saving-for-retirement-calculator/', { waitUntil: 'networkidle0' });

  // Test Case A: Baseline Defaults
  const defaultResults = await page.evaluate(() => {
    return {
      stopAge: document.getElementById('res-stop-age')?.textContent,
      timeRemaining: document.getElementById('lbl-stop-time-sub')?.textContent,
      targetPort: document.getElementById('tile-target-port')?.textContent,
      balanceAtStop: document.getElementById('tile-balance-at-stop')?.textContent,
      projectedAtRetire: document.getElementById('res-projected-port')?.textContent,
      surplus: document.getElementById('tile-surplus-gap')?.textContent,
      banner: document.getElementById('res-alert-title')?.textContent,
      timelineBadge: document.getElementById('res-timeline-badge')?.textContent
    };
  });
  console.log('Baseline Defaults Test (Age 30->65, $50k exp, $100k inv, $12k contrib, 8% return, 2.5% inf, 4% SWR):');
  console.log(defaultResults);

  // Test Case B: Already Met (Coast FIRE balance of $250,000)
  console.log('\nTesting Already Met Scenario ($250,000 existing investments):');
  const alreadyMetResults = await page.evaluate(() => {
    const invInput = document.getElementById('wss-investments-input');
    invInput.value = '250000';
    invInput.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      stopAge: document.getElementById('res-stop-age')?.textContent,
      timeRemaining: document.getElementById('lbl-stop-time-sub')?.textContent,
      projectedAtRetire: document.getElementById('res-projected-port')?.textContent,
      surplus: document.getElementById('tile-surplus-gap')?.textContent,
      banner: document.getElementById('res-alert-title')?.textContent,
      timelineBadge: document.getElementById('res-timeline-badge')?.textContent
    };
  });
  console.log(alreadyMetResults);

  // Test Case C: Shortfall / Needs More Savings ($50k inv, $3k contrib, $80k exp, Age 50->60)
  console.log('\nTesting Shortfall Scenario (Age 50->60, $80k exp, $50k inv, $3k contrib):');
  const shortfallResults = await page.evaluate(() => {
    const curAge = document.getElementById('wss-current-age-input');
    curAge.value = '50';
    curAge.dispatchEvent(new Event('input', { bubbles: true }));

    const retAge = document.getElementById('wss-retire-age-input');
    retAge.value = '60';
    retAge.dispatchEvent(new Event('input', { bubbles: true }));

    const expInput = document.getElementById('wss-expenses-input');
    expInput.value = '80000';
    expInput.dispatchEvent(new Event('input', { bubbles: true }));

    const invInput = document.getElementById('wss-investments-input');
    invInput.value = '50000';
    invInput.dispatchEvent(new Event('input', { bubbles: true }));

    const contrib = document.getElementById('wss-contrib-input');
    contrib.value = '3000';
    contrib.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      stopAge: document.getElementById('res-stop-age')?.textContent,
      timeRemaining: document.getElementById('lbl-stop-time-sub')?.textContent,
      targetPort: document.getElementById('tile-target-port')?.textContent,
      projectedAtRetire: document.getElementById('res-projected-port')?.textContent,
      shortfall: document.getElementById('tile-surplus-gap')?.textContent,
      banner: document.getElementById('res-alert-title')?.textContent,
      timelineBadge: document.getElementById('res-timeline-badge')?.textContent
    };
  });
  console.log(shortfallResults);

  // Test Case D: Invalid Age Handling (Current 65, Retire 60)
  console.log('\nTesting Invalid Age Handling (Current 65, Retire 60):');
  const invalidAgeResults = await page.evaluate(() => {
    const curAge = document.getElementById('wss-current-age-input');
    curAge.value = '65';
    curAge.dispatchEvent(new Event('input', { bubbles: true }));

    const retAge = document.getElementById('wss-retire-age-input');
    retAge.value = '60';
    retAge.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      banner: document.getElementById('res-alert-title')?.textContent,
      stopAge: document.getElementById('res-stop-age')?.textContent
    };
  });
  console.log(invalidAgeResults);

  // Test Case E: Reset Button
  console.log('\nTesting Reset Button:');
  const resetResults = await page.evaluate(() => {
    document.getElementById('wss-reset-btn').click();

    return {
      currentAge: document.getElementById('wss-current-age-input').value,
      retireAge: document.getElementById('wss-retire-age-input').value,
      expenses: document.getElementById('wss-expenses-input').value,
      investments: document.getElementById('wss-investments-input').value,
      contrib: document.getElementById('wss-contrib-input').value,
      stopAge: document.getElementById('res-stop-age').textContent,
      banner: document.getElementById('res-alert-title').textContent
    };
  });
  console.log(resetResults);

  // Test Case F: Route Redirect
  console.log('\n======================================================');
  console.log('3. TESTING ROUTE REDIRECT');
  console.log('======================================================');
  await page.goto('http://localhost:8802/when-can-i-stop-saving-for-retirement-calculator/', { waitUntil: 'networkidle0' });
  console.log('Redirect URL landed at:', page.url());

  // Test Case G: Verify Contextual Internal Links
  console.log('\n======================================================');
  console.log('4. VERIFYING CONTEXTUAL INTERNAL LINKS');
  console.log('======================================================');
  const internalLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('.educational-guide a, .related-tools-grid a, .cf-callout-action a'));
    return links.map(a => a.getAttribute('href'));
  });
  console.log('Discovered internal links in content:', internalLinks);

  for (const link of internalLinks) {
    if (!link.startsWith('http')) {
      const checkUrl = `http://localhost:8802${link}`;
      const res = await page.goto(checkUrl, { waitUntil: 'networkidle0' });
      console.log(`Link ${link} -> Status ${res.status()}`);
    }
  }

  // Capture Visual Verification Screenshots
  console.log('\n======================================================');
  console.log('5. CAPTURING VISUAL VERIFICATION SCREENSHOTS');
  console.log('======================================================');
  
  // Desktop Full Page
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:8802/calculator/when-can-i-stop-saving-for-retirement-calculator/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'scratch/wss_desktop_full.png', fullPage: true });

  // Desktop Results Card
  const resultsClip = await page.evaluate(() => {
    const el = document.querySelector('.calc-results-card');
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y + window.scrollY), width: r.width, height: r.height };
  });
  await page.screenshot({ path: 'scratch/wss_results_card.png', clip: resultsClip });

  // Mobile 375px Full Page
  await page.setViewport({ width: 375, height: 900 });
  await page.goto('http://localhost:8802/calculator/when-can-i-stop-saving-for-retirement-calculator/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'scratch/wss_mobile_375.png', fullPage: true });

  // Mobile 320px Inputs
  await page.setViewport({ width: 320, height: 900 });
  await page.goto('http://localhost:8802/calculator/when-can-i-stop-saving-for-retirement-calculator/', { waitUntil: 'networkidle0' });
  const inputsClip320 = await page.evaluate(() => {
    const el = document.getElementById('when-can-i-stop-calculator');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: 500 };
  });
  await page.screenshot({ path: 'scratch/wss_mobile_320_inputs.png', clip: inputsClip320 });

  console.log('\nConsole Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Console Errors:', consoleErrors);
  }

  await browser.close();
  server.close();
}

verifyWhenCanIStop().catch(console.error);
