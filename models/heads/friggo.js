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
  const HAIR = '#F7B238', FACE = '#D97627', SHADES = '#3B2E1F', COLLAR = '#F3E4CF', COLLAR2 = '#D9C7AE', HEART = '#C4414A', BANDAGE = '#E6D3B8', PICK = '#E8A43C';

  // the face: a long wedge, widest at the cheekbones/glasses, tapering to a square chin; a flat facet at the front
  // measured from the sheet's front view (chin at y -1, hairline at 1): [y, halfWidth, halfDepth, centreZ, centreX, turn]
  const FACE_RINGS = [
    [-1.0, 0.44, 0.42, 0.0, 0, 0.5], // chin: square and wide
    [-0.6, 0.64, 0.62, 0.02, 0, 0.5], // jaw, at the mouth
    [-0.15, 0.74, 0.74, 0.04, 0, 0.5], // cheeks
    [0.27, 0.77, 0.78, 0.05, 0, 0.5], // glasses
    [0.9, 0.73, 0.8, 0.08, 0, 0.5], // temples
    [1.2, 0.6, 0.74, 0.1, 0, 0.5], // under the hair
  ];
  const frontZ = (ring) => ring[3] - ring[2] * Math.cos(PI / 8); // the front facet's depth at that ring

  const parts = () => {
    const out = [];
    out.push({ g: loft(FACE_RINGS, [0, 1.25, 0.1], [0, -1.04, 0.0]), col: FACE });
    // hair: a big faceted pompadour, wider than the face, jutting forward over the forehead, peaking at the top front
    // hair: a wide, deep block wrapping down the back of the head, a straight hairline across the forehead, and a
    // pitched roof up to a peak a little to one side. About half as tall as the face, a bit wider than it.
    const HAIR_RINGS = [
      [0.2, 0.7, 0.42, 0.5, 0.0, 0], // low at the back (its front is hidden inside the face)
      [0.98, 1.0, 0.96, -0.02, 0.0, 0.5], // the hairline, jutting forward over the forehead
      [1.5, 1.14, 1.02, -0.08, 0.03, 0], // where the roof starts: wider than the glasses
    ];
    out.push({ g: loft(HAIR_RINGS, [0.24, 2.3, -0.3], [0, 0.2, 0.55], 6), col: HAIR }); // the peak off to his right // six sides: bold facets
    // ears: plain flat shapes at glasses height
    for (const sd of [-1, 1]) out.push(P(new THREE.CylinderGeometry(0.24, 0.21, 0.12, 6), FACE, [sd * 0.8, 0.02, 0.28], [0, 0, PI / 2], [1, 1, 1.35]));
    // nose: a wedge pointing down and forward under the glasses
    const fz = frontZ(FACE_RINGS[3]), cz = frontZ(FACE_RINGS[2]);
    { const g = new THREE.ConeGeometry(0.17, 0.72, 3, 1); g.rotateY(PI); g.rotateX(PI - 0.35);
      out.push(P(g, FACE, [0, -0.08, (fz + cz) / 2 - 0.12])); }
    // sunglasses: a straight yellow top bar, two dark trapezoid lenses in yellow rims, a bridge, arms to the ears
    const gy = 0.07, gz = fz - 0.12;
    out.push(P(new THREE.BoxGeometry(1.76, 0.12, 0.1), HAIR, [0, gy + 0.2, gz]));
    for (const sd of [-1, 1]) {
      const lens = [[-0.38, 0.18], [0.38, 0.18], [0.33, -0.12], [0.18, -0.22], [-0.31, -0.18]].map(([x, y]) => [x * sd, y]);
      const rim = [[-0.42, 0.22], [0.43, 0.22], [0.38, -0.15], [0.2, -0.27], [-0.35, -0.22]].map(([x, y]) => [x * sd, y]);
      out.push(P(slab(rim, 0.08), HAIR, [sd * 0.44, gy, gz + 0.03]));
      out.push(P(slab(lens, 0.08), SHADES, [sd * 0.44, gy, gz - 0.02]));
      out.push(P(new THREE.BoxGeometry(0.07, 0.07, 1.0), HAIR, [sd * 0.84, gy + 0.18, gz + 0.5])); // arm
    }
    // mouth: a short line, a touch higher on the toothpick side
    const my = -0.6, mz = frontZ([my, 0, 0.6, 0.02]) - 0.02;
    out.push(P(new THREE.BoxGeometry(0.26, 0.04, 0.05), SHADES, [-0.02, my, mz], [0, 0, 0.12]));
    // toothpick: out of the mouth's corner (his left, -x), angled out and a little down
    { const g = new THREE.CylinderGeometry(0.025, 0.025, 0.72, 4); g.rotateZ(PI / 2 + 0.25); g.rotateY(-0.35);
      out.push(P(g, PICK, [-0.4, my - 0.06, mz - 0.1])); }
    // plaster: a rounded cream strip on his right cheek (+x), tilted
    { const g = slab(rounded(0.62, 0.22, 0.09), 0.04);
      out.push(P(g, BANDAGE, [0.48, -0.36, frontZ([-0.36, 0, 0.7, 0.03]) + 0.12], [0, 0.55, 0.42])); }
    // collar: a cream shirt collar standing round the neck, open at the front, two flaps folded out; a red heart on
    // the flap on his left (-x)
    out.push(P(new THREE.CylinderGeometry(0.42, 0.46, 0.5, 10), FACE, [0, -1.1, 0.06])); // neck
    // a simple ring collar, wider at the top, tipped down at the front; a cream heart patch on the front-left
    const cy = -1.24, ch = 0.5, tilt = [-0.1, 0, 0];
    out.push(P(new THREE.CylinderGeometry(0.86, 0.8, ch, 10, 1, true), COLLAR, [0, cy, 0.04], tilt));
    out.push(P(new THREE.CylinderGeometry(0.62, 0.62, ch, 10, 1, true), FACE, [0, cy, 0.04], tilt)); // inside
    out.push(P(new THREE.RingGeometry(0.6, 0.86, 10, 1), COLLAR, [0, cy + ch / 2, 0.04], [-PI / 2 - 0.1, 0, 0])); // top edge
    out.push(P(new THREE.CircleGeometry(0.8, 10), COLLAR2, [0, cy - ch / 2, 0.04], [PI / 2 - 0.1, 0, 0])); // bottom
    out.push(P(slab(heart(0.16), 0.04), HEART, [-0.38, cy - 0.04, -0.8], [-0.04, 0.42, 0]));
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
