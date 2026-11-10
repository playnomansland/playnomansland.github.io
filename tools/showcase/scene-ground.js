// late round: a few ground-level and angled close-ups pushed into the clash, clean
const TAG = process.env.TAG || 'ground';
module.exports = async (p, h) => {
  await h.autoDeploy(); await p.waitForTimeout(800);
  await h.hp(+(process.env.HP0 || 61), +(process.env.HP1 || 57));
  await p.mouse.move(5, 540);
  await h.shot(`${TAG}-01-deploy`);
  await h.ready();
  await p.waitForTimeout(2500);
  await h.cam(2); await h.yaw(+(process.env.YAW || -450), process.env.YAWKEY || 'e'); await p.waitForTimeout(1500);
  await h.clean(true);
  await h.shot(`${TAG}-02-angled-clean`);
  await h.pan(0, 260); await p.waitForTimeout(1200);
  await h.shot(`${TAG}-03-angled-pushed`);
  await h.cam(3); await p.waitForTimeout(1800);
  await h.pan(0, 380); await p.waitForTimeout(1200);
  await h.shot(`${TAG}-04-ground-pushed`);
  await h.yaw(500, 'q'); await p.waitForTimeout(800);
  await h.shot(`${TAG}-05-ground-turned`);
  await h.clean(false);
  await h.shot(`${TAG}-06-ground-hud`);
};
