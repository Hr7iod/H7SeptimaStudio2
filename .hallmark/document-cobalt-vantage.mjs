import fs from 'node:fs';
let r=fs.readFileSync('README.md','utf8');let from=r.indexOf('## Интерактивная мини-студия'),to=r.indexOf('## Проверки',from);if(from>=0&&to>=0)r=r.slice(0,from)+`## Дизайн Cobalt и Vantage

Мини-студия удалена по просьбе пользователя, включая настройки дизайна в брифе. Остались выбор задачи, FAQ, мобильное меню и скачивание брифа.

От Vantage: сине-чёрная поверхность, Geologica и точечный знак H7. От Cobalt: холодные светлые разделы, тонкие линии, синие акценты и кнопки с нижней гранью. Прежний логотип H7 в синей плашке сохранён. Фотографии не используются.

Скрипт point-field.js строит облако из существующей геометрии логотипа, не изображает вымышленные сканы или показатели. Движение можно остановить кнопкой. Анимация также останавливается при наведении, фокусе, уходе за экран и скрытии вкладки. При prefers-reduced-motion показывается статичный кадр; без JavaScript виден SVG-знак. Локальные шрифты Geologica и Golos Text снабжены лицензиями в dist/fonts.

`+r.slice(to);r=r.replace('node scripts/verify.mjs','node scripts/verify.mjs\nnode scripts/verify-point-field.mjs');fs.writeFileSync('README.md',r);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));pkg.scripts['verify:field']='node scripts/verify-point-field.mjs';fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
fs.copyFileSync('.hallmark/cobalt-vantage/preflight.json','.hallmark/preflight.json');
const entry={mode:'redesign',depth:'full',scope:'page',shape:'Studio signal',theme:'Cobalt + Vantage (by request)',axes:'dark/grotesk-sans/cool',hero:'Stage',nav:'edge-aligned',footer:'mast',imagery:'Live point field sampled from actual H7 logo; no images',photos:[],entry:'Left service promise and right H7 point field, followed by cold light ruled sections',fingerprint:'Hanging|Two-column asymmetric|Hairline|Solid|None|Single entrance',sections:['Point hero','Ruled service pair','Quiet support band','Task chooser','Light FAQ','Brief','Mast footer'],signature:'H7 geometry in an animated steel and cobalt point field',waived:[],prompt:'Remove mini-studio; seek inspiration in Hallmark Cobalt and Vantage. Keep boxed H7, service content and working brief.',removed:['Mini-studio DOM and assets','Design setting in brief','Mini-studio test, retired with feature']};fs.writeFileSync('.hallmark/cobalt-vantage/log-entry.json',JSON.stringify(entry,null,2));
