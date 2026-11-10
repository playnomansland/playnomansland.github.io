// Headless check of the turn-around fix (2026-11-10): a body whose target lies straight behind its heading turns round
// (engine turnHeading, BACK_SIN). Before, mixing the heading toward a way exactly opposite never turned it: an Assassin
// put right behind an enemy (same column, the enemy between it and its own side) set off on its march heading and
// walked off the back of the board for the rest of the fight ("running off when placed next to a Meteor Caller").
// Run from the repo root: node tools/tests/turn-behind.js
const assert = require('assert');
const Game = require('../../src/game.js');
const E = require('../../src/engine.js');
const demo = require('../../src/demo-units.json');
const { units, matrix } = require('../../server/src/prepare-units.cjs')(E, demo);
const ui = (name) => { const i = units.findIndex(u => u.name === name); assert.ok(i >= 0, name); return i; };
const AS = ui('Assassin'), MC = ui('Meteor Caller');
const G = { distance: 42, spacing: 3.5, minDmgPct: 15, timeCap: 60, dt: 0.05, sight: 15, minSight: 18, drift: 15, flameReach: 1.2 };

// ----- the engine: a lone attacker straight behind a still target, for both sides and both target modes -----
{
  const dummy = E.withTraits({ name: 'Dummy', cost: 1, bodies: 1, hp: 1e5, hit: 0, aps: 1, range: 1, speed: 0, splash: 0, idle: true });
  for (const mode of [undefined, 'indexed']) for (const side of [0, 1]) {
    const back = side === 0 ? 1 : -1; // side 0 marches toward +y: its target lies behind it at -y
    const a = E.buildSquad(units[AS], side, 0, 0, 1, 6)[0], v = E.buildSquad(dummy, 1 - side, 0, -6 * back, 2, 6)[0];
    const bt = E.createBattle(side === 0 ? [a] : [v], side === 0 ? [v] : [a], G, mode ? { targetingMode: mode } : {});
    let far = 0;
    for (let k = 0; k < 200 && v.hp === v.u.hp; k++) { bt.step(); far = Math.max(far, Math.abs(a.y - v.y)); }
    assert.ok(v.hp < v.u.hp, `${mode || 'reference'}, side ${side}: the Assassin turns round and hits the target behind it`);
    assert.ok(far < 20, `${mode || 'reference'}, side ${side}: it doesn't walk off first (${far.toFixed(1)} m)`);
  }
}
// ----- the reported case: an Assassin on the tile right behind an enemy Meteor Caller that has escorts round it -----
{
  const m = Game.createMatch(units, matrix, 22, 'standard');
  Game.ensureTower(m, 0); Game.ensureTower(m, 1); Game.ensurePack(m, 0); Game.ensurePack(m, 1);
  m.round = 2; m.gold = [50000, 50000];
  for (const sd of [0, 1]) { for (let i = 0; i < units.length; i++) m.unlocks[sd][i] = 1; m.extraDeploys[sd] = 9; }
  // (the package already stands at 3,3: a Fire Mage)
  for (const [u, col, row] of [[MC, 4, 3], ['Goblin Swarm', 5, 3], ['Rogue', 4, 4]]) assert.ok(Game.place(m, 1, typeof u === 'number' ? u : ui(u), col, row), `enemy ${u} placed`);
  assert.ok(Game.place(m, 0, AS, 4, 2), 'the Assassin right behind the Meteor Caller');
  const bt = Game.startBattle(m);
  const a = bt.bodies.find(b => b.u.name === 'Assassin'), c = bt.bodies.find(b => b.u.name === 'Meteor Caller');
  let far = 0;
  for (let k = 0; k < 300 && c.alive; k++) { bt.step(); far = Math.max(far, Math.hypot(a.x - c.x, a.y - c.y)); }
  assert.ok(!c.alive, 'it kills the Meteor Caller');
  assert.ok(far < 15, `without running off first (${far.toFixed(1)} m at most)`);
}
// ----- turning itself: a heading dead behind turns; a small turn is the plain mix it always was -----
{
  const dummy = E.withTraits({ name: 'Dummy', cost: 1, bodies: 1, hp: 1e5, hit: 0, aps: 1, range: 1, speed: 0, splash: 0, idle: true });
  // a walker 30 m in front of a target dead behind it: within about a second it heads for it
  const w = E.buildSquad(E.withTraits({ name: 'Walker', cost: 1, bodies: 1, hp: 1e5, hit: 1, aps: 1, range: 1, speed: 3, splash: 0 }), 0, 0, 0, 1, 6)[0];
  const t = E.buildSquad(dummy, 1, 0, -30, 2, 6)[0];
  const bt = E.createBattle([w], [t], G);
  for (let k = 0; k < 30; k++) bt.step();
  assert.ok(w.hy < -0.9, `a walker turns to face a target dead behind it (heading ${w.hx.toFixed(2)}, ${w.hy.toFixed(2)})`);
}
console.log('turn-behind ok');
