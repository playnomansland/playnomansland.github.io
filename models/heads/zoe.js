// Zoe, the Overseer (2026-11-07): leader head built from Vilhelm's reference sheet.
// A bossy alien who knows exactly how things should be: stern and superior. Lilac pear-shaped head with darker
// spots, big pointed ears straight out to the sides, two curling antennae with chunky gold stars, big half-lidded
// eyes with heavy lids and winged lashes glancing to one side, one brow arched high, pursed lips, and a high purple
// collar with gold trim dipping to a gold star brooch at the front. Faces -z. Flat-shaded facets like Emile.
const ZoeHead = (THREE) => {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const mat = (pos, rot = [0, 0, 0], sc) => m4.clone().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), sc ? new THREE.Vector3(...sc) : new THREE.Vector3(1, 1, 1));
  const P = (g, col, pos = [0, 0, 0], rot = [0, 0, 0], sc) => { g.applyMatrix4(mat(pos, rot, sc)); return { g, col }; };
  const G = (parts, pos, rot, sc) => { const M = mat(pos, rot, sc); for (const p of parts) p.g.applyMatrix4(M); return parts; }; // move a group of parts
  const PI = Math.PI;
  const sph = (r, w, h) => new THREE.SphereGeometry(r, w, h);
  const slab = (pts, depth, bevel = 0.04) => {
    const sh = new THREE.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 });
    g.translate(0, 0, -depth / 2); return g;
  };
  const starPts = (n, r, ri) => Array.from({ length: n * 2 }, (_, i) => { const a = PI / 2 + i * PI / n, rr = i % 2 ? ri : r; return [Math.cos(a) * rr, Math.sin(a) * rr]; });
  const wrap = (g, k) => { const a = g.getAttribute('position'); for (let i = 0; i < a.count; i++) a.setZ(i, a.getZ(i) + k * a.getX(i) ** 2); a.needsUpdate = true; return g; };

  // reference palette
  const SKIN = '#C59BCF', SPOT = '#B08ABD', LID = '#B48DC2', BROW = '#6B4877', LASH = '#2A1F2E';
  const WHITE = '#F3E6CF', PUPIL = '#241B26', LIPS = '#8C5A8C', LIPS2 = '#A06C9E';
  const ROBE = '#7A5284', ROBE2 = '#5F3F69', GOLD = '#E8B84A';

  // the head's profile (radius at height y), turned into a pear: a rounded dome on top, full cheeks below
  const PROFILE = [[0.0, 1.44], [0.4, 1.38], [0.72, 1.18], [0.94, 0.86], [1.1, 0.46], [1.22, 0.02], [1.32, -0.36], [1.3, -0.62], [1.16, -0.84], [0.86, -1.0], [0.44, -1.07], [0.0, -1.08]];
  const DEPTH = 0.95; // the head is a little flatter front to back
  const radiusAt = (y) => {
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const [r0, y0] = PROFILE[i], [r1, y1] = PROFILE[i + 1];
      if (y <= y0 && y >= y1) return r0 + (r1 - r0) * (y0 - y) / (y0 - y1);
    }
    return 0;
  };
  const surfZ = (x, y) => -DEPTH * Math.sqrt(Math.max(0, radiusAt(y) ** 2 - x * x)); // the face's front surface

  const parts = () => {
    const out = [];
    // --- head
    const head = new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 20);
    out.push(P(head, SKIN, [0, 0, 0], [0, 0, 0], [1, 1, DEPTH]));
    // spots: flattened discs lying on the surface
    const up = new THREE.Vector3(0, 0, 1);
    for (const [x, y, r] of [[0.82, -0.3, 0.19], [0.64, -0.62, 0.13], [1.02, 0.0, 0.12], [-0.84, -0.32, 0.18], [-0.66, -0.64, 0.12], [0.3, 1.1, 0.13], [-0.34, 1.0, 0.11]]) {
      const back = y > 0.6; // the ones on the top of the head sit toward the back
      const z = back ? -surfZ(x, y) * 0.6 : surfZ(x, y);
      const n = new THREE.Vector3(x, y > 0.6 ? 0.8 : 0.1, z).normalize();
      const g = sph(r, 8, 4); g.scale(1, 1, 0.25);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, n));
      g.translate(x, y, z * 1.0);
      out.push({ g, col: SPOT });
    }
    // --- ears: big flat triangles pointing straight out, tips slightly up
    for (const sd of [-1, 1]) {
      const g = new THREE.ConeGeometry(0.34, 1.0, 4, 1); g.scale(1, 1, 0.38);
      out.push(P(g, SKIN, [sd * 1.55, 0.02, 0.08], [0, 0, sd * -1.42]));
      const gi = new THREE.ConeGeometry(0.2, 0.7, 4, 1); gi.scale(1, 1, 0.3);
      out.push(P(gi, SPOT, [sd * 1.5, 0.02, -0.02], [0, 0, sd * -1.42]));
    }
    // --- antennae: stalks rising from the top and curling outward, a chunky gold star on each end
    for (const sd of [-1, 1]) {
      const pts = [[0.32, 1.3, 0.12], [0.35, 1.68, 0.1], [0.42, 2.02, 0.05], [0.58, 2.26, 0.0], [0.82, 2.34, 0.0]].map(([x, y, z]) => new THREE.Vector3(sd * x, y, z));
      out.push({ g: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.095, 6, false), col: SKIN });
      out.push(P(sph(0.15, 7, 5), SKIN, [sd * 0.32, 1.32, 0.12])); // root bump
      out.push(P(slab(starPts(5, 0.38, 0.18), 0.15, 0.08), GOLD, [sd * 1.0, 2.4, 0.0], [0, sd * 0.25, sd * -0.25]));
    }
    // --- eyes: big cream eyes under heavy lids with winged lashes, glancing to her right (-x).
    //     Her left eye (+x) is lidded lower; her right brow arches high: unimpressed, superior.
    const eye = (sd, lidH, lidTilt, brow) => {
      const cx = sd * 0.47, cy = 0.24, cz = surfZ(cx, cy) + 0.13;
      const R = 0.4, SY = 0.86, SZ = 0.5, front = -R * SZ;
      const g = [];
      g.push(P(sph(R, 12, 8), WHITE, [0, 0, 0], [0, 0, 0], [1, SY, SZ]));
      g.push(P(sph(0.18, 9, 6), PUPIL, [-0.14, -0.07, front + 0.08], [0, 0, 0], [1, 1.1, 0.4])); // looking to her right
      // the lid: the top of a slightly bigger ellipsoid, cut level at lidH
      const th = Math.acos(Math.max(-1, Math.min(1, lidH / R)));
      g.push(P(new THREE.SphereGeometry(R * 1.06, 14, 5, 0, PI * 2, 0, th), LID, [0, 0, 0], [0, 0, 0], [1, SY, SZ * 1.12]));
      // the lash line along the lid's edge, with a wing flicking up at the outer corner
      const zEdge = -SZ * Math.sqrt(Math.max(0, (R * 1.06) ** 2 - lidH ** 2)) - 0.02;
      const o = sd; // outer side is +x for her left eye, -x for her right
      const lash = [[-0.33, 0.0], [0, -0.035], [0.3, 0.0], [0.42, 0.13], [0.3, 0.05], [0, 0.03], [-0.33, 0.045]].map(([x, y]) => [x * o * 1.3, y * 1.3]);
      g.push(P(wrap(slab(o > 0 ? lash : lash.reverse(), 0.05, 0.015), 0.9), LASH, [0, lidH * SY, zEdge]));
      G(g, [cx, cy, cz], [0, sd * -0.32, lidTilt]);
      out.push(...g);
      // brow: a thick arched stroke
      const bp = brow.high
        ? [[-0.3, -0.04], [-0.12, 0.1], [0.08, 0.14], [0.3, 0.05], [0.33, 0.1], [0.08, 0.2], [-0.13, 0.16], [-0.32, 0.0]]
        : [[-0.3, -0.01], [0.0, 0.03], [0.3, -0.01], [0.32, 0.04], [0.0, 0.08], [-0.32, 0.04]];
      const bx = sd * 0.48, by = brow.high ? 0.8 : 0.7;
      out.push(P(wrap(slab(bp.map(([x, y]) => [x * sd * 1.25, y * 1.25]), 0.08, 0.025), 0.5), BROW, [bx, by, surfZ(bx, by) - 0.03], [0.25, sd * -0.35, brow.tilt]));
    };
    eye(1, 0.07, 0.06, { high: false, tilt: -0.08 }); // her left: lidded low, brow flat
    eye(-1, 0.15, -0.05, { high: true, tilt: 0.05 }); // her right: lid a little higher, brow arched up
    // --- pursed lips, pouting forward, a little to her right
    const mx = -0.08, my = -0.42, mz = surfZ(mx, my);
    for (const sd of [-1, 1]) out.push(P(sph(0.12, 8, 6), LIPS2, [mx + sd * 0.1, my + 0.07, mz - 0.05], [0, 0, sd * -0.4], [1.2, 0.7, 0.8])); // upper lip
    out.push(P(sph(0.15, 9, 6), LIPS, [mx, my - 0.08, mz - 0.06], [0, 0, 0], [1.25, 0.75, 0.85])); // lower lip
    out.push(P(sph(0.06, 6, 4), LASH, [mx, my, mz - 0.13], [0, 0, 0], [1.6, 0.5, 0.5])); // the little pucker
    // --- collar: a high purple collar flaring out below, the top edge dipping to a V at the front, gold trim,
    //     and a gold four-point star brooch at the V
    const dip = (g, amount, top) => {
      const a = g.getAttribute('position');
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i), z = a.getZ(i), y = a.getY(i), r = Math.hypot(x, z) || 1;
        const f = Math.max(0, -z / r) ** 3; // only the front
        if (top === undefined || y > top) a.setY(i, y - amount * f);
      }
      a.needsUpdate = true; return g;
    };
    const collar = new THREE.CylinderGeometry(1.06, 1.46, 0.76, 22, 2, true);
    dip(collar, 0.2, 0.0);
    out.push(P(collar, ROBE, [0, -1.3, 0.05]));
    out.push(P(new THREE.CylinderGeometry(1.02, 1.42, 0.72, 22, 1, true), ROBE2, [0, -1.32, 0.05])); // inside face
    out.push(P(new THREE.CylinderGeometry(1.46, 1.46, 0.03, 22), ROBE2, [0, -1.68, 0.05])); // bottom
    out.push(P(new THREE.CylinderGeometry(0.75, 0.8, 0.5, 14), SKIN, [0, -1.1, 0.05])); // neck inside the collar
    const trim = new THREE.TorusGeometry(1.07, 0.075, 4, 30); trim.rotateX(PI / 2); dip(trim, 0.2);
    out.push(P(trim, GOLD, [0, -0.92, 0.05]));
    out.push(P(slab([[0, 0.3], [0.08, 0.08], [0.24, 0], [0.08, -0.08], [0, -0.32], [-0.08, -0.08], [-0.24, 0], [-0.08, 0.08]], 0.1, 0.05), GOLD, [0, -1.28, -1.3], [0.24, 0, 0], [1.2, 1.2, 1]));
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
if (typeof module !== 'undefined') module.exports = ZoeHead;
