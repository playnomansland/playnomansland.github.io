// ===== 3D board scenery: the land around the board (trees, bushes, rocks) and small dressing on it (grass, flowers) =====
// Scenery3D(THREE, scene, opts) loads models/scenery.bin (built by tools/scenery/build-scenery.js from the Quaternius
// Stylized Nature MegaKit, CC0) or, in a build that inlined it, window.PB_SCENERY (base64), and lays the models out once
// per map and side: instanced, one mesh per model part, so the whole scenery costs a few dozen draw calls.
// Purely visual: nothing here touches the game, and it is placed with its own seeded random numbers, so both players
// see the same land (each from their own side: the world always has your side toward +z).
// opts.onReady(): the models have loaded (the page draws a frame). opts.url: where scenery.bin is. opts.renderer: the
// WebGLRenderer, for baking the impostors.
// Keeping it cheap (a phone draws the whole scenery for well under 200 000 triangles): only trees and bushes near the
// board are real models (they cast real shadows onto it); everything further out is an impostor, a flat card facing
// the camera with a picture of that model, baked when a map first needs it, from three heights (8°, 40° and straight down) and
// blended by the angle the camera sees it from, with a soft round shadow on the ground under it.
// Calls: update(v, groundY, BW, BD, T): lay out the scenery for this view's map and side (cheap when nothing changed);
// biome(v) -> the look for this map { sky, land } (colours); shadows(on); dispose().
// The floor itself (meadow or sand under the zones) is painted by Scenery3D.floor below, through the 2D renderer's ground hook.
const Scenery3D = (THREE, scene, opts = {}) => {
  // ---------- looks per map: the colour of the sky and the land around the board, what grows there ----------
  // trees: which tree models; tint: a colour every model is multiplied by (1 = as painted); grow: how much of the
  // space round the board gets something (0 to 1); dress: small plants on the board itself.
  const BIOMES = {
    meadow: { sky: '#A3B6B4', land: '#64764D', tint: [1, 1, 1], trees: ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5', 'Pine_1', 'Pine_3'], grow: 1.2, dress: 1 },
    forest: { sky: '#1D2B22', land: '#16271B', tint: [0.55, 0.68, 0.58], trees: ['CommonTree_1', 'CommonTree_2', 'CommonTree_4', 'Pine_1', 'Pine_2', 'Pine_3', 'TwistedTree_1'], grow: 1.25, dress: 0 },
    ice: { sky: '#26323A', land: '#1C2830', tint: [0.62, 0.72, 0.82], low: 'rocks', trees: ['Pine_1', 'Pine_2', 'Pine_3', 'Pine_5', 'DeadTree_1', 'DeadTree_3'], grow: 0.8, dress: 0 },
    cavern: { sky: '#120E17', land: '#17121D', tint: [0.42, 0.36, 0.5], low: 'rocks', trees: [], grow: 0.7, dress: 0 },
    // desert sand, palms and sun-bleached rocks; an oasis off the board (ponds), purely for looks
    desert: { sky: '#CBBE9F', land: '#A99063', tint: [1.04, 1, 0.94], low: 'desert', trees: ['PalmTree_1', 'PalmTree_2', 'PalmTree_3', 'PalmTree_4', 'DeadTree_1'], grow: 0.5, dress: 0.7, ponds: true,
      tints: [[/^Grass_Wispy|^Grass_Common_Short/, [1.3, 1.08, 0.55]], [/^Plant_7/, [1.15, 1, 0.62]], [/^DeadTree/, [1.15, 1.02, 0.85]]] },
  };
  // autumn: maples and birches in red and gold, red bushes, golden grass, fallen leaves on the floor
  BIOMES.autumn = { sky: '#B5AA95', land: '#5C5B39', tint: [1, 0.97, 0.92], low: 'autumn', trees: ['MapleTree_1', 'MapleTree_2', 'MapleTree_4', 'MapleTree_5', 'BirchTree_1', 'BirchTree_4', 'BirchTree_5', 'Pine_1'], grow: 1.2, dress: 1,
    tints: [[/^Grass/, [1.2, 1.02, 0.6]], [/^Fern|^Plant_1/, [1.25, 0.95, 0.5]], [/^Clover/, [1.15, 1, 0.6]]] };
  // Darkwoods (the Standard map's own look; reworked 2026-11-07): an ancient wood and the battlefield its one clearing.
  // Giant twisted trees lean over the board's sides, the woods sink into a green-black dark full of mist, pairs of
  // eyes blink between the trunks (more of them as the match goes on), pale light falls through the canopy onto the
  // clearing, spores drift in it, and an old stone gate with a candle-lit shrine stands past the far end.
  // giants: the big twisted trees close round the board (real models); gate: the gate and shrine; mist: how many
  // banks of ground mist; eyes: [pairs at round 1, more per round]; shafts: light shafts onto the board.
  BIOMES.frost = { sky: '#1C2621', land: '#17201A', tint: [0.72, 0.82, 0.72], low: 'darkwoods',
    trees: ['Pine_4', 'TwistedTree_1', 'TwistedTree_2', 'TwistedTree_3', 'TwistedTree_4', 'TwistedTree_5', 'Pine_5', 'Pine_4', 'DeadTree_3'], grow: 1.3, dress: 0.5,
    tints: [[/^TwistedTree/, [0.86, 0.96, 0.86]], [/^Pine/, [0.6, 0.72, 0.64]], [/^DeadTree/, [0.62, 0.66, 0.6]], [/^Fern|^Plant/, [0.8, 0.92, 0.8]], [/^Mushroom/, [1.15, 1.08, 0.98]]],
    light: { hemi: ['#B8CBB5', '#1B251F', 1.15], sun: ['#F5E8C2', 1.8], pos: [-28, 62, -24] }, farLight: 0.72,
    shade: [0.86, 1, 16], night: [0.3, 0.56, 0.42, 0.3], deep: [0.9, 9, 36],
    fall: 'spores', giants: true, gate: true, mist: 44, eyes: [7, 2], shafts: 3, explorer: true };
  // the Hollow (2026-11-12): the Mommy boss's lair, the one look of every boss run (Floors.lookOf). An old forest whose
  // floor caved in long ago: the board is the bottom of the pit, earth walls rise past its flanks and far end (the
  // slope you came down at your end), the forest stands on the rim high above, one giant root spans the pit over her
  // spot and she hangs from it, silk grows over the walls round by round, and one warm column of light falls through
  // the hole onto the board. pit: { flank, far } how high the walls rise (m); hollow: the roots, silk and light
  // (showHollow below)
  BIOMES.hollow = { sky: '#55493A', land: '#2A2219', tint: [0.8, 0.76, 0.68], low: 'hollow',
    trees: ['TwistedTree_1', 'TwistedTree_2', 'TwistedTree_3', 'TwistedTree_4', 'TwistedTree_5', 'Pine_4', 'Pine_5', 'DeadTree_3', 'DeadTree_1'], grow: 1, dress: 0.3,
    tints: [[/^TwistedTree/, [0.78, 0.84, 0.68]], [/^Pine/, [0.62, 0.66, 0.54]], [/^DeadTree/, [0.7, 0.62, 0.52]], [/^Fern|^Plant|^Grass/, [0.85, 0.82, 0.62]], [/^Mushroom/, [1.1, 1.02, 0.9]]],
    light: { hemi: ['#E8D2A6', '#2B2016', 1.1], sun: ['#FFD89C', 2.1], pos: [-16, 74, -12] }, farLight: 0.72,
    shade: [0.58, 3, 18], night: [0.55, 0.42, 0.3, 0.5], fall: 'motes', pit: { flank: 17, far: 27 }, hollow: true };
  BIOMES.ice.snow = 0.75; // snow on everything that faces up, drifts round the board and falling snow
  // Looks added 2026-11-07. light: the scene's lights for this look (render3d; default the day sun) as hemi [sky,
  // ground, intensity], sun [colour, intensity], pos (the sun's position); fall: what drifts through the air (FALL
  // below); farLight: the far impostors' brightness, so they match the real models under a darker light; squash: models
  // drawn lower than tall ([pattern, height factor]); cabin: the cozy cabin off the board's far end.
  // Ashlands: a burnt forest. Charred pines and dead trees, bare rocks, embers rising through smoky air.
  // The second prototype (2026-11-07): a barren battlefield, not another forest. Shell craters churn the ground round
  // the board (a sheet of ash and char), a few charred snags are all that's left of the trees, the battle's debris
  // lies everywhere (spear volleys stuck in the ground, shields, swords, skulls, broken palisades, torn banners of
  // both armies, the ribcage of a giant beast), a ruined fort stands past the far end, smoke rises from craters,
  // embers smoulder in them, ash falls while embers rise, the fire still burns beyond the far end, and the dragon
  // is only ever a shadow sweeping over the field (flyover(): when the opponent is ready).
  BIOMES.ash = { sky: '#3A2C27', land: '#2B2522', tint: [0.62, 0.58, 0.55], low: 'ash', trees: ['DeadTree_3', 'DeadTree_1'], grow: 0.06, dress: 0.35,
    tints: [[/^DeadTree/, [0.42, 0.38, 0.36]]],
    light: { hemi: ['#C9BAAE', '#2A1E1A', 1.3], sun: ['#FFC29A', 1.85], pos: [-40, 36, -38] }, fall: 'embers', fall2: 'ash', farLight: 0.8,
    shade: [0.55, 3, 30], night: [0.62, 0.42, 0.32, 0.4], fire: ['#FF8A4A', 0.7], horizon: '#FF7A3A', ruins: true, battlefield: true,
    craters: 18, sheet: ['#3B332F', '#8A8078'], smokes: 4, dragonShadow: true };
  // Moonlit Snow: Frozen Peak at night, blue moonlight, falling snow and a cabin with warm windows at the far end
  BIOMES.moonlit = { ...BIOMES.ice, sky: '#070A12', land: '#5A6880', low: 'moonlit', tint: [0.6, 0.68, 0.85], trees: ['Pine_1', 'Pine_2', 'Pine_3', 'Pine_5', 'Pine_1', 'DeadTree_3'], grow: 0.85,
    light: { hemi: ['#9DB2E0', '#1A2030', 1.05], sun: ['#C4D2F5', 1.35], pos: [30, 58, 18] }, drift: '#9AA9C2', farLight: 0.62, cabin: true,
    shade: [0.92, 0.5, 18], night: [0.42, 0.56, 1.0, 0.26], deep: [0.95, 14, 50], deepSnow: 1.1, season: 'xmas' };
  // Savanna (prototype 2026-11-07): golden hour on a sea of dry grass that rolls in the wind, wide-spaced flat-topped
  // acacias (Quaternius' Simple Nature Pack), red termite mounds, granite kopjes (rock outcrops) with a lone giant
  // acacia past the far end, grey-olive thorn scrub, dust drifting in the low sun, vultures circling over the board
  // (their shadows cross it), cool violet shadow fill. The sun sinks a little every round (dusk: render3d).
  // grassSea: the rolling grass round the board; ground: the land's colours [earth, straw]; kopjes: the outcrops and
  // the giant acacia; vultures: how many circle overhead.
  BIOMES.savanna = { sky: '#E9C48E', land: '#B39552', tint: [1, 1, 1], low: 'savanna', trees: ['Acacia_A', 'Acacia_B', 'Acacia_A', 'Acacia_C'], grow: 0.3, dress: 0.55,
    tints: [[/^Grass/, [1.4, 1.12, 0.55]], [/^Acacia/, [1.05, 1.0, 0.9]]],
    light: { hemi: ['#FFE7C4', '#5C5683', 1.25], sun: ['#FFD49C', 2.7], pos: [-58, 34, 20] },
    dusk: { sky: '#E39A6A', hemi: ['#FFC9A0', '#4E4278', 1.05], sun: ['#FF9A58', 2.4], pos: [-70, 16, 12], per: 0.09 },
    fall: 'dust', grassSea: 1, ground: ['#9C7F45', '#CFB26C'], kopjes: true, termites: 12, vultures: 3 };
  // Snow (Frozen Peak's own look; prototype 2026-11-07, reworked the same day): a mountain pass above the clouds in
  // hard daylight. A pale high sky, a low white sun and a cool blue fill, so the snow is white in the sun and cobalt in
  // the shade. The board lies in the saddle of the pass: mountain shoulders rise either side behind cliffs and
  // boulders (faceted charcoal rock, snow caps, icicles) and teal seracs, and ahead past the far end (and far behind
  // your end) the pass falls away over a cornice into a sea of clouds with crags and far peaks in it. The wind is the
  // hook: spindrift streams sideways over the board in gusts, snow plumes blow off the ridges, tattered flags snap on
  // their poles, and every round the wind gets up (dusk: the light goes flat and white) until a white haze closes in
  // round the edges. Diamond dust glitters in the sunlit air. When the opponent is ready a yeti pops out from behind a
  // rock and waves at you.
  // summit: the pass (its land sheet); wind: its direction [x, z] (the floor's sastrugi match it); cliffs: cliff walls
  // along the sides; seracs: ice clusters; yeti: the yeti; peaks: far peaks in the cloud sea; clouds: the cloud sea's
  // height (m); plumes: snow plumes off ridges; flags: flag poles; haze: [colour, strength at the last round, from m,
  // to m at round 1, to m at the last round]; glints: sparkles on the ice; noLand: the page's flat land plane is
  // hidden (render3d), the sheet and the clouds take its place
  BIOMES.snow = { sky: '#CFE3EE', land: '#E2EBF2', noLand: true, tint: [1, 1, 1], low: 'summit', trees: ['DeadTree_3', 'DeadTree_1'], grow: 0.32, rockShare: 0.8, dress: 0, snow: 0.9,
    tints: [[/^DeadTree/, [0.55, 0.58, 0.66]], [/^Rock_/, [0.62, 0.66, 0.74]]],
    light: { hemi: ['#86ADEB', '#4B6290', 1.5], sun: ['#FFFFFF', 3.6], pos: [-58, 40, -10] }, farLight: 1,
    dusk: { sky: '#E3EBF0', hemi: ['#A9C2E6', '#62769A', 1.8], sun: ['#F2F5FA', 2.6], pos: [-56, 44, -10], per: 0.1 },
    fall: 'spindrift', fall2: 'diamond', summit: true, wind: [1, -0.35], cliffs: 12, seracs: 7, yeti: true, peaks: 16, clouds: -24, plumes: 13, flags: 4,
    haze: ['#EEF3F7', 0.85, 2, 90, 22], glints: 46 };
  // a look (Scenery3D.LOOKS, below) -> its biome
  const biomeOf = (look) => BIOMES[(Scenery3D.LOOKS[look] || Scenery3D.LOOKS.meadow).biome] || BIOMES.meadow;
  const biome = (v) => biomeOf(Scenery3D.lookOf(v && (v.battlePre || v.m)));

  // ---------- shade: a look can darken everything round the board, more the further out (Moonlit Snow), while the board
  // itself keeps its light. shade = [how dark at most (0 to 1), from how far outside the board (m), fully by (m)]. ----------
  // night (biome .night = [r, g, b, brightness]): how the unlit snow is seen in the dark. Low light shifts what the eye
  // sees toward blue-green (the Purkinje shift): colours wash out, reds go dark first, and shadows sink into blue
  // rather than black. So far from the light a colour becomes its night brightness (weighted toward green and blue)
  // times a blue tint, with a faint blue floor. The cabin's warm light (uWarm: x, z, radius) is kept out of it.
  const shadeU = { uShade: { value: new THREE.Vector3(0, 1, 2) }, uHalf: { value: new THREE.Vector2(40, 50) }, uNight: { value: new THREE.Vector4(0, 0, 0, 0) }, uWarm: { value: new THREE.Vector3(0, 0, 0) }, uDeep: { value: new THREE.Vector3(0, 1, 2) }, uLamps: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 1, 0)) }, uFire: { value: new THREE.Vector4(0, 0, 0, 0) },
    uHaze: { value: new THREE.Vector4(0, 0, 0, 0) }, uHazeD: { value: new THREE.Vector2(1, 2) } };
  const SHADE_GLSL = `uniform vec3 uShade; uniform vec2 uHalf; uniform vec4 uNight; uniform vec3 uWarm; uniform vec3 uDeep; uniform vec4 uLamps[8]; uniform vec4 uFire; uniform vec4 uHaze; uniform vec2 uHazeD;
// the white haze round the edges (Snow, late rounds; uHaze: colour, strength; uHazeD: from m, to m outside the board)
float pbHaze(vec2 xz) { return uHaze.w > 0.0 ? uHaze.w * smoothstep(uHazeD.x, uHazeD.y, length(max(abs(xz) - uHalf, 0.0))) : 0.0; }
float pbDeep(vec2 xz) { return uDeep.x * smoothstep(uDeep.y, uDeep.z, length(max(abs(xz) - uHalf, 0.0))); }
float pbK(vec2 xz) { float k = uShade.x * smoothstep(uShade.y, uShade.z, length(max(abs(xz) - uHalf, 0.0)));
  if (uWarm.z > 0.0) k *= smoothstep(uWarm.z * 0.55, uWarm.z, length(xz - uWarm.xy)); return k; }
float pbShade(vec2 xz) { return 1.0 - pbK(xz); }
// lantern light (uLamps: x, z, reach m, strength; strength 0 = off): warm light on the snow and things round a lamp,
// bringing back their own colour out of the night, tinted orange
float pbLamp(vec2 xz) { float w = 0.0; for (int i = 0; i < 8; i++) { vec4 l = uLamps[i]; if (l.w <= 0.0) continue;
  float f = 1.0 - smoothstep(0.0, l.z, length(xz - l.xy)); w += l.w * f * f; } return w; }
// the fire beyond the far end (uFire: colour, strength): everything past the far edge glows more and more in its
// colour the further out it stands, as if backlit by a fire front out of sight (always -z: both players' far side)
float pbFire(vec2 xz) { return uFire.w > 0.0 ? uFire.w * smoothstep(uHalf.y + 4.0, uHalf.y + 40.0, -xz.y) : 0.0; }
vec3 pbNight(vec3 c, vec2 xz) { float hz = pbHaze(xz); if (hz > 0.0) return mix(c, uHaze.rgb, hz); // (Snow has no night)
  float k = pbK(xz), lw = pbLamp(xz), fw = pbFire(xz); if (k <= 0.0 && lw <= 0.0 && fw <= 0.0) return c;
  vec3 c0 = c;
  vec3 dark = uNight.w > 0.0 ? dot(c, vec3(0.08, 0.55, 0.37)) * uNight.rgb * uNight.w + uNight.rgb * 0.018 : vec3(0.0);
  c = mix(c, dark, k);
  // deep darkness (biome .deep = [strength, from m, full at m]): further out still, the woods sink into near-black
  if (uDeep.x > 0.0) { float d = length(max(abs(xz) - uHalf, 0.0)), q = uDeep.x * smoothstep(uDeep.y, uDeep.z, d);
    if (uWarm.z > 0.0) q *= smoothstep(uWarm.z * 0.55, uWarm.z, length(xz - uWarm.xy));
    c = mix(c, uNight.rgb * 0.012, q); }
  if (fw > 0.0) c = mix(c, c0 * uFire.rgb * 1.6 + uFire.rgb * 0.06, fw);
  if (lw > 0.0) c = mix(c, c0 * vec3(1.15, 0.78, 0.45), clamp(lw, 0.0, 1.0) * 0.85) + vec3(0.16, 0.085, 0.025) * lw;
  return c; }
`;
  // a lit material (scenery, drifts): darkened after lighting, by where each fragment stands
  function shadeLit(sh) {
    Object.assign(sh.uniforms, shadeU);
    sh.vertexShader = 'varying vec2 vShadeXZ;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vShadeXZ = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xz;
      #else
        vShadeXZ = (modelMatrix * vec4(transformed, 1.0)).xz;
      #endif`);
    sh.fragmentShader = SHADE_GLSL + 'varying vec2 vShadeXZ;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight = pbNight(outgoingLight, vShadeXZ);\n#include <opaque_fragment>');
  }

  // ---------- loading ----------
  const FOLIAGE = /Leaves|Leaf|Grass|Flowers/;
  const snowU = { value: 0 };
  let lib = null; // name -> { h, r, parts: [{ geo, mat }] }
  const mats = [];
  const meshes = [];
  async function load() {
    let buf;
    if (window.PB_SCENERY) { const s = atob(window.PB_SCENERY); buf = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) buf[i] = s.charCodeAt(i); buf = buf.buffer; }
    else buf = await (await fetch(opts.url || 'models/scenery.bin')).arrayBuffer();
    const dv = new DataView(buf);
    if (String.fromCharCode(...new Uint8Array(buf, 0, 4)) !== 'PBSC') throw new Error('scenery.bin: not a scenery file');
    const hl = dv.getUint32(4, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
    const base = 8 + hl + ((4 - ((8 + hl) % 4)) % 4);
    const texs = await Promise.all(head.tex.map(async (t) => {
      const bmp = await createImageBitmap(new Blob([new Uint8Array(buf, base + t.off, t.len)], { type: 'image/webp' }));
      const tx = new THREE.Texture(bmp); tx.colorSpace = THREE.SRGBColorSpace; tx.flipY = false; tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
      tx.anisotropy = 4; tx.needsUpdate = true;
      const mat = new THREE.MeshLambertMaterial({ map: tx, side: THREE.DoubleSide, alphaTest: t.alpha ? 0.45 : 0 });
      // leaves and blades are lit the same on both faces (three.js turns a back face's normal around, which leaves it black)
      // and every colour is pulled a quarter of the way to grey: dusty, as the art direction asks
      const leafy = FOLIAGE.test(t.name);
      // snow (Frozen Peak): surfaces that face up turn white, by how much snowU says
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uSnow = snowU;
        sh.vertexShader = 'varying float vUpN;\n' + sh.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          #ifdef USE_INSTANCING
            vUpN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal).y;
          #else
            vUpN = normalize(mat3(modelMatrix) * objectNormal).y;
          #endif`);
        sh.fragmentShader = 'uniform float uSnow;\nvarying float vUpN;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), 0.25);\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.95), uSnow * smoothstep(0.3, 0.75, vUpN));');
        shadeLit(sh);
        if (leafy) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0; vec3 normal = normalize( vNormal ); vec3 nonPerturbedNormal = normal;');
      };
      mat.customProgramCacheKey = () => leafy ? 'pb-leaf' : 'pb-scenery';
      mats.push(mat); return mat;
    }));
    lib = {};
    for (const [name, md] of Object.entries(head.models)) {
      lib[name] = { h: md.h, r: md.r, parts: md.parts.map((p) => {
        const geo = new THREE.BufferGeometry();
        const qp = new Int16Array(buf, base + p.pos, p.n * 3), pos = new Float32Array(p.n * 3);
        for (let i = 0; i < pos.length; i++) { const d = i % 3; pos[i] = p.plo[d] + (qp[i] + 32767) / 65534 * (p.phi[d] - p.plo[d]); }
        const qu = new Uint16Array(buf, base + p.uv, p.n * 2), uv = new Float32Array(p.n * 2);
        for (let i = 0; i < uv.length; i++) { const d = i % 2; uv[i] = p.ulo[d] + qu[i] / 65535 * (p.uhi[d] - p.ulo[d]); }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const nrm = new Int8Array(buf, base + p.nrm, p.n * 4).slice();
        if (FOLIAGE.test(head.tex[p.tex].name)) for (let i = 0; i < nrm.length; i += 4) { // leaves and blades: normals bent up, so their backs aren't black
          const x = nrm[i] * 0.35, y = nrm[i + 1] * 0.35 + 127, z = nrm[i + 2] * 0.35, l = Math.hypot(x, y, z) / 127;
          nrm[i] = x / l; nrm[i + 1] = y / l; nrm[i + 2] = z / l;
        }
        geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 4, true));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setIndex(new THREE.BufferAttribute(new Uint16Array(buf, base + p.idx, p.ni).slice(), 1));
        geo.computeBoundingSphere();
        return { geo, mat: texs[p.tex] };
      }) };
    }
  }
  // snow piles (Moonlit Snow): soft lumpy mounds made here, used like any scenery model (SnowPile_1 to _3)
  function addSnowPiles() {
    const mat = new THREE.MeshLambertMaterial({ color: '#E4EAF3', flatShading: true });
    mat.onBeforeCompile = shadeLit; mat.customProgramCacheKey = () => 'pb-snowpile'; mats.push(mat);
    [[1.25, 0.85, 0.5, 0], [0.9, 1.1, 0.62, 1.7], [1.5, 0.75, 0.4, 3.1]].forEach(([sx, sz, sy, ph], i) => {
      const geo = new THREE.IcosahedronGeometry(1, 2), pos = geo.attributes.position, v = new THREE.Vector3();
      let lo = Infinity;
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k);
        // a bumpy outline, the same for a corner shared by several faces (so the surface stays closed), then flattened
        const f = 1 + 0.16 * Math.sin(3 * v.x + ph) * Math.sin(2.7 * v.z + 0.4 + ph) + 0.08 * Math.sin(5 * v.y + ph * 2);
        v.multiplyScalar(f); v.y = Math.max(v.y, -0.15);
        v.set(v.x * sx, v.y * sy, v.z * sz); pos.setXYZ(k, v.x, v.y, v.z); lo = Math.min(lo, v.y);
      }
      geo.translate(0, -lo - 0.05, 0); geo.computeVertexNormals(); geo.computeBoundingSphere();
      geo.computeBoundingBox();
      lib['SnowPile_' + (i + 1)] = { h: geo.boundingBox.max.y, r: Math.max(sx, sz), parts: [{ geo, mat }] };
    });
  }
  // Savanna's models: the acacias (src/kaykit3d.js, flat coloured), and lumpy shapes made here: thorn scrub, granite
  // boulders, termite mounds (a tall leaning spire with a smaller one at its foot, red earth)
  const merge = (geos) => { const n = geos.reduce((s, g) => s + g.attributes.position.count, 0), P = new Float32Array(n * 3); let o = 0;
    for (const g of geos) { P.set(g.attributes.position.array, o); o += g.attributes.position.array.length; g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g; };
  // a lump: an icosahedron with a bumpy outline (the same for a shared corner, so it stays closed), scaled, its base cut flat
  const lumpGeo = (det, sx, sy, sz, ph, bump, x = 0, y = 0, z = 0) => {
    const geo = new THREE.IcosahedronGeometry(1, det).toNonIndexed(), pos = geo.attributes.position, v = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k); const kx = Math.round(v.x * 1e4), ky = Math.round(v.y * 1e4), kz = Math.round(v.z * 1e4);
      const f = 1 + bump * (Math.sin(kx * 3e-4 + ph) * Math.sin(kz * 2.7e-4 + 0.4 + ph) + 0.6 * Math.sin(ky * 5e-4 + ph * 2) * Math.cos(kx * 4.1e-4 - ph));
      v.multiplyScalar(f); v.y = Math.max(v.y, -0.2); pos.setXYZ(k, v.x * sx + x, (v.y + 0.2) * sy + y, v.z * sz + z);
    }
    return geo;
  };
  const savMat = (col, key) => { const m = new THREE.MeshLambertMaterial({ color: col, flatShading: true }); m.onBeforeCompile = shadeLit; m.customProgramCacheKey = () => key; mats.push(m); return m; };
  const addModel = (name, geo, mat) => { geo.computeBoundingBox(); const b = geo.boundingBox; lib[name] = { h: b.max.y, r: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2, parts: [{ geo, mat }] }; };
  function addSavanna() {
    for (const [name, kk] of [['Acacia_A', 'acacia_A'], ['Acacia_B', 'acacia_B'], ['Acacia_C', 'acacia_C']]) { const g = kkGeo(kk); if (g) { const c = g.clone(); addModel(name, c, propMat);
      // the top of its highest canopy (where perching vultures sit): the middle of the corners near the top
      const p = c.attributes.position; let top = -Infinity, x = 0, z = 0, n = 0; for (let k = 0; k < p.count; k++) top = Math.max(top, p.getY(k));
      for (let k = 0; k < p.count; k++) if (p.getY(k) > top - 0.15) { x += p.getX(k); z += p.getZ(k); n++; }
      lib[name].top = [x / n, top, z / n]; } }
    const thorn = savMat('#7C8150', 'pb-thorn'), granite = savMat('#B4A493', 'pb-granite'), earth = savMat('#A9603C', 'pb-termite');
    addModel('Thorn_1', merge([lumpGeo(1, 1.1, 0.75, 0.9, 0.3, 0.22), lumpGeo(1, 0.7, 0.6, 0.7, 2.1, 0.25, 0.8, 0, 0.4)]), thorn);
    addModel('Thorn_2', merge([lumpGeo(1, 0.8, 0.55, 1.0, 1.4, 0.24), lumpGeo(1, 0.55, 0.45, 0.55, 0.7, 0.2, -0.6, 0, -0.5)]), thorn);
    addModel('Boulder_1', merge([lumpGeo(1, 1.2, 0.95, 1.0, 0.9, 0.16)]), granite);
    addModel('Boulder_2', merge([lumpGeo(1, 1.0, 1.25, 0.85, 2.6, 0.18)]), granite);
    addModel('Boulder_3', merge([lumpGeo(1, 1.3, 0.6, 1.1, 4.2, 0.14)]), granite);
    // a termite mound: a lathe tapering to a blunt top, ribbed and leaning, with smaller spires at its foot
    const spire = (h, r, lean, ph, x = 0, z = 0) => {
      const pts = []; for (let i = 0; i <= 7; i++) { const t = i / 7; pts.push(new THREE.Vector2(Math.max(0.06, r * Math.pow(1 - t, 0.62) * (1 + 0.12 * Math.sin(t * 9 + ph))), t * h)); }
      const g = new THREE.LatheGeometry(pts, 9).toNonIndexed(), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const y = p.getY(k), a = Math.atan2(p.getZ(k), p.getX(k)), f = 1 + 0.18 * Math.sin(a * 3 + ph) + 0.08 * Math.sin(a * 5 + y * 2.3);
        p.setXYZ(k, p.getX(k) * f + lean * y * y / h + x, y, p.getZ(k) * f + z); }
      return g;
    };
    addModel('Termite_1', merge([spire(3.6, 1.15, 0.5, 0.4), spire(1.7, 0.7, -0.2, 1.9, 0.9, 0.5), spire(1.1, 0.5, 0.1, 3.3, -0.7, 0.6)]), earth);
    addModel('Termite_2', merge([spire(2.6, 1.0, -0.35, 2.2), spire(1.4, 0.6, 0.2, 0.8, -0.8, -0.3)]), earth);
    addModel('Termite_3', merge([spire(1.5, 0.75, 0.2, 3.7), spire(0.8, 0.45, 0, 1.1, 0.6, 0.2)]), earth);
  }
  // ---------- Snow's models: faceted low-poly rock, snow and ice made here, coloured per face in the Cenji Winter pack's
  // palette (charcoal rock, white snow caps, teal ice). Where the pack's own model is packed into src/kaykit3d.js
  // (tools/scenery/build-kaykit.js, as 'cenji_' + its number, e.g. cenji_ROCK_10) that one is used instead. ----------
  const ROCK = ['#3A3F48', '#454B55', '#33383F', '#4D535D'], SNOWC = '#F1F5FA', ICE = ['#86DCE4', '#55BCD4', '#3593BE', '#B2EEF2'];
  const hashf = (a, b, c) => { const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return v - Math.floor(v) - 0.5; };
  // every corner moved a little, the same way for corners on the same spot (so the surface stays closed)
  const jag = (geo, amt, ph = 0, yAmt = amt) => { const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), kx = Math.round(x * 50) / 50 + ph, ky = Math.round(y * 50) / 50, kz = Math.round(z * 50) / 50;
      p.setXYZ(k, x + hashf(kx, ky, kz) * amt, y + hashf(ky, kz, kx) * yAmt, z + hashf(kz, kx, ky) * amt); }
    return geo; };
  // parts [geometry, colour (hex, or fn(ny, y, i) -> hex: the face's normal's up part, its middle's height, its number), matrix]
  // -> one geometry coloured per face (flat: every face its own corners)
  const paint = (parts) => {
    const pos = [], col = [], c = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3();
    let fi = 0;
    for (const [g0, cf, mx] of parts) {
      const g = g0.index ? g0.toNonIndexed() : g0.clone(); if (mx) g.applyMatrix4(mx); const P = g.attributes.position.array;
      for (let i = 0; i < P.length; i += 9, fi++) {
        a.fromArray(P, i); b.fromArray(P, i + 3); d.fromArray(P, i + 6); b.sub(a); d.sub(a); n.crossVectors(b, d).normalize();
        c.set(typeof cf === 'function' ? cf(n.y, (P[i + 1] + P[i + 4] + P[i + 7]) / 3, fi) : cf);
        for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
      }
      for (let i = 0; i < P.length; i++) pos.push(P[i]);
      g.dispose(); if (g0 !== g) g0.dispose();
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  };
  const rockSnow = (cap = 0.55) => (ny, y, i) => ny > cap ? SNOWC : ROCK[(i * 7 + (i >> 2)) % 4];
  const iceCol = (ny, y, i) => ny > 0.7 ? ICE[3] : ICE[(i * 5 + (i >> 1)) % 3];
  const M4s = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
  // a rock shard: a leaning faceted column with a slanted top
  const shard = (r, h, sides, slope, ph) => { const g = new THREE.CylinderGeometry(r * 0.62, r, h, sides, 2).translate(0, h / 2, 0), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) p.setY(k, p.getY(k) + (p.getY(k) > h * 0.9 ? p.getX(k) * slope : 0));
    return jag(g, r * 0.3, ph, h * 0.06); };
  // icicles: thin cones hanging down from y along a front edge
  const icicles = (n, x0, x1, y, z, len, ph) => { const out = [];
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, l = len * (0.45 + 0.55 * Math.abs(hashf(i, ph, 1.7)) * 2), r = 0.07 + 0.06 * Math.abs(hashf(ph, i, 3.1)) * 2;
      out.push([new THREE.ConeGeometry(r, l, 4).rotateX(Math.PI).translate(0, -l / 2, 0), ICE[(i % 2) ? 3 : 0], M4s(x0 + (x1 - x0) * f + hashf(i, 2, ph) * 0.2, y, z + hashf(1, i, ph) * 0.15)]); }
    return out; };
  // a cliff wall w wide, about h tall (its face toward +z), shards side by side with lower ones behind, snow on top,
  // icicles hanging along the face
  const cliffGeo = (w, h, ph) => { const parts = [], n = Math.max(2, Math.round(w / 1.7));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * w / n + hashf(i, ph, 0) * 0.5, r = 0.95 + Math.abs(hashf(ph, i, 1)) * 0.9, hh = h * (0.62 + 0.38 * Math.sin(Math.PI * (i + 0.5) / n)) * (0.85 + Math.abs(hashf(i, 3, ph)) * 0.3);
      parts.push([shard(r, hh, 5, hashf(i, ph, 5) * 0.5, ph + i), rockSnow(0.5), M4s(x, 0, hashf(i, 7, ph) * 0.6, 0, i * 1.3, 0)]);
      parts.push([shard(r * 1.15, hh * 0.7, 5, 0.3, ph + i + 9), rockSnow(0.5), M4s(x + 0.4, 0, -r * 1.1, 0, i * 0.7, 0)]);
      parts.push(...icicles(3, x - r * 0.5, x + r * 0.5, hh * 0.8, r * 0.75, h * 0.18, ph + i * 3));
    }
    return paint(parts); };
  const boulderGeo = (sx, sy, sz, ph) => paint([[jag(lumpGeo(1, sx, sy, sz, ph, 0.22), 0.12, ph), rockSnow(0.62)]]);
  // a serac: a tall block of glacier ice, leaning, broken at the top, snow on its ledges
  const seracGeo = (ph) => { const parts = [];
    [[0, 0, 1.3, 4.2, 0.1], [1.3, 0.5, 0.9, 2.8, -0.15], [-1.1, 0.4, 0.8, 2.2, 0.2], [0.4, -1.0, 0.7, 1.6, -0.1]].forEach(([x, z, r, h, lean], i) => {
      const g = jag(new THREE.BoxGeometry(r * 1.6, h, r * 1.3, 1, 2, 1).translate(0, h / 2, 0), r * 0.35, ph + i, h * 0.08);
      parts.push([g, (ny, y, k) => ny > 0.75 ? SNOWC : ICE[(k * 3 + i) % 3], M4s(x, 0, z, lean * 0.5, i * 0.9, lean)]); });
    return paint(parts); };
  // an ice crystal cluster: six-sided prisms with pointed tips, splayed out from a snowy foot
  const crystalGeo = (n, sc, ph) => { const parts = [[jag(lumpGeo(0, 1.1 * sc, 0.45 * sc, 1.0 * sc, ph, 0.15), 0.1, ph), SNOWC]];
    for (let i = 0; i < n; i++) { const h = sc * (1.2 + Math.abs(hashf(i, ph, 2)) * 3.2), r = sc * (0.18 + Math.abs(hashf(ph, i, 4)) * 0.25), a = i * 2.4 + ph, tilt = 0.15 + Math.abs(hashf(i, 9, ph)) * 0.6;
      const g = new THREE.CylinderGeometry(r, r * 1.1, h * 0.75, 6).translate(0, h * 0.375, 0), tip = new THREE.ConeGeometry(r, h * 0.25, 6).translate(0, h * 0.875, 0);
      const m = M4s(Math.cos(a) * sc * 0.3, -0.1, Math.sin(a) * sc * 0.3, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
      parts.push([g, iceCol, m], [tip, iceCol, m]); }
    return paint(parts); };
  // a flag pole on a cairn of stones (the cloth is its own mesh: it moves in the wind)
  const flagpoleGeo = () => paint([[new THREE.CylinderGeometry(0.06, 0.08, 4.6, 5).translate(0, 2.3, 0), '#5B4A3C'],
    [jag(lumpGeo(0, 0.75, 0.5, 0.7, 1.1, 0.2), 0.1, 1), rockSnow(0.6)], [jag(lumpGeo(0, 0.5, 0.4, 0.45, 2.3, 0.2), 0.08, 2), rockSnow(0.6), M4s(0.35, 0.45, 0.1)], [jag(lumpGeo(0, 0.4, 0.35, 0.4, 3.1, 0.2), 0.08, 3), rockSnow(0.6), M4s(-0.3, 0.4, -0.2)]]);
  // a drift: a long low tongue of wind-packed snow, its steep head upwind (+x)
  const driftGeo2 = () => paint([[lumpGeo(1, 2.6, 0.55, 1.0, 0.7, 0.12), (ny) => ny > 0.35 ? SNOWC : '#C3D3E6', M4s(0, -0.1, 0)], [lumpGeo(1, 1.4, 0.4, 0.7, 1.9, 0.12), (ny) => ny > 0.35 ? SNOWC : '#C3D3E6', M4s(-2.1, -0.1, 0.3)]]);
  // a model of the pack if it's packed (stood on the ground, centred), else null
  const cenji = (n) => { const g = kkGeo('cenji_' + n); if (!g) return null; const c = g.clone(); c.computeBoundingBox(); const b = c.boundingBox; c.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); return c; };
  // painted geometries joined into one (positions and colours)
  const joinCol = (geos) => { const pos = [], col = []; for (const g of geos) { for (const v of g.attributes.position.array) pos.push(v); for (const v of g.attributes.color.array) col.push(v); g.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g; };
  function addSummit() {
    // (in here, not above: MADE and kkGeo are set up further down)
    MADE.__flagpole = flagpoleGeo; MADE.__drift = () => cenji('SNOW_14') || driftGeo2();
    const add = (name, cj, make) => addModel(name, (cj && cenji(cj)) || make(), propMat);
    add('Cliff_1', 'ROCK_10', () => cliffGeo(4.5, 3.8, 1)); add('Cliff_2', 'ROCK_11', () => cliffGeo(6, 6.1, 2)); add('Cliff_3', 'ROCK_12', () => cliffGeo(7.5, 8.2, 3));
    // an icy cliff: veins of teal ice down its face
    add('CliffIcy', 'ROCK_15', () => joinCol([cliffGeo(6, 6.7, 4), paint([-1.9, -0.4, 1.6].map((x, i) => [jag(new THREE.BoxGeometry(0.7, 5.2 - i * 0.8, 0.5, 1, 3, 1).translate(0, 2.6 - i * 0.4, 0), 0.18, i), iceCol, M4s(x, 0.3, 1.25, -0.08, 0, hashf(i, 1, 2) * 0.3)]))]));
    add('Boulder_S1', 'ROCK_01', () => boulderGeo(1.0, 0.8, 0.9, 0.4)); add('Boulder_S2', 'ROCK_03', () => boulderGeo(0.8, 1.0, 0.75, 1.9)); add('Boulder_S3', 'ROCK_05', () => boulderGeo(1.1, 0.55, 0.9, 3.3));
    add('Formation_1', 'ROCK_09', () => paint([[shard(1.3, 3.2, 5, 0.3, 7), rockSnow(0.5)], [shard(1.0, 2.2, 5, -0.4, 8), rockSnow(0.5), M4s(1.3, 0, 0.5, 0, 1, 0)], [shard(0.8, 1.5, 5, 0.2, 9), rockSnow(0.5), M4s(-1.1, 0, 0.6, 0, 2, 0)]]));
    add('Serac_1', '', () => seracGeo(1.3)); add('Serac_2', '', () => seracGeo(5.7));
    add('Crystal_1', '', () => crystalGeo(7, 1, 2.2)); add('Crystal_2', '', () => crystalGeo(4, 0.6, 6.1)); // (the pack has no crystal cluster)
    add('IceChunk_1', 'ICE_12', () => paint([[jag(lumpGeo(0, 1.0, 0.45, 0.8, 0.9, 0.25), 0.15, 2), iceCol], [jag(lumpGeo(0, 0.6, 0.35, 0.5, 2.4, 0.25), 0.1, 3), iceCol, M4s(0.9, 0, 0.4, 0.3, 1, 0.2)]]));
  }
  const ready = load().then(() => { addSnowPiles(); addSavanna(); addSummit(); if (opts.renderer) setupImpostors(); key = ''; opts.onReady && opts.onReady(); }).catch((e) => console.warn('No Mans Land: no 3D scenery', e));

  // ---------- impostors: pictures of the far trees and bushes, baked into one atlas ----------
  const ELEV = [8, 40, 90], ICELL = 256, IGRID = 8; // views per model, cell size in pixels, cells per atlas row
  // only the models this map shows far out are baked (again when the map changes), so the atlas stays small
  let atlas = null, atlasKey = '', impIndex = null, impMat = null, impGeo = null, blobMat = null, blobGeo = null;
  const impostorable = (n) => lib[n] && (lib[n].h > 2.5 || /^Bush/.test(n));
  function bake(names) {
    const renderer = opts.renderer;
    if (!impMat || names.join() + snowU.value === atlasKey) return;
    atlasKey = names.join() + snowU.value; if (atlas) atlas.dispose();
    impIndex = {};
    if (!names.length) { atlas = null; return; }
    const rows = Math.ceil(names.length * ELEV.length / IGRID);
    atlas = new THREE.WebGLRenderTarget(IGRID * ICELL, rows * ICELL, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
    const bs = new THREE.Scene();
    bs.add(new THREE.HemisphereLight('#cfe3ff', '#20262a', 1.6));
    const lamp = new THREE.DirectionalLight('#fff3dc', 2.0); bs.add(lamp); bs.add(lamp.target);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    const prevTarget = renderer.getRenderTarget(), prevAuto = renderer.autoClear, prevCol = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
    renderer.autoClear = false; renderer.setClearColor(0x000000, 0);
    names.forEach((name, mi) => {
      const md = lib[name], rad = Math.max(md.r, 0.3);
      const S = 1.06 * Math.max(md.h, 2 * rad, md.h * Math.cos(0.7) + 2 * rad * Math.sin(0.7)); // the picture's side (m)
      impIndex[name] = { i: mi, S };
      const group = new THREE.Group(); for (const p of md.parts) group.add(new THREE.Mesh(p.geo, p.mat)); bs.add(group);
      ELEV.forEach((e, vi) => {
        const c = mi * ELEV.length + vi, a = e * Math.PI / 180;
        Object.assign(cam, { left: -S / 2, right: S / 2, top: S / 2, bottom: -S / 2 }); cam.updateProjectionMatrix();
        cam.up.set(0, e === 90 ? 0 : 1, e === 90 ? -1 : 0);
        cam.position.set(0, md.h / 2 + Math.sin(a) * 150, Math.cos(a) * 150); cam.lookAt(0, md.h / 2, 0);
        lamp.position.set(-40, 80, 60); // light from up front-left, as the board's sun
        atlas.viewport.set((c % IGRID) * ICELL, Math.floor(c / IGRID) * ICELL, ICELL, ICELL); atlas.scissor.copy(atlas.viewport); atlas.scissorTest = true;
        renderer.setRenderTarget(atlas); renderer.clear(); renderer.render(bs, cam);
      });
      bs.remove(group);
    });
    renderer.setRenderTarget(prevTarget); renderer.autoClear = prevAuto; renderer.setClearColor(prevCol, prevA);
    impMat.uniforms.uAtlas.value = atlas.texture; impMat.uniforms.uGrid.value.set(IGRID, rows);
  }
  function setupImpostors() {
    impGeo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
    impMat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uAtlas: { value: null }, uGrid: { value: new THREE.Vector2(IGRID, 1) } }]), ...shadeU },
      fog: true,
      vertexShader: `
        attribute vec3 iPos; attribute float iSize; attribute float iModel; attribute vec3 iTint; attribute float iFlip; attribute float iSy;
        uniform vec2 uGrid;
        varying vec2 vUv0; varying vec2 vUv1; varying float vMix; varying vec3 vTint; varying vec2 vShadeXZ;
        #include <fog_pars_vertex>
        vec2 cellUv(float c, vec2 uv) { return (vec2(mod(c, uGrid.x), floor(c / uGrid.x)) + uv) / uGrid; }
        void main() {
          vec3 toCam = normalize(cameraPosition - iPos);
          float elev = degrees(asin(clamp(toCam.y, -1.0, 1.0)));
          float i0 = elev < 40.0 ? 0.0 : 1.0;
          vMix = elev < 40.0 ? clamp((elev - 8.0) / 32.0, 0.0, 1.0) : clamp((elev - 40.0) / 50.0, 0.0, 1.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 wp = iPos + (right * position.x + up * position.y * iSy) * iSize;
          vec2 uv = vec2(position.x * iFlip + 0.5, position.y + 0.5);
          float c0 = iModel * 3.0 + i0;
          vUv0 = cellUv(c0, uv); vUv1 = cellUv(c0 + 1.0, uv); vTint = iTint; vShadeXZ = iPos.xz;
          vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uAtlas;
        varying vec2 vUv0; varying vec2 vUv1; varying float vMix; varying vec3 vTint; varying vec2 vShadeXZ;
        ${SHADE_GLSL}
        #include <fog_pars_fragment>
        void main() {
          vec4 c = mix(texture2D(uAtlas, vUv0), texture2D(uAtlas, vUv1), vMix);
          if (c.a < 0.4) discard;
          gl_FragColor = vec4(pbNight(c.rgb / c.a * vTint, vShadeXZ), 1.0);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    // a soft round shadow, for the ground under an impostor
    const sc = document.createElement('canvas'); sc.width = sc.height = 64;
    const g = sc.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), color: '#1A2414', transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  }
  // the impostors and their shadows for one layout: list of [name, x, y, z, s, colour [r, g, b], flip, height factor]
  function impostors(list) {
    const n = list.length; if (!n || !impMat) return;
    const geo = impGeo.clone(); geo.instanceCount = n;
    const P = new Float32Array(n * 3), Z = new Float32Array(n), M = new Float32Array(n), C = new Float32Array(n * 3), F = new Float32Array(n), SY = new Float32Array(n);
    const blobs = new THREE.InstancedMesh(blobGeo, blobMat, n);
    list.forEach(([name, x, y, z, s, col, flip, sy = 1], i) => {
      const md = lib[name], im = impIndex[name];
      P.set([x, y + md.h * s * sy / 2, z], i * 3); Z[i] = im.S * s; M[i] = im.i; F[i] = flip; SY[i] = sy;
      C.set(col, i * 3);
      const b = Math.max(1.5, md.r * s * 1.6);
      blobs.setMatrixAt(i, tmpM.compose(tmpP.set(x + b * 0.15, y + 0.02, z + b * 0.1), tmpQ.identity(), tmpS.set(b, 1, b)));
    });
    geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(P, 3)); geo.setAttribute('iSize', new THREE.InstancedBufferAttribute(Z, 1));
    geo.setAttribute('iModel', new THREE.InstancedBufferAttribute(M, 1)); geo.setAttribute('iTint', new THREE.InstancedBufferAttribute(C, 3));
    geo.setAttribute('iFlip', new THREE.InstancedBufferAttribute(F, 1)); geo.setAttribute('iSy', new THREE.InstancedBufferAttribute(SY, 1));
    const mesh = new THREE.Mesh(geo, impMat); mesh.frustumCulled = false; mesh.raycast = () => {}; mesh.name = 'impostors'; mesh.count = n;
    blobs.instanceMatrix.needsUpdate = true; blobs.computeBoundingSphere(); blobs.raycast = () => {}; blobs.name = 'blobs';
    scene.add(mesh, blobs); meshes.push(mesh, blobs);
  }

  // ---------- layout ----------
  let key = null, castShadows = true;
  const tmpM = new THREE.Matrix4(), tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), upY = new THREE.Vector3(0, 1, 0), tmpC = new THREE.Color();
  function clear() { for (const m of meshes) { scene.remove(m); if (m.isInstancedMesh) m.dispose(); else if (m.name !== 'pond') m.geometry.dispose(); } meshes.length = 0; }
  // what goes where. Each pick is [model, weight]; scale is [lo, hi].
  const LOW = [['Bush_Common_Flowers', 1.2], ['Fern_1', 2.5], ['Rock_Medium_1', 0.6], ['Rock_Medium_2', 0.6], ['Rock_Medium_3', 0.6], ['Plant_1_Big', 1.5], ['Grass_Wispy_Short', 1], ['Grass_Common_Tall', 3]];
  const TUFT = [['Grass_Common_Short', 7], ['Grass_Wispy_Short', 1], ['Grass_Common_Tall', 2], ['Clover_1', 2], ['Flower_3_Group', 1], ['Pebble_Round_1', 1], ['Pebble_Round_2', 1], ['Mushroom_Common', 0.5]];
  const DRESS = [['Grass_Common_Short', 7], ['Grass_Wispy_Short', 1], ['Clover_1', 1], ['Flower_3_Group', 1], ['Pebble_Round_1', 1.5], ['Pebble_Round_2', 1.5], ['Pebble_Square_2', 1]];
  const PEBBLES = [['Pebble_Round_1', 1], ['Pebble_Round_2', 1], ['Pebble_Square_2', 1], ['Mushroom_Common', 0.3]];
  const ROCKS = [['Rock_Medium_1', 1], ['Rock_Medium_2', 1], ['Rock_Medium_3', 1], ['Pebble_Square_2', 0.5]];
  const AUTUMN = {
    low: [['Bush_Common', 2.5], ['Bush_Common_Flowers', 0.5], ['Fern_1', 1.5], ['Rock_Medium_1', 0.6], ['Rock_Medium_2', 0.6], ['Rock_Medium_3', 0.6], ['Plant_1_Big', 1], ['Grass_Common_Tall', 2.5]],
    tuft: [['Grass_Common_Short', 6], ['Grass_Common_Tall', 2], ['Clover_1', 1], ['Mushroom_Common', 1.5], ['Pebble_Round_1', 1], ['Pebble_Round_2', 1]],
    dress: [['Grass_Common_Short', 6], ['Clover_1', 1], ['Mushroom_Common', 1], ['Pebble_Round_1', 1.5], ['Pebble_Round_2', 1.5], ['Pebble_Square_2', 1]],
    rocks: ROCKS,
  };
  // the Hollow's lists: ferns and tall wispy grass under the walls, shelf fungus, rocks fallen from the walls; pebbles
  // and a few mushrooms on the board
  const HOLLOW = {
    low: [['Fern_1', 2], ['Grass_Wispy_Tall', 1.2], ['Rock_Medium_1', 0.45], ['Rock_Medium_2', 0.45], ['Rock_Medium_3', 0.45], ['Mushroom_Laetiporus', 0.8], ['Plant_1_Big', 0.6]],
    tuft: [['Pebble_Round_1', 2], ['Pebble_Round_2', 2], ['Pebble_Square_2', 1.5], ['Mushroom_Common', 1], ['Grass_Wispy_Short', 1], ['Fern_1', 0.6]],
    dress: [['Pebble_Round_1', 2], ['Pebble_Round_2', 2], ['Pebble_Square_2', 1], ['Mushroom_Common', 0.5]],
    rocks: ROCKS,
  };
  // the desert's lists (low things, tufts, the board's dressing, boulders)
  const DESERT = {
    low: [['DesertRock_1', 1], ['DesertRock_2', 1], ['DesertRock_3', 1], ['Grass_Wispy_Short', 3], ['PalmTree_5', 1]],
    tuft: [['Grass_Wispy_Short', 3], ['Grass_Common_Short', 2], ['Pebble_Round_1', 1], ['Pebble_Round_2', 1], ['Pebble_Square_2', 1]],
    dress: [['Pebble_Round_1', 2], ['Pebble_Round_2', 2], ['Pebble_Square_2', 2], ['Grass_Wispy_Short', 1.5]],
    rocks: [['DesertRock_1', 1], ['DesertRock_2', 1], ['DesertRock_3', 1]],
  };
  // Ashlands' lists: bare rocks and pebbles, nothing growing
  const ASH = {
    low: [['Rock_Medium_1', 1], ['Rock_Medium_2', 1], ['Rock_Medium_3', 1], ['Pebble_Square_2', 1.5], ['Pebble_Round_2', 1]],
    tuft: [['Pebble_Round_1', 2], ['Pebble_Round_2', 2], ['Pebble_Square_2', 1.5]],
    dress: [['Pebble_Round_1', 2], ['Pebble_Round_2', 2], ['Pebble_Square_2', 1.5]],
    rocks: ROCKS,
  };
  // Darkwoods' lists: ferns, tall wispy grass, shelf fungus and mushrooms, mossy rocks; clover and mushrooms on the board
  const DARK = {
    low: [['Fern_1', 3], ['Plant_1_Big', 1.2], ['Grass_Wispy_Tall', 1.5], ['Bush_Common', 0.8], ['Rock_Medium_1', 0.5], ['Rock_Medium_2', 0.5], ['Rock_Medium_3', 0.5], ['Mushroom_Laetiporus', 0.9]],
    tuft: [['Fern_1', 2], ['Clover_1', 2], ['Mushroom_Common', 1.5], ['Grass_Wispy_Short', 1.5], ['Grass_Common_Short', 2], ['Pebble_Round_1', 0.7]],
    dress: [['Clover_1', 2], ['Mushroom_Common', 0.8], ['Grass_Common_Short', 3], ['Pebble_Round_1', 1], ['Pebble_Round_2', 1]],
    rocks: ROCKS,
  };
  // Moonlit Snow's lists: snow piles in place of most of the rocks
  const SNOWY = {
    low: [['SnowPile_1', 2], ['SnowPile_2', 2], ['SnowPile_3', 2], ['Rock_Medium_1', 0.4], ['Rock_Medium_2', 0.4]],
    tuft: [['SnowPile_1', 1.5], ['SnowPile_2', 1.5], ['SnowPile_3', 1.5], ['Pebble_Round_1', 0.4], ['Pebble_Square_2', 0.3]],
    dress: DRESS,
    rocks: [['SnowPile_1', 1], ['SnowPile_2', 1], ['SnowPile_3', 1], ['Rock_Medium_1', 0.25], ['Rock_Medium_3', 0.25]],
  };
  // Snow's lists: faceted boulders, ice chunks, small crystal clusters, a few snowy rocks
  const SUMMIT = {
    low: [['Boulder_S1', 2], ['Boulder_S2', 2], ['Boulder_S3', 2], ['IceChunk_1', 1.2], ['Crystal_2', 0.5], ['Rock_Medium_1', 0.5], ['Rock_Medium_3', 0.5]],
    tuft: [['Boulder_S3', 1], ['IceChunk_1', 1.2], ['Rock_Medium_2', 0.6], ['Pebble_Round_1', 0.6], ['Pebble_Square_2', 0.6]],
    dress: DRESS,
    rocks: [['Boulder_S1', 1], ['Boulder_S2', 1], ['Boulder_S3', 0.6], ['Formation_1', 0.5]],
  };
  const SAVANNA = {
    low: [['Thorn_1', 2], ['Thorn_2', 1.5], ['Grass_Common_Tall', 1.5], ['Termite_3', 0.25], ['Boulder_3', 0.3]],
    tuft: [['Grass_Common_Tall', 2], ['Grass_Wispy_Short', 2], ['Thorn_2', 0.5], ['Pebble_Round_1', 0.5]],
    dress: [['Grass_Wispy_Short', 3], ['Grass_Common_Short', 2], ['Pebble_Round_1', 1], ['Pebble_Round_2', 1]],
    rocks: [['Boulder_1', 1], ['Boulder_2', 1], ['Boulder_3', 1]],
  };
  // the oasis's water (off the board): water, a shallow rim and wet sand round it
  const pondMats = [new THREE.MeshLambertMaterial({ color: '#8C7650' }), new THREE.MeshLambertMaterial({ color: '#86AE9E' }), new THREE.MeshStandardMaterial({ color: '#4E8C8E', roughness: 0.2, metalness: 0 })];
  const pondGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
  // snow drifts: soft low mounds
  const driftGeo = new THREE.IcosahedronGeometry(1, 1), driftMat = new THREE.MeshLambertMaterial({ color: '#B4C1CA' });
  driftMat.onBeforeCompile = shadeLit; driftMat.customProgramCacheKey = () => 'pb-drift';
  // the deep snow sheet (Moonlit Snow): vertex colours for crests and hollows, the look's tint as its colour
  const snowGroundMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  snowGroundMat.onBeforeCompile = shadeLit; snowGroundMat.customProgramCacheKey = () => 'pb-deepsnow';
  // smooth value noise, 0 to 1, the same everywhere for the same spot
  const hash2 = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // the land's own shade: a dark veil over the ground round the board (the page's land plane is one flat colour)
  const veilMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: true, uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...shadeU },
    vertexShader: `varying vec2 vShadeXZ;
      #include <fog_pars_vertex>
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vShadeXZ = w.xz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `${SHADE_GLSL} varying vec2 vShadeXZ;
      #include <fog_pars_fragment>
      void main() { float a = max(1.0 - pbShade(vShadeXZ), pbDeep(vShadeXZ));
        #ifdef USE_FOG
          a *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
        #endif
        gl_FragColor = vec4(uNight.rgb * 0.05, a); }` });
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), veilMat);
  veil.position.y = -0.035; veil.raycast = () => {}; veil.visible = false; veil.renderOrder = -1; scene.add(veil);
  // falling snow: points drifting down through a box round the board, moved in the shader (tick(dt) moves the clock)
  const FLAKES = 1600, snowTime = { value: 0 };
  const flakeGeo = new THREE.BufferGeometry(); {
    const P = new Float32Array(FLAKES * 3), S = new Float32Array(FLAKES);
    for (let i = 0; i < FLAKES; i++) { P.set([(Math.random() * 2 - 1) * 70, Math.random() * 45, -95 + Math.random() * 160], i * 3); S[i] = Math.random(); }
    flakeGeo.setAttribute('position', new THREE.BufferAttribute(P, 3)); flakeGeo.setAttribute('aSeed', new THREE.BufferAttribute(S, 1));
    flakeGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 20, -15), 130);
  }
  // the same points carry falling snow or rising embers (Ashlands): dir 1 falls, -1 rises; keep: the share of the
  // points shown; flick: how much each one flickers; sway: how far it drifts sideways
  const FALL = {
    snow: { col: [0.93, 0.96, 1.0], dir: 1, spd: 1, keep: 1, size: 1, flick: 0, sway: 1 },
    embers: { col: [1.0, 0.58, 0.26], dir: -1, spd: 0.75, keep: 0.5, size: 1.2, flick: 0.8, sway: 1.8 },
    ash: { col: [0.66, 0.63, 0.6], dir: 1, spd: 0.32, keep: 0.5, size: 0.95, flick: 0, sway: 2.4 }, // grey ash drifting down (Ashlands, with the embers)
    dust: { col: [1.0, 0.9, 0.66], dir: 1, spd: 0.07, keep: 0.3, size: 0.75, flick: 0.35, sway: 3.2 }, // dust and grass seed hanging in the low sun (Savanna)
    motes: { col: [1.0, 0.84, 0.58], dir: 1, spd: 0.035, keep: 0.34, size: 0.7, flick: 0.7, sway: 2.2, add: true }, // dust motes glinting in the light from the hole (the Hollow)
    spores: { col: [0.82, 1.0, 0.6], dir: -1, spd: 0.06, keep: 0.32, size: 0.8, flick: 0.9, sway: 2.6, add: true }, // glowing spores rising slowly (Darkwoods)
    // Snow (2026-11-07). stream: [speed m/s along the wind, how high (0 to 1 of the box)]: the points race sideways along
    // the wind (biome .wind) low over the ground, in gusts (bands of thicker drift sweeping downwind), each drawn as a
    // streak along its way; keep2 / spd2: the share shown and the speed at the last round (the wind gets up)
    spindrift: { col: [0.97, 0.99, 1.0], dir: 1, spd: 0.15, keep: 0.42, keep2: 0.98, size: 3.2, flick: 0, sway: 0.25, stream: [9, 0.13], spd2: 1.7 },
    // diamond dust: ice crystals hanging in the sunlit air, each flashing now and then as it catches the sun
    diamond: { col: [1.0, 1.0, 1.0], dir: 1, spd: 0.02, keep: 0.4, size: 1.1, flick: 0, sway: 1.4, add: true, flash: 1, stream: [0.6, 0.4] },
  };
  const fallU = { uCol: { value: new THREE.Vector3() }, uDir: { value: 1 }, uSpd: { value: 1 }, uKeep: { value: 1 }, uSize: { value: 1 }, uFlick: { value: 0 }, uSway: { value: 1 },
    uStream: { value: new THREE.Vector4(0, 0, 0, 0) }, uFlash: { value: 0 } };
  // uStream (Snow): x, z the drift's velocity (m/s), w how high it reaches (a share of the 45 m box; 0: it falls as
  // snow does); uFlash: sparkles instead of soft dots
  const flakeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: snowTime, uPx: { value: 1 }, ...fallU, ...shadeU },
    vertexShader: `attribute float aSeed; uniform float uTime; uniform float uPx; uniform float uDir; uniform float uSpd; uniform float uKeep; uniform float uSize; uniform float uFlick; uniform float uSway; uniform vec4 uStream; uniform float uFlash; varying float vA; varying vec2 vDir;
      ${SHADE_GLSL}
      void main() { vec3 p = position; p.y = mod(p.y - uDir * uTime * uSpd * (1.6 + aSeed * 1.6), 45.0); p.x += sin(uTime * 0.7 + aSeed * 40.0) * 1.3 * uSway; p.z += cos(uTime * 0.5 + aSeed * 30.0) * 0.8 * uSway;
        float gust = 1.0; vDir = vec2(0.0);
        if (uStream.w > 0.0) {
          vec2 w = uStream.xy * uTime * (0.7 + aSeed * 0.6);
          p.x = mod(p.x + w.x + 70.0, 140.0) - 70.0; p.z = mod(p.z + w.y + 95.0, 160.0) - 95.0; p.y *= uStream.w;
          vec2 wd = normalize(uStream.xy); float g = 0.5 + 0.5 * sin(dot(p.xz, wd) * 0.07 - uTime * length(uStream.xy) * 0.07 + sin(dot(p.xz, vec2(-wd.y, wd.x)) * 0.05) * 1.5);
          gust = mix(0.12, 1.0, g * g) * smoothstep(70.0, 58.0, abs(p.x)) * smoothstep(0.0, 10.0, p.z + 95.0) * smoothstep(0.0, 10.0, 65.0 - p.z);
          if (uFlash <= 0.0) { // a streak along the wind on the screen
            vec4 a0 = projectionMatrix * viewMatrix * vec4(p, 1.0), a1 = projectionMatrix * viewMatrix * vec4(p + vec3(wd.x, 0.0, wd.y), 1.0);
            vec2 sd = (a1.xy / a1.w - a0.xy / a0.w) * vec2(projectionMatrix[1][1] / projectionMatrix[0][0], 1.0);
            vDir = length(sd) > 1e-6 ? normalize(vec2(sd.x, -sd.y)) * min(1.0, length(sd) * 40.0) : vec2(0.0); }
        }
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSeed > uKeep ? 0.0 : uPx * uSize * (0.35 + aSeed * 0.35) * 300.0 / max(1.0, -mv.z) * (uStream.w > 0.0 ? (1.0 + length(vDir) * 1.5) * (0.6 + 0.4 * gust) : 1.0);
        vA = (0.55 + aSeed * 0.35) * (1.0 - uFlick * (0.5 + 0.5 * sin(uTime * (3.0 + aSeed * 4.0) + aSeed * 60.0))) * (uDir < 0.0 ? smoothstep(45.0, 20.0, p.y) : 1.0) * (0.35 + 0.65 * pbShade(p.xz)) * (1.0 - 0.85 * pbDeep(p.xz)) * gust;
        if (uFlash > 0.0) vA *= 0.15 + 2.6 * pow(0.5 + 0.5 * sin(uTime * (0.9 + aSeed * 1.7) + aSeed * 91.0), 24.0); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uFlash; varying float vA; varying vec2 vDir;
      void main() { vec2 q = gl_PointCoord - 0.5; float d = length(q);
        if (uFlash > 0.0) { vec2 aq = abs(q); float s = max(exp(-aq.x * 40.0) * exp(-aq.y * 7.0), exp(-aq.y * 40.0) * exp(-aq.x * 7.0)) + smoothstep(0.12, 0.0, d); // a four-point sparkle
          if (s < 0.02) discard; gl_FragColor = vec4(uCol, vA * min(1.0, s)); return; }
        float k = length(vDir); if (k > 0.0) { vec2 dir = vDir / k; d = length(vec2(dot(q, dir), dot(q, vec2(-dir.y, dir.x)) * (1.0 + 4.0 * k))); } // squeezed across the wind
        if (d > 0.5) discard; gl_FragColor = vec4(uCol, vA * smoothstep(0.5, 0.2, d)); }` });
  const flakes = new THREE.Points(flakeGeo, flakeMat); flakes.visible = false; flakes.raycast = () => {}; scene.add(flakes);
  // a second layer of the same points with its own settings (Ashlands' falling ash, while the first carries embers)
  const flake2Mat = flakeMat.clone();
  for (const k of ['uTime', 'uPx', ...Object.keys(shadeU)]) flake2Mat.uniforms[k] = flakeMat.uniforms[k];
  const flakes2 = new THREE.Points(flakeGeo, flake2Mat); flakes2.visible = false; flakes2.raycast = () => {}; flakes2.rotation.y = 1.3; scene.add(flakes2);
  function setFall(pts, mat, kind) {
    const f = FALL[kind], U = mat.uniforms; pts.visible = !!f; if (!f) return;
    U.uCol.value.set(...f.col); U.uDir.value = f.dir; U.uSpd.value = f.spd; U.uKeep.value = f.keep; U.uSize.value = f.size; U.uFlick.value = f.flick; U.uSway.value = f.sway;
    U.uFlash.value = f.flash || 0;
    if (f.stream) { const l = Math.hypot(wind[0], wind[1]) || 1; U.uStream.value.set(wind[0] / l * f.stream[0], wind[1] / l * f.stream[0], 0, f.stream[1]); } else U.uStream.value.set(0, 0, 0, 0);
    mat.blending = kind === 'embers' || f.add ? THREE.AdditiveBlending : THREE.NormalBlending; mat.needsUpdate = true;
  }
  const showFall = (kind, kind2) => { setFall(flakes, flakeMat, kind); setFall(flakes2, flake2Mat, kind2); };

  // ---------- the cabin (Moonlit Snow): log walls, a snowy roof, a stone chimney with smoke, warm lit windows whose
  // light spills on the snow. Built once from simple shapes, moved and shown per layout (never disposed with it). ----------
  const cabin = new THREE.Group(); cabin.visible = false; scene.add(cabin);
  const cabinLight = new THREE.PointLight('#FFAE5C', 0, 34, 2); // intensity 0 when hidden, so no look switch recompiles shaders
  scene.add(cabinLight);
  const smoke = [];
  {
    const cv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; };
    // logs: horizontal bands with dark gaps and a lighter top edge
    const logTex = cv(64, 64, (g, w, h) => { for (let i = 0; i < 4; i++) { const y = i * 16; g.fillStyle = i % 2 ? '#6B4A33' : '#73513A'; g.fillRect(0, y, w, 16); g.fillStyle = '#8A6447'; g.fillRect(0, y + 2, w, 3); g.fillStyle = '#3A281D'; g.fillRect(0, y + 14, w, 2); } });
    logTex.wrapS = logTex.wrapT = THREE.RepeatWrapping; logTex.repeat.set(2, 1.6);
    const glowTex = cv(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const puffTex = cv(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const M = {
      log: new THREE.MeshLambertMaterial({ map: logTex, color: '#B9A595', side: THREE.DoubleSide }),
      roof: new THREE.MeshLambertMaterial({ color: '#3B2C24' }),
      snow: new THREE.MeshLambertMaterial({ color: '#DDE5F0' }),
      stone: new THREE.MeshLambertMaterial({ color: '#6A6E75' }),
      dark: new THREE.MeshLambertMaterial({ color: '#2E2018' }),
      win: new THREE.MeshBasicMaterial({ color: '#FFC56E' }), // unlit: it glows whatever the moon does
      spill: new THREE.MeshBasicMaterial({ map: glowTex, color: '#FF9F4A', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
    };
    const add = (geo, mat, x, y, z, ry = 0, rz = 0, parent = cabin) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(0, ry, rz); m.raycast = () => {}; parent.add(m); return m; };
    const W = 7, D = 5.4, H = 3, R = 2.3, a = Math.atan2(R, W / 2), Ls = Math.hypot(W / 2, R) + 0.7;
    add(new THREE.BoxGeometry(W, H, D), M.log, 0, H / 2, 0);
    const tri = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, R)]);
    for (const z of [D / 2 + 0.005, -D / 2 - 0.005]) add(new THREE.ShapeGeometry(tri), M.log, 0, H, z);
    for (const sd of [1, -1]) { // the two roof slopes, each wood under a thick layer of snow
      const p = new THREE.Group(); p.position.set(sd * W / 4, H + R / 2 + 0.05, 0); p.rotation.z = -sd * a; cabin.add(p);
      add(new THREE.BoxGeometry(Ls, 0.28, D + 1.1), M.roof, 0, 0.14, 0, 0, 0, p);
      add(new THREE.BoxGeometry(Ls + 0.1, 0.3, D + 1.2), M.snow, 0, 0.42, 0, 0, 0, p);
    }
    add(new THREE.BoxGeometry(0.95, R + 1.2, 0.95), M.stone, -W * 0.27, H + (R + 1.2) / 2, -0.6);
    add(new THREE.BoxGeometry(1.15, 0.22, 1.15), M.snow, -W * 0.27, H + R + 1.3, -0.6);
    add(new THREE.BoxGeometry(1.15, 2.1, 0.12), M.dark, 0, 1.05, D / 2 + 0.06); // the door
    add(new THREE.BoxGeometry(2.4, 0.18, 1.3), M.snow, 0, 0.09, D / 2 + 0.75);   // snow on the doorstep
    // a lit window: the glowing pane, a dark cross and a sill
    const win = (x, y, z, ry, w = 1.2, h = 0.95) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; cabin.add(g);
      add(new THREE.PlaneGeometry(w, h), M.win, 0, 0, 0.02, 0, 0, g);
      add(new THREE.BoxGeometry(w + 0.2, 0.09, 0.08), M.dark, 0, 0, 0.05, 0, 0, g);
      add(new THREE.BoxGeometry(0.09, h + 0.2, 0.08), M.dark, 0, 0, 0.05, 0, 0, g);
      for (const yy of [h / 2 + 0.06, -h / 2 - 0.06]) add(new THREE.BoxGeometry(w + 0.3, 0.12, 0.16), yy > 0 ? M.dark : M.snow, 0, yy, 0.06, 0, 0, g);
    };
    win(-2.2, 1.65, D / 2 + 0.01, 0); win(2.2, 1.65, D / 2 + 0.01, 0); win(0, H + 0.85, D / 2 + 0.02, 0, 0.7, 0.6);
    win(W / 2 + 0.01, 1.65, 0.6, Math.PI / 2); win(-W / 2 - 0.01, 1.65, 0.9, -Math.PI / 2);
    // the warm light on the snow: soft glows under the windows and in front of the door
    const spill = (x, z, sx, sz) => { const m = add(new THREE.PlaneGeometry(1, 1), M.spill, x, 0.06, z); m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1); m.renderOrder = 2; };
    spill(0, D / 2 + 3.2, 11, 6.5); spill(W / 2 + 2.6, 0.6, 5, 4.5); spill(-W / 2 - 2.6, 0.9, 5, 4.5);
    // firewood stacked by the wall
    const logG = new THREE.CylinderGeometry(0.17, 0.17, 1.6, 7).rotateZ(Math.PI / 2);
    [[0, 0.17], [0.36, 0.17], [0.72, 0.17], [0.18, 0.47], [0.54, 0.47], [0.36, 0.77]].forEach(([zz, y]) => add(logG, M.roof, W / 2 + 0.45, y, -1.6 + zz, Math.PI / 2));
    // chimney smoke: a few soft puffs rising and fading (moved in tick)
    for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: '#8C95A3', transparent: true, depthWrite: false, opacity: 0 })); s.raycast = () => {}; cabin.add(s); smoke.push(s); }
    smoke.top = new THREE.Vector3(-W * 0.27, H + R + 1.5, -0.6);
    cabin.userData.dispose = () => { cabin.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map && o.material.map !== logTex) o.material.map.dispose(); o.material.dispose(); } }); logTex.dispose(); for (const m of Object.values(M)) m.dispose(); };
  }
  // where the cabin stands in this layout (null: not shown); nothing else is placed within its clearing
  let cabinAt = null;
  function showCabin(at) {
    cabinAt = at; cabin.visible = !!at; cabinLight.intensity = at ? 110 : 0;
    if (!at) return;
    cabin.position.set(at.x, 0, at.z); cabin.rotation.y = at.ang; cabin.scale.setScalar(at.s);
    cabinLight.position.set(at.x + Math.sin(at.ang) * 4.5 * at.s, 2.4 * at.s, at.z + Math.cos(at.ang) * 4.5 * at.s);
  }
  // ---------- Christmas props (Moonlit Snow): KayKit Holiday Bits snowmen and lanterns (src/kaykit3d.js), each lantern
  // with a glow at its lamp and warm light on the snow round it (uLamps). Rebuilt per layout from cached geometry. ----------
  const xmas = new THREE.Group(); scene.add(xmas);
  const kkCache = {};
  const kkGeo = (name) => {
    if (name in kkCache) return kkCache[name];
    const d = typeof KAYKIT !== 'undefined' && KAYKIT[name]; if (!d) return (kkCache[name] = null);
    const dec = (b) => Uint8Array.from(atob(b), (ch) => ch.charCodeAt(0));
    const q = new Int16Array(dec(d[0]).buffer), rgb = dec(d[1]), [lo, hi] = [d[2], d[3]];
    const pos = new Float32Array(q.length), col = new Float32Array(q.length), c = new THREE.Color();
    for (let i = 0; i < q.length; i++) { const k = i % 3; pos[i] = lo[k] + (q[i] + 32767) / 65534 * (hi[k] - lo[k]); }
    for (let t = 0; t < q.length / 9; t++) { c.setRGB(rgb[t * 3] / 255, rgb[t * 3 + 1] / 255, rgb[t * 3 + 2] / 255, THREE.SRGBColorSpace); for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], t * 9 + k * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    return (kkCache[name] = g);
  };
  const propMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  propMat.onBeforeCompile = shadeLit; propMat.customProgramCacheKey = () => 'pb-prop';
  const lampGlowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const lampGlowMat = new THREE.SpriteMaterial({ map: lampGlowTex, color: '#FFB257', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  // soot: the same models blackened by fire (Ashlands' ruins, swords and barricades)
  const sootMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: '#453C38' });
  sootMat.onBeforeCompile = shadeLit; sootMat.customProgramCacheKey = () => 'pb-soot';
  const emberGlowMat = new THREE.SpriteMaterial({ map: lampGlowTex, color: '#FF6A28', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const lampFlick = [], emberGlows = []; let lampT = 0;
  const glowMats = {};
  const glowMat = (col) => glowMats[col] || (glowMats[col] = new THREE.SpriteMaterial({ map: lampGlowTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  // made-in-code props, coloured per part (kkGeo serves them by name): a spear, a stake, torn banners of both armies
  const colGeo = (parts) => {
    const pos = [], col = [], c = new THREE.Color();
    for (const [g0, hex, mx] of parts) { const g = g0.index ? g0.toNonIndexed() : g0; if (mx) g.applyMatrix4(mx); c.set(hex); const a = g.attributes.position.array; pos.push(...a); for (let i = 0; i < a.length / 3; i++) col.push(c.r, c.g, c.b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  };
  const M4 = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
  const banner = (cloth) => {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.5, 0); sh.lineTo(1.5, -1.5); sh.lineTo(1.25, -2.1); sh.lineTo(1.0, -1.6); sh.lineTo(0.7, -2.3); sh.lineTo(0.45, -1.7); sh.lineTo(0.2, -2.0); sh.lineTo(0, -1.5); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(0.9, -0.8, 0.2, 0, Math.PI * 2, true); sh.holes.push(hole); // a burn hole
    return colGeo([[new THREE.CylinderGeometry(0.07, 0.08, 4.6, 6), '#3E2E24', M4(0, 2.3, 0, 0, 0, 0.06)], [new THREE.CylinderGeometry(0.05, 0.05, 1.7, 5), '#3E2E24', M4(0.75, 4.3, 0, 0, 0, Math.PI / 2 + 0.1)],
      [new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }), cloth, M4(0.02, 4.25, 0, 0, 0, 0.08)]]);
  };
  const MADE = {
    __spear: () => colGeo([[new THREE.CylinderGeometry(0.045, 0.05, 3.2, 5), '#6B4E35', M4(0, 1.6, 0)], [new THREE.ConeGeometry(0.1, 0.45, 4), '#8C9096', M4(0, 3.42, 0)]]),
    __stake: () => colGeo([[new THREE.CylinderGeometry(0.12, 0.14, 1.9, 6), '#4A3828', M4(0, 0.95, 0)], [new THREE.ConeGeometry(0.12, 0.4, 6), '#3A2A1E', M4(0, 2.1, 0)]]),
    __banner_red: () => banner('#7A3A30'), __banner_blue: () => banner('#3A4A6A'),
    // the Hollow: a cocoon of silk (2.2 m, its foot at 0), wound round with a few thicker bands; the lost explorer's
    // frying pan and tin cup (Forest Glade), dangling under one
    __cocoon: () => { const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(0.02 + 0.56 * Math.pow(Math.sin(Math.PI * t), 0.75) * (1 - 0.18 * t), t * 2.2)); }
      return colGeo([[new THREE.LatheGeometry(prof, 9), '#D8CFBF'], ...[0.55, 0.95, 1.35, 1.7].map((y, i) => [new THREE.TorusGeometry(0.5 * Math.pow(Math.sin(Math.PI * y / 2.2), 0.75), 0.06, 4, 10), i % 2 ? '#C9BFAD' : '#E6DED0', M4(0, y, 0, Math.PI / 2 + (i - 1.5) * 0.25, 0, 0.2)])]); },
    __pan: () => colGeo([[new THREE.CylinderGeometry(0.42, 0.36, 0.12, 10), '#34312F', M4(0, 0, 0, Math.PI / 2, 0, 0)], [new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), '#2A2826', M4(0, 0.7, 0)]]),
    __cup: () => colGeo([[new THREE.CylinderGeometry(0.13, 0.11, 0.24, 8), '#8E9398'], [new THREE.TorusGeometry(0.07, 0.02, 4, 8), '#8E9398', M4(0.14, 0.02, 0)]]),
  };
  const geoOf = (name) => { if (!(name in kkCache) && MADE[name]) kkCache[name] = MADE[name](); return kkGeo(name); };
  // props: [{ kind: 'lantern' | 'snowman' | 'model' | 'ember', model, mat 'soot', x, z, y, ang, s, tilt, roll, glow, light }];
  // an ember is a smouldering spot: a flickering glow low on the ground and flickering warm light round it. glow: [height
  // m, size m, colour] a soft glow sprite on the model (candle flames); light: [reach m, strength, flicker 0 to 1] warm
  // light round it (uLamps, at most 8 in all). Models are drawn instanced, one draw per model and material.
  function showProps(props) {
    for (const o of [...xmas.children]) { xmas.remove(o); if (o.isInstancedMesh) o.dispose(); }
    shadeU.uLamps.value.forEach((v) => v.set(0, 0, 1, 0)); lampFlick.length = 0; emberGlows.length = 0;
    let li = 0;
    const lamp = (x, z, reach, str, fl) => { if (li >= 8) return; shadeU.uLamps.value[li].set(x, z, reach, str); lampFlick.push([li, str, fl, x * 0.37 + z * 0.11]); li++; };
    const groups = new Map();
    for (const p of props || []) {
      if (p.kind === 'ember') {
        const gl = new THREE.Sprite(emberGlowMat); gl.position.set(p.x, p.y + 0.5, p.z); gl.scale.setScalar(p.s * 3); gl.raycast = () => {}; xmas.add(gl);
        emberGlows.push([gl, p.s * 3, p.x + p.z]); if (p.lamp !== false) lamp(p.x, p.z, 8 * p.s, 1.3, 1); continue;
      }
      const name = p.model || (p.kind === 'lantern' ? 'lantern' : 'snowman_A'), key = name + '|' + (p.mat || '');
      (groups.get(key) || groups.set(key, []).get(key)).push(p);
      if (p.glow) { const gl = new THREE.Sprite(glowMat(p.glow[2])); gl.position.set(p.x, p.y + p.glow[0], p.z); gl.scale.setScalar(p.glow[1]); gl.raycast = () => {}; xmas.add(gl); emberGlows.push([gl, p.glow[1], p.x * 1.7 + p.z]); }
      if (p.light) lamp(p.x, p.z, p.light[0], p.light[1], p.light[2]);
      if (p.kind === 'lantern') {
        const gl = new THREE.Sprite(lampGlowMat); gl.position.set(p.x, p.y + 3.25 * p.s, p.z); gl.scale.setScalar(3.2 * p.s); gl.raycast = () => {}; xmas.add(gl);
        lamp(p.x, p.z, 12, 1.6, 0);
      }
    }
    const e = new THREE.Euler();
    for (const [key, list] of groups) {
      const [name, mat] = key.split('|'), g = geoOf(name); if (!g) continue;
      const im = new THREE.InstancedMesh(g, mat === 'soot' ? sootMat : propMat, list.length);
      list.forEach((p, i) => im.setMatrixAt(i, tmpM.compose(tmpP.set(p.x, p.y, p.z), tmpQ.setFromEuler(e.set(p.tilt || 0, p.ang, p.roll || 0, 'YXZ')), tmpS.set(p.s, p.s, p.s))));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = true; im.raycast = () => {}; xmas.add(im);
    }
  }
  // ---------- the fire on the horizon (biome .horizon): a wide glow behind the far woods, under the smoke ----------
  const horizonTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 128, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const horizonMat = new THREE.MeshBasicMaterial({ map: horizonTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  const horizon = new THREE.Mesh(new THREE.PlaneGeometry(900, 110), horizonMat); horizon.visible = false; horizon.raycast = () => {}; scene.add(horizon);
  // ---------- smoke columns (biome .smokes): grey-brown puffs rising and spreading from smouldering craters ----------
  const smokeCols = new THREE.Group(); smokeCols.visible = false; scene.add(smokeCols); let smokeColT = 0;
  function showSmokes(list) {
    for (const o of [...smokeCols.children]) { smokeCols.remove(o); o.material.dispose(); }
    smokeCols.visible = list.length > 0;
    list.forEach((e, k) => { for (let i = 0; i < 8; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampGlowTex, color: k % 2 ? '#5A514C' : '#4A423E', transparent: true, depthWrite: false, opacity: 0 }));
      sp.raycast = () => {}; sp.userData = { x: e.x, y: e.y, z: e.z, h: 16 + e.s * 6, s: 2.2 + e.s, drift: 5, spd: 0.07 + k * 0.006, off: i / 8, o: 0.5 }; smokeCols.add(sp); } });
  }
  // ---------- the dragon's shadow (biome .dragonShadow): never the dragon itself, only its shadow racing over the
  // field and the land beside it, wings beating. flyover() starts one pass (the page calls it when the opponent is
  // ready) and returns how long it takes in ms (0 on other looks), so the page keeps drawing until it's over. ----------
  const dragonTex = (() => {
    const W = 512, c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(262, 256, 74, 21, 0, 0, Math.PI * 2); g.fill(); // body
    g.beginPath(); g.moveTo(318, 246); g.quadraticCurveTo(372, 236, 418, 248); g.lineTo(420, 262); g.quadraticCurveTo(372, 268, 318, 268); g.fill(); // neck
    g.beginPath(); g.ellipse(432, 255, 28, 12, 0, 0, Math.PI * 2); g.fill(); // head
    g.beginPath(); g.moveTo(446, 246); g.lineTo(478, 236); g.lineTo(452, 252); g.moveTo(446, 264); g.lineTo(478, 274); g.lineTo(452, 258); g.fill(); // horns
    g.beginPath(); g.moveTo(200, 246); g.bezierCurveTo(140, 240, 90, 290, 30, 300); g.lineTo(28, 306); g.bezierCurveTo(95, 304, 140, 268, 200, 266); g.fill(); // tail
    g.beginPath(); g.moveTo(30, 303); g.lineTo(6, 290); g.lineTo(14, 304); g.lineTo(6, 318); g.fill(); // its spade
    for (const sd of [-1, 1]) { // the wings: a leading edge out to the tip, then scalloped skin between the fingers back to the body
      const y = (v) => 256 + sd * (256 - v);
      g.beginPath(); g.moveTo(306, y(244)); g.lineTo(318, y(150)); g.lineTo(282, y(22));
      g.quadraticCurveTo(262, y(92), 236, y(70)); g.quadraticCurveTo(222, y(140), 196, y(118)); g.quadraticCurveTo(190, y(190), 164, y(186)); g.quadraticCurveTo(190, y(226), 214, y(246)); g.closePath(); g.fill();
    }
    const b = document.createElement('canvas'); b.width = b.height = W; const bg = b.getContext('2d'); bg.filter = 'blur(3px)'; bg.drawImage(c, 0, 0);
    const t = new THREE.CanvasTexture(b); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const dragonMat = new THREE.MeshBasicMaterial({ map: dragonTex, color: '#000000', transparent: true, opacity: 0.68, depthWrite: false, depthTest: false, fog: false });
  const dragonShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), dragonMat);
  dragonShadow.visible = false; dragonShadow.renderOrder = 6; dragonShadow.raycast = () => {}; scene.add(dragonShadow);
  let curBi = null, fly = null;
  function flyover() {
    if (!curBi || !curBi.dragonShadow || !half) return 0;
    const dir = Math.random() < 0.5 ? 1 : -1, z0 = (Math.random() * 2 - 1) * half.hd * 0.7, dz = (Math.random() * 2 - 1) * half.hd * 0.5, x0 = half.hw + 75;
    fly = { t: 0, dur: 1.8, a: new THREE.Vector3(-dir * x0, 0.35, z0 - dz), b: new THREE.Vector3(dir * x0, 0.35, z0 + dz), len: 42 };
    dragonShadow.rotation.y = Math.atan2(-(fly.b.z - fly.a.z), fly.b.x - fly.a.x); dragonShadow.visible = true;
    return fly.dur * 1000 + 150;
  }
  let half = null;
  // ---------- Savanna: the sea of grass (one clump of blades, instanced thousands of times round the board) that the
  // wind combs in long waves (bending the blades and lighting their tips as a gust passes, so the waves read even from
  // straight above), the land's own colours under it, and vultures circling high over the board ----------
  const windT = { value: 0 };
  const grassGeo = (() => {
    const P = [], C = [], N = [], c0 = new THREE.Color('#9C8346'), c1 = new THREE.Color('#EFD996'), c = new THREE.Color();
    let sd = 4242; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, d = 0.05 + r() * 0.22, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.75 + r() * 0.55, w = 0.05 + r() * 0.03;
      const la = a + (r() - 0.5) * 0.8, lean = 0.15 + r() * 0.3, px = -Math.sin(la) * w, pz = Math.cos(la) * w;
      P.push(x - px, 0, z - pz, x + px, 0, z + pz, x + Math.cos(la) * lean, h, z + Math.sin(la) * lean);
      const tip = c.copy(c1).multiplyScalar(0.9 + r() * 0.2);
      C.push(c0.r, c0.g, c0.b, c0.r, c0.g, c0.b, tip.r, tip.g, tip.b);
      for (let k = 0; k < 3; k++) N.push(0.15 * Math.cos(la), 0.98, 0.15 * Math.sin(la));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.computeBoundingSphere(); return g;
  })();
  const grassMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = windT;
    sh.vertexShader = 'uniform float uWind; varying float vGust; varying float vTip;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      float g = 0.5 + 0.5 * sin(dot(ip.xz, vec2(0.085, 0.05)) - uWind * 1.25); g = g * g * g;
      float g2 = 0.5 + 0.5 * sin(dot(ip.xz, vec2(-0.23, 0.19)) + uWind * 2.3);
      float tip = clamp(position.y / 1.2, 0.0, 1.0); vTip = tip; vGust = g;
      vec3 wdir = normalize(transpose(mat3(instanceMatrix)) * vec3(0.86, 0.0, 0.5));
      transformed += wdir * (0.1 + 0.55 * g + 0.07 * g2) * tip * tip;
      transformed.y -= 0.22 * g * tip * tip;`);
    sh.fragmentShader = 'varying float vGust; varying float vTip;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= 1.0 + 0.32 * vGust * vTip;')
      .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0; vec3 normal = normalize( vNormal ); vec3 nonPerturbedNormal = normal;'); // both faces lit as the front
  };
  grassMat.customProgramCacheKey = () => 'pb-grass-sea';
  const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  // vultures: a dark body and two long wings that hold a shallow V and now and then beat; they ride a thermal in wide
  // circles over the board, banking into the turn
  const vultureMat = new THREE.MeshLambertMaterial({ color: '#2F2823', side: THREE.DoubleSide, flatShading: true });
  const vultures = new THREE.Group(); vultures.visible = false; scene.add(vultures);
  {
    const wing = new THREE.BufferGeometry(); // root at the body, out along +x; the tip's long "fingers"
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, 0, 0, -0.45, 1.1, 0, 0.32, 1.1, 0, 0.32, 0, 0, -0.45, 1.25, 0, -0.42, 1.1, 0, 0.32, 1.25, 0, -0.42, 2.0, 0, -0.05, 2.0, 0, -0.05, 1.25, 0, -0.42, 1.85, 0, -0.38], 3)); wing.computeVertexNormals();
    const body = new THREE.ConeGeometry(0.2, 1.3, 5).rotateX(-Math.PI / 2), tail = new THREE.BufferGeometry();
    tail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.5, -0.3, 0, 1.05, 0.3, 0, 1.05], 3)); tail.computeVertexNormals();
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Group(), add = (g, sx = 1) => { const m = new THREE.Mesh(g, vultureMat); m.scale.x = sx; m.castShadow = true; m.raycast = () => {}; b.add(m); return m; };
      add(body); add(tail); b.userData.wings = [add(wing, 1), add(wing, -1)]; b.scale.setScalar(1.35); b.visible = false; vultures.add(b);
    }
  }
  // home: the wide circle each keeps (r, y, c: each circles a point up-sun of the board, so its shadow, thrown far by
  // the low sun, sweeps across the board); now: where it flies at the moment, gliding toward home or, while the
  // opponent is ready (prey(at) from render3d), toward a low, tight circle over your own tower
  // roost: a tap on a vulture sends them all to sit on a tree near the board (perch: one spot per bird, set per layout),
  // another tap brings them back; while the opponent is ready they still go to your tower, then back to the tree
  let vultureT = 0, preyAt = null, roosting = false, perch = [];
  function showVultures(n, sun) {
    vultures.visible = n > 0; if (!n) return;
    vultures.children.forEach((b, i) => { const y = 24 + (i * 3.7) % 9, f = 0.85 * y / sun[1];
      const home = { r: 8 + i * 4.5, y, c: [sun[0] * f, sun[2] * f - (i % 2) * 8] }, u = b.userData;
      b.visible = i < n; Object.assign(u, { home, now: u.now || { ...home, c: [...home.c] }, w: (0.16 - i * 0.012) * (i % 3 === 2 ? -1 : 1), a0: i * 1.9, i }); });
  }
  // the vultures circle over { x, z } (scene metres), or go back to their wide circles (null)
  function prey(at) { preyAt = at; }
  function roost() { roosting = !roosting; }
  // where the visible vultures are now (scene metres), for taps on them (render3d)
  const birds = () => vultures.visible ? vultures.children.filter((b) => b.visible).map((b) => b.position) : [];
  // true while something round the board lives on its own (the vultures): the page keeps drawing frames for it
  const alive = () => vultures.visible || ex.on || yt.on;
  // ---------- Darkwoods: banks of ground mist drifting between the trunks, pairs of eyes blinking in the dark, and pale
  // light falling through the canopy onto the clearing. All built per layout (update) and moved in tick. ----------
  const softTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  // a cloud: a few soft overlapping puffs, wider than tall
  const mistTex = softTex(128, 64, (g) => { let sd = 77; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    for (let i = 0; i < 9; i++) { const x = 30 + r() * 68, y = 26 + r() * 14, rad = 14 + r() * 16, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 64); } });
  // a light shaft: brightest in its middle, soft at its sides, fading out near the ground and high up
  const shaftTex = softTex(32, 128, (g, w, h) => { const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = Math.sin(Math.PI * (x + 0.5) / w) ** 2, v = y / (h - 1), sy = smoothstep(0, 0.35, v) * (1 - smoothstep(0.75, 1, v) * 0.75);
      const o = (y * w + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = Math.round(255 * sx * sy); }
    g.putImageData(img, 0, 0); });
  const woods = new THREE.Group(); woods.visible = false; scene.add(woods);
  const mists = [], eyes = [], shafts = []; let woodsT = 0, eyeSpots = [], eyeN = 0;
  const eyeMat = new THREE.SpriteMaterial({ map: lampGlowTex, color: '#E6F09A', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, color: '#FFF0C4', transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
  const shaftGeo = new THREE.PlaneGeometry(1, 1);
  function clearWoods() {
    for (const o of [...woods.children]) { woods.remove(o); if (o.isSprite && o.material !== eyeMat) o.material.dispose(); }
    mists.length = 0; eyes.length = 0; shafts.length = 0; eyeSpots = [];
  }
  // w: { mist: [[x, z, size, opacity]], eyes: spots [[x, y, z]], shafts: [[x, z, width]], sun: [x, y, z] }
  function showWoods(w) {
    clearWoods(); woods.visible = !!w; if (!w) return;
    for (const [x, z, sz, op] of w.mist) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: '#B2C6B8', transparent: true, depthWrite: false, opacity: op }));
      sp.position.set(x, sz * 0.16, z); sp.scale.set(sz * 1.7, sz * 0.6, 1); sp.raycast = () => {}; sp.renderOrder = 3; woods.add(sp); mists.push([sp, x, Math.random() * 6.3, op]);
    }
    eyeSpots = w.eyes;
    for (let i = 0; i < 16; i++) { // pairs of eyes: each comes and goes, now here, now there, blinking now and then
      const pair = new THREE.Group(); pair.visible = false;
      for (const sx of [-1, 1]) { const e = new THREE.Sprite(eyeMat); e.position.x = sx * 0.6; e.scale.set(1.15, 1.15, 1); e.raycast = () => {}; pair.add(e); }
      woods.add(pair); eyes.push({ g: pair, t: 2 + Math.random() * 3, life: 0, blink: 2 + Math.random() * 4 });
    }
    const dir = new THREE.Vector3(...w.sun).normalize(), q = new THREE.Quaternion().setFromUnitVectors(upY, dir);
    for (const [x, z, wd] of w.shafts) { // two crossed planes, so a shaft shows from any side
      const g = new THREE.Group(); g.quaternion.copy(q); g.position.set(x, 0, z).addScaledVector(dir, 36);
      for (const ry of [0, Math.PI / 2]) { const m = new THREE.Mesh(shaftGeo, shaftMat); m.scale.set(wd, 72, 1); m.rotation.y = ry; m.raycast = () => {}; m.renderOrder = 4; g.add(m); }
      woods.add(g); shafts.push(g);
    }
  }
  function tickWoods(dt) {
    woodsT += dt;
    for (const [sp, x0, ph, op] of mists) { sp.position.x = x0 + Math.sin(woodsT * 0.05 + ph) * 3.5; sp.material.opacity = op * (0.8 + 0.2 * Math.sin(woodsT * 0.13 + ph * 2)); }
    shaftMat.opacity = 0.05 + 0.015 * Math.sin(woodsT * 0.27);
    eyes.forEach((e, i) => {
      if (i >= eyeN || !eyeSpots.length) { e.g.visible = false; return; }
      e.t += dt;
      if (e.t >= e.life) { // gone: wait a little, then open somewhere else in the dark
        if (e.t < e.life + 1.5 + (i % 3)) { e.g.visible = false; return; }
        const [x, y, z] = eyeSpots[Math.floor(Math.random() * eyeSpots.length)];
        e.g.position.set(x, y, z); e.t = 0; e.life = 6 + Math.random() * 10; e.blink = 1.5 + Math.random() * 3; e.s = 0.8 + Math.random() * 0.5;
      }
      e.g.visible = true;
      const open = Math.min(1, e.t / 0.8, (e.life - e.t) / 0.8); // they open slowly and close slowly
      let lid = 1; if ((e.t % e.blink) > e.blink - 0.16) lid = 0.12; // a blink
      for (const c of e.g.children) c.scale.set(1.15 * e.s, 1.15 * e.s * Math.max(0.08, open * lid), 1);
    });
  }
  // ---------- Forest Glade's explorer: when your opponent is ready (foeReady from render3d), a lost explorer with a far
  // too big backpack comes running out of the woods along the old road across no man's land, stops in the middle to
  // look around, puzzled, with his map (a "?" over his head), then hurries on into the woods on the other side. If the
  // fight starts while he's still out there, he panics ("!") and sprints off. Built from simple shapes, once. ----------
  const explorer = new THREE.Group(); explorer.visible = false; scene.add(explorer);
  const ex = { on: false, s: 'in', x: 0, dir: 1, t: 0, ph: 0, ry: 0, panic: false, path: null, last: false, P: {} };
  const exMats = [];
  function buildExplorer() {
    const M = (c) => { const m = new THREE.MeshLambertMaterial({ color: c, flatShading: true }); exMats.push(m); return m; };
    const C = { skin: M('#E9C4A2'), shirt: M('#CDBB8E'), shorts: M('#A5916A'), boot: M('#5C4332'), pack: M('#8C7C54'), packD: M('#6C5F40'), roll: M('#B8654F'),
      helmet: M('#F4EEDC'), dark: M('#2E2622'), white: M('#FBF8EE'), pan: M('#403C3A'), map: M('#F0E4C2'), cup: M('#7E8C92') };
    const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.raycast = () => {}; parent.add(m); return m; };
    const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    const sph = (r, sx = 1, sy = 1, sz = 1) => new THREE.SphereGeometry(r, 10, 8).scale(sx, sy, sz), box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (r1, r2, h, n = 8) => new THREE.CylinderGeometry(r1, r2, h, n);
    const root = grp(explorer, 0, 0, 0), P = ex.P; P.root = root;
    // skinny legs in baggy shorts, big boots
    for (const sd of [-1, 1]) {
      const leg = grp(root, sd * 0.13, 0.78, 0); P[sd < 0 ? 'legL' : 'legR'] = leg;
      add(leg, box(0.2, 0.26, 0.22), C.shorts, 0, -0.1, 0); add(leg, cyl(0.055, 0.05, 0.6), C.skin, 0, -0.45, 0); add(leg, box(0.16, 0.13, 0.3), C.boot, 0, -0.73, 0.05);
    }
    const torso = grp(root, 0, 0.78, 0); P.torso = torso;
    add(torso, sph(0.27, 1, 1.25, 0.85), C.shirt, 0, 0.3, 0); add(torso, box(0.5, 0.07, 0.4), C.boot, 0, 0.05, 0); // shirt, belt
    // the head: wide eyes, one brow up, a bushy moustache, a pith helmet on askew
    const head = grp(torso, 0, 0.76, 0.03); P.head = head;
    add(head, sph(0.23), C.skin, 0, 0, 0); add(head, sph(0.075), C.skin, 0, -0.03, 0.23);
    for (const sd of [-1, 1]) { add(head, sph(0.065), C.white, sd * 0.09, 0.06, 0.18); add(head, sph(0.032), C.dark, sd * 0.09, 0.06, 0.24); add(head, box(0.1, 0.025, 0.03), C.dark, sd * 0.09, sd < 0 ? 0.16 : 0.2, 0.2, 0, 0, sd * 0.35); }
    add(head, box(0.2, 0.05, 0.05), C.dark, 0, -0.1, 0.21, 0, 0, 0.05);
    const hat = grp(head, 0, 0.07, 0); hat.rotation.set(-0.12, 0, 0.22);
    add(hat, new THREE.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), C.helmet, 0, 0.02, 0); add(hat, cyl(0.44, 0.44, 0.03, 12), C.helmet, 0, 0.03, 0); add(hat, cyl(0.265, 0.265, 0.06, 12), C.boot, 0, 0.07, 0);
    // arms; the right hand holds a map (shown while he looks around)
    for (const sd of [-1, 1]) {
      const arm = grp(torso, sd * 0.31, 0.52, 0); P[sd < 0 ? 'armL' : 'armR'] = arm;
      add(arm, cyl(0.05, 0.045, 0.5), C.shirt, 0, -0.25, 0); add(arm, sph(0.07), C.skin, 0, -0.52, 0);
    }
    P.map = add(P.armR, box(0.42, 0.3, 0.012), C.map, 0, -0.62, 0.12, 0.3, 0, 0); P.map.visible = false;
    // the backpack: much too big, taller than he is, a bedroll on top, a frying pan and a tin cup swinging off it
    const pack = grp(torso, 0, 0.32, -0.3); P.pack = pack;
    add(pack, box(0.86, 1.3, 0.62), C.pack, 0, 0.45, -0.3); add(pack, box(0.9, 0.3, 0.66), C.packD, 0, 1.0, -0.28); add(pack, box(0.55, 0.42, 0.18), C.packD, 0, 0.25, 0.04);
    for (const sd of [-1, 1]) { add(pack, box(0.16, 0.5, 0.36), C.packD, sd * 0.5, 0.3, -0.3); add(pack, box(0.07, 0.62, 0.05), C.packD, sd * 0.17, 0.2, 0.33, 0.2); }
    add(pack, cyl(0.19, 0.19, 1.15, 10), C.roll, 0, 1.33, -0.28, 0, 0, Math.PI / 2);
    const pan = grp(pack, 0.52, 0.75, -0.2); P.pan = pan;
    add(pan, cyl(0.19, 0.17, 0.05, 12), C.pan, 0, -0.32, 0, Math.PI / 2, 0, Math.PI / 2); add(pan, box(0.04, 0.3, 0.04), C.pan, 0, -0.08, 0);
    const cup = grp(pack, -0.52, 0.5, -0.1); P.cup = cup; add(cup, cyl(0.08, 0.07, 0.14), C.cup, 0, -0.14, 0);
    // "?" and "!" over his head
    const sign = (ch, col) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 8; g.strokeStyle = '#2E2622'; g.strokeText(ch, 32, 35); g.fillStyle = col; g.fillText(ch, 32, 35);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.raycast = () => {}; s.visible = false; explorer.add(s); return s; };
    P.q = sign('?', '#F6E7A8'); P.bang = sign('!', '#F4B9A0');
    root.scale.setScalar(1.6);
  }
  // path: { hw, T } (the road's wave across no man's land, as the floor paints it: z = sin((x + hw) / T * 0.7) * T * 0.35)
  const roadZ = (x) => { const p = ex.path; return Math.sin((x + p.hw) / p.T * 0.7) * p.T * 0.35; };
  function explore(x0) { // x0 (tests): start this far from the middle (Snow: pop the yeti up behind rock x0)
    if (!ex.path && yt.spots.length) { yetiPop(x0); return; }
    if (!ex.path || ex.on) return;
    if (!ex.P.root) buildExplorer();
    ex.dir = Math.random() < 0.5 ? 1 : -1; ex.x = -ex.dir * (x0 == null ? ex.path.hw + 14 : x0); ex.s = 'in'; ex.t = 0; ex.panic = false; ex.on = true; explorer.visible = true; ex.ry = ex.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  // the page tells every frame whether the opponent is ready; the moment they press it, out he comes
  function foeReady(on) {
    if (on && !ex.last) explore();
    if (!on && ex.last && ex.on && ex.s !== 'out') { ex.s = 'out'; ex.panic = true; }
    if (!on && ex.last && yt.on && yt.s !== 'down') { yt.s = 'down'; yt.t = 0; yt.fast = true; } // the fight: the yeti ducks
    ex.last = on;
  }
  const lerpA = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
  function tickExplorer(dt) {
    const P = ex.P, hw = ex.path.hw;
    let run = ex.s !== 'look', speed = ex.panic ? 13 : 5.2;
    if (ex.s === 'in') { ex.x += ex.dir * speed * dt; if (ex.dir * ex.x >= 0) { ex.x = 0; ex.s = 'look'; ex.t = 0; } }
    else if (ex.s === 'look') { ex.t += dt; if (ex.t > 3.9) { ex.s = 'out'; } }
    else { ex.x += ex.dir * speed * dt; if (ex.dir * ex.x > hw + 16) { ex.on = false; explorer.visible = false; P.q.visible = P.bang.visible = false; return; } }
    const z = roadZ(ex.x), dz = (roadZ(ex.x + 0.5) - roadZ(ex.x - 0.5)) * ex.dir;
    const head = Math.atan2(ex.dir, dz); // facing along the road
    const lt = ex.s === 'look' ? ex.t : -1, sm = (a, b) => smoothstep(a, b, lt);
    ex.ry = lerpA(ex.ry, lt >= 0 && lt < 3.6 ? 0 : head, Math.min(1, dt * (lt >= 0 ? 4 : 10))); // turns to face you while he looks around
    P.root.position.set(ex.x, 0, z); P.root.rotation.y = ex.ry;
    if (run) {
      ex.ph += dt * speed * 1.7;
      const s = Math.sin(ex.ph), bob = Math.abs(Math.cos(ex.ph));
      P.legL.rotation.x = s * 0.85; P.legR.rotation.x = -s * 0.85; P.armL.rotation.set(-s * 0.9, 0, -0.15); P.armR.rotation.set(s * 0.9, 0, 0.15);
      P.root.position.y = bob * 0.13; P.torso.rotation.set(ex.panic ? 0.45 : 0.3, 0, s * 0.05); // bent forward under the pack
      P.pack.rotation.set(0, 0, -s * 0.09); P.pan.rotation.z = s * 0.5; P.cup.rotation.z = -s * 0.6;
      P.head.rotation.set(-0.15, 0, 0); P.map.visible = false;
    } else {
      // a skid, then a look one way, the other way, the map up close, a scratch of the head, a shrug, and off
      const skid = 1 - sm(0, 0.45);
      P.legL.rotation.x = 0.35 * skid; P.legR.rotation.x = -0.25 * skid; P.root.position.y = 0;
      P.torso.rotation.set(-0.18 * skid + 0.12 * (1 - skid), 0, 0.06 * Math.sin(lt * 2));
      P.head.rotation.set(0, 0.85 * (sm(0.5, 0.9) - sm(1.3, 1.7)) - 0.85 * (sm(1.7, 2.1) - sm(2.5, 2.8)), 0.28 * sm(2.5, 2.9)); // left, right, then a puzzled tilt
      const mapUp = sm(0.6, 0.9) - sm(2.5, 2.8);
      P.armR.rotation.set(-1.25 * mapUp, 0, 0.15); P.map.visible = mapUp > 0.05;
      const scratch = sm(2.6, 2.9) - sm(3.3, 3.5);
      P.armL.rotation.set(-2.7 * scratch, 0, -0.15 - 0.5 * scratch + 0.12 * scratch * Math.sin(lt * 22));
      const shrug = sm(3.4, 3.55) - sm(3.7, 3.9); P.pack.rotation.set(0, 0, 0); P.pack.position.y = 0.32 + 0.08 * shrug; P.head.position.y = 0.76 + 0.03 * shrug;
      P.pan.rotation.z *= 0.9; P.cup.rotation.z *= 0.9;
    }
    const qOn = lt >= 0 && lt > 0.5 && lt < 3.6, pop = qOn ? Math.min(1, (lt - 0.5) / 0.15) * (1 - smoothstep(3.4, 3.6, lt)) : 0;
    P.q.visible = pop > 0.01; P.q.position.set(ex.x, 4.5 + 0.1 * Math.sin(lt * 5), z); P.q.scale.setScalar(1.8 * pop);
    P.bang.visible = ex.panic; P.bang.position.set(ex.x, 4.5, z); P.bang.scale.setScalar(1.8);
  }
  // ---------- Snow's frozen mammoth: the game's War Mammoth model (opts.models: Models3D) drawn once, side on, as a
  // white-on-clear silhouette without its howdah, for the glacier floor to paint as a faint shadow deep in the ice
  // (Floors.frozen). ----------
  if (opts.renderer && opts.models && typeof Floors !== 'undefined' && !Floors.frozen) {
    try {
      const R = opts.renderer, pr = opts.models.parts('mammoth'), W = 384, H = 256, rt = new THREE.WebGLRenderTarget(W, H);
      const white = new THREE.MeshBasicMaterial({ color: '#ffffff' }), cut = new THREE.MeshBasicMaterial({ color: '#ffffff', clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, -1, 0), 2.62)] }); // (the howdah's wood stands above 2.62 m)
      const sc = new THREE.Scene(); if (pr.tint) sc.add(new THREE.Mesh(pr.tint, white)); if (pr.fixed) sc.add(new THREE.Mesh(pr.fixed, cut)); // (not the team parts: the howdah)
      const cam = new THREE.OrthographicCamera(-2.2, 3.0, 3.0, -0.2, 0.1, 50); cam.position.set(20 * Math.cos(0.62), 1.5, -20 * Math.sin(0.62)); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); // side on, a little from the front, so all four legs show
      const prev = R.getRenderTarget(), prevClip = R.localClippingEnabled, prevCol = R.getClearColor(new THREE.Color()), prevA = R.getClearAlpha();
      R.localClippingEnabled = true; R.setClearColor(0x000000, 0); R.setRenderTarget(rt); R.clear(); R.render(sc, cam);
      const px = new Uint8Array(W * H * 4); R.readRenderTargetPixels(rt, 0, 0, W, H, px);
      R.setRenderTarget(prev); R.localClippingEnabled = prevClip; R.setClearColor(prevCol, prevA);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), img = g.createImageData(W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4, o = (y * W + x) * 4; img.data[o] = 0x10; img.data[o + 1] = 0x30; img.data[o + 2] = 0x50; img.data[o + 3] = px[i + 3]; }
      g.putImageData(img, 0, 0); Floors.frozen = cv;
      rt.dispose(); white.dispose(); cut.dispose();
    } catch (e) { console.warn('No Mans Land: no frozen mammoth', e); }
  }
  // ---------- Snow's yeti: when your opponent is ready (foeReady from render3d), a yeti pops up from behind one of his
  // rocks (big boulders by the board), leans out, grins and waves at you, then ducks back down. If the fight starts
  // while he's up, he ducks at once. He waits under the ground behind the rock, so he's hidden from every view.
  // Built from simple shapes the first time he's needed. ----------
  const yetiG = new THREE.Group(); yetiG.visible = false; scene.add(yetiG);
  const yt = { on: false, s: 'up', t: 0, spots: [], at: null, P: {}, fast: false };
  const ytMats = [];
  function buildYeti() {
    // one mesh per moving part (root: legs and feet, torso, head, the two arms), coloured per face: 5 draws
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }); ytMats.push(mat);
    const C = { fur: '#F2F6FA', furD: '#DCE5EF', skin: '#6F87A6', dark: '#1E2633', white: '#FFFFFF', mouth: '#3A2430' };
    const parts = new Map(), add = (g, geo, col, x, y, z, rx = 0, ry = 0, rz = 0) => { (parts.get(g) || parts.set(g, []).get(g)).push([geo, col, M4s(x, y, z, rx, ry, rz)]); };
    const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    const shag = (r, sx, sy, sz, ph) => jag(new THREE.IcosahedronGeometry(r, 1), r * 0.22, ph).scale(sx, sy, sz); // shaggy fur: a lumpy ball
    const ball = (r, sx = 1, sy = 1, sz = 1) => new THREE.SphereGeometry(r, 8, 6).scale(sx, sy, sz);
    const root = grp(yetiG, 0, 0, 0), P = yt.P; P.root = root;
    for (const sd of [-1, 1]) { add(root, shag(0.4, 1, 1.3, 1, sd + 3), C.fur, sd * 0.36, 0.5, 0); add(root, ball(0.26, 1.2, 0.5, 1.5), C.skin, sd * 0.4, 0.08, 0.16); } // legs, big feet
    const torso = grp(root, 0, 1.05, 0); P.torso = torso;
    add(torso, shag(0.78, 1.0, 1.15, 0.85, 1.7), C.fur, 0, 0.75, 0); add(torso, shag(0.5, 1, 1.1, 0.5, 2.9), C.furD, 0, 0.6, 0.45); // body, a shaggy chest
    const head = grp(torso, 0, 1.75, 0.05); P.head = head;
    add(head, shag(0.56, 1, 0.95, 0.92, 4.2), C.fur, 0, 0, 0); add(head, new THREE.ConeGeometry(0.22, 0.45, 5), C.fur, 0.05, 0.6, -0.05, 0, 0, -0.25); // the head, a tuft
    add(head, ball(0.42, 1, 0.85, 0.5), C.skin, 0, -0.06, 0.38); // the face
    for (const sd of [-1, 1]) { add(head, ball(0.1), C.white, sd * 0.15, 0.08, 0.55); add(head, ball(0.05), C.dark, sd * 0.15, 0.08, 0.64); add(head, new THREE.BoxGeometry(0.2, 0.06, 0.06), C.furD, sd * 0.16, 0.22, 0.56, 0, 0, sd * -0.25); } // eyes, bushy brows
    add(head, ball(0.2, 1.2, 0.5, 0.4), C.mouth, 0, -0.2, 0.55); // a big open grin
    for (const sd of [-1, 1]) add(head, new THREE.ConeGeometry(0.035, 0.11, 4), C.white, sd * 0.11, -0.13, 0.62, Math.PI, 0, 0); // two fangs
    for (const sd of [-1, 1]) { // long arms (the waving one swings up from the shoulder)
      const arm = grp(torso, sd * 0.78, 1.3, 0); P[sd < 0 ? 'armL' : 'armR'] = arm;
      add(arm, shag(0.3, 1, 2.5, 1, sd + 7).translate(0, -0.72, 0), C.fur, 0, 0, 0); add(arm, ball(0.24, 1, 1.15, 0.9), C.skin, 0, -1.5, 0.05);
    }
    for (const [g, list] of parts) { const m = new THREE.Mesh(paint(list), mat); m.castShadow = true; m.raycast = () => {}; g.add(m); }
    root.scale.setScalar(1.9);
  }
  // pops him up behind one of his rocks (spot: which, for tests; else one the camera sees, so you see him wave)
  const seen = (q) => { if (!opts.camera) return true; const v = new THREE.Vector3(q.x + q.lean * 2.4, q.y + 4.5, q.z - 2.2).project(opts.camera); return v.z < 1 && Math.abs(v.x) < 0.85 && Math.abs(v.y) < 0.85; };
  function yetiPop(spot) {
    if (!yt.spots.length || yt.on) return;
    if (!yt.P.root) buildYeti();
    const vis = yt.spots.filter(seen), pool = vis.length ? vis : yt.spots;
    yt.at = spot != null ? yt.spots[spot % yt.spots.length] : pool[Math.floor(Math.random() * pool.length)];
    yt.on = true; yt.s = 'up'; yt.t = 0; yt.fast = false; yetiG.visible = true;
  }
  function tickYeti(dt) {
    const P = yt.P, q = yt.at, L = q.lean; yt.t += dt;
    if (yt.s === 'up' && yt.t > 0.6) { yt.s = 'wave'; yt.t = 0; }
    else if (yt.s === 'wave' && yt.t > 3.2) { yt.s = 'down'; yt.t = 0; }
    else if (yt.s === 'down' && yt.t > (yt.fast ? 0.3 : 0.6)) { yt.on = false; yetiG.visible = false; return; }
    const t = yt.t, k = yt.s === 'up' ? smoothstep(0, 0.6, t) : yt.s === 'wave' ? 1 : 1 - smoothstep(0, yt.fast ? 0.3 : 0.6, t);
    const hop = yt.s === 'wave' && t < 0.5 ? Math.sin(t / 0.5 * Math.PI) * 0.4 : 0;
    // behind the rock (away from you), under the ground; up, he leans out toward the board
    P.root.position.set(q.x - L * 0.6 + L * 3.0 * k, q.y - 6.8 * (1 - k) + hop, q.z - 2.2);
    P.root.rotation.y = Math.atan2(-P.root.position.x * 0.6, hd0 + 70 - q.z); // facing your end
    P.torso.rotation.set(0.1 * k, 0, -L * 0.28 * k);
    const w = yt.s === 'wave' ? smoothstep(0, 0.3, t) * (1 - smoothstep(2.9, 3.2, t)) : 0, wave = (L > 0 ? P.armR : P.armL), rest = (L > 0 ? P.armL : P.armR);
    wave.rotation.set(0, 0, L * (0.2 + (2.5 + 0.45 * Math.sin(t * 11)) * w));
    rest.rotation.set(-0.7 * k, 0, -L * 0.25);
    P.head.rotation.set(-0.08, 0, L * 0.18 * Math.sin(t * 4) * w + L * 0.15 * k);
  }
  let hd0 = 48; // half the board's depth (set per layout), for where he looks
  // ---------- Snow: the summit round the board. The land sheet (a plateau of wind-packed snow, dropping away past the
  // flanks and rising into a mountain wall past the far end), the sea of clouds below with far peaks in it, snow plumes
  // streaming off the ridges, glints on the ice, flags snapping in the wind. The wind (wind: its direction [x, z])
  // gets up every round (windK: 0 at round 1, 1 by the last): more spindrift, longer plumes, faster flags, and a white
  // haze closing in round the edges. Everything here moves only while the page draws (tick), never on its own. ----------
  let wind = [1, 0], windK = 0;
  const sumT = { value: 0 }, sumK = { value: 0 }, sumWind = { value: new THREE.Vector2(1, 0) }, sumH = { value: 800 };
  const summit = new THREE.Group(); summit.visible = false; scene.add(summit);
  const summitMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  summitMat.onBeforeCompile = shadeLit; summitMat.customProgramCacheKey = () => 'pb-summit';
  // the cloud sea: one big plane, two layers of the same tiling cloud picture drifting at different speeds, white on the
  // tops and blue-grey in the hollows, fading into the sky far out
  const cloudTex = (() => { const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S); let sd = 913; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    for (let i = 0; i < 70; i++) { const x = r() * S, y = r() * S, rad = 12 + r() * 38, a = 0.18 + r() * 0.3;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2); } }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; })();
  const cloudMat = new THREE.ShaderMaterial({ depthWrite: true, uniforms: { uTex: { value: cloudTex }, uT: sumT, uSky: { value: new THREE.Color() }, uLit: { value: new THREE.Color('#FDFEFF') }, uDim: { value: new THREE.Color('#8DA6C6') } },
    vertexShader: `varying vec2 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uTex; uniform float uT; uniform vec3 uSky; uniform vec3 uLit; uniform vec3 uDim; varying vec2 vW;
      void main() { float vD = length(vW - cameraPosition.xz); float a = texture2D(uTex, vW / 190.0 + uT * vec2(0.0016, 0.0005)).r, b = texture2D(uTex, vW / 71.0 + vec2(0.37, 0.61) + uT * vec2(0.0042, -0.0008)).r;
        float c = clamp(a * 0.8 + b * 0.5, 0.0, 1.0); vec3 col = mix(uDim, uLit, smoothstep(0.15, 0.6, c));
        col = mix(col, uSky, smoothstep(170.0, 560.0, vD)); gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }` });
  const cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), cloudMat); cloudSea.raycast = () => {}; cloudSea.frustumCulled = false; summit.add(cloudSea);
  // far peaks: big faceted cones, rock with snow on everything that faces up, paler (bluer, hazier) the further away
  const peakMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false });
  peakMat.onBeforeCompile = (sh) => { shadeLit(sh); sh.uniforms.uSkyP = { value: new THREE.Color(peakMat.userData.skyHex || '#CFE3EE') }; peakMat.userData.sky = sh.uniforms.uSkyP;
    sh.vertexShader = 'attribute float aHaze; varying float vHaze;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vHaze = aHaze;');
    sh.fragmentShader = 'uniform vec3 uSkyP; varying float vHaze;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, uSkyP, vHaze);\n#include <opaque_fragment>'); };
  peakMat.customProgramCacheKey = () => 'pb-peaks';
  let peaks = null;
  // snow plumes: soft puffs (points) leaving each ridge top and streaming downwind, growing and fading
  const plumeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: sumT, uK: sumK, uWind: sumWind, uH: sumH, uCol: { value: new THREE.Color('#FFFFFF') } },
    vertexShader: `attribute vec3 aSrc; attribute vec4 aP; uniform float uT; uniform float uK; uniform vec2 uWind; uniform float uH; varying float vA;
      void main() { float ph = fract(uT * (0.07 + aP.w * 0.05) * (0.8 + 0.6 * uK) + aP.x), L = aP.y * (0.6 + 0.6 * uK);
        vec3 p = aSrc + vec3(uWind.x, 0.0, uWind.y) * ph * L + vec3(0.0, ph * L * 0.1 - ph * ph * L * 0.06, 0.0) + vec3(sin(aP.w * 40.0), cos(aP.w * 31.0) * 0.5, sin(aP.w * 17.0)) * ph * aP.z * 0.35;
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = min(256.0, aP.z * (0.3 + ph * 1.5) * projectionMatrix[1][1] * uH * 0.5 / max(1.0, -mv.z));
        vA = sin(ph * 3.14159) * (0.6 + 0.3 * uK) * (0.65 + 0.35 * sin(uT * 0.6 + aP.w * 12.0)); }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uCol, vA * a * a);
      #include <colorspace_fragment>
    }` });
  let plumes = null;
  // glints on the ice: points lying on no man's land, each flashing now and then as if it caught the sun
  const glintMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: sumT, uH: sumH },
    vertexShader: `attribute float aSeed; uniform float uT; uniform float uH; varying float vA;
      void main() { vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float f = pow(0.5 + 0.5 * sin(uT * (0.5 + aSeed * 0.9) + aSeed * 77.0), 30.0); vA = f;
        gl_PointSize = f < 0.01 ? 0.0 : min(64.0, (0.6 + 1.4 * f) * projectionMatrix[1][1] * uH * 0.5 / max(1.0, -mv.z)); }`,
    fragmentShader: `varying float vA; void main() { vec2 q = abs(gl_PointCoord - 0.5); float s = max(exp(-q.x * 30.0) * exp(-q.y * 6.0), exp(-q.y * 30.0) * exp(-q.x * 6.0)) + smoothstep(0.1, 0.0, length(q));
      gl_FragColor = vec4(vec3(1.0), vA * min(1.0, s)); }` });
  let glints = null;
  // flags: tattered cloth on each pole, streaming downwind and rippling (moved in the vertex shader)
  const flagMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  flagMat.onBeforeCompile = (sh) => { sh.uniforms.uT = sumT; sh.uniforms.uK = sumK; sh.uniforms.uWind = sumWind;
    sh.vertexShader = 'attribute vec2 aU; uniform float uT; uniform float uK; uniform vec2 uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float u = aU.x, t = uT * (7.0 + 6.0 * uK) + aU.y, a = (0.22 + 0.2 * uK) * u;
      vec3 side = vec3(-uWind.y, 0.0, uWind.x);
      transformed += side * (sin(u * 6.0 - t) * a + sin(u * 13.0 - t * 1.7) * a * 0.3) + vec3(0.0, sin(u * 4.0 - t * 0.8) * 0.08 * u - u * u * 0.25 * (1.0 - uK), 0.0)
        - vec3(uWind.x, 0.0, uWind.y) * u * u * 0.18 * (1.0 + sin(u * 6.0 - t));`); };
  flagMat.customProgramCacheKey = () => 'pb-flag';
  let flagMesh = null;
  const disposeSummit = () => { for (const o of [peaks, plumes, glints, flagMesh]) if (o) { summit.remove(o); o.geometry.dispose(); } peaks = plumes = glints = flagMesh = null; };
  // s: { sheet (geometry), peaks [[x, z, r, h, seed]], plumes [[x, y, z, length, size]], glints [[x, y, z]], flags [[x, y, z, colour, seed]], clouds (y), sky }
  function showSummit(s) {
    for (const o of [...summit.children]) if (o.name === 'summit ground') { summit.remove(o); o.geometry.dispose(); }
    disposeSummit(); summit.visible = !!s; if (!s) return;
    const sheet = new THREE.Mesh(s.sheet, summitMat); sheet.position.y = -0.03; sheet.receiveShadow = true; sheet.raycast = () => {}; sheet.name = 'summit ground'; summit.add(sheet);
    cloudSea.position.y = s.clouds; cloudMat.uniforms.uSky.value.set(s.sky);
    // peaks: one geometry for them all
    const parts = [], hz = [];
    for (const [x, z, r, h, sd] of s.peaks) {
      const g = jag(new THREE.ConeGeometry(r, h, 7, 4).translate(0, h / 2 - 70, 0), r * 0.16, sd, h * 0.04), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const y = p.getY(k); if (y > h - 70 - 0.5) continue; const ridge = 1 + 0.35 * Math.sin(Math.atan2(p.getZ(k), p.getX(k)) * 3 + sd); p.setX(k, p.getX(k) * ridge); p.setZ(k, p.getZ(k) * ridge); }
      const top = h - 70;
      parts.push([g, (ny, y, i) => (ny > 0.35 && y > s.clouds + 6) || y > top - h * 0.18 ? SNOWC : ROCK[(i * 7) % 4], M4s(x, 0, z, 0, sd, 0)]);
      const f = smoothstep(150, 460, Math.hypot(x, z)) * 0.6 + 0.12; hz.push([g.index ? g.index.count / 3 : p.count / 3, f]);
    }
    const pg = paint(parts), hzA = new Float32Array(pg.attributes.position.count); let o = 0;
    for (const [nf, f] of hz) { hzA.fill(f, o, o + nf * 3); o += nf * 3; }
    pg.setAttribute('aHaze', new THREE.BufferAttribute(hzA, 1)); pg.computeBoundingSphere();
    peaks = new THREE.Mesh(pg, peakMat); peaks.raycast = () => {}; peaks.name = 'peaks'; summit.add(peaks);
    if (peakMat.userData.sky) peakMat.userData.sky.value.set(s.sky); peakMat.userData.skyHex = s.sky;
    // plumes: 14 puffs a ridge
    const N = s.plumes.length * 14, src = new Float32Array(N * 3), pp = new Float32Array(N * 4);
    s.plumes.forEach(([x, y, z, len, size], i) => { for (let k = 0; k < 14; k++) { const j = i * 14 + k; src.set([x, y, z], j * 3); pp.set([k / 14 + hashf(i, k, 1) * 0.05, len, size, Math.abs(hashf(k, i, 2)) * 2], j * 4); } });
    const plg = new THREE.BufferGeometry(); plg.setAttribute('position', new THREE.BufferAttribute(src.slice(), 3)); plg.setAttribute('aSrc', new THREE.BufferAttribute(src, 3)); plg.setAttribute('aP', new THREE.BufferAttribute(pp, 4));
    plg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2000);
    plumes = new THREE.Points(plg, plumeMat); plumes.raycast = () => {}; plumes.renderOrder = 3; summit.add(plumes);
    // glints
    const gp = new Float32Array(s.glints.length * 3), gs = new Float32Array(s.glints.length); s.glints.forEach((q, i) => { gp.set(q, i * 3); gs[i] = Math.abs(hashf(i, 3, 9)) * 2; });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gg.setAttribute('aSeed', new THREE.BufferAttribute(gs, 1)); gg.computeBoundingSphere();
    glints = new THREE.Points(gg, glintMat); glints.raycast = () => {}; glints.renderOrder = 2; summit.add(glints);
    // flags: each cloth 2.9 m along the wind, 1.55 m tall, its far edge torn, in its own colour
    const fp = [], fc = [], fu = [], c = new THREE.Color(), wl = Math.hypot(wind[0], wind[1]), wx = wind[0] / wl, wz = wind[1] / wl, NU = 9, NV = 3;
    for (const [x, y, z, hex, sd] of s.flags) {
      c.set(hex); const P = [];
      for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const v = j / NV, tear = i === NU ? 0.55 + 0.9 * Math.abs(hashf(j, sd, 1)) : i === NU - 1 ? 0.85 + 0.3 * Math.abs(hashf(j, sd, 2)) : 1, u = i / NU * Math.min(1, tear); // the far edge torn ragged
        P.push([x + wx * u * 2.9, y - v * 1.55, z + wz * u * 2.9, i / NU]); }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, quad = [a, a + 1, a + NU + 1, a + 1, a + NU + 2, a + NU + 1];
        if (i === NU - 1 && Math.abs(hashf(i, j, sd)) > 0.3) continue; // a torn-away corner
        for (const q of quad) { fp.push(P[q][0], P[q][1], P[q][2]); fu.push(P[q][3], sd); const sh = 0.92 + 0.08 * (j % 2); fc.push(c.r * sh, c.g * sh, c.b * sh); } }
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3)); fg.setAttribute('aU', new THREE.Float32BufferAttribute(fu, 2));
    fg.computeVertexNormals(); fg.computeBoundingSphere(); fg.boundingSphere.radius += 3;
    flagMesh = new THREE.Mesh(fg, flagMat); flagMesh.castShadow = true; flagMesh.raycast = () => {}; flagMesh.name = 'flags'; summit.add(flagMesh);
  }
  // the wind for this round: more and faster spindrift, the haze closing in (bi.haze), plumes and flags livelier
  // ---------- the Hollow (the Mommy boss's lair, 2026-11-12): the giant root bridge she hangs from, roots breaking out
  // of the walls with tendrils hanging off them, silk (orb webs, tangled sheets and loose strands) that grows over the
  // walls round by round, and one warm column of light falling through the hole onto the board. update() works out
  // the layout (it knows the pit's walls); showHollow builds it, hollowRound shows the silk up to a round, tickHollow
  // breathes the light and sways the tendrils, whip(a) shakes the bridge as she falls. ----------
  const hollow = new THREE.Group(); hollow.visible = false; scene.add(hollow);
  let hol = null, holT = 0, holRound = 0;
  // bark: vertex colours, flat shaded, darkened like the scenery round it. Over the board, seen from high up (the
  // strategic and tilted views) it thins into a screen-door dither, so the bridge and tendrils never hide the fight
  const barkMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  barkMat.onBeforeCompile = (sh) => {
    shadeLit(sh);
    sh.vertexShader = 'varying vec3 vHoW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vHoW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vHoW;\n' + sh.fragmentShader.replace('void main() {', `void main() {
      if (vHoW.y > 4.0 && abs(vHoW.x) < uHalf.x + 1.5 && abs(vHoW.z) < uHalf.y + 1.5) {
        float dn = normalize(cameraPosition - vHoW).y, k = smoothstep(0.62, 0.9, dn) * 0.9;
        if (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) < k) discard; }`);
  };
  barkMat.customProgramCacheKey = () => 'pb-bark';
  // the pit's earth: the same, without the dither (walls never stand over the board)
  const pitMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  pitMat.onBeforeCompile = shadeLit; pitMat.customProgramCacheKey = () => 'pb-pit';
  const BARK_D = new THREE.Color('#3A2D23'), BARK_L = new THREE.Color('#6E5946'), SILK_C = new THREE.Color('#D9D1C2');
  // silk: an orb web (spokes and a sagging spiral, a few threads torn) and a tangled sheet (crossing threads over a milky film)
  const orbOf = (torn) => softTex(256, 256, (g, w, h) => { let sd = 31; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    const cx = w / 2, cy = h / 2, R = w * 0.47, sp = []; for (let i = 0; i < 17; i++) sp.push(i / 17 * Math.PI * 2 + (r() - 0.5) * 0.18);
    g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.6; g.beginPath();
    for (const a of sp) { const L = R * (0.82 + r() * 0.18); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); } g.stroke();
    g.lineWidth = 1.15;
    for (let q = 0.07; q < 0.92; q += 0.042 + r() * 0.012) {
      g.strokeStyle = `rgba(255,255,255,${0.55 + r() * 0.3})`; g.beginPath();
      sp.forEach((a, i) => { const b = sp[(i + 1) % sp.length], rad = R * q * (0.97 + r() * 0.06), cut = r(); if (cut < 0.06 || (torn && (cut < 0.3 || ((i + 3) % 17 < 5 && q > 0.35)))) return; // a torn gap (torn: a whole side ripped out)
        const x0 = cx + Math.cos(a) * rad, y0 = cy + Math.sin(a) * rad, x1 = cx + Math.cos(b) * rad, y1 = cy + Math.sin(b) * rad, m = (a + b) / 2 + (b < a ? Math.PI : 0);
        g.moveTo(x0, y0); g.quadraticCurveTo(cx + Math.cos(m) * rad * 0.93, cy + Math.sin(m) * rad * 0.93, x1, y1); });
      g.stroke();
    }
    if (torn) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2; g.beginPath(); // loose threads hanging from the tear
      for (let i = 0; i < 7; i++) { const a = sp[(i + 3) % 17], x = cx + Math.cos(a) * R * 0.4, y = cy + Math.sin(a) * R * 0.4; g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + 30, x + (r() - 0.5) * 20, y + 40 + r() * 50); } g.stroke(); } });
  const orbTex = orbOf(false), orbTornTex = orbOf(true);
  const tangleTex = softTex(256, 256, (g, w, h) => { let sd = 57; const r = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.44); gr.addColorStop(0, 'rgba(255,255,255,0.26)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.lineCap = 'round';
    for (let i = 0; i < 150; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * w * 0.36, x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d * 0.8, b = r() * 6.28, l = 18 + r() * 60;
      g.strokeStyle = `rgba(255,255,255,${0.22 + r() * 0.45})`; g.lineWidth = 0.7 + r() * 0.9; g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(b) * l * 0.5, y + Math.sin(b) * l * 0.5 + l * 0.12, x + Math.cos(b) * l, y + Math.sin(b) * l); g.stroke(); } });
  const mouthTex = softTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h, 0, w / 2, h, h);
    gr.addColorStop(0, 'rgba(6,4,3,1)'); gr.addColorStop(0.6, 'rgba(14,10,8,0.97)'); gr.addColorStop(0.82, 'rgba(40,30,22,0.75)'); gr.addColorStop(1, 'rgba(60,45,32,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const mouthMat = new THREE.MeshBasicMaterial({ map: mouthTex, transparent: true, depthWrite: false });
  const webMats = [orbTex, tangleTex].map((map) => new THREE.MeshBasicMaterial({ map, color: '#F2E9DA', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  const strandMat = new THREE.LineBasicMaterial({ color: '#EFE6D6', transparent: true, opacity: 0.4, depthWrite: false });
  // the light from the hole: an open cone, brightest where you look straight through it, fading at its sides, at the
  // ground and high up; seen from straight above it is all side, so the strategic view isn't washed out
  const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uCol: { value: new THREE.Color('#FFD69A') }, uA: { value: 0.15 } },
    vertexShader: `varying float vF; varying float vY; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vec3 n = normalize(mat3(modelMatrix) * normal);
      vF = abs(dot(n, normalize(cameraPosition - wp.xyz))); vY = uv.y; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uA; varying float vF; varying float vY;
      void main() { float a = uA * pow(vF, 1.7) * smoothstep(0.0, 0.07, vY) * (1.0 - smoothstep(0.45, 1.0, vY)); gl_FragColor = vec4(uCol, a); }` });
  // a tube along pts (scene coordinates), its radius rad(u) along it (0 to 1) and its colour col(u, around, colour)
  const tubeOf = (pts, segs, radial, rad, col) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(curve, segs, 1, radial, false), pos = g.attributes.position, cl = new Float32Array(pos.count * 3), c = new THREE.Color(), P = new THREE.Vector3(), C = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) { const u = i / segs, r = rad(u); curve.getPointAt(u, C);
      for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; P.fromBufferAttribute(pos, k).sub(C).multiplyScalar(r).add(C); pos.setXYZ(k, P.x, P.y, P.z); col(u, j / radial, c); cl.set([c.r, c.g, c.b], k * 3); } }
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.computeVertexNormals(); return { g, curve };
  };
  const barkCol = (seed, silkAt = -1) => (u, a, c) => { const s = 0.5 + 0.5 * Math.sin(a * Math.PI * 2 * 5 + u * 31 + seed + Math.sin(u * 77 + seed) * 0.9);
    c.copy(BARK_D).lerp(BARK_L, 0.12 + s * 0.62 + hashf(u * 53 + seed, a * 9, 3) * 0.3); if (silkAt >= 0 && Math.abs(u - silkAt) < 0.016) c.lerp(SILK_C, 0.85); };
  // a burst egg sac (a torn cup, flat shreds round it), her shed skin (pale, flat, legs out) and a spiderling (dark, small)
  const huskGeo = (() => { const prof = []; for (let i = 0; i <= 6; i++) { const t = i / 6; prof.push(new THREE.Vector2(0.15 + 0.85 * Math.sin(Math.PI * 0.5 * t), t * 0.55)); }
    const cup = new THREE.LatheGeometry(prof, 10).toNonIndexed(), cp = cup.attributes.position;
    for (let i = 0; i < cp.count; i++) if (cp.getY(i) > 0.5) cp.setY(i, 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(Math.atan2(cp.getZ(i), cp.getX(i)) * 5))); // a jagged rim
    const shred = (a, d) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.02, 0, 0.5, 0.02, 0.25, 0.6, 0.02, -0.2], 3)); return [g, '#BFB5A2', M4(Math.cos(a) * d, 0, Math.sin(a) * d, 0, a, 0)]; };
    const inside = new THREE.BufferGeometry(), ip = cp.array.slice(); // (its inside too: the cup is open, and from above you look into it)
    for (let i = 0; i < ip.length; i += 9) for (let k = 0; k < 3; k++) { const t = ip[i + 3 + k]; ip[i + 3 + k] = ip[i + 6 + k]; ip[i + 6 + k] = t; }
    inside.setAttribute('position', new THREE.Float32BufferAttribute(ip, 3));
    return colGeo([[cup, '#CFC6B4'], [inside, '#A89C86'], shred(0.3, 1.1), shred(2.2, 1.0), shred(4.1, 1.2), shred(5.3, 0.9)]); })();
  const legParts = (len, th, hex) => { const out = []; for (let i = 0; i < 8; i++) { const sd = i < 4 ? 1 : -1, a = (i % 4 - 1.5) * 0.45; // four legs a side, bent down at the knee
    out.push([new THREE.BoxGeometry(len * 0.55, th, th), hex, M4(sd * len * 0.27 * Math.cos(a), th * 2, len * 0.27 * Math.sin(a), 0, -sd * a, sd * 0.35)]);
    out.push([new THREE.BoxGeometry(len * 0.6, th, th), hex, M4(sd * len * 0.72 * Math.cos(a), 0, len * 0.72 * Math.sin(a), 0, -sd * a, -sd * 0.7)]); } return out; };
  const moltGeo = colGeo([[new THREE.SphereGeometry(0.5, 7, 5).scale(0.8, 0.22, 1.25), '#B9AB8F', M4(0, 0.1, -0.3)], [new THREE.SphereGeometry(0.4, 7, 5).scale(0.9, 0.25, 0.9), '#C8BBA0', M4(0, 0.1, 0.5)], ...legParts(2.6, 0.08, '#AC9E83')]);
  const lingGeo = colGeo([[new THREE.SphereGeometry(0.3, 7, 5).scale(0.9, 0.7, 1.3), '#2C221B', M4(0, 0.25, -0.35)], [new THREE.SphereGeometry(0.2, 6, 4), '#3A2D23', M4(0, 0.22, 0.12)],
    [new THREE.SphereGeometry(0.05, 4, 3), '#C2453A', M4(0.08, 0.32, 0.28)], [new THREE.SphereGeometry(0.05, 4, 3), '#C2453A', M4(-0.08, 0.32, 0.28)], ...legParts(1.3, 0.05, '#241C16')]);
  const lingMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }); lingMat.onBeforeCompile = shadeLit; lingMat.customProgramCacheKey = () => 'pb-ling';
  const leftGroup = new THREE.Group(); hollow.add(leftGroup); // what stays from round to round (husks, molts): rebuilt when a fight ends
  let leftKey = '';
  function clearHollow() {
    for (const o of [...hollow.children]) { if (o === leftGroup) continue; hollow.remove(o); o.traverse((q) => { if (q.geometry && q.geometry !== lingGeo) q.geometry.dispose(); }); }
    for (const o of [...leftGroup.children]) { leftGroup.remove(o); o.dispose(); } leftKey = '';
    hol = null; holRound = 0;
  }
  // h: { bridge: [[x, y, z]...], silkAt (u where her thread is tied), anchor: [x, y, z], roots: [[pts, r0]], tendrils:
  // [[x, y, z, length, lean]], webs: [[kind 0 orb | 1 tangle, x, y, z, size, rotY, rotX, round]], strands: [[a, b, round]],
  // beam: [x, z, top radius, bottom radius], sun }
  function showHollow(h) {
    clearHollow(); hollow.visible = !!h; if (!h) return;
    const add = (o) => { o.raycast = () => {}; hollow.add(o); return o; };
    const bridge = new THREE.Group(); add(bridge);
    // the bridge: a giant root, thick where it grows out of the walls, with a thinner one winding round it
    const main = tubeOf(h.bridge, 90, 10, (u) => (1.35 + 1.9 * Math.pow(Math.abs(2 * u - 1), 2.2)) * (1 + 0.14 * Math.sin(u * 47) + 0.08 * Math.sin(u * 131)), barkCol(1.3, h.silkAt));
    const bm = new THREE.Mesh(main.g, barkMat); bridge.add(bm); // (no shadow: a dark band across her and the middle of the board hurt reading the fight)
    const wind = []; for (let i = 0; i <= 60; i++) { const u = 0.04 + i / 60 * 0.92, p = main.curve.getPointAt(u), r = (1.35 + 1.9 * Math.pow(Math.abs(2 * u - 1), 2.2)) * 0.95, a = u * 15;
      wind.push([p.x, p.y + Math.cos(a) * r, p.z + Math.sin(a) * r]); }
    const wm = new THREE.Mesh(tubeOf(wind, 80, 6, (u) => 0.42 + 0.25 * Math.sin(u * 9) ** 2, barkCol(4.1)).g, barkMat); bridge.add(wm);
    for (const [x, y, z, len, lean] of h.tendrils) { // roots hanging off the bridge, swaying a little (pivot at the top)
      const g = new THREE.Group(); g.position.set(x, y, z);
      const pts = [[0, 0, 0], [lean * 0.3, -len * 0.35, lean * 0.2], [lean * 0.8, -len * 0.7, -lean * 0.1], [lean, -len, lean * 0.3]];
      g.add(new THREE.Mesh(tubeOf(pts, 14, 5, (u) => 0.32 * (1 - u * 0.85), barkCol(x)).g, barkMat)); bridge.add(g);
      (h.sway || (h.sway = [])).push([g, x * 0.3 + z]);
    }
    // roots breaking out of the walls and drooping down their faces
    for (const [pts, r0] of h.roots) { const m = new THREE.Mesh(tubeOf(pts, 20, 7, (u) => r0 * (1 - u * 0.88) * (1 + 0.1 * Math.sin(u * 23)), barkCol(pts[0][0] + pts[0][2])).g, barkMat); m.castShadow = true; add(m); }
    // silk: webs and strands, each with the round it appears in
    const webGeo = new THREE.PlaneGeometry(1, 1), webs = [];
    for (const [kind, x, y, z, s, ry, rx, round] of h.webs) {
      const m = new THREE.Mesh(webGeo, webMats[kind]); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0, 'YXZ'); m.scale.set(s, s * (kind ? 0.8 : 1), 1); m.renderOrder = 2; add(m); webs.push([m, round]);
    }
    const byRound = {}; for (const [a, b, round] of h.strands) (byRound[round] || (byRound[round] = [])).push(...a, ...b);
    for (const [round, list] of Object.entries(byRound)) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
      const l = new THREE.LineSegments(g, strandMat); l.renderOrder = 2; add(l); webs.push([l, +round]);
    }
    // the light: an open cone along the sun's way, from high above the hole down onto the board
    const [bx, bz, rt, rb] = h.beam, dir = new THREE.Vector3(...h.sun).normalize(), H = 92;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, H, 40, 1, true), beamMat);
    beam.quaternion.setFromUnitVectors(upY, dir); beam.position.set(bx, 0, bz).addScaledVector(dir, H / 2); beam.renderOrder = 5; add(beam);
    // the nursery: a dark mouth at the foot of the far wall, leaning back with it, framed by a root, half behind torn silk
    let lings = [];
    if (h.tunnel) { // (built facing +z in its own group, turned to face the board from its wall)
      const { x, z, ang, lean, w, ht } = h.tunnel, tn = Math.tan(lean), back = (y) => -y * tn, tg = new THREE.Group(); tg.position.set(x, 0, z); tg.rotation.y = ang; add(tg);
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(w, ht).translate(0, ht / 2, 0), mouthMat); mouth.position.set(0, 0.05, 0.25); mouth.rotation.x = -lean; mouth.renderOrder = 1; tg.add(mouth);
      const arc = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12, y = 0.2 + Math.sin(a) * ht * 0.82; arc.push([Math.cos(a) * w * 0.47, y, back(y) + 0.55]); }
      const fr = new THREE.Mesh(tubeOf(arc, 36, 7, (u) => 0.8 + 0.35 * Math.sin(u * Math.PI) + 0.1 * Math.sin(u * 37), barkCol(7.7)).g, barkMat); fr.castShadow = true; tg.add(fr);
      for (let i = 0; i < 5; i++) { // eyes in the dark: small red pairs, blinking (tickHollow)
        const pair = new THREE.Group(); pair.position.set((i - 2) * w * 0.14 + Math.sin(i * 2.3) * 0.6, 1 + (i * 1.3) % (ht * 0.45), back(2) - 0.6);
        for (const sx of [-1, 1]) { const e = new THREE.Sprite(glowMat('#E2503A')); e.position.x = sx * 0.28; e.scale.setScalar(0.7); pair.add(e); }
        tg.add(pair); (h.eyes || (h.eyes = [])).push([pair, i * 1.9]); }
      const cur = new THREE.Mesh(webGeo, webMats[1]); cur.position.set(w * 0.18, ht * 0.45, back(ht * 0.45) + 0.8); cur.rotation.set(-lean, 0.08, 0.1, 'YXZ'); cur.scale.set(w * 0.62, ht * 0.75, 1); cur.renderOrder = 3; tg.add(cur);
      tg.traverse((o) => { o.raycast = () => {}; });
      lings = (h.lanes || []).map((lane, i) => { const m = new THREE.Mesh(lingGeo, lingMat); m.scale.setScalar(1.8 + (i % 3) * 0.3); m.visible = false; add(m);
        return { m, lane, p: 1 + (i * 7) % Math.max(2, lane.drop - 1), to: 1, wait: i * 0.4, spd: 1.6 + (i % 4) * 0.35 }; });
    }
    hol = { bridge, webs, anchor: h.anchor, sway: h.sway || [], eyes: h.eyes || [], lings, moltAt: h.moltAt, fight: false, hpK: 1 };
  }
  function hollowRound(r) { if (!hol || r === holRound) return; holRound = r; for (const [o, k] of hol.webs) o.visible = k <= r; }
  // what earlier fights left behind (m.boss.log): a torn husk where each nest burst (in the last round, the ones not left
  // standing, m.boss.carry; in earlier ones as many as went down), and her shed skins piling up by the nursery, two a fight
  function hollowLeft(v, hF) {
    const b = v && v.m && v.m.boss; if (!hol || !b || typeof Boss === 'undefined') return;
    const log = b.log || [], key = log.length + '|' + JSON.stringify(b.carry || []); if (key === leftKey) return; leftKey = key;
    for (const o of [...leftGroup.children]) { leftGroup.remove(o); o.dispose(); }
    const husks = [], molts = [];
    log.forEach((rep, i) => {
      const spots = Array.isArray(Boss.CFG.nests[rep.round - 1]) ? Boss.CFG.nests[rep.round - 1] : Boss.CFG.nests[Boss.CFG.nests.length - 1];
      const standing = i === log.length - 1 ? (b.carry || []) : [];
      let down = (rep.nests || spots.length) - (rep.nestsLeft || 0);
      for (const sp of spots) { if (down <= 0) break; if (standing.some((q) => q[0] === sp[0] && q[1] === sp[1])) continue; down--;
        const w = Game.tileToWorld(sp[0], sp[1]); husks.push([w.x * hF + hashf(i, sp[0], 1) * 1.5, -w.y * hF + hashf(sp[1], i, 2) * 1.5, (i * 1.7 + sp[0]) % 6.28]); }
      if (hol.moltAt) for (let k = 0; k < 2 && molts.length < 12; k++) { const n = molts.length, a = n * 2.4; molts.push([hol.moltAt[0] + Math.cos(a) * (1.2 + n * 0.35), hol.moltAt[1] + Math.floor(n / 4) * 0.12, hol.moltAt[2] + Math.sin(a) * (0.8 + n * 0.2), a * 1.3]); }
    });
    const inst = (geo, list, s, y0) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, propMat, list.length);
      list.forEach(([x, z, a], i) => im.setMatrixAt(i, tmpM.compose(tmpP.set(x, y0, z), tmpQ.setFromAxisAngle(upY, a), tmpS.set(s, s * 0.9, s))));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.raycast = () => {}; im.receiveShadow = true; leftGroup.add(im); };
    inst(huskGeo, husks, 1.7, 0.02);
    if (molts.length) { const im = new THREE.InstancedMesh(moltGeo, propMat, molts.length);
      molts.forEach(([x, y, z, a], i) => im.setMatrixAt(i, tmpM.compose(tmpP.set(x, y, z), tmpQ.setFromEuler(new THREE.Euler(Math.sin(a) * 0.15, a, Math.cos(a) * 0.12)), tmpS.set(1.3, 1.3, 1.3))));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.raycast = () => {}; leftGroup.add(im); }
  }
  // how the fight stands (render3d, every frame of a boss match): fight on or not, her health left (0 to 1). At two
  // thirds her webs tear; at a third the spiderlings flee into the nursery; when she dies the light floods the pit
  function bossState(o) { if (!hol || !o) return; hol.fight = !!o.fight; hol.hpK = Math.max(0, Math.min(1, o.hpK));
    const torn = hol.hpK < 0.667 ? orbTornTex : orbTex; if (webMats[0].map !== torn) webMats[0].map = torn; }
  function tickHollow(dt) {
    holT += dt; const dead = hol.hpK <= 0; hol.glow = (hol.glow || 0) + ((dead ? 1 : 0) - (hol.glow || 0)) * Math.min(1, dt * 0.8);
    beamMat.uniforms.uA.value = (0.15 + 0.02 * Math.sin(holT * 0.31) + 0.01 * Math.sin(holT * 1.13)) * (1 + 1.6 * hol.glow);
    if (curBi && curBi.shade) shadeU.uShade.value.x = curBi.shade[0] * (1 - 0.6 * hol.glow); // (dead: the walls come out of the dark)
    tickLings(Math.min(dt, 0.25));
    for (const [pair, ph] of hol.eyes) { const k = (holT * 0.35 + ph) % 4, open = hol.hpK > 0 && k < 3.2 && (k % 1.3) > 0.12; pair.visible = open; } // (gone when she is dead)
    for (const [g, ph] of hol.sway) { g.rotation.z = Math.sin(holT * 0.55 + ph) * 0.045; g.rotation.x = Math.sin(holT * 0.4 + ph * 1.7) * 0.03; }
    webMats.forEach((m, i) => { m.opacity = 0.52 + 0.06 * Math.sin(holT * 0.7 + i * 2); }); // the silk catching the light now and then
  }
  // the spiderlings on their lanes (lane: points on the wall's face from the nursery's mouth outward, then down to the
  // foot at lane.drop): wandering while you deploy, pouring down to the foot of the walls when the fight starts,
  // fleeing back into the nursery once she is low; they freeze where they are when the board isn't redrawn
  const lF = new THREE.Vector3(), lN = new THREE.Vector3(), lX = new THREE.Vector3(), lM = new THREE.Matrix4();
  function tickLings(dt) {
    const flee = hol.hpK < 0.34, pour = hol.fight && !flee;
    for (const s of hol.lings) {
      const L = s.lane.pts, last = L.length - 1;
      if (flee) s.to = 0; else if (pour) s.to = last;
      else if (s.p === s.to || s.to > s.lane.drop) { s.wait -= dt; if (s.wait <= 0) { s.to = 1 + Math.floor(Math.random() * (s.lane.drop - 1)); s.wait = 1.5 + Math.random() * 4; } }
      const d = s.to - s.p, step = s.spd * (flee ? 2 : pour ? 1.5 : 1) * dt;
      s.p = Math.abs(d) <= step ? s.to : s.p + Math.sign(d) * step;
      s.m.visible = !(flee && s.p < 0.6) && hol.hpK > 0;
      if (!s.m.visible) continue;
      const i = Math.min(last - 1, Math.floor(s.p)), f = s.p - i, a = L[i], b = L[i + 1], moving = Math.abs(d) > 0.01;
      lN.set(a[3] + (b[3] - a[3]) * f, a[4] + (b[4] - a[4]) * f, a[5] + (b[5] - a[5]) * f).normalize();
      lF.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).multiplyScalar(d < 0 ? -1 : 1); lF.addScaledVector(lN, -lF.dot(lN)).normalize();
      lX.crossVectors(lN, lF).normalize(); lM.makeBasis(lX, lN, lF);
      s.m.quaternion.setFromRotationMatrix(lM);
      s.m.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f).addScaledVector(lN, 0.12 + (moving ? Math.abs(Math.sin(holT * 26 + s.spd * 9)) * 0.06 : 0));
    }
  }
  // the height her thread is tied at, if she hangs under the bridge at (x, z) (render3d draws her thread up to it); 0: no bridge there
  const anchor = (x, z) => hol && hollow.visible && hol.anchor && Math.hypot(x - hol.anchor[0], z - hol.anchor[2]) < 6 ? hol.anchor[1] : 0;
  // she falls: the bridge whips up as her weight leaves it, and settles (a: seconds since the fall; null when not falling)
  function whip(a) { if (!hol) return; const y = a == null || a > 3 ? 0 : 1.3 * Math.exp(-2.2 * a) * Math.sin(a * 11); if (hol.bridge.position.y !== y) hol.bridge.position.y = y; }
  function applyWind(bi, k) {
    windK = k; sumK.value = k;
    if (bi.haze) { const [col, str, from, to1, to2] = bi.haze; shadeU.uHaze.value.set(...new THREE.Color(col).toArray(), str * (0.12 + 0.88 * Math.pow(k, 1.4))); shadeU.uHazeD.value.set(from, to1 + (to2 - to1) * k); }
    else shadeU.uHaze.value.set(0, 0, 0, 0);
    const f = FALL[bi.fall]; if (!f || !f.stream || !flakes.visible) return;
    const U = flakeMat.uniforms, l = Math.hypot(wind[0], wind[1]) || 1, sp = f.stream[0] * (1 + ((f.spd2 || 1) - 1) * k);
    U.uKeep.value = f.keep + ((f.keep2 || f.keep) - f.keep) * k; U.uStream.value.set(wind[0] / l * sp, wind[1] / l * sp, 0, f.stream[1]);
  }
  // the clock for the falling snow, embers and chimney smoke (the page calls it every frame it draws); px: the renderer's pixels per CSS pixel
  let smokeT = 0;
  function tick(dt, px = 1) {
    if (flakes.visible || flakes2.visible) { snowTime.value += dt; flakeMat.uniforms.uPx.value = px; }
    lampT += dt;
    lampFlick.forEach(([i, base, fl, ph]) => { if (fl) shadeU.uLamps.value[i].w = base * (1 - fl * 0.35 * (0.5 + 0.5 * Math.sin(lampT * 7.3 + ph) * Math.sin(lampT * 3.1 + ph * 2))); });
    emberGlows.forEach(([sp, base, ph]) => { const f = 0.8 + 0.2 * Math.sin(lampT * 6.1 + ph) * Math.sin(lampT * 2.3 + ph); sp.scale.setScalar(base * f); });
    if (woods.visible) tickWoods(dt);
    if (hol && hollow.visible) tickHollow(dt);
    if (summit.visible) { // Snow: the clouds drift, plumes stream, flags snap, glints flash; far things fade into the sky as it is now
      sumT.value += dt; if (opts.renderer) sumH.value = opts.renderer.domElement.height;
      if (scene.background && scene.background.isColor) { cloudMat.uniforms.uSky.value.copy(scene.background); if (peakMat.userData.sky) peakMat.userData.sky.value.copy(scene.background); }
    }
    if (ex.on) tickExplorer(dt);
    if (yt.on) tickYeti(dt);
    if (grassMat.userData.on) windT.value += dt;
    if (vultures.visible) {
      vultureT += dt;
      const ease = 1 - Math.exp(-dt * 0.6); // a few seconds to gather or drift apart
      for (const b of vultures.children) {
        if (!b.visible) continue;
        const u = b.userData, n = u.now, ps = !preyAt && roosting && perch[u.i];
        // to the tree they spiral down onto their spot (the circle shrinks to nothing), a little quicker than they gather
        const to = preyAt ? { r: 6 + u.i * 2.8, y: 15 + u.i * 2.5, c: [preyAt.x, preyAt.z] } : ps ? { r: 0, y: ps[1], c: [ps[0], ps[2]] } : u.home;
        // between the tree and your tower they don't cross the board: they fly off, fast and away from it, then come back
        // in from beyond the board's edge nearest where they're going (warp)
        const kind = preyAt ? 'prey' : ps ? 'perch' : 'home';
        if (u.kind && u.kind !== kind && (u.kind === 'perch' || kind === 'perch') && (u.kind === 'prey' || kind === 'prey')) {
          const p = b.position, l = Math.hypot(p.x, p.z) || 1; u.warp = { t: 0, from: p.clone(), d: [p.x / l, p.z / l] };
        }
        u.kind = kind;
        if (u.warp) {
          const w = u.warp; w.t += dt;
          if (w.t < 1.4) { // leaving: accelerating out past the edge of the screen, climbing a little
            const go = 12 * w.t + 22 * w.t * w.t, flap = 0.12 + 0.5 * Math.sin(vultureT * 10 + u.a0);
            b.position.set(w.from.x + w.d[0] * go, w.from.y + 2 * w.t + 6 * w.t * w.t, w.from.z + w.d[1] * go);
            b.rotation.set(0, Math.atan2(-w.d[0], -w.d[1]), 0, 'YXZ'); b.rotateX(0.25);
            u.wings[0].rotation.set(0, 0, flap); u.wings[1].rotation.set(0, 0, -flap); u.wings[0].scale.x = 1; u.wings[1].scale.x = -1;
            continue;
          }
          const l = Math.hypot(to.c[0], to.c[1]) || 1; // gone: start again 75 m out beyond the target, a little higher
          n.c[0] = to.c[0] + to.c[0] / l * 75; n.c[1] = to.c[1] + to.c[1] / l * 75; n.y = to.y + 10; n.r = Math.max(to.r, 6); u.warp = null; u.back = true;
        }
        if (u.back && Math.hypot(n.c[0] - to.c[0], n.c[1] - to.c[1]) < 3) u.back = false;
        const e = u.back ? 1 - Math.exp(-dt * 1.1) : ps ? 1 - Math.exp(-dt * 0.9) : ease;
        n.r += (to.r - n.r) * e; n.y += (to.y - n.y) * e; n.c[0] += (to.c[0] - n.c[0]) * e; n.c[1] += (to.c[1] - n.c[1]) * e;
        const sit = ps && n.r < 0.35 && Math.hypot(n.c[0] - to.c[0], n.c[1] - to.c[1]) < 0.35 && Math.abs(n.y - to.y) < 0.3;
        const air = smoothstep(0.4, 4, n.r); // 0 on the perch: no bobbing or banking
        if (!sit) u.ang = (u.ang == null ? u.a0 : u.ang) + dt * u.w * (1 + 0.8 * smoothstep(23, 16, n.y)); // a tighter circle turns faster
        const a = u.ang, x = n.c[0] + Math.cos(a) * n.r, z = n.c[1] + Math.sin(a) * n.r;
        b.position.set(x, n.y + Math.sin(vultureT * 0.3 + u.a0) * 1.5 * air, z);
        if (sit) { // perched: facing its own way, wings folded back along the body
          b.position.set(ps[0], ps[1], ps[2]); b.rotation.set(0, ps[3], 0, 'YXZ');
          u.wings[0].rotation.set(0, -1.35, -0.4); u.wings[1].rotation.set(0, 1.35, 0.4); u.wings[0].scale.x = 0.5; u.wings[1].scale.x = -0.5; // short, hunched
          continue;
        }
        b.rotation.set(0, -a + (u.w > 0 ? Math.PI : 0), 0, 'YXZ'); b.rotateZ((u.w > 0 ? -0.3 : 0.3) * air); // nose along the circle, banked into it
        const beat = Math.max(0, Math.sin(vultureT * 0.45 + u.a0 * 3)) ** 12; // a few slow beats now and then, otherwise gliding
        const ang = 0.12 + (ps && n.r < 3 ? 0.4 * Math.sin(vultureT * 8 + u.a0) : beat * 0.55 * Math.sin(vultureT * 9)); // flapping as it lands
        u.wings[0].rotation.set(0, 0, ang); u.wings[1].rotation.set(0, 0, -ang); u.wings[0].scale.x = 1; u.wings[1].scale.x = -1;
      }
    }
    if (fly) {
      fly.t += Math.min(dt, 0.05); const f = fly.t / fly.dur;
      if (f >= 1) { fly = null; dragonShadow.visible = false; }
      else { dragonShadow.position.lerpVectors(fly.a, fly.b, f); const flap = 0.78 + 0.22 * Math.cos(fly.t * 11); dragonShadow.scale.set(fly.len, 1, fly.len * flap); }
    }
    if (smokeCols.visible) {
      smokeColT += dt;
      smokeCols.children.forEach((sp) => { const u = sp.userData, ph = (smokeColT * u.spd + u.off) % 1;
        sp.position.set(u.x + ph * u.drift, u.y + ph * u.h, u.z - ph * u.drift * 0.4); sp.scale.setScalar(u.s * (0.8 + ph * 2.6)); sp.material.opacity = u.o * Math.sin(ph * Math.PI) * (1 - ph * 0.3); });
    }
    if (cabin.visible) {
      smokeT += dt;
      smoke.forEach((s, i) => { const ph = (smokeT * 0.12 + i / smoke.length) % 1; s.position.set(smoke.top.x + ph * 1.8, smoke.top.y + ph * 7, smoke.top.z - ph * 0.6); s.scale.setScalar(0.9 + ph * 3); s.material.opacity = 0.42 * Math.sin(ph * Math.PI) * (1 - ph * 0.4); });
    }
  }
  function update(v, groundY, BW, BD, T) {
    if (!lib || !v || !v.m) return;
    const src = v.battlePre || v.m, mp = Game.mapOf(src), id = (mp && mp.id) || 'standard', look = Scenery3D.lookOf(src);
    { const b0 = biomeOf(look); eyeN = b0.eyes ? Math.min(16, Math.round(b0.eyes[0] + b0.eyes[1] * Math.max(0, (src.round || 1) - 1))) : 0; } // Darkwoods: more eyes every round
    const k = [id, look, v.me, Game.COLS, Game.ROWS, castShadows].join('|');
    // Snow: the wind gets up every round, on the same steps as the light (biome .dusk, render3d)
    const b1 = biomeOf(look), wk = b1.dusk && b1.summit ? Math.min(1, Math.max(0, ((src.round || 1) - 1) * b1.dusk.per)) : 0;
    if (k === key) { if (wk !== windK) applyWind(b1, wk); hollowRound(src.round || 1); hollowLeft(v, v.me === 1 ? -1 : 1); return; }
    key = k; clear();
    const bi = biomeOf(look), hF = v.me === 1 ? -1 : 1;
    // seeded per map, not per side: both players get the same land, each seeing it from their own end
    let sd = 0; for (const ch of id) sd = (sd * 31 + ch.charCodeAt(0)) % 2147483647; sd = sd || 7;
    const rr = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    const pickOf = (list) => { let s = 0; for (const [, w] of list) s += w; let x = rr() * s; for (const [n, w] of list) { if ((x -= w) <= 0) return n; } return list[0][0]; };
    const hw = BW / 2, hd = BD / 2;
    // model (+ '~' when far out: no shadow, an impostor if it has one; bushes from 6 m) -> [[x, y, z, ang, s, shade]]
    const placed = new Map();
    // ponds (the desert's oasis): nothing else grows in the water
    const ponds = bi.ponds ? [{ x: hw * 0.2, z: -hd - 25, rx: 24, rz: 12 }, { x: -hw - 17, z: -hd * 0.25, rx: 9, rz: 16 }] : [];
    // the cabin (Moonlit Snow): off the far end, a little right of the middle, turned toward the board; its clearing stays open
    const cab = bi.cabin ? { x: hw * 0.32, z: -hd - 15, ang: -0.22, r: 11, s: 1.4 } : null;
    // Christmas props (biome .season 'xmas'): a lantern at each of the board's four corners, snowmen by the cabin and
    // along the sides; nothing else is placed on their spots
    const props = bi.season === 'xmas' ? [
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ kind: 'lantern', x: sx * (hw + 3), z: sz * (hd + 3), ang: sx > 0 ? Math.PI : 0, s: 0.9 }))),
      ...(cab ? [{ kind: 'snowman', x: cab.x - 9, z: cab.z + 5, ang: 0.5, s: 1.2 }] : []),
      { kind: 'snowman', x: -(hw + 7), z: -hd * 0.3, ang: 1.2, s: 1.15 }, { kind: 'snowman', x: hw + 6.5, z: hd * 0.25, ang: -1.0, s: 1.1 }] : [];
    // Ashlands: the burnt village past the far end (KayKit Dungeon walls, pillars, rubble, stairs to nowhere, all
    // sooty, embers in the rubble), and the battle's leftovers by the board: broken swords and shields stuck in the
    // ash, broken barricades, smouldering hot spots
    if (bi.ruins) {
      const R = { x: -hw * 0.28, z: -hd - 17, ang: 0.12, s: 1.25 }, ca = Math.cos(R.ang), sa = Math.sin(R.ang);
      const at = (lx, lz) => ({ x: R.x + (lx * ca + lz * sa) * R.s, z: R.z + (-lx * sa + lz * ca) * R.s });
      [['wall_archedwindow_open', 0, 0, 0, 1], ['wall_broken', -4, 0, 0, 1], ['wall_half', 2, 0, 0, 1], ['pillar', -6.2, 0, 0, 1], ['pillar', 4.6, 0, 0, 0.75],
        ['wall_broken', -6.2, -2.4, Math.PI / 2, 1], ['rubble_large', -1.6, 2.7, 0.2, 0.5], ['rubble_half', 3.1, 2.1, -0.5, 0.55], ['stairs', 7, -5, -0.35, 0.7]]
        .forEach(([model, lx, lz, a, sc]) => props.push({ kind: 'model', model, mat: 'soot', ...at(lx, lz), ang: R.ang + a, s: R.s * sc, sink: 0.6 }));
      [[-1.6, 2.9, 0.9], [3.3, 2.3, 0.75], [0.2, -1.6, 0.8]].forEach(([lx, lz, sc]) => props.push({ kind: 'ember', ...at(lx, lz), s: sc * R.s }));
      props.ruinsAt = R;
    }
    // Ashlands: the battlefield. Shell craters first (their rims and pits shape the ground), then the debris round
    // the board: volleys of spears stuck in the ground, shields and swords, skulls and bones, broken palisades and
    // stakes, charred logs, torn banners of both armies, and the ribcage and skull of a fallen giant beast
    const craters = [];
    if (bi.craters) {
      for (let tries = 0; craters.length < bi.craters && tries < 600; tries++) {
        const x = (rr() * 2 - 1) * (hw + 46), z = -hd - 50 + rr() * (BD + 80), r = 2.5 + rr() * 5.5, d = Math.max(Math.abs(x) - hw, Math.abs(z) - hd, 0);
        if (d < 3 + r * 0.6 || d > 44 || (z > hd && Math.abs(x) < hw + 6 && d < 10) || (props.ruinsAt && Math.hypot(x - props.ruinsAt.x, z - props.ruinsAt.z) < 15 + r)) continue;
        if (craters.some((c) => Math.hypot(x - c.x, z - c.z) < (r + c.r) * 0.9)) continue;
        craters.push({ x, z, r, depth: 0.5 + r * 0.16 });
      }
      craters.slice(0, 3).forEach((c) => props.push({ kind: 'ember', x: c.x, z: c.z, s: 0.8 + c.r * 0.08, y: 0.1 }));
    }
    if (bi.battlefield) {
      const near = (x, z) => z > hd - 2 && Math.abs(x) < hw + 8; // beside your own end: only low things there
      const spot = (dmin, dmax) => { for (let t = 0; t < 40; t++) { const x = (rr() * 2 - 1) * (hw + dmax), z = -hd - dmax + rr() * (BD + dmax * 1.6), d = Math.max(Math.abs(x) - hw, Math.abs(z) - hd, 0);
        if (d >= dmin && d <= dmax && !craters.some((c) => Math.hypot(x - c.x, z - c.z) < c.r * 0.9) && !(props.ruinsAt && Math.hypot(x - props.ruinsAt.x, z - props.ruinsAt.z) < 12)) return { x, z }; } return null; };
      const add = (model, n, dmin, dmax, f) => { for (let i = 0; i < n; i++) { const p = spot(dmin, dmax); if (p) { const q = f(p); if (q) props.push({ kind: 'model', model, x: p.x, z: p.z, ang: rr() * 6.28, ...q }); } } };
      for (let v = 0; v < 6; v++) { const c = spot(2, 18); if (!c || near(c.x, c.z)) continue; const lean = rr() * 6.28; // a volley: spears stuck in a rough patch, leaning the same way
        for (let i = 0; i < 4 + Math.floor(rr() * 4); i++) props.push({ kind: 'model', model: '__spear', x: c.x + (rr() - 0.5) * 4, z: c.z + (rr() - 0.5) * 4, ang: lean + (rr() - 0.5) * 0.5, tilt: 0.25 + rr() * 0.35, s: 1.1, sink: 0.5 }); }
      add('Skeleton_Shield_Large_A', 9, 1.5, 20, (p) => near(p.x, p.z) ? null : ({ tilt: 1.35 + rr() * 0.2, s: 1.7, mat: 'soot', sink: 0.15 }));
      add('Skeleton_Blade', 8, 1.5, 20, (p) => near(p.x, p.z) ? null : { tilt: (rr() - 0.5) * 0.6, roll: Math.PI, s: 1.7, mat: 'soot', sink: 0.35 });
      add('sword_shield_broken', 4, 2, 16, (p) => near(p.x, p.z) ? null : ({ tilt: (rr() - 0.5) * 0.5, s: 1.5, mat: 'soot', sink: 0.2 }));
      add('skull', 7, 1.5, 22, () => ({ s: 0.75, tilt: (rr() - 0.5) * 0.5, sink: 0.1, mat: 'soot' }));
      add('bone_A', 10, 1.5, 22, () => ({ s: 1.6, sink: 0.05, mat: 'soot' }));
      add('Wood_Log_A', 7, 2, 24, (p) => near(p.x, p.z) ? null : { s: 2, mat: 'soot', sink: 0.1 });
      add('Stone_Chunks_Small', 6, 2, 24, () => ({ s: 1.6, mat: 'soot' }));
      add('fence_broken', 5, 4, 24, (p) => near(p.x, p.z) ? null : { s: 1.3, mat: 'soot', tilt: (rr() - 0.5) * 0.3, sink: 0.2 });
      add('__stake', 9, 2.5, 22, (p) => near(p.x, p.z) ? null : { s: 1.1 + rr() * 0.5, tilt: (rr() - 0.5) * 0.5, mat: 'soot', sink: 0.3 });
      add('barrier_half', 3, 3, 18, (p) => near(p.x, p.z) ? null : { s: 1.6, mat: 'soot' });
      [[-1, -0.35], [1, 0.2], [-1, 0.55], [1, -0.7], [-1, -0.85]].forEach(([sd, f], i) => props.push({ kind: 'model', model: i % 2 ? '__banner_blue' : '__banner_red', x: sd * (hw + 4 + rr() * 6), z: f * hd, ang: rr() * 6.28, tilt: (rr() - 0.5) * 0.25, s: 1.2, sink: 0.4 }));
      const beast = { x: hw + 15, z: -hd * 0.12 }; // the fallen giant: a huge skull half sunk in the ash, its great bones strewn round it
      props.push({ kind: 'model', model: 'skull', x: beast.x, z: beast.z, ang: 2.2, s: 4.2, tilt: 0.25, sink: 0.5, mat: 'soot' });
      [[4, 3, 0.4], [-3, 5, 1.9], [6, -2, 2.8], [1, -5, 1.1], [-5, -1, 0.2]].forEach(([dx, dz, a]) => props.push({ kind: 'model', model: 'bone_A', x: beast.x + dx, z: beast.z + dz, ang: a, s: 5.5, sink: 0.2, mat: 'soot' }));
      props.beast = beast;
    }
    // Darkwoods: the old stone gate past the far end, a candle-lit shrine and candles before it, broken fences either
    // side; fallen logs by the board's sides; the giant twisted trees leaning over its sides and far corners. clears:
    // spots nothing else grows on
    const clears = [];
    const gate = bi.gate ? { x: -hw * 0.1, z: -hd - 16, ang: 0.06, s: 2.2 } : null;
    if (gate) {
      const G = gate, ca = Math.cos(G.ang), sa = Math.sin(G.ang), at = (lx, lz) => ({ x: G.x + (lx * ca + lz * sa) * G.s, z: G.z + (-lx * sa + lz * ca) * G.s });
      [['arch_gate', 0, 0, 0, 1, 0], ['fence_broken', -4.6, 0.1, 0.05, 1, 0], ['fence_pillar_broken', -6.8, 0.15, 0, 1, 0], ['fence_broken', 4.4, -0.15, -0.12, 1, 0.22], ['fence_pillar_broken', 6.6, -0.4, 0.3, 0.9, 0]]
        .forEach(([model, lx, lz, a, sc, tilt]) => props.push({ kind: 'model', model, ...at(lx, lz), ang: G.ang + a, s: G.s * sc, tilt, y: 0 }));
      props.push({ kind: 'model', model: 'shrine_candles', ...at(2.7, 2.4), ang: G.ang - 0.5, s: G.s * 0.75, y: 0, glow: [2.75, 2.2, '#FFB65C'], light: [10, 1.5, 0.6] });
      props.push({ kind: 'model', model: 'candle_triple', ...at(1.5, 2.1), ang: 0.4, s: G.s * 0.9, y: 0, glow: [0.8 * G.s * 0.9, 1.4, '#FFB65C'] });
      props.push({ kind: 'model', model: 'candle_triple', ...at(-1.3, 1.7), ang: 2.1, s: G.s * 0.8, y: 0, glow: [0.8 * G.s * 0.8, 1.3, '#FFB65C'], light: [8, 1.1, 0.7] });
      clears.push({ x: G.x, z: G.z + 2, r: 13 });
      [[-1, -0.35, 5.5, 0.25, 'Wood_Log_A'], [1, 0.42, 6, -0.3, 'Wood_Log_B'], [-1, 0.3, 11, 1.25, 'Wood_Log_B'], [1, -0.72, 7, 0.95, 'Wood_Log_A']]
        .forEach(([sd, f, off, a, model]) => props.push({ kind: 'model', model, x: sd * (hw + off), z: f * hd, ang: a, s: 4, y: 1.1 }));
    }
    const giants = bi.giants ? [[-(hw + 8), -hd * 0.72, 'TwistedTree_2', 1.35], [-(hw + 10.5), -hd * 0.05, 'TwistedTree_4', 1.25], [-(hw + 7.5), hd * 0.5, 'TwistedTree_5', 1.15],
      [hw + 9, -hd * 0.5, 'TwistedTree_3', 1.3], [hw + 7.5, hd * 0.22, 'TwistedTree_1', 1.15], [hw + 11, hd * 0.68, 'TwistedTree_2', 1.1],
      [-hw * 0.68, -hd - 9, 'TwistedTree_1', 1.4], [hw * 0.55, -hd - 10.5, 'TwistedTree_5', 1.35]] : [];
    for (const [x, z] of giants) clears.push({ x, z, r: 5 });
    // Savanna: two granite kopjes (piles of big boulders, the far one with the lone giant acacia beside it), the
    // shapes on the horizon; nothing else grows on them
    const kopjes = bi.kopjes ? [{ x: -hw * 0.42, z: -hd - 24, r: 10, s: 1.25, tree: true }, { x: hw + 21, z: -hd * 0.32, r: 7, s: 0.9 }] : [];
    // Snow: the terrain of the pass. The board lies in a saddle: either side the mountain shoulders rise past the cliffs
    // (steep rock, then gentler snowfields up to a ridge); ahead, past the far end, and far behind your end the pass
    // falls away over a lip of cornice into the clouds, the shoulders sinking with it as spurs
    const outD = (x, z) => Math.hypot(Math.max(0, Math.abs(x) - hw), Math.max(0, Math.abs(z) - hd));
    const SZ0 = -hd - 110;
    const sheetH = (x, z) => {
      const d = outD(x, z); if (d <= 0) return 0;
      const sd = x < 0 ? -1 : 1, X = Math.abs(x);
      let h = smoothstep(0.3, 6, d) * (0.1 + 0.6 * vnoise(x * 0.06 + 2.3, z * 0.09 - 1.1) + 0.25 * vnoise(x * 0.21, z * 0.19));
      const ax = X - (hw + 13 + 6 * vnoise(z * 0.04 + (sd > 0 ? 11.3 : 3.7), sd * 2.1));
      const az = -z - (hd + 13 + 5 * vnoise(x * 0.05, 1.7)), bz = z - (hd + 42 + 8 * vnoise(x * 0.04, 3.3)), out = Math.max(az, bz);
      if (ax > 0) h += (smoothstep(0, 26, ax) * (30 + 26 * vnoise(x * 0.025 + 5.1, z * 0.03 + sd * 5)) + 3 * vnoise(x * 0.17, z * 0.17) * smoothstep(0, 8, ax))
        * (1 - smoothstep(-5, 70, out)) * (1 - smoothstep(hw + 50, hw + 64, X));
      const fall = (a) => (a > 0 ? -(80 * smoothstep(0, 9, a) + a * 0.4) * (0.8 + 0.4 * vnoise(x * 0.3, z * 0.3)) : 0) + 0.8 * Math.exp(-(((a + 1.2) / 1.3) ** 2));
      const open = Math.max(1 - smoothstep(2, 24, ax), smoothstep(25, 70, out)); // the drop: full in the pass, none up a shoulder (until far out)
      return h + fall(out) * open + (X > hw + 56 ? fall(X - (hw + 58)) : 0);
    };
    const onPlateau = (x, z) => { const h = sheetH(x, z); return h > -0.4 && h < 2.4; };
    // the Hollow: the pit. Steep earth walls rise a few metres past the flanks and the far end (the far one highest),
    // the rim rolls on beyond them, and toward your end the walls give way to the long slope you came down
    const PIT = bi.pit;
    const pitH = PIT ? (x, z) => {
      const dx = Math.max(0, Math.abs(x) - hw), dF = Math.max(0, -z - hd), dN = Math.max(0, z - hd), d = Math.hypot(dx, dF);
      if (d <= 0 && dN <= 0) return 0;
      const farK = smoothstep(-hd * 0.2, hd + 6, -z), H = (PIT.flank + (PIT.far - PIT.flank) * farK) * (0.86 + 0.28 * vnoise(x * 0.03 + 4.1, z * 0.03 - 2.2));
      const w0 = 5 + 4 * vnoise(x * 0.05 + 1.3, z * 0.05 + 7.7), steep = smoothstep(w0, w0 + 6.5, d);
      let wall = H * steep + steep * (2.5 * vnoise(x * 0.04 + 9.1, z * 0.04) + 4 * smoothstep(w0 + 10, w0 + 45, d)); // the rim rolls on, rising a little
      wall += 1.6 * (vnoise(x * 0.35, z * 0.35) - 0.5) * smoothstep(0, 1, steep * (1 - steep) * 4); // ledges and bulges on the wall face
      const nearK = smoothstep(hd - 8, hd + 22, z), ramp = 9 * smoothstep(5, 60, dN + dx * 0.5) + 0.6 * vnoise(x * 0.15, z * 0.15) * smoothstep(1, 6, dN + dx);
      return Math.max(0, wall * (1 - nearK) + ramp * nearK);
    } : null;
    const steepAt = (x, z) => PIT ? Math.abs(pitH(x + 1.5, z) - pitH(x - 1.5, z)) + Math.abs(pitH(x, z + 1.5) - pitH(x, z - 1.5)) : 0;
    // Snow: the summit's layout. The yeti's rocks (big boulders he hides behind), cliff walls along the far half of
    // both sides (facing the board; the left ones lower, the low sun throws their shadows over it) and at the far
    // corners, seracs and crystal clusters, flags on cairns (two at the crest of the pass), drifts along the wind
    const sum = bi.summit ? { cliffs: [], ice: [], flags: [], yeti: [] } : null;
    if (sum) {
      wind = bi.wind;
      // (two at the far corners, seen from the angled views; two on the flanks, seen from above)
      for (const [x, z, lean] of [[-hw * 0.5, -hd - 5.5, 1], [hw * 0.6, -hd - 6, -1], [-(hw + 4.5), -hd * 0.3, 1], [hw + 4.5, hd * 0.05, -1]]) { sum.yeti.push({ x, z, lean, y: sheetH(x, z) * 0.7 }); clears.push({ x, z, r: 5 }); }
      const nearYeti = (x, z) => sum.yeti.some((q) => Math.hypot(x - q.x, z - q.z) < 7);
      for (const sd of [-1, 1]) for (let z = -hd - 4; z < hd * 0.15; z += 9 + rr() * 6) {
        if (rr() < 0.22) continue;
        const name = ['Cliff_1', 'Cliff_2', 'Cliff_3', 'CliffIcy'][Math.floor(rr() * 4)], s = (sd < 0 ? 1.05 : 1.35) + rr() * 0.55, x = sd * (hw + 6.5 + rr() * 4.5);
        if (!nearYeti(x, z)) sum.cliffs.push([name, x, z, s, -sd * Math.PI / 2 + (rr() - 0.5) * 0.5]);
      }
      for (const x of [-hw - 7, -hw * 0.78, hw * 0.74, hw + 7]) sum.cliffs.push([rr() < 0.6 ? 'Cliff_3' : 'Cliff_2', x, -hd - 5 - rr() * 3, 1.5 + rr() * 0.5, (x > 0 ? -0.35 : 0.35) + (rr() - 0.5) * 0.3]);
      for (const [, x, z, s] of sum.cliffs) clears.push({ x, z, r: 2.6 * s });
      for (let n = 0, t = 0; n < (bi.seracs || 0) && t < 300; t++) {
        const sd = rr() < 0.5 ? -1 : 1, x = sd * (hw + 3.5 + rr() * 8), z = -hd + rr() * BD * 0.8;
        if (clears.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + 2)) continue;
        const name = ['Serac_1', 'Serac_2', 'Crystal_1', 'Crystal_1'][Math.floor(rr() * 4)];
        sum.ice.push([name, x, z, /^Serac/.test(name) ? 1 + rr() * 0.5 : 1.1 + rr() * 0.6]); clears.push({ x, z, r: 4 }); n++;
      }
      const FLAGS = ['#B8433A', '#D99A36', '#3E6BA8', '#E6E0CF'];
      [[-(hw + 5), hd * 0.12], [hw + 4.5, hd * 0.4], [-hw * 0.12, -hd - 9], [hw * 0.3, -hd - 9.5]].slice(0, bi.flags || 0).forEach(([x, z], i) => {
        const p = { kind: 'model', model: '__flagpole', x, z, ang: rr() * 6.28, s: 1.35, y: 0, sink: 0.1 }; props.push(p); sum.flags.push([p, FLAGS[i % 4], i * 1.7 + 0.4]); });
      const wa = Math.atan2(-wind[1], wind[0]);
      for (let n = 0, t = 0; n < 16 && t < 200; t++) {
        const x = (rr() * 2 - 1) * (hw + 14), z = -hd - 8 + rr() * (BD + 14), d = Math.max(Math.abs(x) - hw, Math.abs(z) - hd, 0);
        if (d < 1.5 || d > 13 || (z > hd - 2 && Math.abs(x) < hw + 6) || clears.some((q) => Math.hypot(x - q.x, z - q.z) < q.r) || !onPlateau(x, z)) continue;
        props.push({ kind: 'model', model: '__drift', x, z, ang: wa + (rr() - 0.5) * 0.15, s: 0.9 + rr() * 0.8, y: 0, sink: 0.3 }); n++;
      }
    }
    const inPond = (x, z, k = 1.12) => kopjes.some((q) => Math.hypot(x - q.x, z - q.z) < q.r * k) || ponds.some((p) => ((x - p.x) / p.rx) ** 2 + ((z - p.z) / p.rz) ** 2 < k * k) || (cab && Math.hypot(x - cab.x, z - cab.z) < cab.r)
      || props.some((p) => Math.hypot(x - p.x, z - p.z) < (p.kind === 'lantern' ? 1.6 : p.kind === 'ember' ? 1.5 : 2.6))
      || (props.ruinsAt && Math.hypot(x - props.ruinsAt.x, z - props.ruinsAt.z) < 13) || clears.some((q) => Math.hypot(x - q.x, z - q.z) < q.r) || (props.beast && Math.hypot(x - props.beast.x, z - props.beast.z) < 9)
      || (sum && !onPlateau(x, z));
    const tintFor = (name) => { const t = (bi.tints || []).find(([re]) => re.test(name)); return t ? t[1] : [1, 1, 1]; };
    const squashOf = (name) => { const t = (bi.squash || []).find(([re]) => re.test(name)); return t ? t[1] : 1; };
    const put = (name, x, z, s, y = 0, wet = false, real = false, ang = null) => { // ang: its turn (else a random one)
      if (!lib[name] || (!wet && inPond(x, z))) return;
      const d = outside(x, z), k = name + (!real && (d > 16 || (d > 6 && /^Bush/.test(name))) ? '~' : ''), sh = 0.85 + rr() * 0.3, t = tintFor(name);
      y += groundH(x, z) * (PIT ? 0.97 : 0.7); // on deep snow (Moonlit Snow) things stand a little sunk in (on the Hollow's rim, on it)
      (placed.get(k) || placed.set(k, []).get(k)).push([x, y, z, ang == null ? rr() * Math.PI * 2 : ang, s, [bi.tint[0] * t[0] * sh, bi.tint[1] * t[1] * sh, bi.tint[2] * t[2] * sh], squashOf(name)]);
    };
    const L = { desert: DESERT, autumn: AUTUMN, darkwoods: DARK, ash: ASH, savanna: SAVANNA, moonlit: SNOWY, summit: SUMMIT, hollow: HOLLOW, rocks: { low: ROCKS, tuft: PEBBLES, rocks: ROCKS, dress: DRESS } }[bi.low] || { low: LOW, tuft: TUFT, rocks: ROCKS, dress: DRESS };
    const low = () => pickOf(L.low), tuft = () => pickOf(L.tuft);
    const outside = (x, z) => Math.max(Math.abs(x) - hw, Math.abs(z) - hd, 0) > 0 ? Math.hypot(Math.max(0, Math.abs(x) - hw), Math.max(0, Math.abs(z) - hd)) : 0;
    // deep snow (biome .deepSnow): the height of the snow at a spot, 0 on the board, rising over its first metres
    // outside into long wind-blown drifts, flattened round the cabin so its door and light stay clear
    const groundH = bi.deepSnow ? (x, z) => {
      const d = outside(x, z); if (d <= 0) return 0;
      let h = 0.25 + 0.9 * vnoise(x * 0.035 + 3.1, z * 0.11 - 1.7) + 0.35 * vnoise(x * 0.12 - 5.3, z * 0.09 + 2.2) + 0.12 * vnoise(x * 0.4, z * 0.4);
      h *= bi.deepSnow * smoothstep(0.3, 7, d);
      if (cab) h *= 0.15 + 0.85 * smoothstep(cab.r * 1.05, cab.r * 1.5, Math.hypot(x - cab.x, z - cab.z));
      return h;
    } : sum ? (x, z) => sheetH(x, z) : PIT ? pitH : bi.craters ? (x, z) => { // churned ground: low rolling ash, shell craters with raised rims and pits
      const d = outside(x, z); if (d <= 0) return 0;
      let h = 0.3 + 0.45 * vnoise(x * 0.06 + 1.7, z * 0.06 - 3.1) + 0.15 * vnoise(x * 0.2, z * 0.2);
      for (const c of craters) { const q = Math.hypot(x - c.x, z - c.z) / c.r; if (q > 1.8) continue; h += (q < 1 ? -c.depth * (1 - q * q) : 0) + c.depth * 0.32 * Math.exp(-(((q - 1) / 0.28) ** 2)); }
      return Math.max(0.02, h * smoothstep(0.3, 4, d));
    } : () => 0;
    // the Hollow's layout: her spot, the root bridge over it, roots out of the walls (cocoons hanging off some), the
    // victims lying in their cocoons under the walls, silk by round, and the column of light
    let holo = null;
    if (bi.hollow) {
      const mo = v.boss && v.boss.mommy, tw = !mo && typeof Boss !== 'undefined' ? Game.tileToWorld(Boss.CFG.mommy.col, Boss.CFG.mommy.row) : null;
      const mx = mo ? mo.x * hF : tw ? tw.x * hF : 0, mz = mo ? -mo.y * hF : tw ? -tw.y * hF : -hd * 0.3;
      // where a wall's face reaches height y: going out from the board's side (sd -1 left, 1 right) at z, or past the far end at x
      const faceX = (sd, z, y) => { for (let X = hw + 1; X < hw + 40; X += 0.4) if (groundH(sd * X, z) >= y) return X; return hw + 12; };
      const faceZ = (x, y) => { for (let Z = hd + 1; Z < hd + 45; Z += 0.4) if (groundH(x, -Z) >= y) return Z; return hd + 14; };
      const bp = [[-(faceX(-1, mz + 4, 14) + 3.5), 12.5, mz + 4], [-(faceX(-1, mz + 2, 16) - 0.8), 16.5, mz + 2], [mx - hw * 0.5, 21.6, mz + 0.7], [mx, 23, mz],
        [mx + hw * 0.5, 21.9, mz - 0.8], [faceX(1, mz - 2.4, 16) - 0.8, 17, mz - 2.4], [faceX(1, mz - 4, 14) + 3.5, 12.8, mz - 4]];
      const bc = new THREE.CatmullRomCurve3(bp.map((p) => new THREE.Vector3(...p))), at = (u) => bc.getPointAt(u);
      let silkAt = 0.5; for (let u = 0, best = 1e9; u <= 1; u += 0.002) { const e = Math.abs(at(u).x - mx); if (e < best) { best = e; silkAt = u; } }
      const top = at(silkAt), radAt = (u) => 1.35 + 1.9 * Math.pow(Math.abs(2 * u - 1), 2.2);
      const webs = [], strands = [], roots = [], tendrils = [];
      const S = (a, b, round) => strands.push([a, b, round]);
      for (const u of [0.1, 0.17, 0.27, 0.37, 0.63, 0.73, 0.83, 0.9]) { const p = at(u + (rr() - 0.5) * 0.02); tendrils.push([p.x, p.y - radAt(u) * 0.7, p.z, 3 + rr() * 4.5, (rr() - 0.5) * 2]); }
      S([top.x - 3.2, top.y - 0.6, top.z], [top.x, top.y - radAt(silkAt) - 0.6, top.z], 1); S([top.x + 3.2, top.y - 0.4, top.z], [top.x, top.y - radAt(silkAt) - 0.6, top.z], 1); // her thread's knot
      const hang = (x, y, z, s, round, extra) => { // a cocoon hanging on silk from (x, y, z)
        const cy = y - 1 - 2.2 * s; props.push({ kind: 'model', model: '__cocoon', x, z, y: cy, ang: rr() * 6.28, s, hang: true, tilt: (rr() - 0.5) * 0.12 }); S([x, y, z], [x, cy + 2.2 * s, z], round);
        if (extra) for (const [m, dy, sc] of extra) props.push({ kind: 'model', model: m, x: x + 0.15, z: z + 0.1, y: cy - dy, ang: rr() * 6.28, s: sc, hang: true, tilt: 0.3 });
      };
      // roots out of the walls: out a little, then drooping down the face; n: the way out of the wall
      const root = (ox, oz, nx, nz, y0, r0, round) => {
        const tx = -nz, tz = nx, w = (rr() - 0.5) * 2, P = (o, dy, sw) => [ox + nx * o + tx * sw * w, y0 + dy, oz + nz * o + tz * sw * w];
        const drop = 6 + rr() * 5, pts = [P(-3, 0.6, 0), P(0.3, 0, 0.2), P(2, -1.1, 0.5), P(2.5, -3.3, 0.9), P(2.1, -drop * 0.75, 1.2), P(1.6, -drop, 1.4)];
        roots.push([pts, r0]); const tip = pts[pts.length - 1];
        if (rr() < 0.45) hang(tip[0] + nx * 0.4, tip[1] - 0.2, tip[2] + nz * 0.4, 0.75 + rr() * 0.35, round);
        if (rr() < 0.5) S(pts[2], [ox - nx * 0.2 + tx * 4, y0 - 4 - rr() * 4, oz - nz * 0.2 + tz * 4], round);
        return pts;
      };
      let k = 0;
      const byMouth = (sd, z) => sd > 0 && Math.abs(z + hd * 0.62) < 7; // (the nursery's mouth is there: see below)
      for (const sd of [-1, 1]) for (let z = -hd + 3 + rr() * 4; z < hd * 0.4; z += 11 + rr() * 6) { if (byMouth(sd, z)) continue; const y0 = 7 + rr() * 6.5, X = faceX(sd, z, y0); root(sd * X, z, -sd, 0, y0, 0.55 + rr() * 0.5, 1 + (k++ % 5)); }
      for (let x = -hw + 4 + rr() * 5; x < hw - 3; x += 10 + rr() * 6) { const y0 = 9 + rr() * 9, Z = faceZ(x, y0); root(x, -Z, 0, 1, y0, 0.6 + rr() * 0.55, 1 + (k++ % 5)); }
      // cocoons hanging under the bridge where it leaves the walls (one with a frying pan and a tin cup dangling under it)
      { const p = at(0.1); hang(p.x + 1, p.y - radAt(0.1) * 0.8, p.z, 1.05, 1, [['__pan', 0.9, 1], ['__cup', 1.6, 1]]); }
      for (const u of [0.15, 0.86, 0.92]) { const p = at(u); hang(p.x + (rr() - 0.5) * 2, p.y - radAt(u) * 0.8, p.z + (rr() - 0.5), 0.8 + rr() * 0.4, u < 0.5 ? 2 : 3); }
      // victims: cocoons lying under the walls with what they carried poking out (and bones round them)
      const victim = (x, z, ang) => {
        props.push({ kind: 'model', model: '__cocoon', x, z, y: 0.35, ang, s: 1.05, tilt: Math.PI / 2 - 0.08 });
        const ca = Math.cos(ang), sa = Math.sin(ang), side = (o, f) => ({ x: x + ca * o + sa * f, z: z - sa * o + ca * f });
        const pick = Math.floor(rr() * 3);
        if (pick === 0) props.push({ kind: 'model', model: 'Skeleton_Shield_Large_A', ...side(1.4, 0.4), ang: ang + 0.6, s: 1.4, tilt: 1.3, sink: 0.1 });
        else if (pick === 1) props.push({ kind: 'model', model: 'Skeleton_Blade', ...side(-0.6, -1.6), ang: ang + 1.2, s: 1.5, tilt: -1.15, sink: 0.1 });
        else props.push({ kind: 'model', model: '__spear', ...side(0.4, -1.4), ang, s: 1, tilt: 1.2, sink: 0.05 });
        props.push({ kind: 'model', model: 'skull', ...side(-1.6, 0.9), ang: rr() * 6.28, s: 0.65, tilt: 0.3 });
        for (let i = 0; i < 2; i++) props.push({ kind: 'model', model: 'bone_A', ...side((rr() - 0.5) * 4, (rr() - 0.5) * 3), ang: rr() * 6.28, s: 1.3 });
      };
      [[-(hw + 3.6), -hd * 0.62, 0.3], [hw + 3.2, -hd * 0.18, 2.2], [-hw * 0.38, -hd - 3.4, 1.4], [hw * 0.52, -hd - 3.8, 4.4], [-(hw + 3.3), hd * 0.12, 5.2]].forEach(([x, z, a]) => victim(x, z, a));
      // silk by round. Round 1: the far corners and a few sheets; every round more, until by round 5 the walls are half veiled
      for (const sd of [-1, 1]) { const X = faceX(sd, -hd - 3, 9) - 1, Z = faceZ(sd * (hw - 2), 9) - 1;
        webs.push([0, sd * (hw + 4.2), 8, -(hd + 4.2), 13, -sd * Math.PI / 4, 0, 1]);
        S([sd * X, 15, -hd - 2], [sd * (hw - 1), 14, -Z], 1); S([sd * X, 4, -hd - 4], [sd * (hw + 2), 1.5, -Z], 2); }
      for (const sd of [-1, 1]) { const X = faceX(sd, mz, 12) - 2.5; webs.push([0, sd * X, 10.5, mz + 1.5 * sd, 10.5, 0, 0, sd < 0 ? 2 : 3]); }
      let wk = 0;
      for (const sd of [-1, 1]) for (let z = -hd + 6 + rr() * 5; z < hd * 0.5; z += 9 + rr() * 5) {
        if (byMouth(sd, z)) continue; const y = 6 + rr() * 6, X = faceX(sd, z, y) - 0.7; webs.push([1, sd * X, y, z, 9 + rr() * 5, sd > 0 ? -Math.PI / 2 : Math.PI / 2, (rr() - 0.5) * 0.4, 1 + (wk++ % 5)]);
      }
      for (let x = -hw + 7 + rr() * 6; x < hw - 5; x += 11 + rr() * 6) { const y = 7 + rr() * 9, Z = faceZ(x, y) - 0.7; webs.push([1, x, y, -Z, 10 + rr() * 5, 0, (rr() - 0.5) * 0.3, 2 + (wk++ % 4)]); }
      for (let n = 0, t = 0; n < 14 && t < 200; t++) { // sheets on the ground just past the board's edges (never at your end)
        const sd = rr() < 0.5 ? -1 : 1, onFar = rr() < 0.35, x = onFar ? (rr() * 2 - 1) * hw : sd * (hw + 2 + rr() * 2.5), z = onFar ? -hd - 2 - rr() * 2.5 : -hd + rr() * BD * 0.72;
        webs.push([1, x, 0.22 + n * 0.01, z, 5 + rr() * 4, rr() * 6.28, -Math.PI / 2, 2 + (n % 4)]); n++;
      }
      for (let i = 0; i < 18; i++) { const u = 0.05 + rr() * 0.9, p = at(u); if (Math.abs(p.x) < hw + 1) continue; // guy lines from the bridge to the walls
        const sd = p.x < 0 ? -1 : 1, y = 4 + rr() * 9, X = faceX(sd, p.z + (rr() - 0.5) * 16, y); S([p.x, p.y - 1, p.z], [sd * (X - 0.3), y, p.z + (rr() - 0.5) * 16], 1 + (i % 5)); }
      // the nursery's mouth at the foot of the right wall near the far end (where the boss bar over the far edge and the
      // PC's shop panel on the left don't hide it), leaning back with the wall; her shed skins pile up in front of it
      const tz = -hd * 0.62, fx = faceX(1, tz, 0.8), lean = Math.atan2(faceX(1, tz, 6.5) - fx, 5.7);
      const tunnel = { x: fx, z: tz, ang: -Math.PI / 2, lean, w: 10, ht: 9 };
      clears.push({ x: fx - 2, z: tz, r: 7 });
      const moltAt = [fx - 3.4, groundH(fx - 3.4, tz + 5.5), tz + 5.5];
      // the spiderlings' lanes, out of the mouth along the walls' faces: half toward your end along the right wall, half
      // round the far corner and along the far wall; from drop straight down to the wall's foot. Each point: [x, y, z,
      // the face's normal]
      const nrmAt = (x, z) => { const e = 0.6, n = new THREE.Vector3(-(groundH(x + e, z) - groundH(x - e, z)) / (2 * e), 1, -(groundH(x, z + e) - groundH(x, z - e)) / (2 * e)).normalize(); return [n.x, n.y, n.z]; };
      const onFar = (x, y) => [x, y, -faceZ(x, y) + 0.15], onRight = (z, y) => [faceX(1, z, y) - 0.15, y, z];
      const lanes = [];
      for (let i = 0; i < 8; i++) {
        const hl = 3 + (i * 1.7) % 8, pts = [[fx - 0.6, 0.6, tz]], up = (d) => Math.min(hl, 0.6 + d * 0.9);
        let end;
        if (i % 2 === 0) { const zEnd = tz + 12 + (i >> 1) * 14; for (let z = tz + 1.5; z < zEnd; z += 1.6) pts.push(onRight(z, up(z - tz))); end = (y) => onRight(zEnd, y); }
        else { for (let z = tz - 1.5; z > -hd - 3; z -= 1.6) pts.push(onRight(z, up(tz - z))); const xEnd = hw * (0.6 - (i >> 1) * 0.45);
          for (let x = hw + 2; x > xEnd; x -= 1.6) pts.push(onFar(x, hl)); end = (y) => onFar(xEnd, y); }
        const drop = pts.length - 1;
        for (let y = hl - 1.4; y > 0.4; y -= 1.4) pts.push(end(y));
        pts.push(end(0.35));
        lanes.push({ pts: pts.map((q) => [...q, ...nrmAt(q[0], q[2])]), drop });
      }
      const sun = (bi.light && bi.light.pos) || [-16, 74, -12];
      holo = { tunnel, lanes, moltAt, bridge: bp, silkAt, anchor: [top.x, top.y - radAt(silkAt) * 0.9, top.z], roots, tendrils, webs, strands, beam: [mx * 0.15, -hd * 0.06, 14, 23], sun };
    }
    // 1. the edge: a frame of bushes, rocks and tall grass hugging the board, so its edge doesn't end in a hard line
    for (let s = 0; s < 2 * (BW + BD); s += 2.6) {
      if (rr() > 0.8 * bi.grow) continue;
      let x, z; const off = 0.8 + rr() * 2.8;
      if (s < BW) { x = -hw + s; z = -hd - off; } else if (s < BW + BD) { x = hw + off; z = -hd + (s - BW); }
      else if (s < 2 * BW + BD) { x = hw - (s - BW - BD); z = hd + off; } else { x = -hw - off; z = hd - (s - 2 * BW - BD); }
      const near = z > hd; // your end: keep it low so it never hides your own squads from the angled view
      put(low(), x, z, (near ? 0.8 : 1) * (1 + rr() * 0.8));
    }
    // 2. the land around: trees thicken with distance; your end gets only low things (the angled view looks over it)
    const CELL = 8; // a tree at most every 8 m (near the board a real model of about 4000 triangles, further out an impostor)
    for (let gx = -hw - 50; gx < hw + 50; gx += CELL) for (let gz = -hd - 70; gz < hd + 40; gz += CELL) {
      const x = gx + rr() * CELL, z = gz + rr() * CELL, d = outside(x, z);
      if (d < 4) continue;
      if (PIT && steepAt(x, z) > 2.4) { if (rr() < 0.25) put(pickOf(L.rocks), x, z, 1.2 + rr() * 1.6); continue; } // the Hollow: nothing grows on the wall faces (a rock juts out now and then)
      const nearBoard = d < 16; // real models here: keep them fewer
      const behindMe = z > hd - 4 && Math.abs(x) < hw + 14;
      if (behindMe) { if (d < 22 && rr() < 0.35 * bi.grow) put(low(), x, z, 0.9 + rr() * 0.8); continue; }
      const p = Math.min(1, (d - 3) / 10) * (nearBoard ? 0.55 : 0.85) * bi.grow;
      if (rr() > p) { if (d < 16 && rr() < 0.6) put(low(), x, z, 0.9 + rr() * 0.9); continue; }
      if (!bi.trees.length || rr() < (bi.rockShare || 0.12)) { put(pickOf(L.rocks), x, z, 1.6 + rr() * 2.2); continue; } // a boulder now and then
      let tree = bi.trees[Math.floor(rr() * bi.trees.length)];
      if (nearBoard && /^Twisted/.test(tree)) tree = bi.trees[0]; // the big twisted trees (9000 triangles) only stand far out, as impostors
      put(tree, x, z, 1.6 + rr() * 0.9);
      if (nearBoard && rr() < 0.5) put(low(), x + (rr() - 0.5) * 4, z + (rr() - 0.5) * 4, 0.9 + rr() * 0.6); // undergrowth
    }
    // 2b. Darkwoods' giants (real models, casting their shadows over the board), with ferns and shelf fungus at their feet,
    // and an old path of stones from the board's far end to the gate
    for (const [x, z, name, s] of giants) {
      put(name, x, z, s, 0, true, true);
      for (let n = 0; n < 4; n++) { const a = rr() * Math.PI * 2, r = 2 + rr() * 2.5; put(rr() < 0.45 ? 'Mushroom_Laetiporus' : 'Fern_1', x + Math.cos(a) * r, z + Math.sin(a) * r, 1.2 + rr() * 0.8, 0, true); }
    }
    // 2c. Snow: the cliffs (real models, facing the board), seracs and crystals
    if (sum) {
      for (const [name, x, z, s, a] of sum.cliffs) put(name, x, z, s, 0, true, true, a);
      for (const q of sum.yeti) put('Boulder_S2', q.x, q.z, 2.2, 0, true, true, q.lean > 0 ? 0.4 : 2.6);
      for (const [name, x, z, s] of sum.ice) put(name, x, z, s, 0, true, true);
    }
    if (gate) for (let zz = -hd - 1.2; zz > gate.z + 3.5; zz -= 1.1 + rr() * 0.6) {
      if (rr() < 0.2) continue; // broken: a stone missing here and there
      const f = (zz + hd) / (gate.z + 3.5 + hd), x = gate.x * f + (rr() - 0.5) * 2.2;
      put(rr() < 0.5 ? 'Pebble_Square_2' : 'Pebble_Round_2', x, zz, 2 + rr() * 1.2, 0, true, true);
    }
    // 3. grass round the board's edge, out in the open land
    for (let n = 0; n < 220 * bi.grow; n++) {
      const x = (rr() * 2 - 1) * (hw + 24), z = (rr() * 2 - 1) * (hd + 24), d = outside(x, z);
      if (d > 0.3 && d < 14 && !(PIT && steepAt(x, z) > 2.4)) put(tuft(), x, z, 1.1 + rr() * 0.9);
    }
    // 4. on the board: a light dressing of small plants (not on walls or water), low enough to stay out of the way
    if (bi.dress) {
      const n = Math.round(Game.COLS * Game.ROWS * 1.2 * bi.dress);
      for (let i = 0; i < n; i++) {
        const x = (rr() - 0.5) * BW, z = (rr() - 0.5) * BD;
        const c = Math.floor((x + hw) / T), r = Math.floor((z + hd) / T);
        const col = hF === 1 ? c : Game.COLS - 1 - c, row = hF === 1 ? r : Game.ROWS - 1 - r;
        const tl = mp && mp.terrain ? Game.terrainTile(src, col, row) : null;
        if (tl && '#~s'.includes(tl.ch)) continue;
        put(pickOf(L.dress), x, z, 0.55 + rr() * 0.45, groundY(x, z));
      }
    }
    // 5. the oasis: water with a shallow rim and wet sand, reeds at the edge, palms round it
    for (const p of ponds) {
      [1.14, 1.04, 1].forEach((k, i) => { const m = new THREE.Mesh(pondGeo, pondMats[i]); m.scale.set(p.rx * k, 1, p.rz * k); m.position.set(p.x, 0.02 + i * 0.015, p.z); m.raycast = () => {}; m.name = 'pond'; scene.add(m); meshes.push(m); });
      const per = 2 * Math.PI * Math.sqrt((p.rx * p.rx + p.rz * p.rz) / 2);
      for (let s = 0; s < per; s += 1.4) { const a = s / per * Math.PI * 2 + rr() * 0.1, k = 0.96 + rr() * 0.12; put(rr() < 0.75 ? 'Grass_Common_Tall' : 'Grass_Wispy_Short', p.x + Math.cos(a) * p.rx * k, p.z + Math.sin(a) * p.rz * k, 1.2 + rr() * 0.9, 0, true); }
      for (let s = 0; s < per; s += 5.5) { const a = s / per * Math.PI * 2 + rr() * 0.3, k = 1.2 + rr() * 0.45; put(bi.trees[Math.floor(rr() * 4)], p.x + Math.cos(a) * p.rx * k, p.z + Math.sin(a) * p.rz * k, 1.5 + rr() * 0.9, 0, true); }
      for (let n = 0; n < 6; n++) { const a = rr() * Math.PI * 2, k = 1.15 + rr() * 0.3; put(pickOf(L.rocks), p.x + Math.cos(a) * p.rx * k, p.z + Math.sin(a) * p.rz * k, 0.8 + rr() * 1.4, 0, true); }
    }
    // 6. snow drifts round the board (Frozen Peak; deep snow has its own drifts in the sheet)
    if (bi.snow && !bi.deepSnow && !sum) {
      const dr = new THREE.InstancedMesh(driftGeo, driftMat, 120); let n = 0;
      for (let k = 0; k < 600 && n < 120; k++) {
        const x = (rr() * 2 - 1) * (hw + 45), z = -hd - 60 + rr() * (BD + 95), d = outside(x, z);
        if (d < 0.6 || d > 40 || rr() > 1.2 - d / 40) continue;
        if (cab && Math.hypot(x - cab.x, z - cab.z) < cab.r - 2) continue;
        const w = 2 + rr() * 4.5;
        dr.setMatrixAt(n++, tmpM.compose(tmpP.set(x, -0.1, z), tmpQ.setFromAxisAngle(upY, rr() * 6.3), tmpS.set(w * 1.4, 0.35 + rr() * 0.6, w * (0.35 + rr() * 0.35))));
      }
      dr.count = n; dr.instanceMatrix.needsUpdate = true; driftMat.color.set(bi.drift || '#B4C1CA'); dr.computeBoundingSphere(); dr.raycast = () => {}; dr.receiveShadow = true; dr.name = 'drifts';
      scene.add(dr); meshes.push(dr);
    }    // 7. the deep snow itself: a big rolling sheet over the land, whiter on the crests and bluer in the hollows
    if (bi.deepSnow || bi.craters) { // Ashlands: the same sheet, ash on the rises and char in the crater pits
      const g = new THREE.PlaneGeometry(BW + 260, BD + 260, 150, 170).rotateX(-Math.PI / 2), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
      const [loC, hiC] = bi.sheet || ['#93A7C4', '#D8E1EE'], hi = new THREE.Color(hiC), lo = new THREE.Color(loC), c = new THREE.Color();
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), z = pos.getZ(k), h = groundH(x, z);
        pos.setY(k, outside(x, z) > 0 ? h : -0.2);
        c.copy(lo).lerp(hi, bi.craters ? smoothstep(0.05, 0.9, h) * (0.75 + 0.25 * vnoise(x * 0.3, z * 0.3)) : Math.min(1, 0.35 + h / (1.4 * bi.deepSnow))); col.set([c.r, c.g, c.b], k * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
      const sheet = new THREE.Mesh(g, snowGroundMat); sheet.position.y = -0.03; sheet.receiveShadow = true; sheet.raycast = () => {}; sheet.name = 'deep snow';
      snowGroundMat.color.setRGB(...bi.tint);
      scene.add(sheet); meshes.push(sheet);
    }

    // 7b. the Hollow's pit: one faceted sheet of earth. Packed floor round the board, banded earth and rock up the
    // steep walls (strata), the forest floor on the rim; jittered off the grid outside the board so it doesn't read as a mesh
    if (PIT) {
      const g = new THREE.PlaneGeometry(BW + 300, BD + 300, 150, 170).rotateX(-Math.PI / 2), pos = g.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        let x = pos.getX(k), z = pos.getZ(k); if (outside(x, z) > 2) { x += hashf(x, z, 1) * 1.6; z += hashf(z, x, 2) * 1.6; }
        pos.setXYZ(k, x, outside(x, z) > 0 ? pitH(x, z) : -0.2, z);
      }
      g.computeVertexNormals();
      const nrm = g.attributes.normal, col = new Float32Array(pos.count * 3), c = new THREE.Color();
      const FLOOR = ['#4E4234', '#56493A', '#473C30'].map((h) => new THREE.Color(h)), EARTH = ['#5C4634', '#4A392B', '#67503B', '#3F3227', '#5A5450'].map((h) => new THREE.Color(h));
      const RIM = ['#363822', '#2F321E', '#3D3B25'].map((h) => new THREE.Color(h));
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k), ny = nrm.getY(k), n = vnoise(x * 0.12 + 3, z * 0.12 - 5);
        if (ny < 0.72) { const band = Math.floor(y / 2.3 + vnoise(x * 0.05, z * 0.05) * 1.5); c.copy(EARTH[(band % 5 + 5) % 5]).lerp(EARTH[(band + 2) % 5], n * 0.35); } // the wall face: strata
        else if (y > 9) c.copy(RIM[Math.floor(n * 2.99)]).lerp(EARTH[1], smoothstep(0.86, 0.72, ny)); // the rim's forest floor
        else c.copy(FLOOR[Math.floor(n * 2.99)]).lerp(EARTH[3], smoothstep(0.92, 0.72, ny) * 0.6);
        col.set([c.r, c.g, c.b], k * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const sheet = new THREE.Mesh(g, pitMat); sheet.position.y = -0.03; sheet.receiveShadow = true; sheet.raycast = () => {}; sheet.name = 'hollow pit';
      pitMat.color.setRGB(...bi.tint); scene.add(sheet); meshes.push(sheet);
    }
    showHollow(holo); hollowRound(src.round || 1); hollowLeft(v, hF);
    // 8. Savanna: the kopjes, termite mounds, the land's colours and the sea of grass
    for (const q of kopjes) {
      [[0, 0, 4.2, 0], [3.6, 1.4, 3.1, 0], [-3.3, 1.9, 2.7, 0], [1.4, -3.4, 2.4, 0], [5.6, -1.6, 1.8, 0], [-1.2, 0.6, 2.3, 2.9], [1.8, 0.2, 1.6, 4.6], [-5.2, -1.2, 1.4, 0]]
        .forEach(([lx, lz, sc, y], i) => put(['Boulder_2', 'Boulder_1', 'Boulder_3'][i % 3], q.x + lx * q.s, q.z + lz * q.s, sc * q.s, y * q.s, true, true));
      for (let n = 0; n < 7; n++) { const a = rr() * Math.PI * 2, d = q.r * (0.7 + rr() * 0.35); put(rr() < 0.5 ? 'Thorn_1' : 'Grass_Common_Tall', q.x + Math.cos(a) * d, q.z + Math.sin(a) * d, 1 + rr() * 0.6, 0, true); }
      if (q.tree) put('Acacia_A', q.x + q.r * 1.15, q.z + 2, 3.1, 0, true, true); // the lone giant acacia
    }
    for (let n = 0, tries = 0; n < (bi.termites || 0) && tries < 400; tries++) {
      const x = (rr() * 2 - 1) * (hw + 40), z = -hd - 45 + rr() * (BD + 55), d = outside(x, z);
      if (d < 2.5 || d > 42 || (z > hd - 4 && Math.abs(x) < hw + 10) || inPond(x, z, 1.3)) continue;
      put('Termite_' + (1 + Math.floor(rr() * 3)), x, z, 0.75 + rr() * 0.75, 0, false, d < 30); n++;
    }
    if (bi.ground) { // the land under the grass: straw and bare earth in broad patches
      const g = new THREE.PlaneGeometry(BW + 260, BD + 260, 110, 120).rotateX(-Math.PI / 2), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
      const lo = new THREE.Color(bi.ground[0]), hi = new THREE.Color(bi.ground[1]), c = new THREE.Color();
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), z = pos.getZ(k), n = 0.65 * vnoise(x * 0.045 + 7.1, z * 0.05 - 2.3) + 0.35 * vnoise(x * 0.16, z * 0.14 + 4.4);
        pos.setY(k, outside(x, z) > 0.5 ? 0 : -0.25);
        c.copy(lo).lerp(hi, smoothstep(0.32, 0.62, n)); col.set([c.r, c.g, c.b], k * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
      const sheet = new THREE.Mesh(g, groundMat); sheet.position.y = -0.03; sheet.receiveShadow = true; sheet.raycast = () => {}; sheet.name = 'savanna ground';
      scene.add(sheet); meshes.push(sheet);
    }
    grassMat.userData.on = !!bi.grassSea;
    if (bi.grassSea) {
      const N = Math.round(7000 * bi.grassSea), gm = new THREE.InstancedMesh(grassGeo, grassMat, N); let n = 0;
      for (let k = 0; k < N * 3 && n < N; k++) {
        const x = (rr() * 2 - 1) * (hw + 42), z = -hd - 58 + rr() * (BD + 88), d = outside(x, z);
        if (d < 0.25 || (d > 22 && rr() < 0.55) || inPond(x, z, 0.85)) continue;
        const mine = z > hd && Math.abs(x) < hw + 8 && d < 9; // short behind your end, so it never hides your own squads
        const s = (mine ? 0.55 : 0.95 + rr() * 0.6) * (d > 22 ? 1.5 : 1), sh = 0.86 + rr() * 0.22;
        gm.setMatrixAt(n, tmpM.compose(tmpP.set(x, 0, z), tmpQ.setFromAxisAngle(upY, rr() * 6.3), tmpS.set(s * 1.2, s * (0.85 + rr() * 0.4), s * 1.2)));
        gm.setColorAt(n++, tmpC.setRGB(sh * (1 + (rr() - 0.5) * 0.08), sh, sh * (0.92 + rr() * 0.12)));
      }
      gm.count = n; gm.instanceMatrix.needsUpdate = true; gm.instanceColor.needsUpdate = true; gm.computeBoundingSphere();
      gm.receiveShadow = true; gm.raycast = () => {}; gm.name = 'grass sea'; scene.add(gm); meshes.push(gm);
    }
    showVultures(bi.vultures || 0, (bi.light && bi.light.pos) || [-30, 60, 25]);
    // the perch: the real acacia nearest the board on the far half (easy to see from your end), else the giant one
    perch = [];
    if (bi.vultures) {
      let best = null;
      for (const [k, list] of placed) if (/^Acacia/.test(k) && !k.endsWith('~') && lib[k].top) for (const e of list) {
        const sc = (e[2] < hd * 0.2 ? 0 : 50) + outside(e[0], e[2]) + (e[4] > 2.6 ? 30 : 0); if (!best || sc < best.sc) best = { sc, k, e };
      }
      if (best) {
        const [x, y, z, ang, s, , sy] = best.e, t = lib[best.k].top, ys = s * (0.95 + (ang % 1) * 0.15) * sy, ca = Math.cos(ang), sa = Math.sin(ang);
        [[0, 0], [0.45, 0.3], [-0.4, 0.35], [0.3, -0.42], [-0.35, -0.4], [0.6, -0.05], [-0.6, 0.02], [0.05, 0.55]].forEach(([ox, oz], i) => {
          const lx = (t[0] + ox) * s, lz = (t[2] + oz) * s;
          perch.push([x + lx * ca + lz * sa, y + t[1] * ys + 0.3, z - lx * sa + lz * ca, ang + i * 2.1]); // (the body's middle, above the leaves)
        });
      }
    }
    // Darkwoods: banks of mist round the board (thinner deep in the dark), the spots the eyes open at (well out in the
    // dark, never behind your own end), the light shafts onto the clearing
    if (bi.mist || bi.eyes || bi.shafts) {
      const deepAt = (d) => bi.deep ? bi.deep[0] * smoothstep(bi.deep[1], bi.deep[2], d) : 0;
      const mist = [], spots = [], sh = [];
      for (let k = 0, n = 0; k < 800 && n < (bi.mist || 0); k++) {
        const sz = 9 + rr() * 11, x = (rr() * 2 - 1) * (hw + 42), z = -hd - 52 + rr() * (BD + 70), d = outside(x, z);
        if (d < sz * 0.55 || d > 36 || (z > hd && d < 14)) continue;
        mist.push([x, z, sz, (0.2 + rr() * 0.14) * (1 - 0.75 * deepAt(d))]); n++;
      }
      for (let k = 0; k < 500 && spots.length < 60; k++) {
        const x = (rr() * 2 - 1) * (hw + 40), z = -hd - 48 + rr() * (BD + 50), d = outside(x, z);
        if (d < 6 || d > 24 || (z > hd - 4 && Math.abs(x) < hw + 16) || inPond(x, z)) continue;
        spots.push([x, 1 + rr() * 2, z]);
      }
      for (let k = 0; k < (bi.shafts || 0); k++) sh.push([(rr() - 0.5) * BW * 0.8, (rr() - 0.5) * BD * 0.7, 4 + rr() * 4]);
      showWoods({ mist, eyes: spots, shafts: sh, sun: (bi.light && bi.light.pos) || [-30, 60, 25] });
    } else showWoods(null);
    yt.spots = sum ? sum.yeti : []; hd0 = hd; if (!sum) { yt.on = false; yetiG.visible = false; } // Snow's yeti
    ex.path = bi.explorer ? { hw, T: BW / Game.COLS } : null; if (!ex.path) { ex.on = false; explorer.visible = false; } // Forest Glade's explorer
    // far trees and bushes: impostors
    shadeU.uHalf.value.set(hw, hd); shadeU.uShade.value.set(...(bi.shade || [0, 1, 2])); veil.visible = !!bi.shade;
    shadeU.uNight.value.set(...(bi.night || [0, 0, 0, 0])); shadeU.uDeep.value.set(...(bi.deep || [0, 1, 2]));
    if (bi.fire) shadeU.uFire.value.set(...new THREE.Color(bi.fire[0]).toArray(), bi.fire[1]); else shadeU.uFire.value.set(0, 0, 0, 0); shadeU.uWarm.value.set(cab ? cab.x : 0, cab ? cab.z : 0, cab ? cab.r * 1.5 : 0);
    snowU.value = bi.snow || 0; showFall(bi.fall || (bi.snow ? 'snow' : null), bi.fall2); showCabin(cab);
    for (const p of props) if (!p.hang) p.y = (p.y || 0) + groundH(p.x, p.z) * (p.sink !== undefined ? 1 - p.sink * 0.5 : 0.85) - (p.sink || 0) * (p.s || 1) * 0.3;
    showProps(props);
    // Snow: the land sheet, the clouds and far peaks, plumes off the ridges, glints on the ice, the flags' cloth
    if (sum) {
      const X0 = -(hw + 64), X1 = hw + 64, Z1 = hd + 70, g = new THREE.PlaneGeometry(X1 - X0, Z1 - SZ0, 64, 90).rotateX(-Math.PI / 2).translate(0, 0, (SZ0 + Z1) / 2), pos = g.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        let x = pos.getX(k), z = pos.getZ(k); if (outside(x, z) > 1.5) { x += hashf(x, z, 1) * 1.8; z += hashf(z, x, 2) * 1.8; }
        pos.setXYZ(k, x, outside(x, z) > 0 ? sheetH(x, z) : -0.2, z);
      }
      const SN = [SNOWC, '#EAF0F7', '#F6F9FC'];
      const sheet = paint([[g, (ny, y, i) => ny < 0.7 ? ROCK[(i * 7 + (i >> 3)) % 4] : SN[(i * 5 + (i >> 2)) % 3]]]);
      // crags rising out of the clouds just past the drop (seen from the board's own views), then far peaks all round
      const pk = [[-hw * 0.55, -hd - 60, 16, 92, 1.3], [hw * 0.3, -hd - 85, 20, 102, 2.9], [hw * 1.0, -hd - 52, 14, 84, 4.4], [-hw * 1.25, -hd - 95, 18, 98, 0.6]];
      for (let i = 0, t = 0; pk.length < (bi.peaks || 0) && t < 400; t++) {
        const th = (rr() * 2 - 1) * 2.5, dist = 170 + rr() * 290, x = Math.sin(th) * dist, z = -Math.cos(th) * dist - 30;
        if (pk.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr * 1.1)) continue;
        pk.push([x, z, 38 + rr() * 50, 105 + rr() * 120, rr() * 6]); i++;
      }
      const pl = [];
      for (const [x, z, , h] of pk.slice(0, 2)) pl.push([x, h - 71, z, 26, 9]);
      for (const [name, x, z, s] of sum.cliffs) if (s > 1.9 && pl.length < 5) pl.push([x, groundH(x, z) + lib[name].h * s * 0.95, z, 16 + rr() * 8, 5 + rr() * 2]);
      for (const sd of [-1, 1]) for (const z of [-hd * 0.8, -hd * 0.1, hd * 0.6]) { let bx = hw + 30, bh = -1; for (let X = hw + 14; X < hw + 64; X += 2) { const h = sheetH(sd * X, z); if (h > bh) { bh = h; bx = X; } } pl.push([sd * bx, bh + 1, z, 30 + rr() * 15, 10 + rr() * 4]); } // the shoulders' ridges
      for (const [x, z, , h] of [...pk.slice(4)].sort((a, b) => b[3] - a[3]).slice(0, 3)) pl.push([x, h - 72, z, 70 + rr() * 30, 26 + rr() * 10]);
      const band = (Game.ROWS / 2 - Game.ZONE) * T, gl = [];
      for (let i = 0; i < (bi.glints || 0); i++) { const x = (rr() * 2 - 1) * hw * 0.97, z = (rr() * 2 - 1) * band * 0.95; gl.push([x, groundY(x, z) + 0.08, z]); }
      showSummit({ sheet, peaks: pk, plumes: pl, glints: gl, flags: sum.flags.map(([p, hex, sd]) => [p.x, p.y + 4.45 * p.s, p.z, hex, sd]), clouds: bi.clouds || -24, sky: bi.sky });
    } else showSummit(null);
    horizon.visible = !!bi.horizon;
    if (bi.horizon) { horizonMat.color.set(bi.horizon); horizon.position.set(0, 22, -hd - 120); }
    curBi = bi; half = { hw, hd }; if (!bi.dragonShadow) { fly = null; dragonShadow.visible = false; }
    applyWind(bi, wk);
    showSmokes(craters.slice(0, bi.smokes || 0).map((c) => ({ x: c.x, y: groundH(c.x, c.z) + 0.5, z: c.z, s: c.r * 0.25 })));
    bake([...new Set([...placed.keys()].filter((k) => k.endsWith('~')).map((k) => k.slice(0, -1)).filter(impostorable))].sort());
    const far = [];
    for (const [k, list] of [...placed]) {
      const name = k.replace('~', '');
      if (!k.endsWith('~') || !impIndex || !impIndex[name]) continue;
      const fl = bi.farLight || 1;
      for (const [x, y, z, ang, s, col, sy] of list) far.push([name, x, y, z, s, col.map((c) => c * fl), ang < Math.PI ? 1 : -1, sy]);
      placed.delete(k);
    }
    impostors(far);
    // the rest: one mesh per model part, holding every placement of that model
    for (const [k, list] of placed) {
      const md = lib[k.replace('~', '')], tall = md.h * Math.max(...list.map((e) => e[4])) > 3 && !k.endsWith('~'); // (big boulders scaled up cast shadows too)
      for (const part of md.parts) {
        const im = new THREE.InstancedMesh(part.geo, part.mat, list.length);
        list.forEach(([x, y, z, ang, s, col, sy], i) => {
          tmpP.set(x, y, z); tmpQ.setFromAxisAngle(upY, ang); tmpS.set(s, s * (0.95 + (ang % 1) * 0.15) * sy, s);
          im.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
          im.setColorAt(i, tmpC.setRGB(col[0], col[1], col[2]));
        });
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.castShadow = castShadows && tall; im.receiveShadow = false;
        im.computeBoundingSphere(); im.raycast = () => {}; // scenery never takes a touch
        im.name = k; scene.add(im); meshes.push(im);
      }
    }
  }
  function shadows(on) { if (on !== castShadows) { castShadows = on; key = ''; } }
  function dispose() { clear(); clearWoods(); clearHollow(); scene.remove(hollow); for (const m of [barkMat, pitMat, strandMat, beamMat, ...webMats]) m.dispose(); orbTex.dispose(); tangleTex.dispose(); showSummit(null); scene.remove(summit, yetiG); yetiG.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); for (const m of ytMats) m.dispose(); cloudSea.geometry.dispose(); cloudMat.dispose(); cloudTex.dispose(); peakMat.dispose(); plumeMat.dispose(); glintMat.dispose(); flagMat.dispose(); summitMat.dispose(); scene.remove(woods, explorer); explorer.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.isSprite) { o.material.map.dispose(); o.material.dispose(); } }); for (const m of exMats) m.dispose(); eyeMat.dispose(); shaftMat.dispose(); shaftGeo.dispose(); mistTex.dispose(); shaftTex.dispose(); for (const m of Object.values(glowMats)) m.dispose();
    scene.remove(flakes, flakes2, cabin, cabinLight, veil, xmas, horizon, dragonShadow, smokeCols, vultures); dragonTex.dispose(); dragonShadow.geometry.dispose(); smokeCols.children.forEach((o) => o.material.dispose()); grassGeo.dispose(); grassMat.dispose(); groundMat.dispose(); vultureMat.dispose(); vultures.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); flake2Mat.dispose(); sootMat.dispose(); emberGlowMat.dispose(); horizonMat.dispose(); horizonTex.dispose(); horizon.geometry.dispose(); dragonMat.dispose(); for (const g of Object.values(kkCache)) if (g) g.dispose(); propMat.dispose(); lampGlowMat.dispose(); lampGlowTex.dispose(); veil.geometry.dispose(); veilMat.dispose(); snowGroundMat.dispose(); cabin.userData.dispose(); cabinLight.dispose(); flakeGeo.dispose(); flakeMat.dispose(); driftGeo.dispose(); driftMat.dispose(); pondGeo.dispose(); for (const m of pondMats) m.dispose(); if (atlas) atlas.dispose(); if (impMat) { impMat.dispose(); impGeo.dispose(); blobMat.map.dispose(); blobMat.dispose(); blobGeo.dispose(); } for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); } if (lib) for (const md of Object.values(lib)) for (const p of md.parts) p.geo.dispose(); }
  return { _lib: () => lib, _meshes: () => meshes, _yeti: () => yt.P.root && { on: yt.on, s: yt.s, vis: yetiG.visible, at: yt.at, pos: yt.P.root.position.toArray() }, /* (tests) */ _hollow: () => hol && { lings: hol.lings.map((q) => [q.p, q.to, q.m.visible, q.m.position.toArray().map(Math.round)]), left: leftGroup.children.map((o) => o.count), kids: hollow.children.length, key: leftKey }, update, biome, shadows, dispose, ready, tick, alive, prey, roost, birds, flyover, foeReady, explore, anchor, whip, bossState, snowing: () => flakes.visible, count: () => meshes.reduce((s, m) => s + m.count, 0) };
};

// The painted floors and the looks live in src/floors.js (loaded with the main page, before this file)
Scenery3D.FLOORS = Floors.FLOORS;
Scenery3D.LOOKS = Floors.LOOKS;
Scenery3D.MAP_LOOK = Game.MAP_LOOK; // each map's own look (in game.js, so the page's music can follow it without the 3D code)
Scenery3D.lookOf = Floors.lookOf;
Scenery3D.floor = Floors.floor;

