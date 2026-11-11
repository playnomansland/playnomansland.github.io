// How hard is she? Agent-based playtesting for the Mommy prototype (tools/boss/mommy.js).
//
// Several kinds of automatic player ("agents"), each run many times with different random seeds. Each knows a different
// amount about her rules. Every run plays all five rounds with her health out of reach, so one run gives the damage
// done by round 3, 4 and 5; a win at any health is then read off those numbers.
//
//   random    buys random units on random tiles, levels up. Knows nothing.
//   statmax   buys the units and skills that top the damage ranking, in the middle front rows, levels everything.
//             No arrows, no moves, no selling, never reads the round. The "DPS check" player.
//   statmax+  the same with extra gold every round (to price what knowledge is worth in gold)
//   aware     reads each round: a melee squad with an arrow on each low nest, shooters in the columns of the high
//             nests, a holder that suits the bite (sells the ones that don't), leaves her alone when a nest she can
//             rip sits where it is hard to reach, uses the free move. Random among sensible choices.
//
// Also ablations: Line B (tools/boss/plans.js) with one piece of knowledge taken out at a time, and with every squad
// nudged a tile at random (does it win by knowledge or by luck?).
//
// Run from the repo root: node tools/boss/difficulty.js [runs per agent, default 40] [health to judge by, default CFG]
const B = require('./mommy.js');
const P = require('./plans.js');
const C = B.CFG;
const OUT = { ...C, mommy: { ...C.mommy, hp: 1e7 } }; // her health out of reach: every round is played
const mw = B.world(C.mommy.col, C.mommy.row);
const distHer = (c, r) => { const w = B.world(c, r); return Math.hypot(w.x - mw.x, w.y - mw.y); };
const U = (n) => B.units[B.ix(n)];
const allowed = B.units.filter((u) => !C.banned.includes(u.name) && !u.building).map((u) => u.name);

function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const pick = (rnd, xs) => xs[Math.floor(rnd() * xs.length)];
const cumulative = (log) => { let c = 0; return log.map((f) => (c += f.hang + f.ground)); };
const runAgent = (agent, cfg = OUT) => { const res = B.play(agent, cfg); return cumulative(res.log); };

// buy `name` on the first free tile from a list of tiles; returns the squad or null
function buyAt(a, name, tiles) { for (const [c, r] of tiles) { const sq = a.buy(name, c, r); if (sq) return sq; } return null; }
const deploysLeft = (run) => B.Game.deploysLeft(run.m, 0);
const levelAll = (a) => { for (const q of a.army().slice()) while (a.level(q)) { /* while gold lasts */ } };

// ---------- random ----------
const randomAgent = (seed) => { const rnd = rng(seed); return (a, r, run) => {
  for (let k = 0; k < 12 && deploysLeft(run) > 0; k++) buyAt(a, pick(rnd, allowed), [[1 + Math.floor(rnd() * 10), 10 + Math.floor(rnd() * 3)]]);
  levelAll(a);
}; };

// ---------- statmax ----------
// the top of `node tools/boss/mommy.js skills`: damage per 100 gold on the ground, with the skill worth buying
const TOP = [['Goblin Swarm', 0], ['Skeleton Archers', 2], ['Wisps', 0], ['Earth Wizard', 1], ['Sniper', null], ['Steel Wizard', 2], ['Slime Wizard', null], ['Necromancer', null]];
const statmaxAgent = (seed, extra = 0) => { const rnd = rng(seed); return (a, r, run) => {
  run.m.gold[0] += extra;
  const middle = []; for (const row of [10, 11, 12]) for (const c of [5, 6, 4, 7, 3, 8]) middle.push([c, row]);
  for (let k = 0; k < 20 && deploysLeft(run) > 0; k++) { // mostly the very top, sometimes further down the list
    const i = Math.min(TOP.length - 1, Math.floor(Math.pow(rnd(), 2) * TOP.length));
    const start = Math.floor(rnd() * 6); buyAt(a, TOP[i][0], middle.slice(start).concat(middle.slice(0, start)));
  }
  for (const [n, k] of TOP) if (k != null && a.army().some((q) => B.units[q.unit].name === n)) a.skill(n, k);
  levelAll(a);
}; };

