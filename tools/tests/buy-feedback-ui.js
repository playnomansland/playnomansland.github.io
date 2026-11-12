// Buy and place feedback (prototype, 2026-11-12): a card dragged onto the board stamps its tile, the price flies to the
// gold and the gold counts down, the squad is outlined with a NEW tag until the fight, the deploy pips list it, the
// shop card shows ×1; a drop on a bad tile shows a red cross; the fight's start locks the squads in.
// SHOTS=dir saves screenshots along the way. PB_BOARD=3d for the 3D board.
const { chromium } = require('playwright-core');
const ctx2d = require('./board2d');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const EXE = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(f => require('fs').existsSync(f));
const SHOTS = process.env.SHOTS;
let bad = 0; const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) bad++; };
(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await ctx2d(b, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  p.setDefaultTimeout(180000);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); bad++; });
  const shot = async (n) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${process.env.PB_BOARD || '2d'}-${n}.png` }); };
  await p.goto('http://127.0.0.1:8766/?test'); await sleep(1500);
  await p.mouse.click(5, 5); await sleep(500);
  await p.evaluate(() => { const t = document.querySelector('[data-tm="0"]'); if (t) t.click(); return !!t; });
  await p.click('#go'); await sleep(2500);
  await p.dblclick('[data-pack="0"]'); await sleep(1500);
  const where = (c, r) => p.evaluate(([c, r]) => { const { me, board3d } = window.__pb(); if (board3d) return board3d.screenAt(c, r, 0); const bb = document.getElementById('board').getBoundingClientRect(), f = me === 1; return [bb.left + ((f ? 11 - c : c) + .5) * bb.width / 12, bb.top + ((f ? 15 - r : r) + .5) * bb.height / 16]; }, [c, r]);
  const spot = await p.evaluate(() => { const { m, me } = window.__pb(); const ui = [...document.querySelectorAll('#panel .uc2:not([aria-disabled="true"])')].map(e => +e.dataset.i)[0];
    for (const r of [12, 13, 11]) for (let c = 2; c < 10; c++) if (Game.canPlaceAt(m, me, c, r, ui) && Game.spotFree(m, me, c, r, ui)) return { ui, c, r }; });
  const g0 = await p.evaluate(() => { const { m, me } = window.__pb(); return m.gold[me]; });
  const card = await p.locator(`#panel .uc2[data-i="${spot.ui}"]`).boundingBox();
  const [tx, ty] = await where(spot.c, spot.r);
  await shot('0-before');
  const TAP = process.env.PB_BOARD === '3d'; // (the 3D board is too slow here for a drag's timing: pick the card, then tap the tile)
  if (TAP) { await p.evaluate(() => { window.__pfxSlow = 40; }); await p.mouse.click(card.x + card.width / 2, card.y + 30); await sleep(400); await p.mouse.click(tx, ty); await sleep(300); await p.evaluate(() => { const c = document.getElementById('close'); if (c) c.click(); }); }
  else { await p.mouse.move(card.x + card.width / 2, card.y + 30); await p.mouse.down(); await sleep(60);
    await p.mouse.move(tx, ty + 6, { steps: 10 }); await sleep(150);
    await p.mouse.up(); }
  await sleep(90); await shot('1-stamp');
  const mid = await p.evaluate(() => document.querySelector('#panel .g2').firstChild.nodeValue);
  if (!TAP) { await sleep(160); await shot('2-stamp-250ms'); await sleep(300); await shot('3-coin-550ms'); await sleep(700); }
  else await p.waitForFunction(() => !document.querySelector('#pfx svg').innerHTML && !document.querySelector('#pfx .pfx-coin') && !document.querySelector('#panel .g2.pfx-spend'), null, { timeout: 120000, polling: 1000 });
  await shot('4-settled');
  const st = await p.evaluate(() => { const { m, me } = window.__pb(); return { gold: m.gold[me], shown: document.querySelector('#panel .g2').firstChild.nodeValue, fresh: document.querySelectorAll('#marks .fresh').length, tags: document.querySelectorAll('#marks .fresh-t').length, pips: document.querySelectorAll('#panel .pips i.u[data-find]').length, nw: [...document.querySelectorAll('#panel .uc2 .nw')].map(e => e.textContent) }; });
  ok(st.gold < g0, `bought: gold ${g0} -> ${st.gold}`);
  ok(+mid === g0 || +mid > st.gold, `gold still shows the old amount while the coin flies (${mid})`);
  ok(+st.shown === st.gold, `gold then shows the new amount (${st.shown})`);
  ok(st.fresh >= 1 && st.tags >= 1, `outlined with a NEW tag (${st.fresh} outlines, ${st.tags} tags)`);
  ok(st.pips === 1, `one receipt pip (${st.pips})`);
  ok(st.nw.length > 0 && st.nw.every(t => /^×\d/.test(t)), `cards show how many were placed (${st.nw.join(' ')})`);
  // a bad drop: on the enemy's half
  const card2 = await p.locator(`#panel .uc2[data-i="${spot.ui}"]`).boundingBox();
  const [bx, by] = await where(5, 3);
  if (TAP) { await p.evaluate(() => { window.__pfxSlow = 30; }); if (await p.locator(`#panel .uc2[data-i="${spot.ui}"]`).getAttribute('aria-pressed') !== 'true') { await p.mouse.click(card2.x + card2.width / 2, card2.y + 30); await sleep(400); } await p.mouse.click(bx, by); }
  else { await p.mouse.move(card2.x + card2.width / 2, card2.y + 30); await p.mouse.down(); await sleep(60);
    await p.mouse.move(bx, by + 6, { steps: 10 }); await sleep(150); await p.mouse.up(); }
  await sleep(120); ok(!(await p.evaluate(() => document.getElementById('fly2'))), 'the drag picture is gone after the drop'); await shot('5-bad-drop');
  ok(await p.evaluate((tap) => (tap || !!document.querySelector('#pfx .pfx-back')) && /var\(--foe\)/.test(document.querySelector('#pfx svg').innerHTML), TAP), 'bad drop: red cross' + (TAP ? '' : ' and the card flying back'));
  if (TAP) await p.keyboard.press('Escape');
  await sleep(800); if (TAP) await p.evaluate(() => { window.__pfxSlow = 1; });
  // a pip tapped: rings close in on the squad
  await p.click('#panel .pips i.u[data-find]'); await sleep(250); await shot('6-pip-find');
  await sleep(800);
  if (TAP) await p.evaluate(() => { window.__pfxSlow = 30; });
  await p.click('#ready'); await sleep(200); await shot('7-lock-in');
  // round 2: the opponent's new squads are marked as the fight starts
  if (!TAP) {
    await p.click('#skip').catch(() => {}); await sleep(300); await p.click('#skip').catch(() => {});
    for (let i = 0; i < 60; i++) { if (await p.locator('#next, #continue').count()) break; await sleep(500); }
    await p.locator('#next, #continue').first().click(); await sleep(1500);
    await p.click('#ready'); await sleep(250); await shot('8-round2-start');
    ok(await p.evaluate(() => /NEW/.test(document.querySelector('#pfx svg').innerHTML) && /--foe/.test(document.querySelector('#pfx svg').innerHTML)), 'round 2: the opponent\'s new squads are marked');
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
