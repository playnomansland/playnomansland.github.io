// Emile, the Recruiter (2026-11-07): leader head built from Vilhelm's reference sheet.
// Warm grandpa walrus: big tilted green beret with a gold key, small round ears, cream side tufts, chunky orange
// brows, round gold glasses over closed happy eyes, rosy cheeks, a broad nose, a huge two-lobed orange moustache,
// long cream tusks. No neck. Faces -z, about 3 units tall. Flat-shaded facets like the reference. Budget 3000 tris.
const EmileHead = (THREE) => {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const P = (g, col, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0], sc) => {
    g.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc ? s.set(...sc) : s.set(1, 1, 1)));
    return { g, col };
  };
  const PI = Math.PI;
  const sph = (r, w, h) => new THREE.SphereGeometry(r, w, h);
  const cyl = (rt, rb, h, n = 12) => new THREE.CylinderGeometry(rt, rb, h, n);
  const ring = (r, t, n = 14, rs = 6, arc = PI * 2) => new THREE.TorusGeometry(r, t, rs, n, arc);
  const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
  // a chunky slab: a 2D outline, extruded with one bevel step (the faceted look of the reference)
  const slab = (pts, depth, bevel = 0.06) => {
    const sh = new THREE.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 });
    g.translate(0, 0, -depth / 2); return g;
  };
  // wrap a part around the face: points further out to the side move back (+z); facing -z
  const wrap = (g, k, x0 = 0) => {
    const a = g.getAttribute('position');
    for (let i = 0; i < a.count; i++) a.setZ(i, a.getZ(i) + k * (a.getX(i) - x0) ** 2);
    a.needsUpdate = true; return g;
  };
  // bend a part along its length (y): the tip curves toward +z by k * (distance from the root)^2
  const bendY = (g, k, y0) => {
    const a = g.getAttribute('position');
    for (let i = 0; i < a.count; i++) a.setZ(i, a.getZ(i) + k * (y0 - a.getY(i)) ** 2);
    a.needsUpdate = true; return g;
  };

  // reference palette
  const HIDE = '#8B6461', HIDE2 = '#7A5552', CREAM = '#EED9B5', ORANGE = '#E07A2E', PINK = '#E88A86';
  const GOLD = '#E6B032', CAP = '#5B8C3E', CAP2 = '#4E7C35', DARK = '#2B1E1C';

  const parts = () => {
    const out = [];
    // --- head: a wide bell, fuller at the jowls
    out.push(P(sph(1, 14, 11), HIDE, [0, 0.08, 0], [0, 0, 0], [1.24, 0.94, 1.04]));
    out.push(P(sph(0.95, 12, 8), HIDE, [0, -0.46, -0.15], [0, 0, 0], [1.4, 0.88, 1.02])); // jowls and chin
    for (const sd of [-1, 1]) out.push(P(sph(0.5, 8, 6), HIDE, [sd * 0.82, -0.62, -0.42], [0, 0, 0], [1.05, 0.85, 0.95])); // heavy lower cheeks
    out.push(P(sph(0.7, 10, 7), HIDE, [0, -0.42, -0.55], [0, 0, 0], [1.45, 0.9, 0.85])); // muzzle, under the moustache
    // ears: small round bumps at the top sides, half under the cap
    for (const sd of [-1, 1]) {
      out.push(P(sph(0.24, 6, 5), HIDE, [sd * 1.16, 0.66, 0.1], [0, 0, 0], [0.6, 1, 0.9]));
      out.push(P(sph(0.14, 6, 5), HIDE2, [sd * 1.27, 0.66, 0.05], [0, 0, 0], [0.4, 0.8, 0.7]));
    }
    // cream side tufts: chunky clumps fanning out between the cap and the cheeks
    for (const sd of [-1, 1]) {
      // fluffy clumps: rounded, longer than wide, pointing out and down, layered
      [[1.3, 0.42, 0.0, 0.25, 0.26], [1.36, 0.16, -0.05, 0.55, 0.25], [1.28, -0.08, -0.05, 0.85, 0.22], [1.18, 0.5, 0.3, 0.1, 0.22], [1.22, 0.22, 0.32, 0.5, 0.2]].forEach(([x, y, z, a, r]) =>
        out.push(P(sph(r, 5, 4), CREAM, [sd * x, y, z], [0, 0, sd * -a], [1.7, 0.85, 0.85])));
    }
    // --- cap: a big beret tilted to one side, with a band and the gold key on the front
    const capRot = [0.1, 0, 0.22];
    out.push(P(sph(1.05, 14, 8), CAP, [0.2, 1.02, 0.08], capRot, [1.36, 0.52, 1.22]));
    out.push(P(cyl(0.98, 1.02, 0.2, 20), CAP2, [0.1, 0.76, 0.05], capRot, [1.24, 1, 1.08]));
    out.push(P(sph(0.09, 6, 4), CAP2, [0.42, 1.55, 0.12])); // the nub on top
    // the key: a ring (bow), a shaft and two teeth, lying on the front of the cap
    {
      const kRot = [0.42, 0, 0.18], kp = [0.12, 1.02, -1.22], kS = [1.5, 1.5, 0.8];
      const key = [
        P(ring(0.15, 0.055, 10, 4), GOLD, [0.28, 0, 0]),
        P(new THREE.BoxGeometry(0.42, 0.09, 0.08), GOLD, [-0.07, 0, 0]),
        P(new THREE.BoxGeometry(0.08, 0.14, 0.08), GOLD, [-0.24, -0.1, 0]),
        P(new THREE.BoxGeometry(0.08, 0.1, 0.08), GOLD, [-0.12, -0.08, 0]),
      ];
      for (const k of key) out.push(P(k.g, GOLD, kp, kRot, kS));
    }
    // --- face
    for (const sd of [-1, 1]) {
      // brows: thick orange slabs, raised kindly (inner ends a little lower)
      out.push(P(slab([[-0.31, -0.05], [-0.1, 0.06], [0.12, 0.06], [0.31, -0.06], [0.29, 0.07], [0.1, 0.18], [-0.12, 0.18], [-0.31, 0.07]], 0.16, 0.05), ORANGE, [sd * 0.46, 0.74, -0.97], [0.22, sd * -0.35, sd * -0.08])); // arched, raised: warm and proud
      // glasses: thick gold rings over closed happy eyes (arcs bowing upward)
      out.push(P(ring(0.29, 0.055, 12, 4), GOLD, [sd * 0.43, 0.24, -1.12], [0, sd * -0.2, 0]));
      out.push(P(ring(0.15, 0.05, 6, 4, PI), DARK, [sd * 0.43, 0.16, -1.06], [0, sd * -0.2, 0], [1, 0.62, 1])); // eye squeezed shut in a smile
      out.push(P(sph(0.16, 6, 4), '#9A706A', [sd * 0.43, 0.07, -1.0], [0, sd * -0.2, 0], [1.1, 0.42, 0.5])); // cheek pushing up under the eye
      for (const [dy, a] of [[0.05, 0.35], [-0.04, -0.2]]) out.push(P(new THREE.BoxGeometry(0.13, 0.035, 0.04), HIDE2, [sd * 0.79, 0.2 + dy, -0.93], [0, sd * -0.8, sd * a])); // crow's feet
      out.push(P(new THREE.BoxGeometry(0.3, 0.06, 0.06), GOLD, [sd * 0.84, 0.3, -0.95], [0, sd * 0.9, 0])); // arm
      // rosy cheeks
      out.push(P(sph(0.3, 9, 6), PINK, [sd * 0.84, 0.0, -0.86], [0, sd * -0.62, 0], [1, 0.78, 0.42]));
    }
    out.push(P(new THREE.BoxGeometry(0.2, 0.06, 0.06), GOLD, [0, 0.3, -1.15])); // glasses bridge
    out.push(P(sph(0.27, 10, 7), '#9A706A', [0, 0.02, -1.18], [0, 0, 0], [1.4, 0.8, 0.85])); // broad nose
    // --- the moustache: two big lobes meeting under the nose in a notch, sweeping down and out to curled tips
    const half = [[0.02, 0.0], [0.22, 0.12], [0.5, 0.13], [0.76, 0.03], [0.96, -0.2], [1.04, -0.5], [1.0, -0.8], [0.9, -1.0], [0.8, -0.92], [0.68, -0.68], [0.5, -0.5], [0.3, -0.42], [0.12, -0.38], [0.03, -0.25]];
    for (const sd of [-1, 1]) {
      const pts = sd > 0 ? half : mirror(half);
      const g = wrap(slab(pts.map(([x, y]) => [x * 1.12, y * 1.05]), 0.24, 0.1), 0.36);
      out.push(P(g, ORANGE, [0, -0.27, -1.13], [-0.22, 0, 0]));
    }
    // --- tusks: long cream cones under the moustache, curving slightly forward then down
    for (const sd of [-1, 1]) {
      const g = new THREE.ConeGeometry(0.27, 1.02, 7, 4);
      g.rotateX(PI); // point down
      bendY(g, 0.16, 0.51); // tips curve gently back
      out.push(P(g, CREAM, [sd * 0.36, -1.18, -1.0], [0.05, 0, sd * 0.06], [1, 1, 0.85]));
      out.push(P(sph(0.27, 7, 3), CREAM, [sd * 0.36, -0.69, -1.0], [0, 0, 0], [1, 0.5, 0.85])); // rounded root
    }
    // a subtle smile under the moustache, between the tusks
    out.push(P(ring(0.15, 0.035, 6, 4, PI), DARK, [0, -0.8, -1.02], [0.15, 0, PI], [1, 0.7, 1]));
    out.push(P(sph(0.12, 6, 4), '#C77A74', [0, -0.92, -0.98], [0, 0, 0], [1.2, 0.55, 0.6])); // lower lip
    // --- neck and a simple green collar (a rolled band with a lighter stripe)
    out.push(P(cyl(0.6, 0.66, 0.5, 14), HIDE, [0, -1.2, 0.12]));
    out.push(P(cyl(0.72, 0.84, 0.46, 16), CAP, [0, -1.56, 0.12])); // the band, a little wider at the bottom
    out.push(P(cyl(0.78, 0.8, 0.07, 16), '#8CA06E', [0, -1.6, 0.12])); // lighter stripe
    out.push(P(ring(0.7, 0.11, 14, 3), CAP2, [0, -1.33, 0.12], [PI / 2, 0, 0])); // rolled top edge
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
  return { KEYS: ['emile'], geometry: () => geometry(), tris: () => geometry().getAttribute('position').count / 3 };
};
if (typeof module !== 'undefined') module.exports = EmileHead;
