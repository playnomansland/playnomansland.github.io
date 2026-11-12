// Writes docs/keyword-icons.html: every wave 1 keyword's icon from src/keyword-registry.json in its role colour, at
// three sizes, on the dark card and on saffron, with its name and line. A page to judge the icon set by eye.
// Run: node tools/keyword-sheet.js            (writes the page)
//      node tools/keyword-sheet.js out.png    (also a screenshot, with headless Chromium)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/keyword-registry.json'), 'utf8'));
const KW = reg.keywords, ROLES = reg.roles;
const w1 = Object.keys(KW).filter(k => k[0] !== '_' && KW[k].wave === 1);
const ROLE_IDS = Object.keys(ROLES).filter(k => k[0] !== '_');
const rolesOf = (k) => [].concat(KW[k].role);
const box = (px, inner, style = '') => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="${style}">${inner}</svg>`;
// the bare glyph (for the smallest sizes), and the glyph in ink on its role's plate
const glyph = (k, px) => box(px, KW[k].icon || '');
const plate = (role, k, px) => { const r = ROLES[role], g = r.glyph; return box(px, `<path d="${r.plate}" fill="${r.color}"/>` + (k ? `<g transform="translate(12 ${g.y}) scale(${g.scale}) translate(-12 -12)" color="#17140F" fill="#17140F">${KW[k].icon}</g>` : '')); };
const card = (k, role) => { const r = ROLES[role]; return `<div class="k"><div class="big">${plate(role, k, 76)}</div>
  <div class="row">${plate(role, k, 34)}${plate(role, k, 22)}<span style="color:${r.color};display:inline-flex;gap:7px;align-items:center">${glyph(k, 22)}${glyph(k, 14)}</span></div>
  <b>${KW[k].name}</b><i style="color:${r.color}">${r.name}</i><p>${KW[k].line}</p></div>`; };
const roleCard = (role) => { const r = ROLES[role]; return `<div class="k"><div class="big">${plate(role, null, 76)}</div><div class="row">${plate(role, null, 34)}${plate(role, null, 22)}</div><b>${r.name}</b><i style="color:${r.color}">role</i><p>${r.line}</p></div>`; };
const A = reg.armor, armorCard = (a) => `<div class="k"><div class="big" style="color:${A.color}">${box(76, A[a].icon)}</div><div class="row" style="color:${A.color}">${box(34, A[a].icon)}${box(22, A[a].icon)}${box(14, A[a].icon)}</div><b>${A[a].name}</b><i style="color:${A.color}">armor weight</i></div>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>No Mans Land: keyword icons</title>
<style>body{margin:0;padding:28px;background:#17140F;color:#EEF3F1;font:14px/1.35 system-ui,sans-serif}h1{font-size:22px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.02em}h2{font-size:15px;margin:26px 0 4px;text-transform:uppercase;letter-spacing:.08em;color:#F2B23A}
.sub{color:#B9B2A2;margin:0 0 14px;max-width:900px}.g{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}.k{background:#211D16;border:1px solid #3A3327;padding:16px 12px 12px;text-align:center}
.big{height:82px}.row{display:flex;justify-content:center;align-items:center;gap:9px;margin:6px 0 10px;min-height:34px}
b{display:block;font-size:16px;text-transform:uppercase;letter-spacing:.03em}i{display:block;font-style:normal;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin:2px 0 6px}p{margin:0;color:#B9B2A2;font-size:12.5px}
@media(max-width:900px){.g{grid-template-columns:repeat(3,1fr)}}</style></head><body>
<h1>Keyword icons, wave 1</h1><p class="sub">Drawn from src/keyword-registry.json. A keyword is a glyph; its role is the plate behind it (shape and colour). Shown at 76, 34 and 22 px on the plate, then the bare glyph at 22 and 14 px for the smallest uses. Colours are placeholders.</p>
<h2>The six roles: a plate each</h2><p class="sub">A plate with no glyph is the role alone. A unit that is simply a Guard (a tank) shows the plain shield.</p>
<div class="g">${ROLE_IDS.map(roleCard).join('')}</div>
<h2>Keywords</h2><p class="sub">Teleport appears twice: Control when it moves enemies, Support when it moves your own.</p>
<div class="g">${w1.flatMap(k => rolesOf(k).map(r => card(k, r))).join('')}</div>
<h2>Armor weight: a separate set</h2><p class="sub">A meter of plates in steel grey, never on a role plate, so it reads as a different kind of symbol.</p>
<div class="g">${Object.keys(A).filter(k => k[0] !== '_' && k !== 'color').map(armorCard).join('')}</div></body></html>`;
fs.writeFileSync(path.join(ROOT, 'docs/keyword-icons.html'), html);
console.log('wrote docs/keyword-icons.html (' + w1.filter(k => KW[k].icon).length + ' of ' + w1.length + ' keyword icons drawn)');
const out = process.argv[2];
if (out) (async () => {
  let pw; try { pw = require('playwright-core'); } catch (e) { pw = require('playwright'); }
  const EXE = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(f => fs.existsSync(f));
  const b = await pw.chromium.launch(EXE ? { executablePath: EXE } : {});
  const pg = await b.newPage({ viewport: { width: 1320, height: 900 } });
  await pg.setContent(html); await pg.screenshot({ path: out, fullPage: true }); await b.close(); console.log('wrote', out);
})();
