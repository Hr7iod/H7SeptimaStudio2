import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1280, height: 800 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle0' });
  assert.equal(await page.$('#design-lab'), null, 'Mini-studio is removed');
  assert.equal(await page.$('#brief-design'), null, 'Mini-studio setting is removed from the brief');
  assert.equal(await page.$('#field-motion'), null, 'Pause button is removed');
  await page.waitForFunction(() => document.querySelector('#point-field').dataset.motion === 'running');
  const picture = () => page.$eval('#point-canvas', canvas => canvas.toDataURL());
  const delay = () => new Promise(resolve => setTimeout(resolve, 180));
  let first = await picture(); await delay();
  assert.notEqual(await picture(), first, 'Point field renders moving pixels');
  const bounds = await page.$eval('#point-canvas', canvas => { const rect = canvas.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; });
  async function highlightAt(x, y) {
    await page.mouse.move(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
    await new Promise(resolve => setTimeout(resolve, 260));
    assert.equal(await page.$eval('#point-field', frame => frame.dataset.motion), 'running', 'Hover keeps the animation running');
    return page.$eval('#point-canvas', canvas => {
      const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      let sumX = 0, sumY = 0, count = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (data[i + 3] > 100 && data[i + 2] > 200 && data[i] < 190 && data[i + 2] > data[i + 1] * 1.16) { sumX += x; sumY += y; count++; }
      }
      const rect = canvas.getBoundingClientRect();
      return { count, x: sumX / count * rect.width / canvas.width, y: sumY / count * rect.height / canvas.height };
    });
  }
  const upper = await highlightAt(.13, .32);
  const lower = await highlightAt(.13, .66);
  const right = await highlightAt(.72, .66);
  assert.ok(upper.count > 20 && lower.count > 20 && right.count > 20, 'Pointer illuminates visible points');
  assert.ok(lower.y > upper.y + 70, 'Highlight follows vertical pointer movement');
  assert.ok(right.x > lower.x + 130, 'Highlight follows horizontal pointer movement');
  first = await picture(); await delay(); assert.notEqual(await picture(), first, 'Scene still animates while hovered');
  await page.mouse.move(0, 0);
  assert.equal(await page.$eval('#point-field', frame => frame.dataset.pointer), 'idle', 'Leaving restores automatic scanning');
  await page.$eval('#contact', section => section.scrollIntoView());
  await page.waitForFunction(() => document.querySelector('#point-field').dataset.motion === 'paused');
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(() => document.querySelector('#point-field').dataset.motion === 'running');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.waitForFunction(() => document.querySelector('#point-field').dataset.motion === 'paused');
  first = await picture(); await delay(); assert.equal(await picture(), first, 'Reduced motion shows a still');
  for (const width of [320, 375, 768, 960, 1280, 1440, 1920]) {
    await page.setViewport({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow at ${width}`);
  }
  assert.deepEqual(errors, []);
  await page.setJavaScriptEnabled(false);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('.cloud-fallback', mark => getComputedStyle(mark).display !== 'none'), true);
  assert.equal(await page.$('#field-motion'), null);
  const physics = await browser.newPage();
  await physics.setViewport({ width: 1280, height: 800 });
  await physics.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await physics.evaluateOnNewDocument(() => {
    // Hold the idle rotation still so measured movement comes only from the cursor.
    window.originalSin = Math.sin;
    Math.sin = () => 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.id === 'point-canvas') window.fieldPoints = [];
      return clear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, ...rest) {
      if (this.canvas.id === 'point-canvas') window.fieldPoints.push({ x, y, color: this.fillStyle });
      return fill.call(this, x, y, ...rest);
    };
  });
  await physics.goto(process.env.SITE_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle0' });
  const base = await physics.evaluate(() => window.fieldPoints);
  const area = await physics.$eval('#point-canvas', canvas => { const r = canvas.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const cursor = { x: area.width * .2, y: area.height * .5 };
  await physics.mouse.move(area.x + cursor.x, area.y + cursor.y);
  await new Promise(resolve => setTimeout(resolve, 650));
  const pushed = await physics.evaluate(() => window.fieldPoints);
  assert.ok(base.every((point, index) => pushed[index].x === point.x && pushed[index].y === point.y), 'Cursor does not displace points');
  assert.ok(new Set(pushed.map(point => point.color)).size > 100, 'Highlight uses a continuous palette');
  await physics.mouse.move(0, 0);
  await physics.evaluate(() => { Math.sin = window.originalSin; });
  await new Promise(resolve => setTimeout(resolve, 100));
  const rotationStart = await physics.evaluate(() => window.fieldPoints);
  await new Promise(resolve => setTimeout(resolve, 1800));
  const rotationEnd = await physics.evaluate(() => window.fieldPoints);
  assert.ok(rotationStart.some((point, index) => Math.hypot(rotationEnd[index].x - point.x, rotationEnd[index].y - point.y) > 1), 'Rotation visibly moves points within two seconds');
  await physics.close();
  console.log('PASS: no cursor displacement, visible rotation within two seconds, continuous highlight palette, pointer tracking, hover motion, offscreen pause, reduced motion, 7 widths, no-JS fallback.');
} finally { await browser.close(); }
