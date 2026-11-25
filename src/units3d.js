// ===== src/units3d.js: the animated unit models (Settings: Unit models: New, or ?models=new in the address) =====
// GENERATED, do not edit by hand: made by scripts/make_game_units.py of the ShapeLanguageStyle model kit from its
// battlefield preview driver (battlefield_anim.js), dust_puff.js and proj_fx.js. Change those and generate again.
//
// What it does: each unit named in UNITS below is drawn as its own animated model (models/units/<file>.glb) in place
// of the game's code-built one: Idle, Walk at the speed the body really moves, Attack on each strike, a Death clip
// where it falls, and it turns to face the enemy it attacks. Looks only: the engine and the rules are not touched,
// nothing is sent between players. NOT in this version yet: the models' own projectiles, hit effects, burn / bleed /
// poison looks and dashes (the game's own are drawn as before).
//
//   const units = Units3D(THREE, GLTFLoader, SkeletonUtils, host);
//   host: { base: 'models/units/', v: '<cache tag>', speed: () => the fight's speed now (1 outside a fight),
//           wake: () => draw the board again (a model has arrived) }
//   units.begin(bt)  render3d, before it places the bodies: the battle on the board, or null
//   units.body(d)    render3d, for each body it is about to draw: true = drawn here (render3d hides its own)
//   units.frame(scene, dt, camera)   render3d, once a frame after the bodies are placed
//   units.aimSeen(s) the page, for each shot the engine records (what a body really shot at: it faces that)
//   units.busy()     true while a fallen model is still playing its death (the board keeps drawing meanwhile)
//   units.dispose()  the board is going away: its models leave the scene
function Units3D(THREE, GLTFLoader, SkeletonUtils, host) {
  const UNITS = {
 "Water Mage": {
  "file": "aquamancer",
  "kind": "wizard:water",
  "name": "Water Mage",
  "walk": 0.0,
  "refH": null,
  "launch": 0.4,
  "deathFx": null
 },
 "Assassin": {
  "file": "assassin",
  "kind": "assassin",
  "name": "Assassin",
  "walk": 2.947,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Brute": {
  "file": "brute",
  "kind": "brute",
  "name": "Brute",
  "walk": 1.926,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Catcher": {
  "file": "catcher",
  "kind": "catcher",
  "name": "Catcher",
  "walk": 0.733,
  "refH": null,
  "launch": 0.5,
  "deathFx": null
 },
 "Earth Wizard": {
  "file": "earthwizard",
  "kind": "wizard:earth",
  "name": "Earth Wizard",
  "walk": 0.0,
  "refH": null,
  "launch": 0.6,
  "deathFx": null
 },
 "Ember Imps": {
  "file": "emberimp",
  "kind": "flier",
  "name": "Ember Imps",
  "walk": 2.857,
  "refH": null,
  "launch": 0.43,
  "deathFx": {
   "puff": {
    "at": 0.17,
    "y": 0.75,
    "size": 1.0,
    "count": 36,
    "colors": [
     "#E8823A",
     "#F6A866",
     "#C9641F",
     "#E8823A",
     "#B8531F",
     "#F0954A",
     "#7A3A1C"
    ]
   }
  }
 },
 "Ent": {
  "file": "ent",
  "kind": "ent",
  "name": "Ent",
  "walk": 0.8,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Ether Golem": {
  "file": "ethergolem",
  "kind": "golem",
  "name": "Ether Golem",
  "walk": 0.96,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Fire Mage": {
  "file": "firemage",
  "kind": "wizard:fire",
  "name": "Fire Mage",
  "walk": 0.0,
  "refH": null,
  "launch": 0.3,
  "deathFx": null
 },
 "Flame Wizard": {
  "file": "flamewizard",
  "kind": "wizard:flame",
  "name": "Flame Wizard",
  "walk": 0.0,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Frost Wizard": {
  "file": "frostwizard",
  "kind": "wizard:frost",
  "name": "Frost Wizard",
  "walk": 0.0,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Goblin Swarm": {
  "file": "goblin",
  "kind": "goblin",
  "name": "Goblin Swarm",
  "walk": 2.895,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Just a horse": {
  "file": "horse",
  "kind": "horse",
  "name": "Just a horse",
  "walk": 2.262,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Leaf Wizard": {
  "file": "leafwizard",
  "kind": "wizard:leaf",
  "name": "Leaf Wizard",
  "walk": 0.0,
  "refH": 2.4691,
  "launch": 0.33,
  "deathFx": null
 },
 "War Mammoth": {
  "file": "mammoth",
  "kind": "mammoth",
  "name": "War Mammoth",
  "walk": 1.636,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Meteor Caller": {
  "file": "meteorcaller",
  "kind": "meteor",
  "name": "Meteor Caller",
  "walk": 0.0,
  "refH": null,
  "launch": 0.3,
  "deathFx": null
 },
 "Necromancer": {
  "file": "necromancer",
  "kind": "necro",
  "name": "Necromancer",
  "walk": 0.0,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Obelisk": {
  "file": "obelisk",
  "kind": "obelisk",
  "name": "Obelisk",
  "walk": 2.6,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Rogue": {
  "file": "rogue",
  "kind": "rogue",
  "name": "Rogue",
  "walk": 2.444,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Shiv": {
  "file": "shiv",
  "kind": "shiv",
  "name": "Shiv",
  "walk": 1.429,
  "refH": null,
  "launch": 0.27,
  "deathFx": null
 },
 "Skeleton Archers": {
  "file": "skeletonarcher",
  "kind": "skeleton",
  "name": "Skeleton Archers",
  "walk": 1.091,
  "refH": null,
  "launch": 0.65,
  "deathFx": null
 },
 "Sniper": {
  "file": "sniper",
  "kind": "sniper",
  "name": "Sniper",
  "walk": 1.145,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Spiders": {
  "file": "spider",
  "kind": "spider",
  "name": "Spiders",
  "walk": 3.3,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Steel Wizard": {
  "file": "steelwizard",
  "kind": "wizard:steel",
  "name": "Steel Wizard",
  "walk": 0.75,
  "refH": null,
  "launch": 0.37,
  "deathFx": null
 },
 "Sun Priest": {
  "file": "sunpriest",
  "kind": "sunPriest",
  "name": "Sun Priest",
  "walk": 0.0,
  "refH": null,
  "launch": null,
  "deathFx": null
 },
 "Truespear": {
  "file": "truespear",
  "kind": "spear",
  "name": "Truespear",
  "walk": 0.877,
  "refH": null,
  "launch": 0.4,
  "deathFx": null
 },
 "Warper": {
  "file": "warper",
  "kind": "warper",
  "name": "Warper",
  "walk": 0.0,
  "refH": null,
  "launch": 0.4,
  "deathFx": null
 },
 "Wisps": {
  "file": "wisp",
  "kind": "wisp",
  "name": "Wisps",
  "walk": 0.0,
  "refH": null,
  "launch": 0.36,
  "deathFx": null
 }
};

// ===== [death fx] a dust-cloud "poof" (2026-11-23; the Ember Imp's death: "an orange dust cloud, like Nightcrawler
// teleporting"; seven solid blobs read as "just 4 balls"). Many small faceted puffs of mixed sizes, dense in the middle,
// each drifting out and up, swelling, then fading out (see-through). Shaded in the style's three tiers from a fixed light,
// so it needs no scene lights. Shared by preview/model.template.html and the battlefield pages (make_preview.py,
// make_battlefield.py inject it); which units have it, and when, is scripts/death_fx.json.
//   const puffs = createDustPuffs(THREE); puffs.spawn(scene, position, size, cfg); puffs.update(dt) each frame
function createDustPuffs(THREE) {
  const LIGHT = new THREE.Vector3(0.8, 0.5, 0.35).normalize();   // (as the live facet shader's paint light)
  const WHITE = new THREE.Color(1, 1, 1);
  const geos = new Map();
  function geoFor(hex) {   // a 20-face puff, its faces coloured dark / mid / lit by how they face the light
    if (geos.has(hex)) return geos.get(hex);
    const g = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
    const pos = g.getAttribute('position'), cols = [];
    const base = new THREE.Color(hex), dark = base.clone().multiplyScalar(0.72), lit = base.clone().lerp(WHITE, 0.28);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize(), d = n.dot(LIGHT);
      const t = d > 0.55 ? lit : d > 0.05 ? base : dark;
      for (let k = 0; k < 3; k++) cols.push(t.r, t.g, t.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geos.set(hex, g);
    return g;
  }
  const live = [];
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  return {
    // a burst at `pos` (world), `size` = world units per model unit; cfg: { colors, count }
    spawn(scene, pos, size, cfg) {
      const n = cfg.count || 32;
      for (let i = 0; i < n; i++) {
        const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false });
        const m = new THREE.Mesh(geoFor(cfg.colors[i % cfg.colors.length]), mat);
        const dir = new THREE.Vector3(rand(-1, 1), rand(-0.35, 1), rand(-1, 1)).normalize();
        const rr = Math.pow(Math.random(), 1.6) * 0.32 * size;            // dense in the middle
        m.position.copy(pos).addScaledVector(dir, rr);
        m.rotation.set(rand(0, 6.3), rand(0, 6.3), rand(0, 6.3));
        m.scale.setScalar(0.001);
        m.userData = { r: rand(0.07, 0.21) * size * (1 - 0.35 * rr / (0.32 * size)), age: -rand(0, 0.05), life: rand(0.55, 1.05),
                       v: dir.multiplyScalar(rand(0.5, 1.5) * size).add(new THREE.Vector3(0, rand(0.15, 0.55) * size, 0)),
                       spin: new THREE.Vector3(rand(-3, 3), rand(-3, 3), rand(-3, 3)) };
        scene.add(m);
        live.push(m);
      }
    },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const m = live[i], u = m.userData;
        u.age += dt;
        if (u.age < 0) continue;
        const t = u.age / u.life;
        if (t >= 1) { if (m.parent) m.parent.remove(m); m.material.dispose(); live.splice(i, 1); continue; }
        u.v.multiplyScalar(Math.exp(-3.2 * dt));                            // the burst slows (air drag)
        m.position.addScaledVector(u.v, dt);
        m.rotation.x += u.spin.x * dt; m.rotation.y += u.spin.y * dt; m.rotation.z += u.spin.z * dt;
        const grow = 1 - Math.pow(1 - Math.min(1, t / 0.18), 3);           // puffs out fast, then keeps swelling a little
        m.scale.setScalar(u.r * (0.35 + 0.65 * grow) * (1 + 0.55 * t));
        m.material.opacity = t < 0.35 ? 1 : Math.max(0, 1 - (t - 0.35) / 0.65);
      }
    },
    count: () => live.length,
  };
}

