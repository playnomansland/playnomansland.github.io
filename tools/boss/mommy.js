// Headless prototype of the "Mommy" boss puzzle (November 2026). The boss's rules live in src/boss.js, the same code the
// page plays (the Developer menu's Mommy); the engine features they use are in src/engine.js and do nothing unless asked
// for. This script plays her with the game's own match rules (src/game.js) and reports on it. A test changes the rules
// by passing its own copy of the numbers (cfg, a changed copy of Boss.CFG).
//
// Run from the repo root:  node tools/boss/mommy.js            (unit ranking, the sample plans, the five-round lines)
//                          node tools/boss/mommy.js rank|skills|tanks|plans|lines|greedy|search
//                          node tools/boss/mommy.js show "<plan name>" [her health]   (one plan, board by board)
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.join(__dirname, '..', '..');

// ---------- the game's own engine and rules, and the boss (src/boss.js: the same code the page plays) ----------
const Engine = require(path.join(ROOT, 'src', 'engine.js'));
global.Engine = Engine; // src/game.js picks this one up
const Game = require(path.join(ROOT, 'src', 'game.js'));
global.Game = Game;
const Boss = require(path.join(ROOT, 'src', 'boss.js')); // (sets global Boss, which Game.startBattle and Game.resolve use)
const { units, matrix } = require(path.join(ROOT, 'server', 'src', 'prepare-units.cjs'))(Engine, require(path.join(ROOT, 'src', 'demo-units.json')));
const ix = (n) => { const i = units.findIndex((u) => u.name === n); assert.ok(i >= 0, 'no unit ' + n); return i; };
const TILE = Game.TILE || 6;

// ---------- the design's numbers: src/boss.js CFG (a test passes its own copy, changed, as cfg) ----------
const CFG = Boss.CFG;
const world = (col, row) => Game.tileToWorld(col, row);

// ---------- one fight ----------
// m: the match (the player is side 0). st: her state ({ hp, ... }; a run's is m.boss). o: Boss.battle's options (nests,
// fallen, fallAt, noHatch, noTreasury, secs, pools, trace). Returns what happened (Boss.battle's result().boss), with
// res: the engine's result for Game.resolve. Sets st.hp and st.carry (Game.resolve, through Boss.afterFight, does the
// rest for a run's own st).
function fight(m, st, cfg = CFG, o = {}) {
  const sim = Boss.battle(m, { ...o, cfg, st, trace: o.trace || cfg.traceRound === m.round, name: (sq) => sq.tag || units[sq.unit].name });
  while (sim.step()) { /* the fight */ }
  const res = sim.result(), out = res.boss;
  st.hp = out.hpLeft; st.carry = out.carry;
  out.res = res;
  return out;
}

