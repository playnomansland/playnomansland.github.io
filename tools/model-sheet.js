// Renders a row of units' 3D models (src/models3d.js) to one PNG, each in its roster colour, lit like the 3D board:
// for comparing silhouettes side by side. Headless Chromium and vendor/three, as tools/skin-pic.js.
// Run: node tools/model-sheet.js out.png "Fire Mage" "Flame Wizard" ...   (unit names from src/default-roster.json)
//      node tools/model-sheet.js out.png wizards                          (the eight wizards)
//      add --dark for black figures on a light ground (the silhouette alone)
let pw; try { pw = require('playwright-core'); } catch (e) { pw = require('playwright'); }
const { chromium } = pw;
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..');
const EXE = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(f => fs.existsSync(f));
const roster = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/default-roster.json'), 'utf8'));
const args = process.argv.slice(2), dark = args.includes('--dark');
const out = args[0];
let names = args.slice(1).filter(a => a !== '--dark');
if (names[0] === 'wizards') names = ['Fire Mage', 'Leaf Wizard', 'Earth Wizard', 'Flame Wizard', 'Steel Wizard', 'Slime Wizard', 'Water Mage', 'Frost Wizard'];
const units = names.map(n => roster.units.find(u => u.name === n)).filter(Boolean);
if (!out || !units.length) { console.error('usage: node tools/model-sheet.js out.png <unit names | wizards> [--dark]'); process.exit(1); }

const PAGE = `<!doctype html><html><body style="margin:0;background:${dark ? '#EDE6D6' : '#22302F'}">
<script>${fs.readFileSync(path.join(ROOT, 'src/models3d.js'), 'utf8')}</script>
<script type="module">
import * as THREE from '/vendor/three.module.min.js';
const U = ${JSON.stringify(units)}, DARK = ${dark}, GAP = 2.1, W = Math.round(190 * U.length), H = 440;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H); r.setClearColor(DARK ? '#EDE6D6' : '#22302F', 1); r.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#cfe3ff', '#20262a', 1.6));
const sun = new THREE.DirectionalLight('#fff3dc', 2.2); sun.position.set(-3, 6, -4); scene.add(sun);
const M = Models3D(THREE);
U.forEach((u, i) => {
  const kind = M.kindOf(u), p = M.parts(kind), x = (i - (U.length - 1) / 2) * GAP;
  const mat = (o) => DARK ? new THREE.MeshBasicMaterial({ color: '#17140F' }) : new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.75, metalness: 0.05, ...o });
  const mats = { tint: mat({ color: u.color }), team: mat({ color: '#3B86D6' }), fixed: mat({ vertexColors: true }) };
  for (const k of ['tint', 'team', 'fixed']) if (p[k]) { const m = new THREE.Mesh(p[k], mats[k]); m.position.x = -x; m.rotation.y = -0.45; scene.add(m); }
});
const half = U.length * GAP / 2, cam = new THREE.OrthographicCamera(-half, half, half * H / W, -half * H / W, 0.1, 100);
cam.position.set(0, 4.2, -14); cam.lookAt(0, 1.55, 0);
r.render(scene, cam);
window.tris = U.map(u => { const p = M.parts(M.kindOf(u)); return u.name + ' ' + ['tint', 'team', 'fixed'].reduce((n, k) => n + (p[k] ? p[k].getAttribute('position').count / 3 : 0), 0); });
window.done = r.domElement.toDataURL('image/png');
</script></body></html>`;

(async () => {
  const srv = http.createServer((q, s) => {
    if (q.url === '/') { s.setHeader('content-type', 'text/html'); return s.end(PAGE); }
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.statusCode = 404; return s.end(); }
    s.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); s.end(fs.readFileSync(f));
  }).listen(8763);
  const b = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const pg = await b.newPage();
    pg.on('pageerror', e => console.error('PAGE ERROR', e.message));
    await pg.goto('http://127.0.0.1:8763/');
    const url = await pg.waitForFunction(() => window.done, null, { timeout: 30000 }).then(h => h.jsonValue());
    fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
    console.log('triangles:', (await pg.evaluate(() => window.tris)).join(', '));
    console.log('wrote', out);
  } finally { await b.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
