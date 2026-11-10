  // ---------- the Diorama UI (2026-11-07; design/diorama/ is the mockup and the visual reference) ----------
  // On with ?ui=diorama (the <head> switch). The island is a live three.js scene on the home screen; its renderer is
  // freed while a match runs (pause) and made again on the way home (resume). The screens are the mockup's, scoped
  // under #dio (src/diorama.css); sample data is replaced by the game's own screen by screen (INTEGRATION.md).
  // syncHome: the home screen shows (on) or a match / another screen takes over. Idempotent (hud() calls it often).
  function dioSync(on) {
    if (on && dio.api && dio.api.flying && dio.api.flying()) { dio.api.flyStop(); document.documentElement.classList.remove('dfly'); } // back home mid-flight
    if (!on && dio.shown && dio.api && dio.api.fly && dioFlyWanted()) { // the way in: the island flies into the board, then the home hides
      dio.shown = false;
      document.documentElement.classList.add('dfly');
      dio.api.fly({ end: dioBoardPose, ready: board3d.scenery && board3d.scenery.ready,
        shown: () => document.documentElement.classList.remove('dfly'),
        done: () => { if (dio.shown) return; $('dio').hidden = true; dio.api.pause(); } });
      return;
    }
    if (!on && dio.api && dio.api.flying && dio.api.flying()) return; // the island is flying in: it hides when it lands
    $('dio').hidden = !on;
    if (on === dio.shown) return;
    dio.shown = on;
    if (on) {
      dioBoot();
      if (dio.api) { dio.api.resume(); dio.api.music(); } // (the player: the menu's song, not the match's last one)
      if (mpui.open) mpClose(true); // the match's music panel doesn't stay over the Diorama
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
    await Promise.all(['700 200px "Chakra Petch"', '700 56px "Bricolage Grotesque"', '500 40px "Bricolage Grotesque"', '700 40px "Bricolage Grotesque"'].map(f => document.fonts.load(f)));

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
    const saveLook = (i) => { const id = LOOKS[i].id; skinPick = id; /* (the island's look is the match's: owner, 2026-11-08) */ try { localStorage.setItem('pb-skin', skinPick); } catch (e) {} };
    if (!mapPick) mapPick = STD_MAP; // a developer's map pick ('' = random) isn't on the Diorama: the island's map, Standard
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
    const goblins = new THREE.Group(); island.add(goblins); // the swarm: pointed at (and lifted) as one
    for (const [x, z] of [[-2.6, -3.6], [-1.9, -4.0], [-3.2, -4.2], [-2.3, -4.6], [-3.0, -3.3]]) goblins.add(unit('goblin', '#7FA35A', FOE, x, z, s * 0.75, Y + (rnd() - 0.5) * 0.6));
    goblins.userData.y0 = 0; const gobDot = new THREE.Object3D(); gobDot.position.set(-2.6, 0, -4.0); goblins.add(gobDot);
    { // one hit area round the whole swarm (owner: not five small ones); never drawn
      const hb = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 1.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
      hb.position.set(-2.55, 0.45, -3.95); hb.castShadow = hb.receiveShadow = false; goblins.add(hb); }
    const mammoth = unit('mammoth', '#8E7A68', FOE, 3.4, -4.6, s * 0.8, Y - 0.3);
    const skeleton = unit('skeleton', '#E9E3CF', FOE, -5.0, -5.6, s * 0.9, Y + 0.3);
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
    const SPOTS = [4, 2, 1, 3, 5], HEIGHT = { 1: 1.0, 2: 0.78, 3: 0.62, 4: 0.48, 5: 0.38 };
    // the top five of the game's leaderboard (GET /leaderboard: rows of { id, tag, title, w, t, l, score }; home.board),
    // drawn again when it comes in or changes. A spot nobody holds yet is a blank tile, without a unit
    let PLAYERS = {}, podiumKey = '';
    function buildPodium(rows) {
      const key = JSON.stringify((rows || []).slice(0, 5).map(r => [r.id, r.tag, r.score, r.w, r.t, r.l]));
      if (key === podiumKey) return; podiumKey = key;
      for (const c of [...podium.children]) { podium.remove(c); c.traverse(o => { [].concat(o.material || []).forEach(mm => { if (mm.map) mm.map.dispose(); }); }); }
      PLAYERS = {}; (rows || []).slice(0, 5).forEach((r, i) => { PLAYERS[i + 1] = [r.tag, r.score != null ? String(Math.round(r.score)) : '', `${r.w}–${r.t}–${r.l}`]; });
    SPOTS.forEach((n, i) => {
      const P = PLAYERS[n] || ['nobody yet', '', ''];
      const h = HEIGHT[n], x = -4.6 + i * 2.3, first = n === 1, paper = first ? '#F2B23A' : '#F4ECD8', side = first ? '#C98E22' : '#CDBF9F';
      const b = tile(1.9, h, 2.6, (g, w, hh) => { g.fillStyle = paper; g.fillRect(0, 0, w, hh); g.strokeStyle = first ? 'rgba(23,20,15,.35)' : 'rgba(23,20,15,.2)'; g.lineWidth = 6; g.setLineDash([18, 14]); g.strokeRect(22, 22, w - 44, hh - 44);
          g.fillStyle = '#17140F'; g.textAlign = 'center'; g.font = '700 220px "Chakra Petch"'; g.fillText(String(n), w / 2, hh * 0.72);
          fitFont(g, P[0], 700, 60, '"Bricolage Grotesque"', 440); if (!PLAYERS[n]) g.globalAlpha = .45; g.fillText(P[0], w / 2, hh * 0.87); g.globalAlpha = 1; },
        (g, w, hh) => { g.fillStyle = side; g.fillRect(0, 0, w, hh); g.fillStyle = '#17140F'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 40px "Bricolage Grotesque"'; g.fillText((PLAYERS[n] ? `${P[1]} SCORE · ${P[2]}` : ''), w / 2, Math.min(hh / 2, 46)); }, side);
      b.position.set(x, h / 2, 0.3); podium.add(b);
      const [kind, tint] = pick[n - 1], k = kind === 'mammoth' ? 0.4 : kind === 'golem' ? 0.46 : 0.52;
      if (PLAYERS[n]) { const u = unit(kind, tint, first ? '#F2B23A' : '#E9E3CF', x, -0.6, k, Math.PI + (i - 2) * 0.12, podium); u.position.y = h; }
    });
    }
    buildPodium(home.board && home.board.rows);
    podium.position.y = -4; podium.visible = false;

    // ── the player: skins, titles and sample accounts. A skin you wear shows on that unit in the Units roster ──
    // the game's skins (Shapes.SKINS: unit, name, text, model, limited) and titles (TITLES, TITLE_WHY) as the screens use them
    const SKIN = Shapes.SKINS;
    const DTITLES = Object.fromEntries(Object.entries(TITLES).map(([k, t]) => { const why = (TITLE_WHY[k] || '').replace(/^[^:]*:\s*/, ''); return [k, [t.name, t.col, why.charAt(0).toUpperCase() + why.slice(1)]]; }));
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
    const tierOf = (u) => Game.tierOf(ROSTER.units, ROSTER.units.indexOf(u)); // the game's rule (tiers by cost)
    // the tier tabs: one per tier the roster has (a Counter Lab set can have more or fewer than 4)
    function drawTierTabs() {
      const n = Math.max(1, ...ROSTER.units.map(tierOf)), nav = body.querySelector('.tiers'), have = nav.querySelectorAll('[data-t]').length;
      if (have === n) return;
      nav.querySelectorAll('[data-t]').forEach(x => x.remove());
      for (let t = 1; t <= n; t++) { const bt = document.createElement('button'); bt.dataset.t = t; bt.textContent = 'Tier ' + t; bt.setAttribute('aria-pressed', String(t === tier)); bt.addEventListener('click', () => setTier(t)); nav.appendChild(bt); }
    }
    const roster = new THREE.Group(); island.add(roster); roster.position.y = -4; roster.visible = false;
    let tier = 1, rosterHot = [];
    function buildTier(t, pop = -1) {
      for (const c of [...roster.children]) roster.remove(c);
      rosterHot = [];
      const list = ROSTER.units.filter(u => tierOf(u) === t), n = list.length, gap = Math.min(1.95, 13.4 / n);
      list.forEach((u, i) => {
        const x = (i - (n - 1) / 2) * gap, g = new THREE.Group(); g.position.set(x, 0, -0.5); roster.add(g);
        const b = tile(gap - 0.14, 0.16, 2.3, (c, w, hh) => { c.fillStyle = '#F4ECD8'; c.fillRect(0, 0, w, hh); c.strokeStyle = 'rgba(23,20,15,.2)'; c.lineWidth = 6; c.setLineDash([18, 14]); c.strokeRect(20, 20, w - 40, hh - 40);
            c.fillStyle = '#17140F'; c.textAlign = 'center'; fitFont(c, u.name, 700, 64, '"Bricolage Grotesque"', w - 70); c.fillText(u.name, w / 2, hh * 0.85); }, null, '#CDBF9F'); // (the name only, no price: owner, 2026-11-10)
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
      units:   { az: 0.2, el: 0.72, zoom: 7.9, at: [0.3, 0.3, -0.4], off: [0.19, 0.04] }, // close on the roster (owner, 2026-11-08: it couldn't be read)
      ranks:   { az: 0.42, el: 0.6, zoom: 10.2, at: [0, 0.2, 0.2], off: [0.2, 0.02] },
      orders:  { az: 0.0, el: 1.25, zoom: 13.6, at: [0, 0, 0.4], off: [0.24, 0] },
      welcome: { az: 0.98, el: 0.4, zoom: 12.8, at: [0, -0.6, 0], off: [0.19, 0.0] },
      signin:  { az: 0.98, el: 0.4, zoom: 13.6, at: [0, -0.6, 0], off: [0.27, 0.02] },
      history: { az: 0.62, el: 0.6, zoom: 13.2, at: [0, 0.2, 0.4], off: [0.29, -0.03] },
    };
    const phone = () => innerWidth <= 700;
    // the Play side (Play, Rooms, New room) sees the island from above (VIEWS.orders) or at the menu's angle (VIEWS.play):
    // a click on the island switches (owner, 2026-11-10: from above is the default). Remembered on this device
    let playTilt = false; try { playTilt = localStorage.getItem('pb-dio-tilt') === '1'; } catch (er) {}
    const playView = () => playTilt ? VIEWS.play : VIEWS.orders;
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
    let szW = 0, szH = 0; // the canvas's size when last fitted (phones change its height per screen: --isle in diorama.css)
    function size() { const w = cv.clientWidth, h = cv.clientHeight; szW = w; szH = h; if (renderer) renderer.setSize(w, h, false); place(); }
    addEventListener('resize', () => { if (dio.shown) { size(); if (flat) paintFlat(); } });

    // ── notes follow their thing: [object, height of the dot, label offset in px (negative x: label to the left)] ──
    const anchors = {
      golem: [golem, 1.35, [-190, -170]], golemW: [golem, 1.35, [-200, -80]], sniper: [sniper, 1.0, [170, 120]], mage: [mage, 1.05, [-300, 40]],
      keepYou: [keepYou, 2.3, [-260, -40]], keepFoe: [keepFoe, 2.4, [-200, -120]], vaultYou: [vaultYou, 0.7, [-230, 70]], vaultFoe: [vaultFoe, 0.7, [180, -110]], mammoth: [mammoth, 1.3, [200, -120]],
      skeleton: [skeleton, 1.1, [80, -110]], ent: [ent, 0.6, [190, 60]], goblins: [gobDot, 0.9, [-200, -90]],
    };
    // the battlefield note's dot: the island's right corner in the menu's view, the middle of its near edge in the plan view
    const bfMenu = new THREE.Object3D(); bfMenu.position.set(7, 0, -9); island.add(bfMenu);
    const bfPlan = new THREE.Object3D(); bfPlan.position.set(0, 0, 9); island.add(bfPlan);
    // the battlefield note stays in one place (bottom right); its line runs up to the nearest corner or edge of the island
    let bfPick = null, bfFor = null, bfKey = ''; // the battlefield line's point on the island, and the view it was picked for
    const bfDots = [[7, -9], [7, 9], [-7, 9], [-7, -9], [7, 0], [0, 9], [-7, 0], [0, -9]].map(([x, z]) => { const o = new THREE.Object3D(); o.position.set(x, 0, z); island.add(o); return o; });
    let viewName = 'play', hovered = null, pinnedHover = false, picked = null;
    const svg = document.getElementById('lines');
    const lbBtn = document.getElementById('lb-open'); body.appendChild(lbBtn); lbBtn.classList.add('lb-rank'); // (out of the standings: it hangs under the Rankings note)
    const proj = (o, h) => { const v = new THREE.Vector3(); o.getWorldPosition(v); v.y += h; v.project(cam); return [(v.x + 1) / 2 * cv.clientWidth, (1 - v.y) / 2 * cv.clientHeight]; };
    const dotSvg = (x, y) => `<circle cx="${x}" cy="${y}" r="4.5" fill="currentColor"/><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/>`;
    // (each tower and treasury shows only its own note: owner, 2026-11-08)
    const showing = (el, hovered) => body.classList.contains('welcome') ? el.hasAttribute('data-welcome') && door.invited && !body.classList.contains('in-signin') : el.hasAttribute('data-welcome') ? false : viewName !== 'play' ? el.dataset.btn === viewName : hovered ? el.dataset.hover === hovered : el.hasAttribute('data-home');
    // a label off the point (x, y): a line out to it and under it, kept on screen. Returns the line's svg
    let placed = []; // the island notes' boxes laid out so far this frame (notes() empties it)
    let pinFading = false, pinOverFading = false; // the note being laid out is fading; it may sit over fading boxes
    function pin(el, x, y, dx, dy, keep) {
      const w = el.offsetWidth, h = el.offsetHeight, k = phone() ? 0.55 : 1;
      let lx, ly, left;
      if (el._off) { [lx, ly, left] = [x + el._off[0], y + el._off[1], el._off[2]]; } // an island note keeps its spot while it's up (no jumps)
      else {
        if (keep) {} else if (dx > 0 && x + dx * k + w > innerWidth - 24) dx = -dx; if (dx < 0 && x + dx * k - w < 24) dx = -dx;
        lx = x + dx * k; left = dx < 0; const L = left ? lx - w : lx;
        ly = Math.min(Math.max(y + dy * k, h + 76), innerHeight - 12); // the box stays on screen, under the header
        for (let n = 0; n < 8; n++) { const hit = placed.find(r => !(pinOverFading && r.f) && L < r.r + 10 && L + w > r.l - 10 && ly - h < r.b + 6 && ly > r.t - 6); if (!hit) break; ly = hit.b + 8 + h; } // and below a box it would cover
        if (el.hasAttribute('data-hover')) el._off = [lx - x, ly - y, left];
      }
      const L = left ? lx - w : lx;
      placed.push({ l: L, r: L + w, t: ly - h, b: ly, f: pinFading });
      el.style.left = L + 'px'; el.style.top = ly + 'px'; el.style.textAlign = left ? 'right' : 'left';
      return `<path d="M${x} ${y} L${lx} ${ly} L${left ? lx - w : lx + w} ${ly}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`;
    }
    addEventListener('resize', () => body.querySelectorAll('.note').forEach(n => { n._off = null; }));
    function notes() {
      let html = ''; placed = [];
      const playR = document.getElementById('play').getBoundingClientRect(), inProf = body.classList.contains('profile');
      // Profile: where the left column's words end (right and bottom); the island's notes and the Units view keep clear of it
      let colR = 24, colB = 0, nameR = 24, kR = 0, kB = 0;
      if (inProf) for (const el of body.querySelectorAll('#pf-name, #pf-namenote, .pf .k, .pf-opts > *, #pf-hist, #pf-back')) {
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
      let lbOn = false;
      const rank = (n) => n.hasAttribute('data-home') ? 2 : n._off ? 1 : 0;
      for (const el of [...body.querySelectorAll('.note:not(.pnote)')].sort((p, q) => rank(q) - rank(p))) { // the menu's own notes first, then those already up, then new ones
        const bf = el.dataset.anchor === 'bf', inPlay = body.classList.contains('play');
        if (bf) { // fixed in place (CSS): the same spot on every screen, with a line up to the island
          const on = !body.classList.contains('welcome') && $('dio-stay').hidden; el.style.display = on ? '' : 'none';
          if (on && !phone() && !body.classList.contains('music-open') && !body.classList.contains('sheet-over-bf')) {
            const r = el.getBoundingClientRect(), ty = r.top - 4;
            // the point is picked where the camera is heading and kept while it moves, so the line glides with the island
            // instead of hopping between corners mid-move (owner, 2026-11-10)
            const key = innerWidth + 'x' + innerHeight + (menuR ? ' ' + [menuR.left, menuR.top, menuR.right, menuR.bottom].map(Math.round).join() : '');
            if (bfFor !== want || bfKey !== key) {
              bfFor = want; bfKey = key; bfPick = null; let bd = 1e9; const keep = now;
              now = { ...want, at: [...want.at], off: [...want.off] }; place(); cam.updateMatrixWorld();
              for (const o of bfDots) { const [x, y] = proj(o, 0), d = Math.hypot(x - r.right, y - ty);
                if (x > 24 && x < innerWidth - 24 && y > 24 && y < ty - 40 && d < bd && !(menuR && crosses(`M${x} ${y} L${r.right} ${ty}`, menuR))) { bd = d; bfPick = o; } } // (never across the menu's words)
              now = keep; place(); cam.updateMatrixWorld();
            }
            const best = bfPick && proj(bfPick, 0);
            if (best && best[1] < ty - 8 && !under(r)) { const [x, y] = best, right = x > (r.left + r.right) / 2;
              html += `<path d="M${x} ${y} L${right ? r.right : r.left} ${ty} L${right ? r.left : r.right} ${ty}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`; }
          }
          continue;
        }
        let show = !phone() && (bf ? $('dio-stay').hidden && !body.classList.contains('welcome') && (inPlay || (inProf ? !body.classList.contains('in-history') && !body.classList.contains('units') : viewName === 'play' && !hovered)) : showing(el, hovered) && !inPlay && !inProf && !(body.classList.contains('music-open') && el.dataset.anchor === 'sniper'));
        // every island note on the menu fades out over a second once it isn't wanted (owner, 2026-11-08: a quick sweep
        // over the island leaves each note readable for a second); a pointed-at piece's note shows at once, the menu's
        // own notes (the golem's, the skeleton's) come back in a quarter of a second
        let op = 1, fading = false;
        if (el.dataset.anchor !== 'btn') {
          const home = el.hasAttribute('data-home'), t = performance.now(), dt = Math.min(100, t - (el._t || t)); el._t = t;
          const menu = !phone() && !inPlay && !inProf && viewName === 'play' && !body.classList.contains('welcome');
          if (!menu) el._op = show ? 1 : home ? 1 : 0;
          else if (show && !(home && (el._op ?? 1) < 1 && t - hoverOff < 1000)) el._op = home ? Math.min(1, (el._op ?? 1) + dt / 250) : 1; // the menu's own notes wait a second after the pointer leaves before coming back
          else { show = false; el._op = Math.max(0, (el._op ?? (home ? 1 : 0)) - dt / 1000); fading = el._op > 0; }
          op = el._op; show = show || fading;
        }
        el.style.display = show ? '' : 'none'; el.style.opacity = op < 1 ? op : ''; el.style.pointerEvents = fading ? 'none' : ''; if (!show) { el._off = null; continue; }
        const w = el.offsetWidth, h = el.offsetHeight;
        if (el.dataset.anchor === 'btn') {
          // a menu word's note: the dot on the word; the label finds open space. Left-hand words run a rail up the left
          // margin to a label above PLAY; right-hand words run out to the right of PLAY.
          const r = body.querySelector(`.menu .item[data-cam="${el.dataset.btn}"]`).getBoundingClientRect(), y = r.top + r.height * 0.55;
          if (el.dataset.side === 'left') {
            const bt = $('dio-backto'), btR = bt && bt.offsetHeight ? bt.getBoundingClientRect() : null; // above Back to match too, when it's there
            const x = r.left - 20, ly = (btR ? Math.min(playR.top, btR.top) : playR.top) - 34, lx = x + 18;
            el.style.left = lx + 'px'; el.style.top = ly + 'px'; el.style.textAlign = 'left';
            html += `<path d="M${x} ${y} L${x} ${ly} L${lx + w} ${ly}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`;
          } else {
            const x = r.right + 6, rail = Math.max(playR.right, ...[...body.querySelectorAll('.menu .item[data-cam="rules"], .menu .item[data-cam="ranks"]')].map(i => i.getBoundingClientRect().right)) + 28, ly = playR.top + 36 + (el.dataset.btn === 'ranks' ? 70 : 0), lx = rail + 16;
            el.style.left = lx + 'px'; el.style.top = ly + 'px'; el.style.textAlign = 'left';
            if (el.dataset.btn === 'ranks') { lbOn = true; lbBtn.style.left = lx + 'px'; lbBtn.style.top = (ly + 10) + 'px'; } // Full leaderboard, under the note's line
            html += `<path d="M${x} ${y} L${rail} ${y} L${rail} ${ly} L${lx + w} ${ly}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`;
          }
          continue;
        }
        const [o, hh, [dx, dy]] = bf ? (inPlay && !playTilt ? [bfPlan, 0, [-40, 118]] : [bfMenu, 0, [-40, -130]]) : anchors[el.dataset.anchor], [x, y] = proj(o, hh);
        let ddy = dy; if (el.dataset.anchor === 'golemW') { const lb = body.querySelector('.logo').getBoundingClientRect().bottom; ddy = Math.max(dy, lb + 16 + el.offsetHeight - y); } // clear of the big logo
        let sdx = dx; if (el.dataset.anchor === 'skeleton') { // the hint: up and to the right, in the sky over the far towers; else up and left, above the golem's note
          const gn = body.querySelector('.rw-note:not(.pnote)'), gr = gn && gn.style.display !== 'none' ? gn.getBoundingClientRect() : null, lg = body.querySelector('.logo').getBoundingClientRect();
          let ly = Math.max(y - 110, lg.bottom + 20 + h); sdx = Math.min(80, innerWidth - 32 - w - x);
          if (sdx < 4) { sdx = -120; ly = Math.max(gr ? Math.min(y - 110, gr.top - 14) : y - 110, h + 12); }
          ddy = ly - y; }
        // a pointed-at piece's note tries other spots before giving up (on a small window the first can land on PLAY)
        const tries = el.hasAttribute('data-hover') ? [[sdx, ddy], [-sdx, ddy], [sdx, -150], [-sdx, -150], [sdx, 150], [-sdx, 150]] : [[sdx, ddy]];
        let ln = '';
        pinFading = fading; if (el._off) { const l = pin(el, x, y, sdx, ddy); if (clear(el, x, y) && offMenu(el, l)) ln = l; else { placed.pop(); el._off = null; } }
        pinFading = fading;
        for (const over of fading ? [false] : [false, true]) { // the pointed-at note always shows: over the fading boxes if it must
          pinOverFading = over; if (ln) break;
          for (const [tx, ty] of tries) { const l = pin(el, x, y, tx, ty, el.dataset.anchor === 'skeleton'); if (clear(el, x, y) && offMenu(el, l)) { ln = l; break; } placed.pop(); el._off = null; } }
        pinOverFading = false;
        if (ln) html += op < 1 ? `<g opacity="${op.toFixed(3)}">${ln}</g>` : ln; else { el.style.display = 'none'; el._off = null; }
      }
      lbBtn.style.display = lbOn ? '' : 'none';
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
        { const br = body.querySelector('.bf-note').getBoundingClientRect(); body.classList.toggle('sheet-over-bf', sx < br.right && sx + w > br.left && sy + h > br.top - 8); } // Change battlefield steps aside too
        sh.style.left = sx + 'px'; sh.style.top = sy + 'px';
        const ex = Math.min(Math.max(x, sx + 30), sx + w - 30), ey = sy;
        html += `<path d="M${x} ${y} L${ex} ${ey}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`;
      } else { sh.hidden = true; body.classList.remove('sheet-over-music', 'sheet-over-bf'); }
      // a unit pointed at in the roster
      const hn = document.getElementById('unote');
      if (hovered && hovered.startsWith('u:') && body.classList.contains('units') && (!picked || picked.userData.i !== +hovered.slice(2))) {
        const g = rosterHot[+hovered.slice(2)], [x, y] = proj(g, 1.5), w = hn.offsetWidth;
        const ns = skinsOf(g.userData.u.name).filter(k => k.own).length;
        hn.style.display = ''; hn.innerHTML = `${g.userData.u.name}.<small>Tier ${g.userData.t}${ns ? ` · ${ns} skin${ns > 1 ? 's' : ''}` : ''} · click for its sheet</small>`;
        const hy = y + 210; hn.style.left = (x + 16) + 'px'; hn.style.top = hy + 'px';
        html += `<path d="M${x} ${y} L${x + 16} ${hy} L${x + 16 + w} ${hy}" fill="none" stroke="currentColor" stroke-width="1.5"/>${dotSvg(x, y)}`;
      } else hn.style.display = 'none';
      svg.innerHTML = `<g style="color:var(--cream)">${html}</g>`;
      const [zx, zy] = proj(ent, 1.1); const zz = document.getElementById('zz'); zz.style.left = zx + 'px'; zz.style.top = zy + 'px';
    }

    // ── pointing: pieces on the menu, units in the roster ──
    const HOT = { keepYou, keepFoe, vaultYou, vaultFoe, mammoth, mage, sniper, ent, goblins };
    // the unit models on the island: a click on one (not on its note) opens Units, as the menu's word does
    const UNIT_MODELS = [mage, sniper, ent, golem, champ, mammoth, goblins, skeleton];
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    const hitOf = (e, groups) => { ptr.set(e.clientX / cv.clientWidth * 2 - 1, -(e.clientY / cv.clientHeight) * 2 + 1); ray.setFromCamera(ptr, cam);
      const hit = ray.intersectObjects(groups, true)[0]; if (!hit) return -1; return groups.findIndex(g => { let o = hit.object; while (o && o !== g) o = o.parent; return !!o; }); };
    addEventListener('pointermove', (e) => {
      if (!dio.shown) return;
      if (pinnedHover) return;
      if (e.target.closest && e.target.closest('#dio .note[data-hover]')) return; // over the pointed-at piece's note: keep it
      let key = null, unitHot = false;
      if (e.target === cv && !body.classList.contains('play')) {
        if (body.classList.contains('units')) { const i = hitOf(e, rosterHot); if (i >= 0) key = 'u:' + i; }
        else if (viewName === 'play' && !body.classList.contains('profile')) { const keys = Object.keys(HOT), i = hitOf(e, Object.values(HOT)); if (i >= 0) key = keys[i]; else if (!body.classList.contains('welcome') && hitOf(e, UNIT_MODELS) >= 0) unitHot = true; }
      }
      if (e.target === cv && body.classList.contains('play') && !body.classList.contains('profile') && hitOf(e, [island]) >= 0) unitHot = true; // Play: the island switches its view
      setHover(key); cv.classList.toggle('world-hot', !!key || unitHot);
    });
    body.addEventListener('click', (e) => { // Play: a click on the island switches between from above and the menu's angle
      if (e.target !== cv || !body.classList.contains('play') || body.classList.contains('profile') || hitOf(e, [island]) < 0) return;
      playTilt = !playTilt; try { localStorage.setItem('pb-dio-tilt', playTilt ? '1' : '0'); } catch (er) {}
      want = playView(); notes();
    });
    // what's pointed at shows its note at once (owner, 2026-11-08: no delay); notes no longer wanted fade out over a
    // second (in notes()), so a sweep over the island doesn't flicker
    let hoverNow = null, hoverOff = -1e9; // hoverOff: when the pointer last left a piece
    function setHover(key) {
      if (key === hoverNow) return; if (!key && hoverNow) hoverOff = performance.now(); hoverNow = hovered = key;
      if (!key || !key.startsWith('u:')) notes();
    }
    body.addEventListener('click', (e) => { // the main menu: a unit model opens Units (its note doesn't: notes are their own elements)
      if (e.target !== cv || viewName !== 'play' || ['play', 'profile', 'welcome', 'units', 'ranks', 'pinned'].some(c => body.classList.contains(c))) return;
      if (hitOf(e, UNIT_MODELS) < 0) return;
      items.forEach(x => x.classList.toggle('on', x.dataset.cam === 'units')); viewName = 'units'; want = VIEWS.units; setMode('units'); body.classList.add('pinned'); setHover(null); cv.classList.remove('world-hot');
    });
    body.addEventListener('click', (e) => { if (e.target !== cv || !body.classList.contains('units')) return; const i = hitOf(e, rosterHot); pickUnit(i >= 0 ? rosterHot[i] : null); });
    function pickUnit(g) {
      picked = g; const sh = document.getElementById('usheet');
      if (!g) return;
      const u = g.userData.u, dps = Math.round(u.hit * u.aps * (u.bodies || 1)), sk = (u.skills || []).map(id => ROSTER.skills[id] || id);
      sh.querySelector('.tag').textContent = `Tier ${g.userData.t}`;
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
    // wear a skin (or none) on a unit: one per unit, on the server (acctCall 'skin', as the old Profile's On / Off), so
    // opponents see it online. The roster swaps the model and the island stays as it is
    async function wear(name, id) {
      if (!A || sampleAcct) return;
      const now = wornOf(name), r = id ? await acctCall('skin', { skin: id, worn: true }, true) : now ? await acctCall('skin', { skin: now.id, worn: false }, true) : { status: 200 };
      const sk = body.querySelector('#usheet .skn p');
      if (r.status !== 200) { if (sk) sk.textContent = r.error === 'not your skin' ? 'That skin isn’t yours.' : acctFail(r); return; }
      acctTake(r); A = acct; render();
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
      if (fly) { flyFrame(); raf = requestAnimationFrame(frame); return; }
      const t = still ? 1.3 : clock.getElapsedTime(), k = still ? 1 : 0.08, kk = still ? 1 : 0.12;
      now.az = lerp(now.az, want.az, k); now.el = lerp(now.el, want.el, k); now.zoom = lerp(now.zoom, want.zoom, k);
      for (let i = 0; i < 3; i++) now.at[i] = lerp(now.at[i], want.at[i], k);
      for (let i = 0; i < 2; i++) now.off[i] = lerp(now.off[i], want.off[i], k);
      // a battlefield change: the island dips and the new miniatures pop up one after another
      const sw = performance.now() / 1000 - changedAt, dip = sw < 0.6 ? Math.sin(sw / 0.6 * Math.PI) * 0.3 : 0;
      for (const o of kitGrow) if (o.userData.t0 >= 0) { const p = Math.min(1, Math.max(0, (sw - 0.12 - o.userData.t0) / 0.32)), e = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
        o.scale.setScalar(Math.max(0.001, o.userData.s * (p >= 1 ? 1 : e))); if (p >= 1) o.userData.t0 = -1; }
      island.position.y = Math.sin(t * 0.8) * 0.12 - dip; island.rotation.y = Math.sin(t * 0.25) * 0.03;
      mage.rotation.y = 0.3 + Math.sin(t * 0.9) * 0.15; mage.userData.y0 = Math.abs(Math.sin(t * 2.2)) * 0.06; // (its hop; the lift on pointing adds to it)
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
      for (const [key, g] of Object.entries(HOT)) g.position.y = lerp(g.position.y, g.userData.y0 + ((typeof hoverNow !== 'undefined' ? hoverNow : hovered) === key ? 0.18 : 0), still ? 1 : 0.25);
      rosterHot.forEach((g, i) => { g.position.y = lerp(g.position.y, (hovered === 'u:' + i || picked === g) ? 0.22 : 0, still ? 1 : 0.25); });
      if (cv.clientWidth !== szW || cv.clientHeight !== szH) size(); else place();
      if (renderer) renderer.render(scene, cam); notes();
      raf = requestAnimationFrame(frame);
    }
    // ── the way in (the battle prototype's fly-in, 2026-11-08; the owner's wish): Create room, Join and Vs computer zoom
    // in on the island, move it over and fade it into the real board under it. The island and the board are the same
    // map at two scales (a tile is 1 here, Game.TILE metres on the board, both centred), so the flight ends on the board
    // camera's exact pose (its position / TILE, the same angle, lens and view offset: end() from the page). It starts
    // from this screen's view (the orthographic camera taken as a 5° lens far away, which looks the same). On the way
    // the words go, the miniatures sink (the keeps last, where the board has its towers), the soil drops away, the
    // field opens from the board's middle outward onto the battlefield's scenery, and the island fades into the board.
    const flyCam = new THREE.PerspectiveCamera(5, 1, 0.05, 4000), FLY_MS = 1900;
    let fly = null;
    const clamp01 = (x) => Math.max(0, Math.min(1, x)), ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    function flyPose(P) {
      const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight, d = P.h / Math.tan(P.fov * Math.PI / 360);
      flyCam.fov = P.fov; flyCam.aspect = w / h; flyCam.near = Math.max(0.05, d * 0.02); flyCam.far = d * 6 + 100;
      flyCam.position.set(P.at[0] + d * Math.cos(P.el) * Math.sin(P.az), P.at[1] + d * Math.sin(P.el), P.at[2] + d * Math.cos(P.el) * Math.cos(P.az));
      flyCam.up.set(0, 1, 0); flyCam.lookAt(P.at[0], P.at[1], P.at[2]);
      flyCam.setViewOffset(w, h, P.ox * w, P.oy * h, w / P.k, h / P.k);
    }
    function flyMix(A, B, e) {
      const L = (a, b) => a + (b - a) * e; let daz = B.az - A.az; daz = Math.atan2(Math.sin(daz), Math.cos(daz));
      return { at: A.at.map((v, i) => L(v, B.at[i])), az: A.az + daz * e, el: L(A.el, B.el), h: Math.exp(L(Math.log(A.h), Math.log(B.h))), fov: L(A.fov, B.fov), ox: L(A.ox, B.ox), oy: L(A.oy, B.oy), k: L(A.k, B.k) };
    }
    // o: { end() -> the board's pose or null (not framed yet), ready: a promise (the board's scenery), shown() (the
    // match's words may come in), done() (the island's part is over: hide the home) }
    function flyStart(o) {
      if (fly || flat || !renderer) { o.shown(); o.done(); return; }
      const z = phone() ? now.zoom * 0.86 : now.zoom;
      fly = { ...o, t0: 0, ready: false, wait: performance.now() + (window.__flyWait || 4000), shownYet: false, keepsSet: false,
        start: { at: [...now.at], az: now.az, el: now.el, h: z, fov: 5, ox: -(phone() ? 0 : now.off[0]), oy: phone() ? 0.02 : now.off[1], k: 1 },
        save: { pieces: pieces.children.map(c => [c, c.scale.x]), low: [...soil, root].map(c => [c, c.position.y]), keeps: [[keepYou, keepYou.position.clone()], [keepFoe, keepFoe.position.clone()]], iy: island.position.y, ir: island.rotation.y } };
      Promise.resolve(o.ready).catch(() => {}).then(() => { if (fly) fly.ready = true; });
      body.classList.add('flying');
      if (!running) resume();
    }
    function flyEnd(skip) {
      const F = fly; if (!F) return;
      fly = null;
      for (const [c, s0] of F.save.pieces) c.scale.setScalar(s0);
      for (const [c, y0] of F.save.low) c.position.y = y0;
      for (const [c, p0] of F.save.keeps) c.position.copy(p0);
      cv.style.opacity = ''; const fl = body.querySelector('.field'); fl.style.webkitMaskImage = fl.style.maskImage = '';
      body.classList.remove('flying');
      if (!skip) { if (!F.shownYet) F.shown(); F.done(); }
    }
    function flyFrame() {
      const F = fly, T = performance.now(), E = F.end();
      if (!F.t0) { // the press waits (up to 4 s) for the board underneath: framed, and its scenery loaded
        if ((!E || !F.ready) && T < F.wait) { flyPose(F.start); renderer.render(scene, flyCam); return; }
        if (!E) { flyEnd(); return; }
        F.t0 = T;
      }
      if (!F.keepsSet && E.keeps) { F.keepsSet = true; E.keeps.forEach(([o, x, z]) => (o ? keepYou : keepFoe).position.set(x, keepYou.position.y, z)); }
      const t = window.__flyT != null ? window.__flyT : clamp01((T - F.t0) / FLY_MS); // (__flyT: checks pin a moment)
      island.position.y = F.save.iy * (1 - clamp01(t / 0.3)); island.rotation.y = F.save.ir * (1 - clamp01(t / 0.3)); // (the bob settles: the board doesn't float)
      flyPose(flyMix(F.start, E, ease(clamp01(t / 0.92))));
      const sink = ease(clamp01((t - 0.4) / 0.35)), ksink = ease(clamp01((t - 0.55) / 0.25));
      for (const [c, s0] of F.save.pieces) c.scale.setScalar(Math.max(0.0001, s0 * (1 - (c === keepYou || c === keepFoe ? ksink : sink))));
      for (const [c, y0] of F.save.low) c.position.y = y0 - sink * 6;
      const f = ease(clamp01((t - 0.5) / 0.4)), far = Math.hypot(innerWidth, innerHeight), fl = body.querySelector('.field');
      fl.style.webkitMaskImage = fl.style.maskImage = f > 0 ? `radial-gradient(circle at ${E.cx}px ${E.cy}px, transparent ${f * far}px, #000 ${f * far + 220}px)` : '';
      cv.style.opacity = String(1 - ease(clamp01((t - 0.72) / 0.28)));
      if (t >= 0.78 && !F.shownYet) { F.shownYet = true; F.shown(); }
      renderer.render(scene, flyCam);
      if (t >= 1) flyEnd();
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
    // (the menu hides under the pointer when Play or Profile opens: that leave keeps their view; owner's bug, 2026-11-10)
    body.querySelector('.menu').addEventListener('mouseleave', () => { if (body.classList.contains('pinned') || body.classList.contains('play') || body.classList.contains('profile')) return; items.forEach(x => x.classList.toggle('on', x.id === 'play')); want = VIEWS.play; viewName = 'play'; setMode('play'); });
    for (const v of Object.keys(MODES)) body.querySelector(`.menu .item[data-cam="${v}"]`).addEventListener('click', () => { if (body.classList.contains('pinned') && viewName === v) return unpin(); items.forEach(x => x.classList.toggle('on', x.dataset.cam === v)); viewName = v; want = VIEWS[v]; setMode(v); body.classList.add('pinned'); });
    // Puzzles and How to play open the game's sheets (until they're designed); the camera move on pointing stays
    $('puzzles-open').addEventListener('click', openPuzzles);
    $('how').addEventListener('click', openHowTo);
    // the golem's note: the invite link lives in the game's Rewards sheet (owner, 2026-11-07: open it while Rewards is on hold)
    { const rn = body.querySelector('.rw-note'); rn.addEventListener('click', () => openRewardsSheet()); rn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRewardsSheet(); } }); }
    const unpin = () => { body.classList.remove('pinned'); setMode('play'); picked = null; items.forEach(x => x.classList.toggle('on', x.id === 'play')); viewName = 'play'; want = VIEWS.play; };
    // the Play screen is the old PLAY popup: home.pop says it's open (it stays open across a match, and ?test opens it at once)
    const openPlay = () => { if (typeof openDrop === 'function') openDrop(''); if (body.classList.contains('profile')) closeProfile(); unpin(); body.classList.add('play'); body.classList.remove('music-open'); want = playView(); home.pop = true; };
    const closePlay = () => { body.classList.remove('play', 'mp-open'); setMp(false); unpin(); home.pop = false; };
    document.getElementById('play').addEventListener('click', openPlay);
    document.getElementById('play-back').addEventListener('click', () => { leavePlay(); unpin(); }); // Play's Back: the menu (owner, 2026-11-10)
    const backBtn = body.querySelector('.back');
    // the logo: the main menu from anywhere (not from the welcome screens). Nothing else needs a back link
    function goMenu() {
      if (body.classList.contains('welcome')) return;
      openDrop(''); closeMusic();
      if (body.classList.contains('profile')) closeProfile();
      leavePlay(); unpin();
    }
    // off the Play side (Play, Rooms, New room) to the plain menu: the logo and Profile, which opens over the menu only
    function leavePlay() {
      if (body.classList.contains('in-create')) closeCreate(); // (puts your own battlefield back)
      if (home.screen === 'lobby' || home.pop || body.classList.contains('play')) { home.screen = 'menu'; home.pop = false; drawHome(); closePlay(); }
    }
    { const lg = body.querySelector('.logo'); lg.addEventListener('click', goMenu); lg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goMenu(); } }); }
    body.addEventListener('click', (e) => { const c = e.target.closest('[data-crumb]'); if (!c) return; const w = c.dataset.crumb;
      if (w === 'play') { home.screen = 'menu'; home.pop = true; drawHome(); }
      else if (w === 'rooms') closeCreate();
      else if (w === 'profile') closeHistory();
      else if (w === 'welcome') goScreen('welcome'); });
    const goBack = () => { if (body.classList.contains('welcome')) return body.classList.contains('in-signin') ? goScreen('welcome') : undefined; if (body.classList.contains('in-history')) return closeHistory(); if (body.classList.contains('profile')) return body.classList.contains('units') ? profileUnits(false) : closeProfile();
      if (body.classList.contains('in-rooms')) return closeRooms(); closePlay(); };
    backBtn.addEventListener('click', goBack);

    // Play: Vs computer starts at once; Multiplayer folds out its kinds, and a kind opens Rooms filtered to it
    const multi = document.getElementById('multi');
    const setMp = (on) => { body.classList.toggle('mp-open', on); multi.setAttribute('aria-expanded', on); };
    multi.addEventListener('click', () => setMp(!body.classList.contains('mp-open')));
    // Vs computer: straight into a match against the AI (the old popup's #go), a normal Standard match
    $('go').addEventListener('click', () => { home.mode = 'normal'; matchKind = 'standard'; lateGame = false; startAiMatch(); });
    // ── Multiplayer: a kind opens Rooms (the game's lobby, home.screen 'lobby'), filtered to it. Ranked shows the game's
    // reasons when it can't be played; 2v2 is for developers (and when the lobby says this phone may, lob.dev) ──
    const duoOk = () => !!(lob.dev || devMode());
    function drawKinds() {
      const rk = body.querySelector('.orders .mp [data-q="ranked"]'), d2 = body.querySelector('.orders .mp [data-q="2v2"]');
      const rkWhy = !rankedAllowed() ? (home.rankedOn === false ? 'switched off right now' : 'needs the game server') : !rankedReady() ? 'needs a Google login' : 'BO3';
      rk.querySelector('small').textContent = rkWhy; rk.disabled = !rankedAllowed(); rk.toggleAttribute('aria-disabled', rk.disabled);
      d2.disabled = !duoOk(); d2.toggleAttribute('aria-disabled', d2.disabled);
      d2.querySelector('small').innerHTML = duoOk() ? '<i class="dvt">Dev</i>with new buildings and units' : `${lockSvg}coming soon`;
      body.querySelectorAll('#r-menu [data-q], .newroom [data-kind]').forEach(x => { const q = x.dataset.q || x.dataset.kind; x.disabled = q === '2v2' ? !duoOk() : q === 'ranked' ? !rankedAllowed() : false; });
      const k2 = body.querySelector('.newroom [data-kind="2v2"]'); if (duoOk()) k2.textContent = '2v2';
      const m2 = body.querySelector('#r-menu [data-q="2v2"]'); if (duoOk()) m2.textContent = '2v2';
      body.classList.toggle('dev', devMode());
    }
    body.querySelectorAll('.orders .mp .item').forEach(b => b.addEventListener('click', () => { if (!b.disabled) openRooms(b.dataset.q); }));

    // ── Developer (devMode): the old PLAY popup's developer block, as rows of small words (designed 2026-11-07) ──
    { const seg = body.querySelector('.devs [aria-label="Exploit bot"]');
      seg.innerHTML = [{ id: '', short: 'Off' }].concat(ExploitBot.TACTICS.map(t => ({ id: t.id, short: t.short || t.name.split(' ')[0] })))
        .map(o => `<button data-xb="${o.id}" aria-pressed="${exploitTactic === (o.id || null)}">${esc(o.short)}</button>`).join('');
      if (/^https?:/.test(THREE_URL)) body.querySelector('.devs [data-dv="lab"]').remove(); } // the artifact build has no Counter Lab page
    const DV = {
      factions: () => factionsReady() ? '<b>Factions vs AI.</b> Draft two factions each.' : '<b>Factions.</b> Coming soon: not enough factions yet.',
      devtest: () => devReady() ? '<b>Factions · devtest.</b> Buildings, Powers and spells on the big board, against the AI.' : '<b>Devtest.</b> No factions yet.',
      late: () => `<b>Late game vs AI.</b> DEVTESTLATEGAME on Standard with treasuries: ${Game.START_HP + Game.LATE.hp} health each, at most ${Game.LATE.cap} squads of any one tier ${Game.LATE.tier} or tier 4 unit.`,
      claude: () => sampleFn ? '<b>Vs Claude.</b> Claude plays the other side.' : '<b>Vs Claude.</b> Only where Claude can be reached (the game as a Claude artifact).',
      tours: () => '<b>Tournaments.</b> Host one, or practise against bots. Joining is by a link.',
      load: () => `<b>Load units.</b> ${customSet ? `Your ${units.length} Counter Lab units now.` : `${units.length} built-in units now.`} Load a Counter Lab set instead${reportDb ? '; matches are saved for Claude to review' : ''}.`,
      lab: () => '<b>Counter Lab.</b> Make units and test them against each other. Opens its own page.',
    };
    // a tactic in one or two lines (the game's exploitBotNote is the whole write-up): its name, how it does, its first sentence
    const xbShort = (id) => { const t = id && ExploitBot.tacticById(id); if (!t) return 'Off: the normal AI plays as it always does.';
      return `<b>${esc(t.name)}.</b> ${t.winRateNow != null ? `Beats the normal AI ${t.winRateNow}% of 30 matches.` : 'Not measured.'} ${esc((t.blurb || '').split(/(?<=\.)\s/)[0])}`; };
    const dvNote = (h) => { $('dv-note').innerHTML = h || `<i class="dvt">Exploit bot</i> ${xbShort(exploitTactic)}${exploitTactic ? ' Applies to every match against the computer.' : ''}`; };
    function drawDevs() {
      body.querySelectorAll('.devs [data-xb]').forEach(x => x.setAttribute('aria-pressed', String(exploitTactic === (x.dataset.xb || null))));
      const off = { factions: !factionsReady(), devtest: !devReady(), claude: !sampleFn };
      body.querySelectorAll('.devs [data-dv]').forEach(x => { x.disabled = !!off[x.dataset.dv]; });
      dvNote();
    }
    const DV_GO = {
      factions: () => { matchKind = 'factions'; lateGame = false; startAiMatch(); },
      devtest: () => { matchKind = 'devtest'; lateGame = false; startAiMatch(); },
      late: () => { matchKind = 'standard'; lateGame = true; startAiMatch(); },
      claude: () => startClaudeMatch(),
      tours: () => openToursSheet(),
      load: () => openLoader(),
      lab: () => { location.href = 'lab.html'; },
    };
    body.querySelectorAll('.devs [data-dv]').forEach(b => { const on = () => dvNote(DV[b.dataset.dv]()); b.addEventListener('mouseenter', on); b.addEventListener('focus', on); b.addEventListener('click', () => { if (!b.disabled && devMode()) DV_GO[b.dataset.dv](); }); });
    body.querySelector('.devs .dv').addEventListener('click', (e) => { const b = e.target.closest('[data-xb]'); if (!b) return; exploitTactic = b.dataset.xb || null; drawDevs(); });
    body.querySelector('.devs .dv').addEventListener('mouseover', (e) => { const b = e.target.closest('[data-xb]'); if (!b) return; const t = b.dataset.xb && ExploitBot.tacticById(b.dataset.xb);
      dvNote(xbShort(t && t.id)); });
    body.querySelector('.devs .dv').addEventListener('mouseleave', () => dvNote());

    // ── Rooms: the game's live lobby (lob.list from the /lobby socket, lobbyOpen / lobbyClose), filtered to a kind and
    // the search line (a player or a battlefield). Join and Watch are the game's srvJoin / duoJoin / lobbyWatch ──
    const KIND = { standard: '1v1 Standard', ranked: '1v1 Ranked', '2v2': '2v2' };
    const lookName = (id) => { const k = Game.SKINS.find(x => x.id === id); return k ? k.name : id === 'random' ? 'a random look' : ''; };
    let roomQ = 'standard';
    function drawRooms() {
      if (!body.classList.contains('in-rooms')) return;
      const text = $('r-q').value.trim().toLowerCase();
      const all = lobbySorted().filter(l => l.mode === roomQ);
      const rows = all.filter(l => !text || l.host.tag.toLowerCase().includes(text) || lookName(l.look).toLowerCase().includes(text) || (l.map || '').toLowerCase().includes(text));
      const open = all.filter(l => l.phase === 'waiting').length;
      $('r-count').textContent = lob.ok ? `${open} open · ${all.length - open} playing` : '';
      $('lob-list').innerHTML = rows.length ? rows.map(l => {
        const canJoin = l.phase === 'waiting' && l.players < l.seats, canWatch = l.phase === 'playing' && l.spectate && l.kind === 'match';
        const age = Math.max(0, Math.round((Date.now() - l.at) / 60000)), sc = l.mode === 'ranked' ? boardScore(l.host.tag) : null;
        const facts = [lookName(l.look) || l.map || 'Standard', `${l.players}/${l.seats} players`, l.phase === 'playing' ? `round ${l.round}` : age < 1 ? 'just now' : `${age} min ago`, l.spectate && l.kind === 'match' && l.watchers ? `${l.watchers} watching` : ''].filter(Boolean).join(' · ');
        const act = canJoin ? `<button class="go" data-join="${esc(l.code)}">Join</button>` : canWatch ? `<button class="go watch" data-watch="${esc(l.code)}">Watch</button>` : '<span class="full">full</span>';
        return `<li data-code="${esc(l.code)}"><span><b>${esc(l.host.tag)}’s room</b>${sc != null ? `<span class="sc">★ ${esc(Math.round(sc))}</span>` : ''}${l.kind === 'duo' && l.dev ? '<i class="dvt">Dev</i>' : ''}${!l.spectate ? '<span class="tg">No watchers</span>' : ''}<small>${esc(facts)}</small></span>${act}</li>`;
      }).join('') : `<li class="empty">${lob.ok === false ? 'Can’t reach the game server. Retrying…' : lob.ok == null ? 'Loading rooms…' : text ? `No ${KIND[roomQ]} rooms match “${esc(text)}”.` : `No ${KIND[roomQ]} rooms right now. Make one, and others can join you.`}</li>`;
      $('lob-msg').textContent = lob.msg || '';
    }
    $('lob-list').addEventListener('click', (e) => {
      const j = e.target.closest('[data-join]'), w = e.target.closest('[data-watch]'), l = lob.list.get(j ? j.dataset.join : w ? w.dataset.watch : '');
      if (!l) return;
      home.back = 'lobby'; // after the match: back to Rooms
      if (j) { if (l.kind === 'duo') duoJoin(l.code); else srvJoin(l.code); } else lobbyWatch(l);
    });
    function setRoomQ(q) {
      roomQ = q; body.querySelector('#r-tok span').textContent = KIND[q];
      body.querySelectorAll('#r-menu button').forEach(b => b.setAttribute('aria-pressed', b.dataset.q === q));
      drawRooms();
    }
    const tokMenu = (on) => { $('r-menu').hidden = !on; $('r-tok').setAttribute('aria-expanded', on); };
    $('r-tok').addEventListener('click', () => tokMenu($('r-menu').hidden));
    body.querySelectorAll('#r-menu button').forEach(b => b.addEventListener('click', () => { if (b.disabled) return; setRoomQ(b.dataset.q); tokMenu(false); }));
    $('r-q').addEventListener('input', drawRooms);
    $('r-q').addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target.value) { e.stopPropagation(); e.target.value = ''; drawRooms(); } });
    // the game's state: home.screen 'lobby' is Rooms (openLobby); this only shows it
    function openRooms(q) { roomQ = q; home.pop = false; home.screen = 'lobby'; lob.msg = ''; drawHome(); }
    function showRooms() {
      if (!body.classList.contains('play')) { if (typeof openDrop === 'function') openDrop(''); unpin(); body.classList.add('play'); want = playView(); }
      if (!body.classList.contains('in-rooms')) { body.classList.add('in-rooms'); tokMenu(false); }
      backBtn.textContent = body.classList.contains('in-create') ? '← Rooms' : '← Play';
      setRoomQ(roomQ); lobbyOpen();
    }
    function hideRooms() { body.classList.remove('in-rooms', 'in-create'); tokMenu(false); lobbyClose(); backBtn.textContent = body.classList.contains('play') ? '← Menu' : backBtn.textContent; }
    function closeRooms() { if (body.classList.contains('in-create')) return closeCreate(); home.screen = 'menu'; home.pop = true; drawHome(); }

    // ── New room: the game's create sheet (openCreateSheet) as rows of words: kind, battlefield, who can find it,
    // spectators. It shares the game's `create` choices. The battlefield is the room's: skinPick while you're hosting
    // (not saved; your own comes back on the way home) ──
    const NOTE = {
      standard: 'On the Standard map. No stakes. Pick the leaders in the room before you start.',
      ranked: 'A best of 3 on the Standard map and pack. You and whoever joins both need to be logged in with Google. Only ranked series count on the leaderboard.',
      '2v2': '2v2 (developers only for now): two boards side by side. Seats left empty when you start are played by the AI.',
    };
    const press = (sel, on) => body.querySelectorAll(sel).forEach(b => b.setAttribute('aria-pressed', on(b)));
    function setKind(k) {
      if (k === 'ranked' && !rankedAllowed()) k = 'standard'; if (k === '2v2' && !duoOk()) k = 'standard';
      create.mode = k; press('.newroom [data-kind]', b => b.dataset.kind === k); $('nr-note').textContent = NOTE[k];
      body.querySelector('.newroom').classList.toggle('duo', k === '2v2'); // 2v2 has no Spectators row
    }
    body.querySelectorAll('.newroom [data-kind]').forEach(b => b.addEventListener('click', () => { if (!b.disabled) setKind(b.dataset.kind); }));
    const drawPub = () => { press('.newroom [data-pub]', x => (x.dataset.pub === '1') === create.pub); $('nr-pub').textContent = create.pub ? 'Listed in Rooms for anyone to join.' : 'Not listed. Invite friends to it from Friends.'; };
    const drawSpec = () => { press('.newroom [data-spec]', x => (x.dataset.spec === '1') === create.spectate); $('nr-spec').textContent = create.spectate ? 'Anyone can watch once it starts.' : 'No one can watch.'; };
    body.querySelectorAll('.newroom [data-pub]').forEach(b => b.addEventListener('click', () => { create.pub = b.dataset.pub === '1'; drawPub(); }));
    body.querySelectorAll('.newroom [data-spec]').forEach(b => b.addEventListener('click', () => { create.spectate = b.dataset.spec === '1'; drawSpec(); }));
    // the room's battlefield: the host picks it here and the match is played on it; the island shows it while you pick
    let roomLook = 0;
    function setRoomLook(i) { roomLook = (i + LOOKS.length) % LOOKS.length; $('nr-bf').textContent = LOOKS[roomLook].name;
      $('nr-bfn').textContent = `${roomLook + 1} of ${LOOKS.length}. The match is played here. Everyone else keeps their own at home.`; if (lookI !== roomLook) setLook(roomLook, !still); }
    body.querySelectorAll('.newroom [data-bfs]').forEach(b => b.addEventListener('click', () => setRoomLook(roomLook + +b.dataset.bfs)));
    function openCreate() { setKind(roomQ); drawPub(); drawSpec(); tokMenu(false); body.classList.add('in-create'); backBtn.textContent = '← Rooms'; setRoomLook(homeLook); $('nr-msg').textContent = ''; }
    function closeCreate() { body.classList.remove('in-create'); backBtn.textContent = '← Play'; if (lookI !== homeLook) setLook(homeLook, !still); }
    // CREATE ROOM: the room opens and waits for a second player (srvHost, or duoHost for 2v2), as the game's create sheet
    function createRoom() {
      const o = { pub: create.pub, spectate: create.spectate };
      home.back = 'lobby'; dio.roomLook = true; skinPick = LOOKS[roomLook].id; // the room's battlefield (put back at home: restoreLook)
      body.classList.remove('in-create'); backBtn.textContent = '← Play'; // after the room: the Rooms list, as the game's create sheet
      if (create.mode === '2v2') { duoHost(o); return; }
      matchKind = 'standard'; lateGame = false;
      if (create.mode === 'ranked') {
        if (!rankedReady()) { rankedLogin(() => srvHost({ ...o, ranked: true }));
          const std = $('rl-std'); if (std) std.replaceWith(Object.assign(document.createElement('button'), { className: 'btn', id: 'rl-std', textContent: 'Make a Standard room instead', onclick: () => { acctUi.after = null; closeSheet(true); srvHost(o); } })); // (the old one hosted a phone-to-phone match)
          return; }
        srvHost({ ...o, ranked: true }); return;
      }
      srvHost(o);
    }
    // Change battlefield: steps through the looks one at a time. At home it is only how your island looks; on New room it steps the room's
    const bfNote = body.querySelector('.bf-note');
    const stepBattlefield = () => { if (body.classList.contains('in-create')) return setRoomLook(roomLook + 1);
      homeLook = (homeLook + 1) % LOOKS.length; saveLook(homeLook); setLook(homeLook, !still); };
    bfNote.addEventListener('click', stepBattlefield); bfNote.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stepBattlefield(); } });
    const bfSub = () => { const L = LOOKS[lookI]; $('bf-sub').textContent = `${L.name} · ${lookI + 1} of ${LOOKS.length}`; };
    document.addEventListener('battlefield', bfSub); bfSub();
    $('lob-create').addEventListener('click', openCreate);
    $('nr-go').addEventListener('click', createRoom);
    // ── Profile on the game's account (the old Profile sheet: openAccountSheet / acctDraw): title, skins (on the unit
    // sheet), username, Keep it with Google, log out, delete. Each change goes to the server; the answer is acctTake'n ──
    const pf = { outSure: false, sure: false, busy: false, msg: '' };
    const acctBtn = body.querySelectorAll('.acct button')[1]; acctBtn.id = 'acct-open';
    const pfMsg = (t) => { pf.msg = t || ''; $('pf-msg').textContent = pf.msg; };
    function drawProfile() {
      acctBtn.querySelector('span').textContent = A ? A.tag : 'Guest';
      $('pf-k').innerHTML = (!A ? 'Profile · no account yet' : A.google ? 'Profile · signed in with Google' : 'Profile · guest on this phone') + (A && A.dev ? ' · <span class="dev">developer mode is on</span>' : '');
      // the big name is where you rename (owner, 2026-11-08): an input dressed as the name while a change is allowed
      const wait = A && !A.dev && A.tagNext > Date.now(), nm = $('pf-name');
      if (!(document.activeElement && document.activeElement.id === 'pf-tag')) { // (typing stays typed)
        if (A && !wait) { nm.innerHTML = `<input id="pf-tag" class="pf-name-in" maxlength="16" spellcheck="false" autocomplete="nickname" aria-label="Your username: click it to change it" title="Click to change your name" value="${esc(A.tag)}" ${pf.busy ? 'disabled' : ''}><span class="pf-sizer" aria-hidden="true"></span>`; fitName(); }
        else nm.textContent = A ? A.tag : 'Nobody yet';
      }
      $('pf-namenote').innerHTML = !A ? '' : `<span>${A.dev ? 'Developer: click your name to change it, any time.' : wait ? `You can change your name again on ${esc(tagWhen(A.tagNext))}.` : 'Click your name to change it (once a week).'}</span><button class="pf-save" id="pf-save" hidden>Save</button>`;
      nameSave();
      const T = A && DTITLES[A.title], pt = $('pf-title'); pt.hidden = !T;
      if (T) { pt.style.setProperty('--tc', T[1]); pt.innerHTML = `<i></i>${esc(T[0])}<i></i>`; }
      const g = GOOGLE_CLIENT_ID && !acctUi.off ? '<div id="acct-google" class="acct-google"></div>' : '';
      const row = (lab, seg, note, cls = '') => `<span class="lab">${lab}</span><span class="seg ${cls}">${seg}</span><span></span><p class="nr-note">${note}</p>`;
      const dis = pf.busy ? 'disabled' : '';
      let h = '';
      if (A) {
        const titles = (A.titles || []).filter(t => DTITLES[t]);
        if (titles.length) h += row('Title', titles.map(t => `<button data-title="${t}" style="--pc:${DTITLES[t][1]}" aria-pressed="${A.title === t}" ${dis}>${esc(DTITLES[t][0])}</button>`).join('') + `<button data-title="" aria-pressed="${!A.title}" ${dis}>None</button>`,
          T ? T[2] : 'Nothing shows under your name.');
        { const skins = A.skins || [], on = skins.filter(k => k.worn && SKIN[k.id]).map(k => `${SKIN[k.id].name} ${SKIN[k.id].unit}`), un = body.classList.contains('units');
          h += `<span class="lab ur">Skins</span><span class="pf-units ur"><button class="item${un ? ' on' : ''}" data-units aria-pressed="${un}"><svg class="shard" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,6 97,0 100,96 4,100"/></svg>Units</button></span>
            <span class="ur"></span><p class="nr-note ur"></p>`; }
        if (!A.google && g) h += row('Keep it', g, 'Guest on this phone. Sign in with Google to keep it if you change or reset your phone. Sign-in is handled by Google.');
        h += row('Account', `<button class="act${pf.outSure ? ' sure' : ''}" id="acct-out" data-out ${dis}>${pf.outSure ? 'Tap again to log out' : 'Log out'}</button><button class="del${pf.sure ? ' sure' : ''}" id="acct-del" data-del ${dis}>${pf.sure ? 'Tap again to delete' : 'Delete account'}</button>`,
          pf.sure ? 'Deleting removes your username and sign-in for good. Past match results stay, without your name.'
          : A.google ? 'Signed in with Google. Sign in on another phone to play as the same player.'
          : pf.outSure ? 'A guest can’t log back in: sign up with Google first to keep this username and your results.' : 'Log out of this phone. A guest can’t log back in.');
      } else h += row('Account', `<button class="act primary" id="acct-guest" data-guest ${dis}>Play as a guest</button>${g}`, `No account needed to play. Make a guest to get a username on this phone${g ? ', or sign in with Google to keep it on any phone' : ''}.`);
      $('pf-opts').innerHTML = body.classList.contains('profile') ? h : ''; $('pf-msg').textContent = pf.msg; // (only while it's open: no stray #acct-google)
      if (g && $('acct-google') && body.classList.contains('profile')) { // Google's own button; afterwards the profile shows the account
        acctUi.after = async () => { pfMsg('Signed in with Google.'); if (phase === 'start') drawHome(); };
        acctGoogleButton('signin_with');
      }
      // the island's note: the golem, while you can still earn its skin
      body.querySelectorAll('.pnote').forEach(n => n.remove());
      if (!(A && (A.skins || []).some(k => k.id === 'golem-aquamarine'))) { const n = document.createElement('div'); n.className = 'note pnote rw-note'; n.style.display = 'none'; n.setAttribute('role', 'button'); n.tabIndex = 0;
        n.innerHTML = `<span class="tag">Reward · Limited</span><br>${A && (A.skins || []).length ? '' : 'No skins yet. '}This golem’s skin is yours when a friend joins. <span class="rw-row"><span class="rw-btn">Invite a friend</span></span>`; n.addEventListener('click', () => openRewardsSheet()); n.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRewardsSheet(); } }); body.querySelector('.notes').after(n); }
      if (body.classList.contains('profile') && !body.classList.contains('in-history')) want = body.classList.contains('units') ? VIEWS.units : VIEWS.play;
    }
    // Profile's Units: the roster comes up on the island, as from the menu; a unit's sheet changes its skin. ← Profile goes back
    function profileUnits(on) {
      body.classList.toggle('units', on); picked = null; hovered = null; if (on) setTier(tier);
      backBtn.textContent = on ? '← Profile' : '← Menu'; drawProfile();
    }
    // one server call from Profile: busy while it runs, its answer kept (acctTake), the message under the rows
    async function pfDo(f) {
      if (pf.busy) return; pf.busy = true; pfMsg('One moment…'); drawProfile();
      let t = ''; try { t = (await f()) || ''; } finally { pf.busy = false; }
      A = sampleAcct ? A : acct; pfMsg(t); picked = null; buildTier(tier); drawProfile();
    }
    const pfSave = () => { const v = $('pf-tag').value.trim(); if (v.length < 2 || v === A.tag) return; if (!cleanTagOk(v)) return pfMsg(TAG_BAD);
      pfDo(async () => { const r = await acctCall('tag', { tag: v }, true); if (r.status !== 200) return acctFail(r); acctTake(r); return 'Username saved.'; }); };
    $('pf-opts').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.title !== undefined) pfDo(async () => { const r = await acctCall('title', { title: b.dataset.title }, true); if (r.status !== 200) return acctFail(r); acctTake(r); return 'Title saved.'; });
      else if (b.hasAttribute('data-units')) profileUnits(!body.classList.contains('units'));
      else if (b.hasAttribute('data-out')) { // a guest taps twice (with the warning); then the welcome screen, as the old Log out
        if (!A.google && !pf.outSure) { pf.outSure = true; return drawProfile(); }
        pf.outSure = false; closeProfile(); acctLogOut();
      }
      else if (b.hasAttribute('data-del')) { if (!pf.sure) { pf.sure = true; return drawProfile(); } pf.sure = false; pfDo(async () => { await acctDelete(); return acctUi.msg; }); }
      else if (b.hasAttribute('data-guest')) pfDo(async () => { const r = await acctCall('guest', {}); if (r.status !== 200) return acctFail(r); acctTake(r); welcomed(); return 'You’re playing as a guest on this phone.'; });
    });
    // the name's input: as wide as what's typed; Save shows once it's a different name; Enter saves, Esc puts it back
    function fitName() { const i = $('pf-tag'), z = $('pf-name').querySelector('.pf-sizer'); if (!i || !z) return; z.textContent = i.value || ' '; i.style.width = (z.offsetWidth + 8) + 'px'; }
    function nameSave() { const i = $('pf-tag'), b = $('pf-save'); if (b) b.hidden = !i || !A || i.value.trim() === A.tag || i.value.trim().length < 2; }
    $('pf-name').addEventListener('input', (e) => { if (e.target.id === 'pf-tag') { fitName(); nameSave(); } });
    $('pf-name').addEventListener('keydown', (e) => { if (e.target.id !== 'pf-tag') return;
      if (e.key === 'Enter' && !$('pf-save').hidden) pfSave();
      if (e.key === 'Escape') { e.stopPropagation(); e.target.value = A.tag; fitName(); nameSave(); e.target.blur(); } });
    $('pf-namenote').addEventListener('click', (e) => { if (e.target.closest('#pf-save')) pfSave(); });

    // Profile opens over the menu; the account is refreshed from the server (the session rotates daily, titles and skins may be new)
    // where Profile was opened from, for its Back: the Play screen, Rooms (and New room), or the menu
    let pfFrom = null;
    function openProfile() { if (!body.classList.contains('profile')) pfFrom = body.classList.contains('in-create') ? 'create' : home.screen === 'lobby' ? 'rooms' : body.classList.contains('play') || home.pop ? 'play' : null;
      openDrop(''); leavePlay(); unpin(); closeMusic(); body.classList.add('profile'); backBtn.textContent = '← Menu'; pf.outSure = pf.sure = false; pf.msg = ''; drawProfile();
      if (acct && !sampleAcct) acctCall('me', {}, true).then(r => { if (r.status === 200) { acctTake(r); A = acct; buildTier(tier); drawProfile(); } else if (r.status === 401) { acctFail(r); A = acct; drawProfile(); } }); }
    function closeProfile() { body.classList.remove('profile', 'in-history', 'units'); picked = null; hovered = null; want = VIEWS.play; backBtn.textContent = '← Menu'; acctUi.after = null; drawProfile(); }
    acctBtn.addEventListener('click', openProfile);
    $('pf-back').addEventListener('click', () => { const from = pfFrom; pfFrom = null; closeProfile();
      if (from === 'rooms' || from === 'create') { openRooms(roomQ); if (from === 'create') openCreate(); }
      else if (from === 'play') { home.screen = 'menu'; home.pop = true; drawHome(); } });

    // ── Match history (the old openHistorySheet / histLoad): My matches (acctCall 'history', one card per match, its rounds
    // with REPLAY) and All online (GET /history: the latest battles). Load more pages with the server's `next` ──
    const car = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
    const ago = (iso) => { const t = new Date(iso).getTime(); if (!t) return ''; const mn = Math.round((Date.now() - t) / 60000); return mn < 1 ? 'just now' : mn < 60 ? `${mn} min ago` : mn < 24 * 60 ? `${Math.round(mn / 60)} h ago` : mn < 48 * 60 ? 'yesterday' : histTime(iso); };
    let histTab = 'mine';
    const hs = { next: null, busy: false, n: 0, won: 0 };
    function histMine(x) {
      const rs = x.rounds || [], me0 = x.side === 1 ? 1 : 0, them = 1 - me0, first = rs[0] || {}, last = rs[rs.length - 1] || {};
      const foeTag = (first.names && first.names[them]) || '', foeLead = (first.leaders && first.leaders[them]) || '';
      const over = !!last.over, mw = last.matchWinner, forf = rs.find(q => q.forfeit === 0 || q.forfeit === 1);
      const res = !over ? ['', 'Unfinished'] : mw === me0 ? ['won', 'Won'] : mw === them ? ['lost', 'Lost'] : ['draw', 'Draw'];
      const fights = rs.filter(q => q.forfeit == null);
      const dealt = fights.reduce((t, q) => t + ((q.dmg && q.dmg[them]) | 0), 0), took = fights.reduce((t, q) => t + ((q.dmg && q.dmg[me0]) | 0), 0);
      const wins = fights.filter(q => q.winner === me0).length, losses = fights.filter(q => q.winner === them).length;
      const kind = first.tour ? 'Tournament' : first.ranked ? 'Ranked' : 'Standard';
      const score = forf ? (forf.forfeit === me0 ? 'you left' : 'they left') : `${wins}–${losses}`;
      const facts = [kind, score, first.map || '', ago(last.time || first.time), `dealt ${dealt}, took ${took}`].filter(Boolean).join(' · ');
      const rounds = fights.map(q => { const w = q.winner === me0 ? 'won' : q.winner === them ? 'lost' : 'draw';
        return `<li><span><b>Round ${esc(q.round)}</b>${q.timeout ? 'time ran out' : w}<small>you took ${esc(q.dmg[me0])}, they took ${esc(q.dmg[them])}</small></span>${q.replay ? `<button class="go" data-replay="${esc(q.matchId)}|${esc(q.round)}|${me0}">Replay</button>` : ''}</li>`; }).join('');
      return `<li><span class="res ${res[0]}">${res[1]}</span><span><b>vs ${esc(foeTag || (foeLead ? foeLead + ' (guest)' : 'a guest'))}</b><small>${esc(facts)}</small></span>
        ${fights.length ? `<button class="rd" aria-expanded="false">${fights.length} round${fights.length > 1 ? 's' : ''} ${car}</button><ol class="rounds">${rounds}</ol>` : ''}</li>`;
    }
    function histAll(r) {
      let who = [0, 1].map(sd => (r.names && r.names[sd]) || (r.leaders && r.leaders[sd]) || (sd ? 'Side 2' : 'Side 1'));
      if (who[0] === who[1]) who = [who[0] + ' (side 1)', who[1] + ' (side 2)'];
      const how = r.forfeit === 0 || r.forfeit === 1 ? `${who[r.forfeit]} left` : r.winner === -1 ? 'Draw' : `${who[r.winner]} won${r.timeout ? ' on time' : ''}`;
      const facts = [`Round ${r.round}`, how, r.map || '', ago(r.time), r.forfeit == null && r.dmg ? `damage ${r.dmg[0]}/${r.dmg[1]}` : ''].filter(Boolean).join(' · ');
      return `<li><span class="res draw">R${esc(r.round)}</span><span><b>${esc(who[0])} vs ${esc(who[1])}</b><small>${esc(facts)}</small></span></li>`;
    }
    async function histLoadD(more) {
      if (hs.busy) return; hs.busy = true;
      body.querySelectorAll('.h-tabs button').forEach(b => b.setAttribute('aria-pressed', b.dataset.h === histTab));
      const tab = histTab;
      if (!more) { $('h-list').innerHTML = ''; hs.next = null; hs.n = 0; hs.won = 0; $('h-count').textContent = ''; }
      $('h-msg').textContent = 'Loading…'; $('h-more').hidden = true;
      let data = null;
      try {
        if (tab === 'mine') { const r = await acctCall('history', more && hs.next ? { before: hs.next } : {}, true); data = r.status === 200 && Array.isArray(r.matches) ? { rows: r.matches, next: r.next } : null; }
        else { const res = await fetch(`${SERVER_URL}/history?limit=40${more && hs.next ? '&before=' + hs.next : ''}`); const j = res.ok ? await res.json() : null; data = j ? { rows: j.rows || [], next: j.next } : null; }
      } catch (e) { data = null; }
      hs.busy = false;
      if (histTab !== tab || !body.classList.contains('in-history')) return;
      if (!data) { $('h-msg').textContent = more ? 'Couldn’t load more. Try again.' : tab === 'mine' ? 'Couldn’t load your matches. Check your connection and try again.' : 'Couldn’t load the history. Check your connection and try again.'; $('h-more').hidden = !more; return; }
      hs.next = data.next || null;
      $('h-list').insertAdjacentHTML('beforeend', data.rows.map(tab === 'mine' ? histMine : histAll).join(''));
      if (tab === 'mine') { hs.n += data.rows.length; hs.won += data.rows.filter(x => { const rs = x.rounds || [], l = rs[rs.length - 1] || {}; return l.over && l.matchWinner === (x.side === 1 ? 1 : 0); }).length;
        $('h-count').textContent = hs.n ? `${hs.n} played · ${hs.won} won` : ''; }
      else $('h-count').textContent = 'everyone’s, newest first';
      $('h-msg').textContent = $('h-list').children.length ? '' : tab === 'mine' ? 'No online matches yet. Matches you play in Rooms show up here.' : 'No battles saved yet.';
      $('h-more').hidden = !hs.next;
    }
    $('h-list').addEventListener('click', (e) => {
      const rp = e.target.closest('[data-replay]'); if (rp) { const [id, r, sd] = rp.dataset.replay.split('|'); dio.histBack = true; playReplay(id, +r, +sd); return; }
      const b = e.target.closest('.rd'); if (!b) return; const li = b.closest('li'); li.classList.toggle('open'); b.setAttribute('aria-expanded', li.classList.contains('open'));
    });
    $('h-more').addEventListener('click', () => histLoadD(true));
    body.querySelectorAll('.h-tabs button').forEach(b => b.addEventListener('click', () => { if (b.dataset.h === 'mine' && !A) return; histTab = b.dataset.h; histLoadD(false); }));
    function openHistory() { histTab = A ? 'mine' : 'all'; body.querySelector('.h-tabs [data-h="mine"]').disabled = !A; body.classList.add('in-history'); hovered = null; want = VIEWS.history; backBtn.textContent = '← Profile'; histLoadD(false); }
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
      $('si-k').innerHTML = `<button class="crumb" data-crumb="welcome">Welcome</button> · ${up ? 'sign up' : 'log in'}`;
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
    function closeDoor() { door.screen = null; acctUi.after = null; $('si-opts').innerHTML = ''; /* (no second #acct-google left behind) */ body.classList.remove('welcome', 'in-signin'); want = VIEWS.play; backBtn.textContent = '← Menu'; }
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
    // the account's notes, off the account button, one at a time as the old menu's popups came: Stay logged in? (asked
    // once after making an account or logging in), then a new Title, then a new skin (each announced once per phone)
    const stayEl = $('dio-stay');
    function drawStay() {
      const on = !!acct && !HOME_AUTO && !door.screen && home.screen === 'menu';
      const ask = on && stayPref() == null, nt = on && !ask ? titlesUnseen() : [], ns = on && !ask && !nt.length ? skinsUnseen() : [];
      stayEl.hidden = !(ask || nt.length || ns.length); stayEl.classList.toggle('news', !ask);
      if (ask) {
        stayEl.innerHTML = `<span class="k" id="stay-h">Stay logged in?</span><p>Keep <b>${esc(acct.tag)}</b> logged in on this device, so the game opens on the menu next time. Settings can change it.</p>
          <span class="seg"><button class="w go" id="stay-yes">Yes</button><button class="w" id="stay-no">No</button></span>`;
        $('stay-yes').addEventListener('click', () => { setStay(true); drawHome(); });
        $('stay-no').addEventListener('click', () => { setStay(false); drawHome(); });
      } else if (nt.length) {
        stayEl.innerHTML = `<span class="k" id="stay-h"><i class="tagnew">${nt.length > 1 ? 'New titles' : 'New title'}</i></span>
          <p class="nts">${nt.map(t => DTITLES[t] ? `<span class="ptitle" style="--tc:${DTITLES[t][1]}"><i></i>${esc(DTITLES[t][0])}<i></i></span>` : '').join('')}</p>
          <p>${nt.map(t => DTITLES[t] ? esc(DTITLES[t][2]) : '').join(' ')} It shows under your name. Change it any time in Profile.</p>
          <span class="seg"><button class="w go" id="title-ok">Nice</button></span>`;
        $('title-ok').addEventListener('click', () => { titlesSeen(); drawHome(); });
      } else if (ns.length) {
        const S = SKIN[ns[0]];
        stayEl.innerHTML = `<span class="k" id="stay-h"><i class="tagnew">${ns.length > 1 ? 'New skins' : 'New skin'}</i></span>
          <p>${ns.map(id => `<b>${esc(SKIN[id].name)} ${esc(SKIN[id].unit)}.</b> ${esc(SKIN[id].text)}`).join(' ')}</p>
          <p>Your ${esc(S.unit)}s wear it, and your opponents see it online. Change it on the unit's sheet in Units.</p>
          <span class="seg"><button class="w go" id="skin-ok">Nice</button></span>`;
        $('skin-ok').addEventListener('click', () => { skinsSeen(); drawHome(); });
      }
    }
    // Rankings: the line under STANDINGS (the Legend title and how long the month has left) and the full leaderboard
    function drawStandings() {
      const j = home.board, lg = j && j.legend && j.legend.top ? j.legend : null, el = body.querySelector('.standings .leg');
      let when = '';
      if (lg) { const left = Math.max(0, (lg.ends - Date.now()) / 864e5); when = left >= 1 ? `${Math.floor(left)} day${Math.floor(left) === 1 ? '' : 's'} left this month.` : left * 24 >= 1 ? `${Math.floor(left * 24)} hours left this month.` : 'The month ends within the hour.'; }
      el.textContent = !j ? 'The standings come from the game server, which can’t be reached right now.'
        : !j.rows.length ? 'No ranked results yet. Play a ranked match against a friend to get on the board.'
        : lg ? `The top ${lg.top} when the month ends earn the gold Legend title. ${when}` : 'Ranked best-of-3 series.';
      buildPodium(j && j.rows);
    }
    $('lb-open').addEventListener('click', openLeaderboard);
    body.querySelectorAll('.door .item').forEach(b => { b.addEventListener('mouseenter', () => body.querySelectorAll('.door .item').forEach(x => x.classList.toggle('on', x === b)));
      b.addEventListener('focus', () => body.querySelectorAll('.door .item').forEach(x => x.classList.toggle('on', x === b))); });
    body.querySelector('.door').addEventListener('mouseleave', () => body.querySelectorAll('.door .item').forEach(x => x.classList.toggle('on', x.id === 'w-login')));

    // ── the dropdowns: Friends (the game's friends: fr, its hub and the account routes) and Settings (snd, as the old
    // Settings sheet on the menu). One open at a time; outside, Esc or the button again closes them. In a match the
    // HUD keeps the old Settings sheet (it has the board, layout and quality there) ──
    const ddBtn = { friends: body.querySelectorAll('.acct button')[0], settings: body.querySelectorAll('.acct button')[2] };
    ddBtn.friends.id = 'fr-open'; ddBtn.settings.id = 'music-open'; // the old menu's ids
    { const bd = $('fr-badge'); bd.classList.add('fr-badge'); bd.removeAttribute('id'); } // frBadge() fills every .fr-badge
    const dd = { open: '', several: null };
    const msgSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v11H9l-5 4v-4H3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
    const frT = (t) => DTITLES[t] ? `<span class="tt" style="--tc:${DTITLES[t][1]}">${esc(DTITLES[t][0])}</span>` : '';
    // where a friend is, as the game says it (frStatus), in the Diorama's words
    const frWhereD = (f) => !f.online ? (f.seen ? `Offline · ${frAgo(f.seen)}` : 'Offline') : !f.status || f.status.where === 'menu' ? 'In the menu' : f.status.where === 'room' ? 'In a room' : `Playing${f.status.round ? ' · round ' + f.status.round : ''}`;
    function drawFriends() {
      const el = $('dd-friends'); if (dd.open !== 'friends') return;
      frBadge();
      if (!frOk()) { // guests and no account: friends need Google
        el.innerHTML = `<h3>Friends</h3><p class="hint">Friends, invites and messages are for players signed in with Google, so they can find you on any phone.${acct ? ' Your username and results come with you.' : ''}</p>
          ${GOOGLE_CLIENT_ID && !acctUi.off ? '<div id="acct-google" class="acct-google"></div>' : ''}<p class="hint" id="fr-msg" aria-live="polite"></p>`;
        if ($('acct-google')) { acctUi.after = async () => { if (phase === 'start') drawHome(); drawFriends(); frLoad(); }; acctGoogleButton('signin_with'); }
        return;
      }
      if (fr.thread) return drawThread();
      const d = fr.data, online = d ? d.friends.filter(f => f.online).length : 0, nIn = d ? d.incoming.length : 0;
      const typed = $('fr-tag') ? $('fr-tag').value : '', focused = document.activeElement && document.activeElement.id === 'fr-tag';
      let h = `<h3>Friends <small>${d ? `${online} online · ${d.friends.length} friend${d.friends.length === 1 ? '' : 's'}` : ''}</small></h3>`;
      h += fr.invites.map(x => `<div class="fr-inv"><span class="k">Game invite</span><p><b>${esc(x.from.tag || 'A friend')}</b> wants a 1v1 ${x.mode === 'ranked' ? 'Ranked' : 'Standard'}. The room is waiting.</p>
        <span class="row">${frInMatch() ? '<span class="lnk" style="text-decoration:none">After this match</span>' : `<button class="w go" data-join="${esc(x.code)}">Join</button>`}<button class="lnk" data-decline="${esc(x.code)}">Decline</button></span></div>`).join('');
      h += `<div class="fr-tabs" role="group" aria-label="Friends or requests"><button data-tab="friends" aria-pressed="${fr.tab !== 'requests'}">Friends</button><button data-tab="requests" aria-pressed="${fr.tab === 'requests'}">Requests${nIn ? `<i>${nIn}</i>` : ''}</button></div>
        <div class="fr-add"><input id="fr-tag" placeholder="Add by username" aria-label="Add a friend by username" maxlength="16" autocomplete="off" spellcheck="false"><button class="w" id="fr-add">Add</button></div>
        <p class="hint fr-msg" id="fr-msg" aria-live="polite">${esc(fr.msg || '')}</p>`;
      if (dd.several) h += `<ul class="fr-list">${dd.several.map(p => `<li><span class="dot"></span><span><b>${esc(p.tag)}</b>${frT(p.title)}</span><span class="acts"><button class="w go" data-addid="${esc(p.id)}">Add</button></span></li>`).join('')}</ul>`;
      if (!d) h += '<p class="hint">Loading…</p>';
      else if (fr.tab !== 'requests') h += d.friends.length ? `<ul class="fr-list">${d.friends.map(f => {
          const inv = fr.invited[f.id] && fr.invited[f.id].expires > now(), watch = f.online && f.status && f.status.where === 'match' && f.status.code;
          const act = inv ? '<span class="done">Invited</span>' : f.online && (!f.status || f.status.where === 'menu') ? `<button class="w${fr.pick === f.id ? ' go' : ''}" data-act="invite" data-id="${f.id}">Invite</button>` : watch ? `<button class="w" data-watch="${f.id}">Watch</button>` : '';
          const sub = fr.pick === f.id ? `<span class="sub"><span class="lnk" style="text-decoration:none">Invite to</span><button class="w" data-act="inv-std" data-id="${f.id}">Standard</button><button class="w" data-act="inv-rk" data-id="${f.id}">Ranked</button></span>`
            : fr.more === f.id ? `<span class="sub"><button class="lnk" data-act="mute" data-id="${f.id}">${f.muted ? 'Unmute messages' : 'Mute messages'}</button><button class="lnk${fr.sure === f.id ? ' sure' : ''}" data-act="remove" data-id="${f.id}">${fr.sure === f.id ? 'Tap again to remove' : 'Remove friend'}</button></span>` : '';
          return `<li><span class="dot${f.online ? ' on' : ''}" role="img" aria-label="${f.online ? 'online' : 'offline'}"></span><span><b>${esc(f.tag)}</b>${frT(f.title)}<small>${esc(frWhereD(f))}${f.muted ? ' · muted' : ''}</small></span>
            <span class="acts">${act}<button class="msg" data-act="message" data-id="${f.id}" aria-label="Messages with ${esc(f.tag)}">${msgSvg}${f.unread ? `<i>${f.unread}</i>` : ''}</button><button class="more" data-act="more" data-id="${f.id}" aria-label="More" aria-expanded="${fr.more === f.id}">⋯</button></span>${sub}</li>`; }).join('')}</ul>`
        : '<p class="hint">No friends yet. Add one by username above, or from a name on the leaderboard.</p>';
      else h += `<span class="k">Asking to be your friend</span><ul class="fr-list">${d.incoming.map(p => `<li><span class="dot"></span><span><b>${esc(p.tag)}</b>${frT(p.title)}<small>${esc(frAgo(p.created))}</small></span><span class="acts"><button class="w go" data-act="accept" data-id="${p.id}">Accept</button><button class="lnk" data-act="decline" data-id="${p.id}">Decline</button></span></li>`).join('') || '<li><small>No requests.</small></li>'}</ul>
        <span class="k">Waiting for them</span><ul class="fr-list">${d.outgoing.map(p => `<li><span class="dot"></span><span><b>${esc(p.tag)}</b><small>Sent ${esc(frAgo(p.created))}</small></span><span class="acts"><button class="lnk" data-act="cancel" data-id="${p.id}">Cancel</button></span></li>`).join('') || '<li><small>Nobody.</small></li>'}</ul>`;
      el.innerHTML = h;
      if (typed) $('fr-tag').value = typed; if (focused) $('fr-tag').focus();
    }
    // a thread: ← Friends, the name and where they are, the lines (the game's frThreadDraw into #fr-thread), Message and SEND
    function drawThread() {
      const t = fr.thread, f = fr.data && fr.data.friends.find(x => x.id === t.id);
      const typed = $('fr-text') ? $('fr-text').value : '';
      $('dd-friends').innerHTML = `<button class="fr-back" data-back>← Friends</button><h3>${esc(t.tag)} <small>${f ? esc(frWhereD(f)) : ''}</small></h3>
        <div class="thread" id="fr-thread"><p class="hint">Loading…</p></div>
        <div class="fr-add"><input id="fr-text" placeholder="Message ${esc(t.tag)}" aria-label="Message" maxlength="300" autocomplete="off"><button class="w go" id="fr-go">Send</button></div>
        <p class="hint" id="fr-tmsg" aria-live="polite"></p>
        <p class="hint"><button class="lnk" data-act="mute" data-id="${t.id}">${f && f.muted ? 'Unmute messages' : 'Mute messages'}</button> &nbsp; <button class="lnk${t.sure ? ' sure' : ''}" data-report>${t.sure ? 'Tap again to report' : 'Report'}</button></p>`;
      if (typed) $('fr-text').value = typed;
      if (t.loaded) frThreadDraw(true);
    }
    async function openThread(id) {
      const f = fr.data && fr.data.friends.find(x => x.id === id);
      fr.thread = { id, tag: f ? f.tag : 'Friend', title: f ? f.title : '', lines: [], more: false, msg: '', sure: false, loaded: false };
      drawThread();
      const r = await acctCall('dm/list', { id }, true);
      if (!fr.thread || fr.thread.id !== id) return;
      if (r.status !== 200) { if ($('fr-thread')) $('fr-thread').innerHTML = `<p class="hint">${esc(frFail(r))}</p>`; return; }
      fr.thread.lines = r.lines; fr.thread.more = r.more; fr.thread.loaded = true;
      frThreadDraw(true);
      acctCall('dm/read', { id }, true);
      if (f && f.unread) { f.unread = 0; frBadge(); }
    }
    const sendDm = () => { const t = fr.thread, x = $('fr-text'); if (!t || !x) return; const v = x.value.trim(); if (!v) return;
      if (!hubSend({ t: 'dm', to: t.id, text: v })) { frThreadMsg('Not connected. Try again in a moment.'); return; } x.value = ''; };
    async function addFriend(body) {
      frNote('One moment…'); dd.several = null;
      const r = await acctCall('friend/add', body, true);
      if (r.status === 200 && r.several) { dd.several = r.several; fr.msg = 'Several players have that username. Pick one:'; drawFriends(); return; }
      frAddDone(r); drawFriends();
    }
    $('dd-friends').addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return; const d = b.dataset;
      if ('back' in d) { fr.thread = null; drawFriends(); return; }
      if ('tab' in d) { fr.tab = d.tab; dd.several = null; drawFriends(); return; }
      if ('join' in d) { const x = fr.invites.find(i => i.code === d.join); if (x) { openDrop(''); frJoin(x); } return; }
      if ('decline' in d) { hubSend({ t: 'decline', code: d.decline }); fr.invites = fr.invites.filter(i => i.code !== d.decline); frBadge(); frBanner(); drawFriends(); return; }
      if ('watch' in d) { const f = fr.data && fr.data.friends.find(x => x.id === d.watch); if (f && f.status && f.status.code) { openDrop(''); home.back = ''; lobbyWatch({ code: f.status.code, host: { tag: f.tag } }); } return; }
      if ('addid' in d) { addFriend({ id: d.addid }); return; }
      if (b.id === 'fr-add') { const v = ($('fr-tag').value || '').trim(); if (v) addFriend({ tag: v }); return; }
      if (b.id === 'fr-go') { sendDm(); return; }
      if ('report' in d) { const t = fr.thread; if (!t) return; if (!t.sure) { t.sure = true; drawThread(); frThreadMsg('Report sends the last 20 messages and both usernames to the moderators.'); return; }
        const r = await acctCall('dm/report', { id: t.id }, true); t.sure = false; drawThread(); frThreadMsg(r.status === 200 ? 'Reported. Thanks.' : frFail(r)); return; }
      if (d.act === 'message') { openThread(d.id); return; }
      if (d.act === 'invite') { const f = fr.data && fr.data.friends.find(x => x.id === d.id); if (!f || !f.online) return; // Ranked as well when it can be played: pick, else Standard at once
        if (rankedAllowed()) { fr.pick = fr.pick === d.id ? '' : d.id; fr.more = ''; drawFriends(); } else { openDrop(''); frInvite(f, false); } return; }
      if (d.act === 'inv-std' || d.act === 'inv-rk') { const f = fr.data && fr.data.friends.find(x => x.id === d.id); fr.pick = ''; if (f) { openDrop(''); frInvite(f, d.act === 'inv-rk'); } return; }
      if (d.act) { await frAct(d.act, d.id); if (fr.thread) drawThread(); else drawFriends(); } // more, remove (twice), mute, accept, decline, cancel: the game's frAct
    });
    $('dd-friends').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'fr-tag') { const v = e.target.value.trim(); if (v) addFriend({ tag: v }); }
      if (e.key === 'Enter' && e.target.id === 'fr-text') sendDm();
    });

    // Settings: the game's sound and match settings (snd, saveSound), rows of words
    const onoff = (key, lab, on, note = '') => `<span class="lab">${lab}</span><span class="seg"><button class="w" data-set="${key}|1" aria-pressed="${!!on}">On</button><button class="w" data-set="${key}|0" aria-pressed="${!on}">Off</button></span>${note ? `<p class="sn">${note}</p>` : ''}`;
    // Music and Sound effects: a speaker before the slider turns it on or off (owner, 2026-11-09: no On / Off words)
    const spkVol = (key, set, on, v, lab) => `<span class="lab">${lab}</span><span class="vol${on ? '' : ' off'}"><button class="spk" data-set="${set}|${on ? 0 : 1}" aria-pressed="${on}" aria-label="${lab}: ${on ? 'on (turn off)' : 'off (turn on)'}" title="${on ? 'Turn off' : 'Turn on'}">${spkSvg(on)}</button><input type="range" min="0" max="100" step="5" value="${v}" data-vol="${key}" style="--v:${v}%" aria-label="${lab} volume"><b>${v}</b></span>`;
    function drawSettings() {
      if (dd.open !== 'settings') return;
      const fs = !!document.fullscreenElement, fsIco = fs ? '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>' : '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>';
      $('dd-settings').innerHTML = `<h3>Settings</h3>
        ${document.fullscreenEnabled ? `<button class="fs-big" data-set="fs|${fs ? 0 : 1}" aria-pressed="${fs}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6">${fsIco}</svg>${fs ? 'Leave full screen' : 'Full screen'}</button>` : ''}
        <span class="k">Sound</span><div class="set">${spkVol('vol', 'music', musicOn(), snd.vol, 'Music')}${spkVol('sfxVol', 'sfx', !!snd.sfx && snd.sfxVol > 0, snd.sfxVol, 'Sound effects')}
          ${navigator.audioSession ? `<span class="lab">Other apps</span><span class="seg"><button class="w" data-set="solo|0" aria-pressed="${!snd.solo}">Keep playing</button><button class="w" data-set="solo|1" aria-pressed="${!!snd.solo}">Pause them</button></span><p class="sn">Pause them: plays even on silent.</p>` : ''}</div>
        ${PC() ? `<span class="k">Match screen</span><div class="set"><span class="lab">Deploy panel</span><span class="seg"><button class="w" data-set="dside|0" aria-pressed="${dSide === 'left'}">Left</button><button class="w" data-set="dside|1" aria-pressed="${dSide === 'right'}">Right</button></span><p class="sn">Where your gold, the shop and READY sit in a match.</p>${onoff('dauto', 'Slides away', dAuto, dAuto ? 'It tucks to its side when your pointer leaves it, and comes back when you point at that side.' : 'Always shown.')}</div>` : ''}
        <span class="k">Vs computer</span><div class="set">${onoff('tm', 'Deploy timer', timerOn, timerOn ? 'A countdown while you deploy, as online.' : 'No countdown: take your time.')}</div>
        <span class="k">Online matches</span><div class="set">${onoff('chat', 'Chat', snd.chatOn !== false)}${onoff('emo', 'Emotes', snd.emotesOn !== false)}</div>
        <span class="k">This device</span><div class="set">${onoff('stay', 'Stay logged in', staying(), staying() ? 'You stay logged in on this device.' : `You’re logged out when you close the browser.${acct && !acct.google ? ' A guest can’t log back in: sign up with Google first.' : ''}`)}</div>
        ${devMode() ? `<span class="k" style="color:#FF5FC4">Developer</span><div class="set">${onoff('rk', 'Ranked play', home.rankedOn === true, '<span id="rk-msg">For everyone, not only developers.</span>')}</div>` : ''}
        <div class="set-foot"><button class="lnk" id="mp-open2" data-playlists>Playlists</button><button class="lnk" id="bug-open" data-bug>Report a bug</button></div>
        <p class="hint" style="opacity:.55">In a match, Settings also has the 2D or 3D board and its quality.</p>`;
    }
    $('dd-settings').addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if ('playlists' in b.dataset) { openDrop(''); if (!body.classList.contains('music-open')) openMusic(); return; }
      if ('bug' in b.dataset) { openDrop(''); openBugSheet(); return; }
      if (!b.dataset.set) return;
      const [k, v] = b.dataset.set.split('|'), on = v === '1';
      if (k === 'music') { setMusic(on); if (musicOn()) { menuPaused = false; mine.paused = false; syncMusic(); } showPlayer(); }
      else if (k === 'sfx') { snd.sfx = on; if (on && !snd.sfxVol) snd.sfxVol = DEFAULT_SFX_VOL; saveSound(); wakeAudio(true); }
      else if (k === 'solo') { snd.solo = on; saveSound(); setAudioSession(); wakeAudio(true); }
      else if (k === 'chat') { snd.chatOn = on; saveSound(); if (!on) { talk.tick = []; tickDraw(); } }
      else if (k === 'emo') { snd.emotesOn = on; saveSound(); }
      else if (k === 'stay') setStay(on);
      else if (k === 'fs') { try { if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen(); else if (!on && document.fullscreenElement) await document.exitFullscreen(); } catch (er) {} }
      else if (k === 'dside') setDeploySide(on ? 'right' : 'left', true);
      else if (k === 'dauto') setDeployAuto(on);
      else if (k === 'tm') timerOn = on; // the old PLAY popup's Deploy timer vs AI (for this visit, as there)
      else if (k === 'rk') { const r = await acctCall('ranked', { on }, true); if (r.status === 200) home.rankedOn = !!r.on; drawSettings();
        if ($('rk-msg')) $('rk-msg').textContent = r.status !== 200 ? (r.status === 403 ? 'Only a developer can do that.' : acctFail(r)) : r.on ? 'Ranked is on for everyone.' : 'Ranked is off for players (developers can still play it).'; drawKinds(); return; }
      drawSettings();
    });
    // the full-screen icon next to Settings (owner, 2026-11-08)
    const fsBtn = $('dio-fs'); fsBtn.hidden = !document.fullscreenEnabled;
    const fsDraw = () => { const on = !!document.fullscreenElement; fsBtn.setAttribute('aria-pressed', String(on)); fsBtn.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen'); fsBtn.title = on ? 'Leave full screen' : 'Full screen'; };
    fsBtn.addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (er) {} });
    fsDraw();
    document.addEventListener('fullscreenchange', () => { fsDraw(); if (dd.open === 'settings') drawSettings(); }); // (Esc leaves full screen too)
    $('dd-settings').addEventListener('input', (e) => {
      const k = e.target.dataset.vol; if (!k) return;
      const v = +e.target.value; e.target.style.setProperty('--v', v + '%'); e.target.nextElementSibling.textContent = v;
      if (k === 'vol') { snd.vol = v; if (v && snd.muted) { snd.muted = false; wakeAudio(true); } saveSound(); Object.values(music).forEach(pl => { if (pl.playing) pl.ramp(musicLevel(), 0.05); }); syncMusic(); }
      else { snd.sfxVol = v; if (v && !snd.sfx) snd.sfx = true; saveSound(); }
    });
    $('dd-settings').addEventListener('change', (e) => { if (e.target.dataset.vol === 'sfxVol') sfx('button'); if (e.target.dataset.vol) drawSettings(); }); // a sample at the new volume; the speaker follows (0 is off)
    function openDrop(which) {
      for (const k of ['friends', 'settings']) { const on = k === which; $('dd-' + k).hidden = !on; ddBtn[k].setAttribute('aria-expanded', on); }
      dd.open = which || ''; dio.frOpen = which === 'friends';
      if (which !== 'friends') { $('dd-friends').innerHTML = ''; fr.thread = null; dd.several = null; } // (no stray #fr-msg, #acct-google)
      if (which === 'friends') { fr.msg = ''; fr.more = ''; fr.pick = ''; drawFriends(); if (frOk()) frLoad(); }
      if (which === 'settings') drawSettings(); else $('dd-settings').innerHTML = '';
      if (which) closeMusic();
    }
    for (const k of ['friends', 'settings']) { ddBtn[k].setAttribute('aria-haspopup', 'true'); ddBtn[k].setAttribute('aria-expanded', 'false'); ddBtn[k].addEventListener('click', () => openDrop(dd.open === k ? '' : k)); }
    addEventListener('pointerdown', (e) => { if (dio.shown && dd.open && !e.target.closest('.drop') && !e.target.closest('.acct') && !e.target.closest('#sheet-back')) openDrop(''); });

    // ── the music player and its playlists, on the game's music engine (the old menu player: wirePlayer, the panel: mpDraw).
    // The player: the song playing, Back / Play-Pause / Next, the progress line (#mp-bar, the game's timer moves it).
    // PLAYLIST (#mp-now) grows the list up out of it: tabs Menu playlist, All music, your own (myMusic) and + New;
    // the songs of a tab (a click plays from there: playFrom); Shuffle, Repeat; your own: Edit, Delete (twice) ──
    const pl = { tab: '', edit: null, sure: '' };
    const songOf = (id) => SONGS[id] ? `${esc(SONGS[id].title)} <em>by ${esc(SONGS[id].artist || ARTIST)}</em>` : '';
    const eqH = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';
    function drawPlayer() {
      $('dmp-label').textContent = nowLabel().replace('Menu Playlist', 'Menu playlist');
      $('dmp-title').innerHTML = songOf(ctlPl().song()) || 'Music';
      $('mp-now').setAttribute('aria-expanded', String(body.classList.contains('music-open')));
      body.classList.toggle('mp-playing', menuPlaying());
    }
    function drawList() {
      if (!body.classList.contains('music-open')) { $('pl').innerHTML = ''; return; }
      const tabs = mpTabs().filter(t => t !== 'map'), on = playingSrc(), cur = ctlPl().song();
      if (!pl.edit && !tabs.includes(pl.tab)) pl.tab = tabs.includes(on) ? on : tabs[0];
      let h = `<div class="pl-tabs" role="group" aria-label="Playlists">${tabs.map(t => `<button data-tab="${esc(t)}" aria-pressed="${!pl.edit && pl.tab === t}">${t === on ? eqH : ''}${esc(srcName(t).replace('Menu Playlist', 'Menu playlist'))}</button>`).join('')}<button class="new" data-tab="+" aria-pressed="${!!pl.edit}">${pl.edit && pl.edit.id ? 'Edit' : '+ New'}</button></div>`;
      if (pl.edit) { // a playlist of your own: a name, songs from All music in the order you tap them
        const e = pl.edit, n = e.songs.length;
        h += `<input class="pl-name" id="pl-name" maxlength="24" placeholder="Name your playlist" value="${esc(e.name)}" aria-label="Playlist name" autocomplete="off" spellcheck="false">
          <p class="pl-note" id="pl-note">${n ? `${n} song${n === 1 ? '' : 's'}, in the order you tap them.` : 'Tap songs to add them.'} ${acct ? 'Kept on your account.' : 'Kept on this device.'}</p>
          <ol class="pl-list">${pickSongs().map(id => { const k = e.songs.indexOf(id); return `<li><button class="pl-row" data-pick="${id}" aria-pressed="${k >= 0}"><span class="eq"></span><span>${songOf(id)}</span><span class="n">${k >= 0 ? String(k + 1).padStart(2, '0') : ''}</span></button></li>`; }).join('')}</ol>
          <div class="pl-modes"><button data-cancel>Cancel</button><button data-save ${n && e.name.trim() ? '' : 'disabled'}>${e.id ? 'Save' : 'Create'}</button></div>`;
      } else {
        const songs = srcSongs(pl.tab), u = userList(pl.tab);
        h += `<ol class="pl-list">${songs.length ? songs.map((id, i) => `<li><button class="pl-row" data-song="${id}" aria-current="${pl.tab === on && cur === id}">${eqH}<span>${songOf(id)}</span><span class="n">${String(i + 1).padStart(2, '0')}</span></button></li>`).join('') : '<li class="pl-note">No songs in this playlist yet.</li>'}</ol>
          <div class="pl-modes">${u ? `<button data-edit>Edit</button><button data-del class="${pl.sure === pl.tab ? 'sure' : ''}">${pl.sure === pl.tab ? 'Sure? Delete' : 'Delete'}</button>` : ''}<button id="mp-shuffle" aria-pressed="${!!snd.shuffle}">Shuffle</button><button id="mp-repeat" aria-pressed="${!!snd.repeat}">Repeat</button></div>`;
      }
      const typed = $('pl-name') && document.activeElement === $('pl-name');
      const y = body.querySelector('.pl-list') ? body.querySelector('.pl-list').scrollTop : 0;
      $('pl').innerHTML = h;
      if (body.querySelector('.pl-list')) body.querySelector('.pl-list').scrollTop = y;
      if (typed) { $('pl-name').focus(); const v = $('pl-name').value; $('pl-name').setSelectionRange(v.length, v.length); }
    }
    const openMusic = () => { body.classList.toggle('music-open'); pl.edit = null; pl.sure = ''; drawList(); drawPlayer(); };
    const closeMusic = () => { if (!body.classList.contains('music-open')) return; body.classList.remove('music-open'); pl.edit = null; drawList(); drawPlayer(); };
    body.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', openMusic));
    // the controls: what the old menu player's did (wirePlayer)
    $('mp-play').addEventListener('click', () => { if (menuPlaying()) menuPaused = true; else { menuPaused = false; musicGo(music.menu); } syncMusic(); showPlayer(); });
    $('mp-next').addEventListener('click', () => { ctlPl().next(); showPlayer(); });
    $('mp-back').addEventListener('click', () => { ctlPl().back(); showPlayer(); });
    $('pl').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return; const d = b.dataset;
      if (b.id === 'mp-shuffle') { music.menu.shuffle = music.mine.shuffle = snd.shuffle = !snd.shuffle; saveSound(); showPlayer(); return; }
      if (b.id === 'mp-repeat') { snd.repeat = !snd.repeat; music.menu.setRepeat(snd.repeat); music.mine.setRepeat(snd.repeat); saveSound(); showPlayer(); return; }
      if (d.tab === '+') { if (!pl.edit) pl.edit = { id: '', name: `My playlist ${myMusic.lists.length + 1}`, songs: [] }; pl.sure = ''; drawList(); return; }
      if (d.tab) { pl.tab = d.tab; pl.edit = null; pl.sure = ''; drawList(); return; }
      if (d.song) { playFrom(pl.tab, d.song); return; }
      if ('edit' in d) { const u = userList(pl.tab); if (u) { pl.edit = { id: u.id, name: u.name, songs: u.songs.filter(songOk) }; drawList(); } return; }
      if ('del' in d) { if (pl.sure !== pl.tab) { pl.sure = pl.tab; return drawList(); } const u = userList(pl.tab); pl.sure = '';
        if (u) { myMusic.lists = myMusic.lists.filter(x => x !== u); myMusic.gone.push(u.id); musicChanged(); pl.tab = 'all'; musicListsChanged(); } drawList(); return; }
      if (d.pick) { const k = pl.edit.songs.indexOf(d.pick); if (k >= 0) pl.edit.songs.splice(k, 1); else pl.edit.songs.push(d.pick); drawList(); return; }
      if ('cancel' in d) { pl.edit = null; drawList(); return; }
      if ('save' in d) { // as the old panel's Save: up to 20 playlists, saved on the device and the account (musicChanged)
        const e = pl.edit, name = e.name.replace(/\s+/g, ' ').trim().slice(0, 24); if (!name || !e.songs.length) return;
        let u = e.id && myMusic.lists.find(x => x.id === e.id);
        if (u) { u.name = name; u.songs = e.songs.slice(); }
        else { if (myMusic.lists.length >= 20) { $('pl-note').textContent = 'You can have up to 20 playlists. Delete one to make another.'; return; }
          let id; do { id = Math.random().toString(36).slice(2, 10); } while (myMusic.lists.some(x => x.id === id));
          u = { id, name, songs: e.songs.slice() }; myMusic.lists.push(u); }
        pl.edit = null; pl.tab = 'u:' + u.id; musicChanged(); musicListsChanged(); drawList();
      }
    });
    $('pl').addEventListener('input', (e) => { if (e.target.id === 'pl-name' && pl.edit) { pl.edit.name = e.target.value; const sv = body.querySelector('[data-save]'); if (sv) sv.disabled = !(pl.edit.name.trim() && pl.edit.songs.length); } });
    $('pl').addEventListener('keydown', (e) => { if (e.target.id === 'pl-name') { if (e.key === 'Escape') { e.stopPropagation(); pl.edit = null; drawList(); } if (e.key === 'Enter') { const sv = body.querySelector('[data-save]'); if (sv && !sv.disabled) sv.click(); } } });
    drawPlayer();
    addEventListener('keydown', e => { if (e.key === 'Escape' && dio.shown && $('sheet-back').hidden && !typingIn(e.target)) { if (dd.open) return openDrop(''); if (picked) return pickUnit(null); if (!document.getElementById('r-menu').hidden) return tokMenu(false); closeMusic(); goBack(); } }, true); // capture: runs before the game's own Escape, so an open sheet takes the key alone
    addEventListener('pointerdown', e => { if (dio.shown && !e.target.closest('.rsearch')) tokMenu(false); });
    addEventListener('pointerdown', e => { if (dio.shown && body.classList.contains('music-open') && !e.target.closest('.music')) closeMusic(); });
    // states for screenshots: #play, #music, #view=<word>, #pin, #tier=<n>, #unit=<n>, #hover=<piece>
    if (H.includes('play')) { openPlay(); { const v = playView(); now = { ...v, at: [...v.at], off: [...v.off] }; } }
    if (H.includes('multi')) setMp(true);
    const rq = (H.match(/rooms=(\w+)/) || [])[1]; if (rq) { if (!H.includes('play')) { openPlay(); { const v = playView(); now = { ...v, at: [...v.at], off: [...v.off] }; } } openRooms(rq); }
    if (H.includes('filter')) tokMenu(true);
    if (H.includes('create')) openCreate();
    const bq = (H.match(/roombf=(\w+)/) || [])[1]; if (bq) setRoomLook(LOOKS.findIndex(l => l.id === bq));
    if (H.includes('private')) body.querySelector('.newroom [data-pub="0"]').click();
    const plh = (H.match(/plh=(\d+)/) || [])[1]; if (plh) { const r = body.querySelectorAll('.pl-row')[+plh]; if (r) r.classList.add('hov'); } // a song as if pointed at
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
    if (H.includes('history')) { openHistory(); if (H.includes('all')) { histTab = 'all'; histLoadD(false); } }
    const rnq = (H.match(/rounds=(\d)/) || [])[1]; if (rnq) body.querySelectorAll('#h-list > li')[+rnq]?.querySelector('.rd')?.click();
    // Welcome: #welcome, #signup, #login, #invited (came from a friend's link), #tag=<name> (typed), #err (a bad username)
    if (H.includes('welcome') || H.includes('signup') || H.includes('login')) {
      const tg = (H.match(/tag=([^,]*)/) || [])[1]; if (tg !== undefined) home.tag = decodeURIComponent(tg);
      home.screen = H.includes('signup') ? 'signup' : H.includes('login') ? 'login' : 'welcome'; dioPaint();
      if (H.includes('invited')) door.invited = true;
      if (H.includes('err')) { door.err = TAG_BAD; drawSignin(); }
      now = { ...want, at: [...want.at], off: [...want.off] }; }
    // dropdowns: #friends (#friends=requests), #settings
    frBadge();
    { const fq = (H.match(/friends(=\w+)?/) || []); if (fq[0]) { if (fq[1] === '=requests') fr.tab = 'requests'; openDrop('friends'); } }
    if (H.includes('settings')) openDrop('settings');
    // drawHome: follow the game's home state (which screen, the account)
    function dioPaint() {
      if (!sampleAcct && A !== acct) { A = acct; picked = null; buildTier(tier); }
      if (rosterOf !== units) { rosterOf = units; drawTierTabs(); if (!body.querySelector(`.tiers [data-t="${tier}"]`)) tier = 1; picked = null; buildTier(tier); } // the roster changed (a Counter Lab set, Factions)
      drawStandings();
      drawProfile();
      drawPlayer(); // what plays now (after a match the menu's music can come back without a song change)
      const s = home.screen;
      if (s === 'welcome' || s === 'signup' || s === 'login') openDoor(s === 'welcome' ? '' : s);
      else if (door.screen != null) closeDoor();
      drawStay();
      // Rooms is home.screen 'lobby' (the game's openLobby; after a match from Rooms, home.back brings it back)
      if (s === 'lobby') showRooms(); else if (body.classList.contains('in-rooms')) hideRooms();
      drawKinds(); drawDevs();
      // the Play screen follows home.pop (the old popup's flag), on the menu only
      const onMenu = s === 'menu' || !s;
      if (onMenu && home.pop && !body.classList.contains('play') && !body.classList.contains('profile')) openPlay();
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
    let rosterOf = units;
    // after hosting: the room's battlefield was skinPick for the match; your own (pb-skin) comes back at home
    function restoreLook() {
      if (!dio.roomLook) return; dio.roomLook = false;
      skinPick = ''; try { const v = localStorage.getItem('pb-skin') || ''; if (v === 'random' || Game.SKINS.some(x => x.id === v)) skinPick = v; } catch (e) {}
      homeLook = lookIndex(); if (lookI !== homeLook && !body.classList.contains('in-create')) setLook(homeLook, false);
    }
    dio.api = { music: () => { drawPlayer(); if (!pl.edit) drawList(); }, friends: () => { frBadge(); if (dd.open === 'friends' && !fr.thread) drawFriends(); }, history: () => { openProfile(); openHistory(); }, pause, resume: () => { flyEnd(true); restoreLook(); resume(); }, fly: flyStart, flyStop: () => flyEnd(true), flying: () => !!fly, draw: dioPaint, board: () => { drawStandings(); drawKinds(); drawRooms(); }, rooms: drawRooms };
    dioPaint();
    if (dio.shown) resume();
    window.__dio = { ready: true, units: () => rosterHot.map(g => g.userData.u.name), pick: (i) => pickUnit(rosterHot[i] || null) }; if (TEST) { window.__dio.sync = dioSync; window.__dio.pts = () => Object.fromEntries(Object.entries(HOT).map(([k, g]) => [k, k === 'goblins' ? proj(gobDot, 0.3) : proj(g, 0.5)])); window.__dio.cam = () => ({ want: Object.keys(VIEWS).find(k => VIEWS[k] === want) || 'other', el: +now.el.toFixed(2) }); } // the tests: the roster standing; show / hide the home by hand
  }
