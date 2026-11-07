  // ---------- the Diorama UI (2026-11-07; design/diorama/ is the mockup and the visual reference) ----------
  // On with ?ui=diorama (the <head> switch). The island is a live three.js scene on the home screen; its renderer is
  // freed while a match runs (pause) and made again on the way home (resume). The screens are the mockup's, scoped
  // under #dio (src/diorama.css); sample data is replaced by the game's own screen by screen (INTEGRATION.md).
  // syncHome: the home screen shows (on) or a match / another screen takes over. Idempotent (hud() calls it often).
  function dioSync(on) {
    $('dio').hidden = !on;
    if (on === dio.shown) return;
    dio.shown = on;
    if (on) {
      dioBoot();
      if (dio.api) dio.api.resume();
      // phones: one WebGL context at a time, so the board's 3D waits while the island is up (back when the home hides)
      if (!document.documentElement.classList.contains('pc')) {
        if (board3d) { stop3d(); dio.held3d = true; }
        else if (starting3d) { dio.held3d = true; starting3d.then(() => { if (dio.shown && board3d) stop3d(); }); }
      }
    } else {
      if (dio.api) dio.api.pause();
      if (dio.held3d) { dio.held3d = false; if (want3d) start3d(); }
    }
  }
  // drawHome: the home screen's state changed (home.screen, the account...). The screens follow in steps 2 to 7.
  function dioDraw() { dioBoot(); if (dio.api) dio.api.draw(); }
  // once: the scene and the screens. If three.js can't even load, the old home comes back for this visit.
  function dioBoot() {
    return dio.boot || (dio.boot = dioStart().catch((e) => {
      console.warn('No Mans Land: the Diorama UI could not start; showing the old home.', e);
      DIO = false; document.documentElement.classList.remove('diorama'); $('dio').remove(); dio.shown = false; drawHome();
    }));
  }
  async function dioStart() {
    const body = $('dio');
    const THREE = await import(THREE_URL);
    if (typeof Models3D !== 'function') for (const f of ['kaykit3d', 'models3d']) await load3d(f);
    // the island's renderer: made when the home shows, freed while a match runs. No WebGL (or ?board=2d): flat
    let cv = document.getElementById('world'), renderer = null, running = false, raf = 0, flat = force2d;
    const PC = () => document.documentElement.classList.contains('pc');
    function makeRenderer() {
      try {
        renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: TEST });
      } catch (e) { renderer = null; goFlat('no WebGL'); return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, PC() ? 2 : 1.5));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (running) goFlat('lost'); });
    }
    function freeRenderer() {
      if (!renderer) return;
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {}
      renderer = null;
      const n = cv.cloneNode(false); cv.replaceWith(n); cv = n; // a lost context can't be had back: a fresh canvas next time
    }
    const scene = new THREE.Scene();
    const M = Models3D(THREE);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const H = TEST ? location.hash : ''; // the mockup's screenshot states (#still, #play, ...), only under ?test
    // no idle motion with reduced motion, and under automation (the UI tests click notes that would bob with the island)
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches || H.includes('still') || navigator.webdriver === true;
    const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0, flatShading: true });
    const vmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true });
    const mesh = (g, m, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; };
    await Promise.all(['700 200px "Chakra Petch"', '700 56px "Bricolage Grotesque"', '400 40px "Courier Prime"', '700 40px "Courier Prime"'].map(f => document.fonts.load(f)));

    // ── the island: the Standard map, 14 columns by 18 rows (zones of 7 rows, 4 rows of no man's land), one tile = 1 ──
    // col c, row r -> x = c - 6.5, z = r - 8.5 (row 0 is the back of their zone, row 17 the back of yours)
    const W = 14, D = 18, island = new THREE.Group(); scene.add(island);
    const tx = (c) => c - 6.5, tz = (r) => r - 8.5;
    const top = mesh(new THREE.BoxGeometry(W, 0.5, D), mat('#9DAF73'), false); top.position.y = -0.25; island.add(top);
    const soil = [0.7, 0.6, 0.55].map((h, i) => { const b = mesh(new THREE.BoxGeometry(W - i * 0.3, h, D - i * 0.3), mat('#7A5B3E')); b.position.y = -0.5 - h / 2 - [0, 0.7, 1.3][i]; island.add(b); return b; });
    let root; { const g = new THREE.ConeGeometry(5.6, 5, 9, 2); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 2.9) { p.setX(i, p.getX(i) * (0.8 + rnd() * 0.4)); p.setZ(i, p.getZ(i) * (0.8 + rnd() * 0.4)); p.setY(i, y + (rnd() - 0.5) * 0.8); } }
      root = mesh(g, mat('#5B4634')); root.rotation.x = Math.PI; root.scale.set(1.18, 1.1, 1.52); root.position.y = -4.6; island.add(root); }

    // ── the battlefield: the game's looks (Game.SKINS) on the Standard map. The ground is the look's own painted floor
    // (src/floors.js; Snow: the ice ground from src/render2d.js), with no tile grid. Round it stand 10 toy miniatures of the
    // look's signature things, in the same slots for every look: 1 centrepiece, 6 trees, 3 accents ──
    const FT = 64, floorCv = document.createElement('canvas'); floorCv.width = W * FT; floorCv.height = D * FT;
    const floorTex = new THREE.CanvasTexture(floorCv); floorTex.colorSpace = THREE.SRGBColorSpace; floorTex.anisotropy = 8;
    const floor = mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 1 }), false);
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.008; island.add(floor);
    // each look's island: its rim and soil colours and its miniatures (KITS); the looks and their names are the game's
    // (Game.SKINS), the ground is the look's floor (Floors.LOOKS). A look without art here borrows the Meadow's.
    const ART = {
      meadow: { side: '#5F714C', soil: ['#7A5B3E', '#664A33', '#55402E'], kit: 'meadow' },
      autumn: { side: '#62633E', soil: ['#7A5B3E', '#664A33', '#55402E'], kit: 'autumn' },
      snow: { side: '#E4ECF4', soil: ['#6E7A86', '#5E6974', '#4F5963'], kit: 'snow' }, // the glacier pass (2026-11-07): white rim
      frost: { side: '#4A5641', soil: ['#4A3D2E', '#3C3226', '#30281F'], kit: 'glade' },
      desert: { side: '#B39A6C', soil: ['#A07A4E', '#8C6943', '#77593A'], kit: 'desert' },
      ash: { side: '#4B4744', soil: ['#3A3431', '#2F2A27', '#262220'], kit: 'ash' },
      moonlit: { side: '#8F9BB0', soil: ['#5C6680', '#4D566E', '#3F475C'], kit: 'moonlit' },
      savanna: { side: '#B09A5C', soil: ['#9C6A44', '#875A39', '#724B30'], kit: 'savanna' },
    };
    const LOOKS = Game.SKINS.map(k => ({ ...(ART[k.id] || ART.meadow), id: k.id, name: k.name }));
    // a KayKit model (src/kaykit3d.js, the game's own) fitted to a height, standing on y = 0, centred
    const kkCache = {};
    function kk(name, h) {
      if (!kkCache[name]) { const d = KAYKIT[name]; const dec = (b) => Uint8Array.from(atob(b), (ch) => ch.charCodeAt(0));
        const q = new Int16Array(dec(d[0]).buffer), rgb = dec(d[1]), [lo, hi] = [d[2], d[3]], pos = new Float32Array(q.length), col = new Float32Array(q.length), c = new THREE.Color();
        for (let i = 0; i < q.length; i++) { const k = i % 3; pos[i] = lo[k] + (q[i] + 32767) / 65534 * (hi[k] - lo[k]); }
        for (let t = 0; t < q.length / 9; t++) { c.setRGB(rgb[t * 3] / 255, rgb[t * 3 + 1] / 255, rgb[t * 3 + 2] / 255, THREE.SRGBColorSpace); for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], t * 9 + k * 3); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); g.computeBoundingBox();
        const b = g.boundingBox; g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g.computeBoundingBox(); kkCache[name] = g; }
      const g = kkCache[name], o = mesh(g, vmat); o.scale.setScalar(h / (g.boundingBox.max.y || 1)); return o;
    }
    const G = () => new THREE.Group();
    const put = (g, o, x = 0, y = 0, z = 0, s = 1) => { o.position.set(x, y, z); if (s !== 1) o.scale.multiplyScalar(s); g.add(o); return o; };
    const blob = (r, c, detail = 0) => mesh(new THREE.IcosahedronGeometry(r, detail), mat(c));
    const cyl = (r0, r1, h, c, n = 6) => mesh(new THREE.CylinderGeometry(r0, r1, h, n), mat(c));
    const cone = (r, h, c, n = 7) => mesh(new THREE.ConeGeometry(r, h, n), mat(c));
    const stone = (r, c) => mesh(new THREE.DodecahedronGeometry(r, 0), mat(c));
    const glow = (r, c) => new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ color: c }));
    // a trunk standing on the ground
    const trunk = (g, r, h, c, lean = 0) => { const t = cyl(r * 0.7, r, h, c); t.position.y = h / 2; t.rotation.z = lean; g.add(t); return t; };
    // a pine: tiers of cones, with snow caps if asked
    const pine = (green, snow, h = 1) => { const g = G(); trunk(g, 0.1, 0.4, '#5A4030');
      for (let k = 0; k < 3; k++) { const r = (0.62 - k * 0.15) * h, y = (0.75 + k * 0.42) * h; put(g, cone(r, 0.9 * h, green), 0, y);
        if (snow) put(g, cone(r * 0.62, 0.42 * h, snow), 0, y + 0.26 * h); } return g; };
    const KITS = {
      meadow: {
        hero: () => { const g = G(); trunk(g, 0.26, 1.3, '#6B4A2E'); for (const [x, y, z, r, c] of [[0, 2.0, 0, 0.95, '#6F8E4E'], [0.6, 1.7, 0.3, 0.7, '#7E9A54'], [-0.55, 1.75, -0.2, 0.75, '#5F7E44'], [0.1, 2.5, -0.3, 0.6, '#7E9A54']]) put(g, blob(r, c), x, y, z); return g; },
        tree: (i) => { const g = G(); trunk(g, 0.13, 0.7, '#6B4A2E'); put(g, blob(0.62, ['#6F8E4E', '#7E9A54'][i % 2]), 0, 0.95).scale.set(1, 0.9, 1); return g; },
        accent: () => { const g = G(); put(g, blob(0.36, '#5F7E44'), 0, 0.26).scale.set(1.2, 0.75, 1.2);
          for (let k = 0; k < 9; k++) { const a = k * 2.4, r = 0.3 + (k % 2) * 0.08; put(g, glow(0.06, ['#F4ECD8', '#F2D35B', '#E9A1B4'][k % 3]), Math.cos(a) * r, 0.3 + (k % 3) * 0.06, Math.sin(a) * r); } return g; },
      },
      autumn: {
        hero: () => { const g = G(); trunk(g, 0.24, 1.3, '#5C3F28'); for (const [x, y, z, r, c] of [[0, 2.0, 0, 0.95, '#B8532F'], [0.6, 1.7, 0.3, 0.7, '#C9782F'], [-0.55, 1.75, -0.2, 0.75, '#9A3B2A'], [0.1, 2.5, -0.3, 0.6, '#D3A43A']]) put(g, blob(r, c), x, y, z);
          for (let k = 0; k < 7; k++) { const a = k * 0.9, r = 1.0 + (k % 3) * 0.3; const l = mesh(new THREE.CircleGeometry(0.09, 5), mat(['#B8532F', '#C9782F', '#D3A43A'][k % 3]), false); l.rotation.x = -Math.PI / 2; put(g, l, Math.cos(a) * r, 0.02, Math.sin(a) * r); } return g; },
        tree: (i) => { const g = G(); trunk(g, 0.09, 1.1, '#E8E2D4'); for (const y of [0.3, 0.6, 0.85]) put(g, cyl(0.075, 0.075, 0.05, '#2E2A26'), 0, y);
          put(g, blob(0.5, ['#D3A43A', '#C9902F'][i % 2]), 0, 1.3).scale.set(0.9, 1.15, 0.9); put(g, blob(0.32, '#E0B649'), 0.2, 1.65, 0.1); return g; },
        accent: () => { const g = G(); for (const [x, z, r, c] of [[0, 0, 0.34, '#C9782F'], [0.3, 0.15, 0.24, '#B8532F'], [-0.22, 0.2, 0.22, '#D3A43A']]) put(g, blob(r, c), x, r * 0.35, z).scale.set(1, 0.45, 1); return g; },
      },
      snow: {
        hero: () => { const g = G(); for (const [x, z, r, y] of [[0, 0, 0.95, 0.6], [0.75, 0.35, 0.6, 0.35], [-0.6, 0.45, 0.55, 0.3], [0.1, -0.2, 0.55, 1.4]]) { put(g, stone(r, '#6E7880'), x, y, z).rotation.set(rnd(), rnd(), rnd());
          put(g, blob(r * 0.62, '#E6EDF2'), x, y + r * 0.62, z).scale.set(1, 0.38, 1); } return g; },
        tree: () => pine('#38554A', '#E6EDF2'),
        accent: () => { const g = G(); for (const [x, z, r] of [[0, 0, 0.36], [0.32, 0.12, 0.24], [-0.24, 0.18, 0.2]]) put(g, blob(r, '#E8EEF2', 1), x, r * 0.3, z).scale.set(1, 0.5, 1); return g; },
      },
      glade: {
        hero: () => { const g = G(); put(g, kk('arch_gate', 3.0), 0, 0, 0).rotation.y = -0.5; const sh = put(g, kk('shrine_candles', 0.95), 0.85, 0, 0.85); sh.rotation.y = -0.5;
          for (const [x, z] of [[0.72, 0.96], [0.98, 0.72], [0.85, 0.88]]) put(g, glow(0.06, '#FFC26A'), x, 0.98, z); return g; },
        tree: (i) => { const g = G(); const lean = (i % 2 ? 1 : -1) * 0.22; const t = trunk(g, 0.17, 1.3, '#3B3026', lean);
          const b = cyl(0.05, 0.08, 0.7, '#3B3026'); b.position.set(-lean * 2, 0.95, 0); b.rotation.z = -lean * 3.2; g.add(b);
          for (const [x, y, z, r] of [[-lean * 2.6, 1.55, 0, 0.52], [lean * 1.2, 1.35, 0.25, 0.4], [0, 1.85, -0.15, 0.36]]) put(g, blob(r, ['#2F4A36', '#3A5940', '#26402E'][(i + Math.round(y * 3)) % 3]), x, y, z);
          return g; },
        accent: () => { const g = G(); for (const [x, z, h, r] of [[0, 0, 0.26, 0.17], [0.2, 0.12, 0.17, 0.12], [-0.16, 0.14, 0.13, 0.1]]) { put(g, cyl(0.04, 0.05, h, '#EDE3CC'), x, h / 2, z);
          const cap = mesh(new THREE.SphereGeometry(r, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#E8913A', emissive: '#7A3A10', roughness: 1, flatShading: true })); put(g, cap, x, h, z); } return g; },
      },
      desert: {
        hero: () => { const g = G(); put(g, cyl(1.25, 1.35, 0.06, '#CDB585', 10), 0, 0.03); const w = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.07, 12), new THREE.MeshStandardMaterial({ color: '#4FA3B5', roughness: 0.35 }), false); put(g, w, 0, 0.05);
          for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3; put(g, cone(0.05, 0.6 + (k % 3) * 0.15, '#7C8F45', 4), Math.cos(a) * 1.1, 0.35, Math.sin(a) * 1.1); }
          put(g, stone(0.25, '#C08A5A'), 0.9, 0.12, -0.75); return g; },
        tree: (i) => { const g = G(); let x = 0; const bend = (i % 2 ? 1 : -1) * 0.07;
          for (let k = 0; k < 5; k++) { put(g, cyl(0.08 - k * 0.008, 0.1 - k * 0.008, 0.32, '#8C6B45'), x, 0.16 + k * 0.3).rotation.z = -bend * 1.5; x += bend; }
          for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, f = mesh(new THREE.ConeGeometry(0.12, 0.95, 4), mat(k % 2 ? '#6E8B3D' : '#5E7A34')); f.position.set(x + Math.cos(a) * 0.38, 1.55, Math.sin(a) * 0.38); f.rotation.set(0, 0, 0); f.lookAt(x + Math.cos(a) * 2, 1.15, Math.sin(a) * 2); f.rotateX(Math.PI / 2); g.add(f); }
          return g; },
        accent: () => { const g = G(); put(g, stone(0.38, '#C08A5A'), 0, 0.22, 0).scale.set(1.2, 0.6, 1); put(g, stone(0.26, '#A8744A'), 0.1, 0.5, 0.05).scale.set(1, 0.65, 1); put(g, stone(0.18, '#C9965F'), -0.35, 0.1, 0.25); return g; },
      },
      ash: {
        hero: () => { const g = G(); put(g, kk('wall_broken', 1.3), 0, 0, 0).rotation.y = 0.4; put(g, kk('wall_archedwindow_open', 1.5), 0.85, 0, -0.75).rotation.y = 0.4 + Math.PI / 2; put(g, kk('rubble_large', 0.45), 0.6, 0, 0.5);
          for (const [x, z] of [[0.4, 0.4], [0.75, 0.62], [0.2, 0.75]]) put(g, glow(0.06, '#FF8A4A'), x, 0.12, z); return g; },
        tree: (i) => { const g = G(); trunk(g, 0.11, 1.4, '#2A2420', (i % 2 ? 1 : -1) * 0.06);
          for (const [y, a, l] of [[0.8, 0.9, 0.55], [1.05, -0.8, 0.45], [1.25, 0.5, 0.35]]) { const b = cyl(0.025, 0.05, l, '#2A2420', 5); b.position.set(Math.sin(a) * l * 0.45, y + l * 0.35, Math.cos(a) * 0.05); b.rotation.z = -a; g.add(b); }
          return g; },
        accent: () => { const g = G(); put(g, kk('sword_shield_broken', 0.42), 0, 0, 0).rotation.y = rnd() * 6; put(g, glow(0.05, '#FF8A4A'), 0.25, 0.05, 0.2); return g; },
      },
      moonlit: {
        hero: () => { const g = G(); const ry = -0.6; const h = G(); h.rotation.y = ry; g.add(h);
          put(h, mesh(new THREE.BoxGeometry(1.6, 0.85, 1.1), mat('#6B4A2E')), 0, 0.425);
          for (const sd of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(1.8, 0.08, 0.75), mat('#E6EDF5')); r.position.set(0, 1.08, sd * 0.3); r.rotation.x = sd * 0.62; h.add(r); }
          put(h, mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), mat('#7D8590')), 0.5, 1.25, -0.2);
          for (const x of [-0.45, 0.35]) put(h, new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.02), new THREE.MeshBasicMaterial({ color: '#FFB65C' })), x, 0.5, 0.56);
          put(h, mesh(new THREE.BoxGeometry(0.3, 0.5, 0.02), mat('#3E2A1C')), -0.05, 0.25, 0.56); return g; },
        tree: () => pine('#2E4A4E', '#E3EAF5'),
        accent: () => { const g = G(); put(g, kk('snowman_A', 0.85), 0, 0, 0).rotation.y = 0.4 + rnd(); return g; },
      },
      savanna: {
        hero: () => { const g = G(); for (const [x, z, r, y] of [[0, 0, 0.75, 0.45], [0.8, 0.3, 0.55, 0.3], [-0.6, 0.45, 0.5, 0.28], [0.2, -0.35, 0.5, 1.05], [0.65, -0.5, 0.35, 0.2]]) put(g, stone(r, ['#B4A493', '#A89786', '#C1B2A0'][Math.round(r * 10) % 3]), x, y, z).rotation.set(rnd(), rnd(), rnd()); return g; },
        tree: (i) => { const g = G(); put(g, kk(['acacia_A', 'acacia_B', 'acacia_C'][i % 3], 1.9), 0, 0, 0); return g; },
        accent: () => { const g = G(); const m = mesh(new THREE.ConeGeometry(0.24, 1.0, 7), mat('#A9603C')); m.position.y = 0.5; m.rotation.z = 0.12; g.add(m); put(g, cone(0.14, 0.45, '#9A5634'), 0.25, 0.22, 0.1); put(g, cone(0.1, 0.3, '#B0683F'), -0.2, 0.15, 0.12); return g; },
      },
    };
    // the slots, the same on every battlefield: round the edges, clear of the keeps, treasuries and units
    const SLOTS = { hero: [[4.7, -7.3, 1, -0.4]], tree: [[-6.25, 8.2, 1.1], [6.35, 8.35, 0.95], [6.35, 3.1, 0.8], [-6.3, 3.3, 0.75], [-6.2, -8.0, 1.0], [6.35, -4.4, 0.85]], accent: [[-6.35, 6.0, 1], [6.3, 0.7, 1], [-6.3, -4.0, 1]] };
    const kit = G();
    let lookI = 0, kitGrow = [];
    function setLook(i, animate) {
      lookI = (i + LOOKS.length) % LOOKS.length; const L = LOOKS[lookI], c = floorCv.getContext('2d');
      c.clearRect(0, 0, floorCv.width, floorCv.height);
      // the game's own painter for the look's ground, on the Standard map's grid (as lookThumb does)
      Game.useGrid(STD_MAP); try { Floors.floor(c, floorCv.width, floorCv.height, FT, (Floors.LOOKS[L.id] || {}).floor || 'meadow'); } finally { Game.useGrid(m); }
      if (flat) paintFlat();
      floorTex.needsUpdate = true; top.material.color.set(L.side); soil.forEach((b, k) => b.material.color.set(L.soil[k])); root.material.color.set(L.soil[2]);
      for (const o of [...kit.children]) { kit.remove(o); o.traverse(m => { if (m.geometry && !Object.values(kkCache).includes(m.geometry)) m.geometry.dispose(); }); }
      seed = 11 + lookI; const K = KITS[L.kit]; kitGrow = [];
      for (const [kind, list] of Object.entries(SLOTS)) list.forEach(([x, z, s, ry], k) => { const o = K[kind](k); o.position.set(x, 0, z); o.rotation.y = ry ?? rnd() * 6; o.userData.s = s; o.scale.setScalar(animate ? 0.001 : s); kit.add(o); kitGrow.push(o); });
      kitGrow.forEach((o, k) => { o.userData.t0 = animate ? k * 0.045 : -1; });
      changedAt = animate ? performance.now() / 1000 : -9;
      document.dispatchEvent(new CustomEvent('battlefield'));
    }
    let changedAt = -9;
    // the golem's rock (it stands on it), the same on every battlefield
    const rock = (x, z, s) => { const r = mesh(new THREE.DodecahedronGeometry(s, 0), mat('#A39C8D')); r.position.set(x, s * 0.45, z); r.rotation.set(rnd(), rnd(), rnd()); island.add(r); return r; };
    const base = new Set(island.children.filter(c => !c.userData.piece)); // the island itself: ground, soil, rock
    island.add(kit); rock(-4.5, 4.5, 0.55);
    // your battlefield at home: the game's look pick (skinPick, saved as pb-skin; '' = the Standard map's own, 'random' =
    // a new one each match, so one at random here). Change battlefield sets it as the PLAY popup's Look row does. A
    // room's battlefield is the host's (New room)
    const lookIndex = () => { const id = skinPick === 'random' ? Game.SKINS[Math.floor(Math.random() * Game.SKINS.length)].id : lookShown(); return Math.max(0, LOOKS.findIndex(l => l.id === id)); };
    const saveLook = (i) => { const id = LOOKS[i].id; skinPick = id === (Game.MAP_LOOK[curMap() || 'standard'] || '') ? '' : id; try { localStorage.setItem('pb-skin', skinPick); } catch (e) {} };
    let homeLook = lookIndex();
    { const i = LOOKS.findIndex(l => l.id === (H.match(/bf=(\w+)/) || [])[1]); if (i >= 0) homeLook = i; }
    setLook(homeLook, false);

    // ── pieces, from the game's own Models3D (with KayKit's chest for the treasuries and torches) ──
    const YOU = '#5B8FD6', FOE = '#D9573B';
    const unit = (kind, tint, team, x, z, s, ry = 0, into = island) => { const p = M.parts(kind), g = new THREE.Group();
      if (p.tint) g.add(mesh(p.tint, mat(tint))); if (p.team) g.add(mesh(p.team, mat(team))); if (p.fixed) g.add(mesh(p.fixed, vmat));
      g.scale.setScalar(s); g.position.set(x, 0, z); g.rotation.y = ry; g.userData.y0 = 0; into.add(g); return g; };
    const s = 0.42, Y = Math.PI; // models face -z; ours face the foe (-z), theirs turn round
    // the Standard map's own spots: your keep at col 8, row 16; theirs mirrored to col 5, row 1; each treasury beside its keep
    const keepYou = unit('tower:keep', '#D8CFBE', YOU, tx(8), tz(16), 0.36);
    const keepFoe = unit('tower:keep', '#C9BFAE', FOE, tx(5), tz(1), 0.36, Y);
    const vaultYou = unit('treasury', '#D9B95B', YOU, tx(6), tz(15), 0.28, Y);
    const vaultFoe = unit('treasury', '#D9B95B', FOE, tx(7), tz(2), 0.28);
    const champ = unit('brute:champion', '#8D99AE', YOU, 2.6, 4.4, s * 1.05, -0.3);
    const mage = unit('wizard:fire', '#C8463A', YOU, -2.4, 3.6, s, 0.3);
    const sniper = unit('sniper', '#6E7B5A', YOU, 5.0, 5.6, s, -0.35);
    const golem = unit('golem', '#4FD1C5', YOU, -4.5, 4.5, s * 0.95, 0.6); golem.position.y = golem.userData.y0 = 0.45;
    const ent = unit('ent', '#6F8E4E', YOU, 4.6, 8.3, s * 1.05, 0); ent.rotation.set(-Math.PI / 2 + 0.08, 0, 0.5); ent.position.y = ent.userData.y0 = 0.42; // asleep, face down
    for (const [x, z] of [[-2.6, -3.6], [-1.9, -4.0], [-3.2, -4.2], [-2.3, -4.6], [-3.0, -3.3]]) unit('goblin', '#7FA35A', FOE, x, z, s * 0.75, Y + (rnd() - 0.5) * 0.6);
    const mammoth = unit('mammoth', '#8E7A68', FOE, 3.4, -4.6, s * 0.8, Y - 0.3);
    unit('skeleton', '#E9E3CF', FOE, -5.0, -5.6, s * 0.9, Y + 0.3);
    const pieces = new THREE.Group(); island.add(pieces);
    for (const c of [...island.children]) if (!base.has(c) && c !== pieces) pieces.add(c);

    // ── tiles with print on them: the podium and the unit roster share this ──
    const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); };
    const fitFont = (g, text, weight, size, family, max) => { let fs = size; g.font = `${weight} ${fs}px ${family}`; while (g.measureText(text).width > max && fs > 10) g.font = `${weight} ${--fs}px ${family}`; };
    const tile = (w, h, d, topDraw, frontDraw, side) => { const sm = mat(side);
      const m = [sm, sm, canvasTex(512, Math.round(512 * d / w), topDraw), sm, frontDraw ? canvasTex(512, Math.max(32, Math.round(512 * h / w)), frontDraw) : sm, sm];
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = b.receiveShadow = true; return b; };

    // ── Rankings: the board clears and the top five stand on numbered tiles, first in the middle ──
    const T4 = [['golem', '#51005C'], ['sunPriest', '#FFD23F'], ['meteor', '#FF6B35'], ['mammoth', '#A0785A'], ['necro', '#9D4EDD'], ['truespear', '#C9D1D9'], ['assassin', '#3A3550']];
    const pick = T4.map(v => [v, still ? T4.indexOf(v) : Math.random()]).sort((a, b) => a[1] - b[1]).map(v => v[0]).slice(0, 5);
    const podium = new THREE.Group(); island.add(podium);
    const PLAYERS = { 1: ['Captain Tuesday', '96', '14–1–2'], 2: ['Ironmoss', '88', '12–0–3'], 3: ['Pebble', '81', '11–2–4'], 4: ['Hedgewitch', '74', '9–1–3'], 5: ['Sleepy Ent', '63', '8–0–6'] }; // sample data
    const SPOTS = [4, 2, 1, 3, 5], HEIGHT = { 1: 1.0, 2: 0.78, 3: 0.62, 4: 0.48, 5: 0.38 };
    SPOTS.forEach((n, i) => {
      const h = HEIGHT[n], x = -4.6 + i * 2.3, first = n === 1, paper = first ? '#F2B23A' : '#F4ECD8', side = first ? '#C98E22' : '#CDBF9F';
      const b = tile(1.9, h, 2.6, (g, w, hh) => { g.fillStyle = paper; g.fillRect(0, 0, w, hh); g.strokeStyle = first ? 'rgba(23,20,15,.35)' : 'rgba(23,20,15,.2)'; g.lineWidth = 6; g.setLineDash([18, 14]); g.strokeRect(22, 22, w - 44, hh - 44);
          g.fillStyle = '#17140F'; g.textAlign = 'center'; g.font = '700 220px "Chakra Petch"'; g.fillText(String(n), w / 2, hh * 0.72);
          fitFont(g, PLAYERS[n][0], 700, 60, '"Bricolage Grotesque"', 440); g.fillText(PLAYERS[n][0], w / 2, hh * 0.87); },
        (g, w, hh) => { g.fillStyle = side; g.fillRect(0, 0, w, hh); g.fillStyle = '#17140F'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 40px "Courier Prime"'; g.fillText(`${PLAYERS[n][1]} SCORE · ${PLAYERS[n][2]}`, w / 2, Math.min(hh / 2, 46)); }, side);
      b.position.set(x, h / 2, 0.3); podium.add(b);
      const [kind, tint] = pick[n - 1], k = kind === 'mammoth' ? 0.4 : kind === 'golem' ? 0.46 : 0.52;
      const u = unit(kind, tint, first ? '#F2B23A' : '#E9E3CF', x, -0.6, k, Math.PI + (i - 2) * 0.12, podium); u.position.y = h;
    });
    podium.position.y = -4; podium.visible = false;

    // ── the player: skins, titles and sample accounts. A skin you wear shows on that unit in the Units roster ──
    const SKIN = { // Shapes.SKINS in src/shapes.js
      'brute-champion': { unit: 'Brute', name: 'Champion', model: 'brute:champion', text: 'A crowned Brute in gold armour with a great hammer and a cape.' },
      'golem-aquamarine': { unit: 'Ether Golem', name: 'Aquamarine', model: 'golem:aquamarine', text: 'Cut from sea-green crystal, with a white-hot core.', limited: true },
      'brute-omniper': { unit: 'Brute', name: 'Omni-Per', model: 'brute:omniper', text: 'A chrome war machine with a power fist.' },
      'firemage-ember': { unit: 'Fire Mage', name: 'Ember Robe', model: 'wizard:fire:ember', text: 'An ember-trimmed robe, a flame in each hand.' },
    };
    const DTITLES = { // DTITLES and TITLE_WHY in src/site-template.html
      dev: ['DEV', '#FF5FC4', 'You make this game.'], day1: ['Day 1', '#B67CFF', 'You were here in the very first week.'],
      legend: ['Legend', '#FFC83D', 'You ended a month in the top 5 of the leaderboard.'], bababa: ['BABABABA', '#FF8A2A', 'You joined the No Mans Land Discord.'],
      initiate: ['Initiate', '#7FD3FF', 'You solved every puzzle.'], goodsport: ['Good sport', '#C6ECFF', 'Opponents said GG to you 10 times.'],
    };
    // sample accounts (#acct=google, the default; guest; dev; none)
    const ACCTS = {
      google: { tag: 'Wren', google: true, titles: ['day1', 'initiate', 'goodsport'], title: 'day1', skins: [{ id: 'brute-champion', worn: true }, { id: 'golem-aquamarine', worn: true }] },
      guest: { tag: 'Guest 4821', google: false, titles: ['day1'], title: '', skins: [] },
      dev: { tag: 'Wren', google: true, dev: true, titles: ['dev', 'day1', 'legend', 'bababa', 'initiate', 'goodsport'], title: 'dev',
        skins: [{ id: 'brute-champion', worn: true }, { id: 'golem-aquamarine', worn: true }, { id: 'brute-omniper', worn: false }, { id: 'firemage-ember', worn: true }] },
    };
    const acctQ = (H.match(/acct=(\w+)/) || [])[1] || 'google';
    // the player: the game's account (acct: tag, google, dev, titles, title, skins, tagNext), or a sample one under ?test#acct=
    const sampleAcct = /acct=/.test(H);
    let A = sampleAcct ? (ACCTS[acctQ] ? structuredClone(ACCTS[acctQ]) : null) : acct;
    const wornOf = (name) => A && A.skins.find(k => k.worn && SKIN[k.id].unit === name);

    // ── Units: the board clears and one tier stands in a row, each unit on a tile with its name ──
    // the roster: the units the game plays now (demo-units.json, a Counter Lab set, or Factions), tiers by cost
    const ROSTER = { get units() { return units; }, skills: Object.fromEntries(((DATA && DATA.skills) || []).map(k => [k.id, k.name])) };
    const costs = [...new Set(ROSTER.units.map(u => u.cost))].sort((a, b) => a - b);
    const tierOf = (u) => costs.indexOf(u.cost) + 1; // the game's rule: tiers by cost
    const roster = new THREE.Group(); island.add(roster); roster.position.y = -4; roster.visible = false;
    let tier = 1, rosterHot = [];
    function buildTier(t, pop = -1) {
      for (const c of [...roster.children]) roster.remove(c);
      rosterHot = [];
      const list = ROSTER.units.filter(u => tierOf(u) === t), n = list.length, gap = Math.min(1.95, 13.4 / n);
      list.forEach((u, i) => {
        const x = (i - (n - 1) / 2) * gap, g = new THREE.Group(); g.position.set(x, 0, -0.5); roster.add(g);
        const b = tile(gap - 0.14, 0.16, 2.3, (c, w, hh) => { c.fillStyle = '#F4ECD8'; c.fillRect(0, 0, w, hh); c.strokeStyle = 'rgba(23,20,15,.2)'; c.lineWidth = 6; c.setLineDash([18, 14]); c.strokeRect(20, 20, w - 40, hh - 40);
            c.fillStyle = '#17140F'; c.textAlign = 'center'; fitFont(c, u.name, 700, 64, '"Bricolage Grotesque"', w - 70); c.fillText(u.name, w / 2, hh * 0.8);
            c.font = '400 40px "Courier Prime"'; c.globalAlpha = .75; c.fillText(`${u.cost} gold`, w / 2, hh * 0.9); }, null, '#CDBF9F');
        b.position.set(0, 0.08, 0.35); g.add(b);
        const w = wornOf(u.name), kind = w ? SKIN[w.id].model : M.kindOf(u), ht = M.height(kind) || 2, sc = Math.min(0.66, 2.0 / ht), copies = Math.min(u.bodies || 1, 3);
        const spots = copies === 1 ? [[0, 0]] : copies === 2 ? [[-0.28, 0.05], [0.28, -0.05]] : [[-0.32, 0.12], [0.32, 0.12], [0, -0.25]];
        for (const [dx, dz] of spots) { const f = unit(kind, u.color, YOU, dx, -0.45 + dz, copies > 1 ? sc * 0.72 : sc, Math.PI + 0.25, g); f.position.y = 0.16;
          if (i === pop && !still) { f.userData.s = f.scale.x; f.userData.pop = performance.now() / 1000; f.scale.setScalar(0.001); } }
        g.userData = { u, t, i }; rosterHot.push(g);
      });
    }
    buildTier(1);


    // ── light: a warm low sun and a cool sky ──
    scene.add(new THREE.HemisphereLight('#EFE6D2', '#3B3A4E', 1.15));
    const sun = new THREE.DirectionalLight('#FFE3B8', 2.4); sun.position.set(-9, 16, 7); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 45 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
    scene.add(sun);

    // ── camera: a miniature seen from above at an angle; each menu word has its own view ──
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    const VIEWS = {
      play:    { az: 0.72, el: 0.62, zoom: 13.4, at: [0, -0.6, 0], off: [0.2, 0] },
      puzzles: { az: 0.95, el: 0.5, zoom: 6.6, at: [-2.4, 0.6, 3.6], off: [0.18, 0] },
      rules:   { az: 0.0, el: 1.45, zoom: 12.8, at: [0, 0, 0], off: [0.2, 0] },
      units:   { az: 0.36, el: 0.62, zoom: 10.4, at: [0, 0.4, 1.0], off: [0.21, 0.08] },
      ranks:   { az: 0.42, el: 0.6, zoom: 10.2, at: [0, 0.2, 0.2], off: [0.2, 0.02] },
      orders:  { az: 0.0, el: 1.25, zoom: 13.6, at: [0, 0, 0.4], off: [0.24, 0] },
      welcome: { az: 0.98, el: 0.4, zoom: 12.8, at: [0, -0.6, 0], off: [0.19, 0.0] },
      signin:  { az: 0.98, el: 0.4, zoom: 13.6, at: [0, -0.6, 0], off: [0.27, 0.02] },
      history: { az: 0.62, el: 0.6, zoom: 13.2, at: [0, 0.2, 0.4], off: [0.29, -0.03] },
    };
    const phone = () => innerWidth <= 700;
    let want = VIEWS.play, now = { ...VIEWS.play, at: [...VIEWS.play.at], off: [...VIEWS.play.off] };
    const lerp = (a, b, t) => a + (b - a) * t;
    function place() {
      const w = cv.clientWidth, h = cv.clientHeight, asp = w / h, z = phone() ? now.zoom * 0.86 : now.zoom;
      cam.left = -z * asp; cam.right = z * asp; cam.top = z; cam.bottom = -z; cam.updateProjectionMatrix();
      const [ax, ay, az] = now.at, r = 50;
      cam.position.set(ax + r * Math.cos(now.el) * Math.sin(now.az), ay + r * Math.sin(now.el), az + r * Math.cos(now.el) * Math.cos(now.az));
      cam.up.set(0, 1, 0); if (now.el > 1.4) cam.up.set(-Math.sin(now.az), 0, -Math.cos(now.az));
      cam.lookAt(ax, ay, az);
      const ox = phone() ? 0 : now.off[0];
      cam.setViewOffset(w, h, -ox * w, (phone() ? 0.02 : now.off[1]) * h, w, h);
    }
    function size() { const w = cv.clientWidth, h = cv.clientHeight; if (renderer) renderer.setSize(w, h, false); place(); }
    addEventListener('resize', () => { if (dio.shown) { size(); if (flat) paintFlat(); } });

    // ── notes follow their thing: [object, height of the dot, label offset in px (negative x: label to the left)] ──
    const anchors = {
      golem: [golem, 1.35, [-190, -170]], golemW: [golem, 1.35, [-200, -80]], sniper: [sniper, 1.0, [170, 120]], mage: [mage, 1.05, [-300, 40]],
      keepYou: [keepYou, 2.3, [-260, -40]], keepFoe: [keepFoe, 2.4, [-200, -120]], vaultYou: [vaultYou, 0.7, [-230, 70]], vaultFoe: [vaultFoe, 0.7, [180, -110]], mammoth: [mammoth, 1.3, [200, -120]],
    };
    // the battlefield note's dot: the island's right corner in the menu's view, the middle of its near edge in the plan view
    const bfMenu = new THREE.Object3D(); bfMenu.position.set(7, 0, -9); island.add(bfMenu);
    const bfPlan = new THREE.Object3D(); bfPlan.position.set(0, 0, 9); island.add(bfPlan);
    let viewName = 'play', hovered = null, pinnedHover = false, picked = null;
    const svg = document.getElementById('lines');
    const proj = (o, h) => { const v = new THREE.Vector3(); o.getWorldPosition(v); v.y += h; v.project(cam); return [(v.x + 1) / 2 * cv.clientWidth, (1 - v.y) / 2 * cv.clientHeight]; };
    const dotSvg = (x, y) => `<circle cx="${x}" cy="${y}" r="4.5" fill="currentColor"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/>`;
    const showing = (el) => body.classList.contains('welcome') ? el.hasAttribute('data-welcome') && door.invited && !body.classList.contains('in-signin') : el.hasAttribute('data-welcome') ? false : viewName !== 'play' ? el.dataset.btn === viewName : hovered ? el.dataset.hover === hovered : el.hasAttribute('data-home');
    // a label off the point (x, y): a line out to it and under it, kept on screen. Returns the line's svg
    function pin(el, x, y, dx, dy, keep) {
      const w = el.offsetWidth, k = phone() ? 0.55 : 1;
      if (keep) {} else if (dx > 0 && x + dx * k + w > innerWidth - 24) dx = -dx; if (dx < 0 && x + dx * k - w < 24) dx = -dx;
      const lx = x + dx * k, ly = y + dy * k, left = dx < 0;
      el.style.left = (left ? lx - w : lx) + 'px'; el.style.top = ly + 'px'; el.style.textAlign = left ? 'right' : 'left';
      return `<path d="M${x} ${y} L${lx} ${ly} L${left ? lx - w : lx + w} ${ly}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`;
    }
    function notes() {
      let html = '';
      const playR = document.getElementById('play').getBoundingClientRect(), inProf = body.classList.contains('profile');
      // Profile: where the left column's words end (right and bottom); the island's notes and the Units view keep clear of it
      let colR = 24, colB = 0, nameR = 24, kR = 0, kB = 0;
      if (inProf) for (const el of body.querySelectorAll(body.classList.contains('units') ? '#pf-name, .pf .k, .pf-opts .ur' : '#pf-name, .pf .k, .pf-opts > *, #pf-hist')) {
        const rg = document.createRange(), nm = el.id === 'pf-name', kk = el.matches('.pf .k'); rg.selectNodeContents(el);
        for (const r of rg.getClientRects()) if (r.width > 1) { colR = Math.max(colR, r.right + 28); colB = Math.max(colB, r.bottom); if (nm) nameR = Math.max(nameR, r.right + 28); if (kk) { kR = Math.max(kR, r.right + 12); kB = Math.max(kB, r.bottom); } } }
      // an open dropdown: notes it would cover hide while it's open, and the music player steps aside if it's under it
      const dr = body.querySelector('.drop:not([hidden])')?.getBoundingClientRect(), under = (r) => dr && r.left < dr.right && r.right > dr.left && r.top < dr.bottom && r.bottom > dr.top;
      body.classList.toggle('drop-over-music', !!under(body.querySelector('.music').getBoundingClientRect()) && !body.classList.contains('music-open'));
      // the main menu's words (PLAY and the four under it): an island note whose label or line would run into them hides
      const menuR = !inProf && !body.classList.contains('play') && !body.classList.contains('welcome') ? body.querySelector('.menu').getBoundingClientRect() : null;
      const crosses = (d, R) => { const n = (d.match(/-?[\d.]+/g) || []).map(Number); for (let k = 0; k + 3 < n.length; k += 2) for (let t = 0; t <= 1; t += 0.05) {
        const px = n[k] + (n[k + 2] - n[k]) * t, py = n[k + 1] + (n[k + 3] - n[k + 1]) * t; if (px > R.left - 8 && px < R.right + 8 && py > R.top - 8 && py < R.bottom + 8) return true; } return false; };
      const offMenu = (el, ln) => { if (!menuR || el.dataset.anchor === 'btn') return true; const r = el.getBoundingClientRect();
        return !(r.left < menuR.right + 8 && r.right > menuR.left - 8 && r.top < menuR.bottom + 8 && r.bottom > menuR.top - 8) && !crosses((ln.match(/d="([^"]*)"/) || [])[1] || '', menuR); };
      const clear = (el, x, y) => { const r = el.getBoundingClientRect(); if (under(r) || (dr && x >= dr.left - 12 && x <= dr.right + 12 && y >= dr.top - 12 && y <= dr.bottom + 12)) return false; return !inProf || (x > colR && r.left > colR); };
      for (const el of body.querySelectorAll('.note:not(.pnote)')) {
        const bf = el.dataset.anchor === 'bf', inPlay = body.classList.contains('play');
        const show = !phone() && (bf ? $('dio-stay').hidden && !body.classList.contains('welcome') && (inPlay || (inProf ? !body.classList.contains('in-history') && !body.classList.contains('units') : viewName === 'play' && !hovered)) : showing(el) && !inPlay && !inProf && !(body.classList.contains('music-open') && el.dataset.anchor === 'sniper'));
        el.style.display = show ? '' : 'none'; if (!show) continue;
        const w = el.offsetWidth, h = el.offsetHeight;
        if (el.dataset.anchor === 'btn') {
          // a menu word's note: the dot on the word; the label finds open space. Left-hand words run a rail up the left
          // margin to a label above PLAY; right-hand words run out to the right of PLAY.
          const r = body.querySelector(`.menu .item[data-cam="${el.dataset.btn}"]`).getBoundingClientRect(), y = r.top + r.height * 0.55;
          if (el.dataset.side === 'left') {
            const x = r.left - 20, ly = playR.top - 34, lx = x + 18;
            el.style.left = lx + 'px'; el.style.top = ly + 'px'; el.style.textAlign = 'left';
            html += `<path d="M${x} ${y} L${x} ${ly} L${lx + w} ${ly}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`;
          } else {
            const x = r.right + 6, rail = playR.right + 28, ly = playR.top + 36 + (el.dataset.btn === 'ranks' ? 70 : 0), lx = rail + 16;
            el.style.left = lx + 'px'; el.style.top = ly + 'px'; el.style.textAlign = 'left';
            html += `<path d="M${x} ${y} L${rail} ${y} L${rail} ${ly} L${lx + w} ${ly}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`;
          }
          continue;
        }
        const [o, hh, [dx, dy]] = bf ? (inPlay ? [bfPlan, 0, [-40, 118]] : [bfMenu, 0, [-40, -130]]) : anchors[el.dataset.anchor], [x, y] = proj(o, hh);
        let ddy = dy; if (el.dataset.anchor === 'golemW') { const lb = body.querySelector('.logo').getBoundingClientRect().bottom; ddy = Math.max(dy, lb + 16 + el.offsetHeight - y); } // clear of the big logo
        const ln = pin(el, x, y, dx, ddy); if (clear(el, x, y) && offMenu(el, ln)) html += ln; else el.style.display = 'none';
      }
      // Profile: the golem's note, while you can still earn its skin
      for (const el of body.querySelectorAll('.pnote')) {
        const show = !phone() && inProf && !body.classList.contains('in-history') && !body.classList.contains('units');
        el.style.display = show ? '' : 'none'; if (!show) continue;
        const [x, y] = proj(golem, 1.35), ln = pin(el, x, y, 170, -200); if (clear(el, x, y)) html += ln; else el.style.display = 'none';
      }
      // the unit sheet, attached to the picked unit
      const sh = document.getElementById('usheet'), tabs = body.querySelector('.tiers');
      // the tier tabs sit above the island's far edge; on Profile clear of your name, or under the Units row if they can't be
      { const [tx0, ty0] = proj(island, 0), tw = tabs.offsetWidth;
        if (inProf && nameR + tw > innerWidth - 24) { tabs.style.left = (48 + tw / 2) + 'px'; tabs.style.top = (colB + 34) + 'px'; }
        else { const lx = Math.min(Math.max(tx0, nameR + tw / 2), innerWidth - 24 - tw / 2); tabs.style.left = lx + 'px';
          tabs.style.top = Math.max(118, ty0 - 330, inProf && lx - tw / 2 < kR ? kB + 14 : 0) + 'px'; } }
      const tabsLeft = inProf && nameR + tabs.offsetWidth > innerWidth - 24, sheetL = tabsLeft ? Math.min(tabs.getBoundingClientRect().right + 24, innerWidth - 354) : menuR ? Math.min(menuR.right + 24, innerWidth - 354) : colR;
      if (picked && body.classList.contains('units')) {
        sh.hidden = false; const [x, y] = proj(picked, 1.4), w = sh.offsetWidth, h = sh.offsetHeight, tr = tabs.getBoundingClientRect();
        // the sheet hangs below its unit, over the open grass in front of the row; never over the tabs or off the bottom
        const sx = Math.min(Math.max(x - w * 0.35, sheetL), innerWidth - w - 24), mu = body.querySelector('.music').getBoundingClientRect();
        const tb = sx < tr.right && sx + w > tr.left ? tr.bottom + 14 : 100; // below the tabs only if it would sit under them
        // over the music player only when there is no other room; then the player steps aside while the sheet is open
        const under = sx + w > mu.left - 14 && tb + h > mu.top - 14, floor = sx + w > mu.left - 14 && !under ? mu.top - 14 : innerHeight - 24, sy = Math.max(tb, Math.min(y + 90, floor - h));
        body.classList.toggle('sheet-over-music', under);
        sh.style.left = sx + 'px'; sh.style.top = sy + 'px';
        const ex = Math.min(Math.max(x, sx + 30), sx + w - 30), ey = sy;
        html += `<path d="M${x} ${y} L${ex} ${ey}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`;
      } else { sh.hidden = true; body.classList.remove('sheet-over-music'); }
      // a unit pointed at in the roster
      const hn = document.getElementById('unote');
      if (hovered && hovered.startsWith('u:') && body.classList.contains('units') && (!picked || picked.userData.i !== +hovered.slice(2))) {
        const g = rosterHot[+hovered.slice(2)], [x, y] = proj(g, 1.5), w = hn.offsetWidth;
        const ns = skinsOf(g.userData.u.name).filter(k => k.own).length;
        hn.style.display = ''; hn.innerHTML = `${g.userData.u.name}.<small>Tier ${g.userData.t} · ${g.userData.u.cost} gold${ns ? ` · ${ns} skin${ns > 1 ? 's' : ''}` : ''} · click for its sheet</small>`;
        const hy = y + 210; hn.style.left = (x + 16) + 'px'; hn.style.top = hy + 'px';
        html += `<path d="M${x} ${y} L${x + 16} ${hy} L${x + 16 + w} ${hy}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`;
      } else hn.style.display = 'none';
      svg.innerHTML = `<g style="color:var(--cream)">${html}</g>`;
      const [zx, zy] = proj(ent, 1.1); const zz = document.getElementById('zz'); zz.style.left = zx + 'px'; zz.style.top = zy + 'px';
    }

    // ── pointing: pieces on the menu, units in the roster ──
    const HOT = { keepYou, keepFoe, vaultYou, vaultFoe, mammoth };
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    const hitOf = (e, groups) => { ptr.set(e.clientX / cv.clientWidth * 2 - 1, -(e.clientY / cv.clientHeight) * 2 + 1); ray.setFromCamera(ptr, cam);
      const hit = ray.intersectObjects(groups, true)[0]; if (!hit) return -1; return groups.findIndex(g => { let o = hit.object; while (o && o !== g) o = o.parent; return !!o; }); };
    addEventListener('pointermove', (e) => {
      if (!dio.shown) return;
      if (pinnedHover) return;
      let key = null;
      if (e.target === cv && !body.classList.contains('play')) {
        if (body.classList.contains('units')) { const i = hitOf(e, rosterHot); if (i >= 0) key = 'u:' + i; }
        else if (viewName === 'play' && !body.classList.contains('profile')) { const keys = Object.keys(HOT), i = hitOf(e, Object.values(HOT)); if (i >= 0) key = keys[i]; }
      }
      hovered = key; cv.classList.toggle('world-hot', !!key);
    });
    body.addEventListener('click', (e) => { if (e.target !== cv || !body.classList.contains('units')) return; const i = hitOf(e, rosterHot); pickUnit(i >= 0 ? rosterHot[i] : null); });
    function pickUnit(g) {
      picked = g; const sh = document.getElementById('usheet');
      if (!g) return;
      const u = g.userData.u, dps = Math.round(u.hit * u.aps * (u.bodies || 1)), sk = (u.skills || []).map(id => ROSTER.skills[id] || id);
      sh.querySelector('.tag').textContent = `Tier ${g.userData.t} · ${u.cost} gold`;
      sh.querySelector('h3').textContent = u.name;
      sh.querySelector('.st').innerHTML = [`<b>${u.hp}</b> health`, `<b>${dps}</b> damage a second`, `<b>${u.range} m</b> range`, `<b>${u.speed}</b> speed`,
        (u.bodies || 1) > 1 ? `<b>${u.bodies}</b> bodies` : '', u.splash ? `<b>${u.splash} m</b> splash` : '', u.defense && u.defense !== 'none' ? `<b>${u.defVal}</b> ${u.defense}` : ''].filter(Boolean).map(t => `<span>${t}</span>`).join('');
      sh.querySelector('.sk').innerHTML = sk.length ? `Skills <b>${sk.join(' · ')}</b>` : '';
      drawSkinRow();
    }
    // a unit's skins: the ones you own, and the limited one you can still earn by inviting a friend (the others stay hidden)
    const skinsOf = (name) => Object.entries(SKIN).filter(([, S]) => S.unit === name).map(([id, S]) => ({ id, S, own: !!(A && A.skins.some(k => k.id === id)) })).filter(k => k.own || k.S.limited);
    const lockSvg = '<svg class="lock" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="2.5" y="7" width="11" height="8" rx="1" fill="currentColor"/></svg>';
    function drawSkinRow() {
      const el = body.querySelector('#usheet .skn'), list = picked ? skinsOf(picked.userData.u.name) : [];
      if (!list.length) { el.innerHTML = ''; el.hidden = true; return; }
      const w = wornOf(picked.userData.u.name), S = w && SKIN[w.id];
      el.hidden = false;
      el.innerHTML = `<span class="lab">Skin</span><span class="seg"><button data-wear="" aria-pressed="${!w}">Plain</button>${list.map(k => k.own
          ? `<button data-wear="${k.id}" aria-pressed="${!!w && w.id === k.id}">${esc(k.S.name)}</button>`
          : `<button disabled title="Invite a friend to get it">${lockSvg}${esc(k.S.name)}</button>`).join('')}</span>
        <p>${S ? esc(S.text) : list.some(k => !k.own) && !list.some(k => k.own) ? 'Invite a friend and the Aquamarine skin is yours.' : 'Its own look.'} Only the look changes, never the stats.</p>`;
    }
    // wear a skin (or none) on a unit: one per unit. The roster swaps the model and the island stays as it is
    function wear(name, id) {
      if (!A) return;
      A.skins.forEach(k => { if (SKIN[k.id].unit === name) k.worn = k.id === id; });
      const i = picked ? picked.userData.i : -1; buildTier(tier, i); if (i >= 0) picked = rosterHot[i];
      drawSkinRow(); if (body.classList.contains('profile')) drawProfile();
    }
    body.querySelector('#usheet').addEventListener('click', (e) => { const b = e.target.closest('[data-wear]'); if (b && picked) wear(picked.userData.u.name, b.dataset.wear); });
    body.querySelector('#usheet .x').addEventListener('click', () => pickUnit(null));
    body.querySelectorAll('.tiers button').forEach(b => b.addEventListener('click', () => setTier(+b.dataset.t)));
    function setTier(t) { tier = t; picked = null; body.querySelectorAll('.tiers button').forEach(x => x.setAttribute('aria-pressed', +x.dataset.t === t)); roster.position.y = still ? 0 : -1.6; buildTier(t); }

    // ── life ──
    const clock = new THREE.Clock();
    function frame() {
      raf = 0; if (!running) return;
      const t = still ? 1.3 : clock.getElapsedTime(), k = still ? 1 : 0.08, kk = still ? 1 : 0.12;
      now.az = lerp(now.az, want.az, k); now.el = lerp(now.el, want.el, k); now.zoom = lerp(now.zoom, want.zoom, k);
      for (let i = 0; i < 3; i++) now.at[i] = lerp(now.at[i], want.at[i], k);
      for (let i = 0; i < 2; i++) now.off[i] = lerp(now.off[i], want.off[i], k);
      // a battlefield change: the island dips and the new miniatures pop up one after another
      const sw = performance.now() / 1000 - changedAt, dip = sw < 0.6 ? Math.sin(sw / 0.6 * Math.PI) * 0.3 : 0;
      for (const o of kitGrow) if (o.userData.t0 >= 0) { const p = Math.min(1, Math.max(0, (sw - 0.12 - o.userData.t0) / 0.32)), e = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
        o.scale.setScalar(Math.max(0.001, o.userData.s * (p >= 1 ? 1 : e))); if (p >= 1) o.userData.t0 = -1; }
      island.position.y = Math.sin(t * 0.8) * 0.12 - dip; island.rotation.y = Math.sin(t * 0.25) * 0.03;
      mage.rotation.y = 0.3 + Math.sin(t * 0.9) * 0.15; mage.position.y = Math.abs(Math.sin(t * 2.2)) * 0.06;
      sniper.rotation.y = -0.35 + Math.sin(t * 0.4) * 0.06;
      ent.scale.y = 0.441 * (1 + Math.sin(t * 1.2) * 0.03);
      champ.rotation.y = -0.3 + Math.sin(t * 0.6) * 0.1;
      const rk = body.classList.contains('ranks'), un = body.classList.contains('units');
      pieces.position.y = lerp(pieces.position.y, rk || un ? -2.6 : 0, kk); pieces.visible = pieces.position.y > -2.4;
      const tn = performance.now() / 1000;
      for (const g of rosterHot) for (const f of g.children) if (f.userData.pop) { const p = Math.min(1, (tn - f.userData.pop) / 0.34), e = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
        f.scale.setScalar(Math.max(0.001, f.userData.s * (p >= 1 ? 1 : e))); if (p >= 1) f.userData.pop = 0; }
      podium.position.y = lerp(podium.position.y, rk ? 0 : -4, kk); podium.visible = podium.position.y > -3.6;
      roster.position.y = lerp(roster.position.y, un ? 0 : -4, kk); roster.visible = roster.position.y > -3.6;
      for (const [key, g] of Object.entries(HOT)) g.position.y = lerp(g.position.y, g.userData.y0 + (hovered === key ? 0.18 : 0), still ? 1 : 0.25);
      rosterHot.forEach((g, i) => { g.position.y = lerp(g.position.y, (hovered === 'u:' + i || picked === g) ? 0.22 : 0, still ? 1 : 0.25); });
      place(); if (renderer) renderer.render(scene, cam); notes();
      raf = requestAnimationFrame(frame);
    }
    // the home shows: a renderer and the loop; it hides (a match): both go, the scene stays in memory for next time
    function resume() { if (running) return; if (!flat && !renderer) makeRenderer(); running = true; size(); if (flat) paintFlat(); else frame(); }
    function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; freeRenderer(); }
    // no WebGL (or ?board=2d, or the context lost): the look's ground as a flat tilted picture, the words as they are
    function goFlat(why) { if (why) console.warn('No Mans Land: the Diorama island is flat (' + why + ').'); flat = true; freeRenderer(); if (raf) cancelAnimationFrame(raf); raf = 0; body.classList.add('flat'); paintFlat(); }
    function paintFlat() {
      let fc = body.querySelector('.flat-isle'); if (!fc) { fc = document.createElement('canvas'); fc.className = 'flat-isle'; fc.setAttribute('aria-hidden', 'true'); cv.after(fc); }
      fc.width = floorCv.width; fc.height = floorCv.height; fc.getContext('2d').drawImage(floorCv, 0, 0);
      fc.style.setProperty('--side', LOOKS[lookI].side); fc.style.setProperty('--soil', LOOKS[lookI].soil[0]);
    }
    if (flat) goFlat();

    // ── the menu drives the camera; Units and Rankings stay up once clicked ──
    const items = body.querySelectorAll('.menu .item');
    const MODES = { units: 'units', ranks: 'ranks' };
    const setMode = (v) => { for (const m of Object.values(MODES)) body.classList.toggle(m, m === MODES[v]); };
    for (const b of items) {
      const go = () => { if (body.classList.contains('pinned') && b.dataset.cam !== viewName) return; items.forEach(x => x.classList.toggle('on', x === b)); viewName = b.dataset.cam; want = VIEWS[viewName]; setMode(viewName); };
      b.addEventListener('mouseenter', go); b.addEventListener('focus', go);
    }
    body.querySelector('.menu').addEventListener('mouseleave', () => { if (body.classList.contains('pinned')) return; items.forEach(x => x.classList.toggle('on', x.id === 'play')); want = VIEWS.play; viewName = 'play'; setMode('play'); });
    for (const v of Object.keys(MODES)) body.querySelector(`.menu .item[data-cam="${v}"]`).addEventListener('click', () => { items.forEach(x => x.classList.toggle('on', x.dataset.cam === v)); viewName = v; want = VIEWS[v]; setMode(v); body.classList.add('pinned'); });
    // Puzzles and How to play open the game's sheets (until they're designed); the camera move on pointing stays
    $('puzzles-open').addEventListener('click', openPuzzles);
    $('how').addEventListener('click', openHowTo);
    // the golem's note: the invite link lives in the game's Rewards sheet (owner, 2026-11-07: open it while Rewards is on hold)
    { const rn = body.querySelector('.rw-note'); rn.addEventListener('click', () => openRewardsSheet()); rn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRewardsSheet(); } }); }
    const unpin = () => { body.classList.remove('pinned'); setMode('play'); picked = null; items.forEach(x => x.classList.toggle('on', x.id === 'play')); viewName = 'play'; want = VIEWS.play; };
    // the Play screen is the old PLAY popup: home.pop says it's open (it stays open across a match, and ?test opens it at once)
    const openPlay = () => { if (typeof openDrop === 'function') openDrop(''); unpin(); body.classList.add('play'); body.classList.remove('music-open'); want = VIEWS.orders; home.pop = true; };
    const closePlay = () => { body.classList.remove('play', 'mp-open'); setMp(false); unpin(); home.pop = false; };
    document.getElementById('play').addEventListener('click', openPlay);
    const backBtn = body.querySelector('.back');
    const goBack = () => { if (body.classList.contains('welcome')) return body.classList.contains('in-signin') ? goScreen('welcome') : undefined; if (body.classList.contains('in-history')) return closeHistory(); if (body.classList.contains('profile')) return body.classList.contains('units') ? profileUnits(false) : closeProfile();
      if (body.classList.contains('in-rooms')) return closeRooms(); closePlay(); };
    backBtn.addEventListener('click', goBack);

    // Play: Vs computer starts at once; Multiplayer folds out its kinds, and a kind opens Rooms filtered to it
    const multi = document.getElementById('multi');
    const setMp = (on) => { body.classList.toggle('mp-open', on); multi.setAttribute('aria-expanded', on); };
    multi.addEventListener('click', () => setMp(!body.classList.contains('mp-open')));
    // Vs computer: straight into a match against the AI (the old popup's #go), a normal Standard match
    $('go').addEventListener('click', () => { home.mode = 'normal'; matchKind = 'standard'; lateGame = false; startAiMatch(); });
    // Developer (A.dev; in the game devMode()): 2v2 unlocks in Multiplayer and New room, and the extras show top left
    if (A && A.dev) {
      body.classList.add('dev');
      const d2 = body.querySelector('.orders .mp [data-q="2v2"]'); d2.disabled = false; d2.removeAttribute('aria-disabled');
      d2.querySelector('small').innerHTML = '<i class="dvt">Dev</i>two boards side by side';
      const k2 = body.querySelector('.newroom [data-kind="2v2"]'); k2.disabled = false; k2.textContent = '2v2';
    }
    body.querySelectorAll('.orders .mp .item:not([disabled])').forEach(b => b.addEventListener('click', () => openRooms(b.dataset.q)));
    // the notes are the game's own lines (playPop's developer block, ExploitBot.TACTICS); sample text here
    const DV = {
      factions: '<b>Factions vs AI.</b> Draft two factions each.',
      devtest: '<b>Factions · devtest.</b> Buildings, Powers and spells on the big board, against the AI.',
      late: '<b>Late game vs AI.</b> Standard with treasuries: 130 health each, at most 5 squads of any one tier 3 or tier 4 unit.',
      claude: '<b>Vs Claude.</b> Claude plays the other side. Only where Claude can be reached.',
      tours: '<b>Tournaments.</b> Host one, join one by its code, or practise against bots.',
      load: '<b>Load units.</b> 28 built-in units now. Load a Counter Lab set instead; matches are saved for Claude to review.',
      lab: '<b>Counter Lab.</b> Make units and test them against each other. Opens its own page.',
    };
    const XB = {
      '': 'Off: the normal AI plays as it always does.',
      flank: '<b>Flank snipers.</b> Beats the normal AI 83% of 30 matches. Shiv and Leaf Wizard on your flank columns from round 3.',
      steel: '<b>Steel Wizard flank.</b> Beats the normal AI 90% of 30 matches. Steel Wizards on your flanks from round 1, borrowing every round.',
      necro: '<b>Necromancer home guard.</b> Beats the normal AI 83% of 30 matches. Necromancers round its own keep, Fire Mages from round 4.',
      wizards: '<b>Back-line wizards.</b> Beats the normal AI 40% of 30 matches. Flame Wizards from its back rows, Slime Wizards from round 6.',
      hoard: '<b>Hoarder.</b> Beats the normal AI 80% of 30 matches. Spends nothing until round 3, then the Sniper tower and the Bank.',
      arrow: '<b>Arrow rush.</b> Beats the normal AI 80% of 30 matches. Built on the direction arrows; masses Brute.',
    };
    let xbPick = '';
    const dvNote = (h) => { document.getElementById('dv-note').innerHTML = h || `<i class="dvt">Exploit bot</i> ${XB[xbPick]}${xbPick ? ' Applies to every match against the computer.' : ''}`; };
    const setXb = (id) => { xbPick = id; body.querySelectorAll('.devs [data-xb]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.xb === id))); dvNote(); };
    body.querySelectorAll('.devs [data-dv]').forEach(b => { const on = () => dvNote(DV[b.dataset.dv]); b.addEventListener('mouseenter', on); b.addEventListener('focus', on); b.addEventListener('click', () => {}); }); // in the game: start that mode / open that sheet
    body.querySelectorAll('.devs [data-xb]').forEach(b => { const on = () => dvNote(XB[b.dataset.xb]); b.addEventListener('mouseenter', on); b.addEventListener('focus', on); b.addEventListener('click', () => setXb(b.dataset.xb)); });
    body.querySelector('.devs .dv').addEventListener('mouseleave', () => dvNote());
    dvNote();

    // Rooms (sample data, shaped like the game's lobby list: host, battlefield, players, age or round, watchers)
    const ROOMS = [
      { q: 'standard', host: 'Pebble', map: 'Meadow', p: 1, at: 0 },
      { q: 'ranked', host: 'Ironmoss', score: 88, map: 'Desert', p: 1, at: 1 },
      { q: 'standard', host: 'Sleepy Ent', map: 'Snow', p: 1, at: 4 },
      { q: 'ranked', host: 'Captain Tuesday', score: 96, map: 'Ashlands', p: 2, round: 2, watch: 5 },
      { q: 'standard', host: 'Captain Tuesday', map: 'Forest Glade', p: 2, round: 3, watch: 2 },
      { q: 'ranked', host: 'Pebble', score: 81, map: 'Moonlit Snow', p: 1, at: 3 },
      { q: 'standard', host: 'Bramble', map: 'Autumn', p: 1, at: 7, noWatch: true },
      { q: 'ranked', host: 'Hedgewitch', score: 74, map: 'Savanna', p: 2, round: 4, watch: 1 },
      { q: 'standard', host: 'Old Gus', map: 'Meadow', p: 2, round: 6, noWatch: true },
      { q: 'standard', host: 'Moth', map: 'Snow', p: 1, at: 12 },
    ];
    const KIND = { standard: '1v1 Standard', ranked: '1v1 Ranked', '2v2': '2v2' };
    let roomQ = 'standard';
    function drawRooms() {
      const text = document.getElementById('r-q').value.trim().toLowerCase();
      const rows = ROOMS.filter(r => r.q === roomQ && (!text || r.host.toLowerCase().includes(text) || r.map.toLowerCase().includes(text)));
      const open = rows.filter(r => !r.round).length;
      document.getElementById('r-count').textContent = `${open} open · ${rows.length - open} playing`;
      document.getElementById('r-list').innerHTML = rows.length ? rows.map(r => {
        const facts = [r.map, `${r.p}/2 players`, r.round ? `round ${r.round}` : r.at < 1 ? 'just now' : `${r.at} min ago`, r.watch ? `${r.watch} watching` : ''].filter(Boolean).join(' · ');
        const act = !r.round ? '<button class="go">Join</button>' : !r.noWatch ? '<button class="go watch">Watch</button>' : '<span class="full">full</span>';
        return `<li><span><b>${esc(r.host)}’s room</b>${r.score ? `<span class="sc">★ ${r.score}</span>` : ''}${r.noWatch ? '<span class="tg">No watchers</span>' : ''}<small>${esc(facts)}</small></span>${act}</li>`;
      }).join('') : `<li class="empty">No ${KIND[roomQ]} rooms right now. Make one, and others can join you.</li>`;
    }
    function setRoomQ(q) {
      roomQ = q; body.querySelector('#r-tok span').textContent = KIND[q];
      body.querySelectorAll('#r-menu button').forEach(b => b.setAttribute('aria-pressed', b.dataset.q === q));
      drawRooms();
    }
    const tokMenu = (on) => { document.getElementById('r-menu').hidden = !on; document.getElementById('r-tok').setAttribute('aria-expanded', on); };
    document.getElementById('r-tok').addEventListener('click', () => tokMenu(document.getElementById('r-menu').hidden));
    body.querySelectorAll('#r-menu button:not([disabled])').forEach(b => b.addEventListener('click', () => { setRoomQ(b.dataset.q); tokMenu(false); }));
    document.getElementById('r-q').addEventListener('input', drawRooms);
    function openRooms(q) { setRoomQ(q); tokMenu(false); body.classList.add('in-rooms'); backBtn.textContent = '← Play'; }
    function closeRooms() { if (body.classList.contains('in-create')) return closeCreate(); body.classList.remove('in-rooms'); tokMenu(false); backBtn.textContent = '← Menu'; }

    // Create room: starts on the kind the list was filtered to (the game's create sheet: kind, public or private, spectators)
    const NOTE = { standard: 'On the Standard map. No stakes.', ranked: 'A best of 3 on the Standard map and pack. You and whoever joins both need to be logged in with Google. Only ranked series count on the leaderboard.' };
    const press = (sel, on) => body.querySelectorAll(sel).forEach(b => b.setAttribute('aria-pressed', on(b)));
    function setKind(k) { press('.newroom [data-kind]', b => b.dataset.kind === k); document.getElementById('nr-note').textContent = NOTE[k]; }
    body.querySelectorAll('.newroom [data-kind]:not([disabled])').forEach(b => b.addEventListener('click', () => setKind(b.dataset.kind)));
    body.querySelectorAll('.newroom [data-pub]').forEach(b => b.addEventListener('click', () => { press('.newroom [data-pub]', x => x === b); document.getElementById('nr-pub').textContent = b.dataset.pub === '1' ? 'Listed in Rooms for anyone to join.' : 'Not listed. Invite friends to it from Friends.'; }));
    body.querySelectorAll('.newroom [data-spec]').forEach(b => b.addEventListener('click', () => { press('.newroom [data-spec]', x => x === b); document.getElementById('nr-spec').textContent = b.dataset.spec === '1' ? 'Anyone can watch once it starts.' : 'No one can watch.'; }));
    // the room's battlefield: the host picks it here and the match is played on it; the island shows it while you pick
    let roomLook = 0;
    function setRoomLook(i) { roomLook = (i + LOOKS.length) % LOOKS.length; document.getElementById('nr-bf').textContent = LOOKS[roomLook].name;
      document.getElementById('nr-bfn').textContent = `${roomLook + 1} of ${LOOKS.length}. The match is played here. Everyone else keeps their own at home.`; if (lookI !== roomLook) setLook(roomLook, !still); }
    body.querySelectorAll('.newroom [data-bfs]').forEach(b => b.addEventListener('click', () => setRoomLook(roomLook + +b.dataset.bfs)));
    function openCreate() { setKind(roomQ); tokMenu(false); body.classList.add('in-create'); backBtn.textContent = '← Rooms'; setRoomLook(homeLook); }
    function closeCreate() { body.classList.remove('in-create'); backBtn.textContent = '← Play'; if (lookI !== homeLook) setLook(homeLook, !still); }
    // Change battlefield: steps through the looks one at a time. At home it is only how your island looks; on New room it steps the room's
    const bfNote = body.querySelector('.bf-note');
    const stepBattlefield = () => { if (body.classList.contains('in-create')) return setRoomLook(roomLook + 1);
      homeLook = (homeLook + 1) % LOOKS.length; saveLook(homeLook); setLook(homeLook, !still); };
    bfNote.addEventListener('click', stepBattlefield); bfNote.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stepBattlefield(); } });
    const bfSub = () => { const L = LOOKS[lookI]; document.getElementById('bf-sub').textContent = `${L.name} · ${lookI + 1} of ${LOOKS.length}`; };
    document.addEventListener('battlefield', bfSub); bfSub();
    document.getElementById('r-create').addEventListener('click', openCreate);
    document.getElementById('nr-go').addEventListener('click', () => {}); // in the game: the room opens and waits for a second player
    // ── Profile (the game's Profile sheet: openAccountSheet / acctDraw in src/site-template.html), on sample accounts ──
    const pf = { outSure: false, sure: false };
    const acctBtn = body.querySelectorAll('.acct button')[1];
    function drawProfile() {
      acctBtn.querySelector('span').textContent = A ? A.tag : 'Guest';
      if (typeof frBadge === 'function' && $('fr-badge')) try { frBadge(); if (dd.open === 'friends') drawFriends(); } catch (e) {}
      $('pf-k').innerHTML = (!A ? 'Profile · no account yet' : A.google ? 'Profile · signed in with Google' : 'Profile · guest on this phone') + (A && A.dev ? ' · <span class="dev">developer mode is on</span>' : '');
      $('pf-name').textContent = A ? A.tag : 'Nobody yet';
      const T = A && DTITLES[A.title], pt = $('pf-title'); pt.hidden = !T;
      if (T) { pt.style.setProperty('--tc', T[1]); pt.innerHTML = `<i></i>${esc(T[0])}<i></i>`; }
      const g = '<button class="gbtn" data-google><i aria-hidden="true">G</i>Sign in with Google</button>';
      const row = (lab, seg, note, cls = '') => `<span class="lab">${lab}</span><span class="seg ${cls}">${seg}</span><span></span><p class="nr-note">${note}</p>`;
      let h = '';
      if (A) {
        if (A.titles.length) h += row('Title', A.titles.map(t => `<button data-title="${t}" style="--pc:${DTITLES[t][1]}" aria-pressed="${A.title === t}">${esc(DTITLES[t][0])}</button>`).join('') + `<button data-title="" aria-pressed="${!A.title}">None</button>`,
          T ? T[2] : 'Nothing shows under your name.');
        { const on = A.skins.filter(k => k.worn).map(k => `${SKIN[k.id].name} ${SKIN[k.id].unit}`), un = body.classList.contains('units');
          h += `<span class="lab ur">Skins</span><span class="pf-units ur"><button class="item${un ? ' on' : ''}" data-units aria-pressed="${un}"><svg class="shard" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,6 97,0 100,96 4,100"/></svg>Units</button></span>
            <span class="ur"></span><p class="nr-note ur">${!A.skins.length ? 'No skins yet. Every unit is in Units, on the island.' : `${on.length > 2 ? `${on.length} skins are on.` : on.length ? `${esc(on.join(' and '))} ${on.length > 1 ? 'are' : 'is'} on.` : 'All plain.'} Pick a unit to change its skin.`}</p>`; }
        h += row('Username', `<input id="pf-tag" maxlength="16" spellcheck="false" autocomplete="nickname" aria-label="Your username" value="${esc(A.tag)}" ${A.tagNext && !A.dev ? 'disabled' : ''}><button class="act" id="pf-save" hidden>Save</button>`,
          A.dev ? 'Developer: change it any time.' : A.tagNext ? 'Saved. You can change it again on Saturday, 14 November.' : 'You can change it once a week.', 'pf-user');
        if (!A.google) h += row('Keep it', g, 'Guest on this phone. Sign in with Google to keep it if you change or reset your phone.');
        h += row('Account', `<button class="act${pf.outSure ? ' sure' : ''}" data-out>${pf.outSure ? 'Tap again to log out' : 'Log out'}</button><button class="del${pf.sure ? ' sure' : ''}" data-del>${pf.sure ? 'Tap again to delete' : 'Delete account'}</button>`,
          pf.sure ? 'Deleting removes your username and sign-in for good. Past match results stay, without your name.'
          : A.google ? 'Signed in with Google. Sign in on another phone to play as the same player.'
          : pf.outSure ? 'A guest can’t log back in: sign up with Google first to keep this username and your results.' : 'Log out of this phone. A guest can’t log back in.');
      } else h += row('Account', `<button class="act primary" data-guest>Play as a guest</button>${g}`, 'No account needed to play. Make a guest to get a username on this phone, or sign in with Google to keep it on any phone.');
      $('pf-opts').innerHTML = h;
      // the island's note: the golem, while you can still earn its skin
      body.querySelectorAll('.pnote').forEach(n => n.remove());
      if (!(A && A.skins.some(k => k.id === 'golem-aquamarine'))) { const n = document.createElement('div'); n.className = 'note pnote'; n.style.display = 'none';
        n.innerHTML = `<span class="tag">Reward · Limited</span><br>${A && A.skins.length ? '' : 'No skins yet. '}<b>Invite a friend and this golem’s skin is yours.</b>`; body.querySelector('.notes').after(n); }
      if (body.classList.contains('profile') && !body.classList.contains('in-history')) want = body.classList.contains('units') ? VIEWS.units : VIEWS.play;
    }
    // Profile's Units: the roster comes up on the island, as from the menu; a unit's sheet changes its skin. ← Profile goes back
    function profileUnits(on) {
      body.classList.toggle('units', on); picked = null; hovered = null; if (on) setTier(tier);
      backBtn.textContent = on ? '← Profile' : '← Menu'; drawProfile();
    }
    const refreshAccount = () => { picked = null; buildTier(tier); drawProfile(); };
    $('pf-opts').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.title !== undefined) { A.title = b.dataset.title; drawProfile(); }
      else if (b.hasAttribute('data-units')) profileUnits(!body.classList.contains('units'));
      else if (b.id === 'pf-save') { const v = $('pf-tag').value.trim(); if (v.length >= 2) { A.tag = v; A.tagNext = 1; drawProfile(); } }
      else if (b.hasAttribute('data-out')) { if (!A.google && !pf.outSure) { pf.outSure = true; return drawProfile(); } A = null; pf.outSure = false; refreshAccount(); }
      else if (b.hasAttribute('data-del')) { if (!pf.sure) { pf.sure = true; return drawProfile(); } A = null; pf.sure = false; refreshAccount(); }
      else if (b.hasAttribute('data-guest')) { A = structuredClone(ACCTS.guest); refreshAccount(); }
      else if (b.hasAttribute('data-google')) { A = structuredClone(ACCTS.google); if (acctQ === 'guest') A.tag = 'Guest 4821'; pf.outSure = false; refreshAccount(); } // in the game: Google's own button
    });
    $('pf-opts').addEventListener('input', (e) => { if (e.target.id === 'pf-tag') $('pf-save').hidden = e.target.value.trim() === A.tag || e.target.value.trim().length < 2; });
    $('pf-opts').addEventListener('keydown', (e) => { if (e.target.id === 'pf-tag' && e.key === 'Enter' && !$('pf-save').hidden) $('pf-save').click(); if (e.key === 'Escape') e.stopPropagation(); });

    function openProfile() { openDrop(''); unpin(); closeMusic(); body.classList.add('profile'); backBtn.textContent = '← Menu'; pf.outSure = pf.sure = false; drawProfile(); }
    function closeProfile() { body.classList.remove('profile', 'in-history', 'units'); picked = null; hovered = null; want = VIEWS.play; backBtn.textContent = '← Menu'; }
    acctBtn.addEventListener('click', openProfile);
    // Match history (sample data, shaped like the game's: result, opponent and title, kind, rounds, battlefield, when)
    const HIST = [
      { res: 'won', foe: 'Pebble', ft: 'initiate', kind: 'Ranked', score: '2–1', map: 'Desert', when: '2 h ago', r: [['lost', 22, 14], ['won', 0, 31], ['won', 6, 27]] },
      { res: 'lost', foe: 'Captain Tuesday', ft: 'legend', kind: 'Ranked', score: '0–2', map: 'Ashlands', when: 'yesterday', r: [['lost', 30, 4], ['lost', 28, 11]] },
      { res: 'won', foe: 'Moth', kind: 'Standard', score: '2–0', map: 'Meadow', when: 'yesterday', r: [['won', 3, 30], ['won', 0, 24]] },
      { res: 'draw', foe: 'Bramble', ft: 'goodsport', kind: 'Standard', score: '1–1', map: 'Autumn', when: '3 days ago', r: [['won', 8, 19], ['lost', 21, 5], ['draw', 0, 0, true]] },
      { res: 'left', foe: 'Old Gus', kind: 'Standard', score: 'they left', map: 'Snow', when: '5 days ago', r: [['won', 2, 26]] },
      { res: 'won', foe: 'Hedgewitch', ft: 'day1', kind: 'Ranked', score: '2–0', map: 'Savanna', when: 'last week', r: [['won', 12, 30], ['won', 9, 22]] },
      { res: 'lost', foe: 'Ironmoss', kind: 'Standard', score: '1–2', map: 'Forest Glade', when: 'last week', r: [['won', 4, 18], ['lost', 25, 3], ['lost', 30, 9]] },
    ];
    const ALL = [['Ironmoss', 'Moth', '2–0', 'Ranked', 'Desert', '4 min ago'], ['Captain Tuesday', 'Sleepy Ent', '2–1', 'Ranked', 'Snow', '12 min ago'], ['Pebble', 'Bramble', '2–0', 'Standard', 'Meadow', '20 min ago'], ['Hedgewitch', 'Old Gus', '1–1', 'Standard', 'Autumn', '31 min ago'], ['Moth', 'Wren', '0–2', 'Standard', 'Meadow', 'yesterday']];
    const RES = { won: 'Won', lost: 'Lost', draw: 'Draw', left: 'Won' };
    const car = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    let histTab = 'mine';
    function drawHistory() {
      body.querySelectorAll('.h-tabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.h === histTab));
      if (histTab === 'all') {
        $('h-count').textContent = 'everyone’s, newest first';
        $('h-list').innerHTML = ALL.map(([a, b, sc, kind, map, when]) => `<li><span class="res draw">${sc}</span><span><b>${esc(a)} vs ${esc(b)}</b><small>${kind} · ${map} · ${when}</small></span><button class="go watch">Replay</button></li>`).join('');
        return;
      }
      if (!A) { $('h-count').textContent = ''; $('h-list').innerHTML = '<li class="empty">No account, no record. Your matches show here once you have a username.</li>'; return; }
      $('h-count').textContent = `${HIST.length} played · ${HIST.filter(x => RES[x.res] === 'Won').length} won`;
      $('h-list').innerHTML = HIST.map(x => {
        const T = DTITLES[x.ft], dealt = x.r.reduce((t, q) => t + q[2], 0), took = x.r.reduce((t, q) => t + q[1], 0);
        const rounds = x.r.map((q, i) => `<li><span><b>Round ${i + 1}</b>${q[3] ? 'time ran out' : q[0]}<small>you took ${q[1]}, they took ${q[2]}</small></span><button class="go">Replay</button></li>`).join('');
        return `<li><span class="res ${x.res}">${RES[x.res]}</span><span><b>vs ${esc(x.foe)}</b>${T ? `<span class="tt" style="--tc:${T[1]}">${esc(T[0])}</span>` : ''}<small>${x.kind} · ${x.score} · ${x.map} · ${x.when} · dealt ${dealt}, took ${took}</small></span>
          <button class="rd" aria-expanded="false">${x.r.length} round${x.r.length > 1 ? 's' : ''} ${car}</button><ol class="rounds">${rounds}</ol></li>`;
      }).join('');
    }
    $('h-list').addEventListener('click', (e) => { const b = e.target.closest('.rd'); if (!b) return; const li = b.closest('li'); li.classList.toggle('open'); b.setAttribute('aria-expanded', li.classList.contains('open')); });
    body.querySelectorAll('.h-tabs button').forEach(b => b.addEventListener('click', () => { histTab = b.dataset.h; drawHistory(); }));
    function openHistory() { histTab = A ? 'mine' : 'all'; drawHistory(); body.classList.add('in-history'); hovered = null; want = VIEWS.history; backBtn.textContent = '← Profile'; }
    function closeHistory() { body.classList.remove('in-history'); backBtn.textContent = '← Menu'; drawProfile(); }
    $('pf-hist').addEventListener('click', openHistory);
    drawProfile();


    // ── Welcome, Sign up, Log in on the game's accounts (drawWelcome / drawSignIn): home.screen says which ('welcome',
    // 'signup', 'login'); the buttons set it and call drawHome, as the old screens do. The username typed in Sign up is
    // home.tag, the line under the rows is home.msg (#acct-msg; the welcome screen's is #home-msg) ──
    const door = { screen: null, invited: false, err: '' };
    const TAG_RULE = 'Letters, digits, spaces, _ . or -. You can change it once a week.', TAG_BAD = 'Usernames are 2–16 letters, digits, spaces, _ . or -.';
    function drawSignin() {
      const up = door.screen === 'signup';
      $('si-k').textContent = up ? 'Welcome · sign up' : 'Welcome · log in';
      $('si-h').textContent = up ? 'Sign up' : 'Log in';
      $('si-lead').textContent = up ? 'Pick your username. Sign up with Google to keep your account on any phone or computer, or just make a guest on this one.'
        : 'Log in with the Google account you signed up with. You get your username, match history and ranked results back on this device.';
      const row = (lab, seg, note) => `<span class="lab">${lab}</span><span class="seg">${seg}</span><span></span><p class="nr-note">${note}</p>`;
      const g = GOOGLE_CLIENT_ID && !acctUi.off; // Google's own button goes in #acct-google (acctGoogleButton)
      $('si-opts').innerHTML = (up ? row('Username', `<input id="su-tag" maxlength="16" autocomplete="nickname" spellcheck="false" placeholder="2–16 letters" aria-label="Username" value="${esc(home.tag || '')}"${door.err ? ' class="bad" aria-invalid="true"' : ''}>`, door.err ? `<b class="si-err">${esc(door.err)}</b>` : TAG_RULE) : '')
        + row(up ? 'Keep it' : 'Google', g ? '<div id="acct-google" class="acct-google"></div>' : '<span class="si-off">Google sign-in is off on this server.</span>', 'Sign-in is handled by Google. We never see your password or email.')
        + (up ? row('Or', `<button class="act" id="su-guest" data-guest ${home.busy ? 'disabled' : ''}>Sign up as a guest</button>`, 'A username on this device only. A guest can’t log back in elsewhere.') : '');
      $('acct-msg').textContent = home.msg || '';
      $('si-other').textContent = up ? 'I have an account: log in' : 'New here? Sign up';
      acctUi.after = async (r) => { // Google said yes (acctGoogle): Sign up keeps the username typed here
        const tag = up ? (home.tag || '').trim() : '';
        if (tag && cleanTagOk(tag) && r.linked === 'new') await acctCall('tag', { tag }, true).then(x => { if (x.status === 200) acctTake(x); });
        if (phase === 'start') homeDone();
      };
      if (g) acctGoogleButton(up ? 'signup_with' : 'signin_with');
    }
    function openDoor(screen) { // '' = the welcome screen; 'signup' / 'login'
      if (door.screen !== screen) { openDrop(''); closeMusic(); unpin(); door.err = ''; }
      door.screen = screen; door.invited = !!invitePending();
      body.classList.add('welcome'); body.classList.toggle('in-signin', !!screen);
      want = screen ? VIEWS.signin : VIEWS.welcome; backBtn.textContent = '← Back';
      $('w-guest').disabled = !!home.busy; $('home-msg').textContent = screen ? '' : home.msg || '';
      if (screen) drawSignin();
    }
    function closeDoor() { door.screen = null; acctUi.after = null; body.classList.remove('welcome', 'in-signin'); want = VIEWS.play; backBtn.textContent = '← Menu'; }
    const goScreen = (s) => { home.screen = s; home.msg = ''; drawHome(); };
    $('w-login').addEventListener('click', () => goScreen('login'));
    $('w-signup').addEventListener('click', () => goScreen('signup'));
    $('w-guest').addEventListener('click', playAsGuest);
    $('si-other').addEventListener('click', () => goScreen(door.screen === 'signup' ? 'login' : 'signup'));
    $('si-opts').addEventListener('input', (e) => { if (e.target.id === 'su-tag') { home.tag = e.target.value; if (door.err) { door.err = ''; e.target.classList.remove('bad'); e.target.removeAttribute('aria-invalid'); const n = e.target.closest('.seg').nextElementSibling.nextElementSibling; n.textContent = TAG_RULE; } } });
    $('si-opts').addEventListener('keydown', (e) => { if (e.key === 'Escape') e.stopPropagation(); if (e.key === 'Enter' && e.target.id === 'su-tag') $('su-guest').click(); });
    $('si-opts').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-guest]'); if (!b || home.busy) return;
      // Sign up as a guest, with the username typed (the game's su-guest)
      const tag = (home.tag || '').trim();
      if (tag && !cleanTagOk(tag)) { door.err = TAG_BAD; return drawSignin(); }
      home.busy = true; signMsg('One moment…'); b.disabled = true;
      const r = await acctCall('guest', tag ? { tag } : {});
      home.busy = false; b.disabled = false;
      if (r.status !== 200) { if (r.error === 'bad tag') { door.err = TAG_BAD; signMsg(''); return drawSignin(); } signMsg(acctFail(r)); return; }
      acctTake(r); homeDone();
    });
    // Stay logged in? (the old menu's popup): a note off the account button, asked once after making an account or logging in
    const stayEl = $('dio-stay');
    function drawStay() {
      const ask = !!acct && stayPref() == null && !HOME_AUTO && !door.screen && home.screen === 'menu';
      stayEl.hidden = !ask; if (!ask) return;
      stayEl.innerHTML = `<span class="k" id="stay-h">Stay logged in?</span><p>Keep <b>${esc(acct.tag)}</b> logged in on this device, so the game opens on the menu next time. Settings can change it.</p>
        <span class="seg"><button class="w go" id="stay-yes">Yes</button><button class="w" id="stay-no">No</button></span>`;
      $('stay-yes').addEventListener('click', () => { setStay(true); drawHome(); });
      $('stay-no').addEventListener('click', () => { setStay(false); drawHome(); });
    }
    body.querySelectorAll('.door .item').forEach(b => { b.addEventListener('mouseenter', () => body.querySelectorAll('.door .item').forEach(x => x.classList.toggle('on', x === b)));
      b.addEventListener('focus', () => body.querySelectorAll('.door .item').forEach(x => x.classList.toggle('on', x === b))); });
    body.querySelector('.door').addEventListener('mouseleave', () => body.querySelectorAll('.door .item').forEach(x => x.classList.toggle('on', x.id === 'w-login')));

    // ── the dropdowns (the game's Friends sheet, openFriends, and Settings, openSoundSheet), on sample data ──
    const ddBtn = { friends: body.querySelectorAll('.acct button')[0], settings: body.querySelectorAll('.acct button')[2] };
    const dd = { open: '', tab: 'friends', thread: -1, inviteOpen: true, more: -1, inviting: -1, invited: {}, adding: '', reqDone: {} };
    const FRIENDS = [ // status as the game's hub sends it: the menu, a room, or a match with its round
      { tag: 'Pebble', t: 'initiate', st: 'menu', unread: 2 },
      { tag: 'Captain Tuesday', t: 'legend', st: 'match', kind: 'Ranked', round: 3 },
      { tag: 'Moth', st: 'room', kind: 'Standard' },
      { tag: 'Bramble', t: 'goodsport', st: 'off', seen: '2 days ago' },
      { tag: 'Old Gus', st: 'off', seen: 'last week', muted: true },
    ];
    const REQ_IN = [{ tag: 'Hedgewitch', t: 'day1' }, { tag: 'Ironmoss' }], REQ_OUT = [{ tag: 'Sleepy Ent' }];
    const THREAD = [['them', 'gg. that mammoth was rude', 'yesterday'], ['me', 'it never gets tired', 'yesterday'], ['them', 'rematch tonight?', '20 min ago'], ['them', 'bring the golem', '19 min ago']];
    const SET = { music: true, vol: 60, sfx: true, sfxVol: 80, chat: true, emotes: true, spec: true, stay: true, ranked: true };
    const msgSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v11H9l-5 4v-4H3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
    const frOn = () => !!(A && A.google);
    function frBadge() { const n = frOn() ? REQ_IN.filter((r, i) => !dd.reqDone['in' + i]).length + FRIENDS.reduce((t, f) => t + (f.unread || 0), 0) + (dd.inviteOpen ? 1 : 0) : 0;
      const b = $('fr-badge'); b.hidden = !n; b.textContent = n; }
    const where = (f) => f.st === 'menu' ? 'In the menu' : f.st === 'room' ? `In a room · ${f.kind}` : f.st === 'match' ? `Playing ${f.kind} · round ${f.round}` : `Offline · ${f.seen}`;
    function drawFriends() {
      const el = $('dd-friends'); frBadge();
      if (!frOn()) { el.innerHTML = `<h3>Friends</h3><p class="hint">Friends need a Google sign-in, so they can find you on any phone. ${A ? 'Your guest name and results come with you.' : ''}</p>
        <button class="gbtn" data-google><i aria-hidden="true">G</i>Sign in with Google</button>`; return; }
      if (dd.thread >= 0) { const f = FRIENDS[dd.thread];
        el.innerHTML = `<button class="fr-back" data-back>← Friends</button><h3>${esc(f.tag)} <small>${where(f)}</small></h3>
          <ol class="thread">${THREAD.map(([who, txt, at]) => `<li class="${who}">${esc(txt)}<small>${who === 'me' ? 'you · ' : ''}${at}</small></li>`).join('')}</ol>
          <div class="fr-add"><input placeholder="Message ${esc(f.tag)}" aria-label="Message" maxlength="200"><button class="w go">Send</button></div>
          <p class="hint"><button class="lnk" data-mute="${dd.thread}">${f.muted ? 'Unmute messages' : 'Mute messages'}</button> &nbsp; <button class="lnk">Report</button></p>`; return; }
      const nIn = REQ_IN.filter((r, i) => !dd.reqDone['in' + i]).length, online = FRIENDS.filter(f => f.st !== 'off').length;
      let h = `<h3>Friends <small>${online} online · ${FRIENDS.length} friends</small></h3>`;
      if (dd.inviteOpen) h += `<div class="fr-inv"><span class="k">Game invite</span><p><b>Pebble</b> wants a 1v1 Standard. The room is waiting.</p>
        <span class="row"><button class="w" data-join>Join</button><button class="lnk" data-decline>Decline</button></span></div>`;
      h += `<div class="fr-tabs" role="group" aria-label="Friends or requests"><button data-tab="friends" aria-pressed="${dd.tab === 'friends'}">Friends</button><button data-tab="requests" aria-pressed="${dd.tab === 'requests'}">Requests${nIn ? `<i>${nIn}</i>` : ''}</button></div>
        <div class="fr-add"><input id="fr-add" placeholder="Add by username" aria-label="Add a friend by username" maxlength="16" value="${esc(dd.adding)}"><button class="w" data-add>Add</button></div>`;
      if (dd.tab === 'friends') h += `<ul class="fr-list">${FRIENDS.map((f, i) => { const T = DTITLES[f.t];
          const act = dd.invited[i] ? `<span class="done">Invited · ${dd.invited[i]}</span>` : f.st === 'menu' ? `<button class="w${dd.inviting === i ? ' go' : ''}" data-invite="${i}">Invite</button>` : f.st === 'match' ? '<button class="w">Watch</button>' : '';
          const sub = dd.inviting === i && !dd.invited[i] ? `<span class="sub"><span class="lnk" style="text-decoration:none">Invite to</span><button class="w" data-kind="${i}|1v1 Standard">Standard</button><button class="w" data-kind="${i}|1v1 Ranked">Ranked</button></span>`
            : dd.more === i ? `<span class="sub"><button class="lnk" data-mute="${i}">${f.muted ? 'Unmute messages' : 'Mute messages'}</button><button class="lnk${dd.removeSure === i ? ' sure' : ''}" data-remove="${i}">${dd.removeSure === i ? 'Tap again to remove' : 'Remove friend'}</button></span>` : '';
          return `<li><span class="dot${f.st !== 'off' ? ' on' : ''}" aria-label="${f.st !== 'off' ? 'online' : 'offline'}"></span><span><b>${esc(f.tag)}</b>${T ? `<span class="tt" style="--tc:${T[1]}">${esc(T[0])}</span>` : ''}<small>${where(f)}${f.muted ? ' · muted' : ''}</small></span>
            <span class="acts">${act}<button class="msg" data-thread="${i}" aria-label="Messages with ${esc(f.tag)}">${msgSvg}${f.unread ? `<i>${f.unread}</i>` : ''}</button><button class="more" data-more="${i}" aria-label="More">⋯</button></span>${sub}</li>`; }).join('')}</ul>`;
      else h += `<span class="k">Asking to be your friend</span><ul class="fr-list">${REQ_IN.map((r, i) => { const T = DTITLES[r.t], d = dd.reqDone['in' + i];
          return `<li><span class="dot"></span><span><b>${esc(r.tag)}</b>${T ? `<span class="tt" style="--tc:${T[1]}">${esc(T[0])}</span>` : ''}</span><span class="acts">${d ? `<span class="done">${d}</span>` : `<button class="w go" data-accept="${i}">Accept</button><button class="lnk" data-refuse="${i}">Decline</button>`}</span></li>`; }).join('') || '<li><small>No requests.</small></li>'}</ul>
        <span class="k">Waiting for them</span><ul class="fr-list">${REQ_OUT.map((r, i) => `<li><span class="dot"></span><span><b>${esc(r.tag)}</b><small>${dd.reqDone['out' + i] || 'Sent yesterday'}</small></span><span class="acts">${dd.reqDone['out' + i] ? '' : `<button class="lnk" data-cancel="${i}">Cancel</button>`}</span></li>`).join('')}</ul>`;
      el.innerHTML = h; frBadge();
    }
    const onoff = (key, lab, note = '') => `<span class="lab">${lab}</span><span class="seg"><button class="w" data-set="${key}|1" aria-pressed="${SET[key]}">On</button><button class="w" data-set="${key}|0" aria-pressed="${!SET[key]}">Off</button></span>${note ? `<p class="sn">${note}</p>` : ''}`;
    const vol = (key, on, lab) => `<span class="lab">${lab}</span><span class="vol"><input type="range" min="0" max="100" step="5" value="${SET[key]}" data-vol="${key}" style="--v:${SET[key]}%" aria-label="${lab}" ${SET[on] ? '' : 'disabled'}><b>${SET[key]}</b></span>`;
    function drawSettings() {
      $('dd-settings').innerHTML = `<h3>Settings</h3>
        <span class="k">Sound</span><div class="set">${onoff('music', 'Music')}${vol('vol', 'music', 'Music volume')}${onoff('sfx', 'Sound effects')}${vol('sfxVol', 'sfx', 'Effects volume')}</div>
        <span class="k">Online matches</span><div class="set">${onoff('chat', 'Chat')}${onoff('emotes', 'Emotes')}${onoff('spec', 'Spectators', SET.spec ? 'Others can watch your matches.' : 'No one can watch your matches.')}</div>
        <span class="k">This device</span><div class="set">${onoff('stay', 'Stay logged in', SET.stay ? 'You stay logged in on this device.' : `You’re logged out when you close the browser.${A && !A.google ? ' A guest can’t log back in: sign up with Google first.' : ''}`)}</div>
        ${A && A.dev ? `<span class="k" style="color:#FF5FC4">Developer</span><div class="set">${onoff('ranked', 'Ranked play', 'For everyone, not only developers.')}</div>` : ''}
        <div class="set-foot"><button class="lnk" data-playlists>Playlists</button><button class="lnk" data-bug>Report a bug</button></div>
        <p class="hint" style="opacity:.55">In a match, Settings also has the 2D or 3D board and its quality.</p>`;
    }
    function openDrop(which) {
      for (const k of ['friends', 'settings']) { const on = k === which; $('dd-' + k).hidden = !on; ddBtn[k].setAttribute('aria-expanded', on); }
      dd.open = which || ''; if (which === 'friends') drawFriends(); if (which === 'settings') drawSettings(); if (which) closeMusic();
    }
    for (const k of ['friends', 'settings']) { ddBtn[k].setAttribute('aria-haspopup', 'true'); ddBtn[k].setAttribute('aria-expanded', 'false'); ddBtn[k].addEventListener('click', () => openDrop(dd.open === k ? '' : k)); }
    addEventListener('pointerdown', (e) => { if (dio.shown && dd.open && !e.target.closest('.drop') && !e.target.closest('.acct')) openDrop(''); });
    $('dd-friends').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if ('google' in d) { A = structuredClone(ACCTS.google); refreshAccount(); }
      else if ('back' in d) dd.thread = -1;
      else if ('thread' in d) { dd.thread = +d.thread; FRIENDS[dd.thread].unread = 0; }
      else if ('tab' in d) dd.tab = d.tab;
      else if ('join' in d || 'decline' in d) dd.inviteOpen = false; // in the game: Join goes straight into the room
      else if ('invite' in d) { dd.inviting = dd.inviting === +d.invite ? -1 : +d.invite; dd.more = -1; }
      else if ('kind' in d) { const [i, k] = d.kind.split('|'); dd.invited[i] = k; dd.inviting = -1; }
      else if ('more' in d) { dd.more = dd.more === +d.more ? -1 : +d.more; dd.inviting = -1; dd.removeSure = -1; }
      else if ('mute' in d) FRIENDS[+d.mute].muted = !FRIENDS[+d.mute].muted;
      else if ('remove' in d) { if (dd.removeSure === +d.remove) { FRIENDS.splice(+d.remove, 1); dd.more = dd.removeSure = -1; } else dd.removeSure = +d.remove; }
      else if ('accept' in d) dd.reqDone['in' + d.accept] = 'Friends now';
      else if ('refuse' in d) dd.reqDone['in' + d.refuse] = 'Declined';
      else if ('cancel' in d) dd.reqDone['out' + d.cancel] = 'Request cancelled';
      else if ('add' in d) { const v = ($('fr-add') || {}).value || ''; dd.adding = ''; if (v.trim().length >= 2) REQ_OUT.push({ tag: v.trim() }), dd.tab = 'requests'; }
      else return;
      drawFriends();
    });
    $('dd-friends').addEventListener('input', (e) => { if (e.target.id === 'fr-add') dd.adding = e.target.value; });
    $('dd-settings').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.set) { const [k, v] = b.dataset.set.split('|'); SET[k] = v === '1'; drawSettings(); }
      else if ('playlists' in b.dataset) { openDrop(''); openMusic(); }
      else if ('bug' in b.dataset) {} // in the game: the Report a bug sheet
    });
    $('dd-settings').addEventListener('input', (e) => { const k = e.target.dataset.vol; if (!k) return; SET[k] = +e.target.value; e.target.style.setProperty('--v', SET[k] + '%'); e.target.nextElementSibling.textContent = SET[k]; });

    // the playlist
    const openMusic = () => body.classList.toggle('music-open'), closeMusic = () => body.classList.remove('music-open');
    body.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', openMusic));
    body.querySelectorAll('.pl-row').forEach((b, i, all) => b.addEventListener('click', () => all.forEach(x => x.setAttribute('aria-current', x === b))));
    body.querySelectorAll('.pl-tabs button[aria-pressed]').forEach((b, i, all) => b.addEventListener('click', () => all.forEach(x => x.setAttribute('aria-pressed', x === b))));
    body.querySelectorAll('.pl-modes button').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
    addEventListener('keydown', e => { if (e.key === 'Escape' && dio.shown && $('sheet-back').hidden && !typingIn(e.target)) { if (dd.open) return openDrop(''); if (picked) return pickUnit(null); if (!document.getElementById('r-menu').hidden) return tokMenu(false); closeMusic(); goBack(); } });
    addEventListener('pointerdown', e => { if (dio.shown && !e.target.closest('.rsearch')) tokMenu(false); });
    addEventListener('pointerdown', e => { if (dio.shown && body.classList.contains('music-open') && !e.target.closest('.music')) closeMusic(); });
    // states for screenshots: #play, #music, #view=<word>, #pin, #tier=<n>, #unit=<n>, #hover=<piece>
    if (H.includes('play')) { openPlay(); now = { ...VIEWS.orders, at: [...VIEWS.orders.at], off: [...VIEWS.orders.off] }; }
    if (H.includes('multi')) setMp(true);
    const rq = (H.match(/rooms=(\w+)/) || [])[1]; if (rq) { if (!H.includes('play')) { openPlay(); now = { ...VIEWS.orders, at: [...VIEWS.orders.at], off: [...VIEWS.orders.off] }; } openRooms(rq); }
    if (H.includes('filter')) tokMenu(true);
    if (H.includes('create')) openCreate();
    const bq = (H.match(/roombf=(\w+)/) || [])[1]; if (bq) setRoomLook(LOOKS.findIndex(l => l.id === bq));
    if (H.includes('private')) body.querySelector('.newroom [data-pub="0"]').click();
    const plh = (H.match(/plh=(\d+)/) || [])[1]; if (plh) body.querySelectorAll('.pl-row')[+plh].classList.add('hov'); // a song as if pointed at
    const onq = ((H.match(/on=([\w-]+)/) || [])[1] || '').replace(/^vs-ai$/, 'go'); // look as if pointed at: a Play choice (vs-ai, multi, standard, ranked) or a room row (r0, r1...)
    if (onq) { const el = /^r\d+$/.test(onq) ? body.querySelectorAll('#r-list li')[+onq.slice(1)] : document.getElementById(onq) || body.querySelector(`.orders .mp [data-q="${onq}"]`); if (el) el.classList.add('on'); }
    // developer: #acct=dev with #play; #xb=<tactic> (Exploit bot picked), #dvon=<word> (a developer word as if pointed at)
    const xq = (H.match(/xb=(\w+)/) || [])[1]; if (xq && XB[xq]) setXb(xq);
    const dq = (H.match(/dvon=(\w+)/) || [])[1]; if (dq) { const el = body.querySelector(`.devs [data-dv="${dq}"], .devs [data-xb="${dq}"]`); if (el) { el.classList.add('on'); dvNote((DV[dq] || XB[dq])); } }
    if (H.includes('music')) openMusic();
    const v = (H.match(/view=(\w+)/) || [])[1];
    if (v && VIEWS[v]) { want = VIEWS[v]; now = { ...want, at: [...want.at], off: [...want.off] }; items.forEach(x => x.classList.toggle('on', x.dataset.cam === v)); viewName = v; setMode(v); if (H.includes('pin')) body.classList.add('pinned'); }
    const tq = (H.match(/tier=(\d)/) || [])[1]; if (tq) setTier(+tq);
    const uq = (H.match(/unit=(\d)/) || [])[1]; if (uq) pickUnit(rosterHot[+uq]);
    const hv = (H.match(/hover=([\w:]+)/) || [])[1]; if (hv) { hovered = hv; pinnedHover = true; }
    // Profile: #profile, #acct=google|guest|dev|none, #title=<id>, #skinoff=<n> (that skin taken off), #out (log out tapped once),
    // #sure (delete tapped once), #history, #all (All online), #rounds=<n> (that match's rounds open), #hover=s:<n> (a skin pointed at)
    const ttq = (H.match(/title=(\w*)/) || [])[1]; if (ttq !== undefined && A && (ttq === '' || A.titles.includes(ttq))) A.title = ttq;
    const sq = (H.match(/skinoff=(\d)/) || [])[1]; if (sq && A && A.skins[+sq]) { A.skins[+sq].worn = false; buildTier(tier); }
    if (H.includes('profile') || H.includes('history')) { openProfile(); if (H.includes('#out') || H.includes(',out')) pf.outSure = true; if (H.includes('sure')) pf.sure = true; drawProfile();
      if (H.includes('units')) { profileUnits(true); if (tq) setTier(+tq); if (uq) pickUnit(rosterHot[+uq]); }
      now = { ...want, at: [...want.at], off: [...want.off] }; }
    if (H.includes('history')) { openHistory(); if (H.includes('all')) { histTab = 'all'; drawHistory(); } }
    const rnq = (H.match(/rounds=(\d)/) || [])[1]; if (rnq) body.querySelectorAll('#h-list > li')[+rnq]?.querySelector('.rd')?.click();
    // Welcome: #welcome, #signup, #login, #invited (came from a friend's link), #tag=<name> (typed), #err (a bad username)
    if (H.includes('welcome') || H.includes('signup') || H.includes('login')) {
      const tg = (H.match(/tag=([^,]*)/) || [])[1]; if (tg !== undefined) home.tag = decodeURIComponent(tg);
      home.screen = H.includes('signup') ? 'signup' : H.includes('login') ? 'login' : 'welcome'; dioPaint();
      if (H.includes('invited')) door.invited = true;
      if (H.includes('err')) { door.err = TAG_BAD; drawSignin(); }
      now = { ...want, at: [...want.at], off: [...want.off] }; }
    // dropdowns: #friends, #friends=requests, #friends=chat, #frinvite=<n> (Invite to... open on friend n), #frmore=<n>, #noinvite, #settings
    frBadge();
    if (H.includes('noinvite')) dd.inviteOpen = false;
    const fq = (H.match(/friends(=\w+)?/) || []); if (fq[0]) { if (fq[1] === '=requests') dd.tab = 'requests'; if (fq[1] === '=chat') dd.thread = 0; dd.inviteOpen = dd.inviteOpen && !fq[1];
      const fi = (H.match(/frinvite=(\d)/) || [])[1]; if (fi) dd.inviting = +fi; const fm = (H.match(/frmore=(\d)/) || [])[1]; if (fm) dd.more = +fm; openDrop('friends'); }
    if (H.includes('settings')) openDrop('settings');
    // drawHome: follow the game's home state (which screen, the account)
    function dioPaint() {
      if (!sampleAcct && A !== acct) { A = acct; picked = null; buildTier(tier); }
      drawProfile();
      const s = home.screen;
      if (s === 'welcome' || s === 'signup' || s === 'login') openDoor(s === 'welcome' ? '' : s);
      else if (door.screen != null) closeDoor();
      drawStay();
      // the Play screen follows home.pop (the old popup's flag), on the menu only
      const onMenu = s === 'menu' || !s;
      if (onMenu && home.pop && !body.classList.contains('play')) openPlay();
      else if ((!onMenu || !home.pop) && body.classList.contains('play') && !body.classList.contains('in-rooms')) closePlay();
      drawBackTo();
      if (onMenu) { // what the old drawMenu did quietly on the menu: ranked's switch (and the leaderboard), a fresh account, Discord's answer
        if (!home.asked) rankedCheck();
        if (acct && !home.refreshed) { home.refreshed = true; acctCall('me', {}, true).then(r => { if (r.status === 200) { acctTake(r); if (phase === 'start') drawHome(); } }); }
        if (discordBack && !discordBack.done && acct) discordFinish();
      }
    }
    // a match or tournament to go back to (the old menu's Resume / Back to match / Back to tournament), above PLAY;
    // a newcomer's Puzzles word says where to start (the old "New here? Try the tutorial puzzles")
    function drawBackTo() {
      const { resume, netBack, newcomer } = home.ctx || {}, el = $('dio-backto'), w = [];
      if (tour.role) w.push(`<button class="bt" id="tour-back">Back to tournament <b>${esc(tour.code)}</b></button>`);
      if (resume) w.push(`<button class="bt" id="resume">Resume match <b>${esc(resume.code)}</b></button>`);
      if (netBack) w.push(`<button class="bt" id="net-resume">Back to match <b>${esc(netBack.code)}</b></button>`);
      el.innerHTML = w.join(''); el.hidden = !w.length;
      if ($('resume')) $('resume').addEventListener('click', () => resumeHost(resume));
      if ($('net-resume')) $('net-resume').addEventListener('click', () => netBack.duo ? duoJoin(netBack.code, netBack.key) : srvJoin(netBack.code, { key: netBack.key, side: netBack.side }));
      if ($('tour-back')) $('tour-back').addEventListener('click', () => { tour.menu = false; showStart(); });
      const pz = $('puzzles-open'); pz.classList.toggle('hot', !!newcomer);
      let sm = pz.querySelector('small'); if (newcomer && !sm) { sm = document.createElement('small'); sm.textContent = 'start here'; pz.appendChild(sm); } else if (!newcomer && sm) sm.remove();
    }
    dio.api = { pause, resume, draw: dioPaint };
    dioPaint();
    if (dio.shown) resume();
    window.__dio = { ready: true }; if (TEST) window.__dio.sync = dioSync; // the tests: show / hide the home by hand
  }
