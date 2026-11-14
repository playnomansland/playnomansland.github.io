// Headless check of the V2WIP developer mode (src/v2wip.json, src/v2wip-units.json): its roster, the Warper's Teleport
// and the Catcher's hook. Run from the repo root: node tools/tests/v2wip.js
// - Roster: the standard one without Slime Wizard and Slimeshots, plus Warper (tier 2) and Catcher (tier 3); no Slime
//   tower in the offer. The standard roster's own table (src/demo-units.json) has neither new unit.
// - Warper: a tile in its own zone; the enemy squad straight across is rooted at once and moved there WARP.secs later,
//   in formation; not a tower; not if the Warper has fallen; hidden from the opponent while deploying.
// - Catcher: the hook flies in a line, the first enemy it touches takes hook.hit and is reeled into the Catcher's reach,
//   unable to walk or attack on the way; a body that can't be displaced takes the hit and stays; the arrow's line gets
//   the first throw. Netcaster pulls up to 4 and gives the strike splash; Gutter throws further and faster and its
//   strikes (not the hook) add bleed. The two skills are either-or.
// - A whole AI match on the roster plays through, and the AI's Warpers pick tiles.
const assert = require('assert');
const E = require('../../src/engine.js');
const Game = require('../../src/game.js');
const v2 = require('../../src/v2wip-units.json');
const demo = require('../../src/demo-units.json');

const skillOf = (id) => v2.skills.find(x => x.id === id);
const units = v2.units.map(u => ({ ...E.withTraits(u), level: 0, skillDefs: E.SLOTS.map(k => {
  const base = Array.isArray(u.skills) && u.skills[k] ? skillOf(u.skills[k]) : null;
  if (!base) return null;
  const mod = Array.isArray(u.skillMods) && u.skillMods[k] && typeof u.skillMods[k] === 'object' ? u.skillMods[k] : null;
  return mod ? { ...base, cost: mod.cost != null ? +mod.cost : base.cost, params: { ...base.params, ...(mod.params || {}) } } : base;
}) }));
const ix = (n) => { const i = units.findIndex(u => u.name === n); assert.ok(i >= 0, n); return i; };
const OPTS = { offTowers: v2.offTowers, v2: true };
const fresh = () => { const m = Game.createMatch(units, v2.matrix, 5, 'standard', null, v2.offChars, OPTS); m.armies = [[], []]; m.round = 4; return m; };
let nid = 100;
const put = (m, side, name, col, row, extra) => { const sq = { id: nid++, unit: ix(name), col, row, round: 1, xp: 0, level: 0, cost: 0, ...extra }; m.armies[side].push(sq); return sq; };
const run = (bt, until) => { while (bt.time() < until - 1e-9 && bt.step()) {} };
const of = (bt, side, sq) => bt.bodies.filter(b => b.side === side && b.squad === sq.id);

// ---------- the roster ----------
{
  const names = v2.units.map(u => u.name);
  assert.ok(!names.includes('Slime Wizard') && !names.includes('Slimeshots'), 'the slime units are out');
  assert.ok(names.includes('Warper') && names.includes('Catcher'), 'the new units are in');
  assert.strictEqual(v2.units.length, v2.matrix.length);
  assert.strictEqual(units[ix('Warper')].cost, 2, 'Warper: tier 2');
  assert.strictEqual(units[ix('Catcher')].cost, 3, 'Catcher: tier 3');
  assert.ok(v2.offTowers.includes('slime'), 'no Slime tower');
  const m = fresh();
  assert.ok(m.v2 && m.offTowers.includes('slime'));
  assert.ok(!Game.towerChoices(m, 0).some(t => t.id === 'slime'), 'the Slime tower is not offered');
  // the live roster is as it was
  const live = demo.units.map(u => u.name);
  assert.ok(live.includes('Slime Wizard') && live.includes('Slimeshots') && !live.includes('Warper') && !live.includes('Catcher'), 'the standard roster is untouched');
}

