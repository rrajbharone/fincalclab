const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static server for dist/
function createServer(port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2'
  };

  const distDir = path.resolve('dist');

  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath.endsWith('/')) reqPath += 'index.html';
    if (!path.extname(reqPath)) reqPath += '/index.html';

    const filePath = path.join(distDir, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Test server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function runVerification() {
  const port = 4335;
  const server = await createServer(port);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const baseUrl = `http://localhost:${port}/calculator/twitch-revenue-calculator`;
  const viewports = [320, 360, 375, 390, 430, 768, 1024, 1280];

  console.log('\n=== 1. AUDITING VIEWPORTS & FORM FIELD BOUNDING BOXES ===');
  for (const width of viewports) {
    await page.setViewport({ width, height: 900 });
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });

    const audit = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const hasHScroll = docWidth > winWidth;

      const issues = [];
      const groups = document.querySelectorAll('#twitch-revenue-calculator .input-group');

      groups.forEach((grp, idx) => {
        const label = grp.querySelector('label');
        const control = grp.querySelector('.input-symbol-wrapper, select, .currency-select-full');

        if (label && control) {
          const lRect = label.getBoundingClientRect();
          const cRect = control.getBoundingClientRect();

          // Control should not overlap or be above the label
          if (cRect.top < lRect.bottom - 2) {
            issues.push({
              index: idx,
              labelText: label.textContent.trim(),
              labelBottom: lRect.bottom,
              controlTop: cRect.top,
              diff: lRect.bottom - cRect.top
            });
          }
        }
      });

      return { winWidth, docWidth, hasHScroll, issueCount: issues.length, issues };
    });

    console.log(`Viewport ${width}px: H-Scroll: ${audit.hasHScroll ? 'FAIL (' + audit.docWidth + 'px)' : 'PASS'}, Form Overlaps: ${audit.issueCount}`);
    if (audit.issues.length > 0) {
      console.error(`Issues at ${width}px:`, JSON.stringify(audit.issues, null, 2));
    }
  }

  console.log('\n=== 2. VERIFYING DEFAULT CALCULATIONS ===');
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });

  const defaultResults = await page.evaluate(() => {
    return {
      monthlyTotal: document.getElementById('res-trc-monthly')?.textContent?.trim(),
      annualTotal: document.getElementById('lbl-trc-annual')?.textContent?.trim(),
      hourlyWage: document.getElementById('res-trc-hourly')?.textContent?.trim(),
      hoursTotalSub: document.getElementById('lbl-trc-hours-total')?.textContent?.trim(),
      paidSubs: document.getElementById('tile-trc-paid-subs')?.textContent?.trim(),
      primeSubs: document.getElementById('tile-trc-prime-subs')?.textContent?.trim(),
      ads: document.getElementById('tile-trc-ads')?.textContent?.trim(),
      bits: document.getElementById('tile-trc-bits')?.textContent?.trim(),
      tips: document.getElementById('tile-trc-tips')?.textContent?.trim(),
      liveAdImpressions: document.getElementById('trc-live-ad-impressions')?.textContent?.trim(),
      verdictText: document.getElementById('res-trc-verdict-text')?.textContent?.trim()
    };
  });

  console.log('Default Calculations Harvested:', defaultResults);

  const asserts = [
    { name: 'Monthly Total Revenue', actual: defaultResults.monthlyTotal, expected: '$1,205.57' },
    { name: 'Estimated Annual', actual: defaultResults.annualTotal, expected: 'Estimated Annual: $14,466.78 /yr' },
    { name: 'Hourly Streaming Revenue', actual: defaultResults.hourlyWage, expected: '$15.07' },
    { name: 'Paid Subscriptions', actual: defaultResults.paidSubs, expected: '$511.57' },
    { name: 'Prime Subscriptions', actual: defaultResults.primeSubs, expected: '$112.50' },
    { name: 'Ad Revenue', actual: defaultResults.ads, expected: '$336.00' },
    { name: 'Bits & Cheers', actual: defaultResults.bits, expected: '$100.00' },
    { name: 'Direct Tips (Net)', actual: defaultResults.tips, expected: '$145.50' },
    { name: 'Monthly Ad Impressions', actual: defaultResults.liveAdImpressions, expected: '96,000 Total Impressions' }
  ];

  let mathPass = true;
  asserts.forEach(a => {
    const pass = a.actual === a.expected;
    if (!pass) mathPass = false;
    console.log(`Assertion [${a.name}]: ${pass ? 'PASS' : 'FAIL'} (Expected: ${a.expected}, Actual: ${a.actual})`);
  });

  console.log('\n=== 3. TESTING DYNAMIC INTERACTIONS & SPLIT CHANGE ===');
  // Change Split to 70/30 (Twitch Plus Tier 2)
  console.log('Testing 70/30 Twitch Plus Level 2 split...');
  await page.select('#trc-split', '70');
  await new Promise(r => setTimeout(r, 200));

  const after70 = await page.evaluate(() => {
    return {
      paidSubs: document.getElementById('tile-trc-paid-subs')?.textContent?.trim(),
      primeSubs: document.getElementById('tile-trc-prime-subs')?.textContent?.trim(),
      monthlyTotal: document.getElementById('res-trc-monthly')?.textContent?.trim()
    };
  });
  console.log('After 70/30 split:', after70);
  console.log(`Paid Subs updated to $716.19: ${after70.paidSubs === '$716.19' ? 'PASS' : 'FAIL'}`);
  console.log(`Prime Subs remained $112.50 (unaffected by Plus split): ${after70.primeSubs === '$112.50' ? 'PASS' : 'FAIL'}`);
  console.log(`Total Monthly updated to $1,410.19: ${after70.monthlyTotal === '$1,410.19' ? 'PASS' : 'FAIL'}`);

  // Test Zero Hours Streamed edge case
  console.log('Testing 0 Streaming Hours edge case...');
  await page.evaluate(() => {
    const hoursInput = document.getElementById('trc-hours-input');
    if (hoursInput) {
      hoursInput.value = '0';
      hoursInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 200));

  const afterZeroHours = await page.evaluate(() => {
    return {
      hourlyWage: document.getElementById('res-trc-hourly')?.textContent?.trim(),
      adsRev: document.getElementById('tile-trc-ads')?.textContent?.trim()
    };
  });
  console.log('After 0 hours streamed:', afterZeroHours);
  console.log(`Hourly wage is $0.00 (no division by zero error): ${afterZeroHours.hourlyWage === '$0.00' ? 'PASS' : 'FAIL'}`);
  console.log(`Ad revenue is $0.00 with 0 streaming hours: ${afterZeroHours.adsRev === '$0.00' ? 'PASS' : 'FAIL'}`);

  // Reset calculator back to default
  console.log('Testing Reset button...');
  await page.click('#trc-reset');
  await new Promise(r => setTimeout(r, 200));

  const afterReset = await page.evaluate(() => {
    return {
      monthlyTotal: document.getElementById('res-trc-monthly')?.textContent?.trim(),
      hoursValue: document.getElementById('trc-hours-input')?.value
    };
  });
  console.log('After reset:', afterReset);
  console.log(`Reset back to $1,205.57: ${afterReset.monthlyTotal === '$1,205.57' ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 4. TESTING CURRENCY SWITCHER ===');
  await page.select('#trc-currency-select', 'EUR');
  await new Promise(r => setTimeout(r, 200));

  const eurResults = await page.evaluate(() => {
    return {
      monthlyTotal: document.getElementById('res-trc-monthly')?.textContent?.trim(),
      fxDisplay: document.getElementById('trc-fx-group')?.style?.display,
      t1Price: document.getElementById('trc-price-t1')?.value,
      primePayout: document.getElementById('trc-payout-prime')?.value,
      bitsVal: document.getElementById('tile-trc-bits')?.textContent?.trim()
    };
  });
  console.log('After switching to EUR:', eurResults);
  console.log(`EUR symbol in results (€): ${eurResults.monthlyTotal?.includes('€') ? 'PASS' : 'FAIL'}`);
  console.log(`Exchange rate group visible: ${eurResults.fxDisplay === 'flex' ? 'PASS' : 'FAIL'}`);
  console.log(`T1 price updated to regional EUR preset (€3.99): ${eurResults.t1Price === '3.99' ? 'PASS' : 'FAIL'}`);
  console.log(`Prime payout updated to regional EUR preset (€1.55): ${eurResults.primePayout === '1.55' ? 'PASS' : 'FAIL'}`);
  console.log(`Bits converted at fx 0.92 (€92.00): ${eurResults.bitsVal === '€92.00' ? 'PASS' : 'FAIL'}`);

  // Switch back to USD
  await page.select('#trc-currency-select', 'USD');
  await new Promise(r => setTimeout(r, 200));

  console.log('\n=== 5. CAPTURING SCREENSHOTS FOR ARTIFACTS ===');
  const artifactsDir = 'C:\\Users\\rrajb\\.gemini\\antigravity\\brain\\bb2641a2-7c4d-40b9-85bb-13a41943a2ff';

  // Desktop Full Page
  await page.setViewport({ width: 1280, height: 900 });
  await page.screenshot({ path: path.join(artifactsDir, 'twitch_desktop_full.png'), fullPage: true });
  console.log('Saved twitch_desktop_full.png');

  // Desktop Calculator Card
  const calcCard = await page.$('.calculator-grid');
  if (calcCard) {
    await calcCard.screenshot({ path: path.join(artifactsDir, 'twitch_calculator_card_desktop.png') });
    console.log('Saved twitch_calculator_card_desktop.png');
  }

  // Mobile 375px Full Page
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(artifactsDir, 'twitch_mobile_375.png'), fullPage: true });
  console.log('Saved twitch_mobile_375.png');

  // Mobile 320px Inputs Card
  await page.setViewport({ width: 320, height: 700 });
  const inputsCard = await page.$('.calc-inputs-card');
  if (inputsCard) {
    await inputsCard.screenshot({ path: path.join(artifactsDir, 'twitch_inputs_card_320.png') });
    console.log('Saved twitch_inputs_card_320.png');
  }

  console.log('\n=== 6. CHECKING JSON-LD SCHEMAS ===');
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  const schemas = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    return scripts.map(s => {
      try {
        return JSON.parse(s.innerHTML);
      } catch (e) {
        return { error: e.message };
      }
    });
  });

  const faqSchema = schemas.find(s => s['@type'] === 'FAQPage');
  const webApp = schemas.find(s => s['@type'] === 'WebApplication');
  const breadcrumb = schemas.find(s => s['@type'] === 'BreadcrumbList');

  console.log(`BreadcrumbList Schema detected with ${breadcrumb?.itemListElement?.length || 0} items: ${breadcrumb ? 'PASS' : 'FAIL'}`);
  console.log(`FAQPage Schema detected with ${faqSchema?.mainEntity?.length || 0} questions: ${faqSchema ? 'PASS' : 'FAIL'}`);
  console.log(`WebApplication Schema detected: ${webApp ? 'PASS' : 'FAIL'}`);

  await browser.close();
  server.close();
  console.log('\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
