// Headless prototype of the "Mommy" boss puzzle (design draft, November 2026). Nothing here ships: the game's own
// engine file is left as it is. This script loads src/engine.js with four small additions (PATCHES below) and drives
// the boss's rules from a per-tick hook, so the rules can change freely while the design is still open.
//
// The rules as prototyped (all numbers in CFG are starting points to tune):
//   - Mommy hangs at the middle of her zone and never moves. Her health carries over between rounds.
//   - Hanging: she takes CFG.mommy.hang of all damage and can't be stunned, slowed or moved.
//   - Nests stand in scripted places each round (CFG.nests). Only ranged units (range >= CFG.nest.rangedOnly) can
//     target or hurt them. Each hatches a spider every CFG.hatch[round] seconds; a destroyed nest bursts into
//     CFG.nest.burst spiders.
//   - All nests down: she falls, is stunned for CFG.mommy.stun seconds and takes full damage for the rest of the fight.
//   - Attention: while she hangs and no enemy body stands within her reach (CFG.mommy.near m), she winds up a web mortar at the
//     biggest clump of the player's army.
//   - Web: every enemy body within her reach is slowed and hits softer.
//   - Molt: every CFG.mommy.molt seconds she sheds poison, bleed, burn, frost, slows and range cuts.
//   - The player: normal match income, every allowed unit unlocked, skills on, one free move and one free extra
//     deployment a round, a treasury (no tower): the game's own rule, 50 gold for each fight it survives, gold lost when it falls.
//
// Run from the repo root:  node tools/boss/mommy.js            (unit ranking, then the sample plans)
//                          node tools/boss/mommy.js rank|plans|search
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.join(__dirname, '..', '..');

// ---------- the engine, with the prototype's hooks ----------
const PATCHES = [
  // a body with u.rangedOnly = N can only be picked by bodies whose range is at least N
  ['const pickable = (b, f) => f.alive && (!f.hidden || seesHidden(b, f)) && !sheltered(f) && !(b.hunt && !isLone(f)) && !ignores(b, f);',
    'const pickable = (b, f) => f.alive && (!f.hidden || seesHidden(b, f)) && !sheltered(f) && !(b.hunt && !isLone(f)) && !ignores(b, f) && !(f.u.rangedOnly > 0 && b.u.range < f.u.rangedOnly);'],
  // ...nor hurt by their splash; b.takeMul scales every hit a body takes; damage to a tagged body is counted per attacker
  ['      st.blocked += hit - dmg;\n      const applied = Math.min(dmg, poolHp(v));',
    '      if (v.u.rangedOnly > 0 && owner.u.range < v.u.rangedOnly) return;\n      if (v.takeMul != null) dmg *= v.takeMul;\n      st.blocked += hit - dmg;\n      const applied = Math.min(dmg, poolHp(v));\n      if (v.bossTag) owner.bossDealt = (owner.bossDealt || 0) + applied;'],
  // ...and so is damage that skips armor (poison, bleed, burn)
  ['      if (v.turning || v.u.aloft || sheltered(v)) return;\n      const applied = Math.min(amount, poolHp(v));',
    '      if (v.turning || v.u.aloft || sheltered(v)) return;\n      if (v.takeMul != null) amount *= v.takeMul;\n      const applied = Math.min(amount, poolHp(v));\n      if (v.bossTag) owner.bossDealt = (owner.bossDealt || 0) + applied;'],
  // bleed's share of max health (3 and 4 stacks) skips a body marked noPct
  ['if (BLEED.pct[bl.n] > 0 && !b.u.structure) dmg +=', 'if (BLEED.pct[bl.n] > 0 && !b.u.structure && !b.noPct) dmg +='],
  // a hook once a tick, before the ongoing effects and the attacks
  ['      // ongoing effects: poison, bleed, regeneration, shortsight wearing off, spawns\n',
    '      if (opts.bossTick) opts.bossTick({ t, dt, all, sides, hurt, direct, record: !!opts.record, shots });\n      // ongoing effects: poison, bleed, regeneration, shortsight wearing off, spawns\n'],
];
function loadEngine() {
  let src = fs.readFileSync(path.join(ROOT, 'src', 'engine.js'), 'utf8');
  for (const [from, to] of PATCHES) {
    assert.strictEqual(src.split(from).length, 2, 'engine patch must match exactly once: ' + from.slice(0, 60));
    src = src.replace(from, () => to);
  }
  const mod = { exports: {} };
  new Function('module', 'require', src)(mod, require);
  return mod.exports;
}
const Engine = loadEngine();
global.Engine = Engine; // src/game.js picks this one up
const Game = require(path.join(ROOT, 'src', 'game.js'));
const { units, matrix } = require(path.join(ROOT, 'server', 'src', 'prepare-units.cjs'))(Engine, require(path.join(ROOT, 'src', 'demo-units.json')));
const ix = (n) => { const i = units.findIndex((u) => u.name === n); assert.ok(i >= 0, 'no unit ' + n); return i; };
const TILE = Game.TILE || 6;

