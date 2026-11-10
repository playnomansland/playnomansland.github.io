// Players online (2026-11-10; server/src/online.js): every open game page keeps a socket to /online, developers read
// the count from /account/online.
// Checks:
//  - /online: a device id, a WebSocket and the game's origin only
//  - the count is devices, not sockets: two tabs of one browser count once
//  - a closed page drops out; a page that stops pinging drops out after the stale time, and a ping brings it back
//  - only developer accounts can read the count (guests, ordinary Google accounts and no session can't)
// Run: cd server && node test/online.test.js (also in npm test). Port 8784.
const assert = require('assert');
const { open, waitFor, sleep } = require('./harness.js');
const { idToken, startAccounts } = require('./accounts-env.js');

const ORIGIN = 'http://localhost:8766';
setTimeout(() => { console.error('test timed out'); process.exit(1); }, 4 * 60 * 1000).unref();
const dev = () => Math.random().toString(36).slice(2, 12).padEnd(10, 'x');

(async () => {
  const srv = await startAccounts(8784, { DEV_EMAILS: 'dev@example.com', ONLINE_STALE_MS: 2500 });
  const call = async (route, body, token) => {
    const headers = { 'content-type': 'application/json', Origin: ORIGIN };
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = await fetch(`${srv.base}/account/${route}`, { method: 'POST', headers, body: JSON.stringify(body || {}) });
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
  const page = (d) => open(`${srv.ws}/online?d=${d}`, ORIGIN);
  try {
    const D = await call('google', { credential: idToken({ email: 'dev@example.com', email_verified: true }) });
    assert.strictEqual(D.status, 200); assert.strictEqual(D.player.dev, true, 'a developer');
    const count = async () => { const r = await call('online', {}, D.session); assert.strictEqual(r.status, 200, JSON.stringify(r)); return r.online; };

    // who may read it
    const G = await call('google', { credential: idToken({ email: 'someone@example.com', email_verified: true }) });
    assert.strictEqual((await call('online', {}, G.session)).status, 403, 'an ordinary Google account');
    const guest = await call('guest', {});
    assert.strictEqual((await call('online', {}, guest.session)).status, 403, 'a guest');
    assert.strictEqual((await call('online', {})).status, 401, 'no session');
    console.log('ok   only developers read the count');

    // the socket's own checks
    assert.strictEqual((await fetch(`${srv.base}/online?d=x`, { headers: { Origin: ORIGIN } })).status, 400, 'a bad device id');
    assert.strictEqual((await fetch(`${srv.base}/online?d=${dev()}`, { headers: { Origin: ORIGIN } })).status, 426, 'not a WebSocket');
    await assert.rejects(open(`${srv.ws}/online?d=${dev()}`, 'https://evil.example'), 'another website');
    console.log('ok   /online: device id, WebSocket, origin');

    // devices, not sockets
    assert.strictEqual(await count(), 0, 'nobody yet');
    const a = dev(), b = dev();
    const a1 = await page(a), a2 = await page(a), b1 = await page(b);
    assert.strictEqual(await count(), 2, 'two tabs of one browser and another browser: 2');
    console.log('ok   two tabs count once');

    // a closed page drops out
    b1.close();
    await waitFor(async () => (await count()) === 1, 5000);
    console.log('ok   a closed page drops out');

    // no pings: gone after the stale time; a ping brings it back
    await sleep(3000);
    assert.strictEqual(await count(), 0, 'stopped pinging: not counted');
    a1.send('{"t":"ping"}'); await a1.next('pong');
    assert.strictEqual(await count(), 1, 'a ping: counted again');
    a2.send('{"t":"ping"}'); await a2.next('pong');
    assert.strictEqual(await count(), 1, 'still one device');
    console.log('ok   a page that stops pinging drops out; a ping brings it back');
    a1.close(); a2.close();
    await waitFor(async () => (await count()) === 0, 5000);

    // who (2026-11-10): /account/online { list: true }, from each page's hello { session }
    const who = async () => { const r = await call('online', { list: true }, D.session); assert.strictEqual(r.status, 200, JSON.stringify(r)); return r; };
    assert.strictEqual((await call('online', { list: true }, G.session)).status, 403, 'the list: developers only too');
    const hello = async (ws, session) => { ws.send(JSON.stringify({ t: 'hello', session })); };
    const pg = await page(dev()), pd1 = await page(dev()), pd2 = await page(dev()), pn = await page(dev()), pf = await page(dev());
    await hello(pg, guest.session); await hello(pd1, D.session); await hello(pd2, D.session); await hello(pn, null);
    await hello(pf, 'f'.repeat(64)); // a made-up session: no account
    let w = await waitFor(async () => { const x = await who(); return x.players.length === 2 && x.anon === 2 ? x : null; }, 5000);
    assert.strictEqual(w.online, 5);
    const byId = Object.fromEntries(w.players.map((p) => [p.id, p]));
    assert.deepStrictEqual({ tag: byId[guest.player.id].tag, google: byId[guest.player.id].google, devices: byId[guest.player.id].devices }, { tag: guest.player.tag, google: false, devices: 1 }, 'the guest');
    assert.deepStrictEqual({ tag: byId[D.player.id].tag, google: byId[D.player.id].google, dev: byId[D.player.id].dev, title: byId[D.player.id].title, devices: byId[D.player.id].devices }, { tag: D.player.tag, google: true, dev: true, title: 'dev', devices: 2 }, 'the developer, on two devices');
    assert.ok(!('session' in byId[D.player.id]), 'no sessions in the list');
    console.log('ok   who: signed-in players by account (devices counted), the rest as no account; a made-up session is no account');

    // signing out (hello null) and in again; a closed page leaves the list
    await hello(pg, null);
    w = await waitFor(async () => { const x = await who(); return x.players.length === 1 && x.anon === 3 ? x : null; }, 5000);
    await hello(pg, G.session);
    w = await waitFor(async () => { const x = await who(); return x.players.some((p) => p.id === G.player.id) && x.anon === 2 ? x : null; }, 5000);
    pd2.close();
    w = await waitFor(async () => { const x = await who(); const d = x.players.find((p) => p.id === D.player.id); return d && d.devices === 1 ? x : null; }, 5000);
    // too many hellos: the rest are ignored (the socket stays counted)
    for (let i = 0; i < 8; i++) await hello(pn, i % 2 ? null : D.session);
    await sleep(500);
    assert.strictEqual((await who()).online, 4, 'still counted');
    console.log('ok   sign out, sign in, a closed page; a hello flood is cut off');
    for (const s of [pg, pd1, pn, pf]) s.close();
    console.log('all online checks passed');
  } finally { srv.stop(); }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
