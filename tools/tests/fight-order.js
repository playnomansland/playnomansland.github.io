// Buying order never changes a fight (Game.fightOrder, used by Game.bodiesFor): the same squads on the same tiles fight
// the same whatever order they were bought in, in a normal match and against the Mommy. Headless, a few seconds:
//   node tools/tests/fight-order.js
const path = require('path');
const assert = require('assert');
const B = require(path.join(__dirname, '..', 'boss', 'mommy.js'));
const { Game, units, matrix, ix } = B;
const ok = (c, msg) => { assert.ok(c, msg); console.log('ok  ' + msg); };
const perms = (a) => a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.filter((_, j) => j !== i)).map((p) => [x, ...p]));

// the Mommy's round 1: three Goblin squads (one with an arrow) and Wisps, in all 24 buying orders
{
  const army = [['Goblin Swarm', 2, 10], ['Goblin Swarm', 1, 10, [2, -4]], ['Wisps', 10, 10], ['Goblin Swarm', 3, 11]];
  const seen = new Set();
  for (const order of perms([0, 1, 2, 3])) {
    const m = B.newRun().m;
    for (const k of order) {
      const [n, c, r, aim] = army[k], sq = Game.place(m, 0, ix(n), c, r);
      assert.ok(sq, `placed ${n} at ${c},${r}`);
      if (aim) assert.ok(Game.setAim(m, 0, sq.id, aim[0], aim[1]), 'its arrow');
    }
    const sim = Game.startBattle(m); while (sim.step()) { /* the fight */ }
    const sum = Game.resolve(m, sim.result());
    seen.add(sum.boss.dmg + ' ' + sum.boss.fallAt);
  }
  ok(seen.size === 1, `the Mommy's round 1 in all 24 buying orders: the same fight (${[...seen][0].split(' ')[0]} damage)`);
}

// a normal match: four squads a side, every buying order on one side against a fixed other side, then both shuffled
{
  const mine = [['Goblin Swarm', 4, 10], ['Skeleton Archers', 5, 11], ['Brute', 7, 10], ['Wisps', 6, 11]];
  const theirs = [['Goblin Swarm', 7, 5], ['Skeleton Archers', 6, 4], ['Brute', 4, 5], ['Wisps', 5, 4]];
  // squads go straight into the armies (as tools/tests/aim.js does), ids in buying order as Game.place hands them out
  const fight = (o0, o1) => {
    const m = Game.createMatch(units, matrix, 7, 'standard', null, [], { draft: false });
    m.armies = [[], []]; m.round = 3;
    let id = 100;
    for (const [side, list, order] of [[0, mine, o0], [1, theirs, o1]]) for (const k of order) {
      const [n, c, r] = list[k];
      m.armies[side].push({ id: id++, unit: ix(n), col: c, row: r, round: 1, xp: 0, level: 0, cost: 0 });
    }
    const sim = Game.startBattle(m); while (sim.step()) { /* the fight */ }
    const res = sim.result();
    return JSON.stringify([res.winner, res.time.toFixed(3), res.frac.map((f) => f.toFixed(6))]);
  };
  const all = perms([0, 1, 2, 3]), seen = new Set();
  for (const o of all) seen.add(fight(o, [0, 1, 2, 3]));
  for (const o of all) seen.add(fight([0, 1, 2, 3], o));
  for (let k = 0; k < all.length; k++) seen.add(fight(all[k], all[all.length - 1 - k]));
  ok(seen.size === 1, `a normal match in ${all.length * 3} pairs of buying orders: the same fight (${[...seen][0]})`);
}

// the order itself: front row first (from each side's own front), then left to right, riders last
{
  const m = Game.createMatch(units, matrix, 7, 'standard', null, [], { draft: false });
  m.armies = [[], []];
  let id = 1;
  for (const [c, r] of [[8, 11], [2, 10], [5, 10], [1, 11]]) m.armies[0].push({ id: id++, unit: ix('Wisps'), col: c, row: r, round: 1, level: 0 });
  for (const [c, r] of [[8, 4], [2, 5], [5, 5], [1, 4]]) m.armies[1].push({ id: id++, unit: ix('Wisps'), col: c, row: r, round: 1, level: 0 });
  const tiles = (side) => Game.fightOrder(m, side).map((sq) => sq.col + ',' + sq.row).join(' ');
  ok(tiles(0) === '2,10 5,10 1,11 8,11' && tiles(1) === '2,5 5,5 1,4 8,4', `Game.fightOrder: ${tiles(0)} | ${tiles(1)}`);
}
console.log('fight-order: all checks passed');