// ---------- the design's numbers ----------
const CFG = {
  rounds: 5,          // kill her by the end of this round
  fightSecs: 30,
  banned: ['Meteor Caller', 'Assassin', 'Rogue', 'Truespear', 'Sun Priest'],
  mommy: {
    hp: 14000, col: 5.5, row: 5, // the front edge of her zone
    hang: 0.15,       // share of damage she takes while hanging
    stun: 5,          // seconds stunned after the fall
    near: 16,         // m: her reach. A body this close holds her attention, and is bitten and webbed
    bite: { hit: 150, aps: 0.8, splash: 0 },
    sweep: { hit: 70, aps: 1, splash: 5 }, // the bite in CFG.sweepRounds: hits everything near its target
    web: { slow: 40, dmg: 40 },
    mortar: { wind: 8, every: 4, hit: 350, r: 6, slow: 60, dmg: 60, secs: 4 }, // wind: seconds with nobody in reach before the first one (long enough to walk to her)
    molt: 6,          // seconds between sheds (0: never)
    bleedPct: false,  // whether bleed's share of max health works on her
    size: 4,          // m: how far out her body reaches once she lies on the ground (melee can crowd round her)
  },
  sweepRounds: [3, 4],
  nest: { hp: [300, 500, 900, 1300, 1800], rangedOnly: 8, burst: 3 }, // health by round (armies grow about sevenfold over five rounds)
  hatch: [6, 5, 4, 3, 3],                        // seconds per spider, per nest, by round
  nests: [                                       // [col, row] by round (rows 6-9 are no man's land)
    [[3, 7], [8, 7]],
    [[1, 6], [5.5, 8], [10, 6]],
    [[2, 8], [9, 8], [5.5, 2]],
    [[0, 7], [4, 6], [7, 6], [11, 7]],
    [[0, 7], [4, 6], [7, 6], [11, 7]],
  ],
  treasury: { hp: 400, col: 4, row: 15 },
};

// ---------- the boss's bodies ----------
const world = (col, row) => Game.tileToWorld(col, row);
const byRound = (v, round) => Array.isArray(v) ? v[Math.min(round, v.length) - 1] : v;
const spiderUnit = () => { const { skills, skillDefs, skillsInnate, skillMods, skillOr, skillNeedsAny, ...s } = units[ix('Spiders')]; return Engine.withTraits({ ...s, name: 'Spiderling', bodies: 1 }); };
const mommyUnit = (cfg, round) => {
  const a = cfg.sweepRounds.includes(round) ? cfg.mommy.sweep : cfg.mommy.bite;
  return Engine.withTraits({ name: 'Mommy', cost: 0, bodies: 1, hp: cfg.mommy.hp, hit: a.hit, aps: a.aps, range: cfg.mommy.near, splash: a.splash, speed: 0, anchored: true, unstoppable: true, shape: 'spider', color: '#1a1a1a', level: 0 });
};
const nestUnit = (cfg, round) => Engine.withTraits({ name: 'Nest', cost: 0, bodies: 1, hp: byRound(cfg.nest.hp, round), hit: 0, aps: 1, range: 0, speed: 0, splash: 0, structure: true, lesser: true, kind: 'nest', shape: 'circle', color: '#d8d0c0', level: 0,
  rangedOnly: cfg.nest.rangedOnly,
  spawn: { every: byRound(cfg.hatch, round), count: 1, max: 999, waves: 0, unit: spiderUnit() },
  ...(cfg.nest.burst > 0 ? { deathSpawn: { name: 'Spiderling', unit: spiderUnit(), count: cfg.nest.burst, strength: 1 } } : {}) });
const treasuryUnit = (cfg) => Engine.withTraits({ name: 'Treasury', cost: 0, bodies: 1, hp: cfg.treasury.hp, hit: 0, aps: 1, range: 0, speed: 0, splash: 0, structure: true, lesser: true, kind: 'treasury', shape: 'square', color: '#D9B95B', level: 0 });

