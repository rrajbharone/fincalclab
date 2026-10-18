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
  const baseUrl = 'http://localhost:4330/calculator/adu-cost-calculator';
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
      const groups = document.querySelectorAll('#adu-cost-calculator .input-group');

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
      totalCost: document.getElementById('res-total-cost').textContent.trim(),
      costPerSqFt: document.getElementById('res-cost-per-sqft').textContent.trim(),
      baseCost: document.getElementById('res-base-cost').textContent.trim(),
      softCosts: document.getElementById('res-soft-costs').textContent.trim(),
      subtotal: document.getElementById('res-subtotal').textContent.trim(),
      contingency: document.getElementById('res-contingency-amt').textContent.trim(),
      tableTotal: document.getElementById('row-total').textContent.trim()
    };
  });

  console.log('Default Calculations:', JSON.stringify(defaultResults, null, 2));
  const defaultPass = defaultResults.totalCost === '$188,100' &&
                      defaultResults.costPerSqFt === '$314' &&
                      defaultResults.baseCost === '$150,000' &&
                      defaultResults.softCosts === '$21,000' &&
                      defaultResults.subtotal === '$171,000' &&
                      defaultResults.contingency === '$17,100' &&
                      defaultResults.tableTotal === '$188,100';
  console.log(`Default Math Match: ${defaultPass ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 3. TESTING USER INTERACTION & CHIPS ===');
  // Click 800 sf preset chip
  await page.evaluate(() => {
    const chip800 = document.querySelector('.size-chip-btn[data-size="800"]');
    if (chip800) chip800.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const chip800Results = await page.evaluate(() => {
    return {
      size: document.getElementById('adu-size-sqft').value,
      base: document.getElementById('res-base-cost').textContent.trim(),
      total: document.getElementById('res-total-cost').textContent.trim(),
      perSqFt: document.getElementById('res-cost-per-sqft').textContent.trim()
    };
  });
  console.log('After clicking 800 sf preset chip:');
  console.log(`  Size: ${chip800Results.size} (Expected: 800)`);
  console.log(`  Base Cost: ${chip800Results.base} (Expected: $200,000)`);
  console.log(`  Total: ${chip800Results.total} (Expected: $243,100)`);
  console.log(`  Cost/SqFt: ${chip800Results.perSqFt} (Expected: $304)`);

  // Click 20% contingency chip
  await page.evaluate(() => {
    const cont20 = document.querySelector('.cont-chip-btn[data-cont="20"]');
    if (cont20) cont20.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const cont20Results = await page.evaluate(() => {
    return {
      contingency: document.getElementById('res-contingency-amt').textContent.trim(),
      total: document.getElementById('res-total-cost').textContent.trim()
    };
  });
  console.log('After clicking 20% contingency chip:');
  console.log(`  Contingency: ${cont20Results.contingency} (Expected: $44,200)`);
  console.log(`  Total: ${cont20Results.total} (Expected: $265,200)`);

  console.log('\n=== 4. TESTING EDGE CASES ===');
  // Edge Case 1: 0% Contingency
  await page.evaluate(() => {
    const contInput = document.getElementById('adu-contingency-pct');
    contInput.value = '0';
    contInput.dispatchEvent(new Event('input'));
  });
  await new Promise(r => setTimeout(r, 200));

  const edge0Cont = await page.evaluate(() => {
    return {
      contingency: document.getElementById('res-contingency-amt').textContent.trim(),
      subtotal: document.getElementById('res-subtotal').textContent.trim(),
      total: document.getElementById('res-total-cost').textContent.trim()
    };
  });
  console.log('Edge Case: 0% Contingency:');
  console.log(`  Contingency: ${edge0Cont.contingency} (Expected: $0)`);
  console.log(`  Total: ${edge0Cont.total} == Subtotal: ${edge0Cont.subtotal}`);

  // Edge Case 2: Zero Size
  await page.evaluate(() => {
    const sizeInput = document.getElementById('adu-size-sqft');
    sizeInput.value = '0';
    sizeInput.dispatchEvent(new Event('input'));
  });
  await new Promise(r => setTimeout(r, 200));

  const edge0Size = await page.evaluate(() => {
    return {
      perSqFt: document.getElementById('res-cost-per-sqft').textContent.trim(),
      narrative: document.getElementById('res-narrative').textContent.trim()
    };
  });
  console.log('Edge Case: 0 Sq Ft (No Division by Zero):');
  console.log(`  Cost/SqFt: ${edge0Size.perSqFt} (Expected: $0)`);

  // Currency Switcher Test
  console.log('\n=== 5. TESTING CURRENCY SWITCHER ===');
  await page.evaluate(() => {
    const resetBtn = document.getElementById('cost-reset-btn');
    if (resetBtn) resetBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  await page.evaluate(() => {
    const select = document.getElementById('cost-currency-select');
    select.value = 'EUR';
    select.dispatchEvent(new Event('change'));
  });
  await new Promise(r => setTimeout(r, 200));

  const currTest = await page.evaluate(() => {
    return {
      sym: document.getElementById('sym-cost-sqft').textContent,
      total: document.getElementById('res-total-cost').textContent
    };
  });
  console.log(`Currency EUR: Symbol is "${currTest.sym}", Total is "${currTest.total}"`);

  // Reset to default
  await page.evaluate(() => {
    const resetBtn = document.getElementById('cost-reset-btn');
    if (resetBtn) resetBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  console.log('\n=== 6. CAPTURING VISUAL SCREENSHOTS ===');
  const artifactsDir = 'C:/Users/rrajb/.gemini/antigravity/brain/bb2641a2-7c4d-40b9-85bb-13a41943a2ff';

  // Desktop Full Page (1280px)
  await page.setViewport({ width: 1280, height: 900 });
  await page.screenshot({ path: path.join(artifactsDir, 'adu_cost_desktop_full.png'), fullPage: true });
  console.log('Saved adu_cost_desktop_full.png');

  // Desktop Inputs & Results Card
  const calcGrid = await page.$('.calculator-grid');
  if (calcGrid) {
    await calcGrid.screenshot({ path: path.join(artifactsDir, 'adu_cost_calculator_card_desktop.png') });
    console.log('Saved adu_cost_calculator_card_desktop.png');
  }

  // Mobile 375px
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(artifactsDir, 'adu_cost_mobile_375.png'), fullPage: true });
  console.log('Saved adu_cost_mobile_375.png');

  // Mobile 320px Inputs
  await page.setViewport({ width: 320, height: 700 });
  const inputsCard = await page.$('.calc-inputs-card');
  if (inputsCard) {
    await inputsCard.screenshot({ path: path.join(artifactsDir, 'adu_cost_inputs_card_320.png') });
    console.log('Saved adu_cost_inputs_card_320.png');
  }

  // All Calculators Page Check
  console.log('\n=== 7. CHECKING ALL-CALCULATORS DIRECTORY ===');
  await page.goto('http://localhost:4330/all-calculators', { waitUntil: 'networkidle0' });
  const aduInDir = await page.evaluate(() => {
    const link = document.querySelector('a[href="/calculator/adu-cost-calculator"]');
    return !!link;
  });
  console.log(`ADU Cost Calculator card in /all-calculators: ${aduInDir ? 'PASS' : 'FAIL'}`);

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS COMPLETE ===');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
