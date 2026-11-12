// Server step 5 check: accounts. Starts the server locally with a fresh local D1 database (added to a copy of
// wrangler.toml while the real block is still commented out), a test Google client id, and a local key server that
// plays Google's: this test signs its own ID tokens with an RSA key it made, since tests can't reach Google. Checks:
//  - the switch: without the database the routes answer 503 (checked by reading the config, not by a second server)
//  - origin check and the preflight
//  - guests: id, gamertag, session; /me; renaming; bad tags and tokens refused
//  - Google: a guest who signs in keeps their id ('guest'); a new phone finds the same player ('existing');
//    a fresh Google account makes a new player ('new'); bad audience, issuer, expiry, signature, key id refused
//  - sessions: rotation with a short grace for the old token, sign out (one / all), at most 10 per player
//  - deleting an account: sessions and login gone, the same Google account then makes a new player
//  - the per-IP limit on guest creation
// Run: cd server && npm test
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sleep } = require('./harness.js');
const { CLIENT, KID, other, b64, idToken, startAccounts } = require('./accounts-env.js');

const ORIGIN = 'http://localhost:8766';
setTimeout(() => { console.error('test timed out'); process.exit(1); }, 4 * 60 * 1000).unref();

(async () => {
  // the switch: while wrangler.toml's D1 block is commented out, the live server answers 'accounts off'
  const conf = fs.readFileSync(path.join(__dirname, '../wrangler.toml'), 'utf8');
  assert.ok(/^#?\s*\[\[d1_databases\]\]/m.test(conf), 'wrangler.toml mentions the accounts database');
  assert.ok(/if \(!db\) return json\(\{ error: 'accounts off' \}, 503/.test(fs.readFileSync(path.join(__dirname, '../src/accounts.js'), 'utf8')));
  const srv = await startAccounts(8795, { ACCOUNT_ROTATE_MS: 1500, ACCOUNT_GOOGLE_RATE: 60, DEV_EMAILS: 'Dev@Example.com, other@example.com' });

  const call = async (route, body, token, origin = ORIGIN) => {
    const headers = { 'content-type': 'application/json' };
    if (origin) headers.Origin = origin;
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = await fetch(`${srv.base}/account/${route}`, { method: 'POST', headers, body: body === undefined ? '' : JSON.stringify(body) });
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, ...j, headers: r.headers };
  };
  const ok = async (route, body, token) => { const r = await call(route, body, token); assert.strictEqual(r.status, 200, `${route}: ${r.status} ${JSON.stringify(r)}`); return r; };

  try {
    // ----- origin and preflight -----
    assert.strictEqual((await call('guest', {}, null, null)).status, 403, 'no origin');
    assert.strictEqual((await call('guest', {}, null, 'https://evil.example')).status, 403, 'other origin');
    const pre = await fetch(`${srv.base}/account/me`, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization' } });
    assert.strictEqual(pre.status, 204);
    assert.strictEqual(pre.headers.get('access-control-allow-origin'), ORIGIN);
    assert.ok(/authorization/.test(pre.headers.get('access-control-allow-headers')));
    assert.strictEqual((await call('nope', {})).status, 404);
    assert.strictEqual((await fetch(`${srv.base}/account/me`, { headers: { Origin: ORIGIN } })).status, 405, 'GET refused');

    // ----- guests -----
    const g = await ok('guest', {});
    assert.ok(/^p[0-9a-f]{16}$/.test(g.player.id), 'player id');
    assert.ok(/^Guest \d{4}$/.test(g.player.tag), 'guest gamertag');
    assert.strictEqual(g.player.google, false);
    assert.ok(/^[0-9a-f]{64}$/.test(g.session), 'session token');
    assert.strictEqual(g.headers.get('access-control-allow-origin'), ORIGIN);
    const named = await ok('guest', { tag: '  Snet   Ända ' });
    assert.strictEqual(named.player.tag, 'Snet Ända', 'tag cleaned, Swedish letters kept');
    for (const bad of ['a', 'x'.repeat(17), '<b>', 'hi\u0000', 42]) assert.strictEqual((await call('guest', { tag: bad })).status, 400, `bad tag ${JSON.stringify(bad)}`);
    assert.strictEqual((await call('guest', [1])).status, 400, 'body must be an object');
    assert.strictEqual((await call('guest', 'x'.repeat(9000))).status, 413, 'body too big');

    assert.strictEqual((await ok('me', {}, g.session)).player.id, g.player.id);
    assert.strictEqual((await call('me', {})).status, 401, 'no token');
    assert.strictEqual((await call('me', {}, 'f'.repeat(64))).status, 401, 'unknown token');
    assert.strictEqual((await call('me', {}, 'not-hex')).status, 401, 'malformed token');
    assert.strictEqual((await ok('tag', { tag: 'Vilhelm' }, g.session)).player.tag, 'Vilhelm');
    assert.strictEqual((await call('tag', { tag: '' }, g.session)).status, 400);
    assert.strictEqual((await call('tag', { tag: 'Vilhelm' })).status, 401, 'rename needs a session');

    // ----- Google -----
    const sub = '1111' + crypto.randomInt(1e9);
    const s1 = await ok('google', { credential: idToken({ sub }) }, g.session);
    assert.strictEqual(s1.linked, 'guest', 'the guest is kept');
    assert.strictEqual(s1.player.id, g.player.id);
    assert.strictEqual(s1.player.tag, 'Vilhelm');
    assert.strictEqual(s1.player.google, true);
    assert.strictEqual((await call('me', {}, g.session)).status, 401, 'the guest session ends at sign-in');
    const s2 = await ok('google', { credential: idToken({ sub }) });
    assert.strictEqual(s2.linked, 'existing', 'a new phone finds the player');
    assert.strictEqual(s2.player.id, g.player.id);
    const s3 = await ok('google', { credential: idToken({ sub }) }, named.session);
    assert.strictEqual(s3.player.id, g.player.id, 'a guest signing into a known Google account becomes that player');
    const fresh = await ok('google', { credential: idToken() });
    assert.strictEqual(fresh.linked, 'new');
    assert.notStrictEqual(fresh.player.id, g.player.id);
    // a signed-in player signing into another Google account gets that account's player, not a second login
    const other1 = await ok('google', { credential: idToken() }, s2.session);
    assert.strictEqual(other1.linked, 'new');
    assert.strictEqual((await call('me', {}, s2.session)).status, 401, 'the session that switched accounts ends');

    // ----- developer mode: a verified email in DEV_EMAILS, decided at each sign-in, never for guests -----
    assert.strictEqual(g.player.dev, false, 'a guest is not a developer');
    assert.strictEqual(s1.player.dev, false, 'an email not in the list');
    const devSub = '2222' + crypto.randomInt(1e9);
    const dv = await ok('google', { credential: idToken({ sub: devSub, email: 'dev@example.COM', email_verified: true }) });
    assert.strictEqual(dv.player.dev, true, 'a listed, verified email is a developer (case ignored)');
    assert.strictEqual((await ok('me', {}, dv.session)).player.dev, true, 'and stays one');
    // the weekly boss's leaderboard (2026-11-12): any account (developers only at first). The page sends a run's record and the server plays it
    // again (Boss.replay, in a Durable Object): the board holds what the replay got. Only a better run replaces a
    // player's row; best first (a kill, the earlier round, the earlier second; else the more damage). The runs here are
    // the prototype's own plans, played by tools/boss with the same rules
    {
      const BT = require('../../tools/boss/mommy.js'), BP = require('../../tools/boss/plans.js');
      const played = (name) => { const res = BP.runPlan(BP.PLANS[name]), last = res.log[res.log.length - 1];
        return { run: JSON.parse(JSON.stringify(res.m.boss.run)), won: !!res.won, round: res.rounds, secs: Math.round(last.end * 100) / 100 }; };
      const coast = played('Coaster: bank gold, burst late'), lineB = played('Line B: read each round (no tank in round 4)'), best3 = played('Search best, rounds 1-3');
      assert.ok(!coast.won && lineB.won && best3.won && best3.round < lineB.round, 'the test\'s runs: one she survives, a kill, an earlier kill');
      const rules = BT.Boss.rulesTag(BT.units);
      const board = async (q) => { const r = await fetch(`${srv.base}/leaderboard/boss?${q}`, { headers: { Origin: ORIGIN } }); return { status: r.status, ...(await r.json()) }; };
      const send = (x, o) => ({ boss: 'mommy', rules, run: x.run, ...o });
      assert.strictEqual((await call('boss', send(lineB))).status, 401, 'nor can nobody');
      assert.strictEqual((await call('boss', send(lineB, { boss: 'daddy' }), dv.session)).status, 400, 'an unknown boss is refused');
      const other = await call('boss', send(lineB, { rules: 'abc1' }), dv.session);
      assert.ok(other.status === 409 && other.rules === rules, 'a page with other rules than the server\'s is told so');
      for (const bad of [null, 5, {}, { seed: 1 }, { seed: 1, rounds: [] }, { seed: -1, rounds: coast.run.rounds }, { seed: coast.run.seed, rounds: coast.run.rounds.slice(0, 2) }]) {
        const r = await call('boss', send({ run: bad }), dv.session);
        assert.ok(r.status === 400 || r.status === 422, 'a record that isn\'t a finished run is refused: ' + JSON.stringify(bad).slice(0, 60) + ' -> ' + r.status);
      }
      // cheats: a squad a level higher than its experience allows, a squad the gold doesn't reach, a kill claimed on top
      const cheat = (f) => { const c = JSON.parse(JSON.stringify(lineB.run)); f(c); return { run: c }; };
      for (const [what, c] of [['a level it hasn\'t earned', cheat((c) => { c.rounds[0].army[0][4] = 3; })],
        ['squads the gold doesn\'t reach', cheat((c) => { for (let k = 0; k < 6; k++) c.rounds[0].army.push([50 + k, 'Ether Golem', k, 12, 0, 0, 0]); })],
        ['a banned unit', cheat((c) => { c.rounds[0].army.push([60, 'Assassin', 0, 12, 0, 0, 0]); })],
        ['a squad in her zone', cheat((c) => { c.rounds[0].army[0][3] = 3; })]]) {
        const r = await call('boss', send(c), dv.session);
        assert.ok(r.status === 422 && typeof r.why === 'string' && r.why, `a run with ${what} is refused: ${r.status} ${r.why || ''}`);
      }
      let br = await ok('boss', send(coast, { won: true, round: 1, secs: 1, dmg: 99999 }), dv.session);
      assert.ok(br.improved && br.run.won === false && br.rows.length === 1 && br.rows[0].id === dv.player.id && br.rows[0].won === false, 'a first run is on the board as the replay found it, whatever the page claims');
      br = await ok('boss', send(lineB), dv.session);
      assert.ok(br.improved && br.run.won === true && br.run.round === lineB.round && br.run.secs === lineB.secs && br.rows[0].won === true, 'a kill replaces it, with the round and second the tools got');
      br = await ok('boss', send(coast), dv.session);
      assert.ok(!br.improved && br.run.won === false && br.best.won === true && br.best.round === lineB.round && br.rows.length === 1, 'a worse run doesn\'t (one row a player)');
      const d2 = await ok('google', { credential: idToken({ sub: '3333' + crypto.randomInt(1e9), email: 'other@example.com', email_verified: true }) });
      br = await ok('boss', send(best3), d2.session);
      assert.ok(br.improved && br.run.round === best3.round, 'another developer\'s earlier kill');
      // the reward: a kill within three rounds gives her brood's look for the Spiders, once; a later kill gives nothing
      const hollow = (pl) => pl.skins.find((k) => k.id === 'spiders-hollow');
      assert.ok(best3.round <= 3 && br.reward === 'spiders-hollow' && hollow(br.player) && hollow(br.player).worn === true, 'a kill within three rounds gives the Sporespreader Spider skin, worn');
      assert.ok(hollow((await ok('me', {}, d2.session)).player).worn === true, 'and it stays');
      assert.deepStrictEqual(br.titles, ['crawler', 'widowmaker'], 'a kill within three rounds gives the black Widowmaker title too, and Crawler (a faster kill earns the slower rewards)');
      assert.ok(br.player.titles.includes('widowmaker') && br.player.titles.includes('crawler'), 'both on the account');
      assert.ok((await ok('me', {}, d2.session)).player.titles.includes('widowmaker'), 'and it stays');
      assert.strictEqual((await ok('title', { title: 'widowmaker' }, d2.session)).player.title, 'widowmaker', 'and it can be picked to show');
      const again = await ok('boss', send(best3), d2.session);
      assert.ok(!again.reward && !again.titles && !again.player, 'the same kill again gives nothing new');
      const dvT = (await ok('me', {}, dv.session)).player.titles;
      assert.ok(lineB.round === 5 && dvT.includes('crawler') && !dvT.includes('widowmaker'), 'a kill in round ' + lineB.round + ' gives Crawler, not Widowmaker');
      assert.strictEqual((await call('title', { title: 'widowmaker' }, dv.session)).status, 400, 'nor can it be picked without it');
      assert.ok(lineB.round > 3 && hollow((await ok('me', {}, dv.session)).player).worn === false, 'a kill in a later round didn\'t give it (a developer only has it to try, off)');
      const bb = await board('boss=mommy');
      assert.deepStrictEqual(bb.rows.map((r) => [r.id, r.won, r.round]), [[d2.player.id, true, best3.round], [dv.player.id, true, lineB.round]], 'the board: the earlier round first');
      assert.ok(bb.rules === rules && typeof bb.rows[0].tag === 'string' && bb.rows[0].tag && !('dev' in bb.rows[0]), 'rows carry the gamertag, not the account\'s flags');
      assert.strictEqual((await board(`boss=mommy&rules=${rules}`)).rows.length, 2, 'the same board by its rules');
      assert.strictEqual((await board('boss=mommy&rules=none')).rows.length, 0, 'another set of rules is another (empty) board');
      assert.strictEqual((await board('boss=daddy')).status, 400, 'an unknown boss is refused');
      // open to everyone: an account that isn't a developer's reports a run too, and it goes on the board
      assert.strictEqual(s1.player.dev, false, 'the test\'s plain account isn\'t a developer');
      br = await ok('boss', send(coast), s1.session);
      assert.ok(br.improved && br.run.won === false && br.rows.some((r) => r.id === s1.player.id), 'a plain account\'s run is on the board');
      assert.deepStrictEqual((await board('boss=mommy')).rows.map((r) => r.id), [d2.player.id, dv.player.id, s1.player.id], 'after the kills, as the runs rank');
    }
    const unv = await ok('google', { credential: idToken({ email: 'other@example.com', email_verified: false }) });
    assert.strictEqual(unv.player.dev, false, 'an unverified email is not');
    const dv2 = await ok('google', { credential: idToken({ sub: devSub, email: 'new@example.com', email_verified: true }) });
    assert.strictEqual(dv2.player.dev, false, 'taken away when the account\'s email is no longer listed');

    const bad = {
      audience: idToken({ aud: 'someone-else' }), issuer: idToken({ iss: 'https://evil.example' }),
      expired: idToken({ exp: Math.floor(Date.now() / 1000) - 600 }), future: idToken({ iat: Math.floor(Date.now() / 1000) + 3600 }),
      signature: idToken({}, { key: other.privateKey }), kid: idToken({}, { kid: 'nope' }), subject: idToken({ sub: 'a b' }),
      tampered: (() => { const t = idToken({ sub }).split('.'); t[1] = b64({ iss: 'accounts.google.com', aud: CLIENT, sub: '999', exp: 9e9 }); return t.join('.'); })(),
      garbage: 'abc.def.ghi', none: b64({ alg: 'none', kid: KID }) + '.' + b64({ sub: '1', aud: CLIENT, iss: 'accounts.google.com', exp: 9e9 }) + '.',
    };
    for (const [why, cred] of Object.entries(bad)) assert.strictEqual((await call('google', { credential: cred })).status, 401, `refused: ${why}`);
    assert.strictEqual((await call('google', {})).status, 401, 'no credential');

    // ----- sessions -----
    await sleep(1700);   // older than the test rotation (1.5 s)
    const rot = await ok('me', {}, s3.session);
    assert.ok(rot.session && rot.session !== s3.session, 'rotated');
    assert.strictEqual((await ok('me', {}, s3.session)).player.id, g.player.id, 'old token works for a short grace');
    const after = await ok('me', {}, rot.session);
    assert.ok(!after.session, 'a fresh token is not rotated again');
    await ok('signout', {}, rot.session);
    assert.strictEqual((await call('me', {}, rot.session)).status, 401, 'signed out');
    assert.strictEqual((await ok('me', {}, s1.session)).player.id, g.player.id, 'other phones stay signed in');
    const many = [];
    for (let i = 0; i < 11; i++) many.push((await ok('google', { credential: idToken({ sub }) })).session);
    assert.strictEqual((await call('me', {}, many[0])).status, 401, 'at most 10 sessions: the oldest goes');
    assert.strictEqual((await ok('me', {}, many[10])).player.id, g.player.id);
    await ok('signout', { all: true }, many[10]);
    for (const t of [s1.session, many[5]]) assert.strictEqual((await call('me', {}, t)).status, 401, 'signed out everywhere');

    // ----- music: the player's settings and own playlists, kept on the account -----
    const mg = await ok('guest', {});
    assert.strictEqual(mg.player.music, null, 'no music saved yet');
    assert.strictEqual((await call('music', { music: {} })).status, 401, 'music needs a session');
    assert.strictEqual((await call('music', { music: 'x' }, mg.session)).status, 400, 'music must be an object');
    const mSent = { prefs: { vol: 140, muted: true, shuffle: 1, repeat: false, sfxVol: 30, src: 'u:abc', song: 'jonah', extra: 'dropped' },
      playlists: [{ id: 'abc', name: '  Road   <b>trip</b> ', songs: ['jonah', 'sisi', 'jonah', 'bad id!', 42] }, { id: 'abc', name: 'duplicate id', songs: [] },
        { id: 'BAD', name: 'bad id', songs: [] }, { id: 'n1', name: '   ', songs: [] }, { id: 'x2', name: 'x'.repeat(40), songs: [] }] };
    const mu = await ok('music', { music: mSent }, mg.session);
    assert.deepStrictEqual(mu.music.prefs, { vol: 100, muted: true, shuffle: true, repeat: false, sfx: true, sfxVol: 30, chatOn: true, emotesOn: true, src: 'u:abc', song: 'jonah' }, 'prefs cleaned');
    assert.deepStrictEqual(mu.music.playlists, [{ id: 'abc', name: 'Road btrip/b', songs: ['jonah', 'sisi'] }, { id: 'x2', name: 'x'.repeat(24), songs: [] }], 'playlists cleaned');
    assert.deepStrictEqual((await ok('me', {}, mg.session)).player.music, mu.music, 'the account keeps it');
    assert.strictEqual((await ok('music', { music: { prefs: { src: 'nope' } } }, mg.session)).music.prefs.src, 'menu', 'an unknown playlist source: the menu');
    const big = { playlists: Array.from({ length: 30 }, (_, i) => ({ id: 'p' + i, name: 'List ' + i, songs: Array.from({ length: 100 }, (_, k) => 'song' + k) })) };
    assert.strictEqual((await call('music', { music: big }, mg.session)).status, 413, 'too big');
    big.playlists.length = 25; big.playlists.forEach((x) => { x.songs.length = 90; });
    const capped = await call('music', { music: big }, mg.session);
    if (capped.status === 200) { assert.strictEqual(capped.music.playlists.length, 20, 'at most 20 playlists'); assert.strictEqual(capped.music.playlists[0].songs.length, 80, 'at most 80 songs each'); }
    else assert.strictEqual(capped.status, 413);

    // ----- delete -----
    const d = await ok('google', { credential: idToken({ sub }) });
    await ok('delete', {}, d.session);
    assert.strictEqual((await call('me', {}, d.session)).status, 401);
    const again = await ok('google', { credential: idToken({ sub }) });
    assert.strictEqual(again.linked, 'new', 'a deleted account is not found again');
    assert.notStrictEqual(again.player.id, g.player.id);

    // ----- per-IP limit on guests: 20 requests an hour, refused ones included (8 counted above) -----
    let sent = 8, status = 200;
    while (status !== 429 && sent < 40) { status = (await call('guest', {})).status; sent++; }
    assert.strictEqual(status, 429, 'guest creation is limited');
    assert.strictEqual(sent, 21, 'the 21st in an hour is refused');

    assert.ok(!/[0-9a-f]{64}/.test(srv.log()), 'no session token in the server log');
    console.log('accounts test: all checks passed');
  } catch (e) {
    console.error(e); console.error(srv.log().slice(-3000)); process.exitCode = 1;
  } finally {
    srv.stop();
    setTimeout(() => process.exit(), 500);
  }
})();
