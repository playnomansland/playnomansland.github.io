// The Mommy boss puzzle (src/boss.js; docs/HANDOFF-BOSS-MOMMY.md): a boss match's rules, and that her fight plays the
// same as the prototype's tools. Headless, a few seconds:  node tools/tests/boss.js
const path = require('path');
const assert = require('assert');
const B = require(path.join(__dirname, '..', 'boss', 'mommy.js'));
const P = require(path.join(__dirname, '..', 'boss', 'plans.js'));
const { Game, Boss, units, ix } = B;
const ok = (c, msg) => { assert.ok(c, msg); console.log('ok  ' + msg); };

// a boss match
const run = B.newRun(), m = run.m;
ok(m.boss && m.boss.hp === Boss.CFG.mommy.hp, 'Boss.setup: her health');
ok(m.gold[0] === Boss.CFG.startGold && Game.deploysLeft(m, 0) === 4, '450 gold and 4 deployments in round 1 (the free extra one included)');
ok(m.towers[0] === null && !Game.place(m, 0, ix('Wisps'), 5, 10) === false, 'no tower, and placing needs none');
ok(!Game.refundDeploy(m, 0), 'the free extra deployment can\'t be refunded for gold');
ok(!Game.unlock(m, 0, ix('Assassin')) && !Game.isUnlocked(m, 0, ix('Assassin')), 'a banned unit stays locked');
m.gold[0] = 2000; m.extraDeploys[0] = 9;
ok(Game.place(m, 0, ix('Goblin Swarm'), 1, 10) && Game.place(m, 0, ix('Goblin Swarm'), 2, 10) && Game.place(m, 0, ix('Goblin Swarm'), 3, 11) && !Game.place(m, 0, ix('Goblin Swarm'), 4, 11), 'at most 3 squads of a type');
ok(Game.freeMovesLeft(m, 0) === 1, 'one free move a round');

// her fight in the game's own path (Game.startBattle / Game.resolve) plays as the prototype's lines say
const res = P.runPlan(P.PLANS['Line B: read each round (no tank in round 4)'].slice(0, 1), { ...Boss.CFG, rounds: 1 });
const D1 = Math.round(res.log[0].hang + res.log[0].ground);
ok(D1 > 3000 && res.log[0].fallAt != null && res.log[0].fallAt < 15, `Line B round 1: her nests fall (at ${res.log[0].fallAt.toFixed(1)} s) and she takes ${D1}`);
const m2 = B.newRun().m;
for (const [n, c, r] of [['Goblin Swarm', 2, 10], ['Goblin Swarm', 1, 10], ['Wisps', 10, 10], ['Skeleton Archers', 9, 10]]) Game.place(m2, 0, ix(n), c, r);
const sim = Game.startBattle(m2); while (sim.step()) { /* the fight */ }
const sum = Game.resolve(m2, sim.result());
ok(Math.round(Boss.CFG.mommy.hp - m2.boss.hp) === D1 && sum.boss && sum.boss.dmg === D1, 'Game.startBattle and Game.resolve: the same fight as the prototype\'s, her health carries on');
ok(sim.boss.mom.bs && ['hanging', 'stunned', 'down'].includes(sim.boss.mom.bs.phase), 'her state for the boss bar (mom.bs)');
ok(m2.round === 2 && !m2.over && m2.hp[0] === 100 && Game.deploysLeft(m2, 0) === 3, 'round 2: no player health lost, 3 deployments');

// she dies: the fight stops and the match is won
const m3 = B.newRun().m; m3.boss.hp = 2000;
for (const [n, c, r] of [['Goblin Swarm', 2, 10], ['Goblin Swarm', 1, 10], ['Wisps', 10, 10], ['Skeleton Archers', 9, 10]]) Game.place(m3, 0, ix(n), c, r);
const s3 = Game.startBattle(m3); while (s3.step()) { /* the fight */ }
ok(s3.isOver() && s3.result().time < 30, 'her death ends the fight');
Game.resolve(m3, s3.result());
ok(m3.over && m3.winner === 0 && m3.boss.hp === 0, 'and wins the match');
// the last round ends it
const m4 = B.newRun().m; m4.round = 5; Game.place(m4, 0, ix('Wisps'), 10, 10);
const s4 = Game.startBattle(m4); while (s4.step()) { /* the fight */ }
Game.resolve(m4, s4.result());
ok(m4.over && m4.winner === 1, 'after round 5 she has won');

