// Builds design/diorama/battle.html, the battle screen prototype in the Diorama's look, from src/battle.html and
// src/battle.js and the game's own sources (engine, game, referee, art, floors, the 3D board and its scenery).
// Run from anywhere:
//   node design/diorama/build-battle.js                     -> design/diorama/battle.html (loads three.js, the scenery and
//                                                              the music from the repo: serve the repo root and open
//                                                              /design/diorama/battle.html)
//   node design/diorama/build-battle.js --standalone <out>  -> one self-contained page (three.js and the scenery inlined,
//                                                              about 9 MB, no music) to share as a file or an artifact
const fs = require('fs'), path = require('path');
const here = __dirname, root = path.join(here, '..', '..');
const src = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const dataUrl = (buf, type) => 'data:' + type + ';base64,' + Buffer.from(buf).toString('base64');
const args = process.argv.slice(2), standalone = args[0] === '--standalone', out = standalone ? path.resolve(args[1] || 'battle-standalone.html') : path.join(here, 'battle.html');

// the page needs the board's THREE camera, to frame the board around the words (setViewOffset): Render3D hands it out
// as cam3 here only; the game's file is not changed
const r3 = src('render3d.js');
const render3d = r3.replace('camera: cam, info:', 'camera: cam, cam3: camera, info:');
if (render3d === r3) throw new Error('render3d.js: the return line changed; update the cam3 patch in build-battle.js');

const fill = {
  BASE: standalone ? '' : '<base href="../../">', // the repo root: vendor/, models/scenery.bin, audio/
  SHAPES: src('shapes.js'), ENGINE: src('engine.js'), GAME: src('game.js'), REFEREE: src('referee.js'),
  ART: src('art.js'), RENDER2D: src('render2d.js') + '\n' + src('floors.js'), CAMERA3D: src('camera3d.js'),
  DATA: src('demo-units.json'),
  MODELS3D: src('kaykit3d.js') + '\n' + src('models3d.js') + '\n' + src('scenery3d.js'),
  RENDER3D: render3d,
  BATTLE: fs.readFileSync(path.join(here, 'src', 'battle.js'), 'utf8'),
  SCENERY: standalone ? '<script>window.PB_SCENERY = "' + fs.readFileSync(path.join(root, 'models', 'scenery.bin')).toString('base64') + '";</script>' : '',
  IMPORTMAP: '', THREE_URL: './vendor/three.module.min.js',
};
if (standalone) { // three.js as data-URL modules in an import map, as design/diorama/build.js does for the menu mockup
  const core = fs.readFileSync(path.join(root, 'vendor', 'three.core.min.js'), 'utf8');
  const mod = fs.readFileSync(path.join(root, 'vendor', 'three.module.min.js'), 'utf8').split('./three.core.min.js').join('three-core');
  fill.IMPORTMAP = `<script type="importmap">${JSON.stringify({ imports: { three: dataUrl(mod, 'text/javascript'), 'three-core': dataUrl(core, 'text/javascript') } })}</script>`;
  fill.THREE_URL = 'three';
}
const page = fs.readFileSync(path.join(here, 'src', 'battle.html'), 'utf8').replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => {
  if (k in fill) return fill[k];
  throw new Error('not filled: ' + k);
});
// every classic script must parse
page.split('<script>').slice(1).map(s => s.split('</script>')[0]).forEach(s => new Function(s));
fs.writeFileSync(out, page);
console.log('wrote', path.relative(process.cwd(), out) || out, (page.length / 1024 / 1024).toFixed(2), 'MB');
