// Headless prototype of the "Mommy" boss puzzle (design draft, November 2026). Nothing here ships: the game's own
// engine file is left as it is. This script loads src/engine.js with a few small additions (PATCHES below) and drives
// the boss's rules from a per-tick hook, so the rules can change freely while the design is still open.
//
// The rules as prototyped (all numbers in CFG are starting points to tune):
//   - Mommy hangs at the middle of her zone and never moves. Her health carries over between rounds.
//   - Hanging: she takes CFG.mommy.hang of all damage and can't be stunned, slowed or moved.
//   - Nests stand in scripted places each round (CFG.nests), all with the same low health. A high nest can only be
//     targeted or hurt by ranged units (range >= CFG.nest.rangedOnly); a low nest by melee units too. Each hatches a
//     spider every CFG.hatch[round] seconds; a destroyed nest bursts into CFG.nest.burst spiders.
//   - All nests down: she falls and takes full damage for the rest of the fight. She and every spider on the board are
//     stunned for CFG.mommy.stun seconds.
//   - Attention: while she hangs and no enemy body stands within her reach (CFG.mommy.near m), she winds up a web mortar
//     at the biggest clump of the player's army. Each shot is one of her own nests, ripped loose (only a nest within her
//     reach: CFG.mommy.mortar.ammoReach), and the blast webs what it hits, so leaving her alone and letting her spend her
//     nests is a way to play too.
//   - (proposed 11 Nov) While she hangs, the player's units pick her only when none of her nests or spiders are left to
//     pick (CFG.mommy.lastPick); spiderlings are lighter than a Spiders body (CFG.spider); a hit's share of max health
//     (bleed, Deadeye) never works on her.
//   - Her bite changes by round (CFG.biteByRound): fast and light, slow and heavy, or a sweep.
//   - Web: every enemy body within CFG.mommy.web.r of her is slowed and hits softer.
//   - Molt: every CFG.mommy.molt seconds she sheds poison, bleed, burn, frost, slows and range cuts.
//   - The player: CFG.startGold to start with, then normal match income, every allowed unit unlocked, skills on, at most CFG.maxPerType squads of one
//     unit type, one free move and one free extra deployment a round, a treasury (no tower): the game's own rule, 50
//     gold for each fight it survives, gold lost when it falls. The fight runs to the timer, so spiders left over
//     when the army is gone go for the treasury.
//
// Run from the repo root:  node tools/boss/mommy.js            (unit ranking, the sample plans, the five-round lines)
//                          node tools/boss/mommy.js rank|skills|tanks|plans|lines|greedy|search
//                          node tools/boss/mommy.js show "<plan name>" [her health]   (one plan, board by board)
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.join(__dirname, '..', '..');

