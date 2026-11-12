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
// the bare glyph leads (the default); the plate is shown once, small, as the sparing extra
const card = (k, role) => { const r = ROLES[role]; return `<div class="k"><div class="big" style="color:${r.color}">${glyph(k, 76)}</div>
  <div class="row"><span style="color:${r.color};display:inline-flex;gap:9px;align-items:center">${glyph(k, 30)}${glyph(k, 18)}</span><span class="pl">${plate(role, k, 30)}</span></div>
  <b>${KW[k].name}</b><i style="color:${r.color}">${r.name}</i><p>${KW[k].line}</p></div>`; };
const roleCard = (role) => { const r = ROLES[role]; return `<div class="k"><div class="big">${plate(role, null, 60)}</div><b>${r.name}</b><i style="color:${r.color}">role</i><p>${r.line}</p></div>`; };
const A = reg.armor, AIDS = Object.keys(A).filter(k => k[0] !== '_' && k !== 'color');
const sizes = (inner, col) => `<div class="big" style="color:${col}">${box(76, inner)}</div><div class="row" style="color:${col}">${box(30, inner)}${box(18, inner)}</div>`;
const armorCard = (a) => `<div class="k">${sizes(A[a].icon, A.color)}<b>${A[a].name}</b><i style="color:${A.color}">armor weight</i></div>`;
// candidates: the registry's icon (A) beside each of its alts (B, C ...)
const cand = (k) => [KW[k].icon, ...(KW[k].alts || [])].map((ic, i) => `<div class="k">${sizes(ic, ROLES[rolesOf(k)[0]].color)}<b>${KW[k].name} ${'ABCD'[i]}</b></div>`).join('');
const armorRow = (i) => `<div class="k wide"><div class="strip" style="color:${A.color}">${AIDS.map(a => box(54, i ? A[a].alts[i - 1] : A[a].icon)).join('')}</div><div class="strip" style="color:${A.color}">${AIDS.map(a => box(20, i ? A[a].alts[i - 1] : A[a].icon)).join('')}</div><b>Armor ${'ABCD'[i]}</b><p>none, light, medium, heavy, fortified</p></div>`;
const withAlts = w1.filter(k => (KW[k].alts || []).length);
// an idea, drawn from the keywords' own icons: Splash with the weapon that delivers it, striking or aiming at the ring.
// wide = the weapon turned to point right, beside the ring (48 by 24); compact = the weapon small at the lower left, its tip on the ring (24 by 24)
const wide = (wk) => `<g transform="rotate(45 12 12)">${KW[wk].icon}</g><g transform="translate(25 0)">${KW.splash.icon}</g>`;
const compact = (wk) => `<g transform="translate(0 10.6) scale(.56)">${KW[wk].icon}</g><g transform="translate(8.4 0) scale(.65)">${KW.splash.icon}</g>`;
const wbox = (h, inner) => `<svg width="${h * 49 / 24}" height="${h}" viewBox="0 0 49 24" fill="currentColor" aria-hidden="true">${inner}</svg>`;
const combo = (wk, label) => { const c = ROLES.damage.color; return `<div class="k wide"><div class="strip" style="color:${c};align-items:center">${wbox(64, wide(wk))}${wbox(30, wide(wk))}${wbox(18, wide(wk))}<span style="width:26px"></span>${box(64, compact(wk))}${box(30, compact(wk))}${box(18, compact(wk))}</div><b>${label}</b><p>wide on the left, compact on the right</p></div>`; };
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>No Mans Land: keyword icons</title>
<style>body{margin:0;padding:28px;background:#17140F;color:#EEF3F1;font:14px/1.35 system-ui,sans-serif}h1{font-size:22px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.02em}h2{font-size:15px;margin:26px 0 4px;text-transform:uppercase;letter-spacing:.08em;color:#F2B23A}
.sub{color:#B9B2A2;margin:0 0 14px;max-width:900px}.g{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}.k{background:#211D16;border:1px solid #3A3327;padding:16px 12px 12px;text-align:center}
.big{height:82px;display:flex;align-items:center;justify-content:center}.pl{opacity:.9;margin-left:8px;padding-left:12px;border-left:1px solid #3A3327;display:inline-flex}.wide{grid-column:span 3}.strip{display:flex;justify-content:center;gap:16px;margin:4px 0 10px}.row{display:flex;justify-content:center;align-items:center;gap:9px;margin:6px 0 10px;min-height:34px}
b{display:block;font-size:16px;text-transform:uppercase;letter-spacing:.03em}i{display:block;font-style:normal;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin:2px 0 6px}p{margin:0;color:#B9B2A2;font-size:12.5px}
@media(max-width:900px){.g{grid-template-columns:repeat(3,1fr)}}</style></head><body>
<h1>Keyword icons, wave 1</h1><p class="sub">Drawn from src/keyword-registry.json. The bare glyph in its role's colour is the default, at 76, 30 and 18 px. The small plate on the right of each row is the sparing extra. Colours are placeholders.</p>
${withAlts.length ? `<h2>To choose between</h2><p class="sub">Candidates for the ones being redone. A is what the registry uses now.</p>
<div class="g">${withAlts.map(cand).join('')}</div>` : ''}
<h2>Idea: Splash with its weapon</h2><p class="sub">The sword or the arrow, striking or aiming at the Splash ring. Built from the keywords' own icons, so it follows them when they change.</p>
<div class="g">${combo('strike', 'Melee splash')}${combo('shoot', 'Ranged splash')}</div>
<h2>Keywords</h2><p class="sub">Teleport appears twice: Control when it moves enemies, Support when it moves your own.</p>
<div class="g">${w1.flatMap(k => rolesOf(k).map(r => card(k, r))).join('')}</div>
<h2>Armor weight: a separate set</h2><p class="sub">Steel grey, never on a role plate.</p>
<div class="g">${AIDS.map(armorCard).join('')}</div>
<h2>Levels: an idea for later</h2><p class="sub">Stacked chevrons for a squad's level. Not decided.</p>
<div class="g">${Object.keys(reg.levels).filter(k => k[0] !== '_' && k !== 'color').map(l => `<div class="k">${sizes(reg.levels[l].icon, reg.levels.color)}<b>${reg.levels[l].name}</b></div>`).join('')}</div>
<h2>The six role plates</h2><p class="sub">Kept for the few places a plate is wanted. A plate with no glyph is the role alone.</p>
<div class="g">${ROLE_IDS.map(roleCard).join('')}</div></body></html>`;
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
