// The DEV playlist (2026-11-10): the songs in UNASSIGNED (not given to a map yet) are for developer accounts only.
//  - a developer's playlist panel has a DEV tab with those songs, after All music; picking it plays them, and the
//    pick is still there after a reload (before the account code has run, the account kept on the device decides)
//  - a developer can put them in a playlist of their own
//  - a player who isn't a developer has no DEV tab, no unassigned songs in All music or the picker, and a playlist
//    of their own that has one plays without it
//  - signed out (the session ran out): the DEV songs stop at once and the menu goes back to the Menu Playlist
// The game server is faked (page.route), so no network is needed. Starts its own static server on 8767.
// Run: node tools/tests/music-dev-ui.js
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ctx2d = require('./board2d');
const EXE = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let bad = 0; const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) bad++; };
setTimeout(() => { console.error('test timed out'); process.exit(1); }, 3 * 60 * 1000).unref();
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const DEV_SONGS = ['evening', 's4knandet', 'eyesInTheFront2Battle'];
const player = (dev) => ({ id: 'p0123456789abcdef', tag: dev ? 'Dev' : 'Player', dev, google: false, titles: [], skins: [] });
const SESSION = 'a'.repeat(64);

(async () => {
  const srv = http.createServer((q, s) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; return s.end(); }
    s.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream'); s.end(fs.readFileSync(f));
  }).listen(8767);
  const b = await chromium.launch({ executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
  const open = async (dev, extra) => {
    const ctx = await ctx2d(b, { viewport: { width: 390, height: 844 } });
    // the game server: every account answer says who this is; a sign-out works
    await ctx.route('http://fake.server/**', (r) => {
      const u = r.request().url();
      if (u.includes('/account/logout')) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      if (u.includes('/account/')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ player: player(dev), session: SESSION }) });
      return r.fulfill({ status: 404, body: '' });
    });
    await ctx.addInitScript(([a, x]) => {
      try {
        if (sessionStorage.getItem('dev-test')) return; // kept over a reload
        sessionStorage.setItem('dev-test', '1');
        localStorage.removeItem('phonebellum.sound.v1'); localStorage.setItem('pb-stay', '1');
        localStorage.setItem('phonebellum.account.v1', JSON.stringify(a));
        localStorage.setItem('phonebellum.playlists.v1', JSON.stringify({ lists: x ? [x] : [], owner: '', dirty: false, gone: [] }));
      } catch (e) {}
    }, [{ ...player(dev), session: SESSION, ts: Date.now() }, extra || null]);
    const p = await ctx.newPage();
    p.on('pageerror', e => { console.log('PAGE ERROR', e.message); bad++; });
    await p.goto('http://127.0.0.1:8767/?test&server=http://fake.server');
    await p.waitForSelector('#go', { timeout: 30000 });
    await p.mouse.click(5, 400); await sleep(600); // the first tap starts the sound
    return { ctx, p };
  };
  const tabs = (p) => p.$$eval('#mp-pop .mp-tab', x => x.map(e => e.dataset.tab));
  const songsOf = (p) => p.$$eval('#mp-pop [data-song]', x => x.map(e => e.dataset.song));
  const M = (p) => p.evaluate(() => window.__music());
  try {
    // ---- a developer
    let { ctx, p } = await open(true);
    ok((await p.evaluate(() => window.__acct().dev)) === true, 'signed in as a developer');
    await p.click('#mp-now'); await sleep(500);
    let t = await tabs(p);
    ok(t.join('|') === 'menu|all|dev|+', 'a developer\'s tabs: ' + t.join(', '));
    ok(/DEV/.test(await p.textContent('#mp-pop [data-tab="dev"]')), 'the tab is called DEV');
    await p.click('#mp-pop [data-tab="all"]'); await sleep(200);
    const all = await songsOf(p);
    ok(!DEV_SONGS.some(id => all.includes(id)), 'All music: still without the unassigned songs');
    await p.click('#mp-pop [data-tab="dev"]'); await sleep(200);
    const dev = await songsOf(p);
    ok(dev.join() === DEV_SONGS.join(), 'DEV: the unassigned songs: ' + dev.join(', '));
    ok(/developers only/.test(await p.textContent('#mp-pop .mp-hd small')), 'its line says developers only');
    await p.click('#mp-pop [data-song="s4knandet"]'); await sleep(500);
    let s = await M(p);
    ok(s.src === 'dev' && s.song === 's4knandet' && s.playing.join() === 'menu', 'a DEV song plays on the menu: ' + JSON.stringify({ src: s.src, song: s.song }));
    await p.click('#mp-pop [data-tab="+"]'); await sleep(200);
    const picks = await p.$$eval('#mp-pop [data-pick]', x => x.map(e => e.dataset.pick));
    ok(DEV_SONGS.every(id => picks.includes(id)), 'a new playlist can have the DEV songs');
    await p.click('#mp-pop [data-pick="evening"]'); await p.click('#mp-pop [data-pick="jonah"]'); await p.click('#mp-save'); await sleep(300);
    s = await M(p);
    ok(s.lists.length === 1 && s.lists[0].songs.join() === 'evening,jonah', 'saved: ' + JSON.stringify(s.lists));
    const own = s.lists[0];
    ok((await songsOf(p)).join() === 'evening,jonah', 'the developer\'s own playlist plays both');
    // a reload: the DEV pick is kept
    await p.click('#mp-pop [data-tab="dev"]'); await sleep(100); await p.click('#mp-pop [data-song="evening"]'); await sleep(300);
    await p.reload(); await p.waitForSelector('#go', { timeout: 30000 }); await p.mouse.click(5, 400); await sleep(800);
    s = await M(p);
    ok(s.src === 'dev' && DEV_SONGS.includes(s.song), 'after a reload the menu still plays DEV: ' + JSON.stringify({ src: s.src, song: s.song }));
    await ctx.close();

    // ---- not a developer, with a playlist that has an unassigned song in it (made by a developer's account, say)
    ({ ctx, p } = await open(false, { ...own, songs: ['evening', 'jonah', 's4knandet'] }));
    ok((await p.evaluate(() => window.__acct().dev)) === false, 'signed in, not a developer');
    await p.click('#mp-now'); await sleep(500);
    t = await tabs(p);
    ok(t.join('|') === `menu|all|u:${own.id}|+`, 'no DEV tab: ' + t.join(', '));
    await p.click('#mp-pop [data-tab="all"]'); await sleep(200);
    const all2 = await songsOf(p);
    ok(all2.length && !DEV_SONGS.some(id => all2.includes(id)), 'All music: no unassigned songs');
    await p.click(`#mp-pop [data-tab="u:${own.id}"]`); await sleep(200);
    ok((await songsOf(p)).join() === 'jonah', 'their own playlist plays without the unassigned songs');
    await p.click('#mp-pop [data-tab="+"]'); await sleep(200);
    const picks2 = await p.$$eval('#mp-pop [data-pick]', x => x.map(e => e.dataset.pick));
    ok(!DEV_SONGS.some(id => picks2.includes(id)) && picks2.length === all2.length, 'a new playlist is made from All music only');
    await ctx.close();

    // ---- a developer's session runs out (the server answers 401): signed out, the DEV tab goes at once
    let gone = false;
    ({ ctx, p } = await open(true));
    await ctx.route('http://fake.server/account/me', (r) => gone ? r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }) : r.fallback());
    await p.click('#mp-now'); await sleep(400);
    await p.click('#mp-pop [data-tab="dev"]'); await sleep(100); await p.click('#mp-pop [data-song="evening"]'); await sleep(300);
    ok((await M(p)).src === 'dev', 'playing DEV');
    await p.click('#mp-close'); await sleep(400);
    gone = true;
    await p.click('#acct-open'); await sleep(800); // the account sheet asks the server again (acctRefresh)
    s = await M(p);
    ok((await p.evaluate(() => window.__acct().acct)) === null, 'signed out');
    ok(s.src === 'menu' && !DEV_SONGS.includes(s.song), 'signed out: back to the Menu Playlist: ' + JSON.stringify({ src: s.src, song: s.song }));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(bad ? `${bad} DEV playlist check(s) failed` : 'all DEV playlist checks passed');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