// ---------- aware ----------
const HOLDERS = { fast: ['Goblin Swarm', 'Steel Wizard', 'Brute'], heavy: ['Goblin Swarm', 'Skeleton Archers'], sweep: ['Brute', 'Steel Wizard'] };
const MELEE_FOR_NEST = { fast: ['Goblin Swarm', 'Brute'], heavy: ['Goblin Swarm', 'Brute'], sweep: ['Brute'] };
const SHOOTERS = ['Wisps', 'Skeleton Archers', 'Sniper', 'Earth Wizard', 'Slime Wizard', 'Frost Wizard'];
const isMelee = (n) => U(n).range <= 5;
// spread the gold over the deployments left: a unit may cost what is left after 100 for each later deployment
const budget = (a, run) => a.gold() - 100 * Math.max(0, deploysLeft(run) - 1);
const choose = (rnd, pool, a, run) => { const ok = pool.filter((n) => B.Game.unitCostOf(U(n)) <= budget(a, run)); return ok.length ? pick(rnd, ok) : null; };
const awareAgent = (seed) => { const rnd = rng(seed); return (a, r, run) => {
  const bite = C.biteByRound[r - 1], spots = C.nests[r - 1];
  const reach = C.mommy.near, ammo = C.mommy.mortar.ammoReach;
  const name = (q) => B.units[q.unit].name;
  // sell what this bite punishes (a swarm under the sweep)
  if (bite === 'sweep') for (const q of a.army().slice()) if (name(q) === 'Goblin Swarm' && rnd() < 0.8) a.sell(q);
  // leave her alone this round? Worth it when a nest she can rip sits deep (behind her, or 2+ rows into her zone)
  const deep = spots.filter(([c, rw]) => rw <= 3 && distHer(c, rw) <= ammo);
  const noTank = deep.length > 0 && rnd() < 0.7;
  if (noTank) for (const q of a.army().slice()) if (isMelee(name(q))) { if (rnd() < 0.6) a.sell(q); else B.Game.clearAim(run.m, 0, q.id); }
  let moved = false;
  // a melee squad with an arrow on each low nest (one out of her reach keeps it away from her)
  for (const [c, rw, kind] of spots) {
    if (kind !== 'low' || deploysLeft(run) <= 0) continue;
    if (noTank && distHer(c, rw) <= reach) continue;
    const col = Math.max(1, Math.min(10, Math.round(c))), m2 = choose(rnd, MELEE_FOR_NEST[bite], a, run);
    const sq = m2 && buyAt(a, m2, [[col, 10], [col + 1, 10], [col - 1, 10], [col, 11]]);
    if (sq) B.Game.setAim(run.m, 0, sq.id, Math.round(c) - sq.col, rw - sq.row);
  }
  // a holder that suits the bite, with an arrow at her (unless this is a no-tank round or the low-nest squad holds)
  const lowInReach = spots.some(([c, rw, kind]) => kind === 'low' && distHer(c, rw) <= reach);
  if (!noTank && !lowInReach && deploysLeft(run) > 0) {
    const h = choose(rnd, HOLDERS[bite], a, run), sq = h && buyAt(a, h, [[5, 10], [6, 10], [5, 11], [6, 11]]);
    if (sq && isMelee(h)) B.Game.setAim(run.m, 0, sq.id, 0, -4);
  }
  // shooters in the column of each high nest, the long-range ones for deep nests; the free move brings an old one over
  for (const [c, rw, kind] of spots) {
    if (kind === 'low') continue;
    const col = Math.max(1, Math.min(10, Math.round(c))), tiles = [[col, 10], [col, 11], [col + 1, 10], [col - 1, 10], [col, 12]];
    const longOnly = rw <= 4;
    if (!moved && rnd() < 0.6) { const old = a.army().find((q) => q.round < r && !isMelee(name(q)) && Math.abs(q.col - col) > 2 && (!longOnly || U(name(q)).range >= 24)); if (old) for (const [tc, tr] of tiles) if (a.move(old, tc, tr)) { moved = true; break; } }
    if (deploysLeft(run) > 0) { const n = choose(rnd, longOnly ? ['Sniper', 'Earth Wizard', 'Slime Wizard', 'Frost Wizard'] : SHOOTERS, a, run); if (n) buyAt(a, n, tiles); }
  }
  // deployments and gold left: a second melee squad on a low nest in her reach (it holds her while it clears), or
  // another shooter on a nest's column, cheaper ones when gold runs low
  for (let k = 0; k < 8 && deploysLeft(run) > 0 && a.gold() >= 100; k++) {
    const low = spots.find(([c, rw, kind]) => kind === 'low' && distHer(c, rw) <= reach);
    if (low && !noTank && rnd() < 0.4) {
      const m2 = choose(rnd, MELEE_FOR_NEST[bite], a, run), col = Math.max(1, Math.min(10, Math.round(low[0])));
      const sq = m2 && buyAt(a, m2, [[col - 1, 10], [col + 1, 10], [col, 11], [col - 1, 11]]);
      if (sq) { B.Game.setAim(run.m, 0, sq.id, Math.round(low[0]) - sq.col, low[1] - sq.row); continue; }
    }
    const [c] = pick(rnd, spots), col = Math.max(1, Math.min(10, Math.round(c)));
    const n = choose(rnd, SHOOTERS, a, run);
    if (!n) break;
    buyAt(a, n, [[col, 11], [col + 1, 11], [col - 1, 11], [col, 12], [col + 1, 12]]);
  }
  levelAll(a);
}; };

