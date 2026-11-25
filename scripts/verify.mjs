import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

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
  assert.equal(await page.$eval('#task-support', e => e.checked), true);
  assert.match(await page.$eval('#task-title', e => e.textContent), /улучшить/);
  await page.focus('#task-support');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.$eval('#task-advice', e => e.checked), true);
  assert.equal(await page.$('#brief-form input[name="task"]'), null);
  assert.equal(await page.$eval('.form-notice a', e => e.getAttribute('href')), 'mailto:info@h7septima.ru');
  await page.click('.faq-list summary');
  assert.equal(await page.$eval('.faq-list details', e => e.open), true);
  await page.click('#brief-form button');
  assert.equal(await page.$eval('#client-name', e => e.getAttribute('aria-invalid')), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'client-name');
  await page.type('#client-name', 'Анна');
  await page.click('#brief-form button');
  assert.equal(await page.$eval('#client-contact', e => e.getAttribute('aria-invalid')), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'client-contact');
  assert.match(await page.$eval('label[for="client-contact"]', e => e.textContent), /Почта или другой предпочтительный способ связи/);
  await page.type('#client-contact', 'WhatsApp: +7 900 123-45-67, после 18:00');
  await page.type('#project', 'Нужен сайт небольшой мастерской с каталогом услуг.');
  const submissions = [];
  const responses = [503, 429, 'offline', 200];
  await page.setRequestInterception(true);
  page.on('request', async request => {
    if (new URL(request.url()).pathname !== '/api/brief') return request.continue();
    submissions.push(JSON.parse(request.postData()));
    const code = responses.shift();
    if (code === 'offline') return request.abort('internetdisconnected');
    await new Promise(resolve => setTimeout(resolve, 350));
    return request.respond({
      status: code,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(code === 200 ? { ok: true } : {
        ok: false,
        message: code === 429 ? 'Слишком много попыток. Попробуйте через 10 минут.' : 'Не удалось отправить заявку. Попробуйте позже.'
      })
    });
  });
  await mkdir('.hallmark/shots', { recursive: true });
  for (const width of [375, 1440]) {
    await page.setViewport({ width, height: 1000 });
    await page.$eval('#contact', section => section.scrollIntoView());
    await page.screenshot({ path: `.hallmark/shots/brief-form-${width}.png` });
  }
  for (const attempt of [0, 1, 2]) {
    await page.click('#brief-form button');
    await page.waitForFunction(() => document.querySelector('#form-status').dataset.state === 'error');
    assert.equal(await page.$eval('#client-name', e => e.value), 'Анна', 'Preserve input on failure');
    assert.equal(await page.$eval('#brief-form button', e => e.disabled), false);
    if (attempt === 1) assert.match(await page.$eval('#form-status', e => e.textContent), /10 минут/);
    if (attempt === 2) assert.match(await page.$eval('#form-status', e => e.textContent), /интернет/);
  }
  await page.evaluate(() => {
    document.querySelector('#brief-form').requestSubmit();
    document.querySelector('#brief-form').requestSubmit();
  });
  assert.equal(await page.$eval('#brief-form button', e => e.disabled), true);
  assert.equal(await page.$eval('#client-name', e => e.readOnly), true);
  await page.waitForFunction(() => document.querySelector('#form-status').dataset.state === 'success');
  assert.equal(submissions.length, 4, 'Prevent duplicate submissions');
  assert.deepEqual(submissions[3], {
    name: 'Анна', contact: 'WhatsApp: +7 900 123-45-67, после 18:00', project: 'Нужен сайт небольшой мастерской с каталогом услуг.', website: ''
  });
  assert.equal(await page.$eval('#client-name', e => e.value), '', 'Clear only after success');
  assert.deepEqual(errors, []);
  await page.setJavaScriptEnabled(false);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.ok(await page.$eval('#services', e => e.innerText.includes('Разработка')));
  assert.ok(await page.$eval('.no-script', e => e.offsetHeight > 0));
  assert.equal(await page.$eval('#brief-form button', e => e.disabled), true, 'Without JS the form cannot accidentally submit personal data');
  console.log('PASS: 7 widths, mobile menu, keyboard task selection, FAQ, freeform contact, info email link, no hidden task, mail submission, server/rate/network errors, preserved input, duplicate prevention, no-JS fallback, no browser errors.');
} finally {
  await browser.close();
}
