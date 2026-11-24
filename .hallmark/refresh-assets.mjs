import fs from 'node:fs';
const hPath='M5 11h7v15h15V11h7v38h-7V33H12v16H5z';
const sevenPath='M45 11h34v7L59 49h-9l20-31H45z';
const mark=`<svg viewBox="0 0 84 60"><path d="${hPath}${sevenPath}"/></svg>`;
let h=fs.readFileSync('dist/index.html','utf8');
h=h.replaceAll(/<span class="brand-mark" aria-hidden="true"><svg[\s\S]*?<\/svg><\/span>/g,`<span class="brand-mark" aria-hidden="true">${mark}</span>`);
h=h.replace('./images/h7-sculpture.png','./images/business-owner.png').replace('alt="Объёмный знак H7 из светлой керамики и синего металла"','alt="Предпринимательница за работой в небольшой мастерской-магазине"');
h=h.replace('./images/design-process.png','./images/working-together.png').replace('alt="Бумажные эскизы компоновки сайта и синий карандаш на рабочем столе"','alt="Обсуждение задачи за ноутбуком в небольшой рабочей комнате"');
h=h.replace(/<svg class="care-graphic"[\s\S]*?<\/svg>/,`<svg class="care-graphic" viewBox="0 0 84 60" fill="none" aria-hidden="true"><path class="care-graphic-outer" d="${hPath}"/><path class="care-graphic-seven" d="${sevenPath}"/></svg>`);
fs.writeFileSync('dist/index.html',h);
let s=fs.readFileSync('dist/styles.css','utf8');s=s.replace('signature: monumental H7 image opposite a service promise','signature: open H7 wordmark and human business photography');s=s.replace(/\/\* Hallmark · hero-review:[^\n]+\n/,'');
fs.writeFileSync('dist/styles.css',s);
fs.appendFileSync('dist/styles.css',`
.brand-mark { width: 64px; height: 46px; background: var(--color-transparent); }
.brand-mark svg { width: 64px; height: 46px; fill: var(--color-accent); }
.brand-mark path { transform: none; }
.brand-name { font-family: var(--font-display); font-size: 1.6rem; font-weight: 400; line-height: 1.2; letter-spacing: -.025em; }
.brand-name small { font-family: var(--font-body); font-size: var(--text-sm); letter-spacing: normal; margin-top: var(--space-2xs); }
.site-footer .brand-mark { width: 96px; height: 72px; }
.site-footer .brand-mark svg { width: 96px; height: 72px; }
.care-graphic { aspect-ratio: 84 / 60; }
.care-graphic-outer, .care-graphic-seven { fill: none; stroke: var(--color-field-ink); stroke-width: .45; }
.hero-artwork img { object-position: center 45%; }
.services-visual img { object-position: center 48%; }
@media (max-width: 46rem) {
 .brand { gap: var(--space-sm); }
 .brand-name { font-size: 1.5rem; }
 .brand-mark, .brand-mark svg { width: 58px; height: 44px; }
 .hero-artwork img { object-position: center 40%; }
 .services-visual { aspect-ratio: 5 / 3; }
 .services-visual img { object-position: 66% center; }
}
`);
const root=`<style>:root{--signal:oklch(45% .18 262);--paper:oklch(97% .012 82)}path{fill:var(--signal)}rect{fill:var(--paper)}</style>`;
fs.writeFileSync('dist/h7-mark.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 84 60" role="img" aria-label="H7">${root}<path d="${hPath}${sevenPath}"/></svg>`);
fs.writeFileSync('dist/favicon.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 48 48">${root}<rect width="48" height="48" rx="6"/><path d="M8 9h32v7L22 40H12l18-24H8z"/></svg>`);
fs.mkdirSync('.hallmark/asset-refresh',{recursive:true});fs.writeFileSync('.hallmark/asset-refresh/decision.json',JSON.stringify({scope:'Logo and imagery only',logoDecision:'Replace generic boxed H7 with an open, proportioned monogram and Prata wordmark. A single 7 favicon remains legible at small sizes.',images:'Generated editorial human scenes; no team, client or portfolio claims',preserved:'Page layout, palette, service copy and all interactions',files:['dist/index.html','dist/styles.css','dist/h7-mark.svg','dist/favicon.svg','dist/images/business-owner.png','dist/images/working-together.png']},null,2));
