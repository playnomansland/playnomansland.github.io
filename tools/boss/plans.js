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
  // round 1 only: a melee squad up the column of the low nest in her reach (it kills the nest and holds her), a
  // shooter on the high nest. With the game's 250 gold that is two squads, and nobody is left to hit her when she falls
  'Round 1: Goblins on the low nest, Wisps on the high one': [
    [['buy', 'Goblin Swarm', 4, 10], ['buy', 'Wisps', 9, 10]],
  ],
  // round 1 only: nobody in her reach, so the mortar fires
  'Round 1: two shooters, nobody near her': [
    [['buy', 'Wisps', 2, 10], ['buy', 'Wisps', 9, 10]],
  ],
  // what the greedy planner below found (40 tries a round): it clears round 2 and never reaches the nests up in her zone
  'Greedy sample': [
    [['buy', 'Goblin Swarm', 5, 10], ['buy', 'Ether Golem', 8, 10], ['buy', 'Goblin Swarm', 5, 11], ['buy', 'Water Mage', 7, 11]],
    [['buy', 'Ember Imps', 6, 11], ['buy', 'Shiv', 10, 10], ['buy', 'Wisps', 1, 10]],
    [['buy', 'Ether Golem', 1, 11], ['buy', 'Skeleton Archers', 6, 10], ['buy', 'Obelisk', 3, 10]],
    [['buy', 'Leaf Wizard', 8, 11], ['buy', 'Frost Wizard', 5, 10], ['buy', 'Earth Wizard', 7, 11]],
    [['buy', 'Brute', 4, 11], ['buy', 'Goblin Swarm', 8, 10], ['buy', 'Earth Wizard', 1, 10]],
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
  const step = () => ['buy', pool[ri(pool.length)], ri(12), 10 + ri(2)];
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

// ---------- greedy, round by round ----------
// For each round in turn: try `per` random sets of up to three purchases (units from the pool, in a column of one of
// this round's nests or in the middle) on top of what the earlier rounds bought, and keep the set that hurts her most
// this round. Short-sighted, but it shows what a sensible army can do round by round.
function greedy(per = 40, cfg = B.CFG, pool, seed0 = 777) {
  pool = pool || ['Goblin Swarm', 'Wisps', 'Skeleton Archers', 'Sniper', 'Ember Imps', 'Fire Mage', 'Ent', 'Brute', 'Leaf Wizard', 'Earth Wizard', 'Shiv', 'Spiders', 'Steel Wizard', 'Obelisk', 'Water Mage', 'Frost Wizard', 'Ether Golem'];
  let seed = seed0;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ri = (n) => Math.floor(rnd() * n);
  const plan = [];
  let res = null;
  for (let r = 1; r <= cfg.rounds; r++) {
    const cols = B.CFG.nests[Math.min(r, cfg.nests.length) - 1].map((n) => Math.round(n[0])).concat([5, 6]);
    let best = null;
    for (let k = 0; k < per; k++) {
      const steps = Array.from({ length: r === 1 ? 4 : 3 }, () => ['buy', pool[ri(pool.length)], Math.max(0, Math.min(11, cols[ri(cols.length)] + ri(3) - 1)), 10 + ri(2)]);
      const out = runPlan(plan.concat([steps]), { ...cfg, rounds: r });
      const f = out.log[r - 1];
      if (!f) continue; // she was dead before this round
      const sc = (out.won ? 1e6 : 0) + f.ground + f.hang + (f.treasury ? 100 : 0);
      if (!best || sc > best.sc) best = { sc, steps, out };
    }
    plan.push(best.steps); res = best.out;
    if (res.won) break;
  }
  console.log(`\nGreedy, ${per} tries a round (purchases only): ${res.won ? 'WON in round ' + res.rounds : 'lost with ' + Math.round(res.hpLeft) + ' health left on her'}`);
  plan.forEach((s2, r) => console.log(`  R${r + 1}: ` + s2.map((x) => `${x[1]}@${x[2]},${x[3]}`).join('  ')));
  for (const f of res.log) console.log('  ' + B.fmt(f) + `, gold after ${f.goldLeft}`);
  return { plan, res };
}

module.exports = { PLANS, runPlan, report, search, greedy };
