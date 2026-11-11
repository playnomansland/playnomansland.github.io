// Sample plans for the Mommy prototype (tools/boss/mommy.js), and a random search for plans that beat her.
// A plan is a list of rounds; a round is a list of steps:
//   ['buy', unit, col, row] | ['skill', unit, slot] | ['sell', unit] (the oldest squad of that unit) |
//   ['move', unit, col, row] (the oldest squad of that unit; one free move a round) | ['level', unit]
const B = require('./mommy.js');

function runPlan(plan, cfg = B.CFG) {
  return B.play((a, r) => {
    for (const s of plan[r - 1] || []) {
      const first = (n) => a.army().find((q) => B.units[q.unit].name === n && q.round < a.round());
      if (s[0] === 'buy') a.buy(s[1], s[2], s[3]);
      else if (s[0] === 'skill') a.skill(s[1], s[2]);
      else if (s[0] === 'sell') { const q = first(s[1]); if (q) a.sell(q); }
      else if (s[0] === 'move') { const q = first(s[1]); if (q) a.move(q, s[2], s[3]); }
      else if (s[0] === 'level') { for (const q of a.army()) if (B.units[q.unit].name === s[1] && a.level(q)) break; }
    }
  }, cfg);
}

const PLANS = {
  // the first idea a player has: shoot her from the start, nobody near her
  'Snipers only': [
    [['buy', 'Sniper', 5, 10], ['buy', 'Sniper', 6, 10]],
    [['buy', 'Sniper', 4, 10], ['buy', 'Sniper', 7, 10], ['buy', 'Sniper', 3, 10]],
    [['buy', 'Sniper', 2, 10], ['buy', 'Sniper', 8, 10], ['buy', 'Sniper', 9, 10]],
    [['buy', 'Sniper', 5, 11], ['buy', 'Sniper', 6, 11], ['buy', 'Sniper', 4, 11]],
    [['buy', 'Sniper', 7, 11], ['buy', 'Sniper', 3, 11], ['buy', 'Sniper', 8, 11]],
  ],
  // melee only: holds her attention, can't touch the nests
  'Goblins only': [
    [['buy', 'Goblin Swarm', 5, 10], ['buy', 'Goblin Swarm', 6, 10]],
    [['buy', 'Goblin Swarm', 4, 10], ['buy', 'Goblin Swarm', 7, 10], ['buy', 'Goblin Swarm', 3, 10]],
    [['buy', 'Goblin Swarm', 2, 10], ['buy', 'Goblin Swarm', 8, 10], ['buy', 'Goblin Swarm', 9, 10]],
    [['buy', 'Goblin Swarm', 5, 11], ['buy', 'Goblin Swarm', 6, 11], ['buy', 'Goblin Swarm', 4, 11]],
    [['buy', 'Goblin Swarm', 7, 11], ['buy', 'Goblin Swarm', 3, 11], ['buy', 'Goblin Swarm', 8, 11]],
  ],
  // the intended shape: one squad on her, shooters on the nests, more damage each round
  'Tank and shooters': [
    [['buy', 'Goblin Swarm', 5, 10], ['buy', 'Sniper', 3, 10]],
    [['buy', 'Sniper', 8, 10], ['buy', 'Wisps', 5, 11], ['buy', 'Goblin Swarm', 6, 10]],
    [['buy', 'Brute', 6, 11], ['buy', 'Wisps', 2, 10], ['buy', 'Wisps', 9, 10]],
    [['buy', 'Sniper', 4, 11], ['buy', 'Sniper', 7, 11], ['buy', 'Wisps', 1, 10]],
    [['buy', 'Sniper', 0, 10], ['buy', 'Sniper', 11, 10], ['buy', 'Goblin Swarm', 4, 10]],
  ],
  // the best plan the search below found with these numbers (no skills, levels, sells or moves): it gives up the
  // first three rounds and wins on rounds 4 and 5
  'Search best': [
    [['buy', 'Leaf Wizard', 2, 11], ['buy', 'Earth Wizard', 10, 11], ['buy', 'Ent', 5, 10], ['buy', 'Sniper', 2, 11]],
    [['buy', 'Leaf Wizard', 5, 11], ['buy', 'Skeleton Archers', 8, 11], ['buy', 'Skeleton Archers', 8, 11], ['buy', 'Fire Mage', 5, 11]],
    [['buy', 'Earth Wizard', 9, 11], ['buy', 'Sniper', 5, 11], ['buy', 'Wisps', 8, 10], ['buy', 'Sniper', 1, 10]],
    [['buy', 'Brute', 5, 10], ['buy', 'Leaf Wizard', 5, 10], ['buy', 'Wisps', 6, 10], ['buy', 'Steel Wizard', 10, 11]],
    [['buy', 'Wisps', 8, 10], ['buy', 'Steel Wizard', 7, 10], ['buy', 'Skeleton Archers', 1, 11], ['buy', 'Steel Wizard', 3, 10]],
  ],
};