// ---------- the engine, with the prototype's hooks ----------
const PATCHES = [
  // a body with u.rangedOnly = N can only be picked by bodies whose range is at least N
  ['const pickable = (b, f) => f.alive && (!f.hidden || seesHidden(b, f)) && !sheltered(f) && !(b.hunt && !isLone(f)) && !ignores(b, f);',
    'const pickable = (b, f) => f.alive && (!f.hidden || seesHidden(b, f)) && !sheltered(f) && !(b.hunt && !isLone(f)) && !ignores(b, f) && !(f.u.rangedOnly > 0 && b.u.range < f.u.rangedOnly) && !(f.lastPick && lastPickOthers(b, f));\n' +
    // f.lastPick: b leaves f alone while it can pick any other body of f's side (her nests, her spiders)
    '    const lastPickOthers = (b, f) => sides[f.side].some((g) => g !== f && g.alive && !g.lastPick && !g.hidden && !sheltered(g) && !(g.u.rangedOnly > 0 && b.u.range < g.u.rangedOnly));'],
  // ...nor hurt by their splash; b.takeMul scales every hit a body takes; damage to a tagged body is counted per attacker
  ['      st.blocked += hit - dmg;\n      const applied = Math.min(dmg, poolHp(v));',
    '      if (v.u.rangedOnly > 0 && owner.u.range < v.u.rangedOnly) return;\n      if (v.takeMul != null) dmg *= v.takeMul;\n      st.blocked += hit - dmg;\n      const applied = Math.min(dmg, poolHp(v));\n      if (v.bossTag) owner.bossDealt = (owner.bossDealt || 0) + applied;'],
  // ...and so is damage that skips armor (poison, bleed, burn)
  ['      if (v.turning || v.u.aloft || sheltered(v)) return;\n      const applied = Math.min(amount, poolHp(v));',
    '      if (v.turning || v.u.aloft || sheltered(v)) return;\n      if (v.takeMul != null) amount *= v.takeMul;\n      const applied = Math.min(amount, poolHp(v));\n      if (v.bossTag) owner.bossDealt = (owner.bossDealt || 0) + applied;'],
  // bleed's share of max health (3 and 4 stacks) skips a body marked noPct
  ['if (BLEED.pct[bl.n] > 0 && !b.u.structure) dmg +=', 'if (BLEED.pct[bl.n] > 0 && !b.u.structure && !b.noPct) dmg +='],
  // ...and so does a hit's share of the target's max health (the Sniper's Deadeye: 5% a shot)
  ['let pct = owner.u.pctHit > 0 && !v.u.structure ? v.u.hp', 'let pct = owner.u.pctHit > 0 && !v.u.structure && !v.noPct ? v.u.hp'],
  // opts.toTimer: the fight goes on to the time cap even when one side has nobody left (her spiders raid the treasury)
  ['if (t >= g.timeCap || !aliveCount(A) || !aliveCount(B)) { over = true; return false; }', 'if (t >= g.timeCap || (!opts.toTimer && (!aliveCount(A) || !aliveCount(B)))) { over = true; return false; }'],
  // owner.dodgeable: every attack it aims at a body with Wind walk misses (not only every fifth)
  ['        if ((n - 1) % ww.every === 0) {\n          st.missed += hit;', '        if ((n - 1) % ww.every === 0 || owner.dodgeable) {\n          st.missed += hit;'],
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
  startGold: 450,     // this puzzle's starting gold (the game's own is 250: two squads, which made round 1 a dead round)
  fightSecs: 30,
  banned: ['Meteor Caller', 'Assassin', 'Rogue', 'Truespear', 'Sun Priest'],
  maxPerType: 3,      // squads of one unit type on the board at a time
  mommy: {
    hp: 46000, col: 5.5, row: 5, // the front edge of her zone. hp: proposed 11 Nov for the wing nests and pools (14,000 was a placeholder), see the handoff doc section 10
    hang: 0.15,       // share of damage she takes while hanging
    stun: 5,          // seconds she and her spiders are stunned after the fall
    near: 22,         // m: her reach. A body this close holds her attention; she attacks the nearest one (long enough for mid-range shooters to hold her)
    bites: {          // her attack on the nearest body in reach, by style (the same damage per second on one body)
      fast: { hit: 150, aps: 0.8, splash: 0 },    // rewards health
      heavy: { hit: 480, aps: 0.25, splash: 2.5 }, // rewards many bodies, shields and wards (the small splash keeps a swarm from holding her all fight)
      sweep: { hit: 70, aps: 1, splash: 5 },      // rewards one big body
    },
    web: { r: 14, slow: 40, dmg: 40 }, // r: only bodies this close are webbed
    mortar: { wind: 5, every: 4, hit: 120, nestHit: 0, ammo: true, ammoReach: 22, r: 6, slow: 60, dmg: 60, secs: 4 }, // wind: seconds with nobody in reach before the first one (her reach is long, so even slow units get there). ammo: each shot is one of her own nests, ripped loose (the one with least health; ammoReach > 0: only a nest within that many m of her): it is gone, and its spiders burst out where it hung. hit: the blast cripples (web) more than it kills. nestHit: damage to her nests inside the blast (the first version of the rule; it never came into play, so it is off) // wind: seconds with nobody in reach before the first one (long enough to walk to her)
    molt: 6,          // seconds between sheds (0: never)
    bleedPct: false,  // whether bleed's share of max health works on her
    size: 4,          // m: how far out her body reaches once she lies on the ground (melee can crowd round her)
    lastPick: true,   // (proposed) while she hangs, the player's units pick her only when none of her nests or spiders are left to pick
  },
  biteByRound: ['fast', 'heavy', 'sweep', 'heavy', 'sweep'],
  nest: { hp: 500, rangedOnly: 8, burst: 3 },
  spider: { hp: 90 }, // (proposed) changes to the spiderling (a single body of the Spiders unit: 185 health, 20 a hit)   // the same health every round: where they hang is the puzzle
  hatch: [6, 5, 4, 3, 3],                        // seconds per spider, per nest, by round
  // [col, row] a high nest (ranged only), [col, row, 'low'] one melee reaches too. Rows 0-5 are her zone, 6-9 no
  // man's land; she hangs at col 5.5, row 5 and her reach is about 3.7 tiles.
  // (proposed 11 Nov, owner's 5b) nests out on the wings, so an army stacked in the middle can't reach them. Before:
  // [[4,7,low],[9,8]] / [[1,7,low],[5.5,8],[10,6]] / [[7,6,low],[1,4],[10,4]] / [[2,8,low],[9,8,low],[5.5,2],[5.5,8]] /
  // [[0,6,low],[7,7,low],[4,3],[11,6]]
  nests: [
    [[2, 6, 'low'], [10, 8]],                                 // a low nest in her reach on the left wing (a melee squad on it holds her), a high one out on the right
    [[0, 7, 'low'], [11, 8], [9, 4]],                         // the low nest far out of her reach; a high one far right; one up in her reach (she can rip it)
    [[9, 6, 'low'], [0, 5], [11, 5]],                         // one in her web; two on the far wings at her zone's edge (long range, a short walk)
    [[1, 8, 'low'], [10, 8, 'low'], [5.5, 2], [11, 5]],       // two low ones on the wings out of reach, one behind her (she can rip it), one far right
    [[0, 6, 'low'], [8, 7, 'low'], [3, 3], [11, 5]],          // a far low one, a low one in her reach, one up in her reach, one far right
  ],
  treasury: { hp: 400, col: 4, row: 15 },
  // (proposed 11 Nov, back from the rejected list at the owner's request) poison pools on the ground, by round:
  // at: [[col0, row0, col1, row1], ...] per round, null for none. pct: % of max health a second; linger: seconds it
  // keeps working after the body walks out
  pools: { pct: 4, linger: 2, at: [
    [[4, 8, 7, 8]],                                           // the middle lane in front of her
    [[4, 8, 7, 8], [10, 9, 11, 9]],                           // ...and under the right wing's firing spot
    [[4, 7, 7, 8], [0, 8, 1, 8], [10, 8, 11, 8]],             // a wider lane, and both wings' firing spots
    [[4, 8, 7, 8], [2, 9, 3, 9], [8, 9, 9, 9]],
    [[4, 7, 7, 8], [1, 9, 2, 9], [10, 7, 11, 7]],
  ] },
  late: {},           // ways to keep the late rounds from deciding everything (none on): wound, groundMul, climb, income, carryNests
};

