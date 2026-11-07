// Builds src/kaykit3d.js: a few KayKit models (CC0, Kay Lousberg) as compact flat-coloured geometry for Models3D:
// from the Dungeon Pack the treasury's gold chest and coin stacks and the towers' wall torch; from Holiday Bits the
// presents of Moonlit Snow's treasury and its snowmen and lanterns; Ashlands' burnt village ruins (Dungeon Pack) and
// its dragon (Quaternius' Animated Monster Pack, CC0: an OBJ, coloured from its MTL materials); Savanna's acacias (Quaternius'
// Simple Nature Pack, CC0: OBJs). KayKit colours its models from a palette texture, so each triangle takes the
// colour under the middle of its texture coordinates.
// Snow's rocks, cliffs and ice can come from Cenji's LowPoly Winter Nature Pack (GLB, coloured by its
// materials' base colours, no texture): picked by the number that starts the file's name (CENJI below) and stored as
// 'cenji_' + that number, e.g. ROCK_10_CliffWall.glb -> cenji_ROCK_10. scenery3d.js uses them in place of its own
// faceted stand-ins when they're there. (The pack's licence: use in a project, but don't hand out the raw models.)
//   node tools/scenery/build-kaykit.js <Assets/gltf folder> [<another pack's Assets/gltf (or OBJ, or GLB) folder> ...]
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
  'Skeleton_Shield_Large_A', 'Skeleton_Blade', 'skull', 'bone_A', 'post', 'Stone_Chunks_Small', // Skeletons, Halloween Bits, Resource Bits (Ashlands' battlefield; fence_broken and Wood_Log_A below too)
  'acacia_A', 'acacia_B', 'acacia_C', // Simple Nature Pack (Quaternius, CC0; Savanna): Tree2, Tree4 and Tree3 renamed, with acacia.mtl's savanna colours
  'arch_gate', 'fence_pillar_broken', 'fence_broken', 'shrine_candles', 'candle_triple', // Halloween Bits (Darkwoods' old gate and shrine)
  'Wood_Log_A', 'Wood_Log_B']; // Resource Bits (Darkwoods' fallen logs)
// Cenji's LowPoly Winter Nature Pack (Snow): cliffs, boulders, a rock formation, a wind-swept
// drift and broken ice (only what scenery3d.js asks for: see its cenji() calls)
const CENJI = ['ROCK_10', 'ROCK_11', 'ROCK_12', 'ROCK_15', 'ROCK_01', 'ROCK_03', 'ROCK_05', 'ROCK_09', 'SNOW_14', 'ICE_12'];
// Halloween Bits has its own 'pillar': build Darkwoods without the Dungeon Pack folder, and the Dungeon pillar is only
// taken from a folder that also has 'wall_broken' (so the Ashlands ruins keep theirs)
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

// the colour of a glTF primitive's triangle t: from its base colour texture (under the middle of its texture
// coordinates), else its vertex colours (averaged), else its material's base colour factor; as sRGB bytes
const srgb8 = (c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)));
async function primColours(prim) {
  const mat = prim.getMaterial(), img = mat && mat.getBaseColorTexture(), U = prim.getAttribute('TEXCOORD_0'), C = prim.getAttribute('COLOR_0');
  const f = mat ? mat.getBaseColorFactor() : [0.8, 0.8, 0.8, 1];
  if (img && U) {
    const { data, info } = await sharp(Buffer.from(img.getImage())).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    return (ix) => { let su = 0, sv = 0; const u = [0, 0]; for (const i of ix) { U.getElement(i, u); su += u[0] / 3; sv += u[1] / 3; }
      const x = Math.min(info.width - 1, Math.max(0, Math.floor((su - Math.floor(su)) * info.width))), y = Math.min(info.height - 1, Math.max(0, Math.floor((sv - Math.floor(sv)) * info.height)));
      const o = (y * info.width + x) * 4; return [data[o], data[o + 1], data[o + 2]].map((v, k) => Math.round(v * Math.min(1, f[k]))); };
  }
  if (C) return (ix) => { const c = [0, 0, 0, 0], s = [0, 0, 0]; for (const i of ix) { C.getElement(i, c); for (let k = 0; k < 3; k++) s[k] += c[k] / 3; } return s.map((v, k) => srgb8(v * f[k])); };
  const rgb = f.slice(0, 3).map(srgb8); return () => rgb;
}
// a glTF or GLB file -> { pos, col } (world positions of every triangle, a colour per triangle), nodes picked by keep
async function readGltf(io, file, keep = () => true, local = false) {
  const doc = await io.read(file), pos = [], col = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh || !keep(node)) continue;
    const M = local ? node.getMatrix().map((v, i) => i >= 12 && i < 15 ? 0 : v) : node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue; // triangles only
      const P = prim.getAttribute('POSITION'), I = prim.getIndices() ? prim.getIndices().getArray() : Array.from({ length: P.getCount() }, (_, i) => i), colour = await primColours(prim), p = [0, 0, 0];
      for (let t = 0; t + 2 < I.length; t += 3) {
        const ix = [I[t], I[t + 1], I[t + 2]];
        for (const i of ix) { P.getElement(i, p); pos.push(M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14]); }
        col.push(...colour(ix));
      }
    }
  }
  return { pos, col };
}

(async () => {
  const io = new NodeIO();
  let out = {};
  try { out = new Function(fs.readFileSync(OUT, 'utf8') + '; return KAYKIT;')(); } catch (e) { out = {}; }
  // Cenji's pack: the first .glb (or .gltf) in any folder whose name starts with the number
  for (const n of CENJI) {
    let file = null;
    for (const d of SRCS) { const f = fs.readdirSync(d).find((x) => x.toUpperCase().startsWith(n + '_') && /\.(glb|gltf)$/i.test(x)); if (f) { file = path.join(d, f); break; } }
    if (!file) { console.log('cenji_' + n, out['cenji_' + n] ? 'kept' : 'not found (scenery3d.js keeps its own)'); continue; }
    const { pos, col } = await readGltf(io, file); if (!pos.length) continue;
    out['cenji_' + n] = pack(pos, col); console.log('cenji_' + n, pos.length / 9, 'tris from', path.basename(file));
  }
  for (const name of PICK) {
    const objSrc = SRCS.find((d) => fs.existsSync(path.join(d, name + '.obj')));
    if (objSrc) { const { pos, col } = readObj(path.join(objSrc, name + '.obj')); out[name] = pack(pos, col); console.log(name, pos.length / 9, 'tris (obj)'); continue; }
    const src = SRCS.find((d) => fs.existsSync(path.join(d, name + '.gltf')) && (name !== 'pillar' || fs.existsSync(path.join(d, 'wall_broken.gltf'))));
    if (!src) { console.log(name, out[name] ? 'kept' : 'MISSING'); continue; }
    // a chest's lid is its own model (name + '_lid', in its own frame: the hinge at its origin), so it can be drawn open
    for (const [key, keep] of [[name, (n) => !/_lid$/.test(n.getName())], [name + '_lid', (n) => /_lid$/.test(n.getName())]]) {
    const { pos, col } = await readGltf(io, path.join(src, name + '.gltf'), keep, key.endsWith('_lid'));
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