// ===== [projectile fx] small faceted particles shed by a projectile in flight (2026-11-24; the user: "fire particles on
// the bullet", "some green particles", "a lot of faded particle/effect to cover it"), and its SPLASH where it lands (the
// user: "make effects/animation for fire splash"). Everything is a faceted shape shaded in the style's three tiers.
// Drawn by the battlefield pages (make_battlefield.py injects this in front of battlefield_anim.js); what each unit
// sheds and how it lands is its `trail` / `splash` in scripts/projectile_fx.json.
//   const fx = createProjFx(THREE); fx.emit(scene, a, b, k, cfg, state); fx.splash(scene, pos, R, cfg); fx.update(dt)
//
// The splash, v2 (the user on v1's crown of cones: "looks too much like spikes ... research how fire could look and work
// in similar games"). What the research said (stylised explosion breakdowns: Quirkbit's Adrift Arena devlog, 80.lv's
// Zelda-style combat VFX, the usual flash / fireball / smoke / shockwave / sparks anatomy):
//   - fire is ROUND: expanding blobs (even-faceted spheres), never straight-sided cones;
//   - it expands with an ease-out (fast, then slowing) and hands over to smoke: the same blob cools along a colour-
//     temperature ramp (near-white, yellow, orange, red, dark smoke) while it RISES and SHRINKS AWAY (not a soft fade);
//   - a very short pale flash first (~0.1-0.2 s); sparks fast and short-lived; a ground ring kept softer than the middle;
//   - flames on the ground are teardrops, hot (yellow) at the base and red at the tip, licking UP, swaying, rising off.
// The old crown of cones is in build/proj_bak/proj_fx_v1_spike_crown.js.bak.
function createProjFx(THREE) {
  const LIGHT = new THREE.Vector3(0.8, 0.5, 0.35).normalize();   // (as the live facet shader's paint light)
  const WHITE = new THREE.Color(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
  const geos = new Map();
  // a faceted shape, its faces in the three tiers by how they face the light. hex: baked colour; null: grey tiers only
  // (the mesh is then tinted through its material, so its colour can change as it cools); 'flame' is baked hot at the
  // base and red at the tip
  function geoFor(hex, shape) {
    const key = hex + shape;
    if (geos.has(key)) return geos.get(key);
    let g0;
    if (shape === 'tetra') g0 = new THREE.TetrahedronGeometry(1, 0);
    else if (shape === 'puff') g0 = new THREE.IcosahedronGeometry(1, 0);
    else if (shape === 'blob') g0 = new THREE.IcosahedronGeometry(1, 1);          // rounder: 80 faces
    else if (shape === 'leaf') { g0 = new THREE.OctahedronGeometry(1, 0); g0.scale(0.46, 1, 0.09); }   // a flat pointed fleck
    else if (shape === 'sliver') { g0 = new THREE.OctahedronGeometry(1, 0); g0.scale(0.3, 1.25, 0.3); }   // a thin shard, long along y
    else if (shape === 'streak') {   // a long shard, widest near its head (+y) and drawn out to a point behind (a dash's streak)
      g0 = new THREE.OctahedronGeometry(1, 0);
      const p = g0.getAttribute('position');
      for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i)) < 1e-6) p.setY(i, 0.6);
      g0.scale(0.3, 1.25, 0.3);
    }
    else if (shape === 'flame') {   // a teardrop standing on the ground: round belly, the tip curling over
      g0 = new THREE.LatheGeometry([[0, 0], [0.42, 0.08], [0.58, 0.34], [0.50, 0.64], [0.30, 0.94], [0.12, 1.22], [0, 1.45]]
        .map(p => new THREE.Vector2(p[0], p[1])), 6);
      const p = g0.getAttribute('position');
      for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + 0.16 * Math.pow(p.getY(i) / 1.45, 2.2));   // the curl
    } else g0 = new THREE.OctahedronGeometry(1, 0);
    const g = g0.toNonIndexed();
    const pos = g.getAttribute('position'), cols = [];
    const base = hex ? new THREE.Color(hex) : new THREE.Color(0.9, 0.9, 0.9);
    const hot = new THREE.Color('#FFE08A'), mid = new THREE.Color('#F58A2C'), tip = new THREE.Color('#D2401C');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), col = new THREE.Color();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      const d = b.clone().sub(a).cross(c.clone().sub(a)).normalize().dot(LIGHT);
      if (shape === 'flame') { const h = (a.y + b.y + c.y) / 3 / 1.45; col.copy(h < 0.42 ? hot.clone().lerp(mid, h / 0.42) : mid.clone().lerp(tip, (h - 0.42) / 0.58)); }
      else col.copy(base);
      const lit = d > 0.55, dark = d <= 0.05;
      if (shape === 'flame') { if (lit) col.lerp(WHITE, 0.18); else if (dark) col.multiplyScalar(0.84); }
      else if (hex) { if (lit) col.lerp(WHITE, 0.25); else if (dark) col.multiplyScalar(0.78); }
      else col.setScalar(lit ? 1 : dark ? 0.62 : 0.82);   // grey tiers: the material's colour does the rest
      for (let k = 0; k < 3; k++) cols.push(col.r, col.g, col.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geos.set(key, g);
    return g;
  }
  let ringGeo = null, discGeo = null;
  const live = [], bursts = [], _v = new THREE.Vector3();
  function holdBack(m) {   // keep a landed shot's bit (userData.ref: where it stopped, the way it flew) short of that line
    const u = m.userData; if (!(u.ref && u.ref.d)) return;
    const over = _v.copy(m.position).sub(u.ref.p).dot(u.ref.d) + m.scale.x;
    if (over > 0) { m.position.addScaledVector(u.ref.d, -over); const f = u.v.dot(u.ref.d); if (f > 0) u.v.addScaledVector(u.ref.d, -f); }
  }
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const mesh = (hex, shape, op) => new THREE.Mesh(geoFor(hex, shape),
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: op == null ? 1 : op, depthWrite: false }));
  const ramps = new Map();
  function rampAt(stops, t, out) {   // stops: hex colours spread evenly over 0..1
    let cs = ramps.get(stops); if (!cs) { cs = stops.map(h => new THREE.Color(h)); ramps.set(stops, cs); }
    const x = Math.min(0.9999, Math.max(0, t)) * (cs.length - 1), i = Math.floor(x);
    return out.copy(cs[i]).lerp(cs[i + 1], x - i);
  }
  function particle(scene, pos, v, cfg, k) {
    // (cfg.ramp: grey tiers tinted through the material, so its colour can run along the ramp as it ages: a flame puff)
    const m = mesh(cfg.ramp ? null : pick(cfg.colors), cfg.shape || 'octa', cfg.opacity || 1);
    if (cfg.ramp) rampAt(cfg.ramp, 0, m.material.color);
    m.position.copy(pos);
    const along = (cfg.shape === 'sliver') && v.lengthSq() > 1e-8;   // a shard points the way it flies, and doesn't tumble
    if (along) m.quaternion.setFromUnitVectors(UP, v.clone().normalize()); else m.rotation.set(rand(0, 6.3), rand(0, 6.3), rand(0, 6.3));
    m.userData = { r: rand(cfg.size[0], cfg.size[1]) * k, age: 0, life: rand(cfg.life[0], cfg.life[1]), op: cfg.opacity || 1,
                   grow: cfg.grow || 0, g: (cfg.gravity || 0) * k, v, ramp: cfg.ramp || null, drag: cfg.drag == null ? 2.5 : cfg.drag,
                   spin: along ? new THREE.Vector3() : new THREE.Vector3(rand(-5, 5), rand(-5, 5), rand(-5, 5)) };
    m.scale.setScalar(m.userData.r);
    scene.add(m);
    live.push(m);
    return m;
  }
  return {
    particle, mesh,   // (for scripts/status_fx.js: one bit; one faceted shape)
    // shed along the stretch a -> b the projectile just flew (world); k = world units per model unit;
    // cfg: { colors, shape, per_m, size: [lo, hi], life: [lo, hi], spread, drift, rise, opacity, back }
    // state: any object kept per projectile (carries the fraction of a particle left over between frames)
    emit(scene, a, b, k, cfg, state) {
      const d = a.distanceTo(b);
      state.acc = (state.acc || 0) + d * (cfg.per_m || 2) / k;
      const dir = b.clone().sub(a); if (d > 1e-6) dir.multiplyScalar(1 / d);
      while (state.acc >= 1) {
        state.acc -= 1;
        const sp = (cfg.spread || 0.1) * k, dr = (cfg.drift || 0.3) * k;
        const pos = new THREE.Vector3().lerpVectors(a, b, Math.random()).add(new THREE.Vector3(rand(-sp, sp), rand(-sp, sp), rand(-sp, sp)));
        const v = new THREE.Vector3(rand(-dr, dr), rand(-dr, dr) + (cfg.rise || 0) * k, rand(-dr, dr)).addScaledVector(dir, (cfg.back || 0) * k);
        if (cfg.follow && state.vel) v.addScaledVector(state.vel, cfg.follow);   // (a haze that keeps pace with the shot for a moment)
        const pm = particle(scene, pos, v, cfg, k);
        // (the user, 2026-11-25, on the Wisp: "it shoots through the enemy units": the haze kept flying on after the
        // bolt had hit. A haze that follows its shot stops where the shot stops: state.dead, set by the page)
        if (cfg.follow) pm.userData.src = state;
      }
    },
    // the splash where a shot lands: `pos` on the ground (world), R = its radius (world). cfg (projectile_fx.json), all
    // sizes as shares of R, times in s:
    //   flash: { color, r, life }                    a pale burst at the middle, gone in a blink
    //   ring: { color, life, opacity }               a soft ring over the ground running out to R
    //   scorch: { color, life, opacity, r }          a dark burn mark that lingers and fades
    //   blobs: [{ count, ramp, r: [lo, hi], out: [lo, hi], up: [lo, hi], rise, life: [lo, hi], delay }]
    //          fire puffs: burst out (out = how far along the ground, up = how far up), swell, cool along `ramp`,
    //          rise and shrink away
    //   flames: { count, area, h: [lo, hi], life: [lo, hi], delay }   teardrop flames on the ground, licking up
    //   embers: { count, colors, shape, size, life, speed: [lo, hi], up: [lo, hi], gravity } (world units)
    splash(scene, pos, R, cfg) {
      const S = { t: 0, parts: [] };
      const add = (m, p) => { m.scale.setScalar(0.0001); scene.add(m); S.parts.push(Object.assign(p, { m })); };
      if (cfg.scorch) {
        discGeo = discGeo || new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: cfg.scorch.color, transparent: true, opacity: 0, depthWrite: false }));
        m.position.copy(pos); m.position.y += 0.03; m.rotation.y = rand(0, 6);
        add(m, { kind: 'scorch', r: (cfg.scorch.r || 0.8) * R, op: cfg.scorch.opacity || 0.4, delay: 0, life: cfg.scorch.life || 1.6 });
      }
      if (cfg.ring) {
        ringGeo = ringGeo || new THREE.RingGeometry(0.80, 1, 16).rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: cfg.ring.color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        m.position.copy(pos); m.position.y += 0.06;
        add(m, { kind: 'ring', r: R, op: cfg.ring.opacity || 0.5, delay: 0, life: cfg.ring.life || 0.45 });
      }
      if (cfg.flash) {
        const m = mesh(cfg.flash.color, 'puff', 1);
        m.position.copy(pos); m.position.y += 0.14 * R; m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
        add(m, { kind: 'flash', r: (cfg.flash.r || 0.3) * R, delay: 0, life: cfg.flash.life || 0.16 });
      }
      for (const b of cfg.blobs || []) for (let i = 0; i < b.count; i++) {
        const a = (i + rand(-0.3, 0.3)) * 6.283 / b.count + rand(0, 0.4);
        const m = mesh(null, 'blob', 1);
        m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
        add(m, { kind: 'blob', ramp: b.ramp, c: pos.clone(), dx: Math.cos(a), dz: Math.sin(a), out: rand(b.out[0], b.out[1]) * R, up: rand(b.up[0], b.up[1]) * R,
                 rise: (b.rise || 0) * R * rand(0.7, 1.3), r: rand(b.r[0], b.r[1]) * R, delay: rand(0, b.delay || 0), life: rand(b.life[0], b.life[1]),
                 spin: new THREE.Vector3(rand(-1.5, 1.5), rand(-1.5, 1.5), rand(-1.5, 1.5)) });
      }
      const f = cfg.flames;
      if (f) for (let i = 0; i < f.count; i++) {
        const a = rand(0, 6.283), rr = Math.sqrt(Math.random()) * (f.area || 0.8) * R;
        const m = mesh(null, 'flame', 1);
        m.position.set(pos.x + Math.cos(a) * rr, pos.y, pos.z + Math.sin(a) * rr);
        add(m, { kind: 'flame', y0: pos.y, yaw: rand(0, 6.283), h: rand(f.h[0], f.h[1]) * R / 1.45, ph: rand(0, 6.283), w1: rand(9, 14), w2: rand(5, 8),
                 delay: rand(0, f.delay || 0), life: rand(f.life[0], f.life[1]) });
      }
      const e = cfg.embers;
      if (e) for (let i = 0; i < (e.count || 20); i++) {
        const a = rand(0, 6.283), s = rand(e.speed[0], e.speed[1]);
        particle(scene, pos.clone().add(new THREE.Vector3(Math.cos(a) * 0.15 * R, 0.1 * R, Math.sin(a) * 0.15 * R)),
                 new THREE.Vector3(Math.cos(a) * s, rand(e.up[0], e.up[1]), Math.sin(a) * s), e, 1);
      }
      bursts.push(S);
    },
    // a small burst where a shot with no splash hits (the Leaf Wizard's leaf: "small leaf burst"): cfg.count bits thrown
    // out from `pos` (world) in every direction, a little upward, then left to drag and gravity; k = world units per
    // model unit. cfg: { count, colors, shape, size, life, speed: [lo, hi], up, gravity } (model units)
    burst(scene, pos, k, cfg, fwd) {
      for (let i = 0; i < (cfg.count || 10); i++) {
        const v = new THREE.Vector3(rand(-1, 1), rand(-0.4, 1) + (cfg.up || 0), rand(-1, 1)).normalize().multiplyScalar(rand(cfg.speed[0], cfg.speed[1]) * k);
        // (fwd: the way the shot was flying. Nothing is thrown on THROUGH the target: a bit heading that way bounces back)
        if (fwd) { const f = v.dot(fwd); if (f > 0) v.addScaledVector(fwd, -1.7 * f); }
        const pm = particle(scene, pos, v, cfg, k);
        if (fwd) { pm.userData.ref = { p: pos.clone(), d: fwd }; holdBack(pm); }
      }
    },
    // the small HIT effect on a body that takes a direct hit (scripts/hit_fx.json): `pos` on the body (world), `dir`
    // pointing from it toward where the hit came from, `s` = the body's drawn height x how big the hit was, `tint`: a
    // colour for the shards (the attacker's team) or null. cfg: flash { color, r, life } and/or pop { ramp, r, life }
    // (a puff that pops and shrinks away), shards { count, colors, shape, size, life, speed, spread, gravity }
    hit(scene, pos, dir, s, cfg, tint) {
      const S = { t: 0, parts: [] };
      if (cfg.flash) {
        const m = mesh(cfg.flash.color, 'puff', 1);
        m.position.copy(pos); m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6)); m.scale.setScalar(0.0001);
        scene.add(m); S.parts.push({ m, kind: 'flash', r: cfg.flash.r * s, delay: 0, life: cfg.flash.life });
      }
      if (cfg.pop) {
        const m = mesh(null, 'blob', 1);
        m.position.copy(pos); m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6)); m.scale.setScalar(0.0001);
        scene.add(m); S.parts.push({ m, kind: 'pop', ramp: cfg.pop.ramp, r: cfg.pop.r * s, delay: 0, life: cfg.pop.life });
      }
      const sh = cfg.shards;
      if (sh) {
        const c = tint ? Object.assign({}, sh, { colors: [tint, tint, '#FFFFFF'] }) : sh;
        for (let i = 0; i < sh.count; i++) {
          const v = new THREE.Vector3(rand(-1, 1), rand(-0.6, 1), rand(-1, 1)).normalize().multiplyScalar(sh.spread).add(dir).normalize()
            .multiplyScalar(rand(sh.speed[0], sh.speed[1]) * s);
          particle(scene, pos, v, c, s);
        }
      }
      if (S.parts.length) bursts.push(S);
    },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const m = live[i], u = m.userData;
        u.age += dt;
        const t = u.age / u.life;
        if (t >= 1) { if (m.parent) m.parent.remove(m); m.material.dispose(); live.splice(i, 1); continue; }
        if (u.src && u.src.dead && !u.halt) { u.halt = true; u.v.multiplyScalar(0.02); if (u.src.end) u.ref = { p: u.src.end, d: u.src.dir }; }   // its shot has landed: it stays here
        u.v.multiplyScalar(Math.exp(-(u.drag == null ? 2.5 : u.drag) * dt));
        if (u.ramp) rampAt(u.ramp, t, m.material.color);
        if (u.g) u.v.y -= u.g * dt;
        m.position.addScaledVector(u.v, dt);
        // (u.orbit { c, w, out }: a bit that circles the upright line through c, w rad/s, drifting out `out` a second: a swirl)
        if (u.orbit) {
          const o = u.orbit, ox = m.position.x - o.c.x, oz = m.position.z - o.c.z, an = o.w * dt, cs = Math.cos(an), sn = Math.sin(an), gr = 1 + (o.out || 0) * dt;
          m.position.x = o.c.x + (ox * cs - oz * sn) * gr; m.position.z = o.c.z + (ox * sn + oz * cs) * gr;
        }
        if (u.floor !== undefined && m.position.y < u.floor) { u.age = u.life; continue; }   // (a drop: gone as it meets the ground)
        m.rotation.x += u.spin.x * dt; m.rotation.y += u.spin.y * dt; m.rotation.z += u.spin.z * dt;
        m.scale.setScalar(u.r * (u.grow > 0 ? 1 + u.grow * t : 1 - 0.75 * t));   // embers shrink away; puffs (grow) swell
        m.material.opacity = u.op * (t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.7));
        // a bit that belongs to a shot that has landed (its hit burst, its stopped haze) never passes the point where
        // the shot stopped, not even as it swells: it is held back at that line and loses any speed across it
        holdBack(m);
      }
      for (let i = bursts.length - 1; i >= 0; i--) {
        const S = bursts[i];
        S.t += dt;
        let alive = 0;
        for (const p of S.parts) {
          if (p.done) continue;
          const t = (S.t - p.delay) / p.life, m = p.m;
          if (t >= 1) { if (m.parent) m.parent.remove(m); m.material.dispose(); p.done = true; continue; }
          alive++;
          if (t < 0) continue;
          if (p.kind === 'flash') {          // the core: out at once, gone in a blink
            m.scale.setScalar(p.r * (0.3 + 0.7 * easeOut(t / 0.4)));
            m.material.opacity = 1 - t * t;
          } else if (p.kind === 'pop') {     // a hit puff: pops out at once, then shrinks away
            m.scale.setScalar(Math.max(0.0001, p.r * (t < 0.18 ? 0.4 + 0.6 * easeOut(t / 0.18) : 1 - Math.pow((t - 0.18) / 0.82, 1.6))));
            rampAt(p.ramp, t, m.material.color);
          } else if (p.kind === 'ring') {    // a soft ring running out over the ground
            const s = p.r * (0.15 + 0.85 * easeOut(t)); m.scale.set(s, 1, s);
            m.material.opacity = p.op * (1 - t);
          } else if (p.kind === 'scorch') {  // the burn mark: there at once, fading slowly
            m.scale.set(p.r, 1, p.r);
            m.material.opacity = p.op * (t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92);
          } else if (p.kind === 'blob') {    // a fire puff: bursts out and slows, swells, cools to smoke, rises, shrinks away
            const go = easeOut(t / 0.5);
            m.position.set(p.c.x + p.dx * p.out * go, p.c.y + p.r * 0.5 + p.up * go + p.rise * t * t, p.c.z + p.dz * p.out * go);
            const swell = 0.35 + 0.65 * easeOut(t / 0.22), gone = t < 0.5 ? 1 : 1 - Math.pow((t - 0.5) / 0.5, 1.7);
            m.scale.setScalar(Math.max(0.0001, p.r * swell * gone));
            rampAt(p.ramp, t, m.material.color);
            m.rotation.x += p.spin.x * dt; m.rotation.y += p.spin.y * dt; m.rotation.z += p.spin.z * dt;
            m.material.opacity = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2 * 0.6;
          } else {                           // a flame on the ground: leaps up, licks and sways, lifts off and thins away
            const up = t < 0.18 ? easeOut(t / 0.18) : 1 - Math.pow((t - 0.18) / 0.82, 1.5);
            const lick = 1 + 0.2 * Math.sin(S.t * p.w1 + p.ph);
            const w = p.h * (0.62 + 0.38 * up) * (1 - 0.35 * t);
            m.scale.set(w, Math.max(0.0001, p.h * up * lick), w);
            m.rotation.set(0.2 * Math.sin(S.t * p.w2 + p.ph), p.yaw + 0.5 * Math.sin(S.t * 2.2 + p.ph), 0.2 * Math.cos(S.t * p.w2 * 0.8 + p.ph));
            m.position.y = p.y0 + 0.5 * p.h * t * t;
            const dim = t < 0.6 ? 1 : 1 - 0.35 * (t - 0.6) / 0.4; m.material.color.setRGB(dim, dim, dim);
            m.material.opacity = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15 * 0.5;
          }
        }
        if (!alive) bursts.splice(i, 1);
      }
    },
    // a shot has landed (state: the object its trail was emitted with, now with .end and .dir): its haze stops at once
    landed(state) {
      for (const m of live) { const u = m.userData; if (u.src === state && !u.halt) { u.halt = true; u.v.multiplyScalar(0.02); if (state.end && state.dir) { u.ref = { p: state.end, d: state.dir }; holdBack(m); } } }
    },
    count: () => live.length,
    // (for tests) how far PAST where its shot landed, along the flight, the farthest bit of a hit burst / stopped haze is
    // (world units, its own radius included; negative: all of them are short of it)
    beyond: () => { let b = -99, n = 0; for (const m of live) { const r = m.userData.ref; if (!r || !r.d) continue; n++; b = Math.max(b, m.position.clone().sub(r.p).dot(r.d) + m.scale.x); } return { n, max: n ? +b.toFixed(2) : null }; },
    // (for tests) the haze left by shots that have landed: how many bits, and the fastest of them (world units/s)
    halted: () => { let n = 0, v = 0; for (const m of live) if (m.userData.halt) { n++; v = Math.max(v, m.userData.v.length()); } return { n, vmax: +v.toFixed(2) }; },
    splashes: () => bursts.length,
    // (for tests) how many parts of each kind are showing right now
    parts: () => { const n = {}; for (const S of bursts) for (const p of S.parts) if (!p.done && S.t >= p.delay) n[p.kind] = (n[p.kind] || 0) + 1; return n; },
  };
}

  // one unit's driver: the battlefield pages' own (see the header), given this unit's settings and its model's bytes.
  // `window` here is a small stand-in the driver reads the fight's speed and battle from and hangs its calls on.
  function makeDriver(CFG, bytes, window) {
// ===== [battlefield preview] a shape-language animated GLB standing in for one model kind (see make_battlefield.py) =====
// Render3D reports every body of the kind (position, heading quaternion, size, look); this draws one animated clone per
// body: Walk at the speed the body really moves, Attack on each strike (b.lastAtk), Idle otherwise.
  const KIND = CFG.kind, NAME = CFG.name;   // the unit it stands in for: matched by name (or model kind)
  const REF_H = CFG.refH;   // null: fit the model's own height to the unit's; a number: measure it against this height
                             // instead (a smaller variant, e.g. the child Leaf Wizard, then shows at its true size)
  const WALK_SPEED = CFG.walk;   // the GLB Walk's ground speed at timeScale 1 (m/s, GLB units); 0: it floats
  const ATTACK_LEAD = 0.25;   // s into Attack when the strike lands: start there-ish so the swipe meets the hit
  const RAM_REACH = 2;   // the engine's: metres from its target at which a ram hits (and falls)
  // a unit with a hook (the Catcher, V2WIP: the engine's b.hookOut / b.hookTgts) and Throw / Reel clips: Throw starts
  // when the engine throws, this far in (just before the clip's release at 0.43 s), Reel loops while a body is on the
  // hook, and the model's own hook and chain (nodes named *_hook* / *_chain*) are hidden while the game's is out
  const THROW_START = 0.3, HOOK_PART = /_(hook|chain)/i;
  // a body that dies (the engine stops reporting it; its b.alive is false): its model stays where it fell, plays
  // Death or DeathF (one at random), lies there DEAD_LIE s, then fades out (sinking a little) over DEAD_FADE s
  // (the user, 2026-11-22: "units should probably fade out from death position a bit faster": was 2 s + a 1.2 s sink)
  const DEAD_LIE = 1.0, DEAD_FADE = 0.8;
  // a death effect (scripts/death_fx.json; null: none): the dust-cloud poof, drawn by scripts/dust_puff.js
  const DEATH_FX = CFG.deathFx || null;
  const PUFFS = DEATH_FX && DEATH_FX.puff ? createDustPuffs(THREE) : null;
  // LAUNCH (s, or null): the shot leaves at this time into Attack (the Meteor Caller's launch); Attack is then started
  // that long BEFORE the engine fires (its b.cd / b.windT count down to it), and a burst's further shots don't restart it
  const LAUNCH = CFG.launch;
  // SKY_DROP: this unit's shots are drawn as its meteor dropping from the sky onto the target, landing when the
  // engine's projectile arrives (the game's own flat shot for them is not drawn)
  const SKY_DROP = false, DROP_SIZE = 3.2, DROP_H = 26, PROJ_HIT = 1;   // (PROJ_HIT: the engine's PROJ_HIT_RADIUS)
  // PROJ (scripts/projectile_fx.json; null: none): this unit's shots are drawn as its own projectile model (a GLB from
  // scripts/projectiles.py), flying from its hand to where the engine's projectile will land (the game's blob for them
  // is not drawn), shedding the particles of PROJ.trail (scripts/proj_fx.js)
  const PROJ = null;
  // HIT (scripts/hit_fx.json): the small effect on ANY body that takes a direct hit (this page's copy of the engine
  // marks them: b.hitN counts its direct hits, b.hitDmg / b.hitFrom / b.hitBy are the last one's size, origin, attacker)
  const HIT = null;
  let hitVar = HIT && HIT.default, hitCount = 0, frameN = 0, clockT = 0;
  const bodiesSeen = new Map();   // engine body -> where it is drawn (x, y, z, height), its hits already shown
  const PFX = createProjFx(THREE);
  // burn / bleed / poison on any body that has one (scripts/status_fx.js, settings scripts/status_fx.json)
  const STATUS_CFG = null;
  const STATUS = STATUS_CFG && typeof createStatusFx === 'function' ? createStatusFx(THREE, PFX, STATUS_CFG, GLTFLoader) : null;
  // how many pixels one world unit covers on screen at p, as the page's camera sees it now (0: not known)
  function wwPpu(p) {
    if (!camLast) return 0;
    const cv = document.querySelector('#view canvas'), vh = (cv && cv.clientHeight) || 600;
    if (camLast.isOrthographicCamera) return vh * (camLast.zoom || 1) / Math.max(1e-6, camLast.top - camLast.bottom);
    // (a chase view moves the camera after the bodies are placed: where it was put last frame, not the game's own view)
    const cp = window.__anim.chasing && window.__anim._cam ? window.__anim._cam : camLast.getWorldPosition(new THREE.Vector3());
    return vh / 2 / (Math.tan(camLast.fov * Math.PI / 360) * Math.max(0.1, cp.distanceTo(p)));
  }
  const wwBands = [], wwM = new THREE.Matrix4(), wwV = new THREE.Vector3();
  const wwDrop = (g) => { if (g.parent) g.parent.remove(g); for (const c of g.children) c.material.dispose(); g.gone = true; };
  let wwOwnDash = 0, wwBandFrames = 0, wwBandLast = null, wwMul = 1, wwFlip = 1, wwTrack = null, wwDodgesSeen = 0, wwGlides = 0, wwGlideFrames = 0, wwLeaves = 0, wwLeanMax = 0, wwLast = null, chargeCol = null, chargeTintFrames = 0, chargeStarts = 0, chargeFrames = 0, hidShots = 0, vanishFrames = 0, tintFrames = 0, hitLast = null, tracerN = 0, tracerPart = 0, flinchN = 0, dashFrames = 0, dashFlagFrames = 0, dashStarts = 0, coastN = 0, coastLast = null;
  let splashN = 0, splashVar = PROJ && PROJ.splash && PROJ.splash.default;
  // the splash in use: the unit's only one, or the variant chosen on the page (several to pick from)
  const splashCfg = () => !PROJ || !PROJ.splash ? null : PROJ.splash.variants ? PROJ.splash.variants[splashVar] : PROJ.splash;
  // (see INSTANCED / STREAK below) PMODE, for tests: 'inst' (all shots in one draw call), 'group' (a set of meshes per
  // shot, as the bigger projectiles are drawn), 'off' (the game's own blob: the baseline)
  const INST_CAP = 512;
  let inst = null, instTris = 0, streak = null, PMODE = PROJ && PROJ.instanced ? 'inst' : 'group';
  // STREAK (PROJ.streak { color, opacity, width, length, back }): a thin pale trail behind each shot, fading to nothing
  // toward its tail (the user: "a small white faded trail behind every arrow shot"). Two crossed strips, so it shows
  // from every side; all of them on the field drawn in ONE draw call. width / back in model units, length in metres.
  function streakMesh(S) {
    const P = [], UV = [];
    const quad = (ax, ay) => { const a = [[-0.5 * ax, -0.5 * ay, 0], [0.5 * ax, 0.5 * ay, 0], [0.5 * ax, 0.5 * ay, -1], [-0.5 * ax, -0.5 * ay, -1]], uv = [[0, 1], [1, 1], [1, 0], [0, 0]];
      for (const i of [0, 1, 2, 0, 2, 3]) { P.push(...a[i]); UV.push(...uv[i]); } };
    quad(1, 0); quad(0, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    const c = document.createElement('canvas'); c.width = 4; c.height = 64;
    const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, '#888'); gr.addColorStop(1, '#000');   // (bright at the shot, gone at the tail)
    x.fillStyle = gr; x.fillRect(0, 0, 4, 64);
    const mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: S.color, transparent: true, opacity: S.opacity, alphaMap: new THREE.CanvasTexture(c),
                                                                       depthWrite: false, side: THREE.DoubleSide }), INST_CAP);
    mesh.count = 0; mesh.frustumCulled = false;
    return mesh;
  }
  const dummy = new THREE.Object3D();
  const shotLog = [];   // (for tests: each shot as it left: its owner's Attack time and state then)
  const projSrc = [], shots = new Map();   // the projectile's meshes; engine projectile -> its drawn shot
  // live facet shading (as preview/model.template.html): tiers from the current world normal
  const PAINT_L = new THREE.Vector3(0.8, 0.5, 0.35).normalize(), TH_LIT = 0.55, TH_MID = 0.05;
  function liveMat(cols) {
    const u = { uDark: { value: cols.dark.clone() }, uMid: { value: cols.mid.clone() }, uLit: { value: cols.lit.clone() }, uL: { value: PAINT_L } };
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWN;\nvarying vec3 vVP;\nvarying float vFlat;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWN = transpose(inverse(mat3(modelMatrix))) * normal;\n#ifdef USE_SKINNING\n  vFlat = 1.0;\n#else\n  vFlat = 0.0;\n#endif').replace('#include <project_vertex>', '#include <project_vertex>\n  vVP = mvPosition.xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWN;\nvarying vec3 vVP;\nvarying float vFlat;\nuniform vec3 uDark, uMid, uLit, uL;')
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec3 wn = normalize(vWN);\n  if (vFlat > 0.5) wn = normalize((vec4(normalize(cross(dFdx(vVP), dFdy(vVP))), 0.0) * viewMatrix).xyz);\n  float dl = dot(wn, uL);\n  vec3 tier = dl > ' + TH_LIT.toFixed(3) + ' ? uLit : (dl > ' + TH_MID.toFixed(3) +
          ' ? uMid : uDark);\n  vec4 diffuseColor = vec4( tier * diffuse, opacity );');
    };
    return m;
  }
  // MERGED BODIES (the user, 2026-11-25, after the 6 v 6 archer test: 96 animated archers cost about 14,000 draw calls a
  // frame, "Fix archer cost"). A model is dozens of rigid part meshes, each split again by tone, each drawn twice (once
  // more for its shadow): about 145 draw calls a body. At load they are merged into ONE skinned mesh: every vertex
  // rides, rigidly, the part node it came from (that node is its "bone"; the animation moves those nodes exactly as
  // before), and its family's three tones travel with it as vertex attributes, so one material shades the whole body.
  // A body is then one draw call + one for its shadow. The part meshes stay in the tree, invisible (they still give a
  // part's place: where a shot leaves, a tracer starts). Parts that are shown / hidden on their own (the Catcher's
  // hook) and already-skinned meshes (the Obelisk's snake) are left as they are. `?merge=0` on the page's address
  // turns it off (the old way, to compare).
  const MERGE = !/[?&]merge=0/.test(location.search);
  const FACE = !/[?&]face=0/.test(location.search), UPV = new THREE.Vector3(0, 1, 0);
  // THE FACING STANDARD (the user, 2026-11-24: "Make all ranged units turn to the target they are attacking as a
  // standard, this should always be the case unless a unit is attacking with several attacks at different enemies at
  // the same time"). Every unit on every page (melee too) faces the enemy it attacks: while it winds up, as the shot
  // leaves, and through the follow-through. The one exception is a volley that goes to SEVERAL enemies at once (split
  // beams, the Frost Wizard's Multibeam): then it faces the middle of them. (A shotgun's pellets and a flame's cone are
  // one attack about its target: it faces that target.) Every shot the engine records is noted here (aimSeen), so what a
  // body really shot at is known, and how far off it its model was as the shot left is logged (fireFacing, for tests).
  const aimsOf = new WeakMap();   // engine body -> its latest volley { f: frame, t: clock, tg: [targets] }
  const fireLog = [];             // degrees off, as drawn on the frame each volley left
  let fireMulti = 0, fireWorst = null;
  const snapLog = [];             // degrees turned at once on the frame a volley left (0: it was already on its target)
  const snapWhy = { samples: [] };
  function aimSeen(s) {
    const b = s[14], tg = s[15];
    if (!b || !tg) return;
    let a = aimsOf.get(b);
    if (!a || a.f !== frameN) { a = { f: frameN, t: clockT, tg: [] }; aimsOf.set(b, a); }
    if (!a.tg.includes(tg)) a.tg.push(tg);
  }
  // whom a body will attack next, by the engine's own rule (engine.js locked() / validTargets()): the enemy it is locked
  // on while that lives and stays in its reach, else the nearest enemy (the one that comes into reach first). d: how far.
  let foeF = -1, foeBy = [[], []];
  function foesOf(side) {   // the living bodies a side may attack, listed once a frame
    if (foeF !== frameN) {
      foeF = frameN; foeBy = [[], []];
      const A = window.__lab3d && window.__lab3d.bt && window.__lab3d.bt.bodies;
      if (A && A.length) for (const f of A) if (f.alive && f.u && (f.side === 0 || f.side === 1) && !f.hidden && !f.u.aloft) foeBy[1 - f.side].push(f);
    }
    return foeBy[side] || [];
  }
  // (the engine's gap(): to a tower or wall, the distance to its edge, not its middle)
  const gapTo = (f, b) => f.u.barrier > 0
    ? Math.hypot(Math.max(0, Math.abs(f.x - b.x) - f.u.barrier), Math.max(0, Math.abs(f.y - b.y) - (f.u.barrierY > 0 ? f.u.barrierY : f.u.barrier)))
    : Math.hypot(f.x - b.x, f.y - b.y);
  function nextTarget(b) {
    const reach = (b.u.range || 0) + 0.01, L = b.lock;
    if (L && L.alive && !L.hidden && L.u) { const d = gapTo(L, b); if (d <= reach) return { f: L, d }; }
    let best = null, bd = Infinity;
    for (const f of foesOf(b.side)) { const d = gapTo(f, b); if (d < bd && d >= (b.u.minRange || 0)) { bd = d; best = f; } }
    return best ? { f: best, d: bd } : null;
  }
  // the direction (scene x, z; unit length) from a drawn body to the middle of some targets; null if none is drawn
  function aimDir(d, tgs, b) {
    let sx = 0, sz = 0, n = 0;
    for (const t of tgs) {
      // where it is drawn; one that is not drawn as a body (a tower, a wall): by the engine's places (the renderer
      // puts engine x, y at scene x, -z, one scale for both: a direction needs no more)
      const ti = bodiesSeen.get(t); if (!ti && !(b && t && t.x != null)) continue;
      const dx = ti ? ti.x - d.x : t.x - b.x, dz = ti ? ti.z - d.z : -(t.y - b.y), l = Math.hypot(dx, dz); if (l < 1e-3) continue;
      sx += dx / l; sz += dz / l; n++;
    }
    const l = Math.hypot(sx, sz);
    return n && l > 0.05 ? { x: sx / l, z: sz / l, n } : null;   // (targets on opposite sides: no middle to face)
  }
  let mergedTris = 0, mergedParts = 0;
  function liveSkinMat() {   // as liveMat, for a merged body: tiers from the skinned vertex normal, tones from the vertex
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      sh.uniforms.uL = { value: PAINT_L };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 cDark;\nattribute vec3 cMid;\nattribute vec3 cLit;\nvarying vec3 vWN;\nvarying vec3 vTD;\nvarying vec3 vTM;\nvarying vec3 vTL;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vWN = (vec4(transformedNormal, 0.0) * viewMatrix).xyz;\n  vTD = cDark; vTM = cMid; vTL = cLit;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWN;\nvarying vec3 vTD;\nvarying vec3 vTM;\nvarying vec3 vTL;\nuniform vec3 uL;')
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );',
          'float dl = dot(normalize(vWN), uL);\n  vec3 tier = dl > ' + TH_LIT.toFixed(3) + ' ? vTL : (dl > ' + TH_MID.toFixed(3) + ' ? vTM : vTD);\n  vec4 diffuseColor = vec4( tier * diffuse, opacity );');
    };
    return m;
  }
  function mergeBody(root) {
    root.updateMatrixWorld(true);
    const rootInv = root.matrixWorld.clone().invert();
    const bones = [], pos = [], nor = [], cd = [], cm = [], cl = [], si = [], sw = [], v = new THREE.Vector3();
    root.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || !o.material || Array.isArray(o.material)) return;
      for (let a = o; a && a !== root; a = a.parent) if (HOOK_PART.test(a.name)) return;   // shown / hidden on its own
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, p = g.getAttribute('position'), n = g.getAttribute('normal');
      if (!p || !n) return;
      const k = /^SL_(.+)_(dark|mid|lit)$/.exec(o.material.name), fam = k && famCols[k[1]], c = o.material.color;
      const c3 = fam && Object.keys(fam).length === 3 ? [fam.dark, fam.mid, fam.lit] : [c, c, c];
      const M = rootInv.clone().multiply(o.matrixWorld), N = new THREE.Matrix3().getNormalMatrix(M), bi = bones.length;
      bones.push(o);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(M); pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyMatrix3(N).normalize(); nor.push(v.x, v.y, v.z);
        cd.push(c3[0].r, c3[0].g, c3[0].b); cm.push(c3[1].r, c3[1].g, c3[1].b); cl.push(c3[2].r, c3[2].g, c3[2].b);
        si.push(bi, 0, 0, 0); sw.push(1, 0, 0, 0);
      }
      o.visible = false; o.userData.merged = true;
    });
    if (!bones.length) return null;
    const geo = new THREE.BufferGeometry(), F = (a, k) => new THREE.Float32BufferAttribute(a, k);
    geo.setAttribute('position', F(pos, 3)); geo.setAttribute('normal', F(nor, 3));
    geo.setAttribute('cDark', F(cd, 3)); geo.setAttribute('cMid', F(cm, 3)); geo.setAttribute('cLit', F(cl, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', F(sw, 4));
    const sk = new THREE.SkinnedMesh(geo, liveSkinMat());
    sk.name = '__merged'; sk.frustumCulled = false;
    root.add(sk); sk.updateMatrixWorld(true);
    sk.bind(new THREE.Skeleton(bones));   // (the rest pose: each node's inverse now; the bind matrix its own world matrix)
    mergedTris = pos.length / 9; mergedParts = bones.length;
    return sk;
  }
  let template = null, clips = {}, H = 1, famCols = {};
  if (PROJ && PROJ.glb_b64) new GLTFLoader().parse(Uint8Array.from(atob(PROJ.glb_b64), c => c.charCodeAt(0)).buffer, '', g => {
    const cols = {};
    g.scene.updateMatrixWorld(true);
    g.scene.traverse(o => { if (o.isMesh) { const k = /^SL_(.+)_(dark|mid|lit)$/.exec(o.material.name); if (k) (cols[k[1]] ||= {})[k[2]] = o.material.color; } });
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      const k = /^SL_(.+)_(dark|mid|lit)$/.exec(o.material.name);
      const pm = k && Object.keys(cols[k[1]] || {}).length === 3 ? liveMat(cols[k[1]]) : o.material;
      if (PROJ.water && PROJ.water.opacity < 1) { pm.transparent = true; pm.opacity = PROJ.water.opacity; }
      projSrc.push({ geo: o.geometry, m: o.matrixWorld.clone(), mat: pm, col: o.material.color.clone(), name: o.name + '|' + (o.parent ? o.parent.name : '') });
    });
    if (PROJ.instanced) {
      // INSTANCED (the user, 2026-11-25: many arrows must not cost framerate): the whole projectile merged into ONE mesh,
      // its three tones baked into vertex colours, and every shot on the field drawn together in ONE draw call
      const pos = [], col = [];
      for (const s of projSrc) {
        const gg = s.geo.index ? s.geo.toNonIndexed() : s.geo.clone(); gg.applyMatrix4(s.m);
        const pp = gg.getAttribute('position');
        for (let i = 0; i < pp.count; i++) { pos.push(pp.getX(i), pp.getY(i), pp.getZ(i)); col.push(s.col.r, s.col.g, s.col.b); }
      }
      const ig = new THREE.BufferGeometry();
      ig.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ig.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      inst = new THREE.InstancedMesh(ig, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), INST_CAP);
      inst.count = 0; inst.frustumCulled = false; instTris = pos.length / 9;
    }
  }, e => console.error('battlefield preview: projectile GLB', e));
  // ===== [2026-11-24 overnight pass: presumed choices, see HANDOFF "OVERNIGHT PASS"] =====
  // TRACER (PROJ.tracer): an INSTANT shot (the engine's projSpeed 0: the damage lands as it attacks) is drawn as a bullet
  // trail: a tapered streak with a pale core that runs from the unit's muzzle / hand to its target and is gone.
  const tracers = [], pendingTracers = [];
  // JET (PROJ.jet; the Flame Wizard, 2026-11-24: the user picked "Flame jet that sweeps out" for its instant flame
  // cone, after "only sniper should be instant"). The engine's flame hits everything in its cone at once, four times
  // a second, and records one wedge a shot (no shooter in the record: it is found by where the wedge starts). The page
  // draws, instead of the game's flat wedge, a jet of fire puffs streaming from the torch: each flies out fast and
  // slows as it nears the cone's reach, swelling, cooling from pale yellow through orange and red to smoke, so the
  // fire is SEEN to travel out and arrive (the first puffs reach the far end about 0.3 s after it starts). Round puffs
  // only (the user on the Fire Mage's first splash: cones read as spikes). jets(): for tests.
  let jetShots = 0, jetPuffs = 0, jetFromPart = 0;
  // BEAM (PROJ.beam; the Frost Wizard and the Sun Priest, 2026-11-24: the user picked "Keep a beam, in our style" /
  // "Keep a ray, in our style"). The game holds one beam per shooter on its target, refreshed by each hit (art.js
  // frostBeam: it lasts 1 / attacks-a-second + 0.2 s past the last hit; a new target ends the old one) and draws a
  // plain line. Here it is a faceted shaft in the kit's style: an n-sided prism, its sides in the family's tones,
  // turning slowly about its length so the facets catch the light in turn (the shimmer), a paler core inside turning
  // the other way, a crystal at its end. It SHOOTS OUT from the named part to the target when it starts (PROJ.beam
  // .speed m/s), swells in and thins away as it ends, is wider the more its damage has ramped up (`spin_k`: the Sun
  // Priest), and throws a few chips off where it lands. beams(): for tests.
  let beamHits = 0, beamStarts = 0, beamFromPart = 0;
  // HOOK (PROJ.hook; the Catcher, 2026-11-25: the user picked "Own hook on a faceted chain"). The engine throws the hook
  // as a projectile (p.hook, 20 m/s, up to 42 m), reels whatever it caught back to the Catcher (b.hookTgts, each with
  // v.hooked = its Catcher) and draws flat lines for both. Here: the model's OWN hook (its hook, barb and eye, taken
  // from the model at rest and turned to lie along its flight) flies out on a chain of small faceted links from the
  // hand (the model's `hook` joint, which the Throw and Reel clips move); a reeled body hangs on the same chain, the
  // hook in it; when it is done the hook comes back up the chain to the hand in a moment, and only then do the hook
  // and the three links in the fist show again. The chain sags a little in flight, runs taut when reeling, is one
  // draw call for every link on the field, and is never thinner than PROJ.hook.min_px pixels. hooks(): for tests.
  let hookGeo = null, chainInst = null, hookThrows = 0, hookReels = 0, hookHomes = 0, hookLinks = 0, hookFlyFrames = 0;
  const hookPool = [], _hq = new THREE.Quaternion(), _hq2 = new THREE.Quaternion(), _hv = new THREE.Vector3(), _hm = new THREE.Matrix4(), _hs = new THREE.Vector3();
  function hookSetup(root) {
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert(), pts = [], col = [], eyeBox = new THREE.Box3(), v = new THREE.Vector3();
    root.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      let nm = null; for (let a = o; a && a !== root; a = a.parent) if (/_hook/i.test(a.name)) { nm = a.name; break; }
      if (!nm) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(inv.clone().multiply(o.matrixWorld));
      const p = g.getAttribute('position'), c = o.material.color;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); pts.push(v.clone()); col.push(c.r, c.g, c.b); if (/_hook_eye/i.test(nm)) eyeBox.expandByPoint(v); }
    });
    if (!pts.length) return;
    const eye = eyeBox.isEmpty() ? pts[0].clone() : eyeBox.getCenter(new THREE.Vector3());
    let far = pts[0], fd = -1; for (const q of pts) { const d = q.distanceTo(eye); if (d > fd) { fd = d; far = q; } }
    const turn = new THREE.Quaternion().setFromUnitVectors(far.clone().sub(eye).normalize(), new THREE.Vector3(0, 0, 1)), pos = [];
    for (const q of pts) { q.sub(eye).applyQuaternion(turn); pos.push(q.x, q.y, q.z); }   // its eye at the origin, the hook ahead along +z
    hookGeo = new THREE.BufferGeometry();
    hookGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hookGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }
  function chainMesh(HK) {   // every link on the field: one instanced mesh; a link: a flat faceted diamond, its faces in three tones
    const g = new THREE.OctahedronGeometry(1, 0).toNonIndexed(); g.scale(0.5, 0.5, 0.2);
    const n = g.getAttribute('position').count, cs = HK.link.tones.map(h => new THREE.Color(h)), col = [];
    for (let i = 0; i < n; i += 3) { const c = cs[(i / 3) % cs.length]; for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ vertexColors: true }), HK.cap || 1600);
    m.count = 0; m.frustumCulled = false; m.castShadow = false;
    return m;
  }
  const beamGeos = new Map(), Y_AX = new THREE.Vector3(0, 1, 0), _bd = new THREE.Vector3(), _bq = new THREE.Quaternion(), _bq2 = new THREE.Quaternion();
  function beamGeo(n, tones) {   // a prism along +y from 0 to 1, radius 1, each side one flat tone
    const key = n + tones.join();
    if (beamGeos.has(key)) return beamGeos.get(key);
    const pos = [], col = [], cs = tones.map(h => new THREE.Color(h));
    for (let k = 0; k < n; k++) {
      const a0 = k * 6.2832 / n, a1 = (k + 1) * 6.2832 / n, x0 = Math.cos(a0), z0 = Math.sin(a0), x1 = Math.cos(a1), z1 = Math.sin(a1), c = cs[k % cs.length];
      pos.push(x0, 0, z0, x1, 0, z1, x1, 1, z1, x0, 0, z0, x1, 1, z1, x0, 1, z0);
      for (let v = 0; v < 6; v++) col.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    beamGeos.set(key, g);
    return g;
  }
  function beamNote(s) {   // one of the engine's shots is this page's unit's beam: keep it on its target
    const BE = PROJ && PROJ.beam, b = s[14], tgt = s[15];
    if (!BE || !b || !tgt || !b.u || b.u.name !== NAME) return false;
    const e = live.get(b); if (!e) return false;
    const M = e.beams || (e.beams = new Map());
    if (!(b.u.beams > 1)) for (const [t, B] of M) if (t !== tgt) B.last = -9;   // (a new target ends the old beam)
    let B = M.get(tgt);
    if (!B) {
      const mat = (op) => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false });
      B = { tgt, len: 0, w: 0, ang: Math.random() * 6, g: new THREE.Group(), end: null, acc: 0 };
      B.shaft = new THREE.Mesh(beamGeo(BE.sides, BE.tones), mat(BE.opacity)); B.core = new THREE.Mesh(beamGeo(BE.sides, BE.core), mat(Math.min(1, BE.opacity + 0.15)));
      B.tip = PFX.mesh(BE.tip_color, 'octa', BE.opacity);
      for (const m of [B.shaft, B.core, B.tip]) { m.frustumCulled = false; m.renderOrder = 12; B.g.add(m); }
      M.set(tgt, B); beamStarts++;
    }
    B.last = clockT; B.spin = s[9] || 1; beamHits++;
    return true;
  }
  let tracerGeo = null, btLast = null, gyLast = null;
  function tracerMesh(hex, op) {
    if (!tracerGeo) {   // a four-sided spindle along +z: the tail's tip at 0, widest at 0.8, the nose at 1
      const P = [[0, 0, 0], [1, 0, 0.8], [0, 1, 0.8], [-1, 0, 0.8], [0, -1, 0.8], [0, 0, 1]], idx = [0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 1, 4, 5, 1, 2, 5, 2, 3, 5, 3, 4, 5, 4, 1], pos = [];
      for (const i of idx) pos.push(...P[i]);
      tracerGeo = new THREE.BufferGeometry(); tracerGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    }
    return new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
  }
  // the middle of the parts of a clone whose name (or an ancestor's) matches `re`; null: none
  function partMiddle(own, re) {
    own.root.updateMatrixWorld(true);
    const box = new THREE.Box3(); let any = false;
    own.root.traverse(o => { if (!o.isMesh) return; for (let a = o; a && a !== own.root; a = a.parent) if (re.test(a.name)) { box.expandByObject(o); any = true; break; } });
    return any ? box.getCenter(new THREE.Vector3()) : null;
  }
  const camPos = () => window.__anim.chasing && window.__anim._cam ? window.__anim._cam : camLast && camLast.position;
  // GROUND (PROJ.ground): the shot travels ON the ground and rolls (the Earth Wizard's boulder); PROJ.rise: it pushes
  // up out of the ground in front of the unit during its wind-up; PROJ.plough: after the engine's shot has landed on
  // the first enemy the boulder rolls on along its line as far as the last body its pierce reached, then crumbles
  const coasting = [];
  function rollOn(m, pos, r, step) {   // set it on the ground at pos (x, z), rolled on by `step`
    const G = PROJ.ground;
    m.dist = (m.dist || 0) + step;
    pos.y = (gyLast ? gyLast(pos.x, pos.z) : pos.y) + r * (1 - (G.sunk || 0)) + Math.abs(Math.sin(m.dist * (G.bump_hz || 0.6))) * (G.bump || 0) * r;
    m.rollA = (m.rollA || 0) + Math.min(step / Math.max(r, 1e-3), (G.max_spin || 14) * dtLast);   // (a blur past ~2 turns a second)
    if (m.wx !== undefined) m.g.quaternion.setFromAxisAngle(new THREE.Vector3(m.wz, 0, -m.wx), m.rollA);
    m.g.position.copy(pos);
  }
  function coastLen(m) {   // how far past where it landed the pierce reached (engine metres = world units)
    const E = m.eng, c = [];
    if (!(E.pierce > 0)) return 1.0;
    for (const o of (btLast && btLast.bodies) || []) {
      if (o.side === E.side || (!o.alive && o.hitBy !== m.owner)) continue;
      const rx = o.x - E.x, ry = o.y - E.y, al = rx * E.dx + ry * E.dy, ac = Math.abs(rx * E.dy - ry * E.dx);
      if (al > 0 && al <= 10 && ac <= 1) c.push(al);
    }
    c.sort((a, b) => a - b);
    return c.length ? c[Math.min(E.pierce, c.length) - 1] + 0.8 : 1.0;
  }
  function riserFor(e, b, d, k) {
    const RS = PROJ.rise, winding = !!b.windTarget && b.u.windUp > 0 && b.windT > 0;
    if (winding && projSrc.length) {
      if (!e.riser) {
        e.riser = new THREE.Group(); e.riser.visible = false; e.riserAdded = false; e.riserAcc = 0;
        for (const s of projSrc) { const mm = new THREE.Mesh(s.geo, s.mat); mm.matrixAutoUpdate = false; mm.matrix.copy(s.m); mm.castShadow = true; e.riser.add(mm); }
      }
      const f = Math.abs(b.x) > 0.05 ? Math.sign(d.x / b.x) || 1 : 1;
      let dx = (b.windTarget.x - b.x) * f, dz = -(b.windTarget.y - b.y) * f; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const p01 = Math.min(1, Math.max(0, 1 - b.windT / b.u.windUp)), up = 1 - Math.pow(1 - p01, 2);
      const s = k * PROJ.size, r = PROJ.ground.radius * s;
      e.riser.position.set(d.x + dx * RS.ahead * k, d.y + r * (-1.15 + (2.15 - (PROJ.ground.sunk || 0)) * up), d.z + dz * RS.ahead * k);
      e.riser.scale.setScalar(s); e.riser.rotation.set(0.7 * (1 - up), 1.4 * up, 0);
      e.riser.visible = true; e.riserT = 0; e.riserGround = new THREE.Vector3(e.riser.position.x, d.y, e.riser.position.z); e.riserK = s; e.rising = true;
    } else if (e.riser) {
      e.rising = false;
      if (e.riser.visible) { e.riserT += dtLast; if (e.riserT > 0.4) e.riser.visible = false; }   // (the shot takes it over; else it sinks from view)
    }
  }
  // FLINCH (HIT.flinch): a body of THIS page's unit that takes a direct hit rocks away from it for a moment: the whole
  // figure tips about its feet, then its chest and its head (each a beat later, the head most), and comes back. Laid
  // OVER whatever clip is playing, so Walk / Attack / Idle carry on underneath (a basic, procedural reaction for every
  // unit at once; hand-keyed Hit clips per unit can replace it)
  const FL = HIT && HIT.flinch;
  const flEnv = (t) => t <= 0 ? 0 : t < FL.rise ? 1 - Math.pow(1 - t / FL.rise, 3) : t >= FL.life ? 0 : Math.pow(1 - (t - FL.rise) / (FL.life - FL.rise), 2);
  const qTmp = new THREE.Quaternion(), qPar = new THREE.Quaternion(), vTmp = new THREE.Vector3();
  function flinchBones(e) {   // after the mixer has posed it: add the chest's and the head's share (a turn in world space)
    const F = e.flinch; if (!F) return;
    e.root.updateMatrixWorld(true);
    for (const [name, deg, lag] of [['chest', FL.chest, FL.lag], ['head', FL.head, FL.lag * 2]]) {
      const bone = e.bones[name]; if (!bone) continue;
      const st = F[name] || (F[name] = { base: new THREE.Quaternion(), last: null });
      if (st.last && bone.quaternion.equals(st.last)) bone.quaternion.copy(st.base);   // (no clip moved it since: take last frame's turn off)
      st.base.copy(bone.quaternion);
      const a = deg * Math.PI / 180 * F.amp * flEnv(F.t - lag);
      if (a > 1e-5) {
        bone.parent.getWorldQuaternion(qPar);
        qTmp.setFromAxisAngle(vTmp.set(F.az, 0, -F.ax), a);
        bone.quaternion.premultiply(qPar.clone().invert().multiply(qTmp).multiply(qPar));
      }
      st.last = st.last || new THREE.Quaternion(); st.last.copy(bone.quaternion);
    }
  }
  // DASH (PROJ.dash): while the engine dashes the body (b.dashing: its last metres to a target at 30 m/s) the model holds
  // one frame of a clip as a lunge, pitched forward and low, shedding dark streaks (a basic stand-in for a keyed Dash clip)
  // GLOW (PROJ.glow { color, size, opacity, pulse, hz }; the user, 2026-11-25: "add a small glow to the bullets (theyre
  // magical)"): a soft round halo round the shot, added to what is behind it (it lightens, never darkens), always facing
  // the camera, breathing a little. size = its width in model units (it rides the shot, so it scales with it).
  let glowTex = null;
  function glowSprite(G) {
    if (!glowTex) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      glowTex = new THREE.CanvasTexture(c);
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: G.color, transparent: true, opacity: G.opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sp.scale.setScalar(G.size);
    return sp;
  }
  // WATER (PROJ.water { jiggle, hz, ripple, ripple_k, tail, opacity }; the user, 2026-11-25, on the Aquamancer's drop:
  // "make the actual bullet more animated so that it looks more like water"): the shot is not a rigid lump but a blob of
  // liquid: it squashes and stretches along its flight (jiggle, its width giving as its length grows), a ripple runs
  // down its surface from nose to tail (ripple, ripple_k waves along it), and its tail sways behind it (tail, more
  // toward the tip). Done on the shot's OWN copy of its mesh, vertex by vertex, the facets re-shaded as they turn.
  function waterInit(m) {
    m.wat = []; let z0 = Infinity, z1 = -Infinity;
    for (const mesh of m.g.children) {
      if (!mesh.isMesh) continue;
      const geo = mesh.geometry.clone(); mesh.geometry = geo;
      const base = geo.getAttribute('position').array.slice(); m.wat.push({ geo, base });
      for (let i = 2; i < base.length; i += 3) { z0 = Math.min(z0, base[i]); z1 = Math.max(z1, base[i]); }
    }
    m.watZ = [z0, z1]; m.watPh = Math.random() * 6.283;
  }
  function waterWobble(m) {
    const W = PROJ.water, a = m.age * 6.283, z0 = m.watZ[0], z1 = m.watZ[1], L = Math.max(1e-4, z1 - z0), zc = (z0 + z1) / 2, ph = m.watPh;
    const j = W.jiggle * Math.sin(a * W.hz + ph), sx = 1 - 0.5 * j, sz = 1 + j;
    const swx = W.tail * Math.sin(a * W.hz * 0.8 + ph * 2), swy = W.tail * 0.6 * Math.cos(a * W.hz * 0.63 + ph);
    for (const w of m.wat) {
      const p = w.geo.getAttribute('position'), arr = p.array, base = w.base;
      for (let i = 0; i < base.length; i += 3) {
        const x = base[i], y = base[i + 1], z = base[i + 2], t = (z1 - z) / L;   // t: 0 at the nose, 1 at the tail's tip
        const rs = sx * (1 + W.ripple * Math.sin(W.ripple_k * t - a * W.hz * 1.7 + ph));
        arr[i] = x * rs + swx * t * t; arr[i + 1] = y * rs + swy * t * t; arr[i + 2] = zc + (z - zc) * sz;
      }
      p.needsUpdate = true; w.geo.computeVertexNormals();
    }
    m.watJ = j;
  }
  // how far an engine projectile still flies: it hits the first enemy body it flies into (within PROJ_HIT 1 m), or
  // lands at its aim point; so, as the bodies stand now, where its line first meets an enemy
  function flightLeft(p, bt) {
    let rem = p.left;
    for (const o of (bt && bt.bodies) || []) {
      if (!o.alive || o.side === p.owner.side) continue;
      const rx = o.x - p.x, ry = o.y - p.y, al = rx * p.dirX + ry * p.dirY, ac = Math.abs(rx * p.dirY - ry * p.dirX);
      if (ac > PROJ_HIT || al < -PROJ_HIT || al > p.left) continue;
      rem = Math.min(rem, Math.max(0, al - Math.sqrt(PROJ_HIT * PROJ_HIT - ac * ac)));
    }
    return rem;
  }
  const dropSrc = [], drops = new Map();   // SKY_DROP: the meteor's meshes; projectile -> its falling meteor
  let dropR = 0.15;
  new GLTFLoader().parse(bytes, '', g => {
    template = g.scene;
    template.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => {
      const k = /^SL_(.+)_(dark|mid|lit)$/.exec(m.name); if (k) (famCols[k[1]] ||= {})[k[2]] = m.color; }); });
    const box = new THREE.Box3().setFromObject(template);
    H = REF_H || (box.max.y - box.min.y);
    for (const c of g.animations) clips[c.name] = c;
    if (MERGE) mergeBody(template);
    if (PROJ && PROJ.hook) hookSetup(template);
    if (SKY_DROP) {   // the meteor's meshes (at rest, over the palm), re-centred on the meteor's middle
      template.updateMatrixWorld(true);
      const metas = [];
      template.traverse(o => { if (o.isMesh) { let a = o; while (a && !/^meteor/.test(a.name || '')) a = a.parent; if (a) metas.push(o); } });
      const c = new THREE.Box3();
      for (const o of metas) c.expandByObject(o);
      const ctr = c.getCenter(new THREE.Vector3()), off = new THREE.Matrix4().makeTranslation(-ctr.x, -ctr.y, -ctr.z);
      dropR = c.getSize(new THREE.Vector3()).y / 2;
      for (const o of metas) {
        const k = /^SL_(.+)_(dark|mid|lit)$/.exec(o.material.name);
        dropSrc.push({ geo: o.geometry, m: off.clone().multiply(o.matrixWorld),
                       mat: k && Object.keys(famCols[k[1]] || {}).length === 3 ? liveMat(famCols[k[1]]) : o.material });
      }
    }
    window.__anim.info = { H, clips: Object.keys(clips), dropParts: dropSrc.length, merged: MERGE, mergedParts, mergedTris };
  }, e => console.error('battlefield preview: GLB', e));

  function makeClone() {
    const root = SkeletonUtils.clone(template);   // (a skinned model's clones need their own bones: the Obelisk)
    const mats = [], hookParts = [];
    root.traverse(o => {
      if (!o.isMesh) return;
      if (o.userData.merged) return;   // (drawn as part of the merged body)
      if (o.name === '__merged') { o.castShadow = true; o.frustumCulled = false; o.material = liveSkinMat(); mats.push(o.material); return; }
      for (let a = o; a && a !== root; a = a.parent) if (HOOK_PART.test(a.name)) { hookParts.push(o); break; }
      o.castShadow = true;
      if (o.isSkinnedMesh) o.frustumCulled = false;   // its bounds are the rest pose's
      const k = /^SL_(.+)_(dark|mid|lit)$/.exec(o.material.name);
      o.material = k && Object.keys(famCols[k[1]] || {}).length === 3 ? liveMat(famCols[k[1]]) : o.material.clone();
      mats.push(o.material);
    });
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    for (const [n, c] of Object.entries(clips)) actions[n] = mixer.clipAction(c);
    const bones = { chest: root.getObjectByName('chest'), head: root.getObjectByName('head') };
    const e = { root, mixer, actions, mats, hookParts, bones, hookOut: false, cur: null, state: '', lastAtk: null, prev: null, speed: 0, look: '', added: false };
    mixer.addEventListener('finished', ev => { if (ev.action === e.actions.Attack || ev.action === e.actions.AttackL) e.state = ''; });
    return e;
  }
  function play(e, name, fade, once, time0) {
    const a = e.actions[name]; if (!a) return;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!once;
    if (time0) a.time = time0;
    a.play();
    if (e.cur && e.cur !== a) e.cur.crossFadeTo(a, fade, false);
    e.cur = a;
  }
  const live = new Map();   // key -> entry
  let seen = new Set(), dtLast = 1 / 60, camLast = null;
  const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // GLB front is +z, the game's -z
  window.__anim = {
    solid: false,
    // every model out of the scene (the game: its 3D board is going away)
    clear(scene) { for (const e of live.values()) { if (e.root.parent) e.root.parent.remove(e.root); if (e.riser && e.riser.parent) e.riser.parent.remove(e.riser); } live.clear(); seen = new Set(); },
    chaseState: () => { const e = live.get(window.__anim.chaseKey); return e ? e.state : null; },
    chasePos: () => { const e = live.get(window.__anim.chaseKey); return e ? e.root.position.toArray().map(v => +v.toFixed(2)) : null; },
    stats: () => ({ live: live.size, states: [...live.values()].map(e => e.state + ':' + e.speed.toFixed(2)),
                   scale: live.size ? [...live.values()][0].root.scale.x : null,
                   walkRate: [...live.values()].filter(e => e.state === 'walk').map(e => +e.actions.Walk.timeScale.toFixed(2)) }),
    // per body: the engine's last attack time and reload, the clip state and the Attack clip's time (for tests)
    dead: () => [...live.values()].filter(e => e.dead).map(e => ({ clip: e.cur && e.cur.getClip().name, t: +e.dead.t.toFixed(2), y: +e.root.position.y.toFixed(2) })),
    debug: () => [...live.entries()].map(([k, e]) => ({ lastAtk: k && k.lastAtk, cd: k && k.cd, state: e.state, alive: k && k.alive, hook: k && !!k.hookOut,
                                                        atk: e.actions.Attack ? +e.actions.Attack.time.toFixed(3) : null })),
    drops: () => [...drops.values()].filter(m => m.g).map(m => +m.g.position.y.toFixed(2)),
    // the drawn shots in flight (for tests): progress 0..1, where each started and is, and whether it left from the hand
    shots: () => [...shots.values()].map(m => ({ u: +m.u.toFixed(3), fromHand: m.fromHand, atk0: m.atk0, st0: m.st0, far: m.far && +m.far.toFixed(2),
                                                 start: m.from.toArray().map(v => +v.toFixed(2)), at: m.g.position.toArray().map(v => +v.toFixed(2)) })),
    glows: () => [...shots.values()].filter(m => m.g.userData.glow).length,
    spins: () => [...shots.values()].map(m => ({ parts: m.spinParts ? m.spinParts.map(o => o.children.length) : null, a: m.spinA ? +m.spinA.toFixed(2) : 0 })),
    // (tests) each standing body with a target: how many degrees its model, and the game's own heading, are off it
    facing: () => [...live.values()].filter(e => !e.dead && e.off && e.off.model !== null && (e.state === 'attack' || e.state === 'aim'))
      .map(e => ({ st: e.state, model: +e.off.model.toFixed(1), engine: +e.off.engine.toFixed(1) })),
    // (tests) how the shots are drawn: projMode('inst' | 'group' | 'off') before a battle; instInfo()
    projMode(v) { if (v) PMODE = v; return PMODE; },
    // (tests) show / hide everything this page draws for shots (their meshes, the instances, the streaks), to measure
    // what the shots alone cost; returns how many separate meshes the shots in flight are made of
    shotsVisible(v) { let n = 0; for (const m of shots.values()) { m.g.visible = v; m.g.traverse(o => { if (o.isMesh) n++; }); } if (inst) inst.visible = v; if (streak) streak.visible = v; return n; },
    instInfo: () => ({ mode: PMODE, tris: instTris, drawn: inst ? inst.count : 0, streaks: streak ? streak.count : 0, shots: shots.size }),
    // (tests) the liquid shots in flight: each one's squash-and-stretch right now (-jiggle .. +jiggle)
    liquid: () => [...shots.values()].filter(m => m.wat).map(m => +(m.watJ || 0).toFixed(3)),
    haze: () => PFX.halted(), beyond: () => PFX.beyond(),
    particles: () => PFX ? PFX.count() : 0, shotLog: () => shotLog,
    // a direct hit on body b (drawn at i): the effect on its side toward where the hit came from, bigger for a hit
    // that takes a bigger share of its health (HIT.max_scale at HIT.big_share and over)
    hitAt(scene, b, i) {
      const cfg = HIT.variants[hitVar], f = Math.abs(b.x) > 0.05 ? Math.sign(i.x / b.x) || 1 : Math.abs(b.y) > 0.05 ? Math.sign(-i.z / b.y) || 1 : 1;
      const from = b.hitFrom || [b.x, b.y];
      let dx = (from[0] - b.x) * f, dz = -(from[1] - b.y) * f; const dl = Math.hypot(dx, dz);
      if (dl < 1e-4) { dx = 0; dz = 0; } else { dx /= dl; dz /= dl; }
      const share = Math.min(1, (b.hitDmg || 0) / Math.max(1, b.u.hp) / HIT.big_share);
      const s = i.h * (1 + (HIT.max_scale - 1) * share);
      const pos = new THREE.Vector3(i.x + dx * 0.2 * i.h, i.y + 0.58 * i.h, i.z + dz * 0.2 * i.h);
      const dir = new THREE.Vector3(dx, 0.35, dz).normalize();
      const tint = cfg.team && b.hitBy && typeof Art !== 'undefined' ? Art.teamCol(b.hitBy.side, 0) : null;
      PFX.hit(scene, pos, dir, s, cfg, tint);
      const own = FL && live.get(b);
      if (own && !own.dead && b.alive && (dx || dz) && !(own.flinch && own.flinch.t < FL.again)) {
        own.flinch = { t: 0, ax: -dx, az: -dz, amp: FL.min + (1 - FL.min) * share }; flinchN++;
      }
      hitCount++; hitLast = { unit: b.u.name, by: b.hitBy && b.hitBy.u && b.hitBy.u.name, dmg: +(+b.hitDmg || 0).toFixed(1), scale: +(s / i.h).toFixed(2), tint };
    },
    // (tests) the hit effects shown so far, the last one, and the look in use; hitNext(): the 'Hit' button
    hits: () => ({ total: hitCount, last: hitLast, variant: hitVar, bodies: bodiesSeen.size }),
    hitNext(v) {
      if (!HIT) return null;
      const ks = Object.keys(HIT.variants); hitVar = v && HIT.variants[v] ? v : ks[(ks.indexOf(hitVar) + 1) % ks.length];
      const b = document.getElementById('hitFxBtn'); if (b) b.textContent = 'Hit: ' + HIT.variants[hitVar].label;
      return HIT.variants[hitVar].label;
    },
    splashes: () => ({ total: splashN, live: PFX ? PFX.splashes() : 0, variant: splashVar, parts: PFX ? PFX.parts() : {} }),
    // the 'Splash' button: on to the next variant (or to `v`); returns its label
    splashNext(v) {
      const vs = PROJ && PROJ.splash && PROJ.splash.variants; if (!vs) return null;
      const ks = Object.keys(vs); splashVar = v && vs[v] ? v : ks[(ks.indexOf(splashVar) + 1) % ks.length];
      const b = document.getElementById('splashBtn'); if (b) b.textContent = 'Splash: ' + (vs[splashVar].label || splashVar);
      return vs[splashVar].label || splashVar;
    },
    // one of the engine's recorded shots (its [14]: the shooter): true = the page draws this unit's shot itself, so the
    // lab's own beam for it is left out
    aimSeen,
    fireFacing: () => {
      const a = fireLog.slice().sort((x, y) => x - y), q = p => a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(1) : null;
      const sn = snapLog.slice().sort((x, y) => x - y), qs = p => sn.length ? +sn[Math.min(sn.length - 1, Math.floor(sn.length * p))].toFixed(1) : null;
      return { n: a.length, median: q(0.5), p95: q(0.95), max: q(1), over10: a.filter(v => v > 10).length, multi: fireMulti, worst: fireWorst,
               why: snapWhy, snap: { n: sn.length, median: qs(0.5), p95: qs(0.95), max: qs(1), over10: sn.filter(v => v > 10).length } };
    },
    shotFx(s) {
      const b = s[14];
      if (!(PROJ && b && b.u && b.u.name === NAME)) return false;
      if (PROJ.glb_b64) return PMODE !== 'off';       // its model flies instead
      if (PROJ.beam) return beamNote(s);              // its beam is drawn by the page
      if (PROJ.hide_shot) return true;                // its shot is not drawn (melee to the eye)
      if (!PROJ.tracer) return false;
      pendingTracers.push({ b, tgt: s[15], x2: s[2], y2: s[3] });   // (drawn in frame(), where the scene is)
      return true;
    },
    tracers: () => ({ live: tracers.length, total: tracerN, fromPart: tracerPart }),
    vanishes: () => vanishFrames,
    // a body whose dash the page draws itself (a Leaf Wizard with Wind walk on): the game's own streaks are left out
    ownDash: (b) => { const own = !!(PROJ && PROJ.windwalk && b && b.u && b.u.name === NAME && b.u.windWalk); if (own) wwOwnDash++; return own; },
    windwalkBands: () => wwBands.map(o => ({ gone: !!o.m.gone, vis: o.m.visible, inScene: !!o.m.parent, parent: o.m.parent && (o.m.parent.type + ':' + (o.m.parent.name || '')), pos: o.m.position.toArray().map(v => +v.toFixed(2)),
      sc: o.m.scale.toArray().map(v => +v.toFixed(2)), q: o.m.quaternion.toArray().map(v => +v.toFixed(2)), op: o.m.children.map(c => +c.material.opacity.toFixed(2)), tris: o.m.children.length * o.m.children[0].geometry.getAttribute('position').count / 3 })),
    windwalkTrack: (on) => { if (on !== undefined) wwTrack = on ? [] : null; return wwTrack; },   // (tests) [t, model's way gone, the game's way gone]
    windwalks: () => ({ dodges: wwDodgesSeen, glides: wwGlides, glideFrames: wwGlideFrames, leaves: wwLeaves, leanMax: +wwLeanMax.toFixed(1), last: wwLast, bandFrames: wwBandFrames, gameStreaksLeftOut: wwOwnDash, band: wwBandLast, bandsKept: wwBands.filter(o => !o.m.gone).length,
                        now: [...live.values()].filter(e => e.ww).length,
                        engine: [...live.keys()].reduce((s, b) => s + (b && typeof b === 'object' && b.wwDodges || 0), 0) }),
    charges: () => ({ starts: chargeStarts, frames: chargeFrames, now: [...live.values()].filter(e => e.state === 'charge').length, tintFrames: chargeTintFrames,
                      tint: [...live.values()].filter(e => e.state === 'charge' && e.mats[0]).map(e => e.mats[0].color.toArray().map(v => +v.toFixed(2)))[0] || null }),
    hidden: () => hidShots,
    // one of the engine's recorded flame wedges: true = it is this page's unit's, drawn by the page as a jet
    flameFx(s) {
      const J = PROJ && PROJ.jet;
      if (!J || s[11]) return false;   // (a ground slam / spinning blades are not fire)
      for (const [b, e] of live) {
        if (!b || typeof b !== 'object' || b.x !== s[0] || b.y !== s[1] || !b.u || b.u.name !== NAME) continue;
        const dx = s[2] - s[0], dy = s[3] - s[1], L = Math.hypot(dx, dy) || 1;
        const f = Math.abs(b.x) > 0.05 ? Math.sign(e.root.position.x / b.x) || 1 : 1;   // (the board may be seen from the other side)
        e.jet = { dx: dx / L * f, dz: -dy / L * f, reach: L, half: s[8], until: clockT + J.hold / (window.__battleSpeed || 1), acc: (e.jet && e.jet.acc) || 0 };
        jetShots++;
        return true;
      }
      return false;
    },
    // a body being reeled in on a hook (b.hooked: its Catcher): true = the page draws that chain itself
    hooked: (b) => !!(PROJ && PROJ.hook && hookGeo && b && b.hooked && b.hooked.u && b.hooked.u.name === NAME),
    hooks: () => ({ throws: hookThrows, reels: hookReels, homes: hookHomes, links: hookLinks, flyFrames: hookFlyFrames, hooksShown: hookPool.filter(m => m.visible).length,
                    handHookHidden: [...live.values()].filter(e => e.hookParts && e.hookParts.length && !e.hookParts[0].visible).length }),
    hookDebug: () => { const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), out = { geo: hookGeo ? hookGeo.getAttribute('position').count : 0, chain: chainInst ? { count: chainInst.count, inScene: !!chainInst.parent, visible: chainInst.visible } : null, hooks: hookPool.map(m => ({ vis: m.visible, inScene: !!m.parent, pos: m.position.toArray().map(x => +x.toFixed(1)), sc: +m.scale.x.toFixed(2) })), links: [] };
      if (chainInst) for (const i of [0, Math.max(0, chainInst.count - 1)]) { chainInst.getMatrixAt(i, m4); const sc = new THREE.Vector3(), q = new THREE.Quaternion(); m4.decompose(v, q, sc); out.links.push({ pos: v.toArray().map(x => +x.toFixed(1)), sc: sc.toArray().map(x => +x.toFixed(2)) }); }
      out.bodies = [...live.entries()].filter(([b]) => b && typeof b === 'object').map(([b, e]) => ({ root: e.root.position.toArray().map(x => +x.toFixed(1)), k: +e.root.scale.x.toFixed(2), fly: e.hookFly ? [+e.hookFly.x.toFixed(1), +e.hookFly.y.toFixed(1), +e.hookFly.z.toFixed(1), e.hookFly.seen] : null, hand: (h => h && h.toArray().map(x => +x.toFixed(1)))(PROJ.hook.hand && partMiddle(e, new RegExp(PROJ.hook.hand))) }));
      out.frameN = frameN; return out; },
    // one of the engine's frost beams (held): true = the page draws this unit's beam itself
    beamFx: (s) => beamNote(s),
    beams: () => { const L = []; for (const e of live.values()) if (e.beams) for (const B of e.beams.values()) L.push({ len: +B.len.toFixed(1), full: +(B.dist || 0).toFixed(1), w: +B.w.toFixed(2), px: B.px && +B.px.toFixed(1) }); return { hits: beamHits, starts: beamStarts, fromPart: beamFromPart, live: L }; },
    jets: () => ({ shots: jetShots, puffs: jetPuffs, fromPart: jetFromPart, on: [...live.values()].filter(e => e.jet && e.jet.until > clockT).length }),
    status: () => STATUS && Object.assign(STATUS.counts(), { tintFrames, tinted: [...live.values()].filter(e => e.tinted).map(e => e.mats[0] ? e.mats[0].color.toArray().map(v => +v.toFixed(2)) : null).slice(0, 3) }),
    statusSymbols: () => STATUS && STATUS.symbolCheck(bodiesSeen),
    flinches: () => ({ total: flinchN, live: [...live.values()].filter(e => e.flinch).length }),
    dashes: () => ({ frames: dashFrames, flagged: dashFlagFrames, starts: dashStarts, now: [...live.values()].filter(e => e.state === 'dash').length,
                     speeds: [...live.values()].filter(e => e.state === 'dash').map(e => +(e.vEng || 0).toFixed(0)) }),
    coasts: () => ({ live: coasting.length, total: coastN, last: coastLast }),
    risers: () => [...live.values()].filter(e => e.riser && e.riser.visible).map(e => +e.riser.position.y.toFixed(2)),
    body(d) {
      if (HIT && d.s && d.s.b) {   // every body drawn, whatever its unit: where it stands and how tall it is drawn
        const b0 = d.s.b; let i = bodiesSeen.get(b0);
        if (!i) { i = { n: b0.hitN || 0, t: -9 }; bodiesSeen.set(b0, i); }
        i.x = d.x; i.y = d.y; i.z = d.z; i.h = d.sc * d.top; i.r = d.sc; i.f = frameN;   // (r: the game's size for the body, its footprint)
      }
      if (!template || !(NAME ? d.s.u && d.s.u.name === NAME : d.kind === KIND)) return false;
      // (d.id: a name for a body that is not in a fight, given by the game's own renderer (scripts/make_game_units.py:
      // a squad being placed keeps its models while it is dragged); the pages give none: there it is its place)
      const b = d.s.b, key = b || d.id || `${d.s.side}|${d.x.toFixed(1)}|${d.z.toFixed(1)}`;
      let e = live.get(key);
      if (!e) { e = makeClone(); live.set(key, e); }
      seen.add(key);
      const k = d.sc * d.top / H;
      e.root.position.set(d.x, d.y, d.z);
      // WIND WALK (PROJ.windwalk { glide, lean, settle, swirl, streak }; the Leaf Wizard's dodge skill, 2026-11-25: the user
      // picked "Leaf swirl and a quick streak"). The engine MOVES a dodging body `step` metres in one tick (b.wwDodges
      // counts them). Here: leaves swirl up where it stood, the model is carried over in `glide` seconds instead of in one
      // frame, shedding a short green streak behind it, and it leans into the move as it arrives, then rights itself.
      // (The game's renderer slides a body from its last tick's place to this one's over the tick, a tenth of a second,
      // at an even pace: so on the frame a dodge is first seen the drawn place has hardly moved. The glide is a blend
      // from where the model was drawn then to wherever the game draws the body now, which holds either way; which way
      // it went is read from the engine's own places, tick to tick.)
      const WW = PROJ && PROJ.windwalk;
      if (WW && b) {
        const n = b.wwDodges || 0;
        if (e.wwN === undefined || n < e.wwN) e.wwN = n;   // (a new battle)
        if (!e.ww && Math.abs(b.x) > 0.5 && Math.abs(d.x) > 0.5) wwFlip = Math.sign(d.x / b.x) || 1;   // (the board may be seen from the other side)
        const ex0 = e.ex, ey0 = e.ey; e.ex = b.x; e.ey = b.y;
        if (n > e.wwN) {
          e.wwN = n; wwDodgesSeen++;
          if (e.prev && e.added && !e.dead && ex0 !== undefined) {
            const mx0 = (b.x - ex0) * wwFlip, mz0 = -(b.y - ey0) * wwFlip, L = Math.hypot(mx0, mz0), hk = k * H;
            // (never smaller on screen than cfg.px pixels across, up to cfg.px_max times their true size: from the far
            // top-down view a leaf of its true size is under a pixel)
            const wwBig = (cfg) => { const u = wwPpu(e.prev), r = (cfg.size[0] + cfg.size[1]) / 2 * k, m = u > 0 && cfg.px ? Math.min(cfg.px_max || 4, Math.max(1, cfg.px / (2 * r * u))) : 1;
              wwMul = +m.toFixed(2); return m > 1.001 ? Object.assign({}, cfg, { size: [cfg.size[0] * m, cfg.size[1] * m] }) : cfg; };
            if (WW.swirl) {
              const S = wwBig(WW.swirl), c = e.prev.clone(), sgn = n % 2 ? 1 : -1;
              for (let i = 0; i < S.count; i++) {
                const a = Math.random() * 6.283, r = (S.r[0] + Math.random() * (S.r[1] - S.r[0])) * hk;
                const pm = PFX.particle(e.root.parent, new THREE.Vector3(c.x + Math.cos(a) * r, c.y + (S.y[0] + Math.random() * (S.y[1] - S.y[0])) * hk, c.z + Math.sin(a) * r),
                                        new THREE.Vector3(0, S.rise * k * (0.6 + 0.8 * Math.random()), 0), S, k);
                pm.userData.orbit = { c, w: sgn * S.rps * 6.283 * (0.7 + 0.6 * Math.random()), out: S.out };
              }
              wwLeaves += S.count;
            }
            if (L > 0.3 * hk) { e.ww = { from: e.prev.clone(), t: 0, mx: mx0 / L, mz: mz0 / L, len: L, prev: null, fx: {}, streak: WW.streak && wwBig(WW.streak) }; wwGlides++; wwLast = { len: +L.toFixed(2), k: +k.toFixed(2), mul: wwMul }; }
          }
        }
        if (e.ww) {
          const W = e.ww; W.t += dtLast * (window.__slow || 1);
          if (W.t >= WW.glide + WW.settle || e.dead) { if (W.band) wwDrop(W.band); e.ww = null; }
          else {
            const u = Math.min(1, W.t / WW.glide), left = Math.pow(1 - u, 2.5);
            e.root.position.lerp(W.from, left);
            if (u < 1) {
              wwGlideFrames++;
              const at = e.root.position.clone().add(new THREE.Vector3(0, (WW.streak ? WW.streak.y : 0.5) * k * H, 0));
              if (W.streak && e.added && W.prev) PFX.emit(e.root.parent, W.prev, at, k, W.streak, W.fx);
              W.prev = at;
              if (wwTrack && wwTrack.length < 400) wwTrack.push([+W.t.toFixed(3), +Math.hypot(e.root.position.x - W.from.x, e.root.position.z - W.from.z).toFixed(2), +Math.hypot(d.x - W.from.x, d.z - W.from.z).toFixed(2)]);
            }
            // THE STREAK (WW.band { color, opacity, width, flat, y, fade, px }): one long faceted shard from where it
            // stood to where the model is; once it has arrived the tail runs in after it and the shard thins and fades
            // (`fade` seconds). (The first try was a handful of small slivers shed along the way: from the far view they
            // did not read as a streak at all.) Never thinner on screen than `px` pixels.
            if (WW.band) {
              const Bd = WW.band;
              if (!W.band && e.added) {
                for (let i = wwBands.length - 1; i >= 0; i--) { const o = wwBands[i]; if (o.m.gone || o.until < clockT) { if (!o.m.gone) wwDrop(o.m); wwBands.splice(i, 1); } }
                // (the user, 2026-11-25, on the first look, leaves and a lime shard: "different effect, too much leaf effects
                // right now, do a slightly lighter green (neonish) dash effect low opacity": the leaves are gone; the
                // dash is the shard alone, a light neon green core inside a wider, fainter one: Bd.glow { color, k, opacity })
                W.band = new THREE.Group(); W.band.add(PFX.mesh(Bd.color, 'streak', Bd.opacity));
                if (Bd.glow) { const gm = PFX.mesh(Bd.glow.color || Bd.color, 'streak', Bd.glow.opacity); gm.scale.set(Bd.glow.k, 1, Bd.glow.k); W.band.add(gm); }
                // (Bd.additive: its colour is ADDED to what is behind it, so it glows instead of covering: the neon look)
                if (Bd.additive) for (const c of W.band.children) c.material.blending = THREE.AdditiveBlending;
                e.root.parent.add(W.band); wwBands.push({ m: W.band, until: clockT + 6 });
              }
              if (W.band) {
                W.band.userData.f = frameN;   // (kept only while its body is still being drawn: see frame())
                const v = Math.max(0, Math.min(1, (W.t - WW.glide) / Bd.fade)), tu = v * v * (3 - 2 * v);
                const hx = e.root.position.x, hz = e.root.position.z, tx = W.from.x + (hx - W.from.x) * tu, tz = W.from.z + (hz - W.from.z) * tu;
                const len = Math.hypot(hx - tx, hz - tz);
                W.band.visible = len > 0.05 * k && tu < 0.999;
                if (W.band.visible) {
                  const pu = wwPpu(e.root.position), wd = Math.max(Bd.width * k * H, pu > 0 ? (Bd.px || 0) / 2 / pu : 0) * (1 - 0.5 * tu);
                  const dx = (hx - tx) / len, dz = (hz - tz) / len;
                  W.band.position.set((hx + tx) / 2, e.root.position.y + Bd.y * k * H, (hz + tz) / 2);
                  W.band.quaternion.setFromRotationMatrix(wwM.makeBasis(vTmp.set(-dz, 0, dx), wwV.set(dx, 0, dz), UPV));
                  W.band.scale.set(wd / 0.3, len / 2 / 1.25, wd * (Bd.flat || 0.5) / 0.3);
                  W.band.children[0].material.opacity = Bd.opacity * (1 - tu);
                  if (W.band.children[1]) W.band.children[1].material.opacity = Bd.glow.opacity * (1 - tu);
                  wwBandFrames++; wwBandLast = { len: +len.toFixed(2), halfW: +wd.toFixed(2), px: pu > 0 ? +(wd * 2 * pu).toFixed(1) : null };
                }
              }
            }
          }
        }
      }
      // FACING (the user, 2026-11-25: "is it a bug that the units are not turned towards where they are shooting?"). The
      // game turns a body only where it WALKS (its heading b.hx / b.hy is set by movement alone; nothing turns it when it
      // stops and attacks), which hardly shows on the game's own small models but does on these: a unit that stops and
      // shoots to one side kept facing the way it had been marching. Here (presentation only, the engine is untouched) a
      // body that is standing turns, smoothly, to face its target: the one it is winding up on, else the one it is on
      // (b.intent), else where its last shot went. Walking, it faces where it walks, as before. `?face=0` = the game's way.
      const yawE = 2 * Math.atan2(d.q.y, d.q.w), yawOnly = Math.abs(d.q.x) + Math.abs(d.q.z) < 1e-4;
      let want = yawE, tgtYaw = null, soon = Infinity, attacking = false, predTg = null, volAt = null;
      const vol = b ? aimsOf.get(b) : null;
      if (b && yawOnly) {
        // what it is attacking, in this order: the volley it has just let go (its follow-through; several enemies: the
        // middle of them), the enemy it is winding up on, the enemy it is locked on (b.lock), the enemy it walks to (b.intent)
        const bs0 = window.__battleSpeed || 1, period = 1 / Math.max(0.05, b.u.aps || 1) / bs0;
        // what the volley counts as: SEVERAL attacks at once only for split beams (b.u.beams > 1: the exception, all its
        // targets); otherwise ONE attack, at its main target, whatever else it also caught (a stomp's ring of enemies, a
        // shotgun's cone). A carrier's extra turrets fire on their own clocks at their own enemies: they do not turn it.
        const several = b.u.beams > 1, main = vol && (vol.tg.includes(b.lock) ? b.lock : vol.tg[0]);
        const shotAt = !vol || (b.u.turrets > 1 && !vol.tg.includes(b.lock)) ? null : several ? vol.tg : [main];
        volAt = shotAt;
        const fresh = shotAt && clockT - vol.t < Math.min(0.45, period * 0.6);          // just fired: hold the line of the shot
        const live = shotAt ? shotAt.filter(t => t.alive !== false) : [];
        const multi = several && live.length > 1 && clockT - vol.t < period * 1.5 + 0.3;   // the exception
        const wind = b.windTarget && b.windTarget.alive !== false ? b.windTarget : null;
        // (b.intent: the one it walks to, often not the one it will shoot)
        const nt = wind ? null : nextTarget(b);
        const tg = wind || (nt && nt.f) || (b.intent && b.intent.alive && b.intent) || null;
        predTg = tg;
        // (just fired: at what it shot, whether that still stands or not: a blow that fells its enemy is followed
        // through on that enemy, not swung round to the next one)
        let dir = fresh ? aimDir(d, shotAt, b) : multi ? aimDir(d, live, b) : null;
        if (!dir && tg) dir = aimDir(d, [tg], b);
        if (dir) tgtYaw = Math.atan2(-dir.x, -dir.z);
        else if (e.aim && (e.state === 'attack' || e.state === 'aim')) tgtYaw = Math.atan2(-e.aim.x, -e.aim.z);
        // when its next shot leaves (real seconds): the wind-up's end; else its reload, or the walk left until its
        // target is in reach, whichever is longer (a unit that winds up gets its wind-up to turn in)
        if (wind) soon = b.windT / bs0;
        else if (nt && !(b.u.windUp > 0)) soon = Math.max(Math.max(0, b.cd), Math.max(0, nt.d - (b.u.range || 0)) / Math.max(0.1, b.u.speed || 0)) / bs0;
        // it is attacking (not just walking up) when it winds up, has just fired, or its next shot is under half a second off
        attacking = !!(wind || fresh || multi || soon < 0.45);
        if (FACE && tgtYaw !== null && (attacking || !(e.speed > 0.35 * k))) want = tgtYaw;
      }
      if (e.yaw === undefined || !yawOnly) e.yaw = want;
      const dyaw = Math.atan2(Math.sin(want - e.yaw), Math.cos(want - e.yaw));
      // turned smoothly (9 a second), but always round in time: with a shot due it covers what is left of the turn in
      // the time that is left (so it is on its target as the shot leaves). The game picks a body's next enemy at the
      // very instant it fires (the nearest in reach its side is not already killing), so now and then a shot leaves
      // for an enemy nothing pointed to beforehand: on that frame the model is turned the whole way at once (the
      // game's shot is instant and cannot wait), so a shot never leaves across its body. (snapLog: how big those turns)
      let rate = Math.min(1, dtLast * 9);
      if (FACE && attacking && want === tgtYaw) {
        if (soon < 0.6) rate = Math.max(rate, Math.min(dtLast * 30, dtLast / Math.max(dtLast, soon * 0.7)));   // (never at once)
        if (vol && vol.f === frameN && !(b.u.beams > 1)) {   // (split beams: no one line to be on; it turns to their middle smoothly)
          rate = 1; const sn = Math.abs(dyaw) * 180 / Math.PI;
          if (snapLog.length < 5000) snapLog.push(sn);
          if (sn > 10) {   // (tests) why: was its target the one expected the frame before, and how soon was the shot thought to be?
            const P = e.pred || {}, why = !P.tg ? 'none' : vol.tg.includes(P.tg) ? 'right' : 'wrong';
            snapWhy[why] = (snapWhy[why] || 0) + 1;
            if (snapWhy.samples.length < 6) snapWhy.samples.push({ why, deg: +sn.toFixed(0), soonWas: P.soon === Infinity ? 'inf' : +(+P.soon).toFixed(2), attackingWas: P.attacking, speed: +(e.speed / k).toFixed(1),
              structure: !!(vol.tg[0].u && vol.tg[0].u.structure), predStructure: !!(P.tg && P.tg.u && P.tg.u.structure), lockWas: P.lock === vol.tg[0] ? 'same' : P.lock ? 'other' : 'none' });
          }
        }
      }
      e.pred = { tg: predTg, soon, attacking, lock: b && b.lock };
      e.yaw += dyaw * rate;
      if (vol && vol.f === frameN && !vol.logged && tgtYaw !== null) {   // (tests) this volley left on this frame: how far off it?
        vol.logged = true;
        const dir = volAt && aimDir(d, volAt, b);
        if (dir) {
          const ty = Math.atan2(-dir.x, -dir.z), off = Math.abs(Math.atan2(Math.sin(ty - e.yaw), Math.cos(ty - e.yaw))) * 180 / Math.PI;
          if (dir.n > 1) fireMulti++; else if (fireLog.length < 5000) fireLog.push(off);
          if (!fireWorst || off > fireWorst.off) fireWorst = { off: +off.toFixed(1), speed: +(e.speed / k).toFixed(2), state: e.state, wind: !!b.windTarget, cd: +b.cd.toFixed(2), n: dir.n };
        }
      }
      const offBy = (a) => tgtYaw === null ? null : Math.abs(Math.atan2(Math.sin(tgtYaw - a), Math.cos(tgtYaw - a))) * 180 / Math.PI;
      e.off = { model: offBy(e.yaw), engine: offBy(yawE) };   // (tests: degrees off its target, as drawn / as the game turns it)
      if (yawOnly) e.root.quaternion.setFromAxisAngle(UPV, e.yaw).multiply(spin); else e.root.quaternion.copy(d.q).multiply(spin);
      e.root.scale.setScalar(k);
      if (e.ww && WW) {   // tipped the way it goes, about its feet: in as it sets off, back past upright a little, then still
        const W = e.ww, u = (W.t - WW.glide) / WW.settle;
        const env = W.t < WW.glide ? 1 - Math.pow(1 - Math.min(1, W.t / (WW.glide * 0.45)), 3) : Math.cos(u * Math.PI * 1.5) * (1 - u) * (1 - u);
        e.root.quaternion.premultiply(qTmp.setFromAxisAngle(vTmp.set(W.mz, 0, -W.mx), WW.lean * Math.PI / 180 * env));
        wwLeanMax = Math.max(wwLeanMax, Math.abs(WW.lean * env));
      }
      if (e.flinch) {   // tipped away from the hit about its feet, pushed back a hair
        const F = e.flinch, w = F.amp * flEnv(F.t);
        e.root.quaternion.premultiply(qTmp.setFromAxisAngle(vTmp.set(F.az, 0, -F.ax), FL.root * Math.PI / 180 * w));
        e.root.position.x += F.ax * FL.push * k * H * w; e.root.position.z += F.az * FL.push * k * H * w;
      }
      if (PROJ && PROJ.rise && b) riserFor(e, b, d, k);
      // stealth: see-through as the game's ghost looks (yours faint, the opponent's fainter)
      // a status tints the body (scripts/status_fx.js tint(): burn warms it, poison greens it, a tick flashes)
      // (and a charge: the user on the Bullhead, 2026-11-25: "can you give him a slightly red colour tint when hes charging
      // aswell?": PROJ.charge.tint { color, w }, eased in and out over about a tenth of a second)
      if (b) {
        let tn = STATUS ? STATUS.tint(b) : null;
        const CT = PROJ && PROJ.charge && PROJ.charge.tint;
        if (CT) {
          e.chargeW = (e.chargeW || 0) + ((e.state === 'charge' ? 1 : 0) - (e.chargeW || 0)) * Math.min(1, dtLast * 10);
          if (e.chargeW > 0.02) { const c = chargeCol || (chargeCol = new THREE.Color(CT.color)), w = CT.w * e.chargeW; tn = tn || [1, 1, 1]; tn = [tn[0] * (1 + (c.r - 1) * w), tn[1] * (1 + (c.g - 1) * w), tn[2] * (1 + (c.b - 1) * w)]; chargeTintFrames++; }
        }
        if (tn || e.tinted) { for (const m of e.mats) m.color.setRGB(tn ? tn[0] : 1, tn ? tn[1] : 1, tn ? tn[2] : 1); e.tinted = !!tn; if (tn) tintFrames++; }
      }
      const look = window.__anim.solid ? 'solid' : d.look;   // "Show solid": ignore stealth, to judge the motion
      if (e.look !== look) {
        e.look = look;
        const op = look === 'ghost' ? 0.45 : look === 'ghostFoe' ? 0.2 : look === 'glass' ? 0.55 : 1;
        for (const m of e.mats) { m.transparent = op < 1; m.opacity = op; m.depthWrite = op >= 1; m.needsUpdate = true; }
      }
      // speed over the ground (the drawn glide, per real second) -> which clip, and how fast
      const p = e.root.position;
      if (e.prev && !e.ww) { const v = Math.hypot(p.x - e.prev.x, p.z - e.prev.z) / Math.max(dtLast, 1e-3); e.speed += (v - e.speed) * Math.min(1, dtLast * 10); }
      e.prev = p.clone();
      const bs = window.__battleSpeed || 1;
      if (b && b.u && b.u.ram && e.state !== 'attack' && e.actions.Attack && (b.intent || b.rammed)) {
        // a ram (Just a Horse) never "attacks": it drives into its target, hits once at RAM_REACH and falls. Start
        // Attack so its hit frame (ATTACK_LEAD) meets that moment, and keep the body on screen until the clip ends
        const tgt = b.rammed || b.intent, left = b.rammed ? 0 : (Math.hypot(tgt.x - b.x, tgt.y - b.y) - RAM_REACH) / Math.max(0.1, b.u.speed);
        if (left <= ATTACK_LEAD) { e.state = 'attack'; e.hold = true; play(e, 'Attack', 0.1, true, ATTACK_LEAD - Math.max(0, left)); e.actions.Attack.timeScale = bs; }
      }
      if (LAUNCH && b && e.state !== 'attack' && e.actions.Attack) {
        // start Attack so its launch meets the engine's shot: the wind-up's end (the first shot), or the reload's
        // (a unit with no wind-up: its reload, while it stands and has a target)
        const toFire = b.windTarget ? b.windT : b.setUp ? b.cd : !(b.u.windUp > 0) && e.state !== 'walk' && b.intent ? b.cd : Infinity;
        if (toFire > 0 && toFire <= LAUNCH) {
          const name = e.actions.AttackL && (e.alt = !e.alt) ? 'AttackL' : 'Attack';   // (two attack clips: strike by strike)
          e.state = 'attack'; play(e, name, 0.15, true, LAUNCH - toFire); e.actions[name].timeScale = bs;
        }
      }
      if (b && b.lastAtk != null && b.lastAtk !== e.lastAtk) {
        const first = e.lastAtk === null; e.lastAtk = b.lastAtk;
        if (!first && !(LAUNCH && e.state === 'attack')) {   // (LAUNCH: already playing for this shot or burst)
          // a unit with a second attack clip (AttackL: the left punch) alternates them strike by strike
          const name = e.actions.AttackL && (e.alt = !e.alt) ? 'AttackL' : 'Attack';
          e.state = 'attack'; play(e, name, 0.08, true, LAUNCH || ATTACK_LEAD * 0.5); e.actions[name].timeScale = bs;
        }
      }
      if (b && b.u && b.u.hook && e.actions.Throw) {
        const out = !!b.hookOut;
        if (out && !e.hookOut && e.state !== 'attack') { e.state = 'throw'; play(e, 'Throw', 0.08, true, THROW_START); e.actions.Throw.timeScale = bs; }
        if (out && b.hookTgts && e.actions.Reel && e.state !== 'reel' && e.state !== 'attack' &&
            (e.state !== 'throw' || e.actions.Throw.time > 0.75)) { e.state = 'reel'; play(e, 'Reel', 0.2); }
        if (!out && (e.state === 'throw' || e.state === 'reel')) e.state = '';
        if (out !== e.hookOut) { e.hookOut = out; for (const o of e.hookParts) o.visible = !out; }
      }
      const DS = PROJ && PROJ.dash;
      // (2026-11-24, found in the review's test: the engine also flags dashes of a step or two, under a metre, which
      // flashed the lunge for one or two frames: the lunge now starts only once a dash has lasted 3 frames, and its
      // lean and sink ease in and out instead of switching)
      // (2026-11-24, the user: "the dash seems to activate more than it should". Measured in a 6 v 6: the engine flagged
      // 110 dashes in 11 s, 75 of them under 3 m, and keeps the flag up on a body that is jostling in a crowd just out
      // of reach, so the lunge was mostly shown on Assassins that hardly moved. The flag alone is not a dash: the lunge
      // now needs the body to be REALLY travelling at dash speed (its engine place, tick to tick: DS.min_speed m/s; a
      // walk is 6, a dash 30) and, to begin, a target still DS.min_gap m beyond its reach.)
      const btNow = window.__lab3d && window.__lab3d.bt ? window.__lab3d.bt.time() : 0;
      if (DS && b) {
        if (e.vT === undefined || btNow < e.vT) { e.vT = btNow; e.vx = b.x; e.vy = b.y; e.vEng = 0; }
        else if (btNow > e.vT) { e.vEng = Math.hypot(b.x - e.vx, b.y - e.vy) / (btNow - e.vT); e.vT = btNow; e.vx = b.x; e.vy = b.y; }
      }
      const flagged = !!(DS && b && b.dashing && e.state !== 'attack');
      const gapNow = flagged && b.intent ? Math.hypot(b.intent.x - b.x, b.intent.y - b.y) - (b.u.range || 0) : 0;
      const minV = DS ? (DS.min_speed ?? 15) : 0;
      const dashOn = flagged && (e.state === 'dash' ? e.vEng >= minV * 0.8 : e.vEng >= minV && gapNow >= (DS.min_gap ?? 3));
      if (flagged) dashFlagFrames++;
      e.dashN = dashOn ? (e.dashN || 0) + 1 : 0;
      if (dashOn && (e.dashN >= 2 || e.state === 'dash')) {
        if (e.state !== 'dash') { e.state = 'dash'; dashStarts++; play(e, DS.clip, 0.06);
          // (time: one held frame of that clip, the first stand-in; none: a keyed Dash clip, played as it is)
          if (DS.time != null) { e.actions[DS.clip].timeScale = 0; e.actions[DS.clip].time = DS.time; } else e.actions[DS.clip].timeScale = window.__battleSpeed || 1; }
        dashFrames++;
      } else if (e.state === 'dash') { e.state = ''; e.dashPrev = null; if (DS) e.actions[DS.clip].timeScale = 1; }
      // CHARGE (PROJ.charge { clip, rate, dust }; the Brute's Bullhead, 2026-11-25: the user picked "Head-down shoulder
      // charge"): while the engine charges the body through its target (b.charging: twice its speed, on past it) the
      // keyed Charge clip plays, and a little dust is kicked up behind it. It takes over from the punch that set it off.
      const CH = PROJ && PROJ.charge;
      if (CH && b && e.actions[CH.clip] && !e.dead) {
        const on = !!b.charging;
        if (on && e.state !== 'charge') { e.state = 'charge'; chargeStarts++; play(e, CH.clip, 0.1); e.actions[CH.clip].timeScale = (window.__battleSpeed || 1) * (CH.rate || 1); }
        else if (!on && e.state === 'charge') { e.state = ''; e.chargePrev = null; }
        if (e.state === 'charge') {
          chargeFrames++;
          const at = e.root.position.clone().add(new THREE.Vector3(0, (CH.dust_y || 0.06) * k * H, 0));
          if (CH.dust && e.added && e.chargePrev) PFX.emit(e.root.parent, e.chargePrev, at, k, CH.dust, e.chargeFx || (e.chargeFx = {}));
          e.chargePrev = at;
        }
      }
      if (DS) {
        e.dashW = (e.dashW || 0) + ((e.state === 'dash' ? 1 : 0) - (e.dashW || 0)) * Math.min(1, dtLast * 18);
        if (e.dashW > 0.01) {   // pitched forward the way it is heading, and low
          const fw = vTmp.set(0, 0, 1).applyQuaternion(e.root.quaternion); fw.y = 0; fw.normalize();
          const fx = fw.x, fz = fw.z;
          e.root.quaternion.premultiply(qTmp.setFromAxisAngle(new THREE.Vector3(fz, 0, -fx), DS.lean * e.dashW * Math.PI / 180));
          e.root.position.y -= DS.sink * e.dashW * k * H;
        }
        if (e.state === 'dash') {
          if (DS.streak && e.added && e.dashPrev) PFX.emit(e.root.parent, e.dashPrev, e.root.position.clone().add(new THREE.Vector3(0, DS.streak.y * k * H, 0)), k, DS.streak, e.dashFx || (e.dashFx = {}));
          e.dashPrev = e.root.position.clone().add(new THREE.Vector3(0, DS.streak ? DS.streak.y * k * H : 0, 0));
        }
      }
      if (e.state !== 'attack' && e.state !== 'throw' && e.state !== 'reel' && e.state !== 'dash' && e.state !== 'charge') {
        // a unit with an Aim clip (the Sniper) holds it while it is set up or winding up to shoot (the engine's
        // setUp / windTarget), instead of idling; its Attack (the shot's recoil) starts and ends on that aim
        const aiming = e.actions.Aim && b && (b.setUp || b.windTarget);
        const want = e.speed > 0.35 * k ? 'walk' : aiming ? 'aim' : 'idle';
        if (want !== e.state) { e.state = want; play(e, want === 'walk' ? 'Walk' : want === 'aim' ? 'Aim' : 'Idle', 0.25); }
        if (want === 'walk') e.actions.Walk.timeScale = WALK_SPEED > 0 ? Math.max(0.4, Math.min(4, e.speed / (WALK_SPEED * k))) : bs;   // a floater: no feet to match
      }
      return true;
    },
    // SKY_DROP: one of this unit's projectiles in flight (called by render3d's projectile pass); true = drawn here
    proj(p, f, gy, bt) {
      if (PROJ && PMODE === 'off') return false;
      // hide_shot: this unit's shot is not drawn at all (the Rogue, 2026-11-24: the game gives it a shot that flies 4 m,
      // its attack clips are a dagger lunge and a slash; the user picked "Treat it as melee")
      if (PROJ && PROJ.hide_shot && p.owner && p.owner.u && p.owner.u.name === NAME) { if (!p._hid) { p._hid = true; hidShots++; } return true; }
      if (PROJ && PROJ.hook && hookGeo && p.hook && p.owner && p.owner.u && p.owner.u.name === NAME) {   // its hook in flight: drawn in frame()
        const e = live.get(p.owner);
        if (e) { const x = p.x * f, z = -p.y * f; if (!p._seen) { p._seen = true; hookThrows++; } e.hookFly = { x, z, y: gy(x, z), dx: p.dirX * f, dz: -p.dirY * f, seen: frameN }; }
        gyLast = gy;
        return true;
      }
      if (PROJ && projSrc.length && p.owner && p.owner.u && p.owner.u.name === NAME) {
        const own = live.get(p.owner), k = own ? own.root.scale.x : 2.5;
        const rem = flightLeft(p, bt);
        const lx = (p.x + p.dirX * rem) * f, lz = -(p.y + p.dirY * rem) * f;
        const land = new THREE.Vector3(lx, gy(lx, lz) + PROJ.hit_y * k, lz);
        btLast = bt; gyLast = gy;
        let m = shots.get(p);
        if (!m) {
          const g = new THREE.Group();
          // (instanced: the shot is only a point with a heading here; its mesh is one of the one-draw-call instances)
          let piv = null; const spinRe = PROJ.spin ? new RegExp(PROJ.spin.part) : null;   // (spin: those parts hang on a pivot that turns)
          if (!(inst && PMODE === 'inst')) for (const s of projSrc) { const mm = new THREE.Mesh(s.geo, s.mat); mm.matrixAutoUpdate = false; mm.matrix.copy(s.m); mm.castShadow = true;
            if (spinRe && spinRe.test(s.name)) { if (!piv) { piv = new THREE.Object3D(); piv.name = '__spin'; g.add(piv); } piv.add(mm); } else g.add(mm); }
          if (PROJ.glow) { g.userData.glow = glowSprite(PROJ.glow); g.add(g.userData.glow); }
          const liquid = !!PROJ.water;
          // where it leaves: the middle of the named part of its owner's model (the throwing hand), as posed right now
          const from = new THREE.Vector3(p.fx * f, gy(p.fx * f, -p.fy * f) + 1.1 * k, -p.fy * f);
          let fromHand = false;
          if (PROJ.ground) {   // it starts on the ground in front of the unit: where it rose during the wind-up
            if (own && own.riser && own.riser.visible) { from.copy(own.riser.position); own.riser.visible = false; fromHand = true; }
            else { const ah = (PROJ.rise ? PROJ.rise.ahead : 0.8) * k; from.set(p.fx * f + p.dirX * f * ah, gy(p.fx * f, -p.fy * f), -p.fy * f - p.dirY * f * ah); }
          }
          if (own && PROJ.from && !PROJ.ground) {
            own.root.updateMatrixWorld(true);
            // (a unit that alternates two attack clips throws with the other hand in the second: PROJ.from_alt)
            const alt = PROJ.from_alt && own.cur && own.cur === own.actions.AttackL;
            const re = new RegExp(alt ? PROJ.from_alt : PROJ.from), box = new THREE.Box3();
            own.root.traverse(o => {   // (a part with several colours loads as a group of meshes: match its ancestors too)
              if (!o.isMesh) return;
              for (let a = o; a && a !== own.root; a = a.parent) if (re.test(a.name)) { box.expandByObject(o); fromHand = true; break; }
            });
            if (fromHand) box.getCenter(from);
          }
          m = { g, from, fromHand, liquid, atk0: own && own.cur ? +own.cur.time.toFixed(3) : null, clip0: own && own.cur ? own.cur.getClip().name : null,
                st0: own ? own.state : null, rem0: Math.max(rem, 1e-3), added: false, u: 0, roll: Math.random() * 6, prev: from.clone(), fx: {} };
          shots.set(p, m);
          if (own) { own.aim = land.clone().sub(from); own.aim.y = 0; if (own.aim.lengthSq() > 1e-6) own.aim.normalize(); else own.aim = null; }
          if (shotLog.length < 400) shotLog.push({ atk0: m.atk0, st0: m.st0, clip: m.clip0, fromHand, lastAtk: p.owner.lastAtk,
                                                   side: own ? +own.root.worldToLocal(from.clone()).x.toFixed(2) : null });
        }
        const u = Math.min(1, Math.max(0, 1 - rem / m.rem0));
        const pos = m.from.clone().lerp(land, u);
        if (PROJ.lob > 0) pos.y += PROJ.lob * m.from.distanceTo(land) * 4 * u * (1 - u);
        const dir = pos.clone().sub(m.prev);
        if (dir.lengthSq() < 1e-8) dir.copy(land).sub(m.from);
        m.g.position.copy(pos);
        m.owner = p.owner;
        m.eng = { x: p.x + p.dirX * rem, y: p.y + p.dirY * rem, dx: p.dirX, dy: p.dirY, side: p.owner.side, pierce: p.owner.u.pierce || 0 };
        // drawn bigger the farther the camera is (as the game widens its own shots), so it still reads from the
        // battlefield views; from close by (the shot view) it is its true size
        const cp = window.__anim.chasing && window.__anim._cam ? window.__anim._cam : camLast && camLast.position;   // (a chase view moves the camera after this pass)
        const far = cp ? Math.max(1, Math.min(PROJ.far || 1.9, cp.distanceTo(pos) / 30)) : 1;
        m.far = far;
        m.g.scale.setScalar(k * PROJ.size * far);
        m.g.lookAt(pos.clone().add(dir));   // (the GLB's nose is +z)
        (m.fdir || (m.fdir = new THREE.Vector3())).copy(dir).normalize();
        m.age = (m.age || 0) + dtLast * (window.__battleSpeed || 1) / 1.5;
        if (m.liquid) { if (!m.wat) waterInit(m); waterWobble(m); }
        if (PROJ.ground) {
          const step = Math.hypot(pos.x - m.prev.x, pos.z - m.prev.z), hl = Math.hypot(land.x - m.from.x, land.z - m.from.z) || 1;
          m.wx = (land.x - m.from.x) / hl; m.wz = (land.z - m.from.z) / hl;
          if (dtLast > 0 && step > 0) m.speedW = step / dtLast;
          rollOn(m, pos, PROJ.ground.radius * k * PROJ.size * far, step);
        } else if (PROJ.flutter) {   // { deg, hz, sway }: rocks a little about its length and yaws a hair, point still first
          const fl = PROJ.flutter, w = m.age * fl.hz * 6.283 + m.roll;
          m.g.rotateY(Math.sin(w * 0.7) * (fl.sway || 0) * Math.PI / 180);
          m.g.rotateZ(Math.sin(w) * fl.deg * Math.PI / 180);
        } else {
          m.roll += (PROJ.roll || 0) * 6.283 * dtLast * (window.__battleSpeed || 1) / 1.5;
          if (!PROJ.upright) m.g.rotateZ(m.roll);   // (upright: a shot with a top and a bottom, the Necromancer's skull)
        }
        // spin { part, rps }: named parts of the model turn about its length on their own (the skull's coiling tail)
        if (PROJ.spin) {
          if (!m.spinParts) { m.spinParts = []; m.g.traverse(o => { if (o.name === '__spin') m.spinParts.push(o); }); }
          m.spinA = (m.spinA || 0) + PROJ.spin.rps * 6.283 * dtLast * (window.__battleSpeed || 1) / 1.5;
          for (const o of m.spinParts) o.rotation.z = m.spinA;
        }
        // the shot's velocity, for a haze that keeps pace with it: its direction as drawn, but never faster than the
        // engine flies it (when the predicted landing jumps, e.g. its target dies, the drawn shot jumps for a frame, and
        // puffs born then were flung up to 15 m past the target: the user, "particles moving through and behind")
        if (m.g.userData.glow) m.g.userData.glow.material.opacity = PROJ.glow.opacity * (1 + (PROJ.glow.pulse || 0) * Math.sin(m.age * (PROJ.glow.hz || 9) * 6.283));
        if (dtLast > 0) {
          const vv = pos.clone().sub(m.prev), top = (p.speed || p.owner.u.projSpeed || 20) * (window.__battleSpeed || 1);
          if (vv.lengthSq() > 1e-10) m.fx.vel = vv.normalize().multiplyScalar(Math.min(top, pos.distanceTo(m.prev) / dtLast));
        }
        if (PFX && PROJ.trail && m.added) PFX.emit(m.g.parent, m.prev, pos, k * PROJ.size * far, PROJ.trail, m.fx);
        m.prev.copy(pos); m.u = u; m.seen = true; m.k = k * PROJ.size * far;
        m.ground = new THREE.Vector3(lx, gy(lx, lz), lz); m.R = p.owner.u.splash || 0;   // (where and how wide it will splash)
        if (own) own.landAt = m.ground;
        return true;
      }
      if (!SKY_DROP || !dropSrc.length || !p.owner || !p.owner.u || p.owner.u.name !== NAME) return false;
      let m = drops.get(p);
      // one meteor per volley (the user, 2026-11-21: "only 1 meteor not 3"): a burst's further shots, while its first
      // is still falling, aren't drawn at all (the engine still deals their hits)
      if (!m && [...drops.values()].some(o => o.owner === p.owner && !o.hidden)) { m = { hidden: true, owner: p.owner }; drops.set(p, m); }
      if (m && m.hidden) { m.seen = true; return true; }
      if (!m) {
        const g = new THREE.Group();
        for (const s of dropSrc) { const mm = new THREE.Mesh(s.geo, s.mat); mm.matrixAutoUpdate = false; mm.matrix.copy(s.m); mm.castShadow = true; g.add(mm); }
        m = { g, added: false, owner: p.owner, d0: Math.hypot(p.tx - p.fx, p.ty - p.fy) || 1, spin: Math.random() * 6 };
        drops.set(p, m);
      }
      const own = live.get(p.owner), k = (own ? own.root.scale.x : 2.5) * DROP_SIZE;
      // where it will land: the engine's shot hits the first enemy body it flies into (within PROJ_HIT 1 m), or lands
      // at its aim point; so it lands where the line first meets an enemy, as they stand now
      const rem = flightLeft(p, bt);
      const lx = (p.x + p.dirX * rem) * f, lz = -(p.y + p.dirY * rem) * f, ly = gy(lx, lz) + dropR * k;
      const q = Math.min(1, rem / m.d0), h = DROP_H * (0.5 * q + 0.5 * q * q);   // falling faster as it nears (q: 1 -> 0)
      let hx = p.fx * f - lx, hz = -p.fy * f - lz; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
      m.g.position.set(lx + hx * 0.35 * h, ly + h, lz + hz * 0.35 * h);   // coming in at a slant from the caller's side
      const u = 1 - q;
      m.g.scale.setScalar(k);
      m.g.rotation.set(0, m.spin + u * 9, 0);
      m.seen = true;
      return true;
    },
    // a close chase camera on one of them (presentation only; the game's own views are the level chips)
    chasing: false, chaseKey: null,
    // chase(true): "Follow one", from in front; chase('shot'): "Shot view", from its side looking along its aim, so a
    // shot is seen leaving the hand and flying off (the user, 2026-11-24: "see it being shot close by")
    chase(on) {
      this.chasing = on; this.chaseKey = null; this._cam = null; this._aim = null;
      const b = document.getElementById('chaseBtn'); if (b) b.setAttribute('aria-pressed', String(on === true));
      const c = document.getElementById('shotBtn'); if (c) c.setAttribute('aria-pressed', String(on === 'shot'));
      const h = document.getElementById('hitBtn'); if (h) h.setAttribute('aria-pressed', String(on === 'hit'));
      this._land = null;
    },
    frame(scene, dt, camera) {
      dtLast = dt; camLast = camera || camLast;
      frameN++; clockT += dt;
      // a Wind walk's streak whose body was not drawn this frame (it died, or the battle was cleared, within the half
      // second the streak lasts) goes with it: found in the test, two streaks left hanging after a battle
      for (let i = wwBands.length - 1; i >= 0; i--) { const o = wwBands[i]; if (o.m.gone || (o.m.userData.f || 0) < frameN - 1) { if (!o.m.gone) wwDrop(o.m); wwBands.splice(i, 1); } }
      if (HIT) for (const [b, i] of bodiesSeen) {
        const n = b.hitN || 0;
        if (n !== i.n) {
          i.n = n;
          if (clockT - i.t >= HIT.min_gap) { i.t = clockT; this.hitAt(scene, b, i); }
        }
        if (frameN - i.f > 90) bodiesSeen.delete(b);   // (a body that fell is still here for its last hit; then forgotten)
      }
      if (PUFFS) PUFFS.update(dt);
      PFX.update(dt * (window.__slow || 1));
      if (this.chasing && camera) {
        if (!live.has(this.chaseKey)) this.chaseKey = [...live.keys()].find(k => seen.has(k)) || null;
        const e = live.get(this.chaseKey);
        if (e) {
          const t = e.root.position, s = e.root.scale.x;
          const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(e.root.quaternion); fwd.y = 0; fwd.normalize();
          const side = new THREE.Vector3(-fwd.z, 0, fwd.x);   // toward the figure's right, so the blade arm shows
          const shot = this.chasing === 'shot' || this.chasing === 'hit';
          if (shot && e.aim) { this._aim = this._aim ? this._aim.lerp(e.aim, Math.min(1, dt * 3)).normalize() : e.aim.clone(); fwd.copy(this._aim); side.set(-fwd.z, 0, fwd.x); }
          const goal = shot ? t.clone().addScaledVector(fwd, 2.4 * s).addScaledVector(side, 7.5 * s).add(new THREE.Vector3(0, 3.0 * s, 0))
                            : t.clone().addScaledVector(fwd, 6.0 * s).addScaledVector(side, 4.5 * s).add(new THREE.Vector3(0, 4.2 * s, 0));
          this._cam = this._cam ? this._cam.lerp(goal, Math.min(1, dt * 4)) : goal;
          camera.position.copy(this._cam); camera.up.set(0, 1, 0);
          if (this.chasing === 'hit' && e.landAt) {
            // chase('hit'): "Impact view": close to where its shots land, looking back along the flight a little from
            // the side, so the shot is seen coming in and splashing
            this._land = this._land ? this._land.lerp(e.landAt, Math.min(1, dt * 2.5)) : e.landAt.clone();
            const L = this._land, g2 = L.clone().addScaledVector(fwd, 7.0 * s).addScaledVector(side, 7.5 * s).add(new THREE.Vector3(0, 5.0 * s, 0));
            this._cam.copy(g2); camera.position.copy(g2); camera.lookAt(L.x, L.y + 0.6 * s, L.z);
          } else if (shot) { const a = t.clone().addScaledVector(fwd, 2.4 * s); camera.lookAt(a.x, a.y + 0.9 * s, a.z); }
          else camera.lookAt(t.x, t.y + 1.0 * s, t.z);
        }
      }
      // (after a chase view has moved the camera: the status effects sit on the side of a body the camera sees)
      if (STATUS) { if (camLast) camLast.updateMatrixWorld(); STATUS.update(scene, dt * (window.__slow || 1), bodiesSeen, frameN, camLast); }
      for (const [key, e] of live) {
        if (!seen.has(key)) {
          if (e.hold && e.state === 'attack') { e.mixer.update(dt); continue; }   // a ram that fell: its clip plays out
          if (!e.dead && e.added && key && typeof key === 'object' && key.alive === false && e.actions.Death) {
            const name = e.actions.DeathF && Math.random() < 0.5 ? 'DeathF' : 'Death';
            const bs = window.__battleSpeed || 1;
            e.dead = { t: 0, len: e.actions[name].getClip().duration / bs, y0: e.root.position.y, bs };
            e.state = 'dead'; play(e, name, 0.1, true); e.actions[name].timeScale = bs;
            for (const o of e.hookParts) o.visible = true;
          }
          if (e.dead) {
            e.dead.t += dt; e.mixer.update(dt);
            if (PUFFS && !e.dead.puffed && e.dead.t >= DEATH_FX.puff.at / e.dead.bs) {   // the poof: a dust cloud where it stands
              e.dead.puffed = true;
              const k = e.root.scale.x;
              PUFFS.spawn(scene, e.root.position.clone().add(new THREE.Vector3(0, DEATH_FX.puff.y * k, 0)), DEATH_FX.puff.size * k, DEATH_FX.puff);
            }
            const u = (e.dead.t - e.dead.len - DEAD_LIE) / DEAD_FADE;
            if (u > 0) {
              if (!e.dead.fading) {   // see-through from here (a copy of each material's opacity to fade from)
                e.dead.fading = e.mats.map(m => m.opacity);
                for (const m of e.mats) { m.transparent = true; m.depthWrite = false; m.needsUpdate = true; }
              }
              e.mats.forEach((m, k) => { m.opacity = e.dead.fading[k] * Math.max(0, 1 - u); });
              e.root.position.y = e.dead.y0 - Math.min(1, u) * e.root.scale.x * 0.25;
            }
            if (u < 1) continue;
          }
          scene.remove(e.root); live.delete(key); continue;
        }
        if (!e.added) { scene.add(e.root); e.added = true; }
        e.mixer.update(dt);
        // vanish { node, from, to }: a joint of the model is shrunk away for that stretch of its Attack clip (the
        // Truespear: its clip flies the spear off ahead from the hand; on a page the spear's own model flies instead)
        if (PROJ && PROJ.vanish && e.state === 'attack' && e.cur) {
          const V = PROJ.vanish, t = e.cur.time;
          if (t >= V.from && t < V.to) { const nd = e.vanishNode || (e.vanishNode = e.root.getObjectByName(V.node)); if (nd) { nd.scale.setScalar(1e-3); vanishFrames++; } }
        }
        if (e.flinch) { e.flinch.t += dt * (window.__slow || 1); if (e.flinch.t >= FL.life + FL.lag * 2) { flinchBones(e); e.flinch = null; } else flinchBones(e); }
        if (e.riser) {
          if (!e.riserAdded) { scene.add(e.riser); e.riserAdded = true; }
          if (e.rising && e.riser.visible && PROJ.rise.dirt) {   // dirt thrown up where it breaks the ground
            e.riserAcc += dt * (window.__slow || 1) * (PROJ.rise.dirt.rate || 20);
            while (e.riserAcc >= 1) { e.riserAcc -= 1; PFX.burst(scene, e.riserGround, e.riserK, PROJ.rise.dirt); }
          }
        }
      }
      for (const [key, e] of live) if (e.riser && !seen.has(key)) e.riser.visible = false;
      // instant shots fired since the last frame: their trails
      if (PROJ && PROJ.hook && hookGeo) {
        const HK = PROJ.hook, sdt = dt * (window.__slow || 1); let nl = 0, nh = 0;
        if (!chainInst) { chainInst = chainMesh(HK); scene.add(chainInst); }
        const cv = document.querySelector('#view canvas'), vh = (cv && cv.clientHeight) || 600, cp = camPos();
        for (const [b, e] of live) {
          if (!b || typeof b !== 'object' || !e.added) continue;
          const k = e.root.scale.x, ends = [];
          if (!e.dead) {
            // (the chain's near end is the FIST: the model's `hook` joint is no use here, the Throw clip flings it off
            // ahead of him: 12 m away and 8 m up when first tried)
            const hand = (HK.hand && partMiddle(e, e.hookHandRe || (e.hookHandRe = new RegExp(HK.hand)))) || e.root.position.clone().add(new THREE.Vector3(0, 0.6 * k * H, 0));
            if (e.hookFly && e.hookFly.seen >= frameN - 1) {   // in flight: out from the hand's height to chest height over its first metres
              const F = e.hookFly, d = Math.hypot(F.x - hand.x, F.z - hand.z), yy = hand.y + (F.y + HK.fly_y * k * H - hand.y) * Math.min(1, d / 5);
              ends.push({ p: new THREE.Vector3(F.x, yy, F.z), dir: new THREE.Vector3(F.dx, 0, F.dz).normalize(), sag: HK.sag }); hookFlyFrames++;
            } else if (b.hookTgts) for (const t of b.hookTgts) {   // reeling: the hook is in each body it caught
              if (t.hooked !== b) continue;
              const ti = bodiesSeen.get(t); if (!ti) continue;
              const P = new THREE.Vector3(ti.x, ti.y + HK.bite_y * ti.h, ti.z), dir = P.clone().sub(hand); dir.y = 0; if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); dir.normalize();
              if (!t._reelSeen) { t._reelSeen = true; hookReels++; }
              ends.push({ p: P, dir, sag: HK.sag * 0.2 });
            }
            if (ends.length) e.hookLast = { p: ends[0].p.clone(), dir: ends[0].dir.clone(), t: 0 };
            else if (e.hookLast) {   // done: the hook comes home up the chain
              const L = e.hookLast; L.t += sdt / HK.home;
              if (L.t >= 1) { e.hookLast = null; hookHomes++; }
              else { const u = L.t * L.t * (3 - 2 * L.t); ends.push({ p: L.p.clone().lerp(hand, u), dir: L.dir, sag: HK.sag * 0.2 }); }
            }
            const far = cp ? Math.max(1, Math.min(HK.far || 1.8, cp.distanceTo(hand) / 30)) : 1;
            const ppu = cp && camLast && camLast.isPerspectiveCamera ? vh / 2 / (Math.tan(camLast.fov * Math.PI / 360) * Math.max(0.1, cp.distanceTo(hand))) : 0;
            for (const E of ends) {
              let m = hookPool[nh++];
              if (!m) { m = new THREE.Mesh(hookGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.frustumCulled = false; m.castShadow = true; scene.add(m); hookPool.push(m); }
              m.visible = true; m.position.copy(E.p); m.scale.setScalar(k * (HK.size || 1) * far);
              m.lookAt(E.p.x + E.dir.x, E.p.y, E.p.z + E.dir.z);
              // the chain: links from the hand to the hook's eye, each a quarter turn on from the last, sagging a little
              _hv.copy(E.p).sub(hand); const dist = _hv.length(); if (dist < 1e-3) continue;
              const L = HK.link.len * k, n = Math.min(HK.link.most || 260, Math.max(1, Math.ceil(dist / (L * 0.82)))), step = dist / n;
              const th = Math.max(HK.link.thick * k * far, ppu > 0 ? (HK.min_px || 0) / 2 / ppu : 0);
              _hq.setFromUnitVectors(Y_AX, _hv.multiplyScalar(1 / dist));
              for (let i = 0; i < n && nl < chainInst.instanceMatrix.count; i++) {
                const t = (i + 0.5) / n, x = hand.x + (E.p.x - hand.x) * t, z = hand.z + (E.p.z - hand.z) * t;
                let yv = hand.y + (E.p.y - hand.y) * t - E.sag * dist * 4 * t * (1 - t);
                if (gyLast) yv = Math.max(yv, gyLast(x, z) + 0.08 * k);
                _hq2.setFromAxisAngle(Y_AX, (i % 2) * Math.PI / 2);
                chainInst.setMatrixAt(nl++, _hm.compose(_hv.set(x, yv, z), _hq2.premultiply(_hq), _hs.set(th * 2, step * 1.25, th * 2)));
              }
            }
            // the hook and links in his fist show only while nothing is out (not even on its way home)
            const home = ends.length === 0;
            if (e.hookHome !== home) { e.hookHome = home; }
            for (const o of e.hookParts) o.visible = home;
          }
        }
        for (let i = nh; i < hookPool.length; i++) hookPool[i].visible = false;
        chainInst.count = nl; chainInst.instanceMatrix.needsUpdate = true; hookLinks = nl;
      }
      if (PROJ && PROJ.beam) for (const [b, e] of live) {
        if (!e.beams || !e.beams.size) continue;
        const BE = PROJ.beam, k = e.root.scale.x, bs = window.__battleSpeed || 1, sdt = dt * (window.__slow || 1);
        const hold = (1 / Math.max(0.5, (b && b.u && b.u.aps) || 3) + 0.2) / bs;
        let a = null;
        for (const [tgt, B] of e.beams) {
          const on = !e.dead && e.added && clockT - B.last < hold && tgt.alive !== false;
          B.w += ((on ? 1 : 0) - B.w) * Math.min(1, dt * (on ? 14 : 11));
          if (!on && B.w < 0.03) { if (B.g.parent) B.g.parent.remove(B.g); for (const m of [B.shaft, B.core, B.tip]) m.material.dispose(); e.beams.delete(tgt); continue; }
          if (!a) { a = BE.from ? partMiddle(e, new RegExp(BE.from)) : null; if (a) beamFromPart++; else a = e.root.position.clone().add(new THREE.Vector3(0, 0.8 * k * H, 0)); }
          const ti = bodiesSeen.get(tgt);
          if (ti) B.end = (B.end || new THREE.Vector3()).set(ti.x, ti.y + BE.hit_y * ti.h, ti.z);
          if (!B.end) continue;
          if (!B.g.parent) scene.add(B.g);
          _bd.copy(B.end).sub(a); const dist = _bd.length() || 1e-3; _bd.multiplyScalar(1 / dist); B.dist = dist;
          B.len = Math.min(dist, B.len + BE.speed * sdt);   // it shoots out to its target, then stays on it
          const cp = camPos(), far = cp ? Math.max(1, Math.min(BE.far || 1.8, cp.distanceTo(a) / 30)) : 1;
          // (never thinner on screen than BE.min_px pixels: from the far top-down view a beam of its true width is a hair)
          const cv = document.querySelector('#view canvas'), vh = (cv && cv.clientHeight) || 600;
          const ppu = cp && camLast && camLast.isPerspectiveCamera ? vh / 2 / (Math.tan(camLast.fov * Math.PI / 360) * Math.max(0.1, cp.distanceTo(a))) : 0;
          const W0 = Math.max(BE.width * k * far, ppu > 0 ? (BE.min_px || 0) / 2 / ppu : 0);
          const W = W0 * (1 + (BE.spin_k || 0) * Math.max(0, (B.spin || 1) - 1)) * B.w * (1 + 0.06 * Math.sin(clockT * 31 + B.ang));
          B.px = ppu > 0 ? W * 2 * ppu : null;
          B.ang += sdt * BE.rot;
          _bq.setFromUnitVectors(Y_AX, _bd);
          B.shaft.position.copy(a); B.shaft.quaternion.copy(_bq).multiply(_bq2.setFromAxisAngle(Y_AX, B.ang)); B.shaft.scale.set(W, B.len, W);
          B.core.position.copy(a); B.core.quaternion.copy(_bq).multiply(_bq2.setFromAxisAngle(Y_AX, -B.ang * 1.7)); B.core.scale.set(W * BE.core_k, B.len, W * BE.core_k);
          const ts = W * BE.tip * (1 + 0.16 * Math.sin(clockT * 12 + B.ang));
          B.tip.position.copy(a).addScaledVector(_bd, B.len); B.tip.rotation.set(B.ang, B.ang * 0.7, 0); B.tip.scale.setScalar(Math.max(1e-4, ts));
          // where it lands: a few chips fly off (only once it has reached its target)
          if (on && BE.chips && B.len >= dist - 1e-3) {
            B.acc += sdt * BE.chips.per_s;
            while (B.acc >= 1) {
              B.acc -= 1;
              const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().addScaledVector(_bd, -0.6).normalize()
                .multiplyScalar((BE.chips.speed[0] + Math.random() * (BE.chips.speed[1] - BE.chips.speed[0])) * k);
              PFX.particle(scene, B.end.clone(), v, BE.chips, k * far);
            }
          }
        }
      }
      if (PROJ && PROJ.jet) for (const e of live.values()) {
        const j = e.jet; if (!j || j.until <= clockT || e.dead || !e.added) continue;
        const J = PROJ.jet, k = e.root.scale.x, sdt = dt * (window.__slow || 1);
        let a = J.from ? partMiddle(e, new RegExp(J.from)) : null;
        if (a) jetFromPart++; else a = e.root.position.clone().add(new THREE.Vector3(0, 0.7 * k * H, 0));
        j.acc += sdt * J.per_s;
        while (j.acc >= 1) {
          j.acc -= 1; jetPuffs++;
          // a direction inside the cone (more of them near its middle), a little up or down; out at a speed that the
          // drag brings to rest about the cone's reach
          const ang = (Math.random() + Math.random() - 1) * j.half * J.spread * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
          const vx = j.dx * ca - j.dz * sa, vz = j.dx * sa + j.dz * ca, reach = j.reach * (0.72 + 0.34 * Math.random());
          const sp = reach * J.drag / (1 - Math.exp(-J.drag * J.life[1] * 0.9));
          PFX.particle(scene, a.clone(), new THREE.Vector3(vx * sp, (Math.random() - 0.62) * J.drop * sp, vz * sp), J, k);
        }
      }
      for (const T of pendingTracers.splice(0)) {
        const own = live.get(T.b), TR = PROJ.tracer; if (!own) continue;
        const k = own.root.scale.x, f = Math.abs(T.b.x) > 0.05 ? Math.sign(own.root.position.x / T.b.x) || 1 : 1;
        let a = TR.from ? partMiddle(own, new RegExp(TR.from)) : null;
        if (a) tracerPart++; else a = own.root.position.clone().add(new THREE.Vector3(0, 0.6 * k * H, 0));
        const ti = T.tgt && bodiesSeen.get(T.tgt);
        const b = ti ? new THREE.Vector3(ti.x, ti.y + 0.55 * ti.h, ti.z) : new THREE.Vector3(T.x2 * f, own.root.position.y + 0.5 * k * H, -T.y2 * f);
        const dist = a.distanceTo(b); if (dist < 0.05) continue;
        const meshes = [[tracerMesh(TR.color, 0.9), TR.width], [tracerMesh(TR.core || '#FFFFFF', 1), TR.width * 0.42]];
        for (const [m] of meshes) scene.add(m);
        tracers.push({ a, b, dir: b.clone().sub(a).multiplyScalar(1 / dist), dist, t: 0, speed: TR.speed, len: Math.min(TR.length, dist * 0.9), meshes });
        tracerN++;
        if (TR.flash) PFX.hit(scene, a, b.clone().sub(a).normalize(), k * H, { flash: TR.flash }, null);
      }
      for (let i = tracers.length - 1; i >= 0; i--) {
        const T = tracers[i]; T.t += dt * (window.__slow || 1);
        const head = Math.min(T.dist, T.t * T.speed), tail = Math.max(0, T.t * T.speed - T.len);
        if (tail >= T.dist) { for (const [m] of T.meshes) { scene.remove(m); m.material.dispose(); } tracers.splice(i, 1); continue; }
        const at = T.a.clone().addScaledVector(T.dir, tail), cp = camPos(), far = cp ? Math.max(1, Math.min(2.5, cp.distanceTo(at) / 30)) : 1;
        for (const [m, w] of T.meshes) { m.position.copy(at); m.lookAt(T.b); m.scale.set(w * far, w * far, Math.max(0.01, head - tail)); }
      }
      // boulders rolling on after the engine's shot has landed
      for (let i = coasting.length - 1; i >= 0; i--) {
        const m = coasting[i], step = Math.min(m.left, m.speedW * dt);
        const pos = m.g.position.clone(); pos.x += m.wx * step; pos.z += m.wz * step; m.left -= step;
        const prev = m.g.position.clone();
        rollOn(m, pos, m.r, step);
        if (PROJ.trail) PFX.emit(scene, prev, pos, m.k, PROJ.trail, m.fx);
        if (m.left <= 1e-4) {
          const sp = splashCfg(), g0 = new THREE.Vector3(pos.x, gyLast ? gyLast(pos.x, pos.z) : pos.y - m.r, pos.z);
          if (sp) { PFX.splash(scene, g0, (m.R || 2) * (sp.radius || 1), sp); splashN++; }
          scene.remove(m.g); coasting.splice(i, 1);
        }
      }
      seen = new Set();
      for (const [p, m] of shots) {   // a shot the engine no longer has: it landed
        if (!m.seen) {
          // it landed: its splash, on the ground under where it hit (not for a shot swept away with the battle)
          if (PROJ.plough && PROJ.ground && m.u > 0.5 && m.added && m.wx !== undefined) {   // it rolls on: its end comes when it stops
            m.left = coastLen(m); m.r = PROJ.ground.radius * m.k; m.speedW = Math.max(6, Math.min(80, m.speedW || 30));
            coastN++; coastLast = +m.left.toFixed(2);
            coasting.push(m); shots.delete(p); continue;
          }
          if (PFX && PROJ.burst && m.u > 0.5) { const fw = m.fx && m.fx.vel && m.fx.vel.lengthSq() > 1e-6 ? m.fx.vel.clone().normalize() : null; PFX.burst(scene, m.prev, m.k || 1, PROJ.burst, fw); splashN++; }
          const sp = splashCfg();
          if (PFX && sp && m.ground && m.u > 0.5) { PFX.splash(scene, m.ground, (m.R || 2) * (sp.radius || 1), sp); splashN++; }
          const fwd = m.fx && m.fx.vel && m.fx.vel.lengthSq() > 1e-6 ? m.fx.vel.clone().normalize() : null;   // the way it was flying
          if (m.g.userData.glow) m.g.userData.glow.material.dispose();
          if (m.wat) for (const w of m.wat) w.geo.dispose();
          if (m.fx) { m.fx.dead = true; m.fx.end = m.prev.clone(); m.fx.dir = fwd; PFX.landed(m.fx); }   // (a haze that was keeping pace with it stops here)
          scene.remove(m.g); shots.delete(p); continue;
        }
        if (!m.added) { scene.add(m.g); m.added = true; }
        m.seen = false;
      }
      // all the instanced shots, and all the streaks, in one draw call each
      if (inst) {
        if (!inst.parent) scene.add(inst);
        let i = 0;
        if (PMODE === 'inst') for (const m of shots.values()) { if (i >= INST_CAP) break; m.g.updateMatrix(); inst.setMatrixAt(i++, m.g.matrix); }
        inst.count = i; inst.instanceMatrix.needsUpdate = true;
      }
      if (PROJ && PROJ.streak) {
        if (!streak) { streak = streakMesh(PROJ.streak); scene.add(streak); }
        const S = PROJ.streak; let i = 0;
        if (PMODE !== 'off') for (const m of shots.values()) {
          if (i >= INST_CAP || !m.fdir) continue;
          const sc = m.k || 1, len = Math.min(S.length, m.g.position.distanceTo(m.from));
          if (len < 0.05) continue;
          dummy.position.copy(m.g.position).addScaledVector(m.fdir, -(S.back || 0) * sc);
          dummy.lookAt(dummy.position.clone().add(m.fdir)); dummy.scale.set(S.width * sc, S.width * sc, len); dummy.updateMatrix();
          streak.setMatrixAt(i++, dummy.matrix);
        }
        streak.count = i; streak.instanceMatrix.needsUpdate = true;
      }
      for (const [p, m] of drops) {
        if (!m.seen) { if (m.g) scene.remove(m.g); drops.delete(p); continue; }
        if (!m.added && m.g) { scene.add(m.g); m.added = true; }
        m.seen = false;
      }
    },
  };
    return window.__anim;
  }

  const drivers = new Map();   // unit name -> { state: 'none' | 'loading' | 'ready' | 'failed', api }
  let scene0 = null, btNow = null;
  function driverFor(name) {
    let D = drivers.get(name);
    if (D) return D;
    const CFG = Object.prototype.hasOwnProperty.call(UNITS, name) ? UNITS[name] : null;
    D = { state: CFG ? 'loading' : 'none', api: null };
    drivers.set(name, D);
    if (!CFG) return D;
    fetch(new URL((host.base || 'models/units/') + CFG.file + '.glb' + (host.v ? '?v=' + host.v : ''), document.baseURI).href)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(buf => {
        const win = { __anim: null, __slow: 1, get __battleSpeed() { return host.speed ? host.speed() : 1; },
                      get __lab3d() { return btNow ? { bt: btNow } : null; } };
        const api = makeDriver(CFG, buf, win);
        const t0 = Date.now();
        (function wait() {   // (the model is parsed a moment after: the driver sets `info` when it is ready to draw)
          if (D.gone) return;
          if (api.info) { D.api = api; D.state = 'ready'; if (host.wake) host.wake(); }
          else if (Date.now() - t0 < 20000) setTimeout(wait, 30);
          else D.state = 'failed';
        })();
      })
      .catch(e => { D.state = 'failed'; console.warn('No Mans Land: the model for ' + name + ' could not load; its classic model is drawn.', e); });
    return D;
  }
  return {
    UNITS,
    begin(bt) { btNow = bt || null; },   // render3d, before it places the bodies: the battle on the board, or none
    body(d) {
      const u = d && d.s && d.s.u;
      if (!u || !u.name || d.skin) return false;   // (a skin keeps its own classic model: the new models have no skins yet)
      const D = driverFor(u.name);
      return D.state === 'ready' ? !!D.api.body(d) : false;
    },
    frame(scene, dt, camera) { scene0 = scene; for (const D of drivers.values()) if (D.state === 'ready') D.api.frame(scene, dt, camera); },
    aimSeen(s) { const b = s && s[14], D = b && b.u ? drivers.get(b.u.name) : null; if (D && D.state === 'ready' && D.api.aimSeen) D.api.aimSeen(s); },
    busy() { for (const D of drivers.values()) if (D.state === 'ready' && D.api.dead().length) return true; return false; },
    // (tests) per unit: its state and how many models are standing
    stats() { const o = {}; for (const [n, D] of drivers) if (D.state !== 'none') o[n] = { state: D.state, live: D.api ? D.api.stats().live : 0 }; return o; },
    dead() { const o = {}; for (const [n, D] of drivers) if (D.api) { const d = D.api.dead(); if (d.length) o[n] = d; } return o; },   // (tests) the fallen still on show
    dispose() { for (const D of drivers.values()) { D.gone = true; if (D.api && D.api.clear) D.api.clear(scene0); } drivers.clear(); },
  };
}
