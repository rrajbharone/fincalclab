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
  const baseUrl = 'http://localhost:4331/calculator/adu-roi-calculator';
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
      const groups = document.querySelectorAll('#adu-roi-calculator .input-group');

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
      annualNoi: document.getElementById('res-annual-noi').textContent.trim(),
      cashOnCost: document.getElementById('res-cash-on-cost').textContent.trim(),
      payback: document.getElementById('res-payback-years').textContent.trim(),
      totalRoi: document.getElementById('res-total-roi').textContent.trim(),
      grossRent: document.getElementById('res-gross-rent').textContent.trim(),
      vacancyLoss: document.getElementById('res-vacancy-loss').textContent.trim(),
      effectiveRent: document.getElementById('res-effective-rent').textContent.trim(),
      expenses: document.getElementById('res-annual-expenses').textContent.trim(),
      cumNoi: document.getElementById('res-cum-noi').textContent.trim(),
      futureVal: document.getElementById('res-future-val').textContent.trim()
    };
  });

  console.log('Default Calculations:', JSON.stringify(defaultResults, null, 2));
  const defaultPass = defaultResults.annualNoi === '$16,920' &&
                      defaultResults.cashOnCost === '11.3%' &&
                      defaultResults.payback === '8.9' &&
                      defaultResults.totalRoi === '167.2%' &&
                      defaultResults.grossRent === '$21,600' &&
                      defaultResults.vacancyLoss === '-$1,080' &&
                      defaultResults.effectiveRent === '$20,520' &&
                      defaultResults.expenses === '-$3,600' &&
                      defaultResults.cumNoi === '$199,239' &&
                      defaultResults.futureVal === '$201,587';
  console.log(`Default Math Match: ${defaultPass ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 3. TESTING USER INTERACTION & CHIPS ===');
  // Click $2,400 rent preset chip
  await page.evaluate(() => {
    const chip2400 = document.querySelector('.rent-chip-btn[data-rent="2400"]');
    if (chip2400) chip2400.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const chip2400Results = await page.evaluate(() => {
    return {
      rent: document.getElementById('adu-monthly-rent').value,
      noi: document.getElementById('res-annual-noi').textContent.trim(),
      yield: document.getElementById('res-cash-on-cost').textContent.trim(),
      payback: document.getElementById('res-payback-years').textContent.trim()
    };
  });
  console.log('After clicking $2,400 rent chip:');
  console.log(`  Monthly Rent: ${chip2400Results.rent} (Expected: 2400)`);
  console.log(`  Annual NOI: ${chip2400Results.noi} (Expected: $23,760)`);
  console.log(`  Cash on Cost: ${chip2400Results.yield} (Expected: 15.8%)`);
  console.log(`  Payback: ${chip2400Results.payback} Years (Expected: 6.3 Years)`);

  // Click 15y investment period chip
  await page.evaluate(() => {
    const chip15y = document.querySelector('.year-chip-btn[data-yr="15"]');
    if (chip15y) chip15y.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const chip15Results = await page.evaluate(() => {
    return {
      cumNoi: document.getElementById('res-cum-noi').textContent.trim(),
      futureVal: document.getElementById('res-future-val').textContent.trim(),
      totalRoi: document.getElementById('res-total-roi').textContent.trim()
    };
  });
  console.log('After clicking 15y horizon chip:');
  console.log(`  15-Yr Cumulative NOI: ${chip15Results.cumNoi} (Expected: $434,222)`);
  console.log(`  15-Yr Future Value: ${chip15Results.futureVal} (Expected: $233,695)`);
  console.log(`  15-Yr Total ROI: ${chip15Results.totalRoi} (Expected: 345.3%)`);

  console.log('\n=== 4. TESTING EDGE CASES ===');
  // Edge Case 1: Negative NOI (Rent = $200, Expenses = $500)
  await page.evaluate(() => {
    const rentInput = document.getElementById('adu-monthly-rent');
    const expInput = document.getElementById('adu-monthly-expenses');
    rentInput.value = '200';
    expInput.value = '500';
    rentInput.dispatchEvent(new Event('input'));
    expInput.dispatchEvent(new Event('input'));
  });
  await new Promise(r => setTimeout(r, 200));

  const edgeNegResults = await page.evaluate(() => {
    return {
      noi: document.getElementById('res-annual-noi').textContent.trim(),
      payback: document.getElementById('res-payback-years').textContent.trim(),
      subtext: document.getElementById('res-payback-subtext').textContent.trim(),
      cashOnCost: document.getElementById('res-cash-on-cost').textContent.trim()
    };
  });
  console.log('Edge Case: Operating Loss (Rent $200, Expenses $500):');
  console.log(`  NOI: ${edgeNegResults.noi} (Expected: -$3,720)`);
  console.log(`  Payback: ${edgeNegResults.payback} (Expected: N/A)`);
  console.log(`  Payback Subtext: ${edgeNegResults.subtext}`);
  console.log(`  Cash on Cost: ${edgeNegResults.cashOnCost} (Expected: -2.5%)`);

  // Edge Case 2: Zero Vacancy & Zero Appreciation
  await page.evaluate(() => {
    const resetBtn = document.getElementById('roi-reset-btn');
    if (resetBtn) resetBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  await page.evaluate(() => {
    const vacInput = document.getElementById('adu-vacancy-rate');
    const apprecInput = document.getElementById('adu-appreciation');
    vacInput.value = '0';
    apprecInput.value = '0';
    vacInput.dispatchEvent(new Event('input'));
    apprecInput.dispatchEvent(new Event('input'));
  });
  await new Promise(r => setTimeout(r, 200));

  const edge0VacApprec = await page.evaluate(() => {
    return {
      vacLoss: document.getElementById('res-vacancy-loss').textContent.trim(),
      futureVal: document.getElementById('res-future-val').textContent.trim(),
      apprecSub: document.getElementById('res-apprec-sub').textContent.trim()
    };
  });
  console.log('Edge Case: 0% Vacancy & 0% Appreciation:');
  console.log(`  Vacancy Loss: ${edge0VacApprec.vacLoss} (Expected: -$0)`);
  console.log(`  Future Value: ${edge0VacApprec.futureVal} (Expected: $150,000)`);
  console.log(`  Appreciation: ${edge0VacApprec.apprecSub} (Expected: +$0 appreciation)`);

  // Currency Switcher Test
  console.log('\n=== 5. TESTING CURRENCY SWITCHER ===');
  await page.evaluate(() => {
    const resetBtn = document.getElementById('roi-reset-btn');
    if (resetBtn) resetBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  await page.evaluate(() => {
    const select = document.getElementById('roi-currency-select');
    select.value = 'GBP';
    select.dispatchEvent(new Event('change'));
  });
  await new Promise(r => setTimeout(r, 200));

  const currTest = await page.evaluate(() => {
    return {
      sym: document.getElementById('sym-cost').textContent,
      noi: document.getElementById('res-annual-noi').textContent
    };
  });
  console.log(`Currency GBP: Symbol is "${currTest.sym}", Annual NOI is "${currTest.noi}"`);

  // Reset back to default
  await page.evaluate(() => {
    const resetBtn = document.getElementById('roi-reset-btn');
    if (resetBtn) resetBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  console.log('\n=== 6. CAPTURING VISUAL SCREENSHOTS ===');
  const artifactsDir = 'C:/Users/rrajb/.gemini/antigravity/brain/bb2641a2-7c4d-40b9-85bb-13a41943a2ff';

  // Desktop Full Page (1280px)
  await page.setViewport({ width: 1280, height: 900 });
  await page.screenshot({ path: path.join(artifactsDir, 'adu_roi_desktop_full.png'), fullPage: true });
  console.log('Saved adu_roi_desktop_full.png');

  // Desktop Inputs & Results Card
  const calcGrid = await page.$('.calculator-grid');
  if (calcGrid) {
    await calcGrid.screenshot({ path: path.join(artifactsDir, 'adu_roi_calculator_card_desktop.png') });
    console.log('Saved adu_roi_calculator_card_desktop.png');
  }

  // Mobile 375px
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(artifactsDir, 'adu_roi_mobile_375.png'), fullPage: true });
  console.log('Saved adu_roi_mobile_375.png');

  // Mobile 320px Inputs
  await page.setViewport({ width: 320, height: 700 });
  const inputsCard = await page.$('.calc-inputs-card');
  if (inputsCard) {
    await inputsCard.screenshot({ path: path.join(artifactsDir, 'adu_roi_inputs_card_320.png') });
    console.log('Saved adu_roi_inputs_card_320.png');
  }

  // All Calculators Page Check
  console.log('\n=== 7. CHECKING ALL-CALCULATORS DIRECTORY ===');
  await page.goto('http://localhost:4331/all-calculators', { waitUntil: 'networkidle0' });
  const aduInDir = await page.evaluate(() => {
    const link = document.querySelector('a[href="/calculator/adu-roi-calculator"]');
    return !!link;
  });
  console.log(`ADU ROI Calculator card in /all-calculators: ${aduInDir ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS COMPLETE ===');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
