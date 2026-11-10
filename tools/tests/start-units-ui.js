// Round 1 (2026-11-07): you see which units your opponent's package starts them with, as see-through figures along the
// back of their zone, but not where their squads stand (Game.startSeen, the page's foeStart, drawn by both boards).
//  - against the AI: its package squads, nothing else it bought, none of its real squads; gone from round 2
//  - a PeerJS match, both ways round: the guest sees the host's package squads (syncState's packSeen) and the host the
//    guest's, never their squads, leader or package; gone from round 2
// Needs the game on port 8766 and, for the PeerJS part, the peer server (node tools/peer-server.js, port 9000).
const { chromium } = require('playwright-core');
const ctx2d = require('./board2d');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
const look = (pg) => pg.evaluate(() => {
  const { m, me, phase } = window.__pb(), f = 1 - me, pk = Game.packOf(m, f);
  return { round: m.round, phase, seen: Game.startSeen(m, f), pack: pk ? pk.squads : null, foeSquads: Game.foeSeen(m, f).length, foeChar: (m.chars || [])[f] || null,
    shown: (window.__pbView && window.__pbView().foeStart) || null };
});
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PB_CHROME || '/opt/pw-browsers/chromium', args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });
  const mk = async (n) => { const p = await (await ctx2d(b, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage(); p.on('pageerror', e => { console.log(`[${n}] PAGE ERROR`, e.message); fails++; }); return p; };

  // ---- against the AI ----
  const p = await mk('ai');
  await p.goto('http://127.0.0.1:8766/?test&aiready=60000'); await sleep(500);
  await p.click('#go'); await sleep(1000);
  ok(await p.evaluate(() => Game.needsPack(window.__pb().m, window.__pb().me) && !window.__pbView().foeStart), 'AI: nothing shown while you still choose your start');
  await p.dblclick('[data-pack="0"]'); await sleep(400);
  let s = await p.evaluate(() => { const { m } = window.__pb(); return { seen: Game.startSeen(m, 1), pack: Game.packOf(m, 1).squads, army: m.armies[1].map(q => q.unit), hidden: Game.foeSeen(m, 1).length }; });
  ok(JSON.stringify(s.seen) === JSON.stringify(s.pack), `AI: its package squads are seen (${s.seen})`);
  ok(s.army.length >= s.pack.length && s.hidden === 0, `AI: its squads still hidden (${s.army.length} on the board, ${s.hidden} seen)`);
  const lineup = await p.evaluate(() => window.__pbView().foeStart);
  ok(lineup && lineup.length === s.pack.length && lineup.every(e => e.y > 0), 'AI: the lineup stands on their half, one figure per squad');
  await p.click('#ready'); await sleep(300); if (await p.locator('#cap-go').count()) await p.click('#cap-go');
  await p.waitForFunction(() => window.__pb().phase === 'battle', null, { timeout: 70000 });
  await p.click('#skip').then(() => p.click('#skip')).catch(() => {}); await p.waitForSelector('#next', { timeout: 120000 }); await p.click('#next'); await sleep(600);
  ok(await p.evaluate(() => window.__pb().m.round === 2 && !window.__pbView().foeStart), 'AI: gone in round 2');
  await p.context().close();

  // ---- a PeerJS match ----
  const up = await fetch('http://127.0.0.1:9000/').then(() => true, () => false);
  if (!up) console.log('(no peer server on port 9000: the PeerJS part is skipped)');
  else {
    const host = await mk('host'), guest = await mk('guest');
    const BASE = 'http://127.0.0.1:8766/?test&peerhost=127.0.0.1&peerport=9000';
    await host.goto(BASE); await host.click('#friend');
    await host.waitForFunction(() => /Waiting/.test(document.getElementById('lobby-status').textContent));
    await guest.goto((await host.locator('#link').textContent()) + '&test');
    await host.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 20000 });
    await host.click('#start');
    await guest.waitForFunction(() => document.getElementById('phase').textContent === 'Deploy');
    await sleep(500);
    ok(!(await look(guest)).seen && !(await look(host)).seen, 'PeerJS: nothing before they pick');
    await host.click('[data-pack="1"]:visible'); await sleep(100); await host.click('#pick-go'); await sleep(800);
    await guest.click('[data-pack="2"]:visible'); await sleep(100); await guest.click('#pick-go'); await sleep(800);
    const hostOwn = await host.evaluate(() => { const { m } = window.__pb(); return Game.packOf(m, 0).squads; });
    const guestOwn = await guest.evaluate(() => { const { m } = window.__pb(); return Game.packOf(m, 1).squads; });
    const g = await look(guest), h = await look(host);
    ok(JSON.stringify(g.seen) === JSON.stringify(hostOwn), `PeerJS: the guest sees the host's starting units (${g.seen})`);
    ok(JSON.stringify(h.seen) === JSON.stringify(guestOwn), `PeerJS: the host sees the guest's starting units (${h.seen})`);
    ok(g.foeSquads === 0 && h.foeSquads === 0, 'PeerJS: no squad of theirs shows');
    ok(!g.pack && !g.foeChar, 'PeerJS: the guest still has neither the host\'s package nor leader');
    ok(g.shown && g.shown.length === hostOwn.length && h.shown && h.shown.length === guestOwn.length, 'PeerJS: both boards get the lineup');
    await host.screenshot({ path: 'start-units-host.png' }); await guest.screenshot({ path: 'start-units-guest.png' });
    await guest.click('#ready'); await host.click('#ready'); await sleep(300);
    for (const pg of [host, guest]) if (await pg.locator('#cap-go').count()) await pg.click('#cap-go');
    await guest.waitForFunction(() => document.getElementById('phase').textContent === 'Battle', null, { timeout: 10000 });
    await host.click('#skip').then(() => host.click('#skip')).catch(() => {}); await guest.click('#skip').then(() => guest.click('#skip')).catch(() => {}); await sleep(600);
    await host.click('#next'); await guest.click('#next');
    for (const pg of [host, guest]) await pg.waitForFunction(() => document.getElementById('phase').textContent === 'Deploy' && window.__pb().m.round === 2, null, { timeout: 15000 });
    await sleep(500);
    ok(!(await look(guest)).shown && !(await look(host)).shown, 'PeerJS: gone in round 2');
  }
  await b.close();
  console.log(fails ? `${fails} failed` : 'start units: all ok');
  process.exit(fails ? 1 : 0);
})();
