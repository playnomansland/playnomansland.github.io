// Leader heads: render a model in models/heads/ to PNG, and put a view next to a reference crop.
// Serves the repo itself (no other server needed) and drives models/heads/sheet.html in a headless browser.
//
//   node tools/heads-render.js --src zoe.js --fn ZoeHead --out zoe-sheet.png [--back] [--flat] [--dist 16] [--look 0.2]
//       a contact sheet: 3/4, front, side, (back), silhouette, 64 px
//   node tools/heads-render.js --src zoe.js --fn ZoeHead --out cmp.png --only Front --yaw 0.5 --dist 12 --look 0.3 \
//       --ref models/heads/refs/zoe-reference.png --crop 250,0,590,720
//       one view (yaw in radians: 0 = front, +0.5 turns the face to the viewer's right) next to a crop of the reference
//
// --flat: faceted shading for the whole model (Emile); leave it off for models that set shading per part (Zoe).
// --dist / --look: camera distance and the height it looks at; tune them so the head matches the crop's size.
// Browser: PB_CHROME=<path to chrome> if playwright-core has no browser of its own (same as tools/tests).
let pw; try { pw = require('playwright-core'); } catch (e) { pw = require('playwright'); }
const { chromium } = pw;
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : '1']);
  return acc;
}, []));
if (!args.src || !args.out) { console.log('usage: see the top of tools/heads-render.js'); process.exit(1); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const port = server.address().port;
  const q = new URLSearchParams({ src: args.src, fn: args.fn || '', title: args.title || '', sub: args.sub || '', names: '{}',
    dist: args.dist || '12', look: args.look || '0.2', size: args.size || (args.only ? '480' : '300') });
  for (const k of ['back', 'flat']) if (args[k]) q.set(k, '1');
  if (args.only) q.set('only', args.only);
  if (args.yaw) q.set('yaw', args.yaw);
  const exe = process.env.PB_CHROME;
  const b = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1400, height: 700 } });
  const errors = []; pg.on('pageerror', e => errors.push(String(e)));
  await pg.goto(`http://127.0.0.1:${port}/models/heads/sheet.html?${q}`);
  await pg.waitForFunction('window.__ready', null, { timeout: 30000 }).catch(() => {});
  if (errors.length) { console.error(errors.join('\n')); }
  if (!args.only) {
    await pg.screenshot({ path: args.out, fullPage: true });
  } else {
    const view = await pg.locator('canvas').first().screenshot();
    if (!args.ref) fs.writeFileSync(args.out, view);
    else { // put the reference crop (scaled to 480 high) and the view side by side, on a canvas in the page
      const ref = fs.readFileSync(path.resolve(args.ref)).toString('base64');
      const [cx, cy, cw, ch] = (args.crop || '').split(',').map(Number);
      const png = await pg.evaluate(async ({ ref, view, crop }) => {
        const load = (src) => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
        const a = await load('data:image/png;base64,' + ref), v = await load('data:image/png;base64,' + view);
        const [x, y, w, h] = crop.length === 4 && crop.every(n => !isNaN(n)) ? crop : [0, 0, a.width, a.height];
        const H = 480, W = Math.round(w * H / h);
        const c = document.createElement('canvas'); c.width = W + 490; c.height = H;
        const g = c.getContext('2d'); g.fillStyle = '#EFE6DA'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(a, x, y, w, h, 0, 0, W, H); g.drawImage(v, W + 10, 0, 480, 480);
        return c.toDataURL('image/png').split(',')[1];
      }, { ref, view: view.toString('base64'), crop: [cx, cy, cw, ch] });
      fs.writeFileSync(args.out, Buffer.from(png, 'base64'));
    }
  }
  console.log('wrote', args.out);
  await b.close(); server.close();
})();
