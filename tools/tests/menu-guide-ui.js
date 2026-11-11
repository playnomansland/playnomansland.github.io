// The menu's guide (2026-11-11): the yellow notes on the Diorama's main menu for a guest's first time in, on a PC
// (src/site-template.html, MENU_TIPS; the box and the switch are the first game's helpers', tools/tests/helpers-ui.js).
//  - only a guest coming in from the welcome screen for the first time on a device gets it: not a page opened on the
//    menu, not a device that has played here before, not after a log-out
//  - one at a time: New here? (How to play), Ready to fight? (Play), Your battlefield, Music, You're a guest (your
//    name), That's the menu (Settings); each points at its thing, on screen, and never shows twice
//  - Got it puts one away, and so does pressing its thing (How to play) or reading it and going to another screen; a
//    dropdown over the menu only hides it; the menu words' own white notes stay away under it
//  - "Turn off helpers" is Settings' Helpers (a last note points at Settings); On starts the guide over
// Needs the game on port 8766 (python3 -m http.server 8766 --bind 127.0.0.1). The game server is never called: the
// account routes are answered here, everything else goes to a port nothing listens on.
const { chromium } = require('playwright-core');
let fails = 0; const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
const PID = 'p0123456789abcdef', SID = 'a'.repeat(64); // a made-up guest account, in the shapes the page checks
const BASE = 'http://127.0.0.1:8766/index.html?ui=diorama&server=http://127.0.0.1:8799';
(async () => {
  const b = await chromium.launch();
  // guest: what the server says to Play as guest ('none': it can't be reached; 'acct': a guest account)
  const open = async ({ q = '&welcome', guest = 'none', init, size = [1440, 900], ctx } = {}) => {
    const c = ctx || await b.newContext({ viewport: { width: size[0], height: size[1] } });
    const p = await c.newPage();
    p.on('pageerror', e => { if (/gis is not defined/.test(e.message)) return; console.log('page error:', e.message); fails++; });
    await p.route(/127\.0\.0\.1:8799\/account\//, (r) => {
      if (guest === 'acct' && /\/account\/(guest|me)$/.test(r.request().url())) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: PID, tag: 'Guest 1234', titles: [], skins: [], puzzles: [] }, session: SID }) });
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
    });
    if (init) await p.addInitScript(init);
    await p.goto(BASE + q); await p.waitForFunction(() => window.__dio && window.__dio.ready, null, { timeout: 60000 }); await p.waitForTimeout(600); return p; };
  const note = (p) => p.evaluate(() => { const e = document.getElementById('helper'); return e.hidden || e.style.visibility === 'hidden' ? '' : e.querySelector('b').textContent; });
  const wait = (p, head, ms = 8000) => p.waitForFunction((h) => { const e = document.getElementById('helper'); return (e.hidden || e.style.visibility === 'hidden' ? '' : e.querySelector('b').textContent) === h; }, head, { timeout: ms }).then(() => true, async () => { console.log('     (the note was: ' + JSON.stringify(await note(p)) + ', dio ' + await p.evaluate(() => document.getElementById('dio').className + ' ' + localStorage.getItem('pb-helpers')) + ')'); return false; });
  const js = (p, sel) => p.evaluate((s) => { const x = document.querySelector(s); if (x) x.click(); return !!x; }, sel);
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('pb-helpers') || 'null'));
  // the note's tail is on what it's about: the box sits beside the target, on screen, over none of the other things
  const beside = (p, sel, clear = []) => p.evaluate(([s, cl]) => { const e = document.getElementById('helper').getBoundingClientRect(), t = document.querySelector(s).getBoundingClientRect();
    const off = (r) => e.right <= r.left + 2 || e.left >= r.right - 2 || e.bottom <= r.top + 2 || e.top >= r.bottom - 2, near = Math.max(t.left - e.right, e.left - t.right, t.top - e.bottom, e.top - t.bottom) < 40;
    return off(t) && near && e.left >= 0 && e.top >= 0 && e.right <= innerWidth && e.bottom <= innerHeight && cl.every(c => { const r = document.querySelector(c).getBoundingClientRect(); return !r.width || off(r); }); }, [sel, clear]);
  const WORDS = ['#play', '#puzzles-open', '#how', '#dio .menu [data-cam="units"]', '#dio .menu [data-cam="ranks"]'];
  const guestIn = async (p) => { await p.click('#w-guest'); await p.waitForTimeout(300); await p.mouse.move(700, 60); }; // (the pointer off the menu's words)

  { // ---- a page opened on the menu (the UI tests' own way in): no guide ----
    const p = await open({ q: '' }); await p.waitForTimeout(1500);
    ok((await note(p)) === '' && !(await store(p)), 'a page that opens on the menu has no guide');
    await p.close();
  }
  { // ---- a guest's first time in ----
    const p = await open(); await p.waitForTimeout(800);
    ok((await note(p)) === '' && await p.evaluate(() => document.getElementById('dio').classList.contains('welcome')), 'the welcome screen: no note yet');
    await guestIn(p);
    ok(await wait(p, 'New here?'), 'Play as guest: the first note, New here?');
    ok(await p.evaluate(() => document.querySelector('#helper span').textContent) === 'Press here to learn how the game works.', 'it says: Press here to learn how the game works.');
    ok(await beside(p, '#how', WORDS.filter(w => w !== '#how')), 'it sits beside How to play, over none of the menu’s words');
    ok(JSON.stringify((await store(p)).menu) === '[]', 'the guide is this device’s from now on');
    // pointing at the menu's words: their own white notes stay away under the yellow one
    await p.hover('#how'); await p.waitForTimeout(700);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('#dio .btn-note[data-btn="rules"]')).display === 'none') && (await note(p)) === 'New here?', 'pointing at How to play: the yellow note stays, the word’s white note stays away');
    await p.hover('#dio .menu [data-cam="ranks"]'); await p.waitForTimeout(700);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('#dio .btn-note[data-btn="ranks"]')).display === 'none' && getComputedStyle(document.getElementById('lb-open')).display === 'none'), 'nor Rankings’ (with its Full leaderboard)');
    await p.mouse.move(700, 60); await p.waitForTimeout(400);
    // a dropdown over the menu hides it, and it comes back
    await p.click('#dio .acct button:nth-of-type(3)'); await p.waitForTimeout(1700);
    ok((await note(p)) === '', 'Settings open: no note over it');
    ok(await p.evaluate(() => !!document.querySelector('[data-set="helpers|1"]') && /on the menu/.test(document.getElementById('dd-settings').textContent)), 'Settings’ Helpers says the menu has notes too');
    await p.keyboard.press('Escape');
    ok(await wait(p, 'New here?') && (await store(p)).menu.length === 0, 'closed: the same note is back (it only hid)');
    // Got it: the next one, each on its thing
    const steps = [['Ready to fight?', '#play', 'play'], ['Your battlefield.', '#dio .bf-note', 'field'], ['Music.', '#dio .music', 'music'], ['You’re a guest.', '#dio .acct button:nth-of-type(2)', 'guest'], ['That’s the menu.', '#dio .acct button:nth-of-type(3)', 'settings']];
    let prev = 'how';
    for (const [head, sel, id] of steps) {
      await js(p, '#hp-ok');
      ok(await wait(p, head) && (await store(p)).menu.includes(prev), `Got it: then ${head}`);
      ok(await beside(p, sel, id === 'play' ? WORDS.slice(1) : WORDS.concat(id === 'field' ? [] : ['#dio .bf-note'])), `it sits beside ${sel.replace('#dio ', '')}`);
      prev = id;
    }
    await js(p, '#hp-ok'); await p.waitForTimeout(500);
    ok((await note(p)) === '' && (await store(p)).menu.length === 6, 'the last Got it: the guide is over');
    await p.hover('#how'); await p.waitForTimeout(700);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('#dio .btn-note[data-btn="rules"]')).display !== 'none'), 'and the words’ white notes are back');
    await p.reload(); await p.waitForFunction(() => window.__dio && window.__dio.ready, null, { timeout: 60000 }); await p.waitForTimeout(2000);
    ok((await note(p)) === '', 'the next visit has none');
    // Settings' Helpers: Off and On again starts it over
    await p.click('#dio .acct button:nth-of-type(3)'); await p.waitForTimeout(300); await js(p, '[data-set="helpers|0"]'); await p.waitForTimeout(200); await js(p, '[data-set="helpers|1"]'); await p.keyboard.press('Escape');
    ok(await wait(p, 'New here?') && (await store(p)).menu.length === 0, 'Helpers Off and On in Settings: the guide starts over');
    // a note's own Turn off helpers
    await js(p, '#hp-off'); await p.waitForTimeout(300);
    ok((await note(p)) === 'Helpers are off.' && (await store(p)).off === true, 'Turn off helpers: off, and a last note says Settings has them');
    ok(await beside(p, '#dio .acct button:nth-of-type(3)'), 'it points at Settings');
    await p.mouse.click(700, 400); await p.waitForTimeout(200);
    ok((await note(p)) === '', 'a press anywhere puts it away');
    await p.waitForTimeout(1500); ok((await note(p)) === '', 'no more notes');
    await p.close();
  }
  { // ---- pressing the thing, and reading a note and going elsewhere ----
    const p = await open(); await guestIn(p);
    ok(await wait(p, 'New here?'), 'a new guest: New here?');
    await p.click('#how'); await p.waitForFunction(() => document.getElementById('dio').classList.contains('how'), null, { timeout: 5000 }); await p.waitForTimeout(600);
    ok((await note(p)) === '' && (await store(p)).menu.includes('how'), 'How to play pressed: that note is done, and its screen has none');
    await p.keyboard.press('Escape'); await p.mouse.move(700, 60);
    ok(await wait(p, 'Ready to fight?'), 'back on the menu: Ready to fight?');
    await p.waitForTimeout(1400); await p.click('#dio .menu [data-cam="units"]'); await p.waitForTimeout(600); // Units, clicked open
    ok((await note(p)) === '' && (await store(p)).menu.includes('play'), 'read, then Units opened: it counts as read');
    await p.click('#dio .logo'); await p.mouse.move(700, 60);
    ok(await wait(p, 'Your battlefield.'), 'back on the menu: the next one');
    await p.close();
  }
  { // ---- a guest account: Stay logged in? is asked under the name first ----
    const p = await open({ guest: 'acct' }); await guestIn(p);
    ok(await wait(p, 'New here?') && await p.evaluate(() => !document.getElementById('dio-stay').hidden), 'a guest account: New here? shows beside Stay logged in?');
    for (const h of ['Ready to fight?']) { await js(p, '#hp-ok'); await wait(p, h); }
    await js(p, '#hp-ok'); await p.waitForTimeout(600); // (Change battlefield waits for the answer too: its note is hidden)
    ok(['', 'Music.'].includes(await note(p)), 'the notes on the top bar wait for the answer');
    if ((await note(p)) === 'Music.') { await js(p, '#hp-ok'); await p.waitForTimeout(600); }
    ok(!['You’re a guest.', 'That’s the menu.'].includes(await note(p)), 'no note under the name while the question is there');
    await js(p, '#stay-yes');
    ok(await wait(p, 'Your battlefield.') || ['You’re a guest.'].includes(await note(p)), 'answered: the guide goes on');
    await p.close();
  }
  { // ---- a player already on this device logs out, and comes in as a guest: that isn't a first time ----
    const p = await open({ guest: 'acct', init: `try { if (!localStorage.getItem('pb-welcomed')) { localStorage.setItem('phonebellum.account.v1', JSON.stringify({ id: '${PID}', tag: 'Guest 1234', titles: [], skins: [], puzzles: [], session: '${SID}', ts: Date.now() })); localStorage.setItem('pb-stay', '1'); localStorage.setItem('pb-welcomed', '1'); } } catch (e) {}` });
    await p.waitForTimeout(1500);
    ok((await note(p)) === '' && await p.evaluate(() => !document.getElementById('dio').classList.contains('welcome')), 'a player already here: the menu, no guide');
    await p.click('#dio .acct button:nth-of-type(2)'); await p.waitForTimeout(500); await js(p, '#acct-out'); await p.waitForTimeout(200); await js(p, '#acct-out');
    await p.waitForFunction(() => document.getElementById('dio').classList.contains('welcome'), null, { timeout: 8000 }).catch(() => {});
    ok(await p.evaluate(() => document.getElementById('dio').classList.contains('welcome')), '(logged out: the welcome screen)');
    await guestIn(p); await p.waitForTimeout(2000);
    ok((await note(p)) === '' && (await store(p)).menu.length === 6, 'a guest again after a log-out: no guide');
    await p.close();
  }
  { // ---- a device that has played here before: no guide ----
    const p = await open({ init: () => { try { if (!localStorage.getItem('pb-helpers')) localStorage.setItem('pb-helpers', JSON.stringify({ off: false, seen: ['start', 'buy'], done: false })); } catch (e) {} } });
    await guestIn(p); await p.waitForTimeout(2000);
    ok((await note(p)) === '' && (await store(p)).menu.length === 6, 'a device with a game’s notes behind it: no guide');
    await p.close();
    const q = await open({ q: '&guide' }); await q.click('#play-back'); await q.mouse.move(700, 60); // (a page opened by a test starts on Play)
    ok(await wait(q, 'New here?'), '?guide starts it on any device, to look at it');
    await q.close();
  }
  // ---- other windows: every note on screen, beside its thing, over none of the menu's words, the music or Change
  // battlefield. A small window has no free side for some: those are left out there (New here? always shows) ----
  const KEEP = WORDS.concat(['#dio .music', '#dio .bf-note']);
  for (const [size, left] of [[[1920, 1080], []], [[1366, 768], []], [[1280, 720], []], [[1024, 768], ['Your battlefield.']]]) {
    const p = await open({ size }); await guestIn(p);
    const steps = [['New here?', '#how'], ['Ready to fight?', '#play'], ['Your battlefield.', '#dio .bf-note'], ['Music.', '#dio .music'], ['You’re a guest.', '#dio .acct button:nth-of-type(2)'], ['That’s the menu.', '#dio .acct button:nth-of-type(3)']].filter(x => !left.includes(x[0]));
    let all = true, why = '';
    for (const [head, sel] of steps) {
      const up = await wait(p, head, 4000), fits = up && await beside(p, sel, (head === 'New here?' && size[0] < 1200 ? WORDS : KEEP).filter(w => w !== sel));
      if (!fits) { all = false; why += ` ${head}${up ? ' (placed badly: ' + await p.evaluate(() => { const e = document.getElementById('helper').getBoundingClientRect(); return [e.left, e.top, e.right, e.bottom].map(Math.round).join(); }) + ')' : ' (not shown)'}`; }
      await js(p, '#hp-ok'); await p.waitForTimeout(250);
    }
    await p.waitForTimeout(400);
    ok(all && (await note(p)) === '', `${size.join('×')}: ${left.length ? 'the notes with a free side fit, ' + left.join(', ') + ' is left out' : 'all six notes fit'}${why}`);
    await p.close();
  }
  await b.close(); console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})();
