// V2WIP on the page (developer mode, vs AI; the 2D and the 3D board, a PC window): the developer menu starts it on its
// own roster (no Slime Wizard or Slimeshots, with Warper and Catcher); a Warper's sheet has Set teleport tile and a tap
// in your zone sets it (a tap outside doesn't); a Catcher's sheet has Set hook direction; both show on the floor; in
// the fight the squad across is teleported and the hook flies.
// Screenshots go to PB_SHOTS (or the current folder): v2wip-<board>-deploy.png, -root.png, -fight.png.
// Run from the repo root with the game served on port 8766: PB_CHROME=/usr/bin/google-chrome node tools/tests/v2wip-ui.js
let pw; try { pw = require('playwright-core'); } catch (e) { pw = require('playwright'); }
const { chromium } = pw;
const ctx2d = require('./board2d');
const assert = require('assert');
const path = require('path');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SHOTS = process.env.PB_SHOTS || '.';
(async () => {
  const exe = process.env.PB_CHROME;
  const b = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const errors = [];
  for (const board of ['2d', '3d']) {
    const ctx = await ctx2d(b, { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
    // a developer account on this browser (the server isn't asked in this check)
    await ctx.addInitScript(() => { try { localStorage.setItem('phonebellum.account.v1', JSON.stringify({ id: 'p0123456789abcdef', session: 'a'.repeat(64), tag: 'Dev', dev: true })); } catch (e) {} });
    const p = await ctx.newPage();
    p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    await p.goto(`http://127.0.0.1:8766/?test${board === '3d' ? '&board=3d' : ''}`); await sleep(board === '3d' ? 1500 : 600);
    assert.ok(await p.evaluate(() => window.__acct().dev), 'developer mode');
    // the developer menu's V2WIP (the Diorama's row, or the classic menu's button)
    await p.evaluate(() => { const off = document.querySelector('[data-tm="0"]'); if (off) off.click(); }); // no deploy clock: the 3D board is slow without a graphics card
    const started = await p.evaluate(() => { const x = document.querySelector('[data-dv="v2wip"]') || document.querySelector('#v2wip-ai'); if (!x) return false; x.click(); return true; });
    assert.ok(started, 'the developer menu has V2WIP');
    await sleep(1500);
    const names = await p.evaluate(() => window.__pb().m.units.map(u => u.name));
    assert.ok(names.includes('Warper') && names.includes('Catcher') && !names.includes('Slime Wizard') && !names.includes('Slimeshots'), 'the match is on the V2WIP roster');
    assert.ok(await p.evaluate(() => { const { m } = window.__pb(); return m.v2 === true && m.offTowers.includes('slime'); }), 'no Slime tower');
    await p.dblclick('[data-pack="0"]'); await sleep(300);
    const ids = await p.evaluate(() => {
      const { m, me } = window.__pb(), foe = 1 - me, ix = (n) => m.units.findIndex(u => u.name === n);
      m.round = 2; m.gold[me] = 5000; m.gold[foe] = 5000; m.extraDeploys[me] = Game.CONFIG.maxExtraDeploys;
      m.armies = [[], []]; Game.settleLeaders(m); // (round 2 opens with the leader draft: settled here)
      for (const n of ['Warper', 'Catcher', 'Brute', 'Sniper', 'Goblin Swarm']) { m.unlocks[me][ix(n)] = 1; m.unlocks[foe][ix(n)] = 1; }
      const rows = Game.zoneRows(me), front = me === 0 ? Math.min(...rows) : Math.max(...rows), back = me === 0 ? front + 3 : front - 3;
      const wp = Game.place(m, me, ix('Warper'), 8, back), ct = Game.place(m, me, ix('Catcher'), 5, front);
      const frows = Game.zoneRows(foe), ffront = foe === 0 ? Math.min(...frows) : Math.max(...frows);
      const land = { col: 3, row: me === 0 ? front + 1 : front - 1 }, across = Game.warpFrom(land);
      const gb = Game.place(m, foe, ix('Goblin Swarm'), across.col, across.row); gb.round = 1;
      const sn = Game.place(m, foe, ix('Sniper'), 5, ffront); sn.round = 1;
      window.__pbRedraw();
      return { wp: wp.id, ct: ct.id, wpAt: [wp.col, wp.row], ctAt: [ct.col, ct.row], land, noZone: { col: 3, row: me === 0 ? front - 2 : front + 2 }, fwd: me === 0 ? -1 : 1, me, cols: Game.COLS, rows: Game.ROWS };
    });
    const at = (c, r) => board === '2d'
      ? p.locator('#board').boundingBox().then(bb => { const f = ids.me === 1, sc = f ? ids.cols - 1 - c : c, sr = f ? ids.rows - 1 - r : r; return [bb.x + (sc + .5) * bb.width / ids.cols, bb.y + (sr + .5) * bb.height / ids.rows]; })
      : p.evaluate(([c, r]) => window.__pb().board3d.screenAt(c, r, 0), [c, r]);
    const tap = async (c, r) => { const [x, y] = await at(c, r); await p.mouse.click(x, y); await sleep(350); };
    const sq = (id) => p.evaluate((id) => { const { m, me } = window.__pb(); const s = m.armies[me].find(q => q.id === id); return s ? { warp: s.warp || null, hookAim: s.hookAim || null } : null; }, id);
    // the Warper: a tap outside the zone sets nothing, a tap in it does
    await tap(...ids.wpAt);
    assert.strictEqual(await p.locator('#sheet [data-act="warp"]').count(), 1, 'Set teleport tile on a Warper');
    assert.strictEqual(await p.locator('#sheet [data-act="hook"]').count(), 0, 'no hook button on a Warper');
    await p.click('#sheet [data-act="warp"]'); await sleep(300);
    await tap(ids.noZone.col, ids.noZone.row);
    assert.strictEqual((await sq(ids.wp)).warp, null, 'not outside your zone');
    await tap(...ids.wpAt); await p.click('#sheet [data-act="warp"]'); await sleep(300);
    await tap(ids.land.col, ids.land.row);
    assert.deepStrictEqual((await sq(ids.wp)).warp, ids.land, 'the tile is set');
    // the Catcher: its first throw straight ahead
    await tap(...ids.ctAt);
    if (process.env.PB_DEBUG) { await p.screenshot({ path: path.join(SHOTS, `v2wip-${board}-dbg.png`) }); console.log(await p.evaluate(() => JSON.stringify({ hidden: document.querySelector('#sheet-back').hidden, h: (document.querySelector('#sheet-h') || {}).textContent }))); }
    assert.strictEqual(await p.locator('#sheet [data-act="hook"]').count(), 1, 'Set hook direction on a Catcher');
    assert.ok(/Netcaster/.test(await p.locator('#sheet').innerText()) && /Gutter/.test(await p.locator('#sheet').innerText()), 'its two skills are on the sheet');
    await p.click('#sheet [data-act="hook"]'); await sleep(300);
    await tap(ids.ctAt[0], ids.ctAt[1] + 3 * ids.fwd);
    assert.deepStrictEqual((await sq(ids.ct)).hookAim, { dc: 0, dr: 3 * ids.fwd }, 'the arrow is set');
    await tap(...ids.ctAt);
    assert.strictEqual(await p.locator('#sheet [data-act="unhook"]').count(), 1, 'Clear hook direction');
    await p.click('#sheet #close').catch(() => {}); await sleep(400);
    await p.screenshot({ path: path.join(SHOTS, `v2wip-${board}-deploy.png`) });
    // the fight
    await p.evaluate(() => { const { m } = window.__pb(); m.gold = [0, 0]; window.__pbRedraw(); }); await sleep(200); // (no gold left: Ready doesn't ask about the carry cap)
    await p.evaluate(() => { const r = document.querySelector('#ready') || document.querySelector('#fight'); r.click(); });
    await p.waitForFunction(() => window.__pb().phase === 'battle', null, { timeout: 15000 });
    await p.waitForFunction(() => window.__pb().bt && window.__pb().bt.bodies.some(x => x.warp), null, { timeout: 8000 });
    await p.screenshot({ path: path.join(SHOTS, `v2wip-${board}-root.png`) });
    await p.waitForFunction(() => window.__pb().bt && window.__pb().bt.bodies.some(x => x.warped), null, { timeout: 15000 });
    await sleep(150);
    await p.screenshot({ path: path.join(SHOTS, `v2wip-${board}-teleport.png`) });
    const hooked = await p.waitForFunction(() => { const bt = window.__pb().bt; return bt && (bt.projectiles().some(x => x.hook) || bt.bodies.some(x => x.hooked)); }, null, { timeout: 30000 }).then(() => true, () => false);
    assert.ok(hooked, 'the hook flies');
    await p.screenshot({ path: path.join(SHOTS, `v2wip-${board}-hook.png`) });
    if (board === '2d') await p.waitForFunction(() => window.__pb().phase !== 'battle', null, { timeout: 120000 }); // (the 3D board without a graphics card: not to the end)
    await ctx.close();
    console.log(`ok   ${board} board`);
  }
  await b.close();
  assert.deepStrictEqual(errors, [], 'no page errors');
  console.log('v2wip-ui: all good');
})().catch(e => { console.error(e); process.exit(1); });