// ---------- the boss's bodies ----------
const world = (col, row) => Game.tileToWorld(col, row);
const byRound = (v, round) => Array.isArray(v) ? v[Math.min(round, v.length) - 1] : v;
const spiderUnit = (cfg = CFG) => { const { skills, skillDefs, skillsInnate, skillMods, skillOr, skillNeedsAny, ...s } = units[ix('Spiders')]; return Engine.withTraits({ ...s, name: 'Spiderling', bodies: 1, ...(cfg.spider || {}) }); };
const mommyUnit = (cfg, round) => {
  const a = cfg.mommy.bites[byRound(cfg.biteByRound, round)];
  return Engine.withTraits({ name: 'Mommy', cost: 0, bodies: 1, hp: cfg.mommy.hp, hit: a.hit, aps: a.aps, range: cfg.mommy.near, splash: a.splash, speed: 0, anchored: true, unstoppable: true, shape: 'spider', color: '#1a1a1a', level: 0 });
};
const nestUnit = (cfg, round) => Engine.withTraits({ name: 'Nest', cost: 0, bodies: 1, hp: byRound(cfg.nest.hp, round), hit: 0, aps: 1, range: 0, speed: 0, splash: 0, structure: true, lesser: true, kind: 'nest', shape: 'circle', color: '#d8d0c0', level: 0,
  rangedOnly: cfg.nest.rangedOnly,
  spawn: { every: byRound(cfg.hatch, round), count: 1, max: 999, waves: 0, unit: spiderUnit(cfg) },
  ...(cfg.nest.burst > 0 ? { deathSpawn: { name: 'Spiderling', unit: spiderUnit(cfg), count: cfg.nest.burst, strength: 1 } } : {}) });
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
  mom.dodgeable = !!cfg.mommy.bites[byRound(cfg.biteByRound, round)].dodgeable; // (proposed) Wind walk sidesteps every one of these bites
  const late = cfg.late || {};
  const spots = o.nests || byRound(cfg.nests, round).concat(late.carryNests ? st.carry || [] : []); // (late.carryNests: nests left standing last round hang on)
  const groundMul = (1 + (late.wound || 0) * (st.falls || 0)) * (late.groundMul ? byRound(late.groundMul, round) : 1); // (late.wound: each earlier fall makes her take more; late.groundMul: by round)
  const climbAfter = late.climb ? byRound(late.climb, round) : 0; // (late.climb: seconds on the ground before she climbs back up her thread, by round; 0: she stays down)
  const nu = o.noHatch ? { ...nestUnit(cfg, round), spawn: null, deathSpawn: null } : nestUnit(cfg, round);
  // a nest spot is [col, row] or [col, row, 'low']: a low nest hangs where melee units reach it too
  const nests = spots.map(([c, r, kind], k) => { const w = world(c, r); return Engine.buildSquad(kind === 'low' ? { ...nu, rangedOnly: 0 } : nu, 1, w.x, w.y, -20 - k, TILE, 1 + k)[0]; });
  const B = [mom, ...nests];
  const out = { round, fallAt: null, mortars: 0, mortarAt: null, mortarNests: 0, held: 0, hang: 0, ground: 0, nestsLeft: 0, end: 0, treasury: null, nestDown: nests.map(() => null), holders: {}, gone: {} };
  const sqName = (b) => { const o2 = b.credit || b; const sq = m.armies[0].find((s) => s.id === o2.squad); return sq ? (sq.tag || units[sq.unit].name) : b.u.name; };
  let climbed = false;
  let hanging = !o.fallen, quiet = 0, shots = 0, moltT = cfg.mommy.molt, last = mom.hp;
  const visible = (f) => f.alive && f.side === 0 && !f.u.structure && !f.u.aloft && !f.hidden && !(f.inside && f.inside.alive) && !(f.delay > 0);
  const d2 = (a, x, y) => { const dx = a.x - x, dy = a.y - y; return Math.sqrt(dx * dx + dy * dy); };
  const ground = (u) => ({ ...u, unstoppable: false, ...(cfg.mommy.size > 0 ? { barrier: cfg.mommy.size } : {}) });
  if (!hanging) { mom.takeMul = groundMul; mom.stunT = o.fallen === true ? 1e9 : o.fallen; out.fallAt = 0; mom.u = ground(mom.u); }
  // poison pools: tile rectangles [col0, row0, col1, row1] (inclusive), by round. A body of the player's standing in one is
  // poisoned (pools.pct % of its max health a second, past armor) and slowed by the engine's poison, for pools.linger s
  // after it walks out. Her spiders don't mind them. Slime units drink poison (the engine heals them with it).
  const poolRects = (o.pools || (cfg.pools && cfg.pools.at ? byRound(cfg.pools.at, round) : [])).map(([c0, r0, c1, r1]) => { const a = world(c0, r0), b = world(c1, r1), h = TILE / 2; return { x0: Math.min(a.x, b.x) - h, x1: Math.max(a.x, b.x) + h, y0: Math.min(a.y, b.y) - h, y1: Math.max(a.y, b.y) + h }; });
  out.poolSecs = 0;
  const bossTick = (api) => {
    if (!mom.alive) return;
    nests.forEach((n, k) => { if (!n.alive && out.nestDown[k] == null) out.nestDown[k] = api.t; });
    for (const f of api.all) if (f.side === 0 && !f.alive && f.diedAt == null) f.diedAt = api.t;
    if ((o.trace || cfg.traceRound === round) && api.t + 1e-9 >= (out.traceT || 0)) { // once a second: where each squad's first live body is and what it is after
      out.traceT = (out.traceT || 0) + (o.traceEvery || 1);
      const seen = new Set(), line = [];
      for (const f of api.all) { if (f.side !== 0 || !f.alive || f.u.structure || seen.has(f.squad)) continue; seen.add(f.squad); const sq = m.armies[0].find((q) => q.id === f.squad); if (!sq) continue; const nm = f.near ? (f.near === mom ? 'MOM' : f.near.u.kind === 'nest' ? 'nest' + (nests.indexOf(f.near)) : f.near.u.name.slice(0, 5)) : '-'; line.push(`${(sq.tag || units[sq.unit].name).slice(0, 8)}@${(f.x / TILE + 5.5).toFixed(1)},${(7.5 - f.y / TILE).toFixed(1)}>${nm}`); }
      console.log(`  t${api.t.toFixed(0).padStart(3)} ` + line.join('  ') + `  | nests ${nests.map((n) => n.alive ? Math.round(n.hp) : 'x').join(',')} mom ${Math.round(mom.hp)}`);
    }
    out[hanging ? 'hang' : 'ground'] += last - mom.hp; last = mom.hp;
    if (!hanging && climbAfter > 0 && out.fallAt != null && api.t >= out.fallAt + climbAfter) { hanging = true; climbed = true; mom.u = { ...mom.u, unstoppable: true, barrier: 0 }; out.climbAt = api.t; } // back up her thread for the rest of the fight
    if (hanging && !climbed && (o.fallAt != null ? api.t >= o.fallAt : !nests.some((n) => n.alive))) { // the last nest is down: she falls
      hanging = false; out.fallAt = api.t; mom.takeMul = groundMul; mom.stunT = Math.max(mom.stunT, cfg.mommy.stun);
      mom.u = ground(mom.u);
      for (const b of api.sides[1]) if (b.alive && b !== mom && !b.u.structure) b.stunT = Math.max(b.stunT, cfg.mommy.stun); // her spiders are stunned with her
    }
    mom.x = mw.x; mom.y = mw.y;
    if (hanging) { mom.takeMul = cfg.mommy.hang; mom.stunT = 0; mom.frozenT = 0; }
    mom.lastPick = hanging && !!cfg.mommy.lastPick;
    // molt: she sheds what was put on her
    if (cfg.mommy.molt > 0) { moltT -= api.dt; if (moltT <= 0) { moltT += cfg.mommy.molt; mom.poison = null; mom.bleed = null; mom.burn = null; mom.frost = null; mom.web = null; mom.slowT = 0; mom.slowMove = 0; mom.slowAtk = 0; mom.shrinkT = 0; mom.shrinkM = 0; } }
    const stunned = mom.stunT > 0;
    if (poolRects.length) for (const f of api.sides[0]) {
      if (!f.alive || f.u.structure || f.u.aloft || !poolRects.some((q) => f.x >= q.x0 && f.x <= q.x1 && f.y >= q.y0 && f.y <= q.y1)) continue;
      out.poolSecs += api.dt;
      const pp = f.poison && f.poison.find((x) => x.pool);
      if (pp) pp.t = cfg.pools.linger; else (f.poison || (f.poison = [])).push({ src: null, dps: f.u.hp * cfg.pools.pct / 100, t: cfg.pools.linger, pool: true });
    }
    // web: everything close to her is slowed and hits softer (not while she lies stunned)
    const wb = cfg.mommy.web;
    for (const f of api.sides[0]) {
      if (!f.alive || f.u.structure) continue;
      if (!stunned && wb.r > 0 && d2(f, mw.x, mw.y) <= wb.r) {
        f.momWeb = true; f.web = { slow: Math.max(wb.slow, f.web && !f.momWebOnly ? f.web.slow : 0), dmg: Math.max(wb.dmg, f.web && !f.momWebOnly ? f.web.dmg : 0), t: 1, max: 90 }; f.momWebOnly = true;
        if (!f.u.unstoppable) { if (!(f.slowT > 0)) { f.slowMove = 0; f.slowAtk = 0; } f.slowMove = Math.max(f.slowMove, wb.slow); f.slowT = Math.max(f.slowT, api.dt * 1.5); }
      } else if (f.momWeb && !(f.mortarWebT > api.t)) { f.momWeb = false; f.momWebOnly = false; f.web = null; }
    }
    // attention: nobody close while she hangs, and the mortar winds up
    if (!hanging || stunned) { quiet = 0; shots = 0; return; }
    const mo = cfg.mommy.mortar;
    let holder = null, hd = cfg.mommy.near;
    for (const f of api.sides[0]) if (visible(f)) { const d = d2(f, mw.x, mw.y); if (d <= hd) { hd = d; holder = f; } }
    if (holder) { quiet = 0; shots = 0; out.held += api.dt; const hn = sqName(holder); out.holders[hn] = (out.holders[hn] || 0) + api.dt; return; }
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
    if (mo.ammo) { let pick = null; for (const n of nests) if (n.alive && !(mo.ammoReach > 0 && d2(n, mw.x, mw.y) > mo.ammoReach) && (!pick || n.hp < pick.hp)) pick = n; if (pick) { api.hurt(mom, pick, 1e9, mw.x, mw.y); if (!pick.alive) { out.mortarNests++; out.nestDown[nests.indexOf(pick)] = -api.t; } } }
    if (mo.nestHit > 0) for (const n of nests) if (n.alive && d2(n, bx, by) <= mo.r) { api.hurt(mom, n, mo.nestHit, mw.x, mw.y); if (!n.alive) out.mortarNests++; } // her own nests in the blast
  };
  const sim = Engine.createBattle(A, B, g, { ...opts, bossTick, toTimer: true, record: false });
  while (sim.step() && mom.alive) { /* the fight */ }
  const res = sim.result();
  for (const sq of m.armies[0]) { const bs = sim.bodies.filter((b) => b.side === 0 && b.squad === sq.id && !b.u.structure); if (bs.length) out.gone[sq.tag || units[sq.unit].name] = bs.some((b) => b.alive) ? null : Math.max(...bs.map((b) => b.diedAt || 0)); }
  out[hanging ? 'hang' : 'ground'] += last - Math.max(0, mom.hp);
  out.end = res.time; out.dead = !mom.alive; out.nestsLeft = nests.filter((n) => n.alive).length;
  out.treasury = tre ? tre.alive : null;
  out.left = sim.bodies.filter((b) => b.side === 0 && b.alive && !b.u.structure).length;
  out.spiders = sim.bodies.filter((b) => b.side === 1 && b.alive && b !== mom && !b.u.structure).length;
  // damage to her, by the player's squads
  out.by = {};
  for (const b of sim.bodies) { if (b.side !== 0 || !(b.bossDealt > 0)) continue; const o2 = b.credit || b; const sq = m.armies[0].find((s) => s.id === o2.squad); const n = sq ? (sq.tag || units[sq.unit].name) : b.u.name; out.by[n] = (out.by[n] || 0) + b.bossDealt; }
  st.hp = Math.max(0, mom.hp);
  if (out.fallAt != null) st.falls = (st.falls || 0) + 1;
  st.carry = nests.map((n, k) => n.alive ? spots[k] : null).filter(Boolean);
  out.res = res;
  return out;
}

