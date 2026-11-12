// Sample plans for the Mommy prototype (tools/boss/mommy.js), and a random search for plans that beat her.
// A plan is a list of rounds; a round is a list of steps:
//   ['buy', unit, col, row] | ['skill', unit, slot] | ['sell', unit] (the oldest squad of that unit) |
//   ['move', unit, col, row] (the oldest squad of that unit; one free move a round) | ['level', unit]
const B = require('./mommy.js');

// A step names a squad by its tag (set with { as } when bought) or by unit name (the oldest squad of that unit).
//   ['buy', unit, col, row, { as: 'tag', aim: [col, row] }]   aim: a melee squad's direction arrow, to that tile
//   ['aim', who, col, row]      set (or change) the arrow of a squad already on the board; ['unaim', who] clears it
//   ['move', who, col, row]     the free reposition (one a round, for a squad from an earlier round)
//   ['sell', who] | ['level', who] | ['levels'] (every ready squad, while gold lasts) | ['skill', unit, slot]
// A step that doesn't go through is listed in the run's `fails` (so a plan can't silently do less than it says).
function runPlan(plan, cfg = B.CFG, o = {}) {
  const fails = [];
  const res = B.play((a, r, run) => {
    let moves = 0;
    for (const s of plan[r - 1] || []) {
      const find = (w) => a.army().find((q) => q.tag === w) || a.army().find((q) => B.units[q.unit].name === w);
      let ok = true;
      if (s[0] === 'buy') {
        const sq = a.buy(s[1], s[2], s[3]); ok = !!sq;
        if (sq && s[4] && s[4].as) sq.tag = s[4].as;
        if (sq && s[4] && s[4].aim) ok = B.Game.setAim(run.m, 0, sq.id, s[4].aim[0] - sq.col, s[4].aim[1] - sq.row);
      } else if (s[0] === 'skill') ok = a.skill(s[1], s[2]);
      else if (s[0] === 'sell') { const q = find(s[1]); ok = !!q && a.sell(q); }
      else if (s[0] === 'unaim') { const q = find(s[1]); ok = !!q && B.Game.clearAim(run.m, 0, q.id); }
      else if (s[0] === 'aim') { const q = find(s[1]); ok = !!q && B.Game.setAim(run.m, 0, q.id, s[2] - q.col, s[3] - q.row); }
      else if (s[0] === 'move') { const q = find(s[1]); const old = q && q.round < a.round(); if (old && moves >= 1) ok = false; else { ok = !!q && a.move(q, s[2], s[3]); if (ok && old) moves++; } }
      else if (s[0] === 'level') { const q = find(s[1]); ok = !!q && !!a.level(q); }
      else if (s[0] === 'levels') { for (const q of a.army().slice()) while (a.level(q)) { /* every squad that is ready, while the gold lasts */ } }
      if (!ok) fails.push(`R${r} ${JSON.stringify(s)}`);
    }
    if (o.onDeploy) o.onDeploy(run, r);
  }, cfg);
  res.fails = fails;
  return res;
}

// the board as text: her zone (rows 0-5), no man's land (6-9), the player's rows (10-15). M Mommy, H a high nest, L a
// low one, a letter per squad (the key below), > an arrow's end, . her reach, ~ a poison pool
function board(run, round, cfg = B.CFG) {
  const { m } = run, rows = [];
  const spots = cfg.nests[Math.min(round, cfg.nests.length) - 1];
  const mw = B.world(cfg.mommy.col, cfg.mommy.row), key = [];
  const grid = Array.from({ length: 16 }, () => Array(12).fill(' '));
  for (let r = 0; r < 16; r++) for (let c = 0; c < 12; c++) { const w = B.world(c, r); if (Math.hypot(w.x - mw.x, w.y - mw.y) <= cfg.mommy.near) grid[r][c] = '.'; }
  for (const sq of m.armies[0]) { const e = B.Game.aimEnd(m, sq); if (e) grid[e.row][e.col] = '>'; }
  m.armies[0].forEach((sq, k) => { const ch = String.fromCharCode(97 + k); grid[sq.row][sq.col] = ch; key.push(`${ch} ${sq.tag || B.units[sq.unit].name}${sq.level ? ' L' + sq.level : ''}`); });
  for (const [c0, r0, c1, r1] of (cfg.pools && cfg.pools.at && cfg.pools.pct > 0 ? cfg.pools.at[Math.min(round, cfg.pools.at.length) - 1] || [] : [])) for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (grid[r][c] === ' ' || grid[r][c] === '.') grid[r][c] = '~';
  for (const [c, r, kind] of spots) grid[r][Math.round(c)] = kind === 'low' ? 'L' : 'H';
  grid[cfg.mommy.row][5] = 'M'; grid[cfg.mommy.row][6] = 'M';
  for (let r = 0; r < 16; r++) rows.push(`   ${String(r).padStart(2)} |${grid[r].join(' ')}|${r === 5 ? ' her zone ends' : r === 9 ? ' no man\'s land ends' : ''}`);
  return rows.join('\n') + '\n      ' + key.join(', ');
}

