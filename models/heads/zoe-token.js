// Zoe, the Overseer: token version (2026-11-07), from Vilhelm's minimal reference sheet ("the head is a token,
// a little artifact"). Snobbish, superior, calculating. Bold faceted shapes, 300-600 triangles:
// a faceted gem of a head (narrow on top, widest at the cheekbones, tapering to the chin), blank cream eye wedges
// under heavy dark brows slanting down to the middle, two angular antennae with a kink and faceted gold stars,
// a gold collar band on a purple base with a gold diamond at the front. Faces -z, flat-shaded.
const ZoeToken = (THREE) => {
  const PI = Math.PI;
  const mat = (pos = [0, 0, 0], rot = [0, 0, 0], sc) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), sc ? new THREE.Vector3(...sc) : new THREE.Vector3(1, 1, 1));
  const P = (g, col, pos, rot, sc) => { g.applyMatrix4(mat(pos, rot, sc)); return { g, col }; };
  const slab = (pts, depth) => {
    const sh = new THREE.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g;
  };
  // a faceted star: the points of a flat star, with the middle raised to a point on the front and the back
  const star = (r, ri, t, rim = 0.07) => { // a chunky faceted star: a ridge from the middle to every tip, a thick rim
    const P2 = Array.from({ length: 10 }, (_, i) => { const a = PI / 2 + i * PI / 5, rr = i % 2 ? ri : r; return [Math.cos(a) * rr, Math.sin(a) * rr]; });
    const pos = [], push = (...v) => v.forEach(p => pos.push(...p));
    for (let i = 0; i < 10; i++) {
      const [x0, y0] = P2[i], [x1, y1] = P2[(i + 1) % 10];
      push([0, 0, -t - rim], [x0, y0, -rim], [x1, y1, -rim]); // front
      push([0, 0, t + rim], [x1, y1, rim], [x0, y0, rim]); // back
      push([x0, y0, -rim], [x0, y0, rim], [x1, y1, rim]); push([x0, y0, -rim], [x1, y1, rim], [x1, y1, -rim]); // rim
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
  };
  // palette from the sheet
  const FACE = '#B77AB4', MID = '#9A639B', DARK = '#6A4170', GOLD = '#F2B544', CREAM = '#F6E2C0';

  // the head: a gem. Rings of 8 vertices; a ring turned half a step against its neighbour gives triangular facets
  // (the top and the chin), two rings at the same turn give flat quads (the band the eyes and brows sit on).
  // [radius, height, turn]; a vertex faces -z on unturned rings, so a ridge runs down the front.
  const RINGS = [[0.6, -1.0, 0.5], [1.0, -0.5, 0], [1.3, 0.22, 0], [0.86, 0.68, 0.5], [0.42, 1.0, 0]]; // widest at the eyes, the top tapering in steeply, the lower face straight down to the chin
  const SEG = 6, DEPTH = 0.95, SX = 1.08; // six sides: big flat facets, a hexagon from the front
  const at = (a, r, y) => new THREE.Vector3(r * Math.sin(a) * SX, y, r * Math.cos(a) * DEPTH);
  const ang = (i, turn) => (i + turn) * 2 * PI / SEG;
  const gem = () => {
    const pos = [], tri = (A, B, C) => {
      const n = new THREE.Vector3().crossVectors(B.clone().sub(A), C.clone().sub(A)), c = A.clone().add(B).add(C);
      if (n.dot(c) < 0) [B, C] = [C, B];
      pos.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
    };
    for (let k = 0; k < RINGS.length - 1; k++) {
      const [r0, y0, t0] = RINGS[k], [r1, y1, t1] = RINGS[k + 1];
      for (let i = 0; i < SEG; i++) {
        const A = at(ang(i, t0), r0, y0), B = at(ang(i + 1, t0), r0, y0);
        if (t0 === t1) { const C = at(ang(i + 1, t1), r1, y1), D = at(ang(i, t1), r1, y1); tri(A, B, C); tri(A, C, D); }
        else if (t1 > t0) { const C = at(ang(i, t1), r1, y1), D = at(ang(i - 1, t1), r1, y1); tri(A, B, C); tri(A, C, D); }
        else { const C = at(ang(i + 1, t1), r1, y1), D = at(ang(i, t1), r1, y1); tri(A, B, C); tri(A, C, D); }
      }
    }
    const top = RINGS[RINGS.length - 1], bot = RINGS[0];
    for (let i = 0; i < SEG; i++) {
      tri(new THREE.Vector3(0, top[1] + 0.02, 0), at(ang(i, top[2]), top[0], top[1]), at(ang(i + 1, top[2]), top[0], top[1])); // the flat top
      tri(new THREE.Vector3(0, bot[1] - 0.04, 0), at(ang(i, bot[2]), bot[0], bot[1]), at(ang(i + 1, bot[2]), bot[0], bot[1]));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
  };
  // a point on a flat quad of the eye band (rings 1 and 2): segment i, u across (0 at angle i, 1 at i+1), v up
  const facet = (i, u, v) => {
    const [r0, y0] = RINGS[1], [r1, y1] = RINGS[2], a0 = ang(i, 0), a1 = ang(i + 1, 0);
    const p00 = at(a0, r0, y0), p10 = at(a1, r0, y0), p01 = at(a0, r1, y1), p11 = at(a1, r1, y1);
    const p = p00.clone().lerp(p10, u).lerp(p01.clone().lerp(p11, u), v);
    const across = p10.clone().sub(p00).normalize(), upv = p01.clone().lerp(p11, 0.5).sub(p00.clone().lerp(p10, 0.5)).normalize();
    const n = new THREE.Vector3().crossVectors(upv, across).normalize();
    if (n.dot(p) < 0) n.negate();
    return { p, n, up: upv };
  };
  // lay a flat part on a facet: local x toward 'x', local y up the facet, lifted along the normal
  const onFacet = (g, f, x, lift) => {
    const z = f.n.clone(), y = f.up.clone().sub(z.clone().multiplyScalar(f.up.dot(z))).normalize(), xx = new THREE.Vector3().crossVectors(y, z);
    if (xx.dot(x) < 0) xx.negate();
    g.applyMatrix4(new THREE.Matrix4().makeBasis(xx, y, xx.clone().cross(y).normalize()));
    g.translate(f.p.x + z.x * lift, f.p.y + z.y * lift, f.p.z + z.z * lift); return g;
  };
  const flat = (pts) => { // a flat shape, both sides (so it shows whichever way the facet's basis turns it)
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))).toNonIndexed();
    const a = Array.from(g.getAttribute('position').array), b = [];
    for (let i = 0; i < a.length; i += 9) b.push(a[i], a[i + 1], a[i + 2], a[i + 6], a[i + 7], a[i + 8], a[i + 3], a[i + 4], a[i + 5]);
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(a.concat(b), 3)); return out;
  };

  const parts = () => {
    const out = [];
    out.push({ g: gem(), col: FACE });
    // eyes and brows, carved flush into the two flat facets either side of the front ridge (segments 3 and 4):
    // a dark brow wedge, thick at the outside and thin at the middle, sitting right on the eye; under it the
    // blank cream eye, its top edge the brow's line (low at the middle, high outside), its bottom a curve
    for (const sd of [-1, 1]) {
      const f = facet(sd > 0 ? 2 : 3, sd > 0 ? 0.5 : 0.5, 0.46); // segments 2 and 3 meet at the front ridge
      const outward = new THREE.Vector3(sd, 0, 0);
      const K = 1.3, KX = 0.84; // narrower than tall-scaled: the eyes are about a quarter of the head wide
      const eye = [[-0.34, -0.02], [0.36, 0.17], [0.37, 0.07], [0.3, -0.08], [0.15, -0.19], [-0.04, -0.23], [-0.2, -0.19], [-0.31, -0.1]].map(([x, y]) => [x * K * KX, y * K * 0.86]); // an almond, wider than tall
      const brow = [[-0.4, -0.04], [0.4, 0.17], [0.38, 0.38], [-0.4, 0.06]].map(([x, y]) => [x * K * KX, y * K]);
      out.push({ g: onFacet(flat(brow), f, outward, 0.012), col: DARK });
      out.push({ g: onFacet(flat(eye), f, outward, 0.018), col: CREAM });
    }
    // antennae: two four-sided prisms each, with a kink, leaning out; a faceted gold star on each tip
    for (const sd of [-1, 1]) {
      const base = new THREE.Vector3(sd * 0.3, 0.9, 0.04);
      const d1 = new THREE.Vector3(sd * 0.05, 0.4, 0), d2 = new THREE.Vector3(sd * 0.2, 0.26, 0);
      const seg = (from, d, w) => {
        const g = new THREE.CylinderGeometry(w, w, d.length(), 4, 1); g.rotateY(PI / 4);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
        const m = from.clone().addScaledVector(d, 0.5); g.translate(m.x, m.y, m.z); return g;
      };
      out.push({ g: seg(base, d1.clone().multiplyScalar(1.22), 0.2), col: MID }); // runs a little past the kink, so the joint has no gap
      const knee = base.clone().add(d1);
      out.push({ g: seg(knee.clone().addScaledVector(d1, -0.15), d2.clone().multiplyScalar(1.35), 0.18), col: MID });
      const tip = knee.clone().add(d2);
      out.push(P(star(0.46, 0.27, 0.14, 0.06), GOLD, [tip.x + sd * 0.12, tip.y + 0.24, tip.z], [0, sd * 0.3, sd * -0.18])); // fat and chunky
    }
    // collar: a gold band round the chin on a purple base, a gold diamond at the front
    out.push(P(new THREE.CylinderGeometry(0.84, 0.84, 0.2, 8), GOLD, [0, -1.07, 0], [0, PI / 8, 0], [1.05, 1, 0.88]));
    out.push(P(new THREE.CylinderGeometry(0.84, 0.9, 0.3, 8), DARK, [0, -1.32, 0], [0, PI / 8, 0], [1.05, 1, 0.88]));
    out.push(P(new THREE.OctahedronGeometry(0.34, 0), GOLD, [0, -1.12, -0.8], [0, 0, 0], [0.9, 1.25, 0.55]));
    return out;
  };

  function geometry() {
    const pos = [], col = [], c = new THREE.Color();
    for (const { g, col: hex } of parts()) {
      const f = g.index ? g.toNonIndexed() : g, a = f.getAttribute('position');
      c.set(hex);
      for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); col.push(c.r, c.g, c.b); }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.computeVertexNormals(); // non-indexed: one normal per face, the faceted look
    return out;
  }
  return { KEYS: ['zoe'], geometry: () => geometry(), tris: () => geometry().getAttribute('position').count / 3 };
};
if (typeof module !== 'undefined') module.exports = ZoeToken;