// ---------- Warper: the rules ----------
{
  const m = fresh();
  const w = put(m, 0, 'Warper', 5, 12), br = put(m, 0, 'Brute', 6, 12);
  assert.ok(Game.canWarp(m, 0, w) && !Game.canWarp(m, 0, br) && !Game.canWarp(m, 1, w));
  assert.ok(!Game.setWarp(m, 0, br.id, 3, 11), 'only a Warper');
  assert.ok(!Game.setWarp(m, 0, w.id, 3, 7) && !w.warp, 'not in no man\'s land');
  assert.ok(!Game.setWarp(m, 0, w.id, 3, 4) && !w.warp, 'not in the enemy\'s zone');
  assert.ok(!Game.setWarp(m, 0, w.id, -1, 11) && !w.warp, 'on the board');
  assert.ok(Game.setWarp(m, 0, w.id, 3, 11));
  assert.deepStrictEqual(w.warp, { col: 3, row: 11 });
  assert.ok(!Game.setWarp(m, 0, w.id, 3, 11), 'the same tile again changes nothing');
  assert.deepStrictEqual(Game.warpFrom(w.warp), { col: 3, row: Game.ROWS - 1 - 11 }, 'straight across: the same column, the row mirrored');
  const foe = put(m, 1, 'Brute', 3, Game.ROWS - 1 - 11), other = put(m, 1, 'Brute', 4, Game.ROWS - 1 - 11);
  assert.strictEqual(Game.warpedBy(m, 1, foe), w);
  assert.strictEqual(Game.warpedBy(m, 1, other), null);
  // hidden from the opponent while deploying
  w.round = 1;
  const seen = Game.seenBy(m, 1).armies[0].find(q => q.id === w.id);
  assert.ok(seen && !seen.warp, 'the opponent does not see the tile');
  assert.ok(Game.clearWarp(m, 0, w.id) && !w.warp && !Game.clearWarp(m, 0, w.id));
}

// ---------- Warper: the fight ----------
{
  const m = fresh();
  const w = put(m, 0, 'Warper', 8, 13);
  const row = Game.ROWS - 1 - 11;
  const foe = put(m, 1, 'Goblin Swarm', 3, row), free = put(m, 1, 'Goblin Swarm', 9, row);
  Game.setWarp(m, 0, w.id, 3, 11);
  const bt = Game.startBattle(m);
  const held = of(bt, 1, foe), loose = of(bt, 1, free);
  assert.ok(held.length > 1 && held.every(b => b.warp) && loose.every(b => !b.warp), 'only the squad across is taken');
  const tower = bt.bodies.filter(b => b.u.structure);
  assert.ok(tower.every(b => !b.warp), 'never a tower');
  const at0 = held.map(b => ({ x: b.x, y: b.y })), l0 = loose.map(b => ({ x: b.x, y: b.y }));
  run(bt, 1.0);
  // (bodies of a squad still shuffle apart a little where they stand: the engine's spacing, not walking)
  held.forEach((b, i) => assert.ok(Math.hypot(b.x - at0[i].x, b.y - at0[i].y) < 3, `rooted for the first second (${Math.hypot(b.x - at0[i].x, b.y - at0[i].y).toFixed(2)} m)`));
  assert.ok(loose.every((b, i) => Math.hypot(b.x - l0[i].x, b.y - l0[i].y) > 3.5), 'the squad beside it walks');
  const to = Game.tileToWorld(3, 11), fr = Game.tileToWorld(3, row);
  let before = held.map(b => ({ x: b.x, y: b.y }));
  while (!held[0].warped && bt.time() < 3) { before = held.map(b => ({ x: b.x, y: b.y })); bt.step(); }
  assert.ok(Math.abs(bt.time() - Game.WARP.secs) < 0.11, `teleported after ${Game.WARP.secs} s (${bt.time().toFixed(2)})`);
  held.forEach((b, i) => {
    assert.ok(!b.warp && b.warped, 'moved');
    assert.ok(Math.hypot(b.x - (before[i].x + to.x - fr.x), b.y - (before[i].y + to.y - fr.y)) < 1, 'by the way from the tile across to the picked tile, in formation');
    assert.ok(Math.hypot(b.x - to.x, b.y - to.y) < Game.TILE, 'on the picked tile');
  });
  while (bt.step()) {}
  assert.ok(bt.result(), 'the fight ends');
}
// its Warper falls first: the squad is let go where it stands
{
  const m = fresh();
  const w = put(m, 0, 'Warper', 8, 13), row = Game.ROWS - 1 - 11, foe = put(m, 1, 'Brute', 3, row);
  put(m, 0, 'Ent', 10, 15); // (someone left on its side, so the fight goes on)
  Game.setWarp(m, 0, w.id, 3, 11);
  const bt = Game.startBattle(m);
  const held = of(bt, 1, foe), y0 = held[0].y;
  for (const b of of(bt, 0, w)) { b.alive = false; b.hp = 0; }
  run(bt, Game.WARP.secs + 0.2);
  assert.ok(!held[0].warp && !held[0].warped, 'not moved');
  assert.ok(Math.abs(held[0].y - Game.tileToWorld(3, 11).y) > 20, 'still on its own side');
  run(bt, Game.WARP.secs + 2);
  assert.ok(Math.abs(held[0].y - y0) > 0.5, '...and walking again');
}

