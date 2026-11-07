// Music anywhere outside battle (2026-11-05, docs/HANDOFF-POLISH.md §1) and the playlist panel (2026-11-07), vs AI on the 2D board:
//  - the main menu has its player and no round music button; Now playing rolls the playlist panel up out of that player,
//    which stays where it is: tabs Menu Playlist, All music, the player's own playlists and +
//  - + makes a playlist from All music (kept on the device); picking it plays it; Edit and Delete
//  - in a match the note beside the Settings cog opens the panel docked over a player (play / pause, back, next,
//    shuffle, repeat); the first tab is "<map> Adaptive music", then the same playlists
//  - deploy starts on the map's music; a song or playlist picked in deploy ("my music") plays instead, and keeps
//    playing into the battle (where the note is hidden) and the result; the Adaptive music tab's Play goes back to the map's
//  - Pause and Play in a match; Music Off in Settings silences it, and Play turns music back on
//  - a new match starts on the map's music again
// Starts its own static server on 8762. Run: node tools/tests/music-ui.js [screenshot-dir]
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ctx2d = require('./board2d');
const EXE = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(f => fs.existsSync(f));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let bad = 0; const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) bad++; };
setTimeout(() => { console.error('test timed out'); process.exit(1); }, 4 * 60 * 1000).unref();
const SHOTS = process.argv[2] || '';
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

