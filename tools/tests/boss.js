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

// a normal match has none of it
const n = Game.createMatch(units, B.matrix, 1, 'standard', null, [], { draft: false });
ok(!n.boss && Game.needsTower(n, 0) !== undefined && Game.freeMovesLeft(n, 0) === 0, 'a normal match: no boss rules');
console.log('boss: all checks passed');