// ---------- one fight ----------
// m: the match (the player is side 0). st: { hp } Mommy's health, carried between rounds. o: { nests, fallen, fallAt
// (she falls at this time whatever the nests), noHatch, noTreasury, secs } for the test scenarios. Returns what happened.
function fight(m, st, cfg = CFG, o = {}) {
  const round = m.round;
  const { g, opts } = Game.battleSetup(m);
  g.timeCap = o.secs || cfg.fightSecs;
  const A = Game.bodiesFor(m, 0);
  let tre = null;
  if (!o.noTreasury) { const w = world(cfg.treasury.col, cfg.treasury.row); [tre] = Engine.buildSquad(treasuryUnit(cfg), 0, w.x, w.y, -150, TILE, A.length); A.push(tre); }
  const mw = world(cfg.mommy.col, cfg.mommy.row);
  const [mom] = Engine.buildSquad(mommyUnit(cfg, round), 1, mw.x, mw.y, 0, TILE, 0);
  mom.hp = st.hp; mom.bossTag = true; mom.noPct = !cfg.mommy.bleedPct;
  const spots = o.nests || byRound(cfg.nests, round);
  const nu = o.noHatch ? { ...nestUnit(cfg, round), spawn: null, deathSpawn: null } : nestUnit(cfg, round);
  const nests = spots.map(([c, r], k) => { const w = world(c, r); return Engine.buildSquad(nu, 1, w.x, w.y, -20 - k, TILE, 1 + k)[0]; });
  const B = [mom, ...nests];
  const out = { round, fallAt: null, mortars: 0, mortarAt: null, hang: 0, ground: 0, nestsLeft: 0, end: 0, treasury: null };
  let hanging = !o.fallen, quiet = 0, shots = 0, moltT = cfg.mommy.molt, last = mom.hp;
  const visible = (f) => f.alive && f.side === 0 && !f.u.structure && !f.u.aloft && !f.hidden && !(f.inside && f.inside.alive) && !(f.delay > 0);
  const d2 = (a, x, y) => { const dx = a.x - x, dy = a.y - y; return Math.sqrt(dx * dx + dy * dy); };
  const ground = (u) => ({ ...u, unstoppable: false, ...(cfg.mommy.size > 0 ? { barrier: cfg.mommy.size } : {}) });
  if (!hanging) { mom.takeMul = 1; mom.stunT = o.fallen === true ? 1e9 : o.fallen; out.fallAt = 0; mom.u = ground(mom.u); }
  const bossTick = (api) => {
    if (!mom.alive) return;
    out[hanging ? 'hang' : 'ground'] += last - mom.hp; last = mom.hp;
    if (hanging && (o.fallAt != null ? api.t >= o.fallAt : !nests.some((n) => n.alive))) { // the last nest is down: she falls
      hanging = false; out.fallAt = api.t; mom.takeMul = 1; mom.stunT = Math.max(mom.stunT, cfg.mommy.stun);
      mom.u = ground(mom.u);
    }
    mom.x = mw.x; mom.y = mw.y;
    if (hanging) { mom.takeMul = cfg.mommy.hang; mom.stunT = 0; mom.frozenT = 0; }
    // molt: she sheds what was put on her
    if (cfg.mommy.molt > 0) { moltT -= api.dt; if (moltT <= 0) { moltT += cfg.mommy.molt; mom.poison = null; mom.bleed = null; mom.burn = null; mom.frost = null; mom.web = null; mom.slowT = 0; mom.slowMove = 0; mom.slowAtk = 0; mom.shrinkT = 0; mom.shrinkM = 0; } }
    const stunned = mom.stunT > 0;
    // web: everything close to her is slowed and hits softer (not while she lies stunned)
    const wb = cfg.mommy.web;
    for (const f of api.sides[0]) {
      if (!f.alive || f.u.structure) continue;
      if (!stunned && wb.slow + wb.dmg > 0 && d2(f, mw.x, mw.y) <= cfg.mommy.near) {
        f.momWeb = true; f.web = { slow: Math.max(wb.slow, f.web && !f.momWebOnly ? f.web.slow : 0), dmg: Math.max(wb.dmg, f.web && !f.momWebOnly ? f.web.dmg : 0), t: 1, max: 90 }; f.momWebOnly = true;
        if (!f.u.unstoppable) { if (!(f.slowT > 0)) { f.slowMove = 0; f.slowAtk = 0; } f.slowMove = Math.max(f.slowMove, wb.slow); f.slowT = Math.max(f.slowT, api.dt * 1.5); }
      } else if (f.momWeb && !(f.mortarWebT > api.t)) { f.momWeb = false; f.momWebOnly = false; f.web = null; }
    }
    // attention: nobody close while she hangs, and the mortar winds up
    if (!hanging || stunned) { quiet = 0; shots = 0; return; }
    const mo = cfg.mommy.mortar;
    if (api.sides[0].some((f) => visible(f) && d2(f, mw.x, mw.y) <= cfg.mommy.near)) { quiet = 0; shots = 0; return; }
    quiet += api.dt;
    if (!(mo.hit > 0) || quiet + 1e-9 < mo.wind + shots * mo.every) return;
    shots++;
    let best = null, bn = 0;
    for (const f of api.sides[0]) {
      if (!visible(f)) continue;
      let n = 0; for (const h of api.sides[0]) if (visible(h) && d2(h, f.x, f.y) <= mo.r) n++;
      if (n > bn) { bn = n; best = f; }
    }
    if (!best) return;
    out.mortars++; if (out.mortarAt == null) out.mortarAt = api.t;
    const bx = best.x, by = best.y;
    for (const f of api.sides[0].slice()) {
      if (!f.alive || f.u.aloft || d2(f, bx, by) > mo.r) continue;
      api.hurt(mom, f, mo.hit, mw.x, mw.y);
      if (f.alive && !f.u.structure) { f.web = { slow: mo.slow, dmg: mo.dmg, t: mo.secs, max: 90 }; f.momWeb = true; f.momWebOnly = true; f.mortarWebT = api.t + mo.secs; if (!f.u.unstoppable) { f.slowMove = Math.max(f.slowT > 0 ? f.slowMove : 0, mo.slow); f.slowT = Math.max(f.slowT, mo.secs); } }
    }
  };
  const sim = Engine.createBattle(A, B, g, { ...opts, bossTick, record: false });
  while (sim.step() && mom.alive) { /* the fight */ }
  const res = sim.result();
  out[hanging ? 'hang' : 'ground'] += last - Math.max(0, mom.hp);
  out.end = res.time; out.dead = !mom.alive; out.nestsLeft = nests.filter((n) => n.alive).length;
  out.treasury = tre ? tre.alive : null;
  out.left = sim.bodies.filter((b) => b.side === 0 && b.alive && !b.u.structure).length;
  out.spiders = sim.bodies.filter((b) => b.side === 1 && b.alive && b !== mom && !b.u.structure).length;
  // damage to her, by the player's squads
  out.by = {};
  for (const b of sim.bodies) { if (b.side !== 0 || !(b.bossDealt > 0)) continue; const o2 = b.credit || b; const sq = m.armies[0].find((s) => s.id === o2.squad); const n = sq ? units[sq.unit].name : b.u.name; out.by[n] = (out.by[n] || 0) + b.bossDealt; }
  st.hp = Math.max(0, mom.hp);
  out.res = res;
  return out;
}