// ---------- a run of the puzzle ----------
function newRun(cfg = CFG) {
  const m = Game.createMatch(units, matrix, 1, 'standard', null, [], { draft: false });
  m.packages = [[], []];
  for (const u of units) if (!cfg.banned.includes(u.name) && !u.building) m.unlocks[0][units.indexOf(u)] = 1;
  m.extraDeploys[0] = 1; // the free extra deployment
  if (cfg.startGold > 0) m.gold[0] = cfg.startGold; // (a test setting: the game's own 250 otherwise)
  return { m, st: { hp: cfg.mommy.hp }, cfg, log: [] };
}
// the player's actions; each returns whether it went through
const act = (run) => {
  const { m } = run;
  return {
    gold: () => m.gold[0],
    round: () => m.round,
    army: () => m.armies[0],
    buy: (name, col, row) => { const ui = ix(name); if (m.armies[0].filter((q) => q.unit === ui).length >= (run.cfg.maxPerType || 99)) return null; return Game.place(m, 0, ui, col, row) || null; },
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
  if (cfg.late && cfg.late.income != null) m.gold[0] = gold0 + byRound(cfg.late.income, m.round - 1) + (f.treasury ? 50 : 0); // (late.income: a flat income in place of the game's own)
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

module.exports = { Engine, Game, units, matrix, ix, CFG, fight, newRun, act, endRound, play, fmt, world, rank: (...a) => rank(...a), rankSkills: (...a) => rankSkills(...a) };

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
