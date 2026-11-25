import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle0' });
  await page.click('label[for="task-support"]');
  assert.equal(await page.$eval('#task-support', input => input.checked), true);
  assert.ok(await page.$eval('#task-title', title => title.getAnimations().length > 0), 'Task content animates immediately');
  await page.focus('#task-support');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await wait(350);
  assert.equal(await page.$eval('#task-title', title => title.textContent), 'Начнём с разговора.');
  assert.equal(await page.$eval('#task-title', title => getComputedStyle(title).opacity), '1');
  assert.equal(await page.$eval('#task-advice', input => input.checked), true);
  await page.screenshot({ path: '.hallmark/shots/section-motion-desktop.png' });

  const height = () => page.$eval('.faq-list details', details => details.getBoundingClientRect().height);
  const closed = await height();
  await page.click('.faq-list summary');
  await wait(65);
  const opening = await height();
  await wait(330);
  const opened = await height();
  assert.ok(opening > closed + 1 && opening < opened - 1, 'FAQ expands progressively');
  await page.click('.faq-list summary');
  await wait(65);
  const closing = await height();
  assert.ok(closing > closed + 1 && closing < opened - 1, 'FAQ collapses progressively');
  await wait(330);
  assert.ok(Math.abs(await height() - closed) < 1);
  await page.focus('.faq-list summary');
  await page.keyboard.press('Enter');
  await wait(50);
  await page.keyboard.press('Enter');
  await wait(50);
  await page.keyboard.press('Enter');
  await wait(350);
  assert.equal(await page.$eval('.faq-list details', details => details.open), true);
  assert.ok(await height() > closed);
  await page.setViewport({ width: 375, height: 812 });
  await page.$eval('#answers', section => section.scrollIntoView());
  await page.screenshot({ path: '.hallmark/shots/section-motion-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  for (const width of [320, 375, 730]) {
    await page.setViewport({ width, height: 812 });
    for (const task of ['new', 'support', 'advice']) {
      await page.click(`label[for="task-${task}"]`);
      await wait(320);
      assert.equal(await page.$eval('.task-result', panel => {
        const selected = document.querySelector('input[name="task"]:checked');
        const label = selected.nextElementSibling;
        const next = selected.parentElement.nextElementSibling;
        const rect = panel.getBoundingClientRect();
        return panel.parentElement === selected.parentElement
          && Math.abs(rect.top - label.getBoundingClientRect().bottom) < 1
          && (!next || rect.bottom <= next.getBoundingClientRect().top)
          && document.documentElement.scrollWidth <= innerWidth;
      }), true, `Answer immediately follows selected item at ${width}px`);
    }
    assert.equal(await page.$eval('.service-ledger', ledger => {
      const [first, second] = ledger.children;
      return getComputedStyle(ledger).rowGap === '0px'
        && parseFloat(getComputedStyle(first).borderBottomWidth) + parseFloat(getComputedStyle(second).borderTopWidth) === 1;
    }), true, `Single service divider at ${width}px`);
  }
  await page.setViewport({ width: 375, height: 812 });
  await page.click('label[for="task-support"]');
  await page.focus('#task-support');
  await page.keyboard.press('ArrowRight');
  await wait(320);
  assert.equal(await page.$eval('.task-result', panel => panel.parentElement.querySelector('input').value), 'advice');
  await page.$eval('#start', section => section.scrollIntoView());
  await page.screenshot({ path: '.hallmark/shots/mobile-inline-task.png' });
  await page.$eval('#services', section => section.scrollIntoView());
  await page.screenshot({ path: '.hallmark/shots/mobile-service-divider.png' });
  for (const width of [768, 1280]) {
    await page.setViewport({ width, height: 900 });
    assert.equal(await page.$eval('.task-result', panel => panel.parentElement.classList.contains('task-picker')), true, 'Desktop answer returns to right column');
    assert.equal(await page.$eval('#task-advice', input => input.checked), true);
  }

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.click('label[for="task-new"]');
  assert.equal(await page.$eval('#task-title', title => title.getAnimations().length), 0);
  assert.equal(await page.$eval('.faq-list details', details => getComputedStyle(details, '::details-content').transitionDuration), '0s');
  const noJS = await browser.newPage();
  await noJS.setJavaScriptEnabled(false);
  await noJS.goto(process.env.SITE_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle0' });
  await noJS.click('.faq-list summary');
  await wait(350);
  assert.equal(await noJS.$eval('.faq-list details', details => details.open), true);
  assert.ok(await noJS.$eval('.faq-list details p', answer => answer.getBoundingClientRect().height > 0));
  assert.deepEqual(errors, []);
  console.log('PASS: task animation, rapid keyboard changes, FAQ opening/closing and interruption, mobile, reduced motion, no-JS FAQ.');
} finally {
  await browser.close();
}
