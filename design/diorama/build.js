// Builds diorama-menu.html (one self-contained page) from src/menu.html.
// Inlines: three.js from vendor/ (as data-URL modules in an import map), the game's own src/kaykit3d.js + src/models3d.js,
// the unit roster and skill names from src/default-roster.json, img/title.png, src/base.css and Chakra Petch Bold.
// Run from anywhere: node design/diorama/build.js
const fs = require('fs'), path = require('path');
const here = __dirname, root = path.join(here, '..', '..');
const fromRoot = (p) => fs.readFileSync(path.join(root, p));
const fromHere = (p) => fs.readFileSync(path.join(here, p));
const dataUrl = (buf, type) => 'data:' + type + ';base64,' + Buffer.from(buf).toString('base64');

const core = fromRoot('vendor/three.core.min.js').toString();
const mod = fromRoot('vendor/three.module.min.js').toString().split('./three.core.min.js').join('three-core');
const roster = JSON.parse(fromRoot('src/default-roster.json'));
const keep = ['name', 'cost', 'hp', 'hit', 'aps', 'range', 'speed', 'bodies', 'splash', 'defense', 'defVal', 'skills', 'color', 'shape', 'minRange'];

const fill = {
  THREE_CORE: dataUrl(core, 'text/javascript'),
  THREE_MOD: dataUrl(mod, 'text/javascript'),
  MODELS3D: fromRoot('src/kaykit3d.js').toString() + '\n' + fromRoot('src/models3d.js').toString(),
  ROSTER: JSON.stringify({ units: roster.units.map(u => Object.fromEntries(keep.map(k => [k, u[k]]))), skills: Object.fromEntries(roster.skills.map(s => [s.id, s.name])) }),
  BASECSS: fromHere('src/base.css').toString(),
  CHAKRA_BOLD: dataUrl(fromHere('fonts/ChakraPetch-Bold.ttf'), 'font/ttf'),
  TITLE: dataUrl(fromRoot('img/title.png'), 'image/png'),
};
const out = fromHere('src/menu.html').toString().replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => {
  if (k in fill) return fill[k];
  console.warn('not filled:', k); return m;
});
fs.writeFileSync(path.join(here, 'diorama-menu.html'), out);
console.log('wrote design/diorama/diorama-menu.html', (out.length / 1024 / 1024).toFixed(2), 'MB');
