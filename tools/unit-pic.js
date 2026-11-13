// Renders a unit's portrait (img/units/<slug>.png, transparent) from its 3D model (src/models3d.js) in the unit's
// roster colour, with headless Chromium and vendor/three, lit like the 3D board. Built on tools/skin-pic.js.
// Run: node tools/unit-pic.js "Fire Mage" Shiv "War Mammoth"      (unit names from src/default-roster.json; none = all)
//      --frame=full|half|bust   the framing: the whole figure, from the waist up, or head and shoulders
//      --size=384               pixels a side (default 384)
//      --sheet=out.png          also one picture of every unit asked for, in every framing, on the Diorama's dark ground
//      --dry                    write the sheet only, no img/units files
// It prints the units that have no model of their own (Models3D gives them a generic figure).
let pw; try { pw = require('playwright-core'); } catch (e) { pw = require('playwright'); } // (whichever this machine has)
const { chromium } = pw;
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..');
const EXE = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(f => fs.existsSync(f));
const roster = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/default-roster.json'), 'utf8'));
const args = process.argv.slice(2), opt = (k, d) => (args.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1] || d;
const FRAMES = ['full', 'half', 'bust'];
const frame = opt('frame', 'bust'), size = +opt('size', 384), sheet = opt('sheet', ''), dry = args.includes('--dry');
const names = args.filter(a => !a.startsWith('--'));
const units = names.length ? names.map(n => roster.units.find(u => u.name === n)).filter(Boolean) : roster.units;
if (!units.length || !FRAMES.includes(frame)) { console.error('usage: node tools/unit-pic.js [unit names] [--frame=full|half|bust] [--size=384] [--sheet=out.png] [--dry]'); process.exit(1); }
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Where the face is, for the two closer framings: at = [x, y, z] as shares of the model's box (0..1 from its left,
// foot and back to its right, top and front), bust and half = how much of the box's height each picture shows, and
// turn = the camera's turn around the figure (radians; 0 = straight on), halfAt = its own point for the waist-up
// picture (for a beast, whose head is not at the top). A model not listed gets the default.
const FACE = { default: { at: [0.5, 0.78, 0.5], bust: 0.56, half: 0.8, turn: 0.38 },
  wizard: { at: [0.56, 0.63, 0.5], bust: 0.64, half: 0.82, turn: 0.38 }, // a tall hat: the face sits well below the top
  mammoth: { at: [0.5, 0.46, 0.8], bust: 0.62, half: 0.96, halfAt: [0.5, 0.54, 0.6], turn: 0.62 } }; // the head is at the front, under the howdah

