import fs from 'node:fs';
let h=fs.readFileSync('dist/index.html','utf8').replace('Создадим сайт.<br>Останемся рядом.','Создадим сайт. <br>Останемся рядом.');fs.writeFileSync('dist/index.html',h);
fs.appendFileSync('dist/styles.css',`
.services { padding-block: var(--section-gap-s); }
.section-heading { border: 0; padding-top: 0; }
.services-body { grid-template-columns: minmax(0, 1fr); gap: var(--space-2xl); }
.services-body .service-ledger { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--gap-columns); border: 0; }
.services-body .service-ledger > div { padding: var(--space-xl); background: var(--color-paper-2); border: 0; min-height: 280px; }
.services-body .service-ledger dt { font-size: var(--text-service); }
.services-visual { grid-row: 2; aspect-ratio: 3.8; }
.care { background: var(--color-field); color: var(--color-field-ink); }
.care-bottom > p:last-child { color: var(--color-field-ink); }
.care-graphic-outer, .care-graphic-seven, .care-graphic-guide { stroke: var(--color-field-ink); }
.care-layout { grid-template-columns: minmax(0,5fr) minmax(0,7fr); }
.care-copy { grid-column:2; grid-row:1; }
.care-graphic { grid-column:1; grid-row:1; justify-self:start; }
.task-picker { grid-template-columns: minmax(0,1fr); gap: var(--space-xl); }
.task-options { display:grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap:var(--gap-columns); }
.task-options label, .task-options > div:last-child label { border-bottom:1px solid var(--color-rule-2); }
.task-result { min-height:280px; padding:var(--space-xl); }
.task-result h3 { font-size:var(--text-section); }
.faq-layout { grid-template-columns:minmax(0,1fr); gap:var(--space-2xl); }
.faq-list { margin-left:25%; }
.contact { background:var(--color-ink); color:var(--color-paper); }
.contact-intro .form-notice, .field label span, .form-status { color:var(--color-on-ink-muted); }
.contact :focus-visible { outline-color:var(--color-focus-on-ink); }
.contact .btn { border-color:var(--color-paper); background:var(--color-paper); color:var(--color-ink); }
.contact .btn:hover { background:var(--color-paper-3); }
.footer-inner { flex-wrap:wrap; }
.site-footer .brand { width:100%; }
.site-footer .brand-name { font-size:clamp(2rem,5vw,4rem); }
.site-footer .brand-mark { width:72px; height:72px; }
.site-footer .brand-mark svg { width:64px; height:64px; }
@media(max-width:60rem) {
 .services-body .service-ledger > div { display:block; }
 .services-body .service-ledger dd { margin-top:var(--space-lg); }
 .care-layout { grid-template-columns:minmax(0,1fr) minmax(0,1fr); }
}
@media(max-width:46rem) {
 .services-body .service-ledger { grid-template-columns:minmax(0,1fr); }
 .services-body .service-ledger > div { padding:var(--space-lg); }
 .services-visual { aspect-ratio:4 / 3; }
 .care-layout { grid-template-columns:minmax(0,1fr); }
 .care-copy { grid-column:1; grid-row:1; }
 .care-graphic { grid-column:1; grid-row:2; justify-self:center; }
 .task-options { grid-template-columns:minmax(0,1fr); gap:0; }
 .task-result h3 { font-size:1.8rem; }
 .faq-list { margin-left:0; }
}
`);
