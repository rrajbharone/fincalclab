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
  const baseUrl = 'http://localhost:4329/calculator/adu-loan-calculator';
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
      const groups = document.querySelectorAll('#adu-loan-calculator .input-group');

      groups.forEach((grp, idx) => {
        const label = grp.querySelector('label');
        const control = grp.querySelector('.input-symbol-wrapper, select, .form-select-full');

        if (label && control) {
          const lRect = label.getBoundingClientRect();
          const cRect = control.getBoundingClientRect();

          // Check if control overlaps or is not below label
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
      monthly: document.getElementById('res-monthly-payment').textContent.trim(),
      monthlySubtext: document.getElementById('res-monthly-subtext').textContent.trim(),
      loan: document.getElementById('res-loan-amount').textContent.trim(),
      loanSubtext: document.getElementById('res-loan-subtext').textContent.trim(),
      down: document.getElementById('res-down-payment').textContent.trim(),
      downPct: document.getElementById('res-down-pct-caption').textContent.trim(),
      interest: document.getElementById('res-total-interest').textContent.trim(),
      interestPct: document.getElementById('res-interest-pct-caption').textContent.trim(),
      totalLoanRepay: document.getElementById('res-total-loan-repay').textContent.trim(),
      totalProjectCost: document.getElementById('res-total-project-cost').textContent.trim()
    };
  });

  console.log('Default Calculations:', JSON.stringify(defaultResults, null, 2));
  const defaultPass = defaultResults.monthly === '$930' &&
                      defaultResults.loan === '$120,000' &&
                      defaultResults.down === '$30,000' &&
                      defaultResults.interest === '$103,286' &&
                      defaultResults.totalProjectCost === '$253,286';
  console.log(`Default Math Match: ${defaultPass ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 3. TESTING USER INTERACTION & CHIPS ===');
  // Click 10% quick down payment chip
  await page.evaluate(() => {
    const chip10 = document.querySelector('.quick-chip-btn[data-pct="10"]');
    if (chip10) chip10.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const chip10Results = await page.evaluate(() => {
    return {
      down: document.getElementById('res-down-payment').textContent.trim(),
      loan: document.getElementById('res-loan-amount').textContent.trim(),
      monthly: document.getElementById('res-monthly-payment').textContent.trim()
    };
  });
  console.log('After clicking 10% down chip:');
  console.log(`  Down: ${chip10Results.down} (Expected: $15,000)`);
  console.log(`  Loan: ${chip10Results.loan} (Expected: $135,000)`);
  console.log(`  Monthly: ${chip10Results.monthly} (Expected: $1,047)`);

  // Click 30y term chip
  await page.evaluate(() => {
    const term30 = document.querySelector('.term-chip-btn[data-term="30"]');
    if (term30) term30.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const term30Results = await page.evaluate(() => {
    return {
      monthly: document.getElementById('res-monthly-payment').textContent.trim(),
      totalInterest: document.getElementById('res-total-interest').textContent.trim()
    };
  });
  console.log('After clicking 30y term chip (on $135k loan at 7%):');
  console.log(`  Monthly: ${term30Results.monthly} (Expected: $898)`);
  console.log(`  Total Interest: ${term30Results.totalInterest} (Expected: $188,337)`);

  console.log('\n=== 4. TESTING EDGE CASES ===');
  // Edge Case 1: 100% Down Payment (Down = $150,000)
  await page.evaluate(() => {
    const downInput = document.getElementById('adu-down-payment');
    downInput.value = '150000';
    downInput.dispatchEvent(new Event('input'));
  });
  await new Promise(r => setTimeout(r, 200));

  const edge100Down = await page.evaluate(() => {
    return {
      monthly: document.getElementById('res-monthly-payment').textContent.trim(),
      loan: document.getElementById('res-loan-amount').textContent.trim(),
      interest: document.getElementById('res-total-interest').textContent.trim(),
      subtext: document.getElementById('res-monthly-subtext').textContent.trim()
    };
  });
  console.log('Edge Case: 100% Down Payment:');
  console.log(`  Monthly: ${edge100Down.monthly} (Expected: $0)`);
  console.log(`  Loan: ${edge100Down.loan} (Expected: $0)`);
  console.log(`  Subtext: ${edge100Down.subtext}`);

  // Edge Case 2: 0% Interest Rate
  await page.evaluate(() => {
    const resetBtn = document.getElementById('adu-reset-btn');
    if (resetBtn) resetBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  await page.evaluate(() => {
    const rateInput = document.getElementById('adu-interest-rate');
    rateInput.value = '0';
    rateInput.dispatchEvent(new Event('input'));
  });
  await new Promise(r => setTimeout(r, 200));

  const edge0Rate = await page.evaluate(() => {
    return {
      monthly: document.getElementById('res-monthly-payment').textContent.trim(),
      interest: document.getElementById('res-total-interest').textContent.trim(),
      totalCost: document.getElementById('res-total-project-cost').textContent.trim()
    };
  });
  console.log('Edge Case: 0% Interest Rate ($120k loan over 20 yrs):');
  console.log(`  Monthly: ${edge0Rate.monthly} (Expected: $500)`);
  console.log(`  Total Interest: ${edge0Rate.interest} (Expected: $0)`);
  console.log(`  Total Cost: ${edge0Rate.totalCost} (Expected: $150,000)`);

  // Currency Switcher Test
  console.log('\n=== 5. TESTING CURRENCY SWITCHER ===');
  await page.evaluate(() => {
    const select = document.getElementById('adu-currency-select');
    select.value = 'EUR';
    select.dispatchEvent(new Event('change'));
  });
  await new Promise(r => setTimeout(r, 200));

  const currTest = await page.evaluate(() => {
    return {
      costSym: document.getElementById('sym-cost').textContent,
      monthly: document.getElementById('res-monthly-payment').textContent
    };
  });
  console.log(`Currency EUR: Symbol is "${currTest.costSym}", Monthly is "${currTest.monthly}"`);

  // Reset to default
  await page.evaluate(() => {
    const resetBtn = document.getElementById('adu-reset-btn');
    if (resetBtn) resetBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  console.log('\n=== 6. CAPTURING VISUAL SCREENSHOTS ===');
  const artifactsDir = 'C:/Users/rrajb/.gemini/antigravity/brain/bb2641a2-7c4d-40b9-85bb-13a41943a2ff';

  // Desktop Full Page (1280px)
  await page.setViewport({ width: 1280, height: 900 });
  await page.screenshot({ path: path.join(artifactsDir, 'adu_desktop_full.png'), fullPage: true });
  console.log('Saved adu_desktop_full.png');

  // Desktop Inputs & Results Card
  const calcGrid = await page.$('.calculator-grid');
  if (calcGrid) {
    await calcGrid.screenshot({ path: path.join(artifactsDir, 'adu_calculator_card_desktop.png') });
    console.log('Saved adu_calculator_card_desktop.png');
  }

  // Mobile 375px
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(artifactsDir, 'adu_mobile_375.png'), fullPage: true });
  console.log('Saved adu_mobile_375.png');

  // Mobile 320px Inputs
  await page.setViewport({ width: 320, height: 700 });
  const inputsCard = await page.$('.calc-inputs-card');
  if (inputsCard) {
    await inputsCard.screenshot({ path: path.join(artifactsDir, 'adu_inputs_card_320.png') });
    console.log('Saved adu_inputs_card_320.png');
  }

  // All Calculators Page Check
  console.log('\n=== 7. CHECKING ALL-CALCULATORS DIRECTORY ===');
  await page.goto('http://localhost:4329/all-calculators', { waitUntil: 'networkidle0' });
  const aduInDir = await page.evaluate(() => {
    const link = document.querySelector('a[href="/calculator/adu-loan-calculator"]');
    return !!link;
  });
  console.log(`ADU Loan Calculator card in /all-calculators: ${aduInDir ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS COMPLETE ===');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
