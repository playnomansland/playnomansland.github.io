// Drive a VS Computer match on the Diorama UI: the AI deploys for both sides, fights are skipped until round N.
// Then calls a scene script (module exporting async (p, h) => {}) to take showcase shots.
const { chromium } = require('playwright');
const OUT = (process.env.SHOTS || __dirname + '/shots') + '/'; // where the PNGs go (git-ignored)
const [scene = './scene-probe.js', W = 1920, H = 1080, ROUNDS = 1, SEED = ''] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H } });
  await ctx.addInitScript((L) => { try { localStorage.setItem('phone-bellum-board', '3d'); localStorage.setItem('phone-bellum-3d-quality', 'high'); if (L) localStorage.setItem('pb-skin', L); } catch (e) {} }, process.env.LOOK || '');
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
  const t0 = Date.now(); const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', ...a);
  const shot = async (name, opts = {}) => { await p.screenshot({ path: OUT + name + '.png', timeout: 180000, ...opts }); log('shot', name); };
  const st = () => p.evaluate(() => { const x = window.__pb(); return { phase: x.phase, round: x.m && x.m.round, hp: x.m && x.m.hp, armies: x.m && x.m.armies.map(a => a.length) }; });
  const h = { p, shot, st, log, OUT,
    // every pick of round 1 and the army, made by the AI for side 0, then drawn
    autoDeploy: () => p.evaluate(() => { const { m } = window.__pb(); try { Game.ensureTower(m, 0); } catch (e) {} try { Game.ensurePack(m, 0); } catch (e) {} Game.aiDeploy(m, 0); }),
    ready: async () => { await p.evaluate(() => { const r = document.getElementById('ready'); if (r) r.click(); }); },
    // drag the view in a cinematic camera (pulling the ground toward you moves the camera forward)
    pan: async (dx, dy, x = 960, y = 420) => { await p.mouse.move(x, y); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(x + dx * i / 8, y + dy * i / 8); await p.mouse.up(); await p.mouse.move(5, 540); },
    skip: async () => { for (let i = 0; i < 2; i++) { await p.evaluate(() => { const s = document.getElementById('skip'); if (s) s.click(); }); await p.waitForTimeout(150); } },
    next: async () => { await p.evaluate(() => { const n = document.getElementById('next'); if (n) n.click(); }); },
    cam: (lvl) => p.evaluate((l) => window.__pb().board3d.camera.setLevel(l), lvl),
    // more gold for both sides, and the AI spends it (side 1 deployed at the round's start already; it goes again)
    boost: (g) => p.evaluate((g) => { const { m } = window.__pb(); m.gold[0] += g; m.gold[1] += g; Game.aiDeploy(m, 1); }, g),
    // a clean frame: only the 3D board, no page UI; tags off on the board
    clean: (on) => p.evaluate((on) => {
      let st = document.getElementById('clean-css');
      if (!st) { st = document.createElement('style'); st.id = 'clean-css'; document.head.appendChild(st); }
      st.textContent = on ? 'body * { visibility: hidden !important; } .board3d, .board3d canvas { visibility: visible !important; }' : '';
      if (!window.__tag0) window.__tag0 = Shapes.tag; Shapes.tag = on ? () => '' : window.__tag0;
    }, on),
    hp: (a, b) => p.evaluate(([a, b]) => { const { m } = window.__pb(); m.hp[0] = a; m.hp[1] = b; }, [a, b]),
    yaw: async (ms, key = 'q') => { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); },
    waitPhase: (ph, ms = 60000) => p.waitForFunction((ph) => window.__pb().phase === ph, ph, { timeout: ms }),
  };
  await p.goto('' + (process.env.SITE || 'http://127.0.0.1:8790/') + '?test&ui=diorama');
  await p.waitForFunction(() => window.__pb && typeof Game !== 'undefined', null, { timeout: 30000 });
  await p.waitForTimeout(3000);
  h.log('timer button', await p.evaluate(() => { const b = document.querySelector('[data-tm="0"]'); if (b) b.click(); return !!b; }));
  await p.evaluate(() => document.getElementById('go').click());
  await p.waitForFunction(() => window.__pb().phase === 'deploy', null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  log('match started', JSON.stringify(await st()));
  const BOOST = +(process.env.BOOST || 0);
  for (let r = 1; r < +ROUNDS; r++) {
    if (BOOST && r >= 3) await h.boost(BOOST);
    await h.autoDeploy(); await p.waitForTimeout(300);
    await h.ready();
    await p.waitForFunction(() => ['battle', 'fight'].includes(window.__pb().phase) || window.__pb().bt, null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(500); await h.skip();
    await p.waitForFunction(() => window.__pb().phase !== 'battle' && window.__pb().phase !== 'deploy', null, { timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(600);
    log('after fight', r, JSON.stringify(await st()));
    await h.next();
    await p.waitForFunction(() => window.__pb().phase === 'deploy', null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(800);
  }
  if (BOOST) await h.boost(BOOST);
  log('at', JSON.stringify(await st()));
  await require(scene)(p, h);
  await b.close();
})();