function report(cfg = B.CFG) {
  console.log(`\nSample plans (Mommy ${cfg.mommy.hp} health, ${cfg.rounds} rounds, ${cfg.fightSecs} s fights)`);
  for (const [name, plan] of Object.entries(PLANS)) {
    const r = runPlan(plan, cfg);
    console.log(`\n${name}: ${r.won ? 'WON in round ' + r.rounds : 'lost, she has ' + Math.round(r.hpLeft) + ' health left'}`);
    for (const f of r.log) console.log('  ' + B.fmt(f) + `, gold after ${f.goldLeft}`);
  }
}

// ---------- search ----------
// A hill climb over plans without skills, levels, sells or moves: a rough lower bound on what a player can do.
// Each round buys up to four squads (what the gold and the deployments allow); melee units go to the middle of the
// front row, shooters anywhere in the front two rows. A step changes one purchase. Lower score is better: the round
// she died in, else the rounds plus the share of her health left.
function search(tries = 150, cfg = B.CFG, pool, seed0 = 12345) {
  pool = pool || B.units.filter((u) => !cfg.banned.includes(u.name) && !u.building).map((u) => u.name);
  let seed = seed0;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ri = (n) => Math.floor(rnd() * n);
  const step = () => { const n = pool[ri(pool.length)], melee = B.units[B.ix(n)].range < cfg.nest.rangedOnly; return ['buy', n, melee ? 3 + ri(6) : ri(12), melee ? 10 : 10 + ri(2)]; };
  const fresh = () => Array.from({ length: cfg.rounds }, () => Array.from({ length: 4 }, step));
  const score = (res) => res.won ? res.rounds - (1 - res.log[res.log.length - 1].end / cfg.fightSecs) : cfg.rounds + 1 + res.hpLeft / cfg.mommy.hp;
  let best = null;
  const wins = {};
  const tryPlan = (plan) => { const res = runPlan(plan, cfg), sc = score(res); if (res.won) wins[res.rounds] = (wins[res.rounds] || 0) + 1; if (!best || sc < best.score) { best = { score: sc, plan, res }; return true; } return false; };
  const starts = Math.max(5, Math.floor(tries / 4));
  for (let k = 0; k < starts; k++) tryPlan(fresh());
  for (let k = starts; k < tries; k++) {
    const plan = best.plan.map((r) => r.map((x) => x.slice()));
    const upTo = best.res.won ? best.res.rounds : cfg.rounds; // only the rounds that were played matter
    for (let j = 0; j < 1 + ri(2); j++) plan[ri(upTo)][ri(4)] = step();
    tryPlan(plan);
  }
  console.log(`\nSearch, ${tries} plans (no skills, levels, sells or moves): wins by round ${JSON.stringify(wins)}`);
  console.log(best.res.won ? `best: won in round ${best.res.rounds}` : `best: lost with ${Math.round(best.res.hpLeft)} health left on her`);
  best.plan.slice(0, best.res.rounds).forEach((s2, r) => console.log(`  R${r + 1}: ` + s2.map((x) => `${x[1]}@${x[2]},${x[3]}`).join('  ')));
  for (const f of best.res.log) console.log('  ' + B.fmt(f) + `, gold after ${f.goldLeft}`);
  return { best, wins };
}

module.exports = { PLANS, runPlan, report, search };