// ---------- a run of the puzzle ----------
function newRun(cfg = CFG) {
  const m = Game.createMatch(units, matrix, 1, 'standard', null, [], { draft: false });
  Boss.setup(m, cfg); // every allowed unit unlocked, the start gold, the free extra deployment, no towers
  return { m, st: m.boss, cfg, log: [] };
}
// the player's actions; each returns whether it went through
const act = (run) => {
  const { m } = run;
  return {
    gold: () => m.gold[0],
    round: () => m.round,
    army: () => m.armies[0],
    buy: (name, col, row) => Game.place(m, 0, ix(name), col, row) || null, // (Game.place keeps to m.boss.cap)
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
  if (cfg.late && cfg.late.income != null) m.gold[0] = gold0 + Boss.byRound(cfg.late.income, m.round - 1) + (f.treasury ? 50 : 0); // (late.income: a flat income in place of the game's own)
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
const fmt = (f) => `R${f.round}: nests ${f.fallAt == null ? `not cleared (${f.nestsLeft} left)` : 'down at ' + f.fallAt.toFixed(1) + ' s'}, mortar ${f.mortars}${f.mortarAt != null ? ' (first at ' + f.mortarAt.toFixed(1) + ' s)' : ''}${f.mortarNests ? ', ' + f.mortarNests + ' nest(s) by mortar' : ''}, damage ${Math.round(f.hang)} hanging + ${Math.round(f.ground)} on the ground, army left ${f.left}, spiders left ${f.spiders}, treasury ${f.treasury ? 'stands' : 'lost'}${f.dead ? ', MOMMY DEAD at ' + f.end.toFixed(1) + ' s' : ''}`;

module.exports = { Engine, Game, Boss, units, matrix, ix, CFG, fight, newRun, act, endRound, play, fmt, world, rank: (...a) => rank(...a), rankSkills: (...a) => rankSkills(...a) };

// ---------- reports ----------
// What each unit does on its own. Damage per 100 gold spent, with 600 gold of the unit (and with 200, to show crowding):
//   window: she hangs for the first 12 s (bite and web on, the mortar off), then falls; damage from the fall to 30 s
//   hanging: damage in a 30 s fight in which she never falls
//   2 nests: how long 300 gold of it takes to clear two nests that don't hatch
function rank(cfg = CFG) {
  const rows = [];
  const quiet = { ...cfg, maxPerType: 99, mommy: { ...cfg.mommy, mortar: { ...cfg.mommy.mortar, hit: 0 } } };
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

// The ranking again, with each skill: 600 gold of the unit plus the skill (a fourth-slot skill also pays for the cheaper
// of its two prerequisites), per 100 gold of the whole. window: as in rank(); hang: a 30 s fight she never falls in; held: seconds the
// army kept her attention in the window fight; left: bodies alive at the end of it.
function rankSkills(cfg = CFG, names) {
  const quiet = { ...cfg, maxPerType: 99, mommy: { ...cfg.mommy, mortar: { ...cfg.mommy.mortar, hit: 0 } } };
  const out = [];
  const army = (name, ks) => {
    const run = newRun(quiet); run.m.extraDeploys[0] = 99; const a = act(run), u = units[ix(name)];
    const price = (k) => Game.skillCost ? Game.skillCost(run.m, ix(name), k, 0) : u.skillDefs[k].cost;
    const skillGold = ks.reduce((s, k) => s + (price(k) || 0), 0);
    run.m.gold[0] = 600;
    for (const row of [10, 11, 12]) for (const col of [5, 6, 4, 7, 3, 8, 2, 9]) a.buy(name, col, row);
    run.m.gold[0] += skillGold;
    let ok = true; for (const k of ks) { let one = a.skill(name, k); if (!one && Game.awaken) { const sq = run.m.armies[0][0]; one = !!(sq && Game.awaken(run.m, 0, sq.id, k)); } ok = one && ok; }
    return { run, ok, spent: 600 + skillGold - run.m.gold[0] };
  };
  const pool = names || units.filter((u) => !cfg.banned.includes(u.name) && !u.building).map((u) => u.name);
  for (const name of pool) {
    const u = units[ix(name)];
    const sets = [[]];
    (u.skillDefs || []).forEach((d, k) => { if (!d || d.evolve || d.awaken) return; const need = u.skillNeedsAny && u.skillNeedsAny[k]; if (need && need.length) { const pre = need.slice().sort((x, y) => u.skillDefs[x].cost - u.skillDefs[y].cost)[0]; sets.push([pre, k]); } else sets.push([k]); });
    for (const ks of sets) {
      const label = name + (ks.length ? ' + ' + ks.map((k) => u.skillDefs[k].name).join(' + ') : '');
      const w = army(name, ks); if (!w.ok) { out.push({ label, bad: true }); continue; }
      const f = fight(w.run.m, w.run.st, quiet, { fallAt: 12, nests: [], noTreasury: true });
      const h = army(name, ks); const g = fight(h.run.m, h.run.st, quiet, { fallAt: 99, nests: [], noTreasury: true });
      out.push({ label, window: f.ground / w.spent * 100, hang: g.hang / h.spent * 100, held: f.held, left: f.left });
    }
  }
  out.sort((a, b) => (b.window || -1) - (a.window || -1));
  console.log('\nUnit ranking with skills (600 gold of the unit, plus the skill). Damage per 100 gold of the whole.');
  console.log('squad'.padEnd(52) + 'window'.padStart(8) + 'hanging'.padStart(9) + 'held(s)'.padStart(9) + 'left'.padStart(6));
  for (const r of out) console.log(r.label.padEnd(52) + (r.bad ? '   (could not buy)' : String(Math.round(r.window)).padStart(8) + String(Math.round(r.hang)).padStart(9) + r.held.toFixed(1).padStart(9) + String(r.left).padStart(6)));
  return out;
}

// Who can hold her? One squad alone in front of her for a whole fight (she never falls, no nests): the seconds it held
// her attention, under each of her bite styles.
function tanks(cfg = CFG) {
  // [unit, skill slot or [slots in order]]: a fourth-slot skill needs one of slots 1-2 first
  const cands = [['Goblin Swarm'], ['Spiders'], ['Ent'], ['Ent', 1], ['Brute'], ['Brute', 0], ['Just a horse'], ['Obelisk'], ['Steel Wizard'], ['Steel Wizard', 0], ['Ether Golem'],
    ['Wisps'], ['Wisps', 1], ['Skeleton Archers'], ['Skeleton Archers', 2], ['Leaf Wizard'], ['Leaf Wizard', 0], ['Earth Wizard', 2], ['Water Mage'], ['Water Mage', [1, 3]], ['Ember Imps', [1, 3]],
    ['Necromancer'], ['Necromancer', 1], ['War Mammoth']];
  const bites = Object.keys(cfg.mommy.bites);
  console.log('\nWho can hold her: seconds of a 30 s fight one squad alone keeps her attention (cost includes the skill)');
  console.log('squad'.padEnd(40) + 'cost'.padStart(5) + bites.map((k) => { const x = cfg.mommy.bites[k]; return `${k} (${x.hit} x ${x.aps}/s${x.splash ? ', ' + x.splash + ' m' : ''})`.padStart(27); }).join(''));
  for (const [name, k] of cands) {
    let line = '', cost = 0, label = name;
    for (const bite of bites) {
      const c2 = { ...cfg, biteByRound: [bite] };
      const run = newRun(c2); run.m.gold[0] = 5000; const a = act(run);
      const sq = a.buy(name, 5, 10); // (a skill needs a squad of its unit on the board)
      if (k != null) { const ks = [].concat(k); let ok = true; for (const kk of ks) { let one = a.skill(name, kk); if (!one && sq && Game.awaken) one = !!Game.awaken(run.m, 0, sq.id, kk); ok = ok && one; } label = name + ' + ' + ks.map((kk) => units[ix(name)].skillDefs[kk].name).join(' + ') + (ok ? '' : ' (NOT BOUGHT)'); }
      cost = 5000 - run.m.gold[0];
      const f = fight(run.m, run.st, c2, { fallAt: 99, nests: [], noTreasury: true });
      line += (f.held.toFixed(1) + ' s' + (f.left ? ' (alive)' : '')).padStart(27);
    }
    console.log(label.padEnd(40) + String(cost).padStart(5) + line);
  }
}

if (require.main === module) {
  const what = process.argv[2] || 'all';
  if (what === 'rank' || what === 'all') rank();
  if (what === 'plans' || what === 'all') require('./plans.js').report();
  if (what === 'lines' || what === 'all') require('./plans.js').lines();
  if (what === 'show') { const P = require('./plans.js'); P.show(P.PLANS[process.argv[3]], { ...CFG, mommy: { ...CFG.mommy, hp: +process.argv[4] || CFG.mommy.hp } }, process.argv[3]); }
  if (what === 'tanks') tanks();
  if (what === 'skills') rankSkills();
  if (what === 'search') require('./plans.js').search(+process.argv[3] || 150);
  if (what === 'greedy') require('./plans.js').greedy(+process.argv[3] || 40);
}
