import fs from 'node:fs';
let h=fs.readFileSync('dist/index.html','utf8');for(const name of ['business-owner','working-together']){const b=fs.readFileSync(`dist/images/${name}.png`),w=b.readUInt32BE(16),v=b.readUInt32BE(20);h=h.replace(new RegExp(`(src="./images/${name}.png" width=")\\d+(" height=")\\d+`),`$1${w}$2${v}`);console.log(name,w,v);}fs.writeFileSync('dist/index.html',h);
fs.appendFileSync('dist/styles.css','\n@media (min-width: 46.01rem) { .services-visual img { object-position: center top; } }\n');
