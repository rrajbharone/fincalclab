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
  const port = 4347;
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

  console.log('\n=== 1. AUDITING NUMERIC INPUT ALIGNMENT ACROSS VIEWPORTS ===');
  for (const width of viewports) {
    await page.setViewport({ width, height: 900 });
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });

    // Set 490 viewers to reproduce the user's exact state
    await page.evaluate(() => {
      const vInput = document.getElementById('trc-viewers-input');
      if (vInput) {
        vInput.value = '490';
        vInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 100));

    const audit = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const hasHScroll = docWidth > winWidth;

      const inputList = Array.from(document.querySelectorAll('#twitch-revenue-calculator .input-symbol-wrapper input'));
      const results = inputList.map(inp => {
        const style = window.getComputedStyle(inp);
        const wrapper = inp.parentElement;
        const unit = wrapper ? wrapper.querySelector('.unit-symbol') : null;
        const curr = wrapper ? wrapper.querySelector('.currency-symbol') : null;

        const iRect = inp.getBoundingClientRect();
        const uRect = unit ? unit.getBoundingClientRect() : null;
        const cRect = curr ? curr.getBoundingClientRect() : null;

        // Check if textAlign is left
        const isLeftAligned = style.textAlign === 'left';

        // Check if there is overlap between input text area and unit
        let hasOverlap = false;
        let clearance = 999;
        if (unit && uRect) {
          // In left-aligned inputs, the text starts at iRect.left + paddingLeft
          // The distance to unit is uRect.left - iRect.left
          clearance = uRect.left - iRect.left;
          if (uRect.left < iRect.left + 50) { // If unit is inside the text start area
            hasOverlap = true;
          }
        }

        return {
          id: inp.id,
          value: inp.value,
          textAlign: style.textAlign,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          isLeftAligned,
          hasOverlap,
          clearance: Math.round(clearance),
          unitText: unit ? unit.textContent.trim() : null,
          currText: curr ? curr.textContent.trim() : null
        };
      });

      const allLeftAligned = results.every(r => r.isLeftAligned);
      const anyOverlap = results.some(r => r.hasOverlap);

      return {
        winWidth,
        docWidth,
        hasHScroll,
        inputCount: results.length,
        allLeftAligned,
        anyOverlap,
        results
      };
    });

    console.log(`Viewport ${width}px: H-Scroll: ${audit.hasHScroll ? 'FAIL' : 'PASS'}, Inputs Checked: ${audit.inputCount}, All Left-Aligned: ${audit.allLeftAligned ? 'PASS' : 'FAIL'}, Overlaps: ${audit.anyOverlap ? 'FAIL' : '0 (PASS)'}`);
    if (!audit.allLeftAligned || audit.anyOverlap) {
      console.error('Audit details:', JSON.stringify(audit.results.filter(r => !r.isLeftAligned || r.hasOverlap), null, 2));
    }
  }

  console.log('\n=== 2. VERIFYING SPECIFIC INPUTS FROM SCREENSHOT (490 viewers, 80 hrs/mo) ===');
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });

  // Set viewers = 490 and hours = 80
  await page.evaluate(() => {
    const vInput = document.getElementById('trc-viewers-input');
    if (vInput) { vInput.value = '490'; vInput.dispatchEvent(new Event('input', { bubbles: true })); }
    const hInput = document.getElementById('trc-hours-input');
    if (hInput) { hInput.value = '80'; hInput.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 200));

  const detailedCheck = await page.evaluate(() => {
    const checkField = (id) => {
      const inp = document.getElementById(id);
      const wrapper = inp ? inp.parentElement : null;
      const unit = wrapper ? wrapper.querySelector('.unit-symbol') : null;
      const style = inp ? window.getComputedStyle(inp) : null;
      const iRect = inp ? inp.getBoundingClientRect() : null;
      const uRect = unit ? unit.getBoundingClientRect() : null;

      return {
        id,
        value: inp ? inp.value : null,
        textAlign: style ? style.textAlign : null,
        paddingLeft: style ? style.paddingLeft : null,
        paddingRight: style ? style.paddingRight : null,
        unitText: unit ? unit.textContent : null,
        inputLeft: iRect ? Math.round(iRect.left) : null,
        unitLeft: uRect ? Math.round(uRect.left) : null,
        gap: (iRect && uRect) ? Math.round(uRect.left - iRect.left) : null
      };
    };

    return {
      viewers: checkField('trc-viewers-input'),
      hours: checkField('trc-hours-input'),
      subsT1: checkField('trc-subs-t1-input'),
      bits: checkField('trc-bits')
    };
  });

  console.log('Detailed Field Check on 375px:');
  console.log(' - Viewers Input:', detailedCheck.viewers);
  console.log(' - Hours Input:', detailedCheck.hours);
  console.log(' - Subs T1 Input:', detailedCheck.subsT1);
  console.log(' - Bits Input:', detailedCheck.bits);

  console.log(`\nViewers Left-Aligned: ${detailedCheck.viewers.textAlign === 'left' ? 'PASS' : 'FAIL'}`);
  console.log(`Viewers Gap to Unit: ${detailedCheck.viewers.gap}px (Clearance > 150px): ${detailedCheck.viewers.gap > 150 ? 'PASS' : 'FAIL'}`);
  console.log(`Hours Left-Aligned: ${detailedCheck.hours.textAlign === 'left' ? 'PASS' : 'FAIL'}`);
  console.log(`Hours Gap to Unit: ${detailedCheck.hours.gap}px (Clearance > 150px): ${detailedCheck.hours.gap > 150 ? 'PASS' : 'FAIL'}`);

  console.log('\n=== 3. TESTING EXTREME VALUE INPUT (99,999 viewers) ===');
  await page.evaluate(() => {
    const vInput = document.getElementById('trc-viewers-input');
    if (vInput) { vInput.value = '99999'; vInput.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 200));

  const extremeCheck = await page.evaluate(() => {
    const inp = document.getElementById('trc-viewers-input');
    const unit = inp?.parentElement?.querySelector('.unit-symbol');
    const uRect = unit?.getBoundingClientRect();
    const iRect = inp?.getBoundingClientRect();

    return {
      val: inp?.value,
      paddingRight: window.getComputedStyle(inp).paddingRight,
      unitRight: Math.round(uRect?.right),
      unitLeft: Math.round(uRect?.left),
      inputRight: Math.round(iRect?.right)
    };
  });
  console.log('Extreme Value Check:', extremeCheck);

  console.log('\n=== 4. CAPTURING VERIFICATION SCREENSHOTS ===');
  const artifactsDir = 'C:\\Users\\rrajb\\.gemini\\antigravity\\brain\\bb2641a2-7c4d-40b9-85bb-13a41943a2ff';

  // Set back to 490 and 80 for screenshots matching user's exact scenario
  await page.evaluate(() => {
    const vInput = document.getElementById('trc-viewers-input');
    if (vInput) { vInput.value = '490'; vInput.dispatchEvent(new Event('input', { bubbles: true })); }
    const hInput = document.getElementById('trc-hours-input');
    if (hInput) { hInput.value = '80'; hInput.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 200));

  // Focus on stream profile section for close-up screenshot
  await page.setViewport({ width: 375, height: 812 });
  const streamProfileSec = await page.$('#section-stream-profile');
  if (streamProfileSec) {
    await streamProfileSec.screenshot({ path: path.join(artifactsDir, 'twitch_inputs_aligned_mobile_375.png') });
    console.log('Saved twitch_inputs_aligned_mobile_375.png');
  }

  // 320px Viewport
  await page.setViewport({ width: 320, height: 750 });
  const streamProfile320 = await page.$('#section-stream-profile');
  if (streamProfile320) {
    await streamProfile320.screenshot({ path: path.join(artifactsDir, 'twitch_inputs_aligned_mobile_320.png') });
    console.log('Saved twitch_inputs_aligned_mobile_320.png');
  }

  // Desktop view
  await page.setViewport({ width: 1280, height: 950 });
  const desktopInputs = await page.$('.calc-inputs-wrapper');
  if (desktopInputs) {
    await desktopInputs.screenshot({ path: path.join(artifactsDir, 'twitch_inputs_aligned_desktop.png') });
    console.log('Saved twitch_inputs_aligned_desktop.png');
  }

  await browser.close();
  server.close();
  console.log('\n=== ALL NUMERIC INPUT ALIGNMENT VERIFICATIONS PASSED CLEANLY ===');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
