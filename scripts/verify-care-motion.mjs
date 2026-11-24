import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle0' });
  const state = () => page.$eval('.care-trace', path => getComputedStyle(path).animationPlayState);
  assert.equal(await state(), 'paused', 'Offscreen animation is paused');
  await page.$eval('#care', section => section.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => document.querySelector('.care-graphic').classList.contains('is-active'));
  assert.equal(await state(), 'running');
  const offset = () => page.$eval('.care-trace', path => getComputedStyle(path).strokeDashoffset);
  const start = await offset();
  await new Promise(resolve => setTimeout(resolve, 800));
  assert.notEqual(await offset(), start, 'Light travels along the contour');
  await page.screenshot({ path: '.hallmark/shots/care-motion-desktop.png' });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(() => !document.querySelector('.care-graphic').classList.contains('is-active'));
  assert.equal(await state(), 'paused');
  await page.setViewport({ width: 375, height: 812 });
  await page.$eval('.care-graphic', graphic => graphic.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => document.querySelector('.care-graphic').classList.contains('is-active'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await new Promise(resolve => setTimeout(resolve, 700));
  await page.screenshot({ path: '.hallmark/shots/care-motion-mobile.png' });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  assert.equal(await page.$eval('.care-traces', group => getComputedStyle(group).display), 'none');
  assert.equal(await page.$eval('.care-trace', path => getComputedStyle(path).animationName), 'none');
  const noJS = await browser.newPage();
  await noJS.setJavaScriptEnabled(false);
  await noJS.goto(process.env.SITE_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle0' });
  assert.equal(await noJS.$eval('.care-trace', path => getComputedStyle(path).animationPlayState), 'paused');
  assert.equal(await noJS.$eval('.care-traces', group => getComputedStyle(group).opacity), '0');
  assert.equal(await noJS.$eval('.care-graphic-outer', path => getComputedStyle(path).stroke !== 'none'), true);
  assert.deepEqual(errors, []);
  console.log('PASS: contour motion, offscreen pause, desktop/mobile layout, reduced motion, static no-JS fallback.');
} finally {
  await browser.close();
}
