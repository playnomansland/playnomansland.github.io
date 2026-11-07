// The music player's settings and playlists on the account (2026-11-07, accounts.js MUSIC, the page's musicFromAcct).
// Starts the game server locally with accounts on (server/test/accounts-env.js) and its own static server for the page
// on 8766 (an origin the server allows). Checks:
//  - a guest's phone sends its settings up the first time; a playlist made and Shuffle switched on reach the account
//  - another phone on the same account gets them; a playlist deleted there is gone on the first phone after a reload
//  - a phone with a playlist made before logging in: logging in merges it with the account's
//  - another account on the same phone doesn't get the first one's playlists
// Run: node tools/tests/music-account-ui.js
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const { startAccounts } = require('../../server/test/accounts-env.js');
const EXE = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(f => fs.existsSync(f));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let bad = 0; const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) bad++; };
setTimeout(() => { console.error('test timed out'); process.exit(1); }, 4 * 60 * 1000).unref();
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const ORIGIN = 'http://127.0.0.1:8766';

(async () => {
  const web = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; return s.end(); }
    s.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream'); s.end(fs.readFileSync(f));
  }).listen(8766);
  const srv = await startAccounts(8797);
  const b = await chromium.launch({ executablePath: EXE });
  const api = async (route, body, session) => {
    const r = await fetch(`${srv.base}/account/${route}`, { method: 'POST', headers: { 'content-type': 'application/json', Origin: ORIGIN, ...(session ? { Authorization: 'Bearer ' + session } : {}) }, body: JSON.stringify(body || {}) });
    return r.json();
  };
  const guest = async () => { const g = await api('guest', {}); if (!g.player) throw new Error('guest: ' + JSON.stringify(g)); return { id: g.player.id, tag: g.player.tag, google: false, dev: false, titles: [], title: '', tagNext: 0, skins: [], discord: false, puzzles: [], gg: 0, session: g.session, ts: Date.now() }; };
  // a phone: a browser context, signed in to a (or nobody), on the menu
  const phone = async (name, a) => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem('t')) { sessionStorage.setItem('t', '1'); localStorage.setItem('pb-welcomed', '1'); localStorage.setItem('pb-stay', '1'); localStorage.setItem('phone-bellum-board', '2d'); if (a) localStorage.setItem('phonebellum.account.v1', JSON.stringify(a)); } } catch (e) {} }, a || null);
    const p = await ctx.newPage();
    p.on('pageerror', e => { console.log(`[${name}] PAGE ERROR`, e.message); bad++; });
    await p.goto(`${ORIGIN}/index.html?test&server=${srv.base}`);
    await p.waitForSelector('#mp-now', { timeout: 30000 });
    await sleep(1500);
    return p;
  };
  const M = (p) => p.evaluate(() => window.__music());
  const settle = (p) => p.waitForFunction(() => !window.__music().dirty, null, { timeout: 10000 }).then(() => true, () => false);
  const make = async (p, name, songs) => {
    await p.click('#mp-now'); await sleep(500);
    await p.click('[data-tab="+"]'); await p.fill('#mp-name', name);
    for (const id of songs) await p.click(`[data-pick="${id}"]`);
    await p.click('#mp-save'); await sleep(200);
    await p.keyboard.press('Escape'); await sleep(400);
  };

  try {
    const A = await guest();
    const a = await phone('a', A);
    ok(await settle(a), 'phone a: the settings went up to the account');
    let me = await api('me', {}, A.session);
    ok(me.player.music && me.player.music.playlists.length === 0 && me.player.music.prefs.src === 'menu', 'the account has them: ' + JSON.stringify(me.player.music));
    await make(a, 'Gym', ['jonah', 'sisi']);
    await a.click('#mp-shuffle');
    ok(await settle(a), 'phone a: the playlist and Shuffle went up');
    me = await api('me', {}, A.session);
    ok(me.player.music.playlists.length === 1 && me.player.music.playlists[0].name === 'Gym' && me.player.music.playlists[0].songs.join() === 'jonah,sisi' && me.player.music.prefs.shuffle === true, 'the account has Gym and Shuffle: ' + JSON.stringify(me.player.music));

    const b2 = await phone('b', A);
    let s = await M(b2);
    ok(s.lists.length === 1 && s.lists[0].name === 'Gym', 'phone b, same account: Gym is there ' + JSON.stringify(s.lists));
    ok(await b2.getAttribute('#mp-shuffle', 'aria-pressed') === 'true', 'phone b: Shuffle is on');
    await b2.click('#mp-now'); await sleep(500);
    await b2.click(`[data-tab="u:${s.lists[0].id}"]`); await b2.click('#mp-del'); await b2.click('#mp-del');
    ok(await settle(b2), 'phone b: deleting Gym went up');
    await a.reload(); await a.waitForSelector('#mp-now'); await sleep(1500);
    s = await M(a);
    ok(!s.lists.length, 'phone a after a reload: Gym is gone');

    // made before logging in: merged with the account's
    await make(a, 'Cardio', ['long']);
    ok(await settle(a), 'phone a: Cardio up');
    const c = await phone('c', null);
    await make(c, 'Offline', ['reveal']);
    s = await M(c); ok(s.dirty && s.lists.length === 1, 'phone c (no account): Offline kept on the phone');
    await c.evaluate((a) => localStorage.setItem('phonebellum.account.v1', JSON.stringify(a)), A);
    await c.reload(); await c.waitForSelector('#mp-now'); await sleep(1500);
    ok(await settle(c), 'phone c logged in: synced');
    s = await M(c);
    ok(s.lists.map(x => x.name).sort().join() === 'Cardio,Offline', 'phone c: the account\'s Cardio and its own Offline ' + s.lists.map(x => x.name));
    me = await api('me', {}, A.session);
    ok(me.player.music.playlists.map(x => x.name).sort().join() === 'Cardio,Offline', 'the account has both');

    // another account on phone c: A's playlists stay with A
    const B = await guest();
    await c.evaluate((a) => localStorage.setItem('phonebellum.account.v1', JSON.stringify(a)), B);
    await c.reload(); await c.waitForSelector('#mp-now'); await sleep(1500);
    ok(await settle(c), 'phone c as another account: synced');
    s = await M(c);
    ok(!s.lists.length, 'another account doesn\'t get them ' + JSON.stringify(s.lists));
    ok((await api('me', {}, B.session)).player.music.playlists.length === 0 && (await api('me', {}, A.session)).player.music.playlists.length === 2, 'and the first account keeps them');
  } catch (e) {
    console.error(e); bad++;
  } finally { await b.close(); web.close(); srv.stop(); }
  console.log(bad ? `${bad} music account check(s) failed` : 'music account ok');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
