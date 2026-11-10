// The Diorama's How to play screen (2026-11-10, src/diorama.js openHow): the menu's HOW TO PLAY opens it instead of the
// sheet; a click opens a chapter (pointing doesn't), ← → turn the page, ↑ ↓ go through a list, Next stays put, a tile
// on the island picks its leader, Esc / Back / the logo / Profile leave it, the last page leads to Play; and every
// chapter (every tower, every leader) fits the window at 1280x720, 1366x768, 1920x1080 and 1024x768.
// Needs the game on port 8766 (python3 -m http.server 8766 --bind 127.0.0.1) and WebGL (software 3D is slow: minutes).
const { chromium } = require('playwright-core');
let fails = 0; const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const open = async (w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => { if (/gis is not defined/.test(e.message)) return; console.log('page error:', e.message); fails++; }); // (Google's sign-in script is blocked in this sandbox: the same error on a clean build)
    await p.goto('http://127.0.0.1:8766/index.html?ui=diorama&test#still'); await p.waitForFunction(() => window.__dio && window.__dio.ready, null, { timeout: 120000 }); await p.waitForTimeout(1200);
    await p.click('#play-back'); await p.waitForTimeout(600); return p; };
  const cls = (p) => p.evaluate(() => document.getElementById('dio').className);
  const fitsScreen = (p) => p.evaluate(() => { const bad = []; for (const el of document.querySelectorAll('#dio .hw .hw-left, #dio .hw-page > *, #dio .hw-toc .item, #dio .hnote')) { const r = el.getBoundingClientRect(); if (!r.width || getComputedStyle(el).display === 'none') continue; if (r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) bad.push(el.className + ' ' + Math.round(r.right) + 'x' + Math.round(r.bottom)); }
    const pg = document.getElementById('hw-page').getBoundingClientRect(), bl = document.querySelector('#dio .build').getBoundingClientRect(), bk = document.getElementById('hw-back').getBoundingClientRect(), nx = document.getElementById('hw-next').getBoundingClientRect();
    if (bk.bottom > bl.top) bad.push('Back over the build line'); const bf = document.querySelector('#dio .bf-note'), br = bf.getBoundingClientRect(); if (getComputedStyle(bf).opacity !== '0' && pg.right > br.left && pg.bottom > br.top - 20) bad.push('the page reaches Change battlefield');
    for (const it of document.querySelectorAll('#hw-toc .item')) { const r = it.getBoundingClientRect(); if (r.right > pg.left - 2) bad.push('chapter word reaches the page: ' + it.textContent); }
    return bad; });
  { // ---- 1440x900: the whole flow ----
    const p = await open(1440, 900);
    await p.click('#how'); await p.waitForTimeout(1500);
    ok((await cls(p)).includes('how'), 'How to play opens from the menu word');
    ok(await p.evaluate(() => document.getElementById('sheet-back').hidden), 'the old sheet stays shut');
    ok(await p.evaluate(() => document.querySelectorAll('#hw-toc .item').length) === 8, '8 chapters (no Maps without developer mode)');
    ok(await p.evaluate(() => document.querySelector('#hw-page h3').textContent) === 'A round', 'it starts on A round');
    ok(await p.evaluate(() => window.__dio.cam().want) === 'other', 'the camera goes to the chapter’s view');
    for (let i = 0; i < 8; i++) { await p.click(`[data-hw="${i}"]`); await p.waitForTimeout(900); const bad = await fitsScreen(p); ok(!bad.length, `chapter ${i + 1} fits 1440x900 ${bad.join('; ')}`);
      const n = await p.evaluate(() => [...document.querySelectorAll('#dio .hnote')].filter(e => e.style.display !== 'none').length), all = await p.evaluate(() => document.querySelectorAll('#dio .hnote').length); ok(n === all, `chapter ${i + 1}: ${n} of ${all} notes placed`); }
    // hover marks, doesn't open
    await p.click('[data-hw="0"]'); await p.hover('[data-hw="2"]'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.querySelector('#hw-page h3').textContent) === 'A round', 'pointing at a chapter doesn’t open it');
    // keys
    await p.mouse.move(700, 800); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('#hw-page h3').textContent) === 'Winning', '→ turns the page');
    await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('#hw-page h3').textContent) === 'A round', '← stops at the first page');
    // Next
    await p.click('#hw-next'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('#hw-toc .item.on').dataset.hw) === '1', 'Next opens the next chapter');
    const y1 = await p.evaluate(() => document.getElementById('hw-next').getBoundingClientRect().top); await p.click('#hw-next'); await p.waitForTimeout(300);
    const y2 = await p.evaluate(() => document.getElementById('hw-next').getBoundingClientRect().top); ok(Math.abs(y1 - y2) < 1, 'Next stays in the same place');
    // lists
    await p.click('[data-hw="5"]'); await p.waitForTimeout(600); await p.click('[data-hp="2"]'); await p.waitForTimeout(600);
    ok(await p.evaluate(() => document.querySelector('.hw-det .on .nm').textContent) === 'Bastion', 'a tower’s word shows its text');
    ok(await p.evaluate(() => document.querySelector('#dio .hnote').textContent.startsWith('Bastion.')), 'the island’s note follows');
    const ny = await p.evaluate(() => document.getElementById('hw-next').getBoundingClientRect().top); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.querySelector('.hw-det .on .nm').textContent) === 'Mage tower', '↓ goes down the list');
    ok(Math.abs(ny - await p.evaluate(() => document.getElementById('hw-next').getBoundingClientRect().top)) < 1, 'the page doesn’t jump when the pick changes');
    // a tile on the island
    await p.click('[data-hw="4"]'); await p.waitForTimeout(1200);
    // click the tile under the 9th leader's place: find it through the note's dot after picking it, then pick another and click there
    await p.click('[data-hp="8"]'); await p.waitForTimeout(700);
    const d8 = await p.evaluate(() => { const cs = [...document.querySelectorAll('#lines circle')]; const c = cs[cs.length - 2]; return [+c.getAttribute('cx'), +c.getAttribute('cy')]; });
    await p.click('[data-hp="0"]'); await p.waitForTimeout(700);
    await p.mouse.click(d8[0], d8[1] + 14); await p.waitForTimeout(700);
    ok(await p.evaluate(() => document.querySelector('.hw-seg [aria-pressed="true"]').dataset.hp) === '8', 'a click on a leader’s tile picks that leader');
    await p.mouse.move(d8[0], d8[1] + 14); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('world').classList.contains('world-hot')), 'a tile shows it can be clicked');
    // Esc, Back, the logo
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    ok(!(await cls(p)).split(' ').includes('how'), 'Esc goes back to the menu');
    ok(await p.evaluate(() => window.__dio.cam().want) === 'play', 'the camera is back on the menu’s view');
    ok(await p.evaluate(() => !document.querySelector('#dio .hnote')), 'its notes are gone');
    await p.click('#how'); await p.waitForTimeout(600);
    ok(await p.evaluate(() => document.querySelector('#hw-page h3').textContent) === 'Leaders', 'it opens where you left it');
    await p.click('#hw-back'); await p.waitForTimeout(400); ok(!(await cls(p)).split(' ').includes('how'), 'Back goes to the menu');
    await p.click('#how'); await p.waitForTimeout(400); await p.click('#dio .logo'); await p.waitForTimeout(400); ok(!(await cls(p)).split(' ').includes('how'), 'the logo goes to the menu');
    // Profile over it, Puzzles after it
    await p.click('#how'); await p.waitForTimeout(400); await p.click('#dio .acct button:nth-of-type(2)'); await p.waitForTimeout(600);
    ok((await cls(p)).includes('profile') && !(await cls(p)).split(' ').includes('how'), 'Profile closes it');
    await p.click('#pf-back'); await p.waitForTimeout(400); await p.click('#how'); await p.waitForTimeout(400);
    // the last page leads to Play
    await p.click('[data-hw="7"]'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.getElementById('hw-next').textContent.trim()) === 'Play', 'the last page’s button says Play');
    await p.click('#hw-next'); await p.waitForTimeout(700);
    ok((await cls(p)).split(' ').includes('play') && !(await cls(p)).split(' ').includes('how'), 'and opens the Play screen');
    await p.click('#play-back'); await p.waitForTimeout(500);
    // Puzzles still opens its own screen
    await p.click('#puzzles-open'); await p.waitForTimeout(600); ok((await cls(p)).split(' ').includes('puz'), 'Puzzles still opens');
    await p.close();
  }
  for (const [w, h] of [[1280, 720], [1366, 768], [1920, 1080], [1024, 768]]) { // ---- every chapter fits ----
    const p = await open(w, h); await p.click('#how'); await p.waitForTimeout(1200);
    for (let i = 0; i < 8; i++) { await p.click(`[data-hw="${i}"]`); await p.waitForTimeout(500);
      const picks = await p.evaluate(() => document.querySelectorAll('[data-hp]').length);
      for (let k = 0; k < Math.max(1, picks); k++) { if (picks) { await p.click(`[data-hp="${k}"]`); await p.waitForTimeout(120); } }
      const bad = await fitsScreen(p); ok(!bad.length, `${w}x${h} chapter ${i + 1} fits ${bad.join('; ')}`); }
    await p.click('[data-hw="0"]'); await p.waitForTimeout(1500);
    await p.click('[data-hw="5"]'); await p.waitForTimeout(600); await p.click('[data-hp="3"]'); await p.waitForTimeout(1500);
    await p.close();
  }
  await b.close(); console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})();