// ---------- Catcher: the rules ----------
{
  const m = fresh();
  const c = put(m, 0, 'Catcher', 5, 10), br = put(m, 0, 'Brute', 6, 12);
  assert.ok(Game.canHook(m, 0, c) && !Game.canHook(m, 0, br));
  assert.ok(!Game.setHook(m, 0, br.id, 0, -1) && !Game.setHook(m, 0, c.id, 0, 0));
  assert.ok(Game.setHook(m, 0, c.id, 1, -3));
  assert.deepStrictEqual(c.hookAim, { dc: 1, dr: -3 });
  assert.strictEqual(Game.hookRange(m, 0, c), 42);
  c.round = 1;
  assert.ok(!Game.seenBy(m, 1).armies[0].find(q => q.id === c.id).hookAim, 'the opponent does not see the arrow');
  // either-or skills
  const ui = ix('Catcher');
  m.gold[0] = 1000;
  assert.ok(Game.canBuySkill(m, 0, ui, 0) && Game.canBuySkill(m, 0, ui, 1));
  assert.ok(Game.buySkill(m, 0, ui, 1), 'Gutter');
  assert.ok(!Game.canBuySkill(m, 0, ui, 0), 'Netcaster is closed once Gutter is bought');
  assert.strictEqual(Game.hookRange(m, 0, c), 50, 'Gutter: 50 m');
  assert.ok(Game.clearHook(m, 0, c.id) && !c.hookAim);
}