(async () => {
  const srv = http.createServer((q, s) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; return s.end(); }
    s.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream'); s.end(fs.readFileSync(f));
  }).listen(8762);
  const b = await chromium.launch({ executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const ctx = await ctx2d(b, { viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('music-test')) { localStorage.removeItem('phonebellum.sound.v1'); localStorage.removeItem('phonebellum.playlists.v1'); sessionStorage.setItem('music-test', '1'); } } catch (e) {} }); // fresh sound settings, kept over the reload
    const p = await ctx.newPage();
    p.on('pageerror', e => { console.log('PAGE ERROR', e.message); bad++; });
    const M = () => p.evaluate(() => window.__music());
    const shot = (n) => SHOTS ? p.screenshot({ path: `${SHOTS}/music-${n}.png` }) : null;
    const vis = (sel) => p.locator(sel).isVisible();
    await p.goto('http://127.0.0.1:8762/?test');
    await p.waitForSelector('#go', { timeout: 30000 });
    await p.mouse.click(5, 400); await sleep(600); // the first tap starts the sound
    let s = await M();
    ok(s.playing.join() === 'menu' && s.src === 'menu', 'the menu plays the menu playlist: ' + s.playing);
    ok(!(await vis('#music-fab')), 'the main menu: no round music button (it has its player)');
    ok(/Menu Playlist/.test(await p.textContent('#mp-label')), 'the player says Menu Playlist');

    // the panel rolls up out of the menu's player, which stays put
    const before = await p.locator('#home .mplayer').boundingBox();
    await p.click('#mp-now'); await sleep(600);
    ok(await vis('#mp-pop.anchor .mp-panel'), 'Now playing: the panel opens on the menu\'s player');
    const after = await p.locator('#home .mplayer').boundingBox(), panel = await p.locator('#mp-panel').boundingBox();
    ok(Math.abs(after.y - before.y) < 1 && Math.abs(after.x - before.x) < 1, 'the player stays where it was');
    ok(Math.abs(panel.y + panel.height - after.y) < 3 && Math.abs(panel.width - after.width) < 2, 'the panel sits on top of the player, as wide');
    ok(!(await p.locator('#mp-pop').innerText()).includes('Tap a song'), 'no "Tap a song" text');
    const tabs = await p.$$eval('#mp-pop .mp-tab', x => x.map(e => e.textContent.trim()));
    ok(tabs.join('|') === 'Menu Playlist|All music|+', 'tabs: ' + tabs.join(', '));
    ok(await p.getAttribute('[data-tab="menu"]', 'aria-selected') === 'true', 'Menu Playlist is open');
    await shot('menu-panel');
    await p.click('[data-tab="all"]');
    const all = await p.$$eval('#mp-pop [data-song]', (x) => x.map(e => e.dataset.song));
    ok(all.length >= 15 && all.includes('bulgaria') && all.includes('jonah') && all.includes('knarkkungn'), `All music: every song (${all.length}), the map songs too`);
    await p.click('[data-src="all"][data-song="long"]'); await sleep(300);
    s = await M(); ok(s.src === 'all' && s.song === 'long' && s.playing.join() === 'menu', 'a song in All music plays from that list ' + JSON.stringify(s));
    ok(await p.getAttribute('[data-tab="all"]', 'class').then(c => / on/.test(c)), 'its tab is marked as playing');
    // + : a new playlist from All music
    await p.click('[data-tab="+"]');
    ok(await vis('#mp-name'), '+ opens a new playlist');
    ok(await p.isDisabled('#mp-save'), 'nothing to save before a song is picked');
    await p.fill('#mp-name', 'Road trip');
    for (const id of ['sisi', 'knarkkungn', 'jonah']) await p.click(`[data-pick="${id}"]`);
    await p.click('[data-pick="knarkkungn"]'); // and off again
    await shot('menu-new');
    await p.click('#mp-save'); await sleep(200);
    s = await M();
    ok(s.lists.length === 1 && s.lists[0].name === 'Road trip' && s.lists[0].songs.join() === 'sisi,jonah', 'saved: Road trip, sisi and Jonah in the order picked ' + JSON.stringify(s.lists));
    const uid = 'u:' + s.lists[0].id;
    ok(await p.getAttribute(`[data-tab="${uid}"]`, 'aria-selected') === 'true', 'its tab is open');
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('phonebellum.playlists.v1')).lists.length === 1), 'kept on the device');
    await p.click('#mp-playlist'); await sleep(300);
    s = await M(); ok(s.src === uid && s.song === 'sisi' && s.playing.join() === 'menu', 'Play: Road trip from the top ' + JSON.stringify(s));
    ok(/Road trip/.test(await p.textContent('#mp-label')), 'the player says Road trip');
    await shot('menu-mine');
    // Edit adds a song
    await p.click('#mp-edit'); await p.click('[data-pick="long"]'); await p.click('#mp-save'); await sleep(200);
    s = await M(); ok(s.lists[0].songs.join() === 'sisi,jonah,long', 'Edit: Long added');
    // closes on Escape, the chevron or a tap outside; then Now playing again
    await p.keyboard.press('Escape'); await sleep(500);
    ok(!(await vis('#mp-pop')), 'Escape closes it');
    await p.click('#mp-now'); await sleep(500);
    ok(await p.getAttribute(`[data-tab="${uid}"]`, 'aria-selected') === 'true', 'it opens on the playlist playing');
    { const pb = await p.locator('#home .mplayer').boundingBox(); await p.mouse.click(8, Math.min(840, pb.y + pb.height + 12)); } await sleep(500);
    ok(!(await vis('#mp-pop')), 'a tap outside closes it');
    await p.reload(); await p.waitForSelector('#go', { timeout: 30000 }); await p.mouse.click(5, 400); await sleep(600);
    s = await M(); ok(s.src === uid && s.lists.length === 1, 'a reload keeps the playlist and plays it on the menu ' + s.src);

    // a match: deploy on the map's music
    await p.click('#go'); await sleep(1500);
    s = await M();
    ok(s.combo && s.playing.join() === s.combo && !s.mine.on && s.src === 'map', `deploy: the map's music (${s.combo})`);
    ok(await vis('#music-btn') && !(await vis('#music-fab')), 'the note beside the cog in deploy');
    await p.click('#music-btn');
    await p.waitForSelector('#mp-pop.dock .mplayer', { timeout: 5000 }); await sleep(500);
    const mtabs = await p.$$eval('#mp-pop .mp-tab', x => x.map(e => e.textContent.trim()));
    ok(/^(Forest Glade|Meadow|Autumn|Snow|Desert|Ashlands|Moonlit Snow|Savanna|Mushroom Cavern|Frozen Peak|Bridge) Adaptive music$/.test(mtabs[0]) && mtabs.slice(1).join('|') === 'Menu Playlist|All music|Road trip|+', 'match tabs: ' + mtabs.join(', '));
    ok(await p.getAttribute('[data-tab="map"]', 'aria-selected') === 'true', 'Adaptive music first, open');
    ok(/Adaptive music/.test(await p.textContent('#mp-label')), 'the player says Adaptive music');
    for (const id of ['mp-play', 'mp-back', 'mp-next', 'mp-shuffle', 'mp-repeat']) ok(await vis('#mp-pop #' + id), 'the player has ' + id);
    ok(await p.locator('#mp-pop [data-src="map"]').count() >= 2, 'the map\'s deploy and battle songs listed');
    await shot('sheet-map');
    // my music
    await p.click('[data-tab="all"]'); await p.click('[data-src="all"][data-song="jonah"]'); await sleep(400);
    s = await M();
    ok(s.mine.on && s.playing.join() === 'mine' && s.song === 'jonah' && s.src === 'all', 'picking Jonah: it plays instead of the map\'s music ' + JSON.stringify(s));
    ok(await p.getAttribute('[data-src="all"][data-song="jonah"]', 'aria-pressed') === 'true', 'Jonah is marked in the list');
    await shot('sheet-mine');
    // Pause and Play
    await p.click('#mp-play'); await sleep(200);
    s = await M(); ok(!s.playing.length && s.mine.paused, 'Pause: nothing plays');
    await p.click('#mp-play'); await sleep(200);
    s = await M(); ok(s.playing.join() === 'mine' && s.song === 'jonah', 'Play: Jonah again');
    // Next and Back stay in my music
    await p.click('#mp-next'); await sleep(200);
    s = await M(); ok(s.playing.join() === 'mine' && s.song !== 'jonah', 'Next: the next song of the list, still my music (' + s.song + ')');
    await p.click('#mp-back'); await sleep(200);
    s = await M(); ok(s.song === 'jonah', 'Back: Jonah');
    // a playlist in the match
    await p.click(`[data-tab="${uid}"]`); await p.click('#mp-playlist'); await sleep(300);
    s = await M(); ok(s.mine.on && s.src === uid && s.song === 'sisi', 'Road trip plays in the match');
    await p.click('[data-src="' + uid + '"][data-song="jonah"]'); await sleep(300);
    s = await M(); ok(s.song === 'jonah' && s.src === uid, 'Jonah, in Road trip');
    await p.click('#mp-close'); await sleep(500);
    ok(!(await vis('#mp-pop')), 'the chevron closes it');

    // into the battle: my music goes on
    await p.dblclick('[data-pack="0"]'); await sleep(500);
    await p.evaluate(() => { const { m, me } = window.__pb(); for (let ui = 0; ui < m.units.length; ui++) { if (Game.isOff(m, ui, me) || !Game.isUnlocked(m, me, ui)) continue; for (let r = 0; r < 20; r++) for (let c = 0; c < 12; c++) if (Game.canPlaceAt(m, me, c, r, ui) && Game.spotFree(m, me, c, r, ui) && Game.place(m, me, ui, c, r)) { window.__pbRedraw(); return; } } });
    await p.click('#fight'); await sleep(300);
    if (await vis('#cap-go')) await p.click('#cap-go');
    await p.waitForFunction(() => window.__pb().phase === 'battle', null, { timeout: 15000 });
    await sleep(600);
    s = await M();
    ok(s.mine.on && s.playing.join() === 'mine' && s.song === 'jonah' && s.src === uid, 'battle: Jonah keeps playing (not the map\'s battle music) ' + JSON.stringify(s));
    ok(!(await vis('#music-btn')) && !(await vis('#music-fab')), 'no music button in battle');
    await shot('battle');
    await p.click('#skip'); await p.click('#skip').catch(() => {});
    await p.waitForFunction(() => window.__pb().phase === 'result', null, { timeout: 15000 });
    await sleep(300);
    s = await M();
    ok(s.playing.join() === 'mine', 'the result: still my music');
    ok(await vis('#music-btn'), 'the note is back after the battle');
    // Adaptive music: back to the map's combo
    await p.click('#music-btn'); await p.waitForSelector('#mp-pop [data-tab="map"]'); await sleep(400);
    await p.click('[data-tab="map"]'); await p.click('#mp-playlist'); await sleep(300);
    s = await M();
    ok(!s.mine.on && s.combo && s.playing.join() === s.combo && s.src === 'map', `Adaptive music: the map's ${s.combo} again`);
    await p.click('#mp-close'); await sleep(400);
    await p.click('#next').catch(() => {}); await sleep(1200);
    s = await M();
    ok(s.combo && /deploy/.test(s.combo) && s.playing.join() === s.combo, 'round 2 deploy: the map\'s deploy music ' + s.combo);

    // Music Off silences everything; the player's Play turns it on again
    await p.click('#music-btn'); await sleep(400); await p.click('[data-tab="all"]'); await p.click('[data-src="all"][data-song="sisi"]'); await sleep(200);
    await p.click('#mp-close'); await sleep(400); await p.click('#cog'); await p.click('[data-mute="1"]'); await sleep(200);
    s = await M(); ok(!s.playing.length, 'Music Off: nothing plays');
    await p.click('#sheet #close'); await p.click('#music-btn'); await sleep(400); await p.click('#mp-play'); await sleep(300);
    s = await M(); ok(s.playing.join() === 'mine' && s.song === 'sisi' && await p.evaluate(() => !JSON.parse(localStorage.getItem('phonebellum.sound.v1')).muted), 'Play turns music on: my music (sisi)');
    await p.click('#mp-close'); await sleep(400);
    // Delete needs a second tap
    await p.click('#cog'); await p.click('#mp-open2'); await sleep(400);
    ok(await vis('#mp-pop.dock'), 'Settings: Open playlists');
    await p.click(`[data-tab="${uid}"]`); await p.click('#mp-del');
    s = await M(); ok(s.lists.length === 1, 'Delete asks first');
    await p.click('#mp-del'); await sleep(200);
    s = await M(); ok(!s.lists.length && !(await p.locator(`[data-tab="${uid}"]`).count()), 'a second tap deletes it');
    await p.click('#mp-close'); await sleep(400);

    // a new match starts on the map's music
    await p.click('#cog'); await p.click('#to-menu'); await sleep(300);
    if (await vis('#forfeit-yes')) await p.click('#forfeit-yes');
    await p.waitForSelector('#go', { timeout: 10000 }); await sleep(500);
    s = await M(); ok(s.playing.join() === 'menu' && !s.mine.on && s.src === 'menu', 'back on the menu: the menu playlist (Road trip is gone) ' + s.src);
    await p.click('#go'); await sleep(1500);
    s = await M();
    ok(!s.mine.on && s.combo && s.playing.join() === s.combo, `a new match: the map's music again (${s.combo})`);
  } finally { await b.close(); srv.close(); }
  console.log(bad ? `${bad} music check(s) failed` : 'music ok');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
