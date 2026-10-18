const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function runVerification() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const baseUrl = 'http://localhost:4321/calculator/true-cost-of-home-ownership-calculator';
  const viewports = [320, 360, 375, 390, 430, 768, 1024, 1280];

  console.log('=== 1. AUDITING VIEWPORTS & FORM FIELD BOUNDING BOXES ===');
  for (const width of viewports) {
    await page.setViewport({ width, height: 900 });
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });

    const audit = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const hasHScroll = docWidth > winWidth;

      const issues = [];
      const groups = document.querySelectorAll('#home-cost-calculator .input-group');

      groups.forEach((grp, idx) => {
        const label = grp.querySelector('label');
        const control = grp.querySelector('.input-symbol-wrapper, select, .form-select-full');

        if (label && control) {
          const lRect = label.getBoundingClientRect();
          const cRect = control.getBoundingClientRect();

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
      monthlyTotal: document.getElementById('res-total-monthly')?.textContent?.trim(),
      monthlyPi: document.getElementById('res-monthly-pi')?.textContent?.trim(),
      monthlyNonMortgage: document.getElementById('res-monthly-non-mortgage')?.textContent?.trim(),
      annualTotal: document.getElementById('res-annual-total')?.textContent?.trim(),
      totalInterest: document.getElementById('res-total-interest')?.textContent?.trim(),
      termDisplay: document.getElementById('res-term-display')?.textContent?.trim(),
      lifeDown: document.getElementById('res-life-down')?.textContent?.trim(),
      lifeMortgage: document.getElementById('res-life-mortgage')?.textContent?.trim(),
      lifeNonMortgage: document.getElementById('res-life-non-mortgage')?.textContent?.trim(),
      lifeAllIn: document.getElementById('res-life-all-in')?.textContent?.trim(),
      downPctBadge: document.getElementById('tc-down-pct-badge')?.textContent?.trim()
    };
  });

  console.log('Default Calculations Harvested:', defaultResults);

  const asserts = [
    { name: 'Monthly Total Cost', actual: defaultResults.monthlyTotal, expected: '$3,020' },
    { name: 'Monthly Mortgage P&I', actual: defaultResults.monthlyPi, expected: '$1,770' },
    { name: 'Monthly Non-Mortgage Costs', actual: defaultResults.monthlyNonMortgage, expected: '$1,250' },
    { name: 'Estimated Annual Cost', actual: defaultResults.annualTotal, expected: '$36,237' },
    { name: 'Total Mortgage Interest', actual: defaultResults.totalInterest, expected: '$357,125' },
    { name: 'Initial Down Payment', actual: defaultResults.lifeDown, expected: '$70,000' },
    { name: 'Total 30Y Mortgage Payments (P+I)', actual: defaultResults.lifeMortgage, expected: '$637,125' },
    { name: 'Total 30Y Non-Mortgage Costs', actual: defaultResults.lifeNonMortgage, expected: '$450,000' },
    { name: 'Total All-In Cost (with Down)', actual: defaultResults.lifeAllIn, expected: '$1,157,125' },
    { name: 'Down Payment Percentage Badge', actual: defaultResults.downPctBadge, expected: '20.0% of price' }
  ];

  let mathPass = true;
  asserts.forEach(a => {
    const pass = a.actual === a.expected;
    if (!pass) mathPass = false;
    console.log(`Assertion [${a.name}]: ${pass ? 'PASS' : 'FAIL'} (Expected: ${a.expected}, Actual: ${a.actual})`);
  });

  console.log('\n=== 3. TESTING CHIPS & DYNAMIC INTERACTIONS ===');
  // Click 10% Down Payment chip
  console.log('Testing 10% Down Payment chip...');
  await page.evaluate(() => {
    const chip10 = document.querySelector('.down-chip-btn[data-pct="10"]');
    if (chip10) chip10.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const after10Pct = await page.evaluate(() => {
    return {
      downAmount: document.getElementById('tc-down-payment')?.value,
      downPctBadge: document.getElementById('tc-down-pct-badge')?.textContent?.trim(),
      monthlyPi: document.getElementById('res-monthly-pi')?.textContent?.trim(),
      monthlyTotal: document.getElementById('res-total-monthly')?.textContent?.trim()
    };
  });
  console.log('After 10% chip:', after10Pct);
  console.log(`10% Down Payment is $35,000: ${after10Pct.downAmount === '35000' ? 'PASS' : 'FAIL'}`);

  // Click 15 Years Term chip
  console.log('Testing 15-Year Term chip...');
  await page.evaluate(() => {
    const chip15y = document.querySelector('.term-chip-btn[data-term="15"]');
    if (chip15y) chip15y.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const after15y = await page.evaluate(() => {
    return {
      termYears: document.getElementById('tc-mortgage-term')?.value,
      termDisplay: document.getElementById('res-term-display')?.textContent?.trim(),
      monthlyPi: document.getElementById('res-monthly-pi')?.textContent?.trim(),
      totalInterest: document.getElementById('res-total-interest')?.textContent?.trim()
    };
  });
  console.log('After 15-Year term chip:', after15y);
  console.log(`Term updated to 15: ${after15y.termYears === '15' ? 'PASS' : 'FAIL'}`);

  // Test 100% Down Payment Edge Case (Cash purchase: Loan = $0, P&I = $0)
  console.log('Testing 100% Down Payment (Cash purchase)...');
  await page.evaluate(() => {
    const chip100 = document.querySelector('.down-chip-btn[data-pct="100"]');
    if (chip100) chip100.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const after100Pct = await page.evaluate(() => {
    return {
      downAmount: document.getElementById('tc-down-payment')?.value,
      downPctBadge: document.getElementById('tc-down-pct-badge')?.textContent?.trim(),
      monthlyPi: document.getElementById('res-monthly-pi')?.textContent?.trim(),
      monthlyNonMortgage: document.getElementById('res-monthly-non-mortgage')?.textContent?.trim(),
      monthlyTotal: document.getElementById('res-total-monthly')?.textContent?.trim(),
      totalInterest: document.getElementById('res-total-interest')?.textContent?.trim()
    };
  });
  console.log('After 100% Down Payment (Cash Purchase):', after100Pct);
  console.log(`100% Cash Purchase: Down Amount is $350,000: ${after100Pct.downAmount === '350000' ? 'PASS' : 'FAIL'}`);
  console.log(`100% Cash Purchase: P&I is $0: ${after100Pct.monthlyPi === '$0' ? 'PASS' : 'FAIL'}`);
  console.log(`100% Cash Purchase: Total Monthly is Non-Mortgage ($1,250): ${after100Pct.monthlyTotal === '$1,250' ? 'PASS' : 'FAIL'}`);

  // Reset back to baseline for currency test & screenshots
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });

  console.log('\n=== 4. TESTING CURRENCY SWITCHER ===');
  await page.select('#tc-currency-select', 'GBP');
  await new Promise(r => setTimeout(r, 200));

  const gbpResults = await page.evaluate(() => {
    return {
      monthlyTotal: document.getElementById('res-total-monthly')?.textContent?.trim(),
      priceSym: document.getElementById('sym-price')?.textContent?.trim()
    };
  });
  console.log('After switching to GBP:', gbpResults);
  console.log(`GBP symbol in results (£): ${gbpResults.monthlyTotal?.includes('£') ? 'PASS' : 'FAIL'}`);
  console.log(`GBP symbol in input (£): ${gbpResults.priceSym === '£' ? 'PASS' : 'FAIL'}`);

  // Switch back to USD
  await page.select('#tc-currency-select', 'USD');
  await new Promise(r => setTimeout(r, 200));

  console.log('\n=== 5. CAPTURING SCREENSHOTS FOR ARTIFACTS ===');
  const artifactsDir = 'C:\\Users\\rrajb\\.gemini\\antigravity\\brain\\bb2641a2-7c4d-40b9-85bb-13a41943a2ff';

  // Desktop Full Page
  await page.setViewport({ width: 1280, height: 900 });
  await page.screenshot({ path: path.join(artifactsDir, 'true_cost_desktop_full.png'), fullPage: true });
  console.log('Saved true_cost_desktop_full.png');

  // Desktop Calculator Card
  const calcCard = await page.$('.calculator-layout');
  if (calcCard) {
    await calcCard.screenshot({ path: path.join(artifactsDir, 'true_cost_calculator_card_desktop.png') });
    console.log('Saved true_cost_calculator_card_desktop.png');
  }

  // Results Card Desktop
  const resultsCard = await page.$('.calc-results-card');
  if (resultsCard) {
    await resultsCard.screenshot({ path: path.join(artifactsDir, 'true_cost_results_card.png') });
    console.log('Saved true_cost_results_card.png');
  }

  // Mobile 375px Full Page
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(artifactsDir, 'true_cost_mobile_375.png'), fullPage: true });
  console.log('Saved true_cost_mobile_375.png');

  // Mobile 320px Inputs Card
  await page.setViewport({ width: 320, height: 700 });
  const inputsCard = await page.$('.calc-inputs-card');
  if (inputsCard) {
    await inputsCard.screenshot({ path: path.join(artifactsDir, 'true_cost_inputs_card_320.png') });
    console.log('Saved true_cost_inputs_card_320.png');
  }

  console.log('\n=== 6. CHECKING ALL-CALCULATORS DIRECTORY ===');
  await page.goto('http://localhost:4321/all-calculators', { waitUntil: 'networkidle0' });
  const cardInDir = await page.evaluate(() => {
    const link = document.querySelector('a[href="/calculator/true-cost-of-home-ownership-calculator"]');
    return !!link;
  });
  console.log(`True Cost Calculator card in /all-calculators: ${cardInDir ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 7. CHECKING JSON-LD SCHEMAS ===');
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
  console.log(`FAQPage Schema detected with ${faqSchema?.mainEntity?.length || 0} questions: ${faqSchema ? 'PASS' : 'FAIL'}`);
  console.log(`WebApplication Schema detected: ${webApp ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