// ---------- Catcher: the fight (engine level) ----------
const G = { distance: 42, spacing: 3.5, minDmgPct: 15, timeCap: 60, dt: 0.05, sight: 15, minSight: 18, drift: 15, flameReach: 1.2 };
const catcher = units[ix('Catcher')];
const withSkill = (id) => E.applySkills(catcher, [skillOf(id)], units);
const dummy = (extra) => E.withTraits({ name: 'Dummy', cost: 1, bodies: 1, hp: 5000, hit: 1, aps: 1, range: 2, speed: 0, splash: 0, ...extra });
const duel = (cu, foes, hookDir) => {
  const A = E.buildSquad(cu, 0, 0, 0, 1, 6);
  if (hookDir) A[0].hookDir = hookDir;
  const B = [];
  foes.forEach(([u, x, y], k) => { for (const b of E.buildSquad(u, 1, x, y, 10 + k, 6, B.length)) B.push(b); });
  return { bt: E.createBattle(A, B, G, { record: true }), c: A[0], B };
};
// one target, straight ahead: hit, reeled in, helpless on the way
{
  const { bt, c, B } = duel(catcher, [[dummy({ speed: 0 }), 0, 25]]);
  const v = B[0];
  let sawHook = false, walkedOnHook = false, flew = 0, lost = null, at = null;
  while (bt.time() < 6 && bt.step()) {
    if (bt.projectiles().some(p => p.hook)) flew += G.dt;
    if (c.hookOut) { if (!at) at = { x: c.x, y: c.y }; else if (Math.hypot(c.x - at.x, c.y - at.y) > 1e-9) walkedOnHook = true; } else at = null;
    if (v.hooked) { sawHook = true; if (lost == null) lost = 5000 - v.hp; }
    if (!v.hooked && sawHook) break;
  }
  assert.ok(sawHook, 'the hook caught it');
  assert.ok(flew > 0.9 && flew < 1.5, `25 m at 20 m/s: about 1.2 s in the air (${flew.toFixed(2)})`);
  assert.ok(Math.abs(lost - 100) < 1e-6, `the hook's hit is 100 (${lost})`);
  assert.ok(Math.hypot(v.x - c.x, v.y - c.y) <= catcher.range + 1e-6, 'reeled into its reach');
  assert.ok(!walkedOnHook, 'the Catcher holds still while its hook is out');
  assert.ok(c.hookCd > 5, 'the next throw waits for its cooldown');
}
// out of range: no throw
{
  const { bt } = duel({ ...catcher, speed: 0 }, [[dummy({ speed: 0 }), 0, 45]]);
  let any = false;
  while (bt.time() < 3 && bt.step()) if (bt.projectiles().some(p => p.hook)) any = true;
  assert.ok(!any, '45 m is out of the hook\'s 42 m');
}
// Gutter: 50 m, faster, and bleed from its strikes only
{
  const gu = withSkill('gutter');
  assert.strictEqual(gu.hook.range, 50); assert.strictEqual(gu.hook.speed, 30); assert.strictEqual(gu.bleedHit, 2);
  const { bt, c, B } = duel({ ...gu, speed: 0 }, [[dummy({ speed: 0 }), 0, 47]]);
  const v = B[0];
  let caught = false, bledOnHook = false;
  while (bt.time() < 4 && bt.step()) { if (v.hooked) { caught = true; if (v.bleed) bledOnHook = true; } if (caught && !v.hooked) break; }
  assert.ok(caught, 'Gutter reaches 47 m');
  assert.ok(!bledOnHook, 'the hook itself adds no bleed');
  while (bt.time() < 8 && bt.step()) if (v.bleed) break;
  assert.ok(v.bleed && v.bleed.n >= 2, 'its strike adds 2 bleed');
  assert.ok(c.alive);
}
// a body that can't be displaced: it never picks one for itself; thrown at one along the arrow, the body takes the hit and stays
{
  const self = duel({ ...catcher, speed: 0 }, [[dummy({ speed: 0, unstoppable: true }), 0, 20]]);
  run(self.bt, 3);
  assert.strictEqual(self.B[0].hp, 5000, 'no throw at a body it could not reel in');
  const { bt, c, B } = duel({ ...catcher, speed: 0 }, [[dummy({ speed: 0, unstoppable: true }), 0, 20]], { x: 0, y: 1 });
  const v = B[0];
  run(bt, 3);
  assert.ok(Math.abs((5000 - v.hp) - 100) < 1e-6 && Math.abs(v.y - 20) < 1e-6 && !v.hooked, 'hit, not moved');
  assert.ok(!c.hookOut, 'the Catcher is free again');
}
// the catch box: a body that shares a tile with the hook is caught, though the hook passes 2.5 m beside it; 4 m off is missed
{
  const { bt, B } = duel({ ...catcher, speed: 0 }, [[dummy({ speed: 0 }), 2.5, 20]], { x: 0, y: 1 });
  run(bt, 2);
  assert.ok(B[0].hp < 5000, 'caught 2.5 m off the line');
  const far = duel({ ...catcher, speed: 0 }, [[dummy({ speed: 0 }), 4, 20]], { x: 0, y: 1 });
  run(far.bt, 1.5);
  assert.strictEqual(far.B[0].hp, 5000, '4 m off the line: the arrow waits for the line');
}
// the first thing on the line is what it catches
{
  const { bt, B } = duel({ ...catcher, speed: 0 }, [[dummy({ speed: 0 }), 0, 24], [dummy({ speed: 0, name: 'Front' }), 0, 12]], { x: 0, y: 1 });
  run(bt, 3);
  assert.ok(B[1].hp < 5000 && B[0].hp === 5000, 'the nearer body on the line stops the hook');
}
// the arrow's line gets the first throw: a nearer enemy off the line is left alone
{
  const { bt, B } = duel({ ...catcher, speed: 0 }, [[dummy({ speed: 0 }), 0, 24], [dummy({ speed: 0, name: 'Side' }), 14, 0]], { x: 0, y: 1 });
  run(bt, 2.5);
  assert.ok(B[0].hp < 5000 && B[1].hp === 5000, 'thrown along the arrow, not at the nearest');
}
// nobody on the line: it gives the arrow up after HOOK_WAIT and picks for itself
{
  const { bt, B } = duel({ ...catcher, speed: 0 }, [[dummy({ speed: 0 }), 14, 0]], { x: 0, y: 1 });
  run(bt, 1.5);
  assert.strictEqual(B[0].hp, 5000, 'it waits for the line first');
  run(bt, 5);
  assert.ok(B[0].hp < 5000, 'then throws at the nearest');
}
// Netcaster: up to 4 bodies per throw, and the strike splashes
{
  const nc = withSkill('netcaster');
  assert.strictEqual(nc.hook.max, 4); assert.ok(nc.splash >= 3);
  const mob = dummy({ speed: 0, bodies: 9, hp: 400 });
  const { bt, B } = duel({ ...nc, speed: 0 }, [[mob, 0, 20]]);
  let most = 0;
  while (bt.time() < 3 && bt.step()) most = Math.max(most, B.filter(b => b.hooked).length);
  assert.strictEqual(most, 4, `the net takes 4 (${most})`);
  assert.strictEqual(B.filter(b => b.hp < 400 || !b.alive).length >= 4, true);
  const one = duel({ ...catcher, speed: 0 }, [[mob, 0, 20]]);
  let m1 = 0;
  while (one.bt.time() < 3 && one.bt.step()) m1 = Math.max(m1, one.B.filter(b => b.hooked).length);
  assert.strictEqual(m1, 1, 'the plain hook takes 1');
}
// a hooked body can't attack
{
  const shooter = dummy({ speed: 0, hit: 50, aps: 5, range: 40, name: 'Shooter' });
  const { bt, c, B } = duel({ ...catcher, speed: 0, hook: { ...catcher.hook, reel: 2 } }, [[shooter, 0, 25]]); // a slow reel, to watch it
  let hpAtCatch = null, hpLater = null;
  while (bt.time() < 6 && bt.step()) {
    if (B[0].hooked && hpAtCatch == null) hpAtCatch = c.hp;
    if (B[0].hooked) hpLater = c.hp;
  }
  assert.ok(hpAtCatch != null && hpAtCatch < catcher.hp, 'it shot before it was caught');
  assert.ok(hpAtCatch - hpLater <= 50 + 1e-6, 'and (but for a shot already on its way) not while on the hook');
}

