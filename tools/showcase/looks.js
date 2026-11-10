const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('phone-bellum-board', '3d'); } catch (e) {} });
  const p = await ctx.newPage();
  await p.goto('' + (process.env.SITE || 'http://127.0.0.1:8790/') + '?ui=diorama');
  await p.waitForTimeout(12000);
  const sub = () => p.evaluate(() => (document.getElementById('bf-sub') || {}).textContent || '');
  for (let i = 0; i < 8; i++) {
    const s = await sub(); await p.mouse.move(600, 300); await p.waitForTimeout(3500);
    const name = s.split(' · ')[0].toLowerCase().replace(/ /g, '-');
    await p.screenshot({ path: (process.env.SHOTS || __dirname + '/shots') + `/look-${name}.png`, clip: { x: 1100, y: 150, width: 650, height: 760 }, timeout: 180000 });
    console.log('saved', name);
    await p.evaluate(() => document.querySelector('.bf-note').click());
  }
  await b.close();
})();
