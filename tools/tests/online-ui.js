// Players online (2026-11-10, server/src/online.js and the page's onl*): every open page is counted, developers see the
// count. Starts the game server locally with accounts on (server/test/accounts-env.js, a developer email) and its own
// static server for the page on 8766 (an origin the server allows). Checks:
//  - a page with no account and a guest's page each open their /online socket, and see no count
//  - a developer's page shows the count on the phone menu (the pill under the name): the three pages open now
//  - two tabs of one browser count once
//  - a page closed: the count goes down on the developer's next refresh
//  - the Diorama (PC) menu shows it in the top bar, with the DEV tag
// Run: node tools/tests/online-ui.js
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const { startAccounts, idToken } = require('../../server/test/accounts-env.js');
const EXE = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
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
  const srv = await startAccounts(8788, { DEV_EMAILS: 'dev@example.com' });
  const b = await chromium.launch({ executablePath: EXE });
  const api = async (route, body, session) => {
    const r = await fetch(`${srv.base}/account/${route}`, { method: 'POST', headers: { 'content-type': 'application/json', Origin: ORIGIN, ...(session ? { Authorization: 'Bearer ' + session } : {}) }, body: JSON.stringify(body || {}) });
    return r.json();
  };
  const stored = (r) => ({ id: r.player.id, tag: r.player.tag, google: !!r.player.google, dev: !!r.player.dev, titles: r.player.titles || [], title: r.player.title || '', tagNext: 0, skins: [], discord: false, puzzles: [], gg: 0, session: r.session, ts: Date.now() });
  // a browser (a context: its own localStorage, so its own device id), signed in to a (or nobody)
  const browser = async (a, ui = 'classic', w = 390) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 860 } });
    await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem('t')) { sessionStorage.setItem('t', '1'); localStorage.setItem('pb-welcomed', '1'); localStorage.setItem('pb-stay', '1'); localStorage.setItem('phone-bellum-board', '2d'); if (a) localStorage.setItem('phonebellum.account.v1', JSON.stringify(a)); } } catch (e) {} }, a || null);
    ctx.tab = async () => {
      const p = await ctx.newPage();
      p.on('pageerror', e => { if (!/reading 'length'/.test(e.message)) { console.log('PAGE ERROR', e.message); bad++; } });
      await p.goto(`${ORIGIN}/index.html?test&ui=${ui}&server=${srv.base}`);
      await p.waitForFunction(() => window.__online && window.__online().open, null, { timeout: 30000 });
      return p;
    };
    return ctx;
  };
  const chip = (p) => p.evaluate(() => [...document.querySelectorAll('[data-online]')].filter(e => !e.hidden && e.getClientRects().length).map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  try {
    const dev = stored(await api('google', { credential: idToken({ email: 'dev@example.com', email_verified: true }) }));
    ok(dev.dev, 'a developer account');
    const g = stored(await api('guest', {}));

    const nobody = await browser(null), np = await nobody.tab();
    const guest = await browser(g), gp = await guest.tab();
    ok(true, 'a page with no account and a guest\'s page opened their /online sockets');
    await sleep(1600);
    ok((await chip(np)).length === 0 && (await chip(gp)).length === 0, 'neither sees a count');

    const d = await browser(dev), dp = await d.tab();
    await dp.waitForFunction(() => window.__online().n != null, null, { timeout: 10000 });
    let c = await chip(dp);
    ok(c.length === 1 && c[0] === '3 online', 'the developer sees the three pages: ' + JSON.stringify(c));

    const gp2 = await guest.tab(); // a second tab in the guest's browser
    ok((await dp.evaluate(() => window.__online().n)) === 3, 'before a refresh: still 3');
    const n2 = await dp.evaluate(async () => { document.dispatchEvent(new Event('visibilitychange')); await new Promise(r => setTimeout(r, 800)); return window.__online().n; });
    ok(n2 === 3, 'a second tab of the same browser counts once: ' + n2);

    await nobody.close();
    const n3 = await dp.evaluate(async () => { await new Promise(r => setTimeout(r, 800)); document.dispatchEvent(new Event('visibilitychange')); await new Promise(r => setTimeout(r, 800)); return window.__online().n; });
    ok(n3 === 2, 'a browser closed: 2 online: ' + n3);
    c = await chip(dp); ok(c[0] === '2 online', 'the pill says so: ' + JSON.stringify(c));
    await gp2.close();

    // the Diorama (PC): in the top bar, with the DEV tag
    const pc = await browser(dev, 'diorama', 1440), pp = await pc.tab();
    await pp.waitForFunction(() => window.__online().n != null, null, { timeout: 15000 });
    await sleep(500);
    c = await chip(pp);
    ok(c.length === 1 && /^DEV ?3 online$/.test(c[0]), 'PC: the top bar shows it with the DEV tag: ' + JSON.stringify(c));
    ok(await pp.evaluate(() => !!document.querySelector('#dio .acct [data-online]:not([hidden])')), 'PC: it sits in the top bar');

    // who is online (2026-11-10): tapping the pill lists the players signed in, and the pages with no account
    const rows = (p) => p.evaluate(() => [...document.querySelectorAll('#onl-sheet .onl-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
    const nob2 = await browser(null), np2 = await nob2.tab(); // a page with no account again
    await sleep(800);
    await dp.click('.online-np');
    await dp.waitForSelector('#onl-sheet .onl-row', { timeout: 10000 });
    let list = await rows(dp), sum = await dp.textContent('#onl-sheet .onl-sum');
    ok(list.length === 2 && list.some(r => r.includes(dev.tag) && /Google · 2 devices · you/.test(r)) && list.some(r => r.includes(g.tag) && /Guest/.test(r)),
      'phone: the sheet lists the developer (two devices, you) and the guest: ' + JSON.stringify(list));
    ok(/^4 devices with the game open: 2 players signed in, 1 without an account/.test(sum), 'phone: the summary: ' + sum);
    ok(list.some(r => r.includes(g.tag) && /Menu/.test(r)), 'phone: the guest is on the menu: ' + JSON.stringify(list));
    // the guest starts a game vs the computer: their row says so, with the round
    if (!(await gp.locator('#go').count())) await gp.click('#play').catch(() => {});
    await gp.click('#go'); await sleep(2500);
    await dp.click('#onl-refresh');
    await dp.waitForFunction((tag) => [...document.querySelectorAll('#onl-sheet .onl-row')].some(r => r.textContent.includes(tag) && /Vs computer · round 1/.test(r.textContent)), g.tag, { timeout: 10000 }).catch(() => {});
    list = await rows(dp);
    ok(list.some(r => r.includes(g.tag) && /Vs computer · round 1/.test(r)), 'phone: the guest is in a game vs the computer, round 1: ' + JSON.stringify(list));
    await dp.screenshot({ path: path.join(process.env.SHOTS || '/tmp', 'online-who-phone.png') });
    await dp.click('#close');
    await pp.click('#dio-online');
    await pp.waitForSelector('#onl-sheet .onl-row', { timeout: 10000 });
    ok((await rows(pp)).length === 2, 'PC: the top bar item opens the same list');
    await pp.screenshot({ path: path.join(process.env.SHOTS || '/tmp', 'online-who-pc.png') });
    ok(await gp.evaluate(() => { document.querySelector('[data-online]') && document.querySelector('[data-online]').click(); return !document.getElementById('onl-sheet'); }), 'a guest has no pill and no sheet');
    await nob2.close();
  } finally { await b.close(); srv.stop(); web.close(); }
  console.log(bad ? `${bad} online check(s) failed` : 'all online checks passed');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
