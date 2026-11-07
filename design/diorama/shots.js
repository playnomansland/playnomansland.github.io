// Screenshots of the built page in given states, saved to design/diorama/screens/<name>.png.
//   node design/diorama/shots.js '[["play","#still,play",1440,900],["phone","#still",390,844,1]]'
// Each entry: [name, address hash, width, height, fullPage?]. States the page understands in its hash:
//   #still (no idle motion: stable shots)   #play (the Play screen)   #music (playlist open)
//   #view=puzzles|rules|units|ranks (as if that menu word were hovered)   #pin (keep that view up)
//   #tier=1..4 and #unit=N (Units view: the tier, and the unit whose sheet is open)   #hover=<piece> (keepYou, vaultFoe, mammoth, u:N...)
//   Play: #multi (Multiplayer open)   #rooms=standard|ranked   #filter (the filter list open)   #on=vs-ai|multi|standard|ranked|r<N>
// The 3D board needs WebGL; in a container without a GPU, Chromium's SwiftShader is slow, hence the long timeouts.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const list = JSON.parse(process.argv[2] || '[["menu","#still",1440,900]]');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const url = 'file://' + path.join(__dirname, 'diorama-menu.html');
  for (const [name, hash, w, h, full] of list) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    p.on('pageerror', e => console.log('page error:', e.message));
    await p.goto(url + hash);
    await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(__dirname, 'screens', name + '.png'), fullPage: !!full, timeout: 120000 });
    await p.close(); console.log('saved screens/' + name + '.png');
  }
  await b.close();
})();