const PAGE = `<!doctype html><html><body style="margin:0;background:transparent">
<script>${fs.readFileSync(path.join(ROOT, 'src/models3d.js'), 'utf8')}</script>
<script type="module">
import * as THREE from '/vendor/three.module.min.js';
const U = ${JSON.stringify(units)}, S = ${size}, FACE = ${JSON.stringify(FACE)};
const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
r.setPixelRatio(2); r.setSize(S, S); r.setClearColor(0, 0); r.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
const M = Models3D(THREE);
const small = document.createElement('canvas'); small.width = small.height = S; // the 2x render, scaled down: smoother edges
function shot(u, frame) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#cfe3ff', '#20262a', 1.6));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.2); sun.position.set(-3, 6, -4); scene.add(sun);
  if (frame !== 'full') { const rim = new THREE.DirectionalLight('#bcd6ff', 1.5); rim.position.set(4, 3, 5); scene.add(rim); } // a cool light from behind, to lift the outline
  const kind = M.kindOf(u), p = M.parts(kind), box = new THREE.Box3();
  const mats = { tint: new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.75, metalness: 0.05, color: u.color }),
    team: new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6, metalness: 0.1, color: '#3B86D6' }),
    fixed: new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.7, metalness: 0.1, vertexColors: true }) };
  for (const k of ['tint', 'team', 'fixed']) if (p[k]) { scene.add(new THREE.Mesh(p[k], mats[k])); p[k].computeBoundingBox(); box.union(p[k].boundingBox); }
  const sz = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
  let look, span, turn, lift; // what to look at, how many metres the picture shows, the camera's turn and its height above the target
  if (frame === 'full') { look = mid.clone(); span = Math.max(sz.y, sz.x * 0.9, sz.z * 0.7) * 1.12; turn = 0.35; lift = 0.26; }
  else {
    const f = FACE[kind.split(':')[0]] || FACE.default, at = frame === 'half' && f.halfAt || f.at;
    const face = new THREE.Vector3(box.min.x + sz.x * at[0], box.min.y + sz.y * at[1], box.min.z + sz.z * (1 - at[2]));
    span = sz.y * f[frame]; turn = f.turn; lift = 0.08;
    look = frame === 'bust' || f.halfAt ? face : face.clone().setY(Math.min(face.y, box.max.y - span * 0.47)); // from the waist up: the top of the figure near the top of the picture
  }
  const d = span / 2 / Math.tan(cam.fov * Math.PI / 360);
  cam.position.set(look.x - Math.sin(turn) * d, look.y + lift * d, look.z - Math.cos(turn) * d); cam.lookAt(look);
  r.render(scene, cam);
  const g = small.getContext('2d'); g.clearRect(0, 0, S, S); g.imageSmoothingQuality = 'high'; g.drawImage(r.domElement, 0, 0, S, S);
  return small.toDataURL('image/png');
}
window.shots = (frames) => U.map(u => ({ name: u.name, kind: M.kindOf(u), pics: frames.map(f => shot(u, f)) }));
window.ready = true;
</script></body></html>`;

// the sheet: a row per unit, a column per framing, on the Diorama's dark green
const SHEET = (rows, frames) => `<!doctype html><html><body style="margin:0;background:#16211F;font:600 15px system-ui,sans-serif;color:#E9E3CF">
<div id="s" style="display:inline-grid;grid-template-columns:150px repeat(${frames.length},${size}px);gap:14px;padding:22px;align-items:center">
<div></div>${frames.map((f, i) => `<div style="text-align:center;opacity:.75">${'ABC'[i]}: ${f}</div>`).join('')}
${rows.map(u => `<div>${u.name}</div>` + u.pics.map(p => `<img src="${p}" width="${size}" height="${size}" style="background:radial-gradient(circle at 50% 58%,#2C403C,#1B2826 72%);border-radius:14px">`).join('')).join('')}
</div></body></html>`;

(async () => {
  const srv = http.createServer((q, s) => {
    if (q.url === '/') { s.setHeader('content-type', 'text/html'); return s.end(PAGE); }
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.statusCode = 404; return s.end(); }
    s.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); s.end(fs.readFileSync(f));
  }).listen(8765);
  const b = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const pg = await b.newPage();
    pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
    await pg.goto('http://127.0.0.1:8765/');
    await pg.waitForFunction(() => window.ready, null, { timeout: 30000 });
    const frames = sheet ? FRAMES : [frame];
    const rows = await pg.evaluate((f) => window.shots(f), frames);
    if (!dry) {
      fs.mkdirSync(path.join(ROOT, 'img/units'), { recursive: true });
      for (const u of rows) { const f = path.join(ROOT, 'img/units', slug(u.name) + '.png'); fs.writeFileSync(f, Buffer.from(u.pics[frames.indexOf(frame)].split(',')[1], 'base64')); console.log('wrote', path.relative(ROOT, f)); }
    }
    if (sheet) {
      const sp = await b.newPage({ deviceScaleFactor: 1 });
      await sp.setContent(SHEET(rows, frames)); await sp.waitForTimeout(200);
      await (await sp.$('#s')).screenshot({ path: sheet }); console.log('wrote', sheet);
    }
    const own = new Set(['goblin', 'archer', 'caster', 'soldier', 'brute', 'flier']); // the generic figures kindOf falls back to
    const generic = rows.filter(u => own.has(u.kind));
    if (generic.length) console.log('no model of their own:', generic.map(u => u.name + ' (' + u.kind + ')').join(', '));
  } finally { await b.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