// one fight, in more detail than fmt: when each nest fell (m: ripped loose for a mortar shot), who held her, who did
// the damage, and which squads were wiped out when
function detail(f) {
  const nd = f.nestDown.map((t) => t == null ? 'stood' : t < 0 ? 'm' + (-t).toFixed(1) : t.toFixed(1)).join(' / ');
  const hold = Object.entries(f.holders).sort((a, b) => b[1] - a[1]).map(([n, t]) => `${n} ${t.toFixed(1)}`).join(', ') || 'nobody';
  const by = Object.entries(f.by).sort((a, b) => b[1] - a[1]).map(([n, d]) => `${n} ${Math.round(d)}`).join(', ') || '-';
  const gone = Object.entries(f.gone).filter(([, t]) => t != null).map(([n, t]) => `${n} ${t.toFixed(1)}`).join(', ') || 'none';
  return `      nests (s): ${nd}; held by: ${hold}\n      damage by: ${by}\n      wiped out (s): ${gone}`;
}

const PLANS = {
  // Round 1 only (450 gold: four cheap squads). She hangs at col 5.5, row 5; the low nest is at col 4, row 7 (in her
  // reach), the high one at col 9, row 8 (out of it).
  // A melee squad up the low nest's column kills that nest and holds her; shooters take the high one.
  'Round 1, tank: Goblins on the low nest, Wisps + Archers + Sniper on the high one': [
    [['buy', 'Goblin Swarm', 4, 10], ['buy', 'Wisps', 9, 10], ['buy', 'Skeleton Archers', 10, 10], ['buy', 'Sniper', 8, 11]],
  ],
  'Round 1, tank: Brute on the low nest, Wisps + Archers on the high one': [
    [['buy', 'Brute', 4, 10], ['buy', 'Wisps', 9, 10], ['buy', 'Skeleton Archers', 10, 10]],
  ],
  'Round 1, tank: two Goblin squads on the low nest, Wisps + Archers on the high one': [
    [['buy', 'Goblin Swarm', 4, 10], ['buy', 'Goblin Swarm', 3, 10], ['buy', 'Wisps', 9, 10], ['buy', 'Skeleton Archers', 10, 10]],
  ],
  // nobody in her reach: she spends a nest on each mortar shot
  'Round 1, no tank: four shooters in a clump': [
    [['buy', 'Wisps', 8, 10], ['buy', 'Sniper', 9, 11], ['buy', 'Skeleton Archers', 9, 10], ['buy', 'Sniper', 8, 11]],
  ],
  'Round 1, no tank: four shooters spread wide': [
    [['buy', 'Wisps', 0, 10], ['buy', 'Sniper', 11, 11], ['buy', 'Skeleton Archers', 9, 10], ['buy', 'Sniper', 1, 11]],
  ],
  // ---- five-round lines, written by hand to follow the intended strategies, for the wing nests and poison pools (her
  // health is set huge in `lines` so every round is played and can be measured). Squads are named with { as } so later
  // rounds can move, aim and sell them.
  // Line B: read each round
  'Line B: read each round (no tank in round 4)': [
    // R1 fast. Two Goblin squads walk up the left wing to the low nest in her reach (clear of the pool in the middle
    // lane), kill it and hold her; Wisps and Archers on the right take the high nest
    [['buy', 'Goblin Swarm', 2, 10, { as: 'gobA' }], ['buy', 'Goblin Swarm', 1, 10, { as: 'gobB' }], ['buy', 'Wisps', 10, 10, { as: 'wisp' }], ['buy', 'Skeleton Archers', 9, 10, { as: 'archA' }]],
    // R2 heavy. One Goblin squad gets an arrow to the far low nest, the other an arrow at her (a swarm soaks the heavy
    // bite); a Sniper and more Wisps on the right
    [['aim', 'gobA', 0, 7], ['aim', 'gobB', 5, 6], ['buy', 'Sniper', 9, 11, { as: 'snipA' }], ['buy', 'Wisps', 8, 10, { as: 'wispB' }], ['levels']],
    // R3 sweep. Sell both Goblin squads; a Brute with an arrow to (8, 6), inside her reach next to the low nest, holds
    // her; a Sniper and an Earth Wizard on the left for the far left nest (the Sniper stands short of the wing pool)
    [['sell', 'gobA'], ['sell', 'gobB'], ['buy', 'Brute', 8, 11, { as: 'brute', aim: [8,  6] }], ['buy', 'Sniper', 2, 10, { as: 'snipB' }], ['buy', 'Earth Wizard', 3, 12, { as: 'earth' }], ['levels']],
    // R4 heavy. Sell the Brute and keep out of her reach: she spends the nest behind her on a mortar shot. A Slime
    // Wizard on the right stands in the pool there and drinks it; a Sniper for the left
    [['sell', 'brute'], ['buy', 'Slime Wizard', 10, 12, { as: 'slime' }], ['buy', 'Sniper', 1, 11, { as: 'snipC' }], ['levels']],
    // R5 sweep. A Brute with an arrow to the low nest in her reach holds; Goblins to the far left low nest
    [['buy', 'Brute', 8, 12, { as: 'brute2', aim: [8,  7] }], ['buy', 'Goblin Swarm', 1, 10, { as: 'gobC', aim: [0,  6] }], ['levels']],
  ],
  // Line A: as B, but in round 4 the Brute stays and a Leaf Wizard dives for the nest behind her
  'Line A: hold her every round': [
    [['buy', 'Goblin Swarm', 2, 10, { as: 'gobA' }], ['buy', 'Goblin Swarm', 1, 10, { as: 'gobB' }], ['buy', 'Wisps', 10, 10, { as: 'wisp' }], ['buy', 'Skeleton Archers', 9, 10, { as: 'archA' }]],
    [['aim', 'gobA', 0, 7], ['aim', 'gobB', 5, 6], ['buy', 'Sniper', 9, 11, { as: 'snipA' }], ['buy', 'Wisps', 8, 10, { as: 'wispB' }], ['levels']],
    [['sell', 'gobA'], ['sell', 'gobB'], ['buy', 'Brute', 8, 11, { as: 'brute', aim: [8,  6] }], ['buy', 'Sniper', 2, 10, { as: 'snipB' }], ['buy', 'Earth Wizard', 3, 12, { as: 'earth' }], ['levels']],
    [['buy', 'Leaf Wizard', 6, 12, { as: 'leaf' }], ['levels']],
    [['buy', 'Brute', 8, 12, { as: 'brute2', aim: [8,  7] }], ['buy', 'Goblin Swarm', 1, 10, { as: 'gobC', aim: [0,  6] }], ['levels']],
  ],
  // Line C: nobody is sent into her reach. She spends the nests in her reach on mortar shots; shooters (and a Goblin
  // squad on the far low nests) take the rest
  'Line C: never hold her': [
    [['buy', 'Wisps', 10, 10, { as: 'wispA' }], ['buy', 'Wisps', 2, 11, { as: 'wispB' }], ['buy', 'Skeleton Archers', 9, 10, { as: 'archA' }], ['buy', 'Sniper', 1, 11, { as: 'snipA' }]],
    [['buy', 'Goblin Swarm', 1, 10, { as: 'gobA', aim: [0,  7] }], ['buy', 'Sniper', 9, 11, { as: 'snipB' }], ['buy', 'Skeleton Archers', 8, 11, { as: 'archB' }], ['levels']],
    [['buy', 'Slime Wizard', 1, 12, { as: 'slime' }], ['buy', 'Sniper', 10, 11, { as: 'snipC' }], ['levels']],
    [['buy', 'Earth Wizard', 10, 12, { as: 'earth' }], ['buy', 'Wisps', 3, 11, { as: 'wispC' }], ['levels']],
    [['buy', 'Goblin Swarm', 2, 10, { as: 'gobB', aim: [0,  6] }], ['buy', 'Earth Wizard', 9, 12, { as: 'earth2' }], ['levels']],
  ],
  // a coaster: the least that clears rounds 1-3, gold banked, then the biggest army it can field in rounds 4-5 (the
  // deployment limit and the experience from fights stop it: it does about 5,000 in all)
  'Coaster: bank gold, burst late': [
    [['buy', 'Wisps', 9, 10, { as: 'wisp' }], ['buy', 'Skeleton Archers', 10, 10, { as: 'archA' }]],
    [['buy', 'Sniper', 2, 11, { as: 'snipA' }]],
    [['buy', 'Earth Wizard', 1, 11, { as: 'earth' }]],
    [['buy', 'Goblin Swarm', 4, 10, { as: 'gobA' }], ['buy', 'Goblin Swarm', 5, 10, { as: 'gobB' }], ['buy', 'Goblin Swarm', 6, 10, { as: 'gobC' }], ['levels']],
    [['buy', 'Wisps', 8, 10, { as: 'wispB' }], ['buy', 'Wisps', 7, 10, { as: 'wispC' }], ['buy', 'Sniper', 10, 12, { as: 'snipB' }], ['skill', 'Goblin Swarm', 0], ['skill', 'Wisps', 0], ['levels']],
  ],
  // found by hill climbs (a few hundred random changes to Line B, kept when she took more damage; squads named x123456
  // are ones the climb added): the best found for rounds 1-3 (it wins in round 3 at 54,000, with half a second to spare: three Goblin squads, one
  // kept through the sweep) and for all five rounds
  'Search best, rounds 1-3': require('./best-r1-3.json'),
  'Search best, five rounds': require('./best-r1-5.json'),
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

// play one plan and print every round: the board as deployed, then what happened
function show(plan, cfg = B.CFG, title = '') {
  const boards = [];
  const res = runPlan(plan, cfg, { onDeploy: (run, r) => boards.push(board(run, r, cfg) + `\n      gold left ${run.m.gold[0]}`) });
  console.log(`\n=== ${title} ${res.won ? 'WON in round ' + res.rounds : 'lost, ' + Math.round(res.hpLeft) + ' health left'}${res.fails.length ? '  FAILED STEPS: ' + res.fails.join('; ') : ''}`);
  res.log.forEach((f, k) => { console.log(boards[k]); console.log('  ' + B.fmt(f)); console.log(detail(f)); });
  return res;
}

// the five-round lines, round by round, with her health set out of reach so every round is played: damage per round
// (thousands), and the share of it done in rounds 4-5
function lines(cfg = B.CFG) {
  const c = { ...cfg, mommy: { ...cfg.mommy, hp: 1e7 } };
  console.log(`\nDamage per round (thousands) with her health out of reach${Object.keys(cfg.late || {}).length ? ', late: ' + JSON.stringify(cfg.late) : ''}`);
  console.log('line'.padEnd(46) + ['R1', 'R2', 'R3', 'R4', 'R5'].map((x) => x.padStart(6)).join('') + '  by R3   by R4     all  R4-5 share  fall times (s)');
  const out = {};
  for (const [name, plan] of Object.entries(PLANS)) {
    if (plan.length < 5) continue;
    const res = runPlan(plan, c), d = res.log.map((f) => f.hang + f.ground), tot = d.reduce((a, b) => a + b, 0);
    const k = (x) => (x / 1000).toFixed(1).padStart(6);
    console.log(name.slice(0, 45).padEnd(46) + d.map(k).join('') + k(d[0] + d[1] + d[2]) + '  ' + k(d[0] + d[1] + d[2] + d[3]) + '  ' + k(tot) + `${Math.round((d[3] + d[4]) / tot * 100)}%`.padStart(11) + '  ' + res.log.map((f) => f.fallAt == null ? '-' : f.fallAt.toFixed(1)).join(' / ') + (res.fails.length ? '  FAILED: ' + res.fails.join('; ') : ''));
    out[name] = d;
  }
  return out;
}

module.exports = { PLANS, runPlan, report, search, greedy, board, detail, show, lines };
