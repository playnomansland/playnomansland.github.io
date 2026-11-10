// A fight clip: the page's clock is taken over (requestAnimationFrame and performance.now), and each frame steps it
// 1/FPS s, then is saved as a PNG; ffmpeg joins them afterwards. Clean board (no page UI).
const fs = require('fs');
const TAG = process.env.TAG || 'clip', FPS = +(process.env.FPS || 24), SECS = +(process.env.SECS || 12), LEAD = +(process.env.LEAD || 2.0);
module.exports = async (p, h) => {
  if (process.env.FINALBOOST) await h.boost(+process.env.FINALBOOST);
  await p.evaluate((g) => { const { m } = window.__pb(); m.gold[0] += g; }, +(process.env.FINALBOOST || 0));
  await h.autoDeploy(); await p.waitForTimeout(800);
  await h.hp(62, 57);
  h.log('final armies', JSON.stringify(await h.st()), await p.evaluate(() => { const { m } = window.__pb(); return m.armies.map(a => a.reduce((n, s) => n + (s.level || 1), 0)).join(' vs ') + ' levels'; }));
  // the camera is set while deploying (the angled view takes no taps here: the mouse stays off the board)
  await h.cam(+(process.env.LEVEL || 2)); await p.waitForTimeout(2500);
  if (process.env.YAWKEY) await h.yaw(+(process.env.YAWMS || 300), process.env.YAWKEY);
  if (process.env.PANY) { await h.pan(0, +process.env.PANY); }
  await p.waitForTimeout(2500);
  await h.clean(true);
  await h.ready();
  await p.waitForFunction(() => window.__pb().phase === 'battle', null, { timeout: 60000 });
  // freeze the page's time at once; from here every frame steps it
  await p.evaluate(() => {
    let t = performance.now(); const q = new Map(); let id = 1e6;
    performance.now = () => t;
    window.requestAnimationFrame = (cb) => { const i = ++id; q.set(i, cb); return i; };
    window.cancelAnimationFrame = (i) => { q.delete(i); };
    window.__step = (ms) => { t += ms; const cbs = [...q.values()]; q.clear(); for (const cb of cbs) { try { cb(t); } catch (e) { console.error(e); } } };
  });
  const step = (ms) => p.evaluate((ms) => window.__step(ms), ms);
  await h.clean(true);
  for (let i = 0; i < LEAD * FPS; i++) await step(1000 / FPS); // the armies walk in
  const dir = h.OUT + TAG + '/'; fs.mkdirSync(dir, { recursive: true });
  const n = SECS * FPS;
  for (let i = 0; i < n; i++) {
    await step(1000 / FPS);
    await p.screenshot({ path: dir + String(i).padStart(4, '0') + '.png', timeout: 120000 });
    if (i % 24 === 0) h.log('frame', i, '/', n, 'phase', await p.evaluate(() => window.__pb().phase));
  }
};