// ---------- the same fight twice: the same result ----------
{
  const play = () => {
    const m = fresh();
    const w = put(m, 0, 'Warper', 8, 13), c = put(m, 0, 'Catcher', 5, 10); put(m, 0, 'Skeleton Archers', 6, 11);
    put(m, 1, 'Sniper', 5, 5); put(m, 1, 'Goblin Swarm', 3, 4); put(m, 1, 'Catcher', 7, 5); const w2 = put(m, 1, 'Warper', 2, 2);
    Game.setWarp(m, 0, w.id, 3, 11); Game.setHook(m, 0, c.id, 0, -1); Game.setWarp(m, 1, w2.id, 6, 4);
    const bt = Game.startBattle(m); let n = 0, h = 0;
    while (bt.step()) { n++; for (const b of bt.bodies) h = (h * 31 + Math.round(b.x * 1000) + Math.round(b.y * 1000) * 7 + Math.round(b.hp * 10)) | 0; }
    return [n, h, JSON.stringify(bt.result().score)].join('|');
  };
  nid = 500; const a = play(); nid = 500; const b = play();
  assert.strictEqual(a, b, 'deterministic');
}

// ---------- the AI: its Warpers pick a tile across from an enemy squad, and whole matches play through ----------
{
  const m = fresh();
  const w = put(m, 1, 'Warper', 4, 2);
  const big = put(m, 0, 'War Mammoth', 7, 12), small = put(m, 0, 'Goblin Swarm', 2, 11);
  Game.aiOrders(m, 1);
  assert.deepStrictEqual(w.warp, { col: 7, row: Game.ROWS - 1 - 12 }, 'across from the priciest squad it has seen');
  assert.strictEqual(Game.warpedBy(m, 0, big), w); assert.strictEqual(Game.warpedBy(m, 0, small), null);
}
{
  let warps = 0, hooks = 0, fielded = { Warper: 0, Catcher: 0 };
  for (let seed = 1; seed <= 6; seed++) {
    const m = Game.createMatch(units, v2.matrix, seed, 'standard', null, v2.offChars, OPTS);
    for (let guard = 0; !m.over && guard < 25; guard++) {
      Game.aiDeploy(m, 0); Game.aiDeploy(m, 1);
      Game.aiLevel(m, 0); Game.aiLevel(m, 1);
      for (const sd of [0, 1]) for (const q of m.armies[sd]) { const n = units[q.unit].name; if (fielded[n] != null) fielded[n]++; assert.ok(n !== 'Slime Wizard' && n !== 'Slimeshots'); }
      const sim = Game.startBattle(m);
      while (sim.step()) { if (sim.bodies.some(b => b.warped)) warps++; if (sim.projectiles().some(p => p.hook)) hooks++; }
      Game.resolve(m, sim.result());
    }
    assert.ok(m.over, `match ${seed} ends`);
    assert.ok(!m.towers || [0, 1].every(sd => !m.towers[sd] || m.towers[sd].type !== 'slime'), 'no Slime tower picked');
  }
  console.log(`6 AI matches on V2WIP: Warper squad-rounds ${fielded.Warper}, Catcher squad-rounds ${fielded.Catcher}, ticks with a teleported body ${warps}, ticks with a hook in the air ${hooks}`);
}
console.log('v2wip: all good');