// ---------- a run of the puzzle ----------
function newRun(cfg = CFG) {
  const m = Game.createMatch(units, matrix, 1, 'standard', null, [], { draft: false });
  m.packages = [[], []];
  for (const u of units) if (!cfg.banned.includes(u.name) && !u.building) m.unlocks[0][units.indexOf(u)] = 1;
  m.extraDeploys[0] = 1; // the free extra deployment
  return { m, st: { hp: cfg.mommy.hp }, cfg, log: [] };
}
// the player's actions; each returns whether it went through
const act = (run) => {
  const { m } = run;
  return {
    gold: () => m.gold[0],
    round: () => m.round,
    army: () => m.armies[0],
    buy: (name, col, row) => { const q = Game.place(m, 0, ix(name), col, row); return q || null; },
    sell: (sq) => Game.sell(m, 0, sq.id),
    move: (sq, col, row) => { const g0 = m.gold[0]; const ok = Game.moveSquad(m, 0, sq.id, col, row); if (ok) m.gold[0] = g0; return !!ok; }, // the free reposition (one a round)
    skill: (name, k) => Game.buySkill(m, 0, ix(name), k),
    level: (sq) => Game.levelUp(m, 0, sq.id),
  };
};
// fight this round and move on to the next: the engine's own bookkeeping (experience, income, the round), minus
// player health, plus the treasury
function endRound(run) {
  const { m, st, cfg } = run;
  const f = fight(m, st, cfg);
  run.log.push(f);
  const gold0 = m.gold[0];
  Game.resolve(m, f.res);
  m.hp = [100, 100]; m.over = false; m.winner = -1;
  f.income = m.gold[0] - gold0; // (the game's own treasury rule pays for a treasury that stood, and takes gold for one that fell)
  m.extraDeploys[0] = 1;
  delete f.res;
  return f;
}
// play a plan: plan(a, round, run) deploys for the round. Returns { won, rounds, log }
function play(plan, cfg = CFG) {
  const run = newRun(cfg);
  for (let r = 1; r <= cfg.rounds; r++) {
    plan(act(run), r, run);
    const f = endRound(run);
    f.goldLeft = run.m.gold[0];
    if (f.dead) return { won: true, rounds: r, log: run.log };
  }
  return { won: false, rounds: cfg.rounds, hpLeft: run.st.hp, log: run.log };
}
const fmt = (f) => `R${f.round}: nests ${f.fallAt == null ? `not cleared (${f.nestsLeft} left)` : 'down at ' + f.fallAt.toFixed(1) + ' s'}, mortar ${f.mortars}${f.mortarAt != null ? ' (first at ' + f.mortarAt.toFixed(1) + ' s)' : ''}, damage ${Math.round(f.hang)} hanging + ${Math.round(f.ground)} on the ground, army left ${f.left}, spiders left ${f.spiders}, treasury ${f.treasury ? 'stands' : 'lost'}${f.dead ? ', MOMMY DEAD at ' + f.end.toFixed(1) + ' s' : ''}`;

