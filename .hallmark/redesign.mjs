import fs from 'node:fs';
let p='dist/styles.css',s=fs.readFileSync(p,'utf8');s=s.replace(/^\/\* Hallmark[\s\S]*?\*\//,`/* Hallmark · shape: Studio Diptych · genre: editorial · theme: brand · redesign: full
 * hero: Stage · nav: edge-aligned · footer: mast · signature: monumental H7 image opposite a service promise
 * axes: dark/high-contrast-serif/cool · posture: committed · contrast: pending · fold: pending · v2.0.0 */`);s+=`
:root { --color-field: var(--color-accent); --color-field-ink: var(--color-accent-ink); }
.site-header { background: var(--color-paper); color: var(--color-ink); border-bottom: 1px solid var(--color-rule); }
.site-header a:hover { color: var(--color-accent); }
.site-header a:active { color: var(--color-ink); }
.site-header :focus-visible { outline-color: var(--color-focus); }
.header-contact { border-color: var(--color-ink); }
.hero { background: var(--color-ink); color: var(--color-paper); padding-block: var(--space-2xl); }
.intro-layout { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-2xl); }
.hero-artwork { grid-column: 1; grid-row: 1; aspect-ratio: 1; }
.intro-copy { grid-column: 2; grid-row: 1; }
.hero h1 { font-size: clamp(2.7rem, 4.5vw, 4.5rem); line-height: 1.2; }
.hero h1 br { display: none; }
.hero .btn { background: var(--color-paper); color: var(--color-ink); border-color: var(--color-paper); }
.hero .btn:hover { background: var(--color-paper-3); }
.hero :focus-visible { outline-color: var(--color-focus-on-ink); }
.hero-artwork::before, .hero-artwork::after { display: none; }
@media(max-width:46rem) {
 .intro-layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-xl); }
 .intro-copy { grid-column:1; grid-row:1; }
 .hero-artwork { grid-column:1; grid-row:2; aspect-ratio: 5 / 4; }
 .hero h1 { font-size: clamp(2.2rem, 10vw, 4.6rem); }
 .mobile-menu summary span { background: var(--color-ink); }
 .mobile-menu nav { background: var(--color-paper); color: var(--color-ink); }
 .mobile-menu summary:hover { background: var(--color-paper-2); }
}
`;fs.writeFileSync(p,s);
for(const f of ['tokens.css','base.css'])fs.renameSync(f,'.hallmark/scaffold-'+f);
