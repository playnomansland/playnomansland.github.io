// Watch one Mommy fight in a headless browser and save screenshots at exact fight times (frames are stepped by hand:
// requestAnimationFrame is held, so a slow machine doesn't change what a shot shows). For looking at how her attacks
// read on both boards. Needs the page served from the repo root:  python3 -m http.server 18795 --bind 127.0.0.1
//   node tools/boss/watch.js <name> <query> <width> <height> <round> <plan>      shots go to ./shots/<name>-t<time>.png
//   e.g.  BOARD=2d DSF=2 CLIP=190,45,600,800 TIMES=4.2,5.8,6.8 node tools/boss/watch.js m2d ui=diorama 1440 900 1 far
//         STEP=100 TIMES=4.3,5.9,7.2 node tools/boss/watch.js pm3d ui=diorama 1280 760 1 far      (3D, the PC layout)
//         STEP=100 TIMES=4.3 node tools/boss/watch.js phone x=1 390 844 1 hold                    (3D, a phone)
// env: BOARD=2d|3d, DSF (pixel ratio), CLIP=x,y,w,h, TIMES (fight seconds), STEP (ms a frame, up to 100), RULES=1 and
// DEPLOY=1 (also shoot the rules sheet and the deploy screen). Plans: PLANS below (hold: Goblins hold her; far: nobody
// in her reach, so she throws nests). It signs in as a made-up developer account; the game server refuses it, which
// the page shrugs off.
const { chromium } = require('playwright');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const [name = 'pc', query = 'ui=diorama', W = '1440', H = '900', round = '1', plan = 'hold'] = process.argv.slice(2);
const PLANS = {
  hold: [['Goblin Swarm', 2, 10], ['Goblin Swarm', 1, 10], ['Wisps', 10, 10], ['Skeleton Archers', 9, 10]],
  far: [['Sniper', 1, 14], ['Sniper', 10, 14], ['Skeleton Archers', 9, 13], ['Skeleton Archers', 10, 13], ['Skeleton Archers', 8, 13]],
  brute: [['Brute', 8, 10], ['Brute', 9, 10], ['Wisps', 1, 10], ['Skeleton Archers', 10, 11], ['Sniper', 2, 12]],
  heavy: [['Goblin Swarm', 5, 10], ['Skeleton Archers', 6, 10], ['Wisps', 10, 10], ['Sniper', 1, 11]],
  acid: [['Brute', 5, 10, 0, -4], ['Brute', 6, 10, 0, -4], ['Steel Wizard', 5, 11], ['Skeleton Archers', 10, 11]], // (round 2 or 4: someone in her reach for the heavy, acid bite)
};
(async () => {
  require('fs').mkdirSync('shots', { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: +(process.env.DSF || 1) });
  await ctx.addInitScript((bd) => { try {
    if (bd) localStorage.setItem('phone-bellum-board', bd);
    localStorage.setItem('phonebellum.account.v1', JSON.stringify({ id: 'p0123456789abcdef', session: 'a'.repeat(64), tag: 'DevTest', dev: true, google: true, skins: [], titles: [], puzzles: [] }));
    localStorage.setItem('pb-stay', '1'); localStorage.setItem('pb-help-off', '1');
  } catch (e) {}
    const real = window.requestAnimationFrame.bind(window); let q = [], ts = 0, id = 0;
    window.__manual = false;
    window.requestAnimationFrame = (cb) => { if (!window.__manual) return real((t) => { ts = t; cb(t); }); q.push(cb); return ++id; };
    window.__frame = (ms) => { const run = q; q = []; ts += ms; for (const cb of run) cb(ts); return run.length; };
  }, process.env.BOARD || '');
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  await p.goto(`http://127.0.0.1:18795/?test&mommy&${query}`); await sleep(3500);
  const st = await p.evaluate(() => { const s = window.__pb && window.__pb(); return s ? { phase: s.phase, boss: !!(s.m && s.m.boss), cls: document.documentElement.className } : null; });
  console.log('state', JSON.stringify(st));
  if (process.env.RULES) await p.screenshot({ path: `shots/${name}-rules.png` });
  await p.click('#sheet #close').catch(() => {}); await sleep(400);
  const placed = await p.evaluate(([round, list]) => {
    const { m } = window.__pb(), ix = (n) => m.units.findIndex(u => u.name === n);
    m.round = round; m.gold[0] = 5000; m.extraDeploys[0] = 9;
    const r = list.map(([n, c, rw, dc, dr]) => { const sq = Game.place(m, 0, ix(n), c, rw); if (sq && dc != null) Game.setAim(m, 0, sq.id, dc, dr); return !!sq; }); // (dc, dr: a direction arrow, in tiles)
    window.__pbRedraw(); return r;
  }, [+round, PLANS[plan]]);
  console.log('placed', placed);
  await sleep(500);
  const shot = (tag) => p.screenshot({ path: `shots/${name}-${tag}.png`, timeout: 180000, ...(process.env.CLIP ? { clip: Object.fromEntries(process.env.CLIP.split(',').map((v, i) => [['x', 'y', 'width', 'height'][i], +v])) } : {}) }).catch(e => console.log('shot failed', e.message.slice(0, 80)));
  if (process.env.DEPLOY) await shot('deploy');
  const btn = await p.$('#fight') || await p.$('#ready');
  if (!btn) { console.log('no fight button'); await b.close(); return; }
  await btn.click(); await sleep(300);
  if (await p.$('#cap-go')) await p.click('#cap-go');
  await sleep(600);
  await p.evaluate(() => { window.__manual = true; }); await sleep(300);
  for (let k = 0; k < 40; k++) { const t = await p.evaluate(() => { for (let i = 0; i < 20; i++) window.__frame(25); const s = window.__pb(); return s.bt ? s.bt.time() : -1; }); if (t > 0.6) break; await sleep(250); } // (the 3D fight starts a moment late)
  for (const at of (process.env.TIMES || '2,5,8').split(',').map(Number)) {
    const info = await p.evaluate(([at, STEP]) => { let n = 0; const s = () => window.__pb(); while (s().phase === 'battle' && s().bt && s().bt.time() < at && n < 4000) { window.__frame(STEP); n++; } const mom = s().bt && s().bt.bodies.find(b => b.u.boss); return { phase: s().phase, t: s().bt ? +s().bt.time().toFixed(2) : null, n, ev: mom && mom.ev ? mom.ev.slice(-3).map(e => e.k + '@' + e.t.toFixed(1)) : null }; }, [at, +(process.env.STEP || 25)]);
    await shot('t' + String(at).replace('.', '_'));
    console.log('shot', at, JSON.stringify(info));
  }
  await b.close();
})();
