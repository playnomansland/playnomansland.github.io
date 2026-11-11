// 2v2 Field Hospital, Second wind (2026-11-11): the sheet has one button, then a tap on a squad of your team on the
// board picks it (as Mark Bounty picks its enemy); a squad of yours or your teammate's; a tap elsewhere changes nothing.
// The hospital is added on the host's page only (as mpb-ui.js's last check), so what is checked is the page's own copy.
// Needs: python3 -m http.server 8760 (repo root),
//        cd server && npx wrangler dev --port 8761 --var DUO_ANYONE:1 --var ALLOWED_ORIGINS:http://127.0.0.1:8760
// (PB_SHOTS=dir saves screenshots)
let pw; try { pw = require('playwright-core'); } catch (e) { pw = require('playwright'); }
const ctx2d = require('./board2d');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const BASE = 'http://127.0.0.1:8760/?server=http://127.0.0.1:8761&test';
const CHROME = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(f => require('fs').existsSync(f));
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
const DEV = { id: 'p0123456789abcdef', session: 'a'.repeat(64), tag: 'Vilhelm', dev: true, title: '' };
const shot = async (p, name) => { if (process.env.PB_SHOTS) await p.screenshot({ path: process.env.PB_SHOTS + '/fh-' + name + '.png' }); };
(async () => {
  const b = await pw.chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const mk = async (n, acct) => {
    const c = await ctx2d(b, { viewport: { width: 1280, height: 860 } });
    if (acct) await c.addInitScript((a) => { try { localStorage.setItem('phonebellum.account.v1', JSON.stringify(a)); localStorage.setItem('pb-stay', '1'); } catch (e) {} }, acct);
    await c.route('**/account/**', (r) => r.abort());
    const p = await c.newPage();
    p.on('pageerror', e => { console.log(`[${n}] PAGE ERROR`, e.message); fails++; });
    return p;
  };
  const waitPhase = (p, ph, ms = 30000) => p.waitForFunction((x) => document.getElementById('phase').textContent === x, ph, { timeout: ms });
  const tapTile = async (p, col, row) => {
    const bb = await p.locator('#board').boundingBox(), me = await p.evaluate(() => window.__pb().me), C = await p.evaluate(() => Game.COLS), R = await p.evaluate(() => Game.ROWS);
    const c = me === 1 ? C - 1 - col : col, r = me === 1 ? R - 1 - row : row;
    await p.mouse.click(bb.x + (c + 0.5) * bb.width / C, bb.y + (r + 0.5) * bb.height / R);
  };
  const fold = (p) => p.evaluate(() => { const d = document.getElementById('dock-toggle'); if (document.documentElement.classList.contains('dock') && d && !document.documentElement.classList.contains('dock-down')) d.click(); });

  const host = await mk('host', DEV);
  await host.goto(BASE);
  await host.waitForSelector('#duo-new', { state: 'attached', timeout: 20000 });
  await host.evaluate(() => document.getElementById('duo-new').click());
  await host.waitForFunction(() => /duo=[A-Z0-9]{6}/.test((document.getElementById('link') || {}).textContent || ''), null, { timeout: 20000 });
  const link = (await host.locator('#link').textContent()).trim();
  const mate = await mk('mate'), foe = await mk('foe');
  await mate.goto(link + '&test');
  await host.waitForFunction(() => /2 of 4 here/.test((document.getElementById('lobby-status') || {}).textContent || ''), null, { timeout: 20000 });
  await foe.goto(link + '&test');
  await host.waitForFunction(() => /3 of 4 here/.test((document.getElementById('lobby-status') || {}).textContent || ''), null, { timeout: 20000 });
  await host.click('#duo-start');
  const all = [host, mate, foe];
  for (const p of all) await waitPhase(p, 'Deploy');
  for (const p of all) await p.dblclick('[data-pack="0"]');
  await sleep(1500);
  for (const p of all) await fold(p);
  // the teammate's squads reach the host
  await host.waitForFunction(() => { const { m, me } = window.__pb(); return Game.teamArmy(m, me).length > 0; }, null, { timeout: 10000 }).catch(() => {});
  // the hospital, added on this page only; the server doesn't know it, so it refuses the buy and the page's copy goes
  // back: what is checked is the call the tap makes (Game.mpbBuy / Game.mpbAct, spied on), with which squad
  await host.evaluate(() => { window.__fhCalls = []; for (const f of ['mpbBuy', 'mpbAct']) { const o = Game[f]; Game[f] = (...a) => { if (a[3] === 'wind') window.__fhCalls.push([f, a[4], a[5]]); return o(...a); }; } });
  const setup = (bought) => host.evaluate((bought) => {
    const { m, me } = window.__pb();
    const t = Mpb.autoSpot(m, me, 'fieldHospital', null) || { col: 7, row: 13 };
    const rec = Mpb.addRec(m, me, 'fieldHospital', t.col, t.row);
    m.gold[me] += 1000;
    const mine = m.armies[me].find(q => q.in == null), mates = Game.teamArmy(m, me).filter(q => q.in == null), L = window.__fhLane == null ? 0 : window.__fhLane; // (the host's lane: from its first buy below)
    if (bought) { rec.skills.wind = { round: m.round, n: 1, by: [0, 0], log: [{ lane: L, cost: 100 }] }; rec.skills.wind.by[L] = 1; rec.data.wind = { round: m.round, lane: L, id: mine.id, u: mine.unit }; }
    window.__fhCalls = [];
    window.__pbSheet(me, rec.key);
    return { key: rec.key, L, text: document.getElementById('sheet').innerText, mine: mine && { id: mine.id, col: mine.col, row: mine.row }, mate: mates[0] && { id: Duo.unmap(mates[0].id), col: mates[0].col, row: mates[0].row } };
  }, bought);
  const calls = () => host.evaluate(() => window.__fhCalls);
  let st = await setup(false);
  console.log('setup', JSON.stringify({ ...st, text: undefined }));
  ok(/Second wind · \d+ gold/.test(st.text) && !(await host.evaluate(() => !!document.querySelector('[data-fh-wind]'))), 'the sheet: one Second wind button, no list of squads');
  ok(/then tap the squad of your team on the board/.test(st.text), 'it says to tap the squad on the board');
  await shot(host, 'sheet');
  await host.click('#fh-wind-pick'); await sleep(300);
  ok(await host.evaluate(() => document.getElementById('sheet-back').hidden), 'the button closes the sheet');
  await tapTile(host, 1, 10); await sleep(300);
  ok(!(await calls()).length, 'a tap on no squad of the team buys nothing');
  st = await setup(false); await host.click('#fh-wind-pick'); await sleep(300);
  await tapTile(host, st.mine.col, st.mine.row); await sleep(300);
  let c = await calls();
  ok(c.length === 1 && c[0][0] === 'mpbBuy' && c[0][2] === st.mine.id, 'a tap on your squad buys Second wind on it: ' + JSON.stringify(c));
  if (c[0]) { st.L = c[0][1]; await host.evaluate((L) => { window.__fhLane = L; }, st.L); }
  st = await setup(false); await host.click('#fh-wind-pick'); await sleep(300);
  await tapTile(host, st.mate.col, st.mate.row); await sleep(300);
  c = await calls();
  ok(c.length === 1 && c[0][0] === 'mpbBuy' && c[0][1] === 1 - st.L && c[0][2] === st.mate.id, 'a tap on the teammate\'s squad buys it on theirs: ' + JSON.stringify(c));
  st = await setup(true); st.L = await host.evaluate(() => window.__fhLane);
  ok(/Move Second wind/.test(st.text) && /Second wind this round:/.test(st.text), 'bought: the button moves it (' + (st.text.match(/Second wind this round:[^\n·]*/) || [''])[0].trim() + ')');
  await shot(host, 'sheet-bought');
  await host.click('#fh-wind-pick'); await sleep(300);
  await tapTile(host, st.mate.col, st.mate.row); await sleep(300);
  c = await calls();
  ok(c.length === 1 && c[0][0] === 'mpbAct' && c[0][1] === 1 - st.L && c[0][2] === st.mate.id, 'bought: a tap on another squad moves it there: ' + JSON.stringify(c));
  await host.evaluate(() => { const c = document.getElementById('close'); if (c) c.click(); });
  await b.close();
  if (fails) { console.log(`\n${fails} failed`); process.exit(1); }
  console.log('\nall passed');
})().catch(e => { console.log('FAIL', e); process.exit(1); });