module.exports = { Engine, Game, units, matrix, ix, CFG, fight, newRun, act, endRound, play, fmt, world };

// ---------- reports ----------
// What each unit does on its own. Damage per 100 gold spent, with 600 gold of the unit (and with 200, to show crowding):
//   window: she hangs for the first 12 s (bite and web on, the mortar off), then falls; damage from the fall to 30 s
//   hanging: damage in a 30 s fight in which she never falls
//   2 nests: how long 300 gold of it takes to clear two nests that don't hatch
function rank(cfg = CFG) {
  const rows = [];
  const quiet = { ...cfg, mommy: { ...cfg.mommy, mortar: { ...cfg.mommy.mortar, hit: 0 } } };
  const army = (name, gold) => { const run = newRun(quiet); run.m.gold[0] = gold; run.m.extraDeploys[0] = 99; const a = act(run); for (const row of [10, 11, 12]) for (const col of [5, 6, 4, 7, 3, 8, 2, 9]) a.buy(name, col, row); return { run, spent: gold - run.m.gold[0] }; };
  const per = (dmg, spent) => spent ? dmg / spent * 100 : 0;
  for (const u of units) {
    if (cfg.banned.includes(u.name) || u.building) continue;
    const row = { name: u.name, cost: Game.unitCostOf(u), range: u.range };
    { const { run, spent } = army(u.name, 600); const f = fight(run.m, run.st, quiet, { fallAt: 12, nests: [], noTreasury: true }); row.window = per(f.ground, spent); row.left = f.left; }
    { const { run, spent } = army(u.name, 200); const f = fight(run.m, run.st, quiet, { fallAt: 12, nests: [], noTreasury: true }); row.window2 = per(f.ground, spent); }
    { const { run, spent } = army(u.name, 600); const f = fight(run.m, run.st, quiet, { fallAt: 99, nests: [], noTreasury: true }); row.hang = per(f.hang, spent); }
    { const { run } = army(u.name, 300); const f = fight(run.m, run.st, quiet, { nests: cfg.nests[0], noHatch: true, noTreasury: true, secs: 60 }); row.nests = f.fallAt; }
    rows.push(row);
  }
  rows.sort((a, b) => b.window - a.window);
  console.log('\nUnit ranking (no skills, no levels). Damage per 100 gold spent.');
  console.log('unit'.padEnd(18) + 'cost'.padStart(5) + 'range'.padStart(6) + 'window(600g)'.padStart(14) + 'window(200g)'.padStart(14) + 'hanging'.padStart(9) + '2 nests(300g)'.padStart(15));
  for (const r of rows) console.log(r.name.padEnd(18) + String(r.cost).padStart(5) + String(r.range).padStart(6) + String(Math.round(r.window)).padStart(14) + String(Math.round(r.window2)).padStart(14) + String(Math.round(r.hang)).padStart(9) + (r.nests == null ? 'never' : r.nests.toFixed(1) + ' s').padStart(15));
  return rows;
}

if (require.main === module) {
  const what = process.argv[2] || 'all';
  if (what === 'rank' || what === 'all') rank();
  if (what === 'plans' || what === 'all') require('./plans.js').report();
  if (what === 'search') require('./plans.js').search(+process.argv[3] || 300);
}
