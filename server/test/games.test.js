// Games played per day (2026-11-10; server/src/games.js).
// Checks:
//  - POST /games: the game's origin only, only the page's kinds (ai, peer, puzzle; never online), a device id and a seed
//  - a (device, seed) pair counts once; another seed or another device counts again
//  - an online match counts once, by the server, when round 1 is fought (not again in round 2)
//  - GET /games?days=N and ?day=YYYY-MM-DD: today's counts by kind and the total; a day with nothing is all zeros
// Run: cd server && node test/games.test.js (also in npm test). Port 8789.
const assert = require('assert');
const { startServer, open, waitFor } = require('./harness.js');
const Engine = require('../../src/engine.js');
const Ref = require('../../src/referee.js');
const Bot = require('../../tools/net-bot.js');
const { units, matrix } = require('../src/prepare-units.cjs')(Engine, require('../../src/demo-units.json'));

const ORIGIN = 'http://localhost:8766';
const copy = (o) => JSON.parse(JSON.stringify(o));
const dev = () => Math.random().toString(36).slice(2, 12).padEnd(10, 'x');
setTimeout(() => { console.error('test timed out'); process.exit(1); }, 4 * 60 * 1000).unref();

(async () => {
  const srv = await startServer(8789);
  const post = async (body, origin = ORIGIN) => {
    const r = await fetch(`${srv.base}/games`, { method: 'POST', headers: { 'content-type': 'text/plain', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
  const today = async () => {
    const r = await fetch(`${srv.base}/games?days=1`); assert.strictEqual(r.status, 200);
    const j = await r.json(); return j.days[0] || { total: 0, ai: 0, peer: 0, online: 0, puzzle: 0 };
  };
  try {
    // who may count, and what
    const d = dev();
    assert.strictEqual((await post({ kind: 'ai', d, s: 'abc' }, 'https://evil.example')).status, 403, 'another website');
    assert.strictEqual((await post({ kind: 'ai', d, s: 'abc' }, null)).status, 403, 'no origin');
    assert.strictEqual((await post({ kind: 'online', d, s: 'abc' })).status, 400, 'online is the server\'s own');
    assert.strictEqual((await post({ kind: 'ai', d: 'x', s: 'abc' })).status, 400, 'a bad device id');
    assert.strictEqual((await post({ kind: 'ai', d, s: 'A B' })).status, 400, 'a bad seed');
    assert.strictEqual((await fetch(`${srv.base}/games`, { method: 'PUT', headers: { Origin: ORIGIN } })).status, 405, 'PUT');
    assert.deepStrictEqual(await today(), { total: 0, ai: 0, peer: 0, online: 0, puzzle: 0 }, 'nothing counted yet');
    console.log('ok   POST /games: origin, kind, device, seed');

    // once per device and seed
    assert.strictEqual((await post({ kind: 'ai', d, s: 'abc' })).counted, true);
    assert.strictEqual((await post({ kind: 'ai', d, s: 'abc' })).counted, false, 'the same game again (a reload)');
    assert.strictEqual((await post({ kind: 'ai', d, s: 'abd' })).counted, true, 'another match');
    assert.strictEqual((await post({ kind: 'ai', d: dev(), s: 'abc' })).counted, true, 'another device, same seed');
    assert.strictEqual((await post({ kind: 'peer', d, s: 'p1' })).counted, true);
    assert.strictEqual((await post({ kind: 'puzzle', d, s: 'z1' })).counted, true);
    let t = await today();
    assert.deepStrictEqual({ ai: t.ai, peer: t.peer, puzzle: t.puzzle, online: t.online, total: t.total }, { ai: 3, peer: 1, puzzle: 1, online: 0, total: 5 });
    console.log('ok   a game counts once per device');

    // an online match: counted by the server at round 1, not again later
    const code = 'G' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'Q');
    const phone = async (hello) => { const ws = await open(`${srv.ws}/room/${code}`); ws.json({ t: 'hello', ...hello }); await ws.next('welcome', 8000); return ws; };
    const a = await phone({ create: true }), b = await phone({});
    a.json({ t: 'start', settings: { map: 'forest' } });
    const r = Bot.rng(3);
    const fights = () => a.inbox.filter((x) => x.t === 'fight');
    for (let n = 1; n <= 2; n++) {
      for (const [ws, sd] of [[a, 0], [b, 1]]) {
        const v = await waitFor(() => [...ws.inbox].reverse().find((x) => x.t === 'sync' && x.phase === 'deploy' && x.round === n), 15000);
        let seq = ws.seq || 0;
        for (const act of Bot.deploy(Ref.withUnits(copy(v.m), units, matrix), sd, { r })) {
          ws.json({ t: 'act', seq: ++seq, fn: act.fn, a: act.a });
          const ack = await waitFor(() => ws.inbox.find((x) => x.t === 'ack' && x.seq === seq), 8000);
          if (!ack.ok) break;
        }
        ws.seq = seq;
      }
      const before = fights().length;
      a.json({ t: 'ready', v: true }); b.json({ t: 'ready', v: true });
      const f = await waitFor(() => fights().length > before && fights().pop(), 20000);
      if (n === 1) await waitFor(async () => (await today()).online === 1, 8000);
      if (f.post.over) break;
      a.json({ t: 'next', round: f.summary.round }); b.json({ t: 'next', round: f.summary.round });
    }
    t = await today();
    assert.strictEqual(t.online, 1, 'one online match, counted once');
    assert.strictEqual(t.total, 6);
    a.close(); b.close();
    console.log('ok   an online match counts once, at round 1');

    // reading
    const day = new Date().toISOString().slice(0, 10);
    const one = await (await fetch(`${srv.base}/games?day=${day}`)).json();
    assert.deepStrictEqual(one.days[0], { day, total: 6, ai: 3, peer: 1, online: 1, puzzle: 1 });
    const none = await (await fetch(`${srv.base}/games?day=2000-01-01`)).json();
    assert.strictEqual(none.days[0].total, 0, 'a day with no games');
    assert.strictEqual((await fetch(`${srv.base}/games?day=yesterday`)).status, 400);
    assert.strictEqual((await fetch(`${srv.base}/games?days=0`)).status, 400);
    assert.strictEqual((await fetch(`${srv.base}/games?days=999`)).status, 400);
    console.log('ok   GET /games: by day and kind');
    console.log('all games checks passed');
  } finally { srv.stop(); }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
