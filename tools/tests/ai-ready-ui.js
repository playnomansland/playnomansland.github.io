// Against the AI there is no Fight button: the player presses Ready, as online, and the AI presses Ready 5 s into each
// deploy (AI_READY_MS; ?aiready=ms sets it under ?test, where it is 0 by default), so the looks' "opponent is ready"
// moments (the Forest Glade explorer, the Savanna vultures, the Ashlands dragon) happen against it too.
// Needs `python3 -m http.server 8766` in the repo root.
const { chromium } = require('playwright-core');
const ctx2d = require('./board2d');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PB_CHROME || '/opt/pw-browsers/chromium' });
  const p = await (await ctx2d(b, { viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
  const pb = () => p.evaluate(() => { const x = window.__pb(); return { phase: x.phase, ready: x.ready, round: x.m && x.m.round }; });
  const tip = () => p.locator('.hint2').textContent();
  await p.goto('http://127.0.0.1:8766/?test&aiready=5000'); await sleep(500);
  await p.click('#go'); await sleep(1000);
  // round 1: the package pick holds the AI's ready
  await sleep(5500);
  ok(!(await pb()).ready[1], 'AI not ready while the package is being picked');
  await p.dblclick('[data-pack="0"]'); await sleep(300);
  if (await p.locator('#tower-pick, [data-tower]').count()) { await p.locator('[data-tower]').first().dblclick().catch(() => {}); await sleep(300); }
  await ctx2d.tap(p, 5, 13); await sleep(200);
  ok(await p.locator('#fight').count() === 0, 'no Fight button');
  ok(await p.locator('#ready').count() === 1, 'a Ready button');
  await sleep(2000);
  ok(!(await pb()).ready[1], 'AI not ready 2 s in');
  await sleep(3800);
  let s = await pb();
  ok(s.ready[1] && s.phase === 'deploy', 'AI ready after 5 s, still deploying');
  ok(/Opponent is ready/.test(await tip()), 'the panel says the opponent is ready: ' + await tip());
  await p.click('#ready'); await sleep(300);
  if (await p.locator('#cap-go').count()) { await p.click('#cap-go'); await sleep(300); }
  ok((await pb()).phase === 'battle', 'Ready starts the fight once the AI is ready');
  await p.click('#skip').then(() => p.click('#skip')).catch(() => {}); await sleep(800);
  await p.waitForSelector('#next', { timeout: 120000 }); await p.click('#next'); await sleep(600);
  // round 2: the player is ready first, the fight starts when the AI is
  s = await pb();
  ok(s.phase === 'deploy' && s.round === 2 && !s.ready[0] && !s.ready[1], 'round 2: nobody ready');
  await p.click('#ready'); await sleep(300);
  if (await p.locator('#cap-go').count()) { await p.click('#cap-go'); await sleep(300); }
  s = await pb();
  ok(s.phase === 'deploy' && s.ready[0] && !s.ready[1], 'player ready first: still deploying');
  ok(/You’re ready/.test(await tip()), 'the panel says you are ready (as online): ' + await tip());
  await p.click('#ready'); await sleep(200);
  ok(!(await pb()).ready[0], 'Not ready takes it back');
  await p.click('#ready'); await sleep(200);
  if (await p.locator('#cap-go').count()) { await p.click('#cap-go'); await sleep(200); }
  await p.waitForFunction(() => window.__pb().phase === 'battle', null, { timeout: 7000 }).catch(() => {});
  ok((await pb()).phase === 'battle', 'the fight starts when the AI turns ready');
  await b.close();
  console.log(fails ? `${fails} failed` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
