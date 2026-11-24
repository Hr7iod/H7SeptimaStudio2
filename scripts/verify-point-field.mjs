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
  await page.waitForFunction(() => document.querySelector('#point-field').dataset.motion === 'running');
  const picture = () => page.$eval('#point-canvas', canvas => canvas.toDataURL());
  const delay = () => new Promise(resolve => setTimeout(resolve, 180));
  let first = await picture(); await delay();
  assert.notEqual(await picture(), first, 'Point field renders moving pixels');
  await page.click('#field-motion');
  await page.mouse.move(0, 0); await page.$eval('#field-motion', button => button.blur());
  assert.equal(await page.$eval('#field-motion', button => button.getAttribute('aria-pressed')), 'true');
  first = await picture(); await delay(); assert.equal(await picture(), first, 'Pause freezes the scene');
  await page.click('#field-motion');
  await page.mouse.move(0, 0); await page.$eval('#field-motion', button => button.blur());
  await page.waitForFunction(() => document.querySelector('#point-field').dataset.motion === 'running');
  const position = await page.$eval('#point-field', frame => { const rect = frame.getBoundingClientRect(); return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }; });
  await page.mouse.move(position.x, position.y);
  await page.waitForFunction(() => document.querySelector('#point-field').dataset.motion === 'paused');
  await page.mouse.move(0, 0);
  await page.$eval('#contact', section => section.scrollIntoView());
  await page.waitForFunction(() => document.querySelector('#point-field').dataset.motion === 'paused');
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(() => document.querySelector('#point-field').dataset.motion === 'running');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.waitForFunction(() => document.querySelector('#field-motion').disabled);
  first = await picture(); await delay(); assert.equal(await picture(), first, 'Reduced motion shows a still');
  for (const width of [320, 375, 768, 960, 1280, 1440, 1920]) {
    await page.setViewport({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow at ${width}`);
  }
  assert.deepEqual(errors, []);
  await page.setJavaScriptEnabled(false);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('.cloud-fallback', mark => getComputedStyle(mark).display !== 'none'), true);
  assert.equal(await page.$eval('#field-motion', button => button.offsetHeight), 0);
  console.log('PASS: mini-studio removed, animated pixels, pause/resume, hover/offscreen pause, reduced motion, 7 widths, no-JS logo fallback.');
} finally { await browser.close(); }
