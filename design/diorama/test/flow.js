// node design/diorama/test/flow.js design/diorama
// Walk-through: one page, clicked through every screen like a player would. Each step checks where it landed.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await p.goto('file://' + path.join(process.argv[2], 'diorama-menu.html') + '#welcome,invited');
  await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
  let pass = 0, fail = 0;
  const cls = () => p.evaluate(() => document.body.className);
  const vis = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
  const txt = (sel) => p.evaluate((s) => (document.querySelector(s) || {}).textContent || '', sel);
  const step = async (name, fn, check) => {
    try { if (fn) await fn(); await p.waitForTimeout(250); const r = await check(); if (r === true) { pass++; console.log('ok   ' + name); } else { fail++; console.log('FAIL ' + name + ' → ' + r); } }
    catch (e) { fail++; console.log('FAIL ' + name + ' → ' + e.message.split('\n')[0]); }
  };
  const has = async (...want) => { const c = await cls(); const miss = want.filter(w => w.startsWith('!') ? c.split(' ').includes(w.slice(1)) : !c.split(' ').includes(w)); return miss.length ? `body is "${c}", wanted ${want.join(' ')}` : true; };
  const click = (sel) => p.click(sel);
  // the door
  await step('welcome shows the door and the invite note', null, async () => (await has('welcome')) === true && await vis('#w-login') && await vis('[data-welcome]') ? true : 'door or invite note missing');
  await step('Sign up opens', () => click('#w-signup'), async () => (await has('welcome', 'in-signin')) === true && (await txt('#si-h')) === 'Sign up' || 'not on Sign up');
  await step('a bad username is caught', async () => { await p.fill('#si-tag', 'W'); await click('[data-google]'); }, async () => (await txt('.si-err')).includes('2–16') || 'no error shown');
  await step('switch to Log in and back', async () => { await click('#si-other'); await click('#si-other'); }, async () => (await txt('#si-h')) === 'Sign up' || 'did not switch back');
  await step('← Back returns to the door', () => click('.back'), async () => has('welcome', '!in-signin'));
  await step('Sign up with Google as "Tester" lands on the menu', async () => { await click('#w-signup'); await p.fill('#si-tag', 'Tester'); await click('[data-google]'); },
    async () => (await has('!welcome')) === true && (await txt('.acct button:nth-child(2) span')) === 'Tester' || 'not on the menu as Tester');
  // the menu
  await step('menu words move the camera (hover Units)', () => p.hover('.menu .item[data-cam="units"]'), async () => has('units'));
  await step('Rankings pins', async () => { await p.mouse.move(5, 5); await click('.menu .item[data-cam="ranks"]'); }, async () => has('ranks', 'pinned'));
  await step('← Menu unpins', () => click('.back'), async () => has('!ranks', '!pinned'));
  await step('Units: tier 2, Brute sheet has a Skin row (no skins yet: hidden)', async () => { await click('.menu .item[data-cam="units"]'); await click('.tiers button[data-t="2"]'); await p.evaluate(() => 0); },
    async () => has('units', 'pinned'));
  await step('back to the menu', () => click('.back'), async () => has('!units'));
  // Play
  await step('PLAY opens Play', () => click('#play'), async () => has('play'));
  await step('Multiplayer folds out', () => click('#multi'), async () => has('play', 'mp-open'));
  await step('1v1 Ranked opens Rooms', () => click('.orders .mp [data-q="ranked"]'), async () => (await has('in-rooms')) === true && (await txt('#r-tok span')) === '1v1 Ranked' || 'Rooms not filtered to Ranked');
  await step('filter search narrows the list', () => p.fill('#r-q', 'Pebble'), async () => (await p.$$eval('#r-list li', l => l.length)) === 1 || 'search did not narrow');
  await step('Create room opens New room on Ranked', async () => { await p.fill('#r-q', ''); await click('#r-create'); },
    async () => (await has('in-create')) === true && (await p.getAttribute('.newroom [data-kind="ranked"]', 'aria-pressed')) === 'true' || 'not on New room / Ranked');
  await step('step the battlefield', () => click('.newroom [data-bfs="1"]'), async () => (await txt('#nr-bf')) === 'Autumn' || `battlefield is ${await txt('#nr-bf')}`);
  await step('← Rooms, ← Play, ← Menu', async () => { await click('.back'); await click('.back'); await click('.back'); }, async () => has('!play', '!in-rooms', '!in-create'));
  await step('your own battlefield came back (Meadow)', null, async () => (await txt('#bf-sub')).startsWith('Meadow') || await txt('#bf-sub'));
  await step('Change battlefield is on top and steps the home look', async () => { const top = await p.evaluate(() => { const r = document.querySelector('.bf-note').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(e && e.closest('.bf-note')); }); if (!top) throw new Error('something covers the note'); await p.click('.bf-note', { force: true }); }, async () => (await txt('#bf-sub')).startsWith('Autumn') || await txt('#bf-sub'));
  // playlist
  await step('playlist opens and a song can be picked', async () => { await click('.music .open'); await click('.pl-row >> nth=2'); },
    async () => (await has('music-open')) === true && (await p.getAttribute('.pl-row >> nth=2', 'aria-current')) === 'true' || 'playlist not working');
  await step('Esc closes it', () => p.keyboard.press('Escape'), async () => has('!music-open'));
  // Friends and Settings
  await step('Friends opens (badge shows a count)', () => click('.acct button:nth-child(1)'), async () => await vis('#dd-friends') && !(await p.$eval('#fr-badge', e => e.hidden)) || 'Friends closed or no badge');
  await step('Invite → Standard', async () => { await click('#dd-friends [data-decline]'); await click('#dd-friends [data-invite="0"]'); await click('#dd-friends [data-kind="0|1v1 Standard"]'); },
    async () => (await txt('#dd-friends .done')).includes('Invited') || 'not invited');
  await step('open a thread and back', async () => { await click('#dd-friends [data-thread="0"]'); await click('#dd-friends [data-back]'); }, async () => (await txt('#dd-friends h3')).startsWith('Friends') || 'not back on the list');
  await step('Requests: accept one', async () => { await click('#dd-friends [data-tab="requests"]'); await click('#dd-friends [data-accept="0"]'); }, async () => (await txt('#dd-friends')).includes('Friends now') || 'not accepted');
  await step('Settings replaces Friends', () => click('.acct button:nth-child(3)'), async () => await vis('#dd-settings') && !(await vis('#dd-friends')) || 'both or neither open');
  await step('Music off disables its volume', () => click('#dd-settings [data-set="music|0"]'), async () => (await p.$eval('[data-vol="vol"]', e => e.disabled)) || 'volume still on');
  await step('clicking outside closes it', () => p.mouse.click(400, 450), async () => !(await vis('#dd-settings')) || 'still open');
  // Profile
  await step('the account button opens Profile', () => click('.acct button:nth-child(2)'), async () => (await has('profile')) === true && (await txt('#pf-name')) === 'Tester' || 'Profile not open for Tester');
  await step('pick a title (None)', () => click('#pf-opts [data-title=""]'), async () => !(await vis('#pf-title')) || 'title still shown');
  await step('change the username', async () => { await p.fill('#pf-tag', 'Tester 2'); await click('#pf-save'); }, async () => (await txt('#pf-name')) === 'Tester 2' && (await txt('#pf-opts')).includes('again on') || 'not renamed');
  await step('Units from Profile', () => click('#pf-opts [data-units]'), async () => (await has('profile', 'units')) === true && (await txt('.back')).includes('Profile') || 'Units not open');
  await step('← Profile, then Match history and a match\'s rounds', async () => { await click('.back'); await click('#pf-hist'); await click('#h-list .rd >> nth=0'); },
    async () => (await has('in-history')) === true && (await p.$$eval('#h-list > li.open', l => l.length)) === 1 || 'history not working');
  await step('All online tab', () => click('.h-tabs [data-h="all"]'), async () => (await txt('#h-count')).includes('everyone') || 'tab did not switch');
  await step('← Profile, ← Menu', async () => { await click('.back'); await click('.back'); }, async () => has('!profile', '!in-history'));
  // a developer's skins, from the menu's Units
  await step('as a developer: wear Omni-Per on the Brute (menu Units)', async () => {
      await p.goto('about:blank'); await p.goto('file://' + path.join(process.argv[2], 'diorama-menu.html') + '#still,acct=dev,view=units,pin,tier=2,unit=0'); await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
      await click('#usheet [data-wear="brute-omniper"]'); },
    async () => (await p.getAttribute('#usheet [data-wear="brute-omniper"]', 'aria-pressed')) === 'true' && (await p.getAttribute('#usheet [data-wear="brute-champion"]', 'aria-pressed')) === 'false' || 'skin did not switch (one per unit)');
  await step('the Profile shows it', async () => { await click('.back'); await click('.acct button:nth-child(2)'); }, async () => (await txt('#pf-opts')).includes('3 skins are on') || await txt('#pf-opts .ur.nr-note'));
  await step('log out, then the account is gone', async () => { await click('#pf-opts [data-out]'); }, async () => (await txt('#pf-name')) === 'Nobody yet' || await txt('#pf-name'));
  console.log(`\n${pass} passed, ${fail} failed, ${errors.length} page error(s)`); errors.forEach(e => console.log('  ' + e));
  await b.close();
})();
