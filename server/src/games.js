// Games played (2026-11-10): how many games were played each day, and nothing else about them.
//
// One Durable Object (GamesRoom, named 'all') with its own SQLite. A game counts once, when its first round is fought:
//   - online (server-refereed) matches: the Room counts it itself (room.js record, round 1), kind 'online'
//   - the rest only the page knows about: POST /games { kind, d, s } from the page (site-template.html countGame)
//     kind: 'ai' (vs the computer, tournament bot matches too), 'peer' (phone to phone, sent by the host only),
//     'puzzle' (the tutorial and tutorial puzzles)
//     d: the page's device id (the same one /online uses), s: the match seed. A (device, seed) pair counts once, so a
//     reload or a second send doesn't count the game twice. Pairs are forgotten after SEEN_DAYS; counts are kept.
// Days are UTC dates (YYYY-MM-DD).
//
// Reading: GET /games?days=N (the last N days, newest first; default 7, at most 366) or GET /games?day=YYYY-MM-DD:
//   { days: [{ day, total, ai, peer, online, puzzle }] }
// Only counts are kept, so reading needs no account. A page could send made-up games; GAMES.perIpDay keeps one IP
// from adding more than a household plausibly plays, and the online count can't be sent from a page at all.
import { DurableObject } from 'cloudflare:workers';
import { json } from './limits.js';

export const GAMES = {
  kinds: ['ai', 'peer', 'online', 'puzzle'],
  pageKinds: ['ai', 'peer', 'puzzle'], // what a page may send; 'online' is the server's own
  perIpDay: 300,                       // games one IP may add in a UTC day (in memory, so a sleep only makes it kinder)
  seenDays: 2,                         // how long a (device, seed) pair is remembered
  maxDays: 366,
};
const DAY_MS = 24 * 3600 * 1000;
const SEED_RE = /^[a-z0-9]{1,13}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const dayOf = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

export class GamesRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS counts (day TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, kind))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS seen (k TEXT PRIMARY KEY, time INTEGER NOT NULL)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS seen_time ON seen (time)');
    this.ips = new Map(); // ip hash -> { day, n }
  }

  // Counts one game. key: a string that names the game (null: always count). Returns true if it was counted.
  async add(kind, key, ip, now = Date.now()) {
    if (!GAMES.kinds.includes(kind)) return false;
    const day = dayOf(now);
    if (ip) {
      const r = this.ips.get(ip);
      if (r && r.day === day && r.n >= GAMES.perIpDay) return false;
      if (!r || r.day !== day) { if (this.ips.size > 20000) this.ips.clear(); this.ips.set(ip, { day, n: 1 }); } else r.n++;
    }
    if (key) {
      if (this.sql.exec('SELECT 1 FROM seen WHERE k = ?', key).toArray().length) return false;
      this.sql.exec('INSERT INTO seen (k, time) VALUES (?, ?)', key, now);
      if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + DAY_MS);
    }
    this.sql.exec('INSERT INTO counts (day, kind, n) VALUES (?, ?, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1', day, kind);
    return true;
  }

  // the daily clean-up of remembered pairs (the counts stay)
  async alarm() {
    this.sql.exec('DELETE FROM seen WHERE time < ?', Date.now() - GAMES.seenDays * DAY_MS);
    if (this.sql.exec('SELECT COUNT(*) AS n FROM seen').one().n) await this.ctx.storage.setAlarm(Date.now() + DAY_MS);
  }

  // [{ day, total, ai, peer, online, puzzle }], newest first; days with no games are left out
  days(from, to) {
    const out = new Map();
    for (const r of this.sql.exec('SELECT day, kind, n FROM counts WHERE day >= ? AND day <= ? ORDER BY day DESC', from, to).toArray()) {
      if (!out.has(r.day)) out.set(r.day, { day: r.day, total: 0, ...Object.fromEntries(GAMES.kinds.map((k) => [k, 0])) });
      const d = out.get(r.day); d[r.kind] = r.n; d.total += r.n;
    }
    return [...out.values()];
  }

  // POST (a page counting a game) and GET (the counts); the worker (index.js) has checked the origin of a POST and
  // puts the IP's hash in x-ip
  async fetch(request) {
    const url = new URL(request.url);
    const cors = {};
    const origin = request.headers.get('x-origin');
    if (origin) { cors['access-control-allow-origin'] = origin; cors.vary = 'Origin'; }
    if (request.method === 'POST') {
      let b = null;
      try { const text = await request.text(); if (text.length <= 512) b = JSON.parse(text); } catch { b = null; }
      if (!b || typeof b !== 'object' || !GAMES.pageKinds.includes(b.kind) || typeof b.d !== 'string' || !/^[a-z0-9]{8,32}$/.test(b.d)
        || typeof b.s !== 'string' || !SEED_RE.test(b.s)) return json({ error: 'bad game' }, 400, cors);
      const counted = await this.add(b.kind, `${b.kind}:${b.d}:${b.s}`, request.headers.get('x-ip') || '');
      return json({ ok: true, counted }, 200, cors);
    }
    const now = Date.now();
    const day = url.searchParams.get('day');
    if (day != null) {
      if (!DAY_RE.test(day)) return json({ error: 'day must be YYYY-MM-DD' }, 400, cors);
      const d = this.days(day, day)[0] || { day, total: 0, ...Object.fromEntries(GAMES.kinds.map((k) => [k, 0])) };
      return json({ days: [d] }, 200, cors);
    }
    const raw = url.searchParams.get('days');
    const n = raw == null || raw === '' ? 7 : Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > GAMES.maxDays) return json({ error: `days must be 1-${GAMES.maxDays}` }, 400, cors);
    return json({ days: this.days(dayOf(now - (n - 1) * DAY_MS), dayOf(now)) }, 200, cors);
  }
}
