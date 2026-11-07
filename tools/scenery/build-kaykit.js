// Builds src/kaykit3d.js: a few KayKit models (CC0, Kay Lousberg) as compact flat-coloured geometry for Models3D:
// from the Dungeon Pack the treasury's gold chest and coin stacks and the towers' wall torch; from Holiday Bits the
// presents of Moonlit Snow's treasury and its snowmen and lanterns; Ashlands' burnt village ruins (Dungeon Pack) and
// its dragon (Quaternius' Animated Monster Pack, CC0: an OBJ, coloured from its MTL materials); Savanna's acacias (Quaternius'
// Simple Nature Pack, CC0: OBJs). KayKit colours its models from a palette texture, so each triangle takes the
// colour under the middle of its texture coordinates.
//   node tools/scenery/build-kaykit.js <Assets/gltf folder> [<another pack's Assets/gltf (or OBJ) folder> ...]
// Each picked model is read from the first folder that has it; models no folder has keep their entry from the
// current src/kaykit3d.js, so one pack can be rebuilt without the other.
// Needs (in tools/scenery): npm i @gltf-transform/core sharp
// Output: KAYKIT = { name: [base64 positions (Int16 x3 per corner over lo..hi), base64 colours (RGB per triangle), lo, hi] }
const path = require('path'), fs = require('fs');
const { NodeIO } = require('@gltf-transform/core');
const sharp = require('sharp');
const SRCS = process.argv.slice(2);
if (!SRCS.length) { console.error('usage: node build-kaykit.js <KayKit Assets/gltf folder> [...]'); process.exit(1); }
const OUT = path.join(__dirname, '..', '..', 'src', 'kaykit3d.js');
const PICK = ['chest_gold', 'coin_stack_medium', 'coin_stack_small', 'torch_mounted', // Dungeon Pack
  'present_A_red', 'present_B_green', 'present_C_blue', 'present_D_white', 'present_E_yellow', 'present_F_red', // Holiday Bits
  'present_sphere_A_green', 'present_B_yellow', 'present_C_red', 'present_E_blue', 'snowman_A', 'lantern',
  'wall_broken', 'wall_archedwindow_open', 'wall_half', 'pillar', 'rubble_large', 'rubble_half', 'stairs', 'sword_shield_broken', 'barrier_half', // Dungeon Pack (Ashlands)
  'Dragon', // Animated Monster Pack (Ashlands)
  'acacia_A', 'acacia_B', 'acacia_C']; // Simple Nature Pack (Quaternius, CC0; Savanna): Tree2, Tree4 and Tree3 renamed, with acacia.mtl's savanna colours
