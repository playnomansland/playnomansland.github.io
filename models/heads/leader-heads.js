// ===== Leader heads: low-poly 3D symbols for the UI (sketch, 2026-11-07) =====
// Heads(THREE) -> { KEYS, build(key, variant) -> THREE.Mesh, tris(key, variant) }.
// Same part style as src/models3d.js: P(geometry, colour, position, rotation, scale), merged into one flat-shaded
// mesh with vertex colours and smooth shading (each part keeps its own normals). Each head faces -z, is about 2.4 units tall, and sits on a short neck with a collar in
// its leader's crest colour (src/art.js), so the set reads as one family. Budget: 1000 triangles a head.
const Heads = (THREE) => {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const P = (g, col, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0], sc) => {
    g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc ? s.set(...sc) : s.set(1, 1, 1)));
    return { g, col };
  };
  const PI = Math.PI;
  const sph = (r, w = 7, h = 5) => new THREE.SphereGeometry(r, w, h);
  const cap = (r, w, h, t = 0.5) => new THREE.SphereGeometry(r, w, h, 0, PI * 2, 0, PI * t); // top part of a sphere
  const cyl = (rt, rb, h, n = 8) => new THREE.CylinderGeometry(rt, rb, h, n);
  const cone = (r, h, n = 5) => new THREE.ConeGeometry(r, h, n);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const ring = (r, t, n = 12, arc = PI * 2, rs = 4) => new THREE.TorusGeometry(r, t, rs, n, arc);
  const star = (r, depth) => { // a 5-point star, extruded
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r; i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g;
  };
  const pair = (fn) => [-1, 1].flatMap(fn);
  // the shared base: a short neck and a collar in the crest colour
  const base = (skin, collar) => [
    P(cyl(0.34, 0.4, 0.5, 8), skin, [0, -1.05, 0.12]),
    P(ring(0.42, 0.13, 8, PI * 2, 3), collar, [0, -1.22, 0.12], [PI / 2, 0, 0], [1, 1.1, 1]),
  ];

  const BUILD = {
    // Frickolas Cage: just a dude with a smirk. Messy brown hair, stubble, one brow up, one mouth corner up.
    cage: () => {
      const SKIN = '#EBC3A2', STUB = '#D6AF97', LID = '#DDAE8E', HAIR = '#7A5444', DARK = '#3A2A28', WHITE = '#F4EFE6', CREST = '#C2656C';
      const parts = [
        P(sph(1, 10, 7), SKIN, [0, 0, 0], [0, 0, 0], [0.86, 1.06, 0.92]), // skull
        P(sph(0.66, 8, 5), SKIN, [0, -0.42, -0.2], [0, 0, 0], [1.2, 0.85, 1.05]), // jaw
        P(new THREE.SphereGeometry(0.675, 10, 4, 0, PI * 2, PI * 0.6, PI * 0.4), STUB, [0, -0.42, -0.2], [0, 0, 0], [1.2, 0.85, 1.05]), // stubble
        ...pair(sd => [P(sph(0.2, 6, 4), SKIN, [sd * 0.86, -0.02, 0.06], [0, 0, 0], [0.5, 1, 0.75])]), // ears
        P(sph(0.12, 6, 5), SKIN, [0, -0.08, -0.9], [0.2, 0, 0], [1.0, 1.35, 0.8]), // nose
        // eyes: whites, pupils, heavy upper lids (the relaxed, smug look)
        ...pair(sd => [
          P(sph(0.13, 6, 5), WHITE, [sd * 0.29, 0.14, -0.79]),
          P(sph(0.07, 6, 4), DARK, [sd * 0.29 - 0.03, 0.13, -0.9]),
          P(cap(0.145, 8, 3, 0.5), LID, [sd * 0.29, 0.14, -0.79], [-1.15, 0, sd * 0.08]),
        ]),
        // brows: one raised and tilted
        P(box(0.3, 0.075, 0.1), HAIR, [0.3, 0.42, -0.84], [0, 0, -0.3]),
        P(box(0.3, 0.075, 0.1), HAIR, [-0.29, 0.31, -0.86], [0, 0, -0.04]),
        // the smirk: flat on one side, curling up into a cheek bump on the other
        P(box(0.22, 0.04, 0.04), DARK, [-0.06, -0.5, -0.875], [0, 0.1, 0.03]),
        P(box(0.13, 0.04, 0.04), DARK, [0.1, -0.47, -0.86], [0, -0.25, 0.42]),
        P(sph(0.11, 6, 5), SKIN, [0.22, -0.38, -0.8], [0, 0, 0], [1, 0.8, 0.8]),
        // hair: a cap pushed back off the forehead, a swoop and a few tufts
        P(cap(1.0, 9, 4, 0.42), HAIR, [0, 0.12, 0.08], [0.42, 0, 0], [0.9, 1.0, 0.97]),
        P(sph(0.42, 7, 5), HAIR, [-0.22, 0.86, -0.5], [0, 0, 0.4], [1.25, 0.55, 0.75]), // the front swoop
        P(cone(0.2, 0.55, 5), HAIR, [0.42, 0.88, -0.38], [-0.9, 0, -0.7]),
        P(cone(0.18, 0.5, 5), HAIR, [0.1, 1.02, 0.1], [0.3, 0, -0.2]),
        P(cone(0.2, 0.55, 5), HAIR, [-0.6, 0.62, -0.2], [-0.5, 0, 1.0]),
        ...pair(sd => [P(box(0.14, 0.35, 0.3), HAIR, [sd * 0.8, 0.28, -0.05], [0, 0, sd * -0.12])]), // sideburns
        ...base(SKIN, CREST),
      ];
      return parts;
    },

    // Zoe: a bossy alien. Pear-shaped lilac head, big slanted eyes under stern lids, pursed mouth, chin up,
    // antennae with gold stars (her buff tiles), the right one cocked like a raised eyebrow.
    zoe: () => {
      const SKIN = '#BBA6D8', SHADE = '#A891CC', EYE = '#2C2442', WHITE = '#F7F3FF', GOLD = '#E9C86A', CREST = '#8B6AB8';
      return [
        P(sph(1, 11, 8), SKIN, [0, 0.28, 0.05], [0, 0, 0], [1.05, 0.92, 0.98]), // cranium
        P(sph(0.62, 9, 6), SKIN, [0, -0.48, -0.14], [0, 0, 0], [0.74, 1.12, 0.82]), // narrow lower face, small chin
        ...pair(sd => [
          P(sph(0.34, 8, 6), EYE, [sd * 0.42, 0.0, -0.74], [0, sd * -0.35, sd * 0.38], [1.05, 0.66, 0.5]), // eye
          P(sph(0.065, 5, 4), WHITE, [sd * 0.33, 0.06, -0.89]), // glint
          P(sph(0.03, 4, 3), WHITE, [sd * 0.47, -0.06, -0.86]),
          // stern lid: covers the top of the eye, lower toward the nose
          // lids: a slab over the top of each eye. One stern (low toward the nose), one raised ("excuse me?")
          sd > 0 ? P(box(0.58, 0.22, 0.13), SHADE, [0.44, 0.22, -0.78], [0.2, -0.35, 0.34])
                 : P(box(0.58, 0.2, 0.13), SHADE, [-0.44, 0.3, -0.77], [0.25, 0.35, 0.1]),
        ]),
        P(sph(0.045, 5, 4), SHADE, [0, -0.36, -0.82]), // tiny nose bump
        P(ring(0.045, 0.025, 6, PI * 2, 3), '#7A5F9C', [0.03, -0.68, -0.72], [0.15, 0, 0], [1.3, 0.8, 1]), // pursed mouth
        // antennae: stalk, bend, gold star tip
        P(cyl(0.035, 0.05, 0.6, 5), SKIN, [-0.42, 1.25, 0.1], [0, 0, 0.35]),
        P(cyl(0.03, 0.035, 0.45, 5), SKIN, [-0.6, 1.66, 0.1], [0, 0, 0.6]),
        P(star(0.21, 0.07), GOLD, [-0.8, 1.9, 0.1], [0, 0, 0.3]),
        P(cyl(0.035, 0.05, 0.6, 5), SKIN, [0.42, 1.25, 0.1], [0, 0, -0.3]),
        P(cyl(0.03, 0.035, 0.45, 5), SKIN, [0.6, 1.62, -0.06], [-0.7, 0, -0.35]), // cocked forward
        P(star(0.21, 0.07), GOLD, [0.72, 1.78, -0.28], [-0.4, 0, -0.2]),
        ...base(SKIN, CREST),
        P(cyl(0.5, 0.42, 0.28, 12), CREST, [0, -1.05, 0.12]), // a high stiff collar (she's in charge)
      ];
    },

    // Emile: a warm grandpa walrus. Big ginger moustache, tusks, round glasses over happy closed eyes, rosy cheeks,
    // a cap a size too small and a brass key hanging off one tusk (free unlocks).
    emile: () => {
      const HIDE = '#A88B7A', LIGHT = '#BFA392', GINGER = '#D98A55', GINGER2 = '#C2733F', IVORY = '#F1E6CC';
      const DARK = '#3E2E2A', BRASS = '#D2AE5E', ROSE = '#E6A3A0', CAP = '#7FA68A', CREST = '#5E9A70';
      return [
        P(sph(1, 10, 7), HIDE, [0, 0.05, 0], [0, 0, 0], [1.06, 0.96, 1.0]), // head
        P(sph(0.5, 8, 5), LIGHT, [0, -0.36, -0.55], [0, 0, 0], [1.5, 0.95, 1.0]), // muzzle
        P(sph(0.13, 6, 4), DARK, [0, -0.08, -1.0], [0, 0, 0], [1.3, 0.8, 1]), // nose pad
        // the moustache: two bushy lobes and a fringe of bristles hanging down over the mouth
        ...pair(sd => [P(sph(0.42, 8, 5), GINGER, [sd * 0.33, -0.33, -0.86], [0, sd * 0.25, sd * -0.2], [1.15, 0.72, 0.75])]),
        ...[-0.62, -0.42, -0.21, 0, 0.21, 0.42, 0.62].map((x, i) => P(cone(0.11, 0.36, 4), i % 2 ? GINGER2 : GINGER,
          [x, -0.62 + Math.abs(x) * 0.12, -0.92 + Math.abs(x) * 0.18], [PI, 0, x * 0.5])),
        // tusks
        ...pair(sd => [P(cone(0.075, 0.8, 6), IVORY, [sd * 0.24, -1.0, -0.86], [PI - 0.18, 0, sd * -0.08])]),
        // eyes: happy closed arcs behind round brass glasses
        ...pair(sd => [
          P(ring(0.09, 0.022, 5, PI, 3), DARK, [sd * 0.36, 0.2, -0.93]),
          P(ring(0.19, 0.025, 8, PI * 2, 3), BRASS, [sd * 0.36, 0.2, -0.99]),
          P(sph(0.16, 6, 4), ROSE, [sd * 0.64, -0.08, -0.72], [0, 0, 0], [1, 0.6, 0.5]), // rosy cheek
          P(sph(0.13, 5, 4), GINGER, [sd * 0.38, 0.47, -0.88], [0, 0, sd * 0.3], [1.5, 0.6, 0.7]), // bushy brow, raised kindly
          P(box(0.25, 0.03, 0.03), BRASS, [sd * 0.66, 0.24, -0.86], [0, sd * 0.9, 0]), // glasses arm
        ]),
        P(box(0.16, 0.03, 0.03), BRASS, [0, 0.24, -1.0]), // bridge
        // the cap: a size too small, perched on top, a short brim
        P(cyl(0.44, 0.5, 0.3, 8), CAP, [0.05, 1.0, 0.0], [0.08, 0, -0.12]),
        P(cyl(0.5, 0.5, 0.04, 8), CAP, [0.06, 0.87, -0.22], [0.25, 0, -0.12], [0.85, 1, 0.75]),
        // the key on a cord, hanging off his right tusk
        P(cyl(0.015, 0.015, 0.22, 4), DARK, [-0.25, -1.25, -0.88]),
        P(ring(0.075, 0.022, 6, PI * 2, 3), BRASS, [-0.25, -1.43, -0.9]),
        P(box(0.04, 0.3, 0.04), BRASS, [-0.25, -1.65, -0.9]),
        P(box(0.09, 0.04, 0.04), BRASS, [-0.21, -1.73, -0.9]),
        P(box(0.07, 0.04, 0.04), BRASS, [-0.22, -1.65, -0.9]),
        ...base(HIDE, CREST),
      ];
    },
  };

  function merge(list) {
    const pos = [], nor = [], col = [], c = new THREE.Color();
    for (const { g, col: hex } of list) {
      const flat = g.index ? g.toNonIndexed() : g, a = flat.getAttribute('position'), n = flat.getAttribute('normal');
      c.set(hex);
      for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); }
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); // each part keeps its own (smooth) normals
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return out;
  }
  const geometry = (key, variant) => merge(BUILD[key](variant));
  const tris = (key, variant) => geometry(key, variant).getAttribute('position').count / 3;
  const build = (key, variant, flat) => new THREE.Mesh(geometry(key, variant), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: !!flat, roughness: 0.85 }));
  return { KEYS: Object.keys(BUILD), BUILD, build, tris, geometry };
};
if (typeof module !== 'undefined') module.exports = Heads;
