// The Board setting (2D / 3D in the in-match Settings) and the 3D quality: the Settings side of the 3D board.
// - 3D by default, without the speed meter; ?board=2d starts on 2D; a saved 2D stays 2D; nothing is saved unasked
// - the switch starts and stops the 3D board mid-match (stopping frees its WebGL context) and is saved on this device
// - the 3D quality buttons (shown only on 3D) set the pixel ratio and are saved
// - a lost WebGL context goes back to 2D with a line on the board; the setting stays 3D, and the next load is 3D
// - ?board=3d forces 3D over a saved 2D, with the speed meter
// The game's own fallbacks (quality step-downs, too slow, 3D that couldn't start, boss runs) are in board-fallback.js.
// The 3D board starts once a match does (on a phone the home screen's island has the one WebGL context), so each
// check plays a match against the computer first.
// Needs `python3 -m http.server 8766` in the repo root. Headless Chromium needs software WebGL (the args below).
const { chromium } = require('playwright-core');
const URL = 'http://127.0.0.1:8766/?test';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PB_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let fails = 0;
  const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) fails++; };
  const open = async (init) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage();
    p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
    return p;
  };
  // a saved Board choice, seeded on the first load only (later loads keep what the page saved)
  const seed = (board) => open(`try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('phone-bellum-board', ${JSON.stringify(board)}); sessionStorage.setItem('seeded', '1'); } } catch (e) {}`);
  const is3d = (p) => p.evaluate(() => !!window.__pb().board3d);
  const on3d = (p) => p.waitForFunction(() => window.__pb && window.__pb().board3d, null, { timeout: 20000 });
  const on2d = (p) => p.waitForFunction(() => window.__pb && !window.__pb().board3d, null, { timeout: 20000 });
  const stored = (p) => p.evaluate(() => [localStorage.getItem('phone-bellum-board'), localStorage.getItem('phone-bellum-3d-quality')]);
  const visit = (p) => p.evaluate(() => sessionStorage.getItem('phone-bellum-board'));
  const note = async (p) => (await p.locator('#note3d').isVisible()) ? (await p.locator('#note3d').textContent()) : '';
  const ratio = (p) => p.evaluate(() => window.__pb().board3d.pixelRatio());
  const on2dBoard = async (p) => !(await is3d(p)) && await p.locator('#board').isVisible() && !(await p.locator('.board3d').count());
  // a match against the computer: Play, the first package, the first tower if one is offered
  const vsAI = async (p) => {
    await p.click('#go'); await sleep(600);
    await p.dblclick('[data-pack="0"]'); await sleep(800);
    if (await p.locator('[data-tower]').count()) { await p.locator('[data-tower]').first().dblclick().catch(() => {}); await sleep(300); }
    await p.waitForFunction(() => window.__pb && window.__pb().phase === 'deploy', null, { timeout: 15000 });
  };
  const settings = async (p) => { await p.click('#cog'); await sleep(200); };
  const closeSheet = async (p) => { await p.click('#close'); await sleep(200); };

  // 3D by default, without the meter; nothing saved
  let p = await open();
  await p.goto(URL); await sleep(500); await vsAI(p); await on3d(p);
  check(await p.locator('#board').isHidden() && await p.locator('.board3d canvas').isVisible() && !(await p.locator('.meter3d').count()), '3D board by default, no meter');
  check((await stored(p))[0] === null, 'nothing saved');
  await p.context().close();

  // ?board=2d starts on 2D and saves nothing
  p = await open();
  await p.goto(URL + '&board=2d'); await sleep(500); await vsAI(p); await sleep(800);
  check(await on2dBoard(p), '?board=2d: the 2D board');
  check((await stored(p))[0] === null && await visit(p) === null, '?board=2d: nothing saved');
  await p.context().close();

  // a saved 2D stays 2D; then 3D and back from Settings
  p = await seed('2d');
  await p.goto(URL); await sleep(500); await vsAI(p); await sleep(800);
  check(await on2dBoard(p), 'saved 2D: the 2D board');
  await settings(p);
  check((await p.locator('#sheet-h').textContent()).trim() === 'Settings' && await p.locator('[data-board="2d"][aria-pressed="true"]').isVisible(), 'Settings: Board 2D pressed');
  check(await p.locator('#q3d-bar').isHidden(), 'no 3D quality while on 2D');
  await p.click('[data-board="3d"]'); await on3d(p);
  check(await p.locator('#board').isHidden() && await p.locator('.board3d canvas').isVisible(), '3D on mid-match: the 3D board in place of the canvas');
  check(!(await p.locator('.meter3d').count()), 'no speed meter in the setting');
  check(await p.locator('#q3d-bar').isVisible() && await p.locator('[data-q3d="high"][aria-pressed="true"]').count() === 1, '3D quality shown, high');
  check((await stored(p))[0] === '3d', 'saved: 3d');
  await p.click('[data-q3d="medium"]');
  check(await ratio(p) === 1.5 && (await stored(p))[1] === 'medium' && await p.locator('[data-q3d="medium"][aria-pressed="true"]').count() === 1, 'quality medium: 1.5 pixels per CSS pixel, saved');
  await p.click('[data-q3d="low"]');
  check(await ratio(p) === 1 && (await stored(p))[1] === 'low', 'quality low: 1 pixel per CSS pixel, saved');
  await p.click('[data-q3d="high"]');
  check(await ratio(p) === 2 && (await stored(p))[1] === 'high', 'quality high: 2 pixels per CSS pixel, saved');
  await p.evaluate(() => { window.__gl = document.querySelector('.board3d canvas').getContext('webgl2'); });
  await p.click('[data-board="2d"]'); await on2d(p);
  check(await on2dBoard(p) && await p.locator('#q3d-bar').isHidden(), '3D off: back to the 2D canvas, no 3D quality');
  check(await p.evaluate(() => window.__gl.isContextLost()), 'its WebGL context freed');
  check((await stored(p))[0] === '2d', 'saved: 2d');
  // the 2D board still takes the game's input: a shop pick placed on the canvas
  await closeSheet(p);
  const count = () => p.evaluate(() => { const { m, me } = window.__pb(); return m.armies[me].length; });
  const placed = await count();
  const spot = await p.evaluate(() => { const { m, me } = window.__pb(); const ui = [...document.querySelectorAll('#panel .uc2:not([aria-disabled="true"])')].map(e => +e.dataset.i)[0];
    for (const r of [12, 13, 11]) for (let c = 2; c < 10; c++) if (Game.canPlaceAt(m, me, c, r, ui) && Game.spotFree(m, me, c, r, ui)) return { ui, c, r, f: me === 1 }; });
  check(!!spot, 'a card and a free tile to place it on');
  if (spot) {
    await p.click(`#panel .uc2[data-i="${spot.ui}"]`); await sleep(300);
    const box = await p.locator('#board').boundingBox(), c = spot.f ? 11 - spot.c : spot.c, r = spot.f ? 15 - spot.r : spot.r;
    await p.mouse.click(box.x + (c + 0.5) * box.width / 12, box.y + (r + 0.5) * box.height / 16); await sleep(300);
    if (await p.locator('#close').isVisible()) await closeSheet(p);
    check(await count() > placed, 'the 2D board places squads again');
  }

  // a lost WebGL context: back to 2D with a line, the setting stays 3D
  await settings(p); await p.click('[data-board="3d"]'); await on3d(p); await closeSheet(p);
  await p.evaluate(() => document.querySelector('.board3d canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await on2d(p);
  check(/stopped/.test(await note(p)) && await p.locator('#board').isVisible(), `context lost -> 2D: "${await note(p)}"`);
  check((await stored(p))[0] === '3d' && await visit(p) !== '2d', 'the setting stays 3D, nothing saved for this visit');
  await p.click('#note3d');
  check(!(await note(p)), 'a tap closes the line');
  // saved 3D: the next load's match is 3D
  await p.reload(); await sleep(500); await vsAI(p); await on3d(p);
  check(await is3d(p) && await ratio(p) === 2, 'saved 3D: the 3D board starts, at the saved quality (high)');
  await p.context().close();

  // ?board=3d forces 3D over a saved 2D, with the speed meter; nothing saved
  p = await seed('2d');
  await p.goto(URL + '&board=3d'); await sleep(500); await vsAI(p); await on3d(p);
  check(await p.locator('.meter3d').isVisible(), '?board=3d: 3D with the speed meter');
  check((await stored(p))[0] === '2d', '?board=3d: the saved 2D is left alone');
  await p.context().close();

  await b.close();
  console.log(fails ? `${fails} FAILED` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
