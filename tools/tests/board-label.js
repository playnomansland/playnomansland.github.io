// The battlefield's label (the board canvas's aria-label) says the rows of the map in play: Standard has zones of
// 7 rows and 4 of no man's land (it used to say 6, the old board's). Needs `python3 -m http.server 8766` in the repo root.
const { chromium } = require('playwright-core');
const ctx2d = require('./board2d');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PB_CHROME || '/opt/pw-browsers/chromium' });
  const p = await (await ctx2d(b, { viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
  await p.goto('http://127.0.0.1:8766/?test'); await sleep(500);
  await p.click('#go'); await sleep(1000);
  const s = await p.evaluate(() => { const x = window.__pb(); return { map: x.m && x.m.map && x.m.map.id, label: document.getElementById('board').getAttribute('aria-label') }; });
  console.log('map:', s.map, '| label:', s.label);
  ok(s.map === 'testgrid', 'a match on the Standard map');
  ok(/bottom seven rows, the enemy zone the top seven, with four rows of no man's land/.test(s.label), 'the label says 7-row zones and 4 rows of no man\'s land');
  await b.close();
  console.log(fails ? `${fails} failed` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
