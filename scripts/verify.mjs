import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const downloads = await mkdtemp(join(tmpdir(), 'septima-brief-'));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle0' });
  assert.equal(response.status(), 200);
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 375, 768, 960, 1280, 1440, 1920]) {
    await page.setViewport({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}px`);
    assert.equal(await page.$eval('h1', e => e.getBoundingClientRect().right <= innerWidth), true);
  }
  await page.setViewport({ width: 375, height: 812 });
  await page.click('.mobile-menu summary');
  assert.equal(await page.$eval('.mobile-menu', e => e.open), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('.mobile-menu', e => e.open), false);
  await page.click('label[for="task-support"]');
  assert.equal(await page.$eval('#brief-task', e => e.value), 'Сайт уже есть');
  assert.match(await page.$eval('#task-title', e => e.textContent), /улучшить/);
  await page.focus('#task-support');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.$eval('#brief-task', e => e.value), 'Пока не знаю');
  await page.click('.faq-list summary');
  assert.equal(await page.$eval('.faq-list details', e => e.open), true);
  await page.click('#brief-form button');
  assert.equal(await page.$eval('#client-name', e => e.getAttribute('aria-invalid')), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'client-name');
  await page.type('#client-name', 'Анна');
  await page.type('#client-contact', '@sample');
  await page.type('#project', 'Нужен сайт небольшой мастерской с каталогом услуг.');
  const session = await page.createCDPSession();
  await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await page.click('#brief-form button');
  await page.waitForFunction(() => document.querySelector('#form-status').textContent.includes('подготовлен'));
  let file;
  for (let i = 0; i < 30; i++) {
    file = (await readdir(downloads)).find(x => x.endsWith('.txt'));
    if (file) break;
    await new Promise(r => setTimeout(r, 100));
  }
  assert.ok(file, 'Brief downloads as a text file');
  const brief = await readFile(join(downloads, file), 'utf8');
  assert.match(brief, /Анна/);
  assert.match(brief, /Пока не знаю/);
  assert.match(brief, /не отправлен/);
  assert.deepEqual(errors, []);
  await page.setJavaScriptEnabled(false);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.ok(await page.$eval('#services', e => e.innerText.includes('Разработка')));
  assert.ok(await page.$eval('.no-script', e => e.offsetHeight > 0));
  assert.equal(await page.$eval('#brief-form button', e => e.disabled), true, 'Without JS the form cannot accidentally submit personal data');
  console.log('PASS: 7 widths, mobile menu, task selection with keyboard, FAQ, validation, downloaded brief, no-JS content, no browser errors.');
} finally {
  await browser.close();
  await rm(downloads, { recursive: true, force: true });
}
