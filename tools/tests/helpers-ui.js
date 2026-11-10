// Helpers (2026-11-10): the yellow notes of a first game against the computer on a PC (src/site-template.html, HELP_TIPS).
//  - one at a time, in the order the game brings things up: your start, buy, place, ready, the fight, the result, your
//    leader, more units, your tower, the ?; each points at its thing and never shows twice
//  - Got it puts one away; "Turn off helpers" switches them off (and says Settings has them); Settings' Helpers
//    (the menu's and the match's) switches them, and On starts them over
//  - a whole game finished: they're done; a device that did the old tutorial: off; a puzzle: none
// Needs the game on port 8766 (python3 -m http.server 8766 --bind 127.0.0.1). Runs on the 2D board, so it's quick.
const { chromium } = require('playwright-core');
let fails = 0; const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
const URL = 'http://127.0.0.1:8766/index.html?ui=diorama&test&board=2d#still';
(async () => {
  const b = await chromium.launch();
  const open = async (init) => { const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    p.on('pageerror', e => { if (/gis is not defined/.test(e.message)) return; console.log('page error:', e.message); fails++; });
    if (init) await p.addInitScript(init);
    await p.goto(URL); await p.waitForFunction(() => window.__dio && window.__dio.ready, null, { timeout: 60000 }); await p.waitForTimeout(500); return p; };
  const note = (p) => p.evaluate(() => { const e = document.getElementById('helper'); return e.hidden || e.style.visibility === 'hidden' ? '' : e.querySelector('b').textContent; });
  const wait = (p, head, ms = 6000) => p.waitForFunction((h) => { const e = document.getElementById('helper'); return (e.hidden || e.style.visibility === 'hidden' ? '' : e.querySelector('b').textContent) === h; }, head, { timeout: ms }).then(() => true, async () => { console.log('     (the note was: ' + JSON.stringify(await note(p)) + ', ' + await p.evaluate(() => { const s = window.__pb(); return s.phase + ' r' + s.m.round + ' gold ' + s.m.gold[s.me] + ' pick ' + !document.getElementById('pick').hidden + ' seen ' + localStorage.getItem('pb-helpers'); }) + ')'); return false; });
  const js = (p, sel) => p.evaluate((s) => { const x = document.querySelector(s); if (x) x.click(); return !!x; }, sel);
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pb-helpers') || 'null'));
  // the note's tail is on what it's about: the box sits beside the target, on screen
  const beside = (p, sel) => p.evaluate((s) => { const e = document.getElementById('helper').getBoundingClientRect(), t = document.querySelector(s).getBoundingClientRect();
    const apart = e.right <= t.left + 2 || e.left >= t.right - 2 || e.bottom <= t.top + 2 || e.top >= t.bottom - 2, near = Math.max(t.left - e.right, e.left - t.right, t.top - e.bottom, e.top - t.bottom) < 40;
    return apart && near && e.left >= 0 && e.top >= 0 && e.right <= innerWidth && e.bottom <= innerHeight; }, sel);
  const offReady = (p) => p.evaluate(() => { const e = document.getElementById('helper').getBoundingClientRect(), g = document.getElementById('ready'); if (!g) return true; const t = g.getBoundingClientRect();
    return e.right <= t.left || e.left >= t.right || e.bottom <= t.top || e.top >= t.bottom; });
  const freeTile = (p) => p.evaluate(() => { const { m, me } = window.__pb(), cv = document.getElementById('board').getBoundingClientRect();
    for (let r = Game.ROWS - 3; r >= 0; r--) for (let c = 3; c < Game.COLS - 3; c++) if (Game.inZone(me, r) && Game.canPlaceAt(m, me, c, r) && !Game.occupied(m, me, c, r)) return [cv.left + (c + 0.5) * cv.width / Game.COLS, cv.top + (r + 0.5) * cv.height / Game.ROWS];
    return null; });
  const timerOff = async (p) => { await p.click('#play-back'); await p.click('#dio .acct button:nth-of-type(3)'); await p.click('[data-set="tm|0"]'); };
  const pick = async (p) => { await js(p, '#pick .opt:not([disabled])'); await p.waitForTimeout(150); await js(p, '#pick-go'); await p.waitForTimeout(500); };
  const buy = async (p) => { await p.click('#panel .uc2[aria-disabled="false"]'); await p.waitForTimeout(250); const t = await freeTile(p); await p.mouse.click(t[0], t[1]); await p.waitForTimeout(400); };
  const fight = async (p) => { if (await p.evaluate(() => !document.getElementById('sheet-back').hidden)) { await js(p, '#close'); await p.waitForTimeout(200); } await js(p, '#ready'); await p.waitForTimeout(150); await js(p, '#cap-go'); /* (over the gold cap: Ready anyway) */ await p.waitForFunction(() => window.__pb().phase === 'battle', null, { timeout: 15000 }); };
  const toResult = async (p) => { await js(p, '#skip'); await p.waitForFunction(() => ['result', 'end'].includes(window.__pb().phase), null, { timeout: 30000 }); await p.waitForTimeout(300); };

  { // ---- a first game ----
    const p = await open(); await timerOff(p);
    ok(await p.evaluate(() => document.querySelector('[data-set="helpers|1"]').getAttribute('aria-pressed')) === 'true', 'Settings has Helpers, on for a new player');
    await p.keyboard.press('Escape'); await p.click('#play'); await p.click('#go');
    ok(await wait(p, 'Your start.', 15000), 'round 1: the note on your start'); ok(await beside(p, '#pick-go'), 'it sits beside Choose');
    await pick(p);
    ok(await wait(p, 'Buy a squad.'), 'then on a unit you can buy'); ok(await beside(p, '#panel .uc2[aria-disabled="false"]'), 'it sits beside the card'); ok(await offReady(p), 'and not over READY');
    await p.click('#panel .uc2[aria-disabled="false"]');
    ok(await wait(p, 'Place it.'), 'a unit picked: the note is on your zone');
    const t = await freeTile(p); await p.mouse.click(t[0], t[1]);
    ok(await wait(p, 'Ready?'), 'a squad placed: the note is on READY'); ok(await beside(p, '#ready'), 'it sits beside READY');
    ok(['buy', 'place'].every(x => (store(p), true)) && (await store(p)).seen.includes('buy') && (await store(p)).seen.includes('place'), 'buy and place are done');
    await fight(p);
    ok(await wait(p, 'They fight on their own.'), 'the fight: where the speed and Skip are');
    await toResult(p);
    ok(await wait(p, 'The loser takes damage.'), 'the result: what it cost'); ok(await beside(p, '#next'), 'it sits beside Next round');
    await js(p, '#next');
    ok(await wait(p, 'Your leader.', 10000), 'round 2: your leader');
    await pick(p); await p.waitForTimeout(600);
    // (the AI may pick first: wait for your turn)
    for (let k = 0; k < 20 && await p.evaluate(() => !document.getElementById('pick').hidden); k++) { await pick(p); }
    await p.waitForTimeout(400); if ((await note(p)) === 'It can level up.') { await js(p, '#hp-ok'); await p.waitForTimeout(300); } // (a squad may be ready to level: that is said first)
    ok(await wait(p, 'More units.'), 'then: more units to unlock'); ok(await beside(p, '#panel .add2'), 'it sits beside an Unlock tile');
    await js(p, '#hp-ok'); await p.waitForTimeout(400);
    ok((await note(p)) !== 'More units.' && (await store(p)).seen.includes('unlock'), 'Got it puts a note away for good');
    await buy(p); await p.waitForTimeout(400);
    ok((await note(p)) === '', 'nothing is said twice (READY was said in round 1)');
    await fight(p); await p.waitForTimeout(500); ok((await note(p)) === '', 'nor in the second fight');
    await toResult(p); await js(p, '#next');
    ok(await wait(p, 'Your tower.', 10000), 'round 3: your tower');
    await pick(p);
    await p.waitForTimeout(400); if ((await note(p)) === 'It can level up.') { await js(p, '#hp-ok'); await p.waitForTimeout(300); }
    ok(await wait(p, 'That’s the basics.'), 'and last: the ?'); ok(await beside(p, '#help-btn'), 'it sits beside the ?'); ok(await offReady(p), 'and not over READY');
    // the match's Settings: Helpers off, then on again: they start over
    await js(p, '#cog'); await p.waitForTimeout(300);
    ok((await note(p)) === '', 'a sheet open: no note over it');
    ok(await js(p, '[data-helpers="0"]'), 'the match’s Settings has Helpers'); await js(p, '#close'); await p.waitForTimeout(500);
    ok((await note(p)) === '' && (await store(p)).off === true, 'off: no notes');
    await js(p, '#cog'); await p.waitForTimeout(200); await js(p, '[data-helpers="1"]'); await js(p, '#close');
    await p.waitForTimeout(600); ok(['Buy a squad.', 'It can level up.', 'More units.'].includes(await note(p)) && (await store(p)).seen.length === 0, 'on again: they start over, from what there is to do now');
    // a note's own Turn off helpers
    await js(p, '#hp-off'); await p.waitForTimeout(300);
    ok((await note(p)) === 'Helpers are off.' && (await store(p)).off === true, 'Turn off helpers: off, and a last note says Settings has them');
    ok(await beside(p, '#cog'), 'it points at Settings');
    await p.waitForTimeout(4600); ok((await note(p)) === '', 'and goes by itself');
    await buy(p); ok((await note(p)) === '', 'no more notes');
    await p.close();
  }
  { // ---- a whole game: done ----
    const p = await open(); await timerOff(p); await p.keyboard.press('Escape'); await p.click('#play'); await p.click('#go'); await p.waitForTimeout(800);
    let over = false;
    for (let r = 0; r < 40 && !over; r++) {
      for (let k = 0; k < 30 && await p.evaluate(() => window.__pb().phase === 'deploy' && !document.getElementById('pick').hidden); k++) await pick(p);
      if (await p.evaluate(() => window.__pb().phase === 'deploy')) { try { await fight(p); } catch (e) { console.log('     (stuck: ' + await p.evaluate(() => { const s = window.__pb(), rd = document.getElementById('ready'); return 'r' + s.m.round + ' pick ' + !document.getElementById('pick').hidden + ' ready ' + (rd ? rd.disabled + ' ' + rd.textContent : 'none') + ' sheet ' + !document.getElementById('sheet-back').hidden + ' [' + document.getElementById('sheet').textContent.trim().slice(0, 120) + '] peek ' + !document.getElementById('pick-peek').hidden + ' hint ' + document.getElementById('panel').textContent.trim().slice(0, 80); }) + ')'); throw e; } await toResult(p); }
      over = await p.evaluate(() => !!window.__pb().m.over); if (!over) { await js(p, '#next'); await p.waitForTimeout(500); }
    }
    ok(over, 'a game played to its end'); await p.waitForTimeout(500);
    ok((await store(p)).done === true && (await note(p)) === '', 'the game is over: the helpers are done');
    await js(p, '#again'); await p.waitForTimeout(1500); // Play again
    ok((await note(p)) === '', 'the second game has none');
    await p.close();
  }
  { // ---- not for everyone ----
    const p = await open(() => { try { localStorage.setItem('phonebellum.tutorial.v1', 'done'); } catch (e) {} });
    await p.click('#go'); await p.waitForTimeout(2500);
    ok((await note(p)) === '', 'a device that finished the old tutorial: off by default');
    await p.close();
    const q = await open(); await q.click('#play-back'); await q.click('#puzzles-open'); await q.waitForTimeout(400); await q.click('#pz-list .item'); await q.waitForTimeout(2500);
    ok((await note(q)) === '', 'a puzzle has no helper notes');
    await q.close();
  }
  await b.close(); console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})();
