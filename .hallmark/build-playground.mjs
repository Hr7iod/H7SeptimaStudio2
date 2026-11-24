import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const old=execFileSync('git',['show','650238a36fce609ce98272026d106ed28930db9c:dist/index.html'],{encoding:'utf8'});
const oldMark=old.match(/<span class="brand-mark" aria-hidden="true">[\s\S]*?<\/span>/)[0];
let html=fs.readFileSync('dist/index.html','utf8').replaceAll(/<span class="brand-mark" aria-hidden="true">[\s\S]*?<\/span>/g,oldMark);
const lab=`<div class="design-lab" id="design-lab" data-style="soft" data-business="shop">
  <div class="lab-top"><p>Попробуйте себя в роли дизайнера.</p><button class="lab-button" id="lab-shuffle" type="button" disabled>Удивить меня</button></div>
  <div class="lab-preview" id="lab-preview" data-slot="design-demo" data-kind="product">
    <div class="sample-header"><span class="sample-brand" data-sample="brand">Пример магазина</span><div class="sample-links"><span>О нас</span><span>Коллекция</span></div></div>
    <div class="sample-layout"><div><h3 class="sample-title" data-sample="title">Вещи с характером.</h3><p class="sample-line" data-sample="line">Для дома и повседневных радостей.</p></div><div class="sample-glyph" data-sample="glyph" aria-hidden="true">&amp;</div></div>
    <span class="sample-action" data-sample="action">Посмотреть коллекцию</span>
  </div>
  <div class="lab-controls">
    <fieldset><legend>Ваш бизнес</legend><div class="lab-options"><button class="lab-button" type="button" data-business="shop" aria-pressed="true" disabled>Магазин</button><button class="lab-button" type="button" data-business="bureau" aria-pressed="false" disabled>Бюро</button><button class="lab-button" type="button" data-business="cafe" aria-pressed="false" disabled>Кафе</button></div></fieldset>
    <fieldset><legend>Настроение</legend><div class="lab-options"><button class="lab-button" type="button" data-style-choice="soft" aria-pressed="true" disabled>Мягко</button><button class="lab-button" type="button" data-style-choice="bold" aria-pressed="false" disabled>Смело</button><button class="lab-button" type="button" data-style-choice="precise" aria-pressed="false" disabled>Строго</button></div></fieldset>
  </div>
  <div class="lab-bottom"><p id="lab-status" role="status" aria-live="polite">Магазин. Стиль: мягко.</p><a class="lab-pick" id="lab-pick" href="#contact">Хочу этот стиль</a></div>
  <p class="lab-caption">Демонстрационный макет, не клиентский проект.</p>
  <noscript><p class="no-script">Включите JavaScript, чтобы менять дизайн.</p></noscript>
</div>`;
html=html.replace(/<figure class="hero-artwork">[\s\S]*?<\/figure>/,lab).replace(/\s*<figure class="services-visual">[\s\S]*?<\/figure>/,'');
html=html.replace(/<svg class="care-graphic"[\s\S]*?<\/svg>/,old.match(/<svg class="care-graphic"[\s\S]*?<\/svg>/)[0]);
html=html.replace('<form id="brief-form" data-endpoint="" novalidate>','<form id="brief-form" data-endpoint="" novalidate><p class="design-choice" id="design-choice" role="status"></p><input type="hidden" id="brief-design" name="design" value="">');
fs.writeFileSync('dist/index.html',html);
for(const f of ['favicon.svg','h7-mark.svg'])fs.writeFileSync('dist/'+f,execFileSync('git',['show',`650238a36fce609ce98272026d106ed28930db9c:dist/${f}`],{encoding:'utf8'}));
let css=fs.readFileSync('dist/styles.css','utf8').replace("@import url('./base.css');","@import url('./base.css');\n@import url('./playground.css');");
css=css.replace('signature: open H7 wordmark and human business photography','signature: interactive design studio with animated style changes').replace(/\/\* Hallmark · asset-review:[^\n]*\n/,'');
css+=`
.brand-mark { width:48px; height:48px; background:var(--color-accent); }
.brand-mark svg { width:44px; height:44px; fill:var(--color-accent-ink); }
.brand-mark path { transform:translateX(-2px); }
.brand-name { font-family:var(--font-body); font-size:1.4rem; font-weight:500; letter-spacing:normal; }
.site-footer .brand-mark { width:72px; height:72px; }
.site-footer .brand-mark svg { width:64px; height:64px; }
.care-graphic { aspect-ratio:440 / 420; }
.care-graphic-outer { stroke-width:1.3; }
.care-graphic-seven { stroke-width:2; }
@media(max-width:46rem) { .brand-name { font-size:1.25rem; } .brand { gap:var(--space-md); } }
`;
fs.writeFileSync('dist/styles.css',css);
let js=fs.readFileSync('dist/app.js','utf8');js+='\nimport \'./playground.js\';\n';js=js.replace("'Задача: ' + form.elements.task.value, '',", "'Задача: ' + form.elements.task.value, ...(form.elements.design.value ? ['Дизайн: ' + form.elements.design.value] : []), '',");fs.writeFileSync('dist/app.js',js);
fs.mkdirSync('.hallmark/playground',{recursive:true});fs.writeFileSync('.hallmark/playground/brief.json',JSON.stringify({request:'Restore boxed logo, remove people, add animations and engaging interaction',preserved:'Palette, page services, existing form and task selection',introduced:'Live business/style playground with shuffle and selection exported into downloadable brief',illustrative:'Demo is explicitly labelled, no fabricated client projects',motion:'One orchestrated entrance and user-triggered transform/opacity transitions; reduced-motion fallback; no continuous loops'},null,2));
