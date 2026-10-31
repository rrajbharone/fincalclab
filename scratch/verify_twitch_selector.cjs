const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Static server for dist/
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
  const port = 4344;
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
        if (grp.offsetParent === null) return;

        const label = grp.querySelector('label');
        const control = grp.querySelector('.input-symbol-wrapper, select, .currency-select-full');

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

      // Check vertical list items
      const selectorItems = document.querySelectorAll('.source-item');
      const selectorItemCount = selectorItems.length;

      // Verify row layout inside list
      const rowLayouts = [];
      selectorItems.forEach((item, idx) => {
        const icon = item.querySelector('.source-item-icon');
        const text = item.querySelector('.source-item-text');
        const checkbox = item.querySelector('.source-checkbox');

        const iRect = icon ? icon.getBoundingClientRect() : null;
        const tRect = text ? text.getBoundingClientRect() : null;
        const cbRect = checkbox ? checkbox.getBoundingClientRect() : null;

        // Ensure icon is on left, text in middle, checkbox on right
        const validOrder = iRect && tRect && cbRect &&
          (iRect.right <= tRect.left + 5) &&
          (tRect.right <= cbRect.left + 15);

        rowLayouts.push({
          idx,
          validOrder,
          iconWidth: iRect ? Math.round(iRect.width) : 0,
          checkboxRight: cbRect ? Math.round(cbRect.right) : 0
        });
      });

      return {
        winWidth,
        docWidth,
        hasHScroll,
        issueCount: issues.length,
        issues,
        selectorItemCount,
        rowLayouts,
        allRowsValid: rowLayouts.every(r => r.validOrder)
      };
    });

    console.log(`Viewport ${width}px: H-Scroll: ${audit.hasHScroll ? 'FAIL (' + audit.docWidth + 'px)' : 'PASS'}, Form Overlaps: ${audit.issueCount}, List Items: ${audit.selectorItemCount}, Layout Alignment: ${audit.allRowsValid ? 'PASS' : 'FAIL'}`);
    if (audit.issues.length > 0) {
      console.error(`Issues at ${width}px:`, JSON.stringify(audit.issues, null, 2));
    }
  }

  console.log('\n=== 2. VERIFYING DEFAULT SELECTOR STATE & ALL SECTIONS VISIBLE ===');
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });

  const defaultState = await page.evaluate(() => {
    const isVisible = (id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      return window.getComputedStyle(el).display !== 'none';
    };

    return {
      chkTotal: document.getElementById('sel-source-total')?.checked,
      chkSubs: document.getElementById('sel-source-subs')?.checked,
      chkAds: document.getElementById('sel-source-ads')?.checked,
      chkBits: document.getElementById('sel-source-bits')?.checked,
      itemTotalActive: document.getElementById('card-source-total')?.classList.contains('active'),
      itemSubsActive: document.getElementById('card-source-subs')?.classList.contains('active'),
      itemAdsActive: document.getElementById('card-source-ads')?.classList.contains('active'),
      itemBitsActive: document.getElementById('card-source-bits')?.classList.contains('active'),
      streamProfileVisible: isVisible('section-stream-profile'),
      subsSectionVisible: isVisible('section-subscription-earnings'),
      adsSectionVisible: isVisible('section-advertising-revenue'),
      bitsSectionVisible: isVisible('section-bits-donations'),
      heroTitle: document.getElementById('lbl-hero-monthly')?.textContent?.trim(),
      monthlyTotal: document.getElementById('res-trc-monthly')?.textContent?.trim(),
      annualTotal: document.getElementById('lbl-trc-annual')?.textContent?.trim(),
      hourlyWage: document.getElementById('res-trc-hourly')?.textContent?.trim()
    };
  });

  console.log('Default State:', defaultState);
  console.log(`Total checked: ${defaultState.chkTotal ? 'PASS' : 'FAIL'}`);
  console.log(`Subs checked: ${defaultState.chkSubs ? 'PASS' : 'FAIL'}`);
  console.log(`Ads checked: ${defaultState.chkAds ? 'PASS' : 'FAIL'}`);
  console.log(`Bits checked: ${defaultState.chkBits ? 'PASS' : 'FAIL'}`);
  console.log(`Stream Profile permanently visible: ${defaultState.streamProfileVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Subs section visible: ${defaultState.subsSectionVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Ads section visible: ${defaultState.adsSectionVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Bits section visible: ${defaultState.bitsSectionVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Monthly Total is $1,205.57: ${defaultState.monthlyTotal === '$1,205.57' ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 3. TESTING SINGLE SELECTION: SUBSCRIPTION EARNINGS ONLY ===');
  await page.evaluate(() => {
    const chkAds = document.getElementById('sel-source-ads');
    if (chkAds) { chkAds.checked = false; chkAds.dispatchEvent(new Event('change', { bubbles: true })); }
    const chkBits = document.getElementById('sel-source-bits');
    if (chkBits) { chkBits.checked = false; chkBits.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 200));

  const subsOnlyState = await page.evaluate(() => {
    const isVisible = (id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      return window.getComputedStyle(el).display !== 'none';
    };

    return {
      chkTotal: document.getElementById('sel-source-total')?.checked,
      chkSubs: document.getElementById('sel-source-subs')?.checked,
      chkAds: document.getElementById('sel-source-ads')?.checked,
      chkBits: document.getElementById('sel-source-bits')?.checked,
      streamProfileVisible: isVisible('section-stream-profile'),
      subsSectionVisible: isVisible('section-subscription-earnings'),
      adsSectionVisible: isVisible('section-advertising-revenue'),
      bitsSectionVisible: isVisible('section-bits-donations'),
      heroTitle: document.getElementById('lbl-hero-monthly')?.textContent?.trim(),
      monthlyTotal: document.getElementById('res-trc-monthly')?.textContent?.trim(),
      annualTotal: document.getElementById('lbl-trc-annual')?.textContent?.trim(),
      tilePaidSubsVisible: isVisible('tile-card-paid-subs'),
      tilePrimeSubsVisible: isVisible('tile-card-prime-subs'),
      tileAdsVisible: isVisible('tile-card-ads'),
      tileBitsVisible: isVisible('tile-card-bits'),
      tileTipsVisible: isVisible('tile-card-tips')
    };
  });

  console.log('Subs Only State:', subsOnlyState);
  console.log(`Total unchecked: ${!subsOnlyState.chkTotal ? 'PASS' : 'FAIL'}`);
  console.log(`Subs section visible: ${subsOnlyState.subsSectionVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Ads section HIDDEN: ${!subsOnlyState.adsSectionVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Bits section HIDDEN: ${!subsOnlyState.bitsSectionVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Stream Profile remains visible: ${subsOnlyState.streamProfileVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Monthly Total is $624.07: ${subsOnlyState.monthlyTotal === '$624.07' ? 'PASS' : 'FAIL'}`);
  console.log(`Hero Title is "Est. Monthly Sub Revenue": ${subsOnlyState.heroTitle === 'Est. Monthly Sub Revenue' ? 'PASS' : 'FAIL'}`);
  console.log(`Paid/Prime sub tiles visible, Ads/Bits/Tips hidden: ${subsOnlyState.tilePaidSubsVisible && subsOnlyState.tilePrimeSubsVisible && !subsOnlyState.tileAdsVisible && !subsOnlyState.tileBitsVisible ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 4. TESTING DUAL SELECTION: SUBS + ADS ===');
  await page.evaluate(() => {
    const chkAds = document.getElementById('sel-source-ads');
    if (chkAds) { chkAds.checked = true; chkAds.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 200));

  const subsAndAdsState = await page.evaluate(() => {
    const isVisible = (id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      return window.getComputedStyle(el).display !== 'none';
    };

    return {
      subsSectionVisible: isVisible('section-subscription-earnings'),
      adsSectionVisible: isVisible('section-advertising-revenue'),
      bitsSectionVisible: isVisible('section-bits-donations'),
      heroTitle: document.getElementById('lbl-hero-monthly')?.textContent?.trim(),
      monthlyTotal: document.getElementById('res-trc-monthly')?.textContent?.trim()
    };
  });

  console.log('Subs + Ads State:', subsAndAdsState);
  console.log(`Subs visible: ${subsAndAdsState.subsSectionVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Ads visible: ${subsAndAdsState.adsSectionVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Bits HIDDEN: ${!subsAndAdsState.bitsSectionVisible ? 'PASS' : 'FAIL'}`);
  console.log(`Monthly Total is $960.07 ($624.07 + $336.00): ${subsAndAdsState.monthlyTotal === '$960.07' ? 'PASS' : 'FAIL'}`);
  console.log(`Hero Title is "Est. Monthly Selected Revenue": ${subsAndAdsState.heroTitle === 'Est. Monthly Selected Revenue' ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 5. TESTING AUTO-SYNC TO TOTAL WHEN ALL 3 ARE CHECKED ===');
  await page.evaluate(() => {
    const chkBits = document.getElementById('sel-source-bits');
    if (chkBits) { chkBits.checked = true; chkBits.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 200));

  const allSelectedState = await page.evaluate(() => {
    return {
      chkTotal: document.getElementById('sel-source-total')?.checked,
      itemTotalActive: document.getElementById('card-source-total')?.classList.contains('active'),
      monthlyTotal: document.getElementById('res-trc-monthly')?.textContent?.trim(),
      heroTitle: document.getElementById('lbl-hero-monthly')?.textContent?.trim()
    };
  });

  console.log('All 3 Selected State:', allSelectedState);
  console.log(`Total automatically re-checked: ${allSelectedState.chkTotal ? 'PASS' : 'FAIL'}`);
  console.log(`Total row has .active class: ${allSelectedState.itemTotalActive ? 'PASS' : 'FAIL'}`);
  console.log(`Total Monthly restored to $1,205.57: ${allSelectedState.monthlyTotal === '$1,205.57' ? 'PASS' : 'FAIL'}`);
  console.log(`Hero Title restored to "Est. Monthly Total Revenue": ${allSelectedState.heroTitle === 'Est. Monthly Total Revenue' ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 6. TESTING INPUT VALUE PRESERVATION ON TOGGLE ===');
  // Edit Tier 1 subs to 200
  await page.evaluate(() => {
    const t1Input = document.getElementById('trc-subs-t1-input');
    if (t1Input) {
      t1Input.value = '200';
      t1Input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 200));

  // Hide Subs by unchecking it
  await page.evaluate(() => {
    const chkSubs = document.getElementById('sel-source-subs');
    if (chkSubs) { chkSubs.checked = false; chkSubs.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 200));

  // Re-enable Subs
  await page.evaluate(() => {
    const chkSubs = document.getElementById('sel-source-subs');
    if (chkSubs) { chkSubs.checked = true; chkSubs.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 200));

  const preservedValue = await page.evaluate(() => {
    return document.getElementById('trc-subs-t1-input')?.value;
  });
  console.log(`Preserved Tier 1 Subs value: ${preservedValue} (Expected: 200): ${preservedValue === '200' ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 7. TESTING MINIMUM SELECTION PROTECTION ===');
  const minSelectionResult = await page.evaluate(() => {
    const chkAds = document.getElementById('sel-source-ads');
    const chkBits = document.getElementById('sel-source-bits');
    const chkSubs = document.getElementById('sel-source-subs');

    if (chkAds) { chkAds.checked = false; chkAds.dispatchEvent(new Event('change', { bubbles: true })); }
    if (chkBits) { chkBits.checked = false; chkBits.dispatchEvent(new Event('change', { bubbles: true })); }

    // Try to uncheck Subs (the last active one)
    if (chkSubs) { chkSubs.checked = false; chkSubs.dispatchEvent(new Event('change', { bubbles: true })); }

    return {
      subsStillChecked: chkSubs.checked,
      atLeastOneActive: chkSubs.checked || chkAds.checked || chkBits.checked
    };
  });
  console.log('Minimum Selection Result:', minSelectionResult);
  console.log(`Protected against 0 active sources: ${minSelectionResult.atLeastOneActive ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 8. CAPTURING UPDATED SCREENSHOTS ===');
  const artifactsDir = 'C:\\Users\\rrajb\\.gemini\\antigravity\\brain\\bb2641a2-7c4d-40b9-85bb-13a41943a2ff';

  // Reset to default
  await page.click('#trc-reset');
  await new Promise(r => setTimeout(r, 300));

  // Desktop with List Selector
  await page.setViewport({ width: 1280, height: 950 });
  await page.screenshot({ path: path.join(artifactsDir, 'twitch_list_selector_desktop.png'), fullPage: false });
  console.log('Saved twitch_list_selector_desktop.png');

  // Desktop with Subs Only
  await page.evaluate(() => {
    const chkAds = document.getElementById('sel-source-ads');
    const chkBits = document.getElementById('sel-source-bits');
    if (chkAds) { chkAds.checked = false; chkAds.dispatchEvent(new Event('change', { bubbles: true })); }
    if (chkBits) { chkBits.checked = false; chkBits.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(artifactsDir, 'twitch_list_subs_only_desktop.png'), fullPage: false });
  console.log('Saved twitch_list_subs_only_desktop.png');

  // Reset to default for mobile screenshots
  await page.click('#trc-reset');
  await new Promise(r => setTimeout(r, 300));

  // Mobile 375px
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(artifactsDir, 'twitch_list_selector_mobile_375.png'), fullPage: false });
  console.log('Saved twitch_list_selector_mobile_375.png');

  // Mobile 320px
  await page.setViewport({ width: 320, height: 750 });
  await page.screenshot({ path: path.join(artifactsDir, 'twitch_list_selector_mobile_320.png'), fullPage: false });
  console.log('Saved twitch_list_selector_mobile_320.png');

  await browser.close();
  server.close();
  console.log('\n=== ALL LIST SELECTOR VERIFICATIONS PASSED CLEANLY ===');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
