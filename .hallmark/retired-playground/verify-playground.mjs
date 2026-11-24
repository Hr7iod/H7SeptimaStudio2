import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const directory = await mkdtemp(join(tmpdir(), 'septima-design-'));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle0' });
  const colors = new Set();
  for (const business of ['shop', 'bureau', 'cafe']) {
    await page.click(`button[data-business="${business}"]`);
    for (const style of ['soft', 'bold', 'precise']) {
      await page.click(`button[data-style-choice="${style}"]`);
      assert.equal(await page.$eval('#design-lab', e => e.dataset.business), business);
      assert.equal(await page.$eval('#design-lab', e => e.dataset.style), style);
      assert.equal(await page.$eval(`button[data-style-choice="${style}"]`, e => e.getAttribute('aria-pressed')), 'true');
      colors.add(await page.$eval('#lab-preview', e => getComputedStyle(e).backgroundColor));
    }
  }
  assert.equal(colors.size, 3, 'Styles have visibly different palettes');
  assert.match(await page.$eval('[data-sample="title"]', e => e.textContent), /Кофе/);
  for (let i = 0; i < 5; i++) {
    const previous = await page.$eval('#design-lab', e => `${e.dataset.business}/${e.dataset.style}`);
    await page.click('#lab-shuffle');
    assert.notEqual(await page.$eval('#design-lab', e => `${e.dataset.business}/${e.dataset.style}`), previous, 'Shuffle visibly changes the design');
  }
  await page.focus('button[data-style-choice="soft"]');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.$eval('#design-lab', e => e.dataset.style), 'bold');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.click('button[data-business="cafe"]');
  assert.equal(await page.$eval('#lab-preview', e => e.getAnimations().filter(a => a.playState === 'running').length), 0);
  for (const width of [320, 375, 768, 960, 1280, 1440, 1920]) {
    await page.setViewport({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow at ${width}`);
    assert.equal(await page.$$eval('.lab-button', buttons => buttons.every(b => b.getBoundingClientRect().right <= innerWidth)), true);
  }
  await page.click('#lab-pick');
  assert.match(await page.$eval('#brief-design', e => e.value), /Кафе.*Смело/);
  assert.match(await page.$eval('#design-choice', e => e.textContent), /Кафе/);
  await page.type('#client-name', 'Анна');
  await page.type('#project', 'Нужен сайт кофейни с меню и контактами.');
  const session = await page.createCDPSession();
  await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: directory });
  await page.click('#brief-form button');
  let filename;
  for (let i = 0; i < 30; i++) {
    filename = (await readdir(directory)).find(file => file.endsWith('.txt'));
    if (filename) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(filename);
  assert.match(await readFile(join(directory, filename), 'utf8'), /Дизайн: Кафе, стиль «Смело»/);
  assert.deepEqual(errors, []);
  await page.setJavaScriptEnabled(false);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.ok(await page.$eval('#lab-preview', e => e.offsetHeight > 0));
  assert.equal(await page.$eval('#lab-shuffle', e => e.disabled), true);
  console.log('PASS: all 9 designs, shuffle, keyboard, reduced motion, 7 widths, selected design in downloaded brief, no-JS fallback.');
} finally {
  await browser.close();
  await rm(directory, { recursive: true, force: true });
}
