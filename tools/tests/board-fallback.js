// The game's own switches of the board and the menu (2026-11-12), which players saw as "random":
// - the too-slow rule's quality step-downs and its drop to 2D last this visit only (sessionStorage); a quality picked
//   in Settings stays saved; the next visit is 3D again at that quality
// - 3D that couldn't start is 2D for this visit only; nothing is saved
// - a boss run (the Mommy) never drops to 2D for slowness
// - the line on the board stays until it's tapped
// - a quality saved before then (maybe a step-down) is cleared once
// - the main menu: a computer's choice follows its screen, not its window (a narrow window keeps the Diorama)
// Needs `python3 -m http.server 8766` in the repo root. Headless Chromium needs software WebGL (the args below).
const { chromium } = require('playwright-core');
const URL = 'http://127.0.0.1:8766/?test';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PB_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const open = async (init, opts) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ...opts });
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage();
    p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
    p.on('console', m => { if (/No Mans Land 3D/.test(m.text())) console.log('     ' + m.text()); });
    return p;
  };
  const is3d = (p) => p.evaluate(() => !!window.__pb().board3d);
  const on3d = (p) => p.waitForFunction(() => window.__pb && window.__pb().board3d, null, { timeout: 20000 });
  const saved = (p) => p.evaluate(() => [localStorage.getItem('phone-bellum-board'), localStorage.getItem('phone-bellum-3d-quality')]);
  const visit = (p) => p.evaluate(() => [sessionStorage.getItem('phone-bellum-board'), sessionStorage.getItem('phone-bellum-3d-quality')]);
  const note = async (p) => (await p.locator('#note3d').isVisible()) ? (await p.locator('#note3d').textContent()) : '';
  const ratio = (p) => p.evaluate(() => window.__pb().board3d.pixelRatio());
  // a slow device: frames 55 ms apart (18 fps). Headless software WebGL draws a frame a second or slower, which the
  // meter takes for a hidden page, so the frames' times are made up: each one 55 ms after the last.
  const slow = (p) => p.evaluate(() => { let t = performance.now(); const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf(() => { t += 55; cb(t); }); });
  // one whole fight: Ready, then the round's end
  const fight = async (p) => {
    await p.click('#ready'); await sleep(300);
    if (await p.locator('#cap-go').count()) await p.click('#cap-go').catch(() => {});
    await p.waitForFunction(() => window.__pb().phase === 'battle', null, { timeout: 15000 });
    await p.waitForFunction(() => window.__pb().phase !== 'battle', null, { timeout: 180000 });
    await sleep(500);
  };
  const vsAI = async (p) => { await p.click('#go'); await sleep(600); await p.dblclick('[data-pack="0"]'); await sleep(800); if (await p.locator('[data-tower]').count()) { await p.locator('[data-tower]').first().dblclick().catch(() => {}); await sleep(300); } };

  // 1. too slow, in a match against the computer, with medium picked in Settings
  let p = await open(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('phone-bellum-3d-quality', 'medium'); sessionStorage.setItem('seeded', '1'); } } catch (e) {} });
  await p.goto(URL); await sleep(800); await vsAI(p); await on3d(p);
  ok(await ratio(p) === 1.5, 'starts 3D at the picked quality (medium)');
  await slow(p);
  await fight(p);
  await p.waitForFunction(() => sessionStorage.getItem('phone-bellum-3d-quality'), null, { timeout: 10000 }).catch(() => {}); // (the meter sums the fight up on the next frame)
  ok(await is3d(p) && (await visit(p))[1] === 'low' && await ratio(p) === 1, `slow fight: still 3D, low for this visit (${(await visit(p))[1]})`);
  ok((await saved(p))[1] === 'medium', `the picked quality stays saved (${(await saved(p))[1]})`);
  if (await p.locator('#next').count()) await p.click('#next'); await sleep(800);
  await fight(p);
  await p.waitForFunction(() => !window.__pb().board3d, null, { timeout: 10000 }).catch(() => {});
  ok(!(await is3d(p)) && /too slow/.test(await note(p)), `slow fight at low: 2D, with a line: "${await note(p)}"`);
  ok((await saved(p))[0] === null && (await visit(p))[0] === '2d', 'too slow: 2D for this visit only, nothing saved');
  await sleep(9000);
  ok(/too slow/.test(await note(p)), 'the line is still there 9 s later');
  await p.click('#note3d');
  ok(!(await note(p)), 'a tap closes it');
  { const p2 = await p.context().newPage(); p2.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
    await p2.goto(URL); await sleep(800); await vsAI(p2); await on3d(p2);
    ok(await ratio(p2) === 1.5, 'the next visit: 3D again, at medium'); }
  await p.context().close();

  // 2. 3D can't start (no WebGL): 2D for this visit, nothing saved
  p = await open(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, ...a) { return /webgl/.test(k) ? null : get.call(this, k, ...a); }; });
  await p.goto(URL); await sleep(800); await vsAI(p);
  await p.waitForSelector('#note3d', { timeout: 20000 }).catch(() => {});
  ok(!(await is3d(p)) && /couldn’t start/.test(await note(p)), `no WebGL: 2D, with a line: "${await note(p)}"`);
  ok((await saved(p))[0] === null && (await visit(p))[0] === '2d', 'couldn’t start: 2D for this visit only, nothing saved');
  await p.context().close();

  // 3. the Mommy at low: a slow fight keeps 3D
  p = await open(() => { try { sessionStorage.setItem('phone-bellum-3d-quality', 'low'); } catch (e) {} });
  await p.goto(URL.replace('?test', '?mommy&test')); await on3d(p);
  await p.waitForFunction(() => { const x = window.__pb(); return x.m && x.m.boss && x.phase === 'deploy'; }, null, { timeout: 20000 });
  await slow(p);
  await fight(p);
  ok(await is3d(p) && !(await note(p)) && (await visit(p))[0] === null, 'the Mommy: a slow fight at low stays 3D');
  await p.context().close();

  // 4. a quality saved before 2026-11-12 is cleared once (not under webdriver, as the UI tests seed theirs)
  p = await open(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('phone-bellum-3d-quality', 'low'); sessionStorage.setItem('seeded', '1'); } } catch (e) {} });
  await p.goto(URL); await sleep(1500);
  ok((await saved(p))[1] === null, 'an old saved quality is cleared');
  await p.evaluate(() => localStorage.setItem('phone-bellum-3d-quality', 'medium'));
  await p.reload(); await sleep(1500);
  ok((await saved(p))[1] === 'medium', 'a quality saved after that is kept');
  await p.context().close();

  // 5. the main menu (the build's default, 'pc'): the screen decides, not the window
  const dio = async (opts) => { const q = await open(null, opts); await q.goto(URL); await sleep(500); const on = await q.evaluate(() => document.documentElement.classList.contains('diorama')); await q.context().close(); return on; };
  ok(await dio({ viewport: { width: 1280, height: 800 }, screen: { width: 1280, height: 800 } }), 'a computer: the Diorama');
  ok(await dio({ viewport: { width: 760, height: 800 }, screen: { width: 1920, height: 1080 } }), 'a narrow window on a computer: still the Diorama');
  ok(!(await dio({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, hasTouch: true, isMobile: true })), 'a phone: the old menu');
  ok(!(await dio({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } })), 'a phone-sized screen with a mouse (the UI tests): the old menu');

  await b.close();
  console.log(fails ? `${fails} failed` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