// an OBJ with its MTL: triangles (faces fanned) with their material's diffuse colour (linear in the MTL, stored as sRGB)
function readObj(file) {
  const dir = path.dirname(file), txt = fs.readFileSync(file, 'utf8'), v = [], pos = [], col = [], kd = {};
  const mtl = (txt.match(/^mtllib\s+(.+)$/m) || [])[1];
  if (mtl) { let cur; for (const l of fs.readFileSync(path.join(dir, mtl.trim()), 'utf8').split(/\r?\n/)) { const t = l.trim().split(/\s+/); if (t[0] === 'newmtl') cur = t[1]; else if (t[0] === 'Kd') kd[cur] = t.slice(1, 4).map(Number); } }
  const srgb = (c) => Math.round(255 * Math.min(1, c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
  let rgb = [200, 200, 200];
  for (const l of txt.split(/\r?\n/)) {
    const t = l.trim().split(/\s+/);
    if (t[0] === 'v') v.push(t.slice(1, 4).map(Number));
    else if (t[0] === 'usemtl') rgb = (kd[t[1]] || [0.8, 0.8, 0.8]).map(srgb);
    else if (t[0] === 'f') { const ix = t.slice(1).map((w) => { const i = parseInt(w.split('/')[0], 10); return i < 0 ? v.length + i : i - 1; });
      for (let k = 1; k + 1 < ix.length; k++) { for (const j of [ix[0], ix[k], ix[k + 1]]) pos.push(...v[j]); col.push(...rgb); } }
  }
  return { pos, col };
}

// positions quantized to Int16 over their bounds, colours as RGB bytes per triangle
function pack(pos, col) {
  const lo = [0, 1, 2].map(d => Math.min(...pos.filter((_, i) => i % 3 === d))), hi = [0, 1, 2].map(d => Math.max(...pos.filter((_, i) => i % 3 === d)));
  const q = new Int16Array(pos.length); pos.forEach((v, i) => { const d = i % 3; q[i] = Math.round((v - lo[d]) / ((hi[d] - lo[d]) || 1) * 65534) - 32767; });
  return [Buffer.from(q.buffer).toString('base64'), Buffer.from(Uint8Array.from(col)).toString('base64'), lo.map(v => +v.toFixed(4)), hi.map(v => +v.toFixed(4))];
}

(async () => {
  const io = new NodeIO();
  let out = {};
  try { out = new Function(fs.readFileSync(OUT, 'utf8') + '; return KAYKIT;')(); } catch (e) { out = {}; }
  for (const name of PICK) {
    const objSrc = SRCS.find((d) => fs.existsSync(path.join(d, name + '.obj')));
    if (objSrc) { const { pos, col } = readObj(path.join(objSrc, name + '.obj')); out[name] = pack(pos, col); console.log(name, pos.length / 9, 'tris (obj)'); continue; }
    const src = SRCS.find((d) => fs.existsSync(path.join(d, name + '.gltf')));
    if (!src) { console.log(name, out[name] ? 'kept' : 'MISSING'); continue; }
    const doc = await io.read(path.join(src, name + '.gltf'));
    // a chest's lid is its own model (name + '_lid', in its own frame: the hinge at its origin), so it can be drawn open
    for (const [key, keep] of [[name, (n) => !/_lid$/.test(n.getName())], [name + '_lid', (n) => /_lid$/.test(n.getName())]]) {
    const pos = [], col = [];
    for (const node of doc.getRoot().listNodes()) {
      const mesh = node.getMesh(); if (!mesh || !keep(node)) continue;
      const M = key.endsWith('_lid') ? node.getMatrix().map((v, i) => i >= 12 && i < 15 ? 0 : v) : node.getWorldMatrix();
      for (const prim of mesh.listPrimitives()) {
        const img = prim.getMaterial().getBaseColorTexture();
        const { data, info } = await sharp(Buffer.from(img.getImage())).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
        const P = prim.getAttribute('POSITION'), U = prim.getAttribute('TEXCOORD_0'), I = prim.getIndices().getArray();
        const p = [0, 0, 0], u = [0, 0];
        for (let t = 0; t < I.length; t += 3) {
          let su = 0, sv = 0;
          for (let k = 0; k < 3; k++) {
            P.getElement(I[t + k], p); U.getElement(I[t + k], u); su += u[0] / 3; sv += u[1] / 3;
            pos.push(M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14]);
          }
          const x = Math.min(info.width - 1, Math.max(0, Math.floor((su - Math.floor(su)) * info.width)));
          const y = Math.min(info.height - 1, Math.max(0, Math.floor((sv - Math.floor(sv)) * info.height)));
          const o = (y * info.width + x) * 4; col.push(data[o], data[o + 1], data[o + 2]);
        }
      }
    }
    if (!pos.length) continue;
    out[key] = pack(pos, col);
    console.log(key, pos.length / 9, 'tris');
    }
  }
  fs.writeFileSync(OUT, `// Generated by tools/scenery/build-kaykit.js from KayKit's Dungeon Pack and Holiday Bits (Kay Lousberg, CC0). Don't edit by hand.
// KayKit models for Models3D: name -> [positions (base64 Int16 x3 per corner, over lo..hi), colours (base64 RGB per triangle), lo, hi]
const KAYKIT = ${JSON.stringify(out)};
`);
  console.log('wrote', OUT, fs.statSync(OUT).size);
})();
