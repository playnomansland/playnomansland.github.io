// Friggo (2026-11-07; the leader formerly called Frickolas Cage, id 'cage'): token head from Vilhelm's reference
// sheet. Charming, flamboyant, carefree: just a dude. Low-poly, bold, readable, about 1,200-2,000 triangles:
// a long angular face wedge tapering to a square chin, a big faceted pompadour peaking at the top front, wide dark
// sunglasses with a yellow frame, a wedge nose, plain ears, a toothpick out of one corner of the mouth, a plaster on
// the other cheek, and a cream shirt collar as the base with a red heart on the front flap. Faces -z, flat-shaded.
const FriggoHead = (THREE) => {
  const PI = Math.PI;
  const mat = (pos = [0, 0, 0], rot = [0, 0, 0], sc) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), sc ? new THREE.Vector3(...sc) : new THREE.Vector3(1, 1, 1));
  const P = (g, col, pos, rot, sc) => { g.applyMatrix4(mat(pos, rot, sc)); return { g, col }; };
  const slab = (pts, depth) => {
    const sh = new THREE.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -depth / 2); return g;
  };
  // a solid from stacked 8-sided rings: [y, halfWidth, halfDepth, centreZ, centreX, turn]; turn 0.5 puts a flat facet
  // at the front, a ring turned against its neighbour gives triangular facets; the ends are closed with a point
  const loft = (rings, capTop, capBot, sides = 8) => {
    const pos = [], tri = (A, B, C) => {
      const n = new THREE.Vector3().crossVectors(B.clone().sub(A), C.clone().sub(A));
      const mid = A.clone().add(B).add(C).multiplyScalar(1 / 3), c = mid.clone().sub(centre);
      if (n.dot(c) < 0) [B, C] = [C, B];
      pos.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
    };
    const pt = ([y, w, d, zc, xc, turn], i) => { const a = (i + turn) * 2 * PI / sides; return new THREE.Vector3(xc + w * Math.sin(a), y, zc - d * Math.cos(a)); };
    let centre = new THREE.Vector3();
    for (const r of rings) centre.add(new THREE.Vector3(r[4], r[0], r[3])); centre.multiplyScalar(1 / rings.length);
    for (let k = 0; k < rings.length - 1; k++) {
      const R0 = rings[k], R1 = rings[k + 1];
      centre = new THREE.Vector3((R0[4] + R1[4]) / 2, (R0[0] + R1[0]) / 2, (R0[3] + R1[3]) / 2);
      for (let i = 0; i < sides; i++) {
        const A = pt(R0, i), B = pt(R0, i + 1);
        if (R0[5] === R1[5]) { tri(A, B, pt(R1, i + 1)); tri(A, pt(R1, i + 1), pt(R1, i)); }
        else if (R1[5] > R0[5]) { tri(A, B, pt(R1, i)); tri(A, pt(R1, i), pt(R1, i - 1)); }
        else { tri(A, B, pt(R1, i + 1)); tri(A, pt(R1, i + 1), pt(R1, i)); }
      }
    }
    const T = rings[rings.length - 1], Bt = rings[0];
    centre = new THREE.Vector3(T[4], T[0] - 0.3, T[3]);
    for (let i = 0; i < sides; i++) tri(new THREE.Vector3(...capTop), pt(T, i), pt(T, i + 1));
    centre = new THREE.Vector3(Bt[4], Bt[0] + 0.3, Bt[3]);
    for (let i = 0; i < sides; i++) tri(new THREE.Vector3(...capBot), pt(Bt, i), pt(Bt, i + 1));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
  };
  const heart = (s) => Array.from({ length: 20 }, (_, i) => { const t = i / 20 * 2 * PI; return [s * 16 * Math.sin(t) ** 3 / 16, s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]; });
  const rounded = (w, h, r, n = 3) => { // a rounded rectangle outline (the plaster)
    const pts = [], c = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, PI / 2], [-w / 2 + r, -h / 2 + r, PI], [w / 2 - r, -h / 2 + r, 1.5 * PI]];
    for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + i / n * PI / 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
  };

  // palette from the sheet
  const HAIR = '#F7B238', FACE = '#EA8F37', SHADES = '#3B2E1F', COLLAR = '#F3E4CF', COLLAR2 = '#D9C7AE', HEART = '#C4414A', BANDAGE = '#E6D3B8', PICK = '#E8A43C';

  // the face: a long wedge, widest at the cheekbones/glasses, tapering to a square chin; a flat facet at the front
  // a solid from stacked polygon rings: each ring { y, pts: [[x, z], ...] }, the same number of points, going round
  // the same way; quads between rings, the ends closed with a fan
  const loftPoly = (rings, apex) => { // apex: optional [x, y, z] the top closes to (a peak), instead of a flat lid
    const pos = [];
    const tri = (A, B, C, inside) => {
      const n = new THREE.Vector3().crossVectors(B.clone().sub(A), C.clone().sub(A));
      const out = A.clone().add(B).add(C).multiplyScalar(1 / 3).sub(inside);
      if (n.dot(out) < 0) [B, C] = [C, B];
      pos.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
    };
    const V = (r, i) => { const [x, z] = r.pts[(i + r.pts.length) % r.pts.length]; return new THREE.Vector3(x, r.y, z); };
    const mid = (r) => { const c = r.pts.reduce((a, [x, z]) => [a[0] + x, a[1] + z], [0, 0]); return new THREE.Vector3(c[0] / r.pts.length, r.y, c[1] / r.pts.length); };
    for (let k = 0; k < rings.length - 1; k++) {
      const R0 = rings[k], R1 = rings[k + 1], inside = mid(R0).lerp(mid(R1), 0.5);
      for (let i = 0; i < R0.pts.length; i++) { tri(V(R0, i), V(R0, i + 1), V(R1, i + 1), inside); tri(V(R0, i), V(R1, i + 1), V(R1, i), inside); }
    }
    for (const [r, dy, top] of [[rings[0], 0.3, false], [rings[rings.length - 1], -0.3, true]]) {
      const c = top && apex ? new THREE.Vector3(...apex) : mid(r), inside = mid(r).add(new THREE.Vector3(0, dy, 0));
      for (let i = 0; i < r.pts.length; i++) tri(c, V(r, i), V(r, i + 1), inside);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g;
  };
  // Measured from the sheet's front view AND its profile, at one scale (hairline y 1, chin y -1, face front z -0.64).
  // Each ring: [y, front half-width, front z, cheek x, cheek z, side x, side z, back x, back z]: a box with
  // chamfered front corners.
  const FACE_SEC = [
    [-1.0, 0.36, -0.6, 0.55, -0.42, 0.56, 0.0, 0.4, 0.3], // chin: square, flat-bottomed
    [-0.55, 0.44, -0.66, 0.72, -0.34, 0.74, 0.3, 0.5, 0.7], // jaw corner, at the mouth
    [-0.1, 0.48, -0.68, 0.8, -0.34, 0.8, 0.4, 0.55, 0.85], // cheekbones, under the glasses
    [0.7, 0.48, -0.66, 0.8, -0.32, 0.8, 0.4, 0.55, 0.9], // top of the glasses
    [1.25, 0.45, -0.62, 0.76, -0.3, 0.76, 0.4, 0.52, 0.9], // under the hair
  ];
  const ring = ([y, fx, fz, cx, cz, sx, sz, bx, bz]) => ({ y, pts: [[fx, fz], [cx, cz], [sx, sz], [bx, bz], [-bx, bz], [-sx, sz], [-cx, cz], [-fx, fz]] });
  const frontZ = (y) => {
    for (let i = 0; i < FACE_SEC.length - 1; i++) { const a = FACE_SEC[i], b = FACE_SEC[i + 1]; if (y >= a[0] && y <= b[0]) return a[2] + (b[2] - a[2]) * (y - a[0]) / (b[0] - a[0]); }
    return -0.62;
  };
  // The quiff, from the profile: a huge wedge pointing forward. Its point juts 0.7 past the forehead at y 1.7, the
  // peak sits above the face's front at y 2.57 (a little to his right), the top slopes down to the back of the head,
  // and the back runs down to the neck. From the front it's about 1.6 times the face's width.
  const HAIR_SEC = [
    [-0.75, 0.3, 0.5, 0.45, 0.6, 0.5, 0.95, 0.35, 1.13], // low at the back of the head (its front inside the head)
    [0.35, 0.5, 0.0, 0.84, 0.0, 0.86, 0.6, 0.6, 1.3], // the sides close onto the head above the ears
    [0.75, 0.55, -0.2, 0.9, -0.1, 0.94, 0.7, 0.7, 1.5], // the sides come down past the temples
    [1.15, 0.7, -0.84, 1.08, -0.5, 1.12, 0.6, 0.8, 1.6], // the hairline: overhangs the forehead; the sides taper in below the widest point
    [1.62, 0.55, -1.32, 1.31, -0.8, 1.25, 0.6, 0.8, 1.68], // the widest, the point jutting forward
    [2.15, 0.42, -0.94, 0.84, -0.66, 0.74, -0.05, 0.42, 0.3], // the roof: the top slopes from the peak down to the back
  ];

  const parts = () => {
    const out = [];
    out.push({ g: loftPoly(FACE_SEC.map(ring)), col: FACE });
    out.push(P(new THREE.CylinderGeometry(0.52, 0.58, 0.8, 8), FACE, [0, -1.15, 0.2])); // neck
    out.push({ g: loftPoly(HAIR_SEC.map(ring), [0.3, 2.57, -0.55]), col: HAIR }); // the peak: a little to his right, above the face's front
    // ears: big, at glasses height, set back on the sides
    for (const sd of [-1, 1]) {
      out.push(P(new THREE.CylinderGeometry(0.3, 0.27, 0.14, 7), FACE, [sd * 0.85, 0.2, 0.42], [0, sd * 0.25, PI / 2], [1.4, 1, 1.0]));
      out.push(P(new THREE.CylinderGeometry(0.18, 0.15, 0.06, 7), '#C96A22', [sd * 0.92, 0.2, 0.4], [0, sd * 0.25, PI / 2], [1.4, 1, 1.0])); // the inner ear
    }
    // nose: a big wedge from between the lenses down to below them, pointing out; a flat underside
    { const g = new THREE.ConeGeometry(0.24, 0.92, 3, 1); g.rotateY(PI); g.rotateX(PI - 0.45);
      out.push(P(g, FACE, [0, 0.0, frontZ(0) - 0.2])); }
    // sunglasses: wider than the face; a straight yellow top bar, dark trapezoid lenses in yellow rims, arms to the ears
    const gy = 0.36, gz = frontZ(gy) - 0.1, GS = 1.15;
    out.push(P(new THREE.BoxGeometry(2.1, 0.13, 0.1), HAIR, [0, gy + 0.23, gz]));
    for (const sd of [-1, 1]) {
      const lens = [[-0.36, 0.18], [0.38, 0.18], [0.33, -0.12], [0.18, -0.22], [-0.3, -0.18]].map(([x, y]) => [x * sd * GS, y * GS]);
      const rim = [[-0.4, 0.22], [0.43, 0.22], [0.38, -0.15], [0.2, -0.27], [-0.34, -0.22]].map(([x, y]) => [x * sd * GS, y * GS]);
      out.push(P(slab(rim, 0.08), HAIR, [sd * 0.52, gy, gz + 0.03]));
      out.push(P(slab(lens, 0.08), SHADES, [sd * 0.52, gy, gz - 0.02]));
      out.push(P(new THREE.BoxGeometry(0.08, 0.08, 1.05), HAIR, [sd * 1.0, gy + 0.2, gz + 0.55])); // arm
    }
    // mouth: a short line; the toothpick out of the corner on his left (-x)
    const my = -0.62, mz = frontZ(my) - 0.02;
    out.push(P(new THREE.BoxGeometry(0.3, 0.045, 0.05), SHADES, [-0.04, my, mz], [0, 0, 0.1]));
    { const g = new THREE.CylinderGeometry(0.03, 0.03, 0.85, 4); g.rotateZ(PI / 2 + 0.25); g.rotateY(-0.35);
      out.push(P(g, PICK, [-0.48, my - 0.06, mz - 0.12])); }
    // plaster: on his right cheek plane (+x), tilted
    { const g = slab(rounded(0.58, 0.21, 0.09), 0.04);
      out.push(P(g, BANDAGE, [0.66, -0.2, -0.52], [0, -0.9, -0.42])); }
    // collar: a ring round the neck, tipped down at the front; a square tab with the heart on the front-left
    const cy = -1.43, ch = 0.36, tilt = [-0.12, 0, 0];
    out.push(P(new THREE.CylinderGeometry(0.98, 0.9, ch, 10, 1, true), COLLAR, [0, cy, 0.3], tilt));
    out.push(P(new THREE.CylinderGeometry(0.6, 0.6, ch, 10, 1, true), FACE, [0, cy, 0.3], tilt));
    out.push(P(new THREE.RingGeometry(0.58, 0.98, 10, 1), COLLAR, [0, cy + ch / 2, 0.3], [-PI / 2 - 0.12, 0, 0]));
    out.push(P(new THREE.CircleGeometry(0.9, 10), COLLAR2, [0, cy - ch / 2, 0.3], [PI / 2 - 0.12, 0, 0]));
    const tab = [-0.5, cy - 0.02, -0.6], tabRot = [-0.12, 0.45, 0];
    out.push(P(new THREE.BoxGeometry(0.5, 0.42, 0.07), COLLAR, tab, tabRot));
    { const g = slab(heart(0.15), 0.04); g.translate(0, 0, -0.05); out.push(P(g, HEART, tab, tabRot)); }
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
  return { KEYS: ['friggo'], geometry: () => geometry(), tris: () => geometry().getAttribute('position').count / 3 };
};
if (typeof module !== 'undefined') module.exports = FriggoHead;