// her attacks (2026-11-11, night): the bite lands where it was aimed, biteSecs after her jaws open; the mortar's nest
// flies for mortar.fly and lands where the clump stood; a shown fight (record) plays the same as a hidden one
const C = Boss.CFG, T = Game.TILE || 6;
const setup5 = (list) => { const m5 = B.newRun().m; m5.gold[0] = 5000; m5.extraDeploys[0] = 9; for (const [nm, c, r] of list) Game.place(m5, 0, ix(nm), c, r); return m5; };
const HOLD = [['Goblin Swarm', 2, 10], ['Goblin Swarm', 1, 10], ['Wisps', 10, 10], ['Skeleton Archers', 9, 10]], FAR = [['Sniper', 1, 14], ['Sniper', 10, 14], ['Skeleton Archers', 9, 13], ['Skeleton Archers', 10, 13]];
const played = (list, record) => { const sim = Boss.battle(setup5(list), { record }); while (sim.step()) { /* the fight */ } return sim; };
const shown = played(HOLD, true), hidden = played(HOLD, false);
ok(shown.result().boss.hpLeft === hidden.result().boss.hpLeft && shown.result().boss.fallAt === hidden.result().boss.fallAt, 'a shown fight plays the same as a hidden one');
const bites = shown.boss.mom.ev.filter((e) => e.k === 'bite');
ok(bites.length > 3 && bites.every((e) => Math.abs(e.land - e.t - C.mommy.biteSecs) < 0.2 && e.r >= 1), `her bites: jaws open, shut ${C.mommy.biteSecs} s later (${bites.length} of them in the events)`);
ok(shown.boss.mom.u.lob && shown.boss.mom.u.projSecs === C.mommy.biteSecs, 'her bite lands where it was aimed (lob), after biteSecs');
{ // the mortar: nobody in her reach, so she throws a nest. Nothing is hurt before it lands; the nest is gone at once
  const sim = Boss.battle(setup5(FAR), { record: true, noHatch: true }), mom = sim.boss.mom;
  const near = (e) => sim.bodies.filter((b) => b.side === 0 && !b.u.structure && Math.hypot(b.x - e.x, b.y - e.y) <= e.r);
  const hpOf = (bs) => bs.reduce((s, b) => s + (b.alive ? b.hp : 0), 0);
  let e = null, t = 0, before = null, nests0 = null, mid = null;
  while (sim.step()) {
    t += Game.SETTINGS.dt;
    if (!e) { e = mom.ev.find((x) => x.k === 'mortar'); if (e) { before = near(e); nests0 = sim.boss.nests.filter((n) => n.alive).length; mid = hpOf(before); } }
    else if (t < e.land - 0.1) mid = Math.min(mid, hpOf(before)) === mid ? mid : -1;
    else if (t > e.land + 0.2) break;
  }
  ok(e && Math.abs(e.t - C.mommy.mortar.wind) < 0.2 && Math.abs(e.land - e.t - C.mommy.mortar.fly) < 1e-6, `the mortar: thrown after ${C.mommy.mortar.wind} s alone, in the air ${C.mommy.mortar.fly} s`);
  ok(e.nest && nests0 === sim.boss.nests.length - 1, 'the thrown nest is gone the moment she throws it');
  ok(before.length > 0 && mid !== -1 && hpOf(before) < mid, 'nothing in the ring is hurt while it flies; it is when it lands');
  ok(near(e).filter((b) => b.alive).every((b) => b.web && b.momWeb), 'what it hits and does not kill is webbed');
  ok(before.filter((b) => b.alive && Math.hypot(b.x - e.x, b.y - e.y) > e.r).every((b) => b.hp === b.u.hp && !b.momWeb), 'a body that walked out of the ring before it landed is missed');
}
// acid (2026-11-12): her heavy bite leaves a pool where it lands, for CFG.acid.secs; a body standing in one is poisoned.
// The other bites leave none, and there are no poison tiles any more
{ const fightIn = (round) => { const m7 = setup5([['Brute', 5, 10], ['Brute', 6, 10]]); m7.round = round; for (const sq of m7.armies[0]) Game.setAim(m7, 0, sq.id, 0, -4); return { m7, sim: Boss.battle(m7, { noHatch: true }) }; };
  const { m7, sim } = fightIn(2), mom = sim.boss.mom;
  let pools = 0, first = null, poisoned = false, gone = false;
  for (let k = 0; k < 600 && sim.step(); k++) {
    if (mom.acid.length && !first) first = { ...mom.acid[0], at: k * Game.SETTINGS.dt };
    pools = Math.max(pools, mom.acid.length);
    if (mom.acid.length && sim.bodies.some((b) => b.side === 0 && b.alive && b.poison && b.poison.some((x) => x.pool) && mom.acid.some((q) => Math.hypot(b.x - q.x, b.y - q.y) <= q.r + 1))) poisoned = true;
    if (first && k * Game.SETTINGS.dt > first.until + 0.2 && !mom.acid.some((q) => q.t0 === first.t0)) gone = true;
  }
  ok(Boss.preview(m7).acid === true && !('pools' in Boss.preview(m7)), 'round 2: the heavy bite is acid; no poison tiles');
  ok(first && first.r === C.acid.r && Math.abs(first.until - first.t0 - C.acid.secs) < 1e-6, `an acid bite leaves a pool where it lands, for ${C.acid.secs} s`);
  ok(poisoned && gone && pools <= Math.ceil(C.acid.secs * C.mommy.bites.heavy.aps) + 1, 'a body standing in it is poisoned; the pool dries up');
  const r1 = fightIn(1); for (let k = 0; k < 300 && r1.sim.step(); k++) { /* 15 s */ }
  ok(Boss.preview(r1.m7).acid === false && r1.sim.boss.mom.acid.length === 0 && r1.sim.result().boss.poolSecs === 0, 'round 1 (the fast bite): no acid'); }

// (prototype) a ranged squad pointed at a nest shoots that one first
{ const noMortar = { ...C, mommy: { ...C.mommy, mortar: { ...C.mommy.mortar, hit: 0 } } }; // (so she rips no nest herself)
  const hurt = (focus) => { const m6 = setup5([['Sniper', 5, 13]]); if (focus != null) m6.armies[0][0].focus = focus; const sim = Boss.battle(m6, { noHatch: true, cfg: noMortar }); for (let k = 0; k < 400 && sim.step(); k++) { /* 20 s */ } return sim.boss.nests.map((n) => n.hp < n.u.hp); };
  const f1 = hurt(1), f0 = hurt(0);
  ok(f1[1] && !f1[0] && f0[0] && !f0[1], 'a squad pointed at a nest (sq.focus) shoots that nest first, whichever it is'); }

// a normal match has none of it
const n = Game.createMatch(units, B.matrix, 1, 'standard', null, [], { draft: false });
ok(!n.boss && Game.needsTower(n, 0) !== undefined && Game.freeMovesLeft(n, 0) === 0, 'a normal match: no boss rules');
console.log('boss: all checks passed');
