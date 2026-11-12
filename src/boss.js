// ===== The Mommy boss puzzle (developer test, 2026-11-11; design: docs/HANDOFF-BOSS-MOMMY.md) =====
// A five-round fight against one boss, a huge spider hanging at the front edge of her zone. Shared by the page (the
// Developer menu's Mommy) and the prototype's tools (tools/boss/). A match plays it when m.boss is set (Boss.setup):
// Game.startBattle builds her fight here (Boss.battle) and Game.resolve hands its result back (Boss.afterFight). The
// engine features it uses do nothing unless asked for (src/engine.js: u.rangedOnly, takeMul, bossTag, noPct, lastPick,
// dodgeable, opts.toTimer, opts.bossTick).
//
// The rules (numbers in CFG):
//   - She never moves. Her health carries over between rounds and never comes back.
//   - Hanging: she takes CFG.mommy.hang of all damage, can't be stunned, rooted, slowed or moved, and units pick her
//     only when none of her nests or spiders are left to pick.
//   - Nests hang in scripted places each round, all with the same health. A high nest can only be hit by ranged units;
//     a low one by melee too. Each hatches a spider every few seconds; a destroyed nest bursts into spiders.
//   - All nests down: she falls, she and her spiders are stunned, and she takes full damage for the rest of the fight.
//   - Attention: she bites the nearest body within her reach; bodies close to her are webbed. With nobody in her reach
//     while she hangs she fires a web mortar at the player's biggest clump, and each shot is one of her nests within her
//     reach, ripped loose.
//   - Her bite changes by round: fast, heavy (Wind walk can't dodge it... unless bites.heavy.dodgeable), or a sweep.
//   - Molt: every few seconds she sheds poison, bleed, burn, frost and slows. A hit's share of max health never works.
//   - Poison pools: scripted tiles each round; the player's units standing in one are poisoned and slowed.
//   - The player: CFG.startGold, then the game's income; every allowed unit unlocked, at most CFG.maxPerType squads of a
//     type, one free move and one free extra deployment a round, a treasury and no tower. Win: kill her by round 5.
(function (root) {
  const E = () => (typeof Engine !== 'undefined' ? Engine : require('./engine.js'));
  const G = () => (typeof Game !== 'undefined' ? Game : require('./game.js'));

  const CFG = {
    rounds: 5,          // kill her by the end of this round
    startGold: 450,     // the start (the game's own is 250: two squads, which made round 1 a dead round)
    fightSecs: 30,
    banned: ['Meteor Caller', 'Assassin', 'Rogue', 'Truespear', 'Sun Priest'],
    maxPerType: 3,      // squads of one unit type at a time
    titleRound: 3,      // beating her by this round earns the "Mommy" title (not given out yet)
    mommy: {
      hp: 54000, col: 5.5, row: 5, // the front edge of her zone
      hang: 0.15,       // share of damage she takes while hanging
      stun: 5,          // seconds she and her spiders are stunned after the fall
      near: 22,         // m: her reach. A body this close holds her attention; she bites the nearest one
      bites: {          // her bite on the nearest body in reach, by style (about the same damage per second on one body)
        fast: { hit: 150, aps: 0.8, splash: 0 },    // rewards health
        heavy: { hit: 480, aps: 0.25, splash: 2.5 }, // rewards many bodies, shields and wards
        sweep: { hit: 70, aps: 1, splash: 5 },      // rewards one big body
      },
      web: { r: 14, slow: 40, dmg: 40 }, // bodies this close are slowed and hit softer
      // the mortar: wind s with nobody in reach before the first shot, then one every `every` s, at the biggest clump
      // (r m). Each shot rips loose one of her nests within ammoReach m (the one with least health): it is gone and its
      // spiders burst out where it hung. hit: the blast's damage; slow / dmg / secs: the web it leaves
      // fly: seconds the ripped nest is in the air: the blast lands where the clump stood when it was thrown, so a squad
      // that walks on is missed (0: it lands at once)
      mortar: { wind: 5, every: 4, hit: 120, ammo: true, ammoReach: 22, r: 6, slow: 60, dmg: 60, secs: 4, fly: 1.6 },
      molt: 6,          // seconds between sheds (0: never)
      bleedPct: false,  // whether a hit's share of max health (bleed at 3-4 stacks, Deadeye) works on her
      size: 4,          // m: how far out her body reaches once she lies on the ground (melee can crowd round her)
      // her bite: her jaws open where her target stands and snap shut biteSecs later. It lands there, on whoever stands
      // in it then (a body that has walked out is missed). biteSecs 0: the older bite, a web shot flying at projSpeed
      // m/s that hits the first body in its way (lob: ...that only lands where it was aimed); both 0: it lands at once
      biteSecs: 0.5, projSpeed: 15, lob: false,
      lastPick: true,   // while she hangs, units pick her only when none of her nests or spiders are left
    },
    biteByRound: ['fast', 'heavy', 'sweep', 'heavy', 'sweep'],
    nest: { hp: 500, rangedOnly: 8, burst: 3, lure: 12 }, // the same health every round: where they hang is the puzzle. lure: m a nest counts closer when units pick whom to walk to and shoot (so they don't chase hatchlings past it)
    engage: true,       // the player's units go for her nests and spiders from the first second, instead of marching up their column until something comes in sight
    spider: { hp: 90 }, // the spiderling: one body of the Spiders unit, lighter
    hatch: [6, 5, 4, 3, 3], // seconds per spider, per nest, by round
    // per round: [col, row] a high nest (ranged only), [col, row, 'low'] one melee reaches too. Rows 0-5 are her zone,
    // 6-9 no man's land; she hangs at col 5.5, row 5 and her reach is about 3.7 tiles. Out on the wings, so an army
    // stacked in the middle can't reach them
    nests: [
      [[2, 6, 'low'], [10, 8]],                           // a low nest in her reach on the left (a melee squad on it holds her), a high one out on the right
      [[0, 7, 'low'], [11, 8], [9, 4]],                   // the low nest far out of her reach; a high one far right; one up in her reach (she can rip it)
      [[9, 6, 'low'], [0, 5], [11, 5]],                   // one in her web; two on the far wings at her zone's edge
      [[1, 8, 'low'], [10, 8, 'low'], [5.5, 2], [11, 5]], // two low ones out of reach, one behind her (she can rip it), one far right
      [[0, 6, 'low'], [8, 7, 'low'], [3, 3], [11, 5]],    // a far low one, a low one in her reach, one up in her reach, one far right
    ],
    treasury: { hp: 400, col: 4, row: 15 },
    // poison pools, by round: [[col0, row0, col1, row1], ...] (tiles, inclusive). pct: % of max health a second, past
    // armor; linger: seconds it keeps working after the body walks out. Her spiders don't mind them; slime units drink them
    pools: { pct: 4, linger: 2, at: [
      [[4, 8, 7, 8]],                                     // the middle lane in front of her
      [[4, 8, 7, 8], [10, 9, 11, 9]],                     // ...and under the right wing's firing spot
      [[4, 7, 7, 8], [0, 8, 1, 8], [10, 8, 11, 8]],       // a wider lane, and both wings' firing spots
      [[4, 8, 7, 8], [2, 9, 3, 9], [8, 9, 9, 9]],
      [[4, 7, 7, 8], [1, 9, 2, 9], [10, 7, 11, 7]],
    ] },
    late: {},           // (prototype only) ways to keep the late rounds from deciding everything: wound, groundMul, climb, income, carryNests
  };

  const byRound = (v, round) => Array.isArray(v) ? v[Math.min(round, v.length) - 1] : v;
  const world = (col, row) => G().tileToWorld(col, row);
  const TILE = () => G().TILE || 6;

  // ---------- her bodies ----------
  function spiderUnit(units, cfg) {
    const sp = units.find((u) => u.name === 'Spiders') || { name: 'Spiders', hp: 185, hit: 20, aps: 0.8, range: 2, speed: 6, splash: 0, shape: 'spider', color: '#5B4636' };
    const { skills, skillDefs, skillsInnate, skillMods, skillOr, skillNeedsAny, skillNeeds, ...s } = sp;
    return E().withTraits({ ...s, name: 'Spiderling', bodies: 1, level: 0, ...(cfg.spider || {}) });
  }
  function mommyUnit(cfg, round) {
    const a = cfg.mommy.bites[byRound(cfg.biteByRound, round)];
    return E().withTraits({ name: 'Mommy', cost: 0, bodies: 1, hp: cfg.mommy.hp, hit: a.hit, aps: a.aps, range: cfg.mommy.near, splash: a.splash, speed: 0, anchored: true, unstoppable: true, shape: 'spider', color: '#1a1a1a', level: 0, boss: 'mommy', drawR: 4.2,
      ...(cfg.mommy.biteSecs > 0 ? { projSpeed: cfg.mommy.projSpeed || 15, projSecs: cfg.mommy.biteSecs, lob: true } : { projSpeed: cfg.mommy.projSpeed || 0, lob: !!cfg.mommy.lob }) });
  }
  function nestUnit(units, cfg, round) {
    return E().withTraits({ name: 'Nest', cost: 0, bodies: 1, hp: byRound(cfg.nest.hp, round), hit: 0, aps: 1, range: 0, speed: 0, splash: 0, structure: true, lesser: true, kind: 'nest', shape: 'circle', color: '#F4F0E6', level: 0,
      rangedOnly: cfg.nest.rangedOnly, ...(cfg.nest.lure > 0 ? { lure: cfg.nest.lure } : {}),
      spawn: { every: byRound(cfg.hatch, round), count: 1, max: 999, waves: 0, unit: spiderUnit(units, cfg) },
      ...(cfg.nest.burst > 0 ? { deathSpawn: { name: 'Spiderling', unit: spiderUnit(units, cfg), count: cfg.nest.burst, strength: 1 } } : {}) });
  }
  const treasuryUnit = (cfg) => E().withTraits({ name: 'Treasury', cost: 0, bodies: 1, hp: cfg.treasury.hp, hit: 0, aps: 1, range: 0, speed: 0, splash: 0, structure: true, lesser: true, kind: 'treasury', shape: 'square', color: '#D9B95B', level: 0 });

  // ---------- a match ----------
  // make m a Mommy match: call right after Game.createMatch (side 0 is the player). Every allowed unit unlocked, the
  // start gold, the free extra deployment, no towers
  function setup(m, cfg = CFG) {
    m.boss = { hp: cfg.mommy.hp, max: cfg.mommy.hp, falls: 0, carry: [], log: [], cap: cfg.maxPerType, banned: cfg.banned.slice(), rounds: cfg.rounds };
    m.packages = [[], []];
    m.towers = [null, null];
    m.units.forEach((u, k) => { if (!cfg.banned.includes(u.name) && !u.building) m.unlocks[0][k] = 1; });
    m.extraDeploys[0] = 1;
    m.gold = [cfg.startGold, 0];
    return m;
  }
  // what the boards draw for this round, while deploying and in the fight: her, the nests and the pools
  function preview(m, cfg = CFG) {
    if (!m || !m.boss) return null;
    const round = m.round, u = m.units || [];
    const spots = byRound(cfg.nests, round).concat((cfg.late || {}).carryNests ? m.boss.carry || [] : []);
    const nu = nestUnit(u, cfg, round);
    return {
      mommy: { u: mommyUnit(cfg, round), ...world(cfg.mommy.col, cfg.mommy.row), reach: cfg.mommy.near },
      nests: spots.map(([c, r, kind]) => ({ u: kind === 'low' ? { ...nu, rangedOnly: 0 } : nu, low: kind === 'low', col: c, row: r, ...world(c, r) })),
      pools: cfg.pools && cfg.pools.pct > 0 && cfg.pools.at ? byRound(cfg.pools.at, round) || [] : [],
      bite: byRound(cfg.biteByRound, round), hp: m.boss.hp, max: m.boss.max, round, rounds: m.boss.rounds,
    };
  }

  // ---------- one fight ----------
  // The fight for m as it stands. o (all optional): cfg; st: her state ({ hp, falls, carry }, else m.boss); record;
  // nests, pools (this round's instead of CFG's); fallen (true, or seconds she lies stunned: she starts on the ground);
  // fallAt (she falls at this time whatever the nests); noHatch, noTreasury, secs; trace (log once a second);
  // name(sq) (a squad's name in the stats). Returns the engine's battle; its step() stops once she is dead, and its
  // result() carries `boss`: what happened (see out below), hpLeft included. Changes nothing on m.
  function battle(m, o = {}) {
    const cfg = o.cfg || CFG, Gm = G(), En = E();
    const st = o.st || m.boss, round = m.round, units = m.units, T = TILE();
    const { g, opts } = Gm.battleSetup(m);
    g.timeCap = o.secs || cfg.fightSecs;
    const A = Gm.bodiesFor(m, 0);
    let tre = null;
    if (!o.noTreasury) { const w = world(cfg.treasury.col, cfg.treasury.row); [tre] = En.buildSquad(treasuryUnit(cfg), 0, w.x, w.y, -150, T, A.length); A.push(tre); }
    const mw = world(cfg.mommy.col, cfg.mommy.row);
    const [mom] = En.buildSquad(mommyUnit(cfg, round), 1, mw.x, mw.y, 0, T, 0);
    mom.hp = st.hp; mom.bossTag = true; mom.noPct = !cfg.mommy.bleedPct;
    mom.dodgeable = !!cfg.mommy.bites[byRound(cfg.biteByRound, round)].dodgeable;
    const late = cfg.late || {};
    const spots = o.nests || byRound(cfg.nests, round).concat(late.carryNests ? st.carry || [] : []);
    const groundMul = (1 + (late.wound || 0) * (st.falls || 0)) * (late.groundMul ? byRound(late.groundMul, round) : 1);
    const climbAfter = late.climb ? byRound(late.climb, round) : 0;
    const nu = o.noHatch ? { ...nestUnit(units, cfg, round), spawn: null, deathSpawn: null } : nestUnit(units, cfg, round);
    const nests = spots.map(([c, r, kind], k) => { const w = world(c, r); return En.buildSquad(kind === 'low' ? { ...nu, rangedOnly: 0 } : nu, 1, w.x, w.y, -20 - k, T, 1 + k)[0]; });
    const B = [mom, ...nests];
    // (prototype) a ranged squad pointed at a nest (sq.focus: the nest's place in this round's list): its bodies walk
    // to that nest and shoot it first, whatever is nearer
    for (const sq of m.armies[0]) if (sq.focus != null && nests[sq.focus]) for (const b of A) if (b.squad === sq.id) b.focus = nests[sq.focus];
    if (cfg.lane != null) g.awareLane = cfg.lane; // (prototype) how strongly a squad keeps to its own lane when it picks whom to walk to
    const out = { round, fallAt: null, mortars: 0, mortarAt: null, mortarNests: 0, held: 0, hang: 0, ground: 0, nestsLeft: 0, nests: nests.length, end: 0, treasury: null, nestDown: nests.map(() => null), holders: {}, gone: {}, poolSecs: 0, hpStart: st.hp };
    const nameOf = o.name || ((sq) => units[sq.unit] ? units[sq.unit].name : '?');
    const sqName = (b) => { const o2 = b.credit || b; const sq = m.armies[0].find((s) => s.id === o2.squad); return sq ? nameOf(sq) : b.u.name; };
    let climbed = false, hanging = !o.fallen, quiet = 0, shots = 0, moltT = cfg.mommy.molt, last = mom.hp;
    const visible = (f) => f.alive && f.side === 0 && !f.u.structure && !f.u.aloft && !f.hidden && !(f.inside && f.inside.alive) && !(f.delay > 0);
    const d2 = (a, x, y) => { const dx = a.x - x, dy = a.y - y; return Math.sqrt(dx * dx + dy * dy); };
    const ground = (u) => ({ ...u, unstoppable: false, ...(cfg.mommy.size > 0 ? { barrier: cfg.mommy.size } : {}) });
    if (!hanging) { mom.takeMul = groundMul; mom.stunT = o.fallen === true ? 1e9 : o.fallen; out.fallAt = 0; mom.u = ground(mom.u); }
    mom.lastPick = hanging && !!cfg.mommy.lastPick; // (from the first tick: nobody aims at her while she hangs and anything else is left)
    mom.bs = { phase: hanging ? 'hanging' : 'down', stunLeft: 0, nestsLeft: spots.length, nests: spots.length, moltIn: cfg.mommy.molt || null, mortarIn: null, holder: null, take: hanging ? cfg.mommy.hang : groundMul, bite: byRound(cfg.biteByRound, round) };
    const poolRects = (o.pools || (cfg.pools && cfg.pools.pct > 0 && cfg.pools.at ? byRound(cfg.pools.at, round) || [] : [])).map(([c0, r0, c1, r1]) => { const a = world(c0, r0), b = world(c1, r1), h = T / 2; return { x0: Math.min(a.x, b.x) - h, x1: Math.max(a.x, b.x) + h, y0: Math.min(a.y, b.y) - h, y1: Math.max(a.y, b.y) + h }; });
    // her attacks for the boards to draw (only in a fight that is shown: o.record): mom.ev, events with their time t
    // (bite: where the jaws are, how wide (r) and when they shut (land); mortar: where it lands, when, and the nest it
    // was (fx, fy); fall; molt), and in mom.bs whom she bites next (aim: target, k 0..1, in: seconds), the nest the
    // mortar will rip (mortarNest) and where it is aiming (mortarAim) before it is thrown
    const fxOn = !!o.record, ev = mom.ev = [];
    const seenShot = new WeakSet(), flying = []; // (her bites already in mom.ev; mortar shots in the air)
    let lastAtk0 = null;
    const mo0 = cfg.mommy.mortar;
    // the nest the mortar rips next: the one within ammoReach with the least health
    const ammoPick = () => { let pick = null; if (mo0.ammo) for (const n of nests) if (n.alive && !(mo0.ammoReach > 0 && d2(n, mw.x, mw.y) > mo0.ammoReach) && (!pick || n.hp < pick.hp)) pick = n; return pick; };
    // the mortar lands at (bx, by): its hit and its web on every body of the player's in the blast
    const blast = (api, bx, by) => {
      for (const f of api.sides[0].slice()) {
        if (!f.alive || f.u.aloft || d2(f, bx, by) > mo0.r) continue;
        api.hurt(mom, f, mo0.hit, mw.x, mw.y);
        if (f.alive && !f.u.structure) { f.web = { slow: mo0.slow, dmg: mo0.dmg, t: mo0.secs, max: 90 }; f.momWeb = true; f.momWebOnly = true; f.mortarWebT = api.t + mo0.secs; if (!f.u.unstoppable) { f.slowMove = Math.max(f.slowT > 0 ? f.slowMove : 0, mo0.slow); f.slowT = Math.max(f.slowT, mo0.secs); } }
      }
    };
    // the player's biggest clump: the body with the most others within the mortar's blast (the mortar's target)
    const clump = (army) => { let best = null, bn = 0; for (const f of army) { if (!visible(f)) continue; let n = 0; for (const h of army) if (visible(h) && d2(h, f.x, f.y) <= cfg.mommy.mortar.r) n++; if (n > bn) { bn = n; best = f; } } return best; };
    const bossTick = (api) => {
      if (!mom.alive) return;
      nests.forEach((n, k) => { if (!n.alive && out.nestDown[k] == null) out.nestDown[k] = api.t; });
      for (const f of api.all) if (f.side === 0 && !f.alive && f.diedAt == null) f.diedAt = api.t;
      if (cfg.engage) for (const f of api.sides[0]) if (f.alive && !f.engaged && !f.u.structure) f.engaged = true; // no blind marching up the column
      if (o.trace && api.t + 1e-9 >= (out.traceT || 0)) { // once a second: where each squad's first live body is and what it is after
        out.traceT = (out.traceT || 0) + 1;
        const seen = new Set(), line = [];
        for (const f of api.all) { if (f.side !== 0 || !f.alive || f.u.structure || seen.has(f.squad)) continue; seen.add(f.squad); const sq = m.armies[0].find((q) => q.id === f.squad); if (!sq) continue; const nm = f.near ? (f.near === mom ? 'MOM' : f.near.u.kind === 'nest' ? 'nest' + (nests.indexOf(f.near)) : f.near.u.name.slice(0, 5)) : '-'; line.push(`${nameOf(sq).slice(0, 8)}@${(f.x / T + 5.5).toFixed(1)},${(7.5 - f.y / T).toFixed(1)}>${nm}`); }
        console.log(`  t${api.t.toFixed(0).padStart(3)} ` + line.join('  ') + `  | nests ${nests.map((n) => n.alive ? Math.round(n.hp) : 'x').join(',')} mom ${Math.round(mom.hp)}`);
      }
      out[hanging ? 'hang' : 'ground'] += last - mom.hp; last = mom.hp;
      if (!hanging && climbAfter > 0 && out.fallAt != null && api.t >= out.fallAt + climbAfter) { hanging = true; climbed = true; mom.u = { ...mom.u, unstoppable: true, barrier: 0 }; out.climbAt = api.t; }
      if (hanging && !climbed && (o.fallAt != null ? api.t >= o.fallAt : !nests.some((n) => n.alive))) { // the last nest is down: she falls
        hanging = false; out.fallAt = api.t; mom.takeMul = groundMul; mom.stunT = Math.max(mom.stunT, cfg.mommy.stun);
        if (fxOn) ev.push({ k: 'fall', t: api.t });
        mom.u = ground(mom.u); mom.fallen = true;
        for (const b of api.sides[1]) if (b.alive && b !== mom && !b.u.structure) b.stunT = Math.max(b.stunT, cfg.mommy.stun); // her spiders are stunned with her
      }
      mom.x = mw.x; mom.y = mw.y;
      if (hanging) { mom.takeMul = cfg.mommy.hang; mom.stunT = 0; mom.frozenT = 0; }
      mom.lastPick = hanging && !!cfg.mommy.lastPick;
      if (cfg.mommy.molt > 0) { moltT -= api.dt; if (moltT <= 0) { moltT += cfg.mommy.molt;
        if (fxOn && ((mom.poison && mom.poison.length) || mom.bleed || mom.burn || mom.frost || mom.slowT > 0)) ev.push({ k: 'molt', t: api.t }); // (only when something falls off her)
        mom.poison = null; mom.bleed = null; mom.burn = null; mom.frost = null; mom.web = null; mom.slowT = 0; mom.slowMove = 0; mom.slowAtk = 0; mom.shrinkT = 0; mom.shrinkM = 0; } }
      const stunned = mom.stunT > 0;
      if (poolRects.length) for (const f of api.sides[0]) { // the poison pools
        if (!f.alive || f.u.structure || f.u.aloft || !poolRects.some((q) => f.x >= q.x0 && f.x <= q.x1 && f.y >= q.y0 && f.y <= q.y1)) continue;
        out.poolSecs += api.dt;
        const pp = f.poison && f.poison.find((x) => x.pool);
        if (pp) pp.t = cfg.pools.linger; else (f.poison || (f.poison = [])).push({ src: null, dps: f.u.hp * cfg.pools.pct / 100, t: cfg.pools.linger, pool: true });
      }
      const wb = cfg.mommy.web; // her web: close to her, slower and softer (not while she lies stunned)
      for (const f of api.sides[0]) {
        if (!f.alive || f.u.structure) continue;
        if (!stunned && wb.r > 0 && d2(f, mw.x, mw.y) <= wb.r) {
          f.momWeb = true; f.web = { slow: Math.max(wb.slow, f.web && !f.momWebOnly ? f.web.slow : 0), dmg: Math.max(wb.dmg, f.web && !f.momWebOnly ? f.web.dmg : 0), t: 1, max: 90 }; f.momWebOnly = true;
          if (!f.u.unstoppable) { if (!(f.slowT > 0)) { f.slowMove = 0; f.slowAtk = 0; } f.slowMove = Math.max(f.slowMove, wb.slow); f.slowT = Math.max(f.slowT, api.dt * 1.5); }
        } else if (f.momWeb && !(f.mortarWebT > api.t)) { f.momWeb = false; f.momWebOnly = false; f.web = null; }
      }
      // her state, for the boss bar and the boards (mom.bs): her phase, the mortar's count, who holds her, the next molt
      const mo = cfg.mommy.mortar;
      const bs = mom.bs = { phase: hanging ? 'hanging' : stunned ? 'stunned' : 'down', stunLeft: stunned ? mom.stunT : 0, nestsLeft: nests.filter((n) => n.alive).length, nests: nests.length,
        moltIn: cfg.mommy.molt > 0 ? moltT : null, mortarIn: null, holder: null, take: hanging ? cfg.mommy.hang : groundMul, bite: byRound(cfg.biteByRound, round) };
      for (let k = 0; k < flying.length;) { if (api.t + 1e-9 >= flying[k].land) { const s = flying.splice(k, 1)[0]; blast(api, s.x, s.y); } else k++; } // a thrown nest lands
      if (fxOn) { // her bite: each one on its way (seen the tick after it starts), and whom she bites next
        for (const p of api.projectiles || []) if (p.owner === mom && !seenShot.has(p)) { seenShot.add(p); ev.push({ k: 'bite', t: api.t - api.dt, x: p.tx, y: p.ty, land: api.t + p.left / Math.max(0.5, p.speed || mom.u.projSpeed || 1), r: mom.u.splash || 1, bite: bs.bite }); }
        if (!(mom.u.projSpeed > 0) && mom.lastAtk != null && mom.lastAtk !== lastAtk0) { lastAtk0 = mom.lastAtk; const tg = mom.lock; if (tg) ev.push({ k: 'bite', t: mom.lastAtk, x: tg.x, y: tg.y, land: mom.lastAtk, r: mom.u.splash || 1, bite: bs.bite }); } // (a bite that lands at once)
        let tg = null, td = mom.u.range + (mom.fallen ? cfg.mommy.size : 0); // who she bites next: the nearest body in her reach
        for (const f of api.sides[0]) if (f.alive && !f.u.aloft && !f.hidden && !(f.inside && f.inside.alive)) { const d = d2(f, mw.x, mw.y); if (d <= td) { td = d; tg = f; } }
        if (!stunned && tg) { const cyc = 1 / Math.max(0.05, mom.u.aps), k = Math.min(1, (api.t - (mom.lastAtk == null ? -cyc * 0.5 : mom.lastAtk)) / cyc); bs.aim = { x: tg.x, y: tg.y, k, in: cyc * (1 - k), cyc, r: mom.u.splash || 1 }; }
        if (ev.length > 60) ev.splice(0, ev.length - 60);
      }
      // attention: nobody close while she hangs, and the mortar winds up
      if (!hanging || stunned) { quiet = 0; shots = 0; return; }
      let holder = null, hd = cfg.mommy.near;
      for (const f of api.sides[0]) if (visible(f)) { const d = d2(f, mw.x, mw.y); if (d <= hd) { hd = d; holder = f; } }
      if (holder) { quiet = 0; shots = 0; out.held += api.dt; const hn = sqName(holder); out.holders[hn] = (out.holders[hn] || 0) + api.dt; bs.holder = hn; return; }
      quiet += api.dt;
      if (mo.hit > 0) bs.mortarIn = Math.max(0, mo.wind + shots * mo.every - quiet);
      if (fxOn && bs.mortarIn != null) { // which nest she is about to rip loose, and (just before) the clump she aims it at
        const n = ammoPick(); if (n) bs.mortarNest = { x: n.x, y: n.y };
        if (bs.mortarIn < 2) { const c = clump(api.sides[0]); if (c) bs.mortarAim = { x: c.x, y: c.y, r: mo.r }; }
      }
      if (!(mo.hit > 0) || quiet + 1e-9 < mo.wind + shots * mo.every) return;
      bs.mortarFired = api.t;
      shots++;
      const best = clump(api.sides[0]);
      if (!best) return;
      out.mortars++; if (out.mortarAt == null) out.mortarAt = api.t;
      const bx = best.x, by = best.y, fly = mo.fly > 0 ? mo.fly : 0;
      if (!fly) blast(api, bx, by);
      const pick = ammoPick(), px = pick ? pick.x : mw.x, py = pick ? pick.y : mw.y; // the nest she throws: gone now, its spiders burst out where it hung
      if (pick) { api.hurt(mom, pick, 1e9, mw.x, mw.y); if (!pick.alive) { out.mortarNests++; out.nestDown[nests.indexOf(pick)] = -api.t; } }
      if (fly) flying.push({ land: api.t + fly, x: bx, y: by }); // it lands there after its flight, on whoever stands there then
      if (fxOn) ev.push({ k: 'mortar', t: api.t, land: api.t + fly, x: bx, y: by, r: mo.r, fx: px, fy: py, nest: !!pick, secs: mo.secs });
    };
    const sim = En.createBattle(A, B, g, { ...opts, bossTick, toTimer: true, record: !!o.record });
    // it ends when she dies; result() carries what happened
    const step0 = sim.step;
    sim.step = function () { return mom.alive && step0.apply(sim, arguments); };
    if (sim.isOver) { const over0 = sim.isOver; sim.isOver = function () { return !mom.alive || over0.apply(sim, arguments); }; }
    let done = null;
    const finish = () => {
      if (done) return done;
      for (const sq of m.armies[0]) { const bs = sim.bodies.filter((b) => b.side === 0 && b.squad === sq.id && !b.u.structure); if (bs.length) out.gone[nameOf(sq)] = bs.some((b) => b.alive) ? null : Math.max(...bs.map((b) => b.diedAt || 0)); }
      out[hanging ? 'hang' : 'ground'] += last - Math.max(0, mom.hp); last = Math.max(0, mom.hp);
      out.dead = !mom.alive; out.nestsLeft = nests.filter((n) => n.alive).length;
      out.treasury = tre ? tre.alive : null;
      out.left = sim.bodies.filter((b) => b.side === 0 && b.alive && !b.u.structure).length;
      out.spiders = sim.bodies.filter((b) => b.side === 1 && b.alive && b !== mom && !b.u.structure).length;
      out.by = {};
      for (const b of sim.bodies) { if (b.side !== 0 || !(b.bossDealt > 0)) continue; const n = sqName(b); out.by[n] = (out.by[n] || 0) + b.bossDealt; }
      out.hpLeft = Math.max(0, mom.hp);
      out.carry = nests.map((n, k) => n.alive ? spots[k] : null).filter(Boolean);
      return (done = out);
    };
    const result0 = sim.result;
    sim.result = function () { const r = result0.apply(sim, arguments); const b = finish(); b.end = r.time; return { ...r, ...(mom.alive ? {} : { winner: 0 }), boss: b }; };
    sim.boss = { mom, nests, out };
    return sim;
  }

  // After Game.resolve has paid out the fight (experience, income, the treasury): her state carries on, the player's
  // health stays full (there is none in this puzzle), the free extra deployment comes back, and the match ends when she
  // is dead or the last round is over. Returns the round's report (also in m.boss.log).
  function afterFight(m, res, summary) {
    const b = res && res.boss; if (!m.boss || !b) return null;
    const cfg = CFG;
    m.boss.hp = b.hpLeft;
    if (b.fallAt != null) m.boss.falls = (m.boss.falls || 0) + 1;
    m.boss.carry = b.carry || [];
    const rep = { round: b.round, fallAt: b.fallAt, window: b.fallAt != null ? Math.max(0, b.end - b.fallAt) : 0, mortars: b.mortars, mortarNests: b.mortarNests, nests: b.nests, nestsLeft: b.nestsLeft,
      dmg: Math.round(b.hang + b.ground), hang: Math.round(b.hang), ground: Math.round(b.ground), hpLeft: Math.round(b.hpLeft), dead: !!b.dead, end: b.end, treasury: b.treasury, left: b.left, spiders: b.spiders,
      by: Object.entries(b.by || {}).sort((x, y) => y[1] - x[1]).map(([n, d]) => [n, Math.round(d)]) };
    m.boss.log.push(rep);
    m.hp = [100, 100];
    m.extraDeploys[0] = 1;
    const last = b.round >= (m.boss.rounds || cfg.rounds);
    m.over = !!b.dead || last; m.winner = b.dead ? 0 : last ? 1 : -1;
    if (summary) { summary.boss = rep; summary.winner = b.dead ? 0 : -1; summary.timeout = !b.dead; }
    return rep;
  }

  const api = { CFG, setup, preview, battle, afterFight, byRound, spiderUnit, mommyUnit, nestUnit, treasuryUnit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Boss = api;
})(typeof window !== 'undefined' ? window : globalThis);
