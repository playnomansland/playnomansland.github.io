// Headless checks of the 2026-11-10 poison and web changes. Run from the repo root: node tools/tests/poison-web-1110.js
//  1. A web wears off and slows whether or not its target is poisoned (it used to tick only while poisoned).
//  2. A poisoned body's hits deal POISON_DMG (20) % less (not slime units).
//  3. Poison shot no longer slows the poisoner's own attacks by default; the roster's poisoners keep it (slow 30).
const assert = require('assert');
const fs = require('fs');
const E = require('../../src/engine.js');
const G = { dt: 0.05, timeCap: 60, spacing: 3.5, minDmgPct: 15, sight: 15, minSight: 18, drift: 15, flameReach: 1.2 };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const body = (side, u, y) => E.buildSquad(E.withTraits({ name: 'X', cost: 1, bodies: 1, hp: 1e6, hit: 0, aps: 1, range: 1, speed: 0, splash: 0, ...u }), side, 0, y, side + 1, 6)[0];

// 1. a web without poison: it slows, then wears off after its secs, and its damage cut goes with it
{
  const web = { shots: 1, range: 60, slow: 10, dmg: 5, max: 90, secs: 3 };
  const spider = body(0, { name: 'S', range: 60, web }, 0);
  const walker = body(1, { name: 'W', speed: 4 }, 55);
  const bt = E.createBattle([spider], [walker], G);
  let webbedAt = -1, slowSteps = 0;
  for (let k = 0; k < 140; k++) {
    const y = walker.y; bt.step();
    if (walker.web && webbedAt < 0) webbedAt = k;
    if (walker.web && !(walker.poison && walker.poison.length)) {
      if (near(Math.abs(walker.y - y), 4 * G.dt * 0.9)) slowSteps++;
    }
  }
  assert.ok(webbedAt >= 0, 'the web landed');
  assert.ok(!(walker.poison && walker.poison.length), 'no poison involved');
  assert.strictEqual(walker.web, null, 'the web wore off without poison');
  assert.ok(slowSteps > 30, 'webbed without poison: 10% slower (' + slowSteps + ' steps)');
}

// 2. a poisoned body hits 20% softer
assert.strictEqual(E.POISON_DMG, 20);
function dealt(extra) {
  // a target that poisons whatever hits it (a long poison from an attacker that does no damage) and one that hits it
  const poisoner = body(1, { name: 'P', hit: 1, range: 60, poisonPct: 1, poisonDur: 1000 }, 50);
  const hitter = body(0, { name: 'H', hit: 100, range: 60, ...extra }, 0);
  const bt = E.createBattle([hitter], [poisoner], G);
  for (let k = 0; k < 200; k++) bt.step();
  return hitter;
}
{
  const plain = body(0, { name: 'H', hit: 100, range: 60 }, 0);
  const tgt = body(1, { name: 'T', hit: 0, range: 60 }, 50);
  const bt = E.createBattle([plain], [tgt], G);
  for (let k = 0; k < 200; k++) bt.step();
  const clean = plain.dealt;
  const pois = dealt({});
  assert.ok(pois.poison && pois.poison.length, 'the hitter is poisoned');
  // the first hit (before the poison lands) is full, the rest 80%
  assert.ok(pois.dealt < clean * 0.85 && pois.dealt > clean * 0.75, `poisoned: ~20% less (${pois.dealt} vs ${clean})`);
  const slime = dealt({ slime: true });
  assert.ok(near(slime.dealt, clean, 1e-3), `slime units drink poison: no cut (${slime.dealt} vs ${clean})`);
}

// 3. Poison shot's attack-speed cost: 0 by default, 30 where the roster sets it
{
  const base = { name: 'U', cost: 1, bodies: 1, hp: 100, hit: 10, aps: 1, range: 5, speed: 1, splash: 0 };
  const def = E.applySkills(base, [{ type: 'poison', params: {} }]);
  assert.ok(near(def.aps, 1), 'default Poison shot: no slower attacks');
  const set = E.applySkills(base, [{ type: 'poison', params: { slow: 30 } }]);
  assert.ok(near(set.aps, 1 / 1.3), 'slow 30: 30% longer between attacks');
  for (const f of ['src/default-roster.json', 'src/skills-default.json', 'src/demo-units.json', 'src/faction-units.json']) {
    const found = [];
    (function walk(o) {
      if (Array.isArray(o)) return o.forEach(walk);
      if (o && typeof o === 'object') { if (o.type === 'poison') found.push(o); Object.values(o).forEach(walk); }
    })(JSON.parse(fs.readFileSync(f, 'utf8')));
    assert.ok(found.length, f + ' has poison skills');
    for (const s of found) {
      const want = s.name === 'Graverot arrows' ? 0 : 30;
      assert.strictEqual(+(s.params || {}).slow, want, `${f}: ${s.name} keeps slow ${want}`);
    }
  }
}
console.log('poison and web 1110 ok');
