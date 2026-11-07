// Zoe, the Overseer (2026-11-07, v2): leader head rebuilt from Vilhelm's reference sheet.
// A bossy alien who knows exactly how things should be: stern and superior.
// A big lilac gourd of a head (round dome, full bulbous cheeks), soft and smooth like the reference, with big
// darker spots; huge eyes almost touching, under heavy lilac lids with a thick black lash line and winged corners,
// big pupils half under the lids glancing to her right; thick curved brows, her right one arched high; a pursed
// pout low on the face; broad triangular ears; thick antennae curling outward into big chunky gold stars; a collar
// hugging under the jaw, flaring out, with a V-neck, a thick gold trim and a big gold star brooch. Faces -z.
// Parts marked smooth keep soft normals (head, eyes, lips, spots); the rest are faceted.
const ZoeHead = (THREE) => {
  const PI = Math.PI;
  const mat = (pos = [0, 0, 0], rot = [0, 0, 0], sc) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), sc ? new THREE.Vector3(...sc) : new THREE.Vector3(1, 1, 1));
  const P = (g, col, pos, rot, sc, smooth) => { g.applyMatrix4(mat(pos, rot, sc)); return { g, col, smooth }; };
  const S = (g, col, pos, rot, sc) => P(g, col, pos, rot, sc, true); // a smooth part
  const G = (parts, pos, rot, sc) => { const M = mat(pos, rot, sc); for (const p of parts) p.g.applyMatrix4(M); return parts; };
  const sph = (r, w, h) => new THREE.SphereGeometry(r, w, h);
  const slab = (pts, depth, bevel = 0.04) => {
    const sh = new THREE.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 1 });
    g.translate(0, 0, -depth / 2); return g;
  };
  // a brush stroke: a polygon along a 2D curve, thick in the middle and thin at the ends (brows, lash lines)
  const stroke = (pts, w0, w1 = w0 * 0.25, n = 14, bias = 0.5) => {
    const c = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = c.getPoint(t), d = c.getTangent(t), nx = -d.y, ny = d.x;
      const u = t < bias ? t / bias * 0.5 : 0.5 + (t - bias) / (1 - bias) * 0.5; // the thickest point sits at 'bias'
      const w = w1 + (w0 - w1) * Math.pow(Math.sin(PI * u), 0.7);
      top.push([p.x + nx * w / 2, p.y + ny * w / 2]); bot.push([p.x - nx * w / 2, p.y - ny * w / 2]);
    }
    return top.concat(bot.reverse());
  };
  const starPts = (n, r, ri) => Array.from({ length: n * 2 }, (_, i) => { const a = PI / 2 + i * PI / n, rr = i % 2 ? ri : r; return [Math.cos(a) * rr, Math.sin(a) * rr]; });
  const wrap = (g, k) => { const a = g.getAttribute('position'); for (let i = 0; i < a.count; i++) a.setZ(i, a.getZ(i) + k * a.getX(i) ** 2); a.needsUpdate = true; return g; };

  // reference palette
  const SKIN = '#C38FCC', SPOT = '#A877B5', LID = '#A26FB1', BROW = '#5A3866', LASH = '#1E1622';
  const WHITE = '#F3E3C2', PUPIL = '#1A1320', LIPS = '#7E4880', LIPS2 = '#93598F';
  const ROBE = '#76508A', ROBE2 = '#5A3C6A', GOLD = '#EBB84A';

  // the head: a gourd. Round dome, widest low at the cheeks, then tucking in under the jaw.
  const PROFILE = [[0.0, 1.3], [0.38, 1.26], [0.68, 1.12], [0.9, 0.9], [1.06, 0.62], [1.18, 0.3], [1.27, -0.02], [1.33, -0.26], [1.38, -0.56], [1.32, -0.84], [1.14, -1.04], [0.82, -1.17], [0.42, -1.23], [0.0, -1.25]];
  const DEPTH = 0.93;
  const radiusAt = (y) => {
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const [r0, y0] = PROFILE[i], [r1, y1] = PROFILE[i + 1];
      if (y <= y0 && y >= y1) return r0 + (r1 - r0) * (y0 - y) / (y0 - y1);
    }
    return 0;
  };
  const surfZ = (x, y) => -DEPTH * Math.sqrt(Math.max(0, radiusAt(y) ** 2 - x * x));
  const normalAt = (x, y) => { const e = 0.02, z = surfZ(x, y); const a = new THREE.Vector3(2 * e, 0, surfZ(x + e, y) - surfZ(x - e, y)), b = new THREE.Vector3(0, 2 * e, surfZ(x, y + e) - surfZ(x, y - e)); return new THREE.Vector3().crossVectors(b, a).normalize(); };
  // lay a flat part on the face at (x, y), facing out along the surface
  const onFace = (g, x, y, lift = 0) => { const n = normalAt(x, y); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), n)); g.translate(x + n.x * lift, y + n.y * lift, surfZ(x, y) + n.z * lift); return g; };

  const parts = () => {
    const out = [];
    // --- head
    const lathe = new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)).reverse(), 18);
    lathe.scale(1, 1, DEPTH); lathe.computeVertexNormals();
    { // the lathe's first and last columns sit on the same seam: share their normals so no line shows
      const n = lathe.getAttribute('normal'), k = PROFILE.length, last = 18 * k;
      for (let j = 0; j < k; j++) { const x = (n.getX(j) + n.getX(last + j)) / 2, y = (n.getY(j) + n.getY(last + j)) / 2, z = (n.getZ(j) + n.getZ(last + j)) / 2; n.setXYZ(j, x, y, z); n.setXYZ(last + j, x, y, z); }
    }
    out.push({ g: lathe, col: SKIN, smooth: 'keep' });
    // spots: big soft circles on the cheeks, a few smaller on the dome
    for (const [x, y, r] of [[0.86, -0.42, 0.24], [0.62, -0.8, 0.15], [-0.88, -0.44, 0.22], [-0.66, -0.82, 0.14], [1.08, -0.02, 0.12]]) {
      out.push(P(onFace(new THREE.CircleGeometry(r, 18).rotateY(PI), x, y, 0.006), SPOT)); // flat paint: a disc facing out
    }
    for (const [x, y, z, r] of [[0.35, 1.05, 0.55, 0.14], [0.05, 0.6, 0.95, 0.16], [-0.75, 0.25, 0.85, 0.13]]) { // back of the head
      const n = new THREE.Vector3(x, y, z).normalize(), g = new THREE.CircleGeometry(r, 14);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
      const rr = radiusAt(y); const k = rr / Math.hypot(n.x, n.z); g.translate(n.x * k * 1.01, y, n.z * k * DEPTH * 1.01); out.push(P(g, SPOT));
    }
    // --- ears: broad flat triangles, tips out and a little up, a darker inner triangle on the front
    for (const sd of [-1, 1]) {
      const ear = slab([[0, -0.36], [1.0, 0.18], [0, 0.34]].map(([x, y]) => [x * sd, y]), 0.14, 0.06);
      out.push(P(ear, SKIN, [sd * 1.08, 0.18, 0.12], [0, sd * 0.35, sd * 0.12]));
      const inner = slab([[0.08, -0.2], [0.78, 0.15], [0.08, 0.2]].map(([x, y]) => [x * sd, y]), 0.04, 0.02);
      out.push(P(inner, SPOT, [sd * 1.08, 0.18, 0.12], [0, sd * 0.35, sd * 0.12], [1, 1, 1]));
      out[out.length - 1].g.translate(0, 0, -0.1);
    }
    // --- antennae: thick stalks from the top of the dome, curling outward like hooks, a big gold star at each end
    for (const sd of [-1, 1]) {
      const pts = [[0.3, 1.18, 0.12], [0.36, 1.6, 0.1], [0.42, 1.95, 0.05], [0.58, 2.2, 0.0], [0.82, 2.3, -0.02], [1.0, 2.26, -0.04]].map(([x, y, z]) => new THREE.Vector3(sd * x, y, z));
      out.push(S(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.105, 5, false), SKIN));
      out.push(S(sph(0.18, 8, 5), SKIN, [sd * 0.3, 1.18, 0.12], [0, 0, 0], [1, 0.7, 1])); // root
      out.push(P(slab(starPts(5, 0.44, 0.21), 0.2, 0.09), GOLD, [sd * 1.1, 2.3, -0.06], [0, sd * 0.3, sd * -0.22]));
    }
    // --- eyes: wide almonds set into the face, under smooth lids that blend into the head.
    //     A thick black lash line runs along each lid edge and flicks up into a sharp wing at the outer corner.
    //     Round pupils, about 40% of the eye wide, sit low with their tops cut off by the lid, glancing to her right (-x).
    const eye = (sd, lidH, tilt, arc) => {
      const R = 0.45, SY = 0.8, SZ = 0.36; // the eye: a flattened ellipsoid, wide and shallow
      const cx = sd * 0.5, cy = 0.12, cz = surfZ(cx, cy) + 0.04;
      const g = [];
      const t0 = Math.max(0, Math.acos(Math.max(-1, Math.min(1, lidH / R))) - 0.22); // only the part below the lid: no white can show above it
      g.push(S(new THREE.SphereGeometry(R, 16, 7, 0, PI * 2, t0, PI - t0), WHITE, [0, 0, 0], [0, 0, 0], [1, SY, SZ]));
      // pupil: a round disc lying on the front of the eye, low and to her right
      const px = -0.13, pr = 0.18, py = lidH * SY - pr * (arc > 0.4 ? 0.95 : 0.55); // the top tucked under the lash line
      const pz = -SZ * Math.sqrt(Math.max(0, R * R - px * px - (py / SY) ** 2));
      g.push(S(sph(pr, 16, 4).rotateX(PI / 2), PUPIL, [px, py, pz + 0.012], [0, 0, 0], [1, 1, 0.14])); // pole toward the viewer: a round outline
      // the lid: the top of a slightly bigger ellipsoid, cut level at lidH
      const R1 = R * 1.04, SZ1 = SZ * 1.25, th = Math.acos(Math.max(-1, Math.min(1, lidH / R1)));
      g.push(S(new THREE.SphereGeometry(R1, 16, 5, 0, PI * 2, 0, th), LID, [0, 0, 0], [0, 0, 0], [1, SY, SZ1]));
      // the lash line: a thick tube along the front half of the lid's rim, then the wing at the outer corner
      const rho = Math.sqrt(Math.max(0, R1 * R1 - lidH * lidH)), rim = [];
      for (let i = 0; i <= 12; i++) { const ph = PI + PI * i / 12; rim.push(new THREE.Vector3(rho * Math.cos(ph), lidH * SY, SZ1 * rho * Math.sin(ph) - 0.01)); }
      if (sd < 0) rim.reverse(); // run from the inner corner to the outer corner
      const end = rim[rim.length - 1];
      g.push(S(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim), 12, 0.058, 5, false), LASH));
      // the wing: a tapered flick out and up from the outer corner
      const wing = new THREE.ConeGeometry(0.062, 0.26, 6, 1); wing.translate(0, 0.13, 0);
      g.push(S(wing, LASH, [end.x, end.y, end.z], [0, 0, sd * -0.95]));
      g.push(S(sph(0.06, 6, 4), LASH, [end.x, end.y, end.z])); // round off the joint
      G(g.slice(2), [0, 0, 0], [arc, 0, 0]); // tilt the lid, lash and wing back: the lash line arcs over the eye
      G(g, [cx, cy, cz], [0.05, sd * -0.3, tilt]);
      out.push(...g);
    };
    eye(1, 0.04, 0.04, 0.2); // her left: lidded low, heavy and bored, a flatter line
    eye(-1, 0.14, -0.04, 0.65); // her right: more open, the lash line arching over it
    // brows: tapered strokes sitting on the face. Her left (+x) low and gently curved; her right (-x) a high,
    // thick arch with a pointed tail.
    const brow = (pts, x, y, w, w1) => {
      const g = wrap(slab(stroke(pts, w, w1, 16, 0.4), 0.06, 0.015), 0.5);
      g.rotateY(x > 0 ? -0.3 : 0.3);
      out.push(S(onFace(g, x, y, 0.02), BROW));
    };
    brow([[-0.36, -0.08], [-0.12, 0.03], [0.18, 0.06], [0.42, 0.0]], 0.54, 0.52, 0.09, 0.02);
    brow([[0.36, -0.14], [0.2, 0.06], [-0.05, 0.16], [-0.3, 0.12], [-0.44, -0.02]], -0.52, 0.72, 0.12, 0.015);
    // --- the pout: a heart-shaped upper lip (two lobes dipping to the middle), a fuller lower lip, a thin line
    //     between them and a small crease at one corner. Low on the face, a little to her right, tilted.
    const mx = -0.1, my = -0.46, lift = 0.06;
    const lips = [];
    for (const sd of [-1, 1]) lips.push(S(sph(0.105, 10, 7), LIPS, [sd * 0.06, 0.05, 0], [0, 0, sd * -0.5], [1.15, 0.7, 0.7])); // upper lip lobes, peaking to a heart
    lips.push(S(sph(0.14, 10, 7), LIPS2, [0, -0.07, -0.01], [0, 0, 0], [1.05, 0.72, 0.72])); // lower lip
    lips.push(S(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.12, 0.0], [-0.05, -0.018], [0.05, -0.018], [0.12, 0.0]].map(([x, y]) => new THREE.Vector3(x, y, -0.09))), 6, 0.013, 4, false), LASH)); // the line between
    lips.push(S(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.14, 0.0], [0.18, -0.025], [0.19, -0.06]].map(([x, y]) => new THREE.Vector3(x, y, -0.04))), 4, 0.012, 4, false), '#7A4C7C')); // corner crease
    const n = normalAt(mx, my);
    G(lips, [mx + n.x * lift, my + n.y * lift, surfZ(mx, my) + n.z * lift], [0, 0, 0.08], [1.2, 1.2, 1.2]);
    out.push(...lips);
    // --- collar: hugs under the jaw, flares out; the top edge dips to a V at the front; thick gold trim; a big
    //     gold four-point star at the V
    const dip = (g, amount, onlyTop) => {
      const a = g.getAttribute('position');
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i), z = a.getZ(i), y = a.getY(i), r = Math.hypot(x, z) || 1;
        const f = Math.max(0, -z / r) ** 4;
        if (!onlyTop || y > 0) a.setY(i, y - amount * f);
      }
      a.needsUpdate = true; return g;
    };
    const top = -1.0, h = 0.8, V = 0.3;
    out.push(P(dip(new THREE.CylinderGeometry(1.12, 1.6, h, 20, 2, true), V, true), ROBE, [0, top - h / 2, 0.05]));
    out.push(P(dip(new THREE.CylinderGeometry(1.08, 1.56, h, 20, 1, true), V, true), ROBE2, [0, top - h / 2 - 0.01, 0.05])); // inside
    out.push(P(new THREE.CylinderGeometry(1.6, 1.6, 0.04, 20), ROBE2, [0, top - h, 0.05]));
    out.push(P(new THREE.CylinderGeometry(0.95, 1.0, 0.5, 12), SKIN, [0, top - 0.15, 0.05])); // neck, inside the collar
    const trim = new THREE.TorusGeometry(1.14, 0.1, 4, 24); trim.rotateX(PI / 2); dip(trim, V);
    out.push(S(trim, GOLD, [0, top, 0.05]));
    out.push(P(slab([[0, 0.38], [0.09, 0.09], [0.3, 0], [0.09, -0.09], [0, -0.42], [-0.09, -0.09], [-0.3, 0], [-0.09, 0.09]], 0.14, 0.07), GOLD, [0, top - V - 0.06, -1.24], [0.22, 0, 0]));
    return out;
  };

  function geometry() {
    const pos = [], nor = [], col = [], c = new THREE.Color();
    for (const { g, col: hex, smooth } of parts()) {
      if (smooth === true) g.computeVertexNormals(); // indexed: soft normals shared across faces ('keep': already set)
      let f = g.index ? g.toNonIndexed() : g;
      if (!smooth) f.computeVertexNormals(); // non-indexed: one normal per face, faceted
      const a = f.getAttribute('position'), n = f.getAttribute('normal');
      c.set(hex);
      for (let i = 0; i < a.count; i++) { pos.push(a.getX(i), a.getY(i), a.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return out;
  }
  return { KEYS: ['zoe'], geometry: () => geometry(), tris: () => geometry().getAttribute('position').count / 3 };
};
if (typeof module !== 'undefined') module.exports = ZoeHead;
