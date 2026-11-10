// late round with big armies: the deploy board, then the fight from several cameras, each with and without the HUD
const TAG = process.env.TAG || 'hero';
module.exports = async (p, h) => {
  await h.autoDeploy(); await p.waitForTimeout(800);
  await h.hp(+(process.env.HP0 || 58), +(process.env.HP1 || 64));
  await p.evaluate(() => window.__pb().board3d && 0); await p.mouse.move(5, 500);
  h.log('armies', JSON.stringify(await h.st()));
  await h.shot(`${TAG}-01-deploy`);
  await h.ready();
  await p.waitForTimeout(2500);
  await h.cam(2); await h.yaw(+(process.env.YAW || 450)); await p.waitForTimeout(1500);
  await h.shot(`${TAG}-02-angled-hud`);
  await h.clean(true); await h.shot(`${TAG}-03-angled-clean`); await h.clean(false);
  await h.shot(`${TAG}-04-angled-hud-later`);
  await h.cam(3); await p.waitForTimeout(2000);
  await h.clean(true); await h.shot(`${TAG}-05-ground-clean`); await h.clean(false);
  await h.cam(1); await p.waitForTimeout(2000);
  await h.shot(`${TAG}-06-tilted-hud`);
  // let the fight end: the result
  await p.waitForFunction(() => window.__pb().phase !== 'battle', null, { timeout: 400000 }).catch(() => {});
  await p.waitForTimeout(2500);
  await h.shot(`${TAG}-07-result`);
};