// ---------- ablations of Line B ----------
const clone = (x) => JSON.parse(JSON.stringify(x));
const LINE_B = P.PLANS['Line B: read each round (no tank in round 4)'];
const ablations = {
  'Line B as written': LINE_B,
  'no direction arrows': LINE_B.map((st) => st.filter((s) => s[0] !== 'aim').map((s) => s[0] === 'buy' && s[4] ? [s[0], s[1], s[2], s[3], { as: s[4].as }] : s)),
  'no free moves': LINE_B.map((st) => st.filter((s) => s[0] !== 'move')),
  'keeps the Goblins in round 3 (no sell)': (() => { const p = clone(LINE_B); p[2] = p[2].filter((s) => s[0] !== 'sell'); return p; })(),
  'holds her in round 4 (keeps the Brute)': (() => { const p = clone(LINE_B); p[3] = p[3].filter((s) => s[0] !== 'sell'); return p; })(),
  'no level-ups': LINE_B.map((st) => st.filter((s) => s[0] !== 'levels')),
  'shooters bought in the middle columns': LINE_B.map((st) => st.map((s) => s[0] === 'buy' && !isMelee(s[1]) ? [s[0], s[1], 5 + (s[2] % 2), s[3], s[4]] : s)),
};
function jittered(plan, seed) { const rnd = rng(seed); return plan.map((st) => st.map((s) => s[0] === 'buy' ? [s[0], s[1], Math.max(1, Math.min(10, s[2] + Math.floor(rnd() * 3) - 1)), Math.max(10, Math.min(12, s[3] + Math.floor(rnd() * 3) - 1)), s[4]] : s)); }

// ---------- the report ----------
function winRound(cum, hp) { const i = cum.findIndex((d) => d >= hp); return i < 0 ? null : i + 1; }
function summary(label, cums, hp) {
  const n = cums.length, by = (k) => cums.filter((c) => { const w = winRound(c, hp); return w != null && w <= k; }).length / n * 100;
  const med = (k) => { const xs = cums.map((c) => c[k - 1] || 0).sort((x, y) => x - y); return xs[Math.floor(n / 2)] / 1000; };
  const best = Math.max(...cums.map((c) => c[c.length - 1])) / 1000;
  console.log(label.padEnd(44) + String(n).padStart(5) + `${by(3).toFixed(0)}%`.padStart(8) + `${by(4).toFixed(0)}%`.padStart(8) + `${by(5).toFixed(0)}%`.padStart(8) + med(4).toFixed(1).padStart(10) + med(5).toFixed(1).padStart(10) + best.toFixed(1).padStart(9));
}
function report(runs = 40, hp = C.mommy.hp) {
  console.log(`\nHow often each kind of player beats her (health ${hp}). Damage in thousands, with her health out of reach.`);
  console.log('player'.padEnd(44) + 'runs'.padStart(5) + 'by R3'.padStart(8) + 'by R4'.padStart(8) + 'by R5'.padStart(8) + 'median R4'.padStart(10) + 'median R5'.padStart(10) + 'best R5'.padStart(9));
  const pops = {};
  const pop = (label, make) => { const cums = []; for (let s = 1; s <= runs; s++) cums.push(runAgent(make(s * 7919 + 13))); pops[label] = cums; summary(label, cums, hp); };
  pop('random', randomAgent);
  pop('statmax', (s) => statmaxAgent(s));
  pop('statmax + 100 gold a round', (s) => statmaxAgent(s, 100));
  pop('statmax + 200 gold a round', (s) => statmaxAgent(s, 200));
  pop('aware', awareAgent);
  console.log('\nLine B with one piece of knowledge taken out');
  for (const [label, plan] of Object.entries(ablations)) { const res = P.runPlan(plan, OUT); summary(label + (res.fails.length ? ` (${res.fails.length} steps failed)` : ''), [cumulative(res.log)], hp); }
  const jit = []; for (let s = 1; s <= runs; s++) jit.push(cumulative(P.runPlan(jittered(LINE_B, s * 104729), OUT).log));
  summary('Line B, every squad nudged up to a tile', jit, hp);
  pops['Line B jittered'] = jit;
  return pops;
}

module.exports = { randomAgent, statmaxAgent, awareAgent, ablations, jittered, report, runAgent, winRound };
if (require.main === module) report(+process.argv[2] || 40, +process.argv[3] || C.mommy.hp);
