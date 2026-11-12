// Writes docs/keyword-icons.html: every wave 1 keyword's icon from src/keyword-registry.json in its role colour, at
// three sizes, on the dark card and on saffron, with its name and line. A page to judge the icon set by eye.
// Run: node tools/keyword-sheet.js            (writes the page)
//      node tools/keyword-sheet.js out.png    (also a screenshot, with headless Chromium)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/keyword-registry.json'), 'utf8'));
const KW = reg.keywords, ROLES = reg.roles;
const w1 = Object.keys(KW).filter(k => k[0] !== '_' && KW[k].wave === 1);
const svg = (k, px) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${KW[k].icon || '<rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" stroke-dasharray="3 3"/>'}</svg>`;
const card = (k) => { const r = ROLES[KW[k].role]; return `<div class="k"><div class="big" style="color:${r.color}">${svg(k, 72)}</div>
  <div class="row"><span style="color:${r.color}">${svg(k, 28)}${svg(k, 16)}</span><span class="saf">${svg(k, 28)}${svg(k, 16)}</span></div>
  <b>${KW[k].name}</b><i style="color:${r.color}">${r.name}</i><p>${KW[k].line}</p></div>`; };
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>No Mans Land: keyword icons</title>
<style>body{margin:0;padding:28px;background:#17140F;color:#EEF3F1;font:14px/1.35 system-ui,sans-serif}h1{font-size:22px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.02em}
.sub{color:#B9B2A2;margin:0 0 22px}.g{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}.k{background:#211D16;border:1px solid #3A3327;padding:16px 14px 12px;text-align:center}
.big{height:78px}.row{display:flex;justify-content:center;gap:10px;margin:6px 0 10px}.row span{display:inline-flex;gap:8px;align-items:center;padding:5px 8px}.saf{background:#F2B23A;color:#17140F}
b{display:block;font-size:17px;text-transform:uppercase;letter-spacing:.03em}i{display:block;font-style:normal;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin:2px 0 6px}p{margin:0;color:#B9B2A2;font-size:12.5px}
@media(max-width:900px){.g{grid-template-columns:repeat(3,1fr)}}</style></head><body>
<h1>Keyword icons, wave 1</h1><p class="sub">First drawings from src/keyword-registry.json. Each at 72, 28 and 16 px in its role colour, and in ink on saffron. Role colours are placeholders.</p>
<div class="g">${w1.map(card).join('')}</div></body></html>`;
fs.writeFileSync(path.join(ROOT, 'docs/keyword-icons.html'), html);
console.log('wrote docs/keyword-icons.html (' + w1.filter(k => KW[k].icon).length + ' of ' + w1.length + ' icons drawn)');
const out = process.argv[2];
if (out) (async () => {
  let pw; try { pw = require('playwright-core'); } catch (e) { pw = require('playwright'); }
  const EXE = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(f => fs.existsSync(f));
  const b = await pw.chromium.launch(EXE ? { executablePath: EXE } : {});
  const pg = await b.newPage({ viewport: { width: 1320, height: 800 } });
  await pg.setContent(html); await pg.screenshot({ path: out, fullPage: true }); await b.close(); console.log('wrote', out);
})();
