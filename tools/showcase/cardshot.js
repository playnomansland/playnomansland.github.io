const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w, h, out] of [[1600, 900, 'card-16x9.png'], [1200, 630, 'og-card.png']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + __dirname + '/card.html'); await p.waitForTimeout(800);
    await p.screenshot({ path: (process.env.SHOTS || __dirname + '/shots') + '/' + out }); await p.close(); console.log(out);
  }
  await b.close();
})();
