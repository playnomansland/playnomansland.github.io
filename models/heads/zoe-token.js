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
  const star = (r, ri, t) => {
    const rim = Array.from({ length: 10 }, (_, i) => { const a = PI / 2 + i * PI / 5, rr = i % 2 ? ri : r; return [Math.cos(a) * rr, Math.sin(a) * rr]; });
    const pos = [];
    for (let i = 0; i < 10; i++) {
      const [x0, y0] = rim[i], [x1, y1] = rim[(i + 1) % 10];
      pos.push(0, 0, -t, x0, y0, 0, x1, y1, 0); // front
      pos.push(0, 0, t, x1, y1, 0, x0, y0, 0); // back
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
  };

  // palette from the sheet
  const FACE = '#B77AB4', MID = '#9A639B', DARK = '#6A4170', GOLD = '#F2B544', CREAM = '#F6E2C0';

  // the head: an 8-sided lathe with a ridge down the front (a vertex faces -z), flat-shaded into big facets
  const PROFILE = [[0.0, -1.0], [0.66, -1.0], [0.98, -0.42], [1.18, 0.04], [0.86, 0.56], [0.38, 1.0], [0.0, 1.0]]; // a gem: widest at the eyes, small flat top, hard taper to the chin
  const SEG = 8, DEPTH = 0.9, SX = 1.14; // a wide gem
  const at = (a, r, y) => new THREE.Vector3(r * Math.sin(a) * SX, y, r * Math.cos(a) * DEPTH);
  // a point on one facet: segment i (angles i and i+1 around from the back), ring j (profile points j and j+1),
  // u across (0 at angle i, 1 at angle i+1), v up (0 at ring j, 1 at ring j+1); with the facet's outward normal
  const facet = (i, j, u, v) => {
    const a0 = i * 2 * PI / SEG, a1 = (i + 1) * 2 * PI / SEG, [r0, y0] = PROFILE[j], [r1, y1] = PROFILE[j + 1];
    const p00 = at(a0, r0, y0), p10 = at(a1, r0, y0), p01 = at(a0, r1, y1), p11 = at(a1, r1, y1);
    const p = p00.clone().lerp(p10, u).lerp(p01.clone().lerp(p11, u), v);
    const across = p10.clone().sub(p00).normalize(), upv = p01.clone().lerp(p11, 0.5).sub(p00.clone().lerp(p10, 0.5)).normalize();
    const n = new THREE.Vector3().crossVectors(upv, across).normalize();
    if (n.dot(p) < 0) n.negate();
    return { p, n, across, up: upv };
  };
  // lay a flat part on a facet: local x along 'x', local y up the facet, local z out of it
  const onFacet = (g, f, x, lift) => {
    const z = f.n.clone(), y = f.up.clone().sub(z.clone().multiplyScalar(f.up.dot(z))).normalize(), xx = new THREE.Vector3().crossVectors(y, z);
    if (xx.dot(x) < 0) { xx.negate(); }
    const M = new THREE.Matrix4().makeBasis(xx, y, xx.clone().cross(y).normalize());
    g.applyMatrix4(M); g.translate(f.p.x + z.x * lift, f.p.y + z.y * lift, f.p.z + z.z * lift); return g;
  };

  const parts = () => {
    const out = [];
    out.push(P(new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), SEG), FACE, [0, 0, 0], [0, 0, 0], [SX, 1, DEPTH]));
    // eyes and brows: on the two facets either side of the front ridge (segments 3 and 4; the ridge is at angle PI)
    for (const sd of [-1, 1]) {
      const i = sd > 0 ? 3 : 4; // segment 3 spans angles 3PI/4..PI (the +x side of the ridge), segment 4 PI..5PI/4 (-x)
      const f = facet(i, 2, sd > 0 ? 0.34 : 0.66, 0.74);
      const outward = new THREE.Vector3(Math.sign(f.p.x) || sd, 0, 0);
      // the eye: a blank cream wedge, its top edge slanting down toward the middle, a curved bottom
      const eye = [[-0.32, -0.08], [0.32, 0.2], [0.33, 0.04], [0.26, -0.14], [0.08, -0.24], [-0.12, -0.23], [-0.28, -0.15]].map(([x, y]) => [x * 1.4, y * 1.4]); // a half-moon, the top edge rising to the outside
      out.push({ g: onFacet(slab(eye, 0.04), f, outward, 0.012), col: CREAM });
      // the brow: a heavy dark bar over the top of the eye, slanting down toward the middle
      const brow = [[-0.46, -0.1], [0.34, 0.26], [0.3, 0.43], [-0.48, 0.06]]; // steep: low at the middle, high at the outside // a thick bar sitting right on the eye's top edge // short, thick and steep; a gap to the other brow
      out.push({ g: onFacet(slab(brow, 0.07), f, outward, 0.04), col: DARK });
    }
    // antennae: two four-sided prisms each, with a kink, leaning out; a faceted gold star on each tip
    for (const sd of [-1, 1]) {
      const base = new THREE.Vector3(sd * 0.26, 0.9, 0.0);
      const d1 = new THREE.Vector3(sd * 0.16, 0.34, 0), d2 = new THREE.Vector3(sd * 0.05, 0.26, 0);
      const seg = (from, d, w) => {
        const g = new THREE.CylinderGeometry(w, w, d.length(), 4, 1); g.rotateY(PI / 4);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
        const m = from.clone().addScaledVector(d, 0.5); g.translate(m.x, m.y, m.z); return g;
      };
      out.push({ g: seg(base, d1.clone().multiplyScalar(1.25), 0.21), col: MID }); // runs a little past the kink, so the joint has no gap
      const knee = base.clone().add(d1);
      out.push({ g: seg(knee.clone().addScaledVector(d1, -0.12), d2.clone().multiplyScalar(1.3), 0.19), col: MID });
      const tip = knee.clone().add(d2);
      out.push(P(star(0.46, 0.29, 0.16), GOLD, [tip.x + sd * 0.1, tip.y + 0.22, tip.z], [0, sd * 0.35, sd * -0.15])); // fat and chunky
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
