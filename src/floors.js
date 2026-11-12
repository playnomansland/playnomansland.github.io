// ===== Painted floors and looks, shared by the 2D page (menu background, look previews) and the 3D board =====
// Moved out of scenery3d.js (2026-11-02) so the main page can paint a look without loading the 3D code.
var Floors = {};
// The painted floors for maps that have no ground of their own (the 3D board only), cached per look and size:
// meadow (dusty greens, trampled earth across no man's land, grass strokes) and sand (warm sand, wind ripples and
// darker drifts across no man's land) and autumn (the meadow turning gold, with fallen leaves). Floors.floor(ctx, W, H, t, floor) paints one.
Floors.FLOORS = {
  meadow: { base: '#5F714C', patch: ['#6A7D53', '#556944', '#718156', '#506343'], mid: ['#776C51', '#6B6248', '#7F7359'], strokes: ['#76895C', '#485B3C'], ripples: false },
  autumn: { base: '#62633E', patch: ['#6E6C3E', '#585B37', '#78693A', '#545634'], mid: ['#776146', '#6B583E', '#816A4B'], strokes: ['#8C7F4A', '#474A2C'], ripples: false, leaves: ['#B8532F', '#C9782F', '#D3A43A', '#9A3B2A'] },
  // Ashlands (2026-11-07): burnt ground, scorched no man's land, grey ash flecks and a few glowing embers
  ash: { base: '#4B4744', patch: ['#55504C', '#423E3B', '#5B5550', '#3D3937'], mid: ['#36312E', '#3F3935', '#2F2B29'], strokes: ['#625B55', '#2C2826'], ripples: false, leaves: ['#7D766F', '#8A827A', '#6B645E', '#7D766F', '#8A827A', '#7D766F', '#C0652C'],
    char: '#2A2523', scorch: 9 }, // no man's land charred dark, with thin cracks still glowing; old blast scorches over the whole board
  // Moonlit Snow: fresh snow under a night sky with wind ripples; no man's land is pale blue ice with cracks and shine
  moonlit: { base: '#8F9BB0', patch: ['#99A5B9', '#8692A8', '#A3AFC2', '#808CA2'], mid: ['#8FB8E0', '#80ADD9', '#9DC2E6'], strokes: ['#AEB9CB', '#6F7B93'], ripples: true, ice: '#76A8DA' },
  // Savanna: pale straw grass with olive patches, red-brown earth trampled across no man's land
  savanna: { base: '#B09A5C', patch: ['#BCA668', '#A08B50', '#C4AE72', '#98884F'], mid: ['#A2724C', '#986A46', '#AC7C54'], strokes: ['#D3BF80', '#7D703F'], ripples: false },
  // Darkwoods (2026-11-07): a mossy forest floor with leaf litter, dappled light, old roots creeping in from both sides
  // and a broken stone road across no man's land
  darkwoods: { base: '#4A5641', patch: ['#536048', '#414C39', '#5A664C', '#3C4635'], mid: ['#4E4A39', '#47432F', '#57513E'], strokes: ['#647452', '#33402D'], ripples: false,
    leaves: ['#6E5C3F', '#7D6A47', '#5C4F38', '#8A7B50', '#4F5A3A'], leafN: 2.5, roots: '#3B3026', road: '#7E8374', dapple: '#F2E8B8' },
  // Snow (2026-11-07): a glacier pass in hard daylight. No man's land is a turquoise glacier sheet (glacier: [deep,
  // pale]) with frozen bubbles and polished shine; the deploy zones are wind-packed snow carved into
  // sharp sastrugi that all run the wind's way (wind: its direction on the canvas, x right, y down toward your end);
  // frozen: something huge lies frozen under the ice in the middle (a woolly mammoth)
  glacier: { base: '#EEF3F8', patch: ['#F4F8FB', '#DDE7F1', '#F8FAFD', '#D7E3EF'], mid: ['#5FAED6', '#4A9BCB', '#79C2E0'], strokes: ['#FFFFFF', '#9DB3CB'], ripples: false,
    glacier: ['#3F8FC4', '#8FD3E8'], wind: [1, -0.35], frozen: 'mammoth' },
  // the Hollow (the Mommy boss's lair, 2026-11-12): the floor of a sinkhole in an old forest. Packed dusty earth, dry
  // leaves fallen from the rim, roots creeping in from both walls, a warm pool of light from the hole above (pool:
  // colour), and silk strands drifting over the ground, thicker toward her end (silk: colour)
  hollow: { base: '#54473A', patch: ['#5C4F40', '#4A3F33', '#635545', '#463B30'], mid: ['#4A3E31', '#43382C', '#524536'], strokes: ['#6A5A47', '#3A3027'], ripples: false,
    leaves: ['#7A5A3A', '#8C6B44', '#5E4730', '#9A7B4E', '#6B5236'], leafN: 1.3, roots: '#3A2D22', pool: '#F2D69C', silk: '#EEE6D8' },
  sand: { base: '#B39A6C', patch: ['#BDA478', '#A88F62', '#C2AA7E', '#A38A5F'], mid: ['#9E8457', '#A78D60', '#94794E'], strokes: ['#C9B288', '#8F7650'], ripples: true },
};
// Looks: what each draws (its biome round the board, and its floor: one painted here, or a map's painted ground in the
// 2D renderer, bg). A map with skins (Game.SKINS) takes the match's pick (m.skin); every map has its own look too.
Floors.LOOKS = {
  meadow: { biome: 'meadow', floor: 'meadow' }, autumn: { biome: 'autumn', floor: 'autumn' }, desert: { biome: 'desert', floor: 'sand' },
  snow: { biome: 'snow', floor: 'glacier' }, frost: { biome: 'frost', floor: 'darkwoods' }, forest: { biome: 'forest', bg: 'forest' }, cavern: { biome: 'cavern', bg: 'cavern' },
  ash: { biome: 'ash', floor: 'ash' }, moonlit: { biome: 'moonlit', floor: 'moonlit' }, savanna: { biome: 'savanna', floor: 'savanna' },
  hollow: { biome: 'hollow', floor: 'hollow' }, // the Mommy boss's lair (Floors.lookOf gives it to every boss run; not a pickable look)
};
// (the Mommy boss puzzle is always drawn in her lair, the Hollow, whatever look is picked; kept out of Game.lookOf so the
// game's rules, the server and the music don't change)
Floors.lookOf = (src) => { if (src && src.boss) return 'hollow'; const k = Game.lookOf(src); return Floors.LOOKS[k] ? k : 'meadow'; };
Floors.floor = (() => {
  const cache = {};
  return (ctx, W, H, t, look) => {
    const L = Floors.FLOORS[look]; if (!L) return false;
    const key = W + 'x' + H + ':' + Game.ROWS + ':' + Game.ZONE + (L.frozen && Floors.frozen ? ':f' : ''); // (repainted once the frozen mammoth's picture is there)
    if (!cache[look] || cache[look].key !== key) {
      const oc = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
      oc.width = Math.round(W * dpr); oc.height = Math.round(H * dpr);
      const c = oc.getContext('2d'); c.scale(dpr, dpr);
      let sd = 99991; const rr = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
      c.fillStyle = L.base; c.fillRect(0, 0, W, H);
      const blob = (x, y, rx, ry, col, a) => { const g = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); g.addColorStop(0, col); g.addColorStop(1, col + '00');
        c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, rr() * 3, 0, Math.PI * 2); c.fill(); };
      for (let k = 0; k < 70; k++) blob(rr() * W, rr() * H, t * (0.8 + rr() * 2.2), t * (0.6 + rr() * 1.6), L.patch[k % 4], 0.55);
      // no man's land: trampled earth, or darker drifts of sand
      const y0 = Game.ZONE * t, y1 = (Game.ROWS - Game.ZONE) * t;
      if (L.glacier) Floors.glacier(c, W, H, t, y0, y1, L, rr, blob); else { // (the glacier paints its own way, below)
      if (L.scorch) { // faint old blast scorches anywhere on the board: a dark smudge, a paler ring of thrown ash
        for (let k = 0; k < L.scorch; k++) {
          const x = rr() * W, y = rr() * H, r = t * (0.5 + rr() * 0.9), g = c.createRadialGradient(x, y, 0, x, y, r * 1.5);
          g.addColorStop(0, 'rgba(18,14,12,0.42)'); g.addColorStop(0.55, 'rgba(24,20,18,0.22)'); g.addColorStop(0.75, 'rgba(120,112,104,0.12)'); g.addColorStop(1, 'rgba(120,112,104,0)');
          c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.5, 0, Math.PI * 2); c.fill();
        }
      }
      if (L.char) { // charred ground over no man's land, soft at its edges, then cracks with a faint glow
        const g = c.createLinearGradient(0, y0 - t * 0.3, 0, y1 + t * 0.3), e = t * 0.6 / (y1 - y0 + t * 0.6);
        g.addColorStop(0, L.char + '00'); g.addColorStop(e, L.char); g.addColorStop(1 - e, L.char); g.addColorStop(1, L.char + '00');
        c.globalAlpha = 0.85; c.fillStyle = g; c.fillRect(0, y0 - t * 0.3, W, y1 - y0 + t * 0.6); c.globalAlpha = 1;
      }
      if (L.ice) { // a sheet of ice over no man's land, soft at its edges
        const g = c.createLinearGradient(0, y0 - t * 0.3, 0, y1 + t * 0.3), e = t * 0.6 / (y1 - y0 + t * 0.6);
        g.addColorStop(0, L.ice + '00'); g.addColorStop(e, L.ice); g.addColorStop(1 - e, L.ice); g.addColorStop(1, L.ice + '00');
        c.globalAlpha = 0.88; c.fillStyle = g; c.fillRect(0, y0 - t * 0.3, W, y1 - y0 + t * 0.6); c.globalAlpha = 1;
      }
      for (let k = 0; k < 55; k++) blob(rr() * W, y0 + rr() * (y1 - y0), t * (0.6 + rr() * 1.5), t * (0.4 + rr() * 0.8), L.mid[k % 3], 0.5);
      if (L.char) { // glowing cracks: a soft orange haze under a thin bright line, branching across the charred band
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (let k = 0; k < W / t * 0.9; k++) {
          const pts = []; let x = rr() * W, y = y0 + t * 0.4 + rr() * (y1 - y0 - t * 0.8), a = rr() * 6.3;
          pts.push([x, y]); for (let s2 = 0; s2 < 5 + rr() * 6; s2++) { a += (rr() - 0.5) * 1.3; x += Math.cos(a) * t * 0.3; y = Math.min(y1, Math.max(y0, y + Math.sin(a) * t * 0.2)); pts.push([x, y]); }
          for (const [col, wd, al] of [['#8A3A1C', t * 0.1, 0.12], ['#B8582A', t * 0.035, 0.28], ['#D98A50', 0.8, 0.38]]) {
            c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.stroke();
          }
        }
        c.globalAlpha = 1;
      }
      if (L.ice) {
        c.lineCap = 'round';
        for (let k = 0; k < W / t * 3; k++) { // shine: long pale diagonal streaks
          const x = rr() * W, y = y0 + rr() * (y1 - y0), l = t * (0.8 + rr() * 2);
          c.globalAlpha = 0.18 + rr() * 0.15; c.strokeStyle = '#EAF4FC'; c.lineWidth = t * (0.04 + rr() * 0.08);
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y - l * 0.35); c.stroke();
        }
        for (let k = 0; k < W / t * 2.2; k++) { // cracks: thin branching zigzags
          let x = rr() * W, y = y0 + t * 0.3 + rr() * (y1 - y0 - t * 0.6), a = rr() * 6.3;
          c.globalAlpha = 0.35 + rr() * 0.2; c.strokeStyle = rr() < 0.5 ? '#F2F8FD' : '#7E9DBA'; c.lineWidth = 0.7 + rr() * 0.6;
          c.beginPath(); c.moveTo(x, y);
          for (let s = 0; s < 4 + rr() * 4; s++) { a += (rr() - 0.5) * 1.4; x += Math.cos(a) * t * 0.35; y += Math.sin(a) * t * 0.25; y = Math.min(y1, Math.max(y0, y)); c.lineTo(x, y); }
          c.stroke();
        }
      }
      c.lineCap = 'round';
      if (L.ripples) { // wind ripples: long soft wavy lines, light over dark
        for (let k = 0; k < H / t * 9; k++) {
          const y = rr() * H, x0 = rr() * W - t * 2, len = t * (1.5 + rr() * 3), amp = t * 0.06, ph = rr() * 6;
          if (L.ice && y > y0 && y < y1) continue; // no wind ripples on the ice
          for (const [col, dy, a] of [[L.strokes[1], t * 0.035, 0.22], [L.strokes[0], 0, 0.3]]) {
            c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 1 + rr() * 0.6; c.beginPath();
            for (let s = 0; s <= 1.0001; s += 0.1) { const x = x0 + s * len, yy = y + dy + Math.sin(ph + s * 5) * amp; s ? c.lineTo(x, yy) : c.moveTo(x, yy); }
            c.stroke();
          }
        }
      } else { // painted grass strokes
        for (let k = 0; k < W * H / (t * t) * 14; k++) {
          const x = rr() * W, y = rr() * H, l = t * (0.06 + rr() * 0.1);
          c.globalAlpha = 0.25 + rr() * 0.25; c.strokeStyle = rr() < 0.5 ? L.strokes[0] : L.strokes[1]; c.lineWidth = 0.8 + rr() * 0.8;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rr() - 0.5) * l * 0.6, y - l); c.stroke();
        }
      }
      if (L.dapple) for (let k = 0; k < W * H / (t * t) * 0.12; k++) blob(rr() * W, rr() * H, t * (0.5 + rr() * 1.1), t * (0.3 + rr() * 0.6), L.dapple, 0.07 + rr() * 0.06); // light through the canopy
      if (L.road) { // an old road of worn flat stones across the middle of no man's land, half sunk, mossy, many missing
        const yc = (y0 + y1) / 2;
        for (let x = -t * 0.2; x < W + t * 0.2; x += t * (0.32 + rr() * 0.12)) {
          const wave = Math.sin(x / t * 0.7) * t * 0.35;
          for (let row = -1; row <= 1; row++) {
            if (rr() < 0.42) continue;
            const r = t * (0.13 + rr() * 0.07), sx = x + (rr() - 0.5) * t * 0.1, sy = yc + wave + row * t * 0.34 + (rr() - 0.5) * t * 0.08, a = rr() * 3;
            const stone = () => { c.beginPath(); for (let i = 0; i < 7; i++) { const an = i / 7 * Math.PI * 2, rad = r * (0.82 + rr() * 0.3); const px = sx + Math.cos(an + a) * rad, py = sy + Math.sin(an + a) * rad * 0.8; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); };
            c.globalAlpha = 0.35; c.fillStyle = '#1E2219'; c.save(); c.translate(t * 0.025, t * 0.035); stone(); c.fill(); c.restore();
            c.globalAlpha = 0.55 + rr() * 0.25; c.fillStyle = L.road; stone(); c.fill();
            c.globalAlpha = 0.22; c.fillStyle = '#DCDFD0'; c.beginPath(); c.ellipse(sx - r * 0.25, sy - r * 0.25, r * 0.45, r * 0.3, a, 0, Math.PI * 2); c.fill();
            if (rr() < 0.6) { c.globalAlpha = 0.55; c.fillStyle = L.patch[2]; c.beginPath(); c.ellipse(sx + (rr() - 0.5) * r, sy + r * 0.3, r * 0.5, r * 0.3, rr() * 3, 0, Math.PI * 2); c.fill(); } // moss
          }
        }
      }
      if (L.roots) for (const left of [true, false]) for (let k = 0; k < H / t * 0.45; k++) { // old roots creeping in from the woods on both sides
        let x = left ? -t * 0.1 : W + t * 0.1, y = t + rr() * (H - 2 * t), a = (left ? 0 : Math.PI) + (rr() - 0.5) * 0.9, wd = t * (0.12 + rr() * 0.08);
        const len = t * (1.2 + rr() * 2.4), steps = 14, pts = [];
        for (let i = 0; i <= steps; i++) { pts.push([x, y, wd * (1 - i / steps * 0.85)]); a += (rr() - 0.5) * 0.35; x += Math.cos(a) * len / steps; y += Math.sin(a) * len / steps; }
        c.lineCap = 'round';
        for (const [col, dx, dy, f, al] of [['#161A13', t * 0.03, t * 0.045, 1.15, 0.45], [L.roots, 0, 0, 1, 0.95], ['#7A6A55', -t * 0.015, -t * 0.02, 0.3, 0.5]])
          for (let i = 1; i < pts.length; i++) { c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = Math.max(0.6, pts[i][2] * f); c.beginPath(); c.moveTo(pts[i - 1][0] + dx, pts[i - 1][1] + dy); c.lineTo(pts[i][0] + dx, pts[i][1] + dy); c.stroke(); }
      }
      if (L.leaves) for (let k = 0; k < W * H / (t * t) * 5 * (L.leafN || 1); k++) { // fallen leaves: small dabs in red, orange and gold, in drifts
        const x = rr() * W, y = rr() * H, r = t * (0.035 + rr() * 0.03);
        c.globalAlpha = 0.5 + rr() * 0.35; c.fillStyle = L.leaves[Math.floor(rr() * L.leaves.length)];
        c.beginPath(); c.ellipse(x, y, r, r * 0.6, rr() * 3, 0, Math.PI * 2); c.fill();
      }
      if (L.pool) { // the light from the hole above: one wide warm pool on the middle of the board, a little toward her end
        const px = W * 0.5, py = H * 0.44, r = Math.max(W, H) * 0.42, g = c.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, L.pool); g.addColorStop(0.55, L.pool + '66'); g.addColorStop(1, L.pool + '00');
        c.globalAlpha = 0.2; c.fillStyle = g; c.fillRect(0, 0, W, H);
      }
      if (L.silk) { // silk drifting over the ground: long loose strands (more toward her end, the top), and a few small cobweb tufts
        c.lineCap = 'round';
        for (let k = 0; k < W / t * 7; k++) {
          const y = H * Math.pow(rr(), 1.6) * 0.8, x = rr() * W, l = t * (0.8 + rr() * 2.2), a = (rr() - 0.5) * 1.2, bend = (rr() - 0.5) * t * 0.6;
          c.globalAlpha = 0.1 + rr() * 0.16; c.strokeStyle = L.silk; c.lineWidth = 0.5 + rr() * 0.7;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 - Math.sin(a) * bend, y + Math.sin(a) * l * 0.5 + Math.cos(a) * bend, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
        }
        for (let k = 0; k < W / t * 1.4; k++) {
          const x = rr() * W, y = H * Math.pow(rr(), 1.4) * 0.75, r = t * (0.15 + rr() * 0.25), n = 6 + Math.floor(rr() * 4);
          c.globalAlpha = 0.16 + rr() * 0.12; c.strokeStyle = L.silk; c.lineWidth = 0.6;
          c.beginPath(); for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2 + rr() * 0.3; c.moveTo(x, y); c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r * 0.8); } c.stroke();
          c.beginPath(); for (let i = 0; i <= n; i++) { const an = i / n * Math.PI * 2, q = r * 0.55; i ? c.lineTo(x + Math.cos(an) * q, y + Math.sin(an) * q * 0.8) : c.moveTo(x + q, y); } c.stroke();
        }
      }
      }
      c.globalAlpha = 1;
      cache[look] = { key, cv: oc };
    }
    ctx.drawImage(cache[look].cv, 0, 0, W, H);
    return true;
  };
})();
// The Snow look's floor (2026-11-07): wind-packed snow with sastrugi in the deploy zones, a glacier across no man's
// land (y0 to y1). c: the canvas context (in CSS pixels), t: a tile in pixels, rr: the floor's seeded random numbers,
// blob(x, y, rx, ry, colour, alpha): a soft round patch.
Floors.glacier = (c, W, H, t, y0, y1, L, rr, blob) => {
  const [deep, pale] = L.glacier, wl = Math.hypot(L.wind[0], L.wind[1]), wx = L.wind[0] / wl, wy = L.wind[1] / wl, wa = Math.atan2(wy, wx);
  const inBand = (y, m = 0) => y > y0 - m && y < y1 + m;
  // the snow: long faint wind streaks, all one way
  for (let k = 0; k < W * H / (t * t) * 1.2; k++) {
    const x = rr() * W, y = rr() * H; if (inBand(y, t * 0.2)) continue;
    c.globalAlpha = 0.07 + rr() * 0.07; c.fillStyle = rr() < 0.5 ? '#FFFFFF' : L.strokes[1];
    c.beginPath(); c.ellipse(x, y, t * (0.8 + rr() * 1.6), t * (0.05 + rr() * 0.08), wa + (rr() - 0.5) * 0.06, 0, Math.PI * 2); c.fill();
  }
  // the glacier: deep turquoise, soft where the snow blows over its edges, mottled pale and deep
  const e = t * 0.35, g = c.createLinearGradient(0, y0 - e, 0, y1 + e), f = e * 2 / (y1 - y0 + 2 * e);
  g.addColorStop(0, deep + '00'); g.addColorStop(f, deep); g.addColorStop(1 - f, deep); g.addColorStop(1, deep + '00');
  c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, y0 - e, W, y1 - y0 + 2 * e);
  const by = () => y0 + t * 0.15 + rr() * (y1 - y0 - t * 0.3);
  for (let k = 0; k < W / t * 9; k++) blob(rr() * W, by(), t * (0.5 + rr() * 1.6), t * (0.3 + rr() * 0.8), rr() < 0.45 ? pale : L.mid[k % 3], 0.35 + rr() * 0.3);
  for (let k = 0; k < W / t * 2; k++) blob(rr() * W, by(), t * (0.4 + rr() * 1.1), t * (0.25 + rr() * 0.5), '#2A6FA6', 0.3); // deeper ice
  // something huge frozen in the middle, deep under the ice: a mammoth, only a faint blurred shadow far down
  // (Floors.frozen: the game's War Mammoth model drawn as a side-on silhouette, made by the 3D board; without it, as
  // in the 2D look previews, nothing)
  if (L.frozen === 'mammoth' && Floors.frozen) {
    const im = Floors.frozen, w = t * 4.6, h = w * im.height / im.width, cx = W / 2 + t * 0.3, cy = (y0 + y1) / 2 + t * 0.1;
    c.save(); c.translate(cx, cy); c.rotate(-0.09);
    c.filter = `blur(${Math.max(1.5, t * 0.25)}px)`; c.globalAlpha = 0.16; c.drawImage(im, -w * 0.53, -h * 0.53, w * 1.06, h * 1.06); // the murk round it
    c.filter = `blur(${Math.max(1, t * 0.045)}px)`; c.globalAlpha = 0.3; c.drawImage(im, -w / 2, -h / 2, w, h); // its shape
    c.restore(); c.filter = 'none';
    for (let k = 0; k < 12; k++) blob(cx + (rr() - 0.5) * t * 5, cy + (rr() - 0.5) * t * 2, t * (0.5 + rr()), t * (0.3 + rr() * 0.4), pale, 0.14); // ice over it
  }
  // frozen bubbles in clusters
  for (let k = 0; k < W / t * 3.5; k++) {
    const cx = rr() * W, cy = by(), n = 4 + Math.floor(rr() * 10);
    for (let i = 0; i < n; i++) {
      const x = cx + (rr() - 0.5) * t * 0.6, y = cy + (rr() - 0.5) * t * 0.4, r = t * (0.015 + rr() * 0.04);
      c.globalAlpha = 0.16; c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.45; c.strokeStyle = '#E6F7FC'; c.lineWidth = Math.max(0.5, r * 0.3); c.stroke();
      c.globalAlpha = 0.75; c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2); c.fill();
    }
  }
  // polished shine: long pale streaks, all at the sun's angle, some in bundles
  c.lineCap = 'round';
  for (let k = 0; k < W / t * 2.2; k++) {
    const x = rr() * W, y = by(), l = t * (0.8 + rr() * 2.6), n = rr() < 0.4 ? 2 + Math.floor(rr() * 2) : 1;
    for (let i = 0; i < n; i++) {
      c.globalAlpha = 0.16 + rr() * 0.2; c.strokeStyle = '#F4FCFF'; c.lineWidth = t * (0.03 + rr() * 0.09);
      const ox = i * t * 0.12, oy = i * t * 0.1; c.beginPath(); c.moveTo(x + ox, y + oy); c.lineTo(x + ox + l, y + oy - l * 0.42); c.stroke();
    }
  }
  // spindrift tongues blown over the glacier's edges and a few across it
  for (let k = 0; k < W / t * 3; k++) {
    const edge = rr() < 0.8, y = edge ? (rr() < 0.5 ? y0 : y1) + (rr() - 0.5) * t * 0.7 : by();
    c.globalAlpha = edge ? 0.35 + rr() * 0.25 : 0.18; c.fillStyle = '#F2F7FB';
    c.beginPath(); c.ellipse(rr() * W, y, t * (0.3 + rr() * 0.8), t * (0.04 + rr() * 0.07), wa + (rr() - 0.5) * 0.08, 0, Math.PI * 2); c.fill();
  }
  // sastrugi: sharp wind-carved ridges in the snow, a lit crest and a blue shadow, all pointing the wind's way
  const px = -wy, py = wx; // across the wind (the shadow side: the sun is up-left)
  for (let k = 0; k < W * H / (t * t) * 9; k++) {
    const x = rr() * W, y = rr() * H; if (inBand(y, t * 0.25)) continue;
    const l = t * (0.18 + rr() * 0.55), w = t * (0.025 + rr() * 0.045), j = (rr() - 0.5) * 0.12, dx = Math.cos(wa + j), dy = Math.sin(wa + j);
    const ridge = (o, ww) => { c.beginPath(); c.moveTo(x - dx * l * 0.5 + px * o, y - dy * l * 0.5 + py * o);
      c.quadraticCurveTo(x - dx * l * 0.25 + px * (o + ww), y - dy * l * 0.25 + py * (o + ww), x + dx * l * 0.5 + px * o, y + dy * l * 0.5 + py * o);
      c.quadraticCurveTo(x - dx * l * 0.2 + px * (o - ww * 0.2), y - dy * l * 0.2 + py * (o - ww * 0.2), x - dx * l * 0.5 + px * o, y - dy * l * 0.5 + py * o); c.fill(); };
    c.globalAlpha = 0.3 + rr() * 0.15; c.fillStyle = '#86A0C0'; ridge(w * 0.6, w * 1.4);
    c.globalAlpha = 0.65; c.fillStyle = '#FFFFFF'; ridge(-w * 0.2, -w * 1.1);
  }
  c.globalAlpha = 1;
};
