# Leader heads – handoff to Claude Code (2026-11-07)

Read this first. It is everything from the claude.ai session that started the leader heads, so you can continue
without that conversation. The Project doc "claude/leader-heads.md" in the Phone Bellum project says the same in
short form.

## The task

Every leader gets a small 3D head (no body): a symbol for the menus and the battle UI, not a model on the
battlefield. For now the deliverable is rendered images that Vilhelm judges; a live, turnable 3D view and wiring
the heads into the game come only after the looks are agreed.

Vilhelm makes a reference sheet per leader (a hero render, a turnaround, idle expressions, a silhouette, a 64 px
icon and a palette). The job is to turn each sheet into a head that delivers the same character and feeling.

**Use the image-to-three.js skill Vilhelm installed in Claude Code** (he asked for it as "/img2threejs" in the
claude.ai chat, where it wasn't available) to convert the reference sheets. Everything below is context for
using it well.

## Status

| Leader | State | Files |
|---|---|---|
| Emile, the Recruiter | DONE, approved by Vilhelm | `emile.js` (EmileHead, 2,892 tris, flat-shaded), reference `refs/emile-reference.png`, render `renders/emile-v1-sheet.png` |
| Zoe, the Overseer | NOT approved. Redo from the reference with the skill. | `zoe.js` (ZoeHead, v5, the best hand-built attempt, 4,276 tris), `zoe-v6.js` (ZoeHeadV6, rejected), reference `refs/zoe-reference.png`, renders `renders/zoe-v5-*.png`, `renders/zoe-v6-vs-reference.png` |
| Cage, Wilhelm, Phil, Felix | Next (the Standard pack leaders), each from a sheet Vilhelm will make | – |
| Noah, Yot-Yot, Mubarak, Enzo, Matteo, Otto | Later | – |
| Blixten | On hold (being reworked; already removed from every leader pool, `Game.RETIRED_CHARS`) | – |

Other files here: `emile-v2.js` (a refined Emile that Vilhelm liked less than v1), `leader-heads.js` + `preview.html`
(the very first sketches of Cage, Zoe and Emile; superseded, Cage's sketch is only a placeholder).

## Why Zoe failed when hand-built (read before converting)

Zoe went through six hand-built versions. Vilhelm's verdicts: v1 "sucks", v2 "eyes not matched", v4/v5 closer
but "still not delivering the same feeling of judgement and dissatisfaction", v6 "worse".

- The models are built from primitives (spheres, tubes, extruded slabs) glued onto a lathe head. That suits a
  chunky, separate-shapes character like Emile, but Zoe's attitude lives in a continuous, sculpted surface:
  heavy fleshy lids, brows that push the skin, cheeks around the pout. Primitive stacks look like parts stuck on a
  ball. This is the reason to use the skill (or a sculpt in Blender) instead.
- Self-judging from small renders misled every round. Show Vilhelm side-by-side comparisons at matching angles
  and let him judge; don't declare success.
- What does matter, learned along the way: the overall silhouette (Zoe is a gumdrop: a broad dome, sloping out to
  the cheeks, which rest on a low flared cape collar), feature SIZE (her eyes are about 40% of the head width each,
  with a big pout), and the emotion carried by angles and asymmetry (heavy lids, the lid line, brow shapes, where the
  pupils sit, a pout pushed to one side). Each reference sheet has its own shading: Emile's is faceted, Zoe's soft.

## Constraints

- Triangle budget: about 3,000 a head. Don't sacrifice important shapes for it; a bit over is accepted.
- No textures, so far: colour comes from vertex colours (the game's models all work that way). If the skill's
  output needs a texture, that's a decision for Vilhelm; ask him.
- Neck/collar: follow each reference sheet (Emile has none, Zoe has a collar).
- Orientation and scale: y up, the face toward -z, a head about 3 units tall centred near the origin (see the
  existing files).
- Colours: the sheet's palette; pastel, with the leader's crest colour as the one saturated accent.
- Push everything to main. After the session, update PATCH-NOTES.md (the "Leader heads" entry) and this file.

## The model format (what the existing heads use)

A head file defines one global builder, `const XHead = (THREE) => ({ KEYS, geometry(), tris() })`, and ends with
`module.exports = XHead` for node. `geometry()` returns one BufferGeometry with `position`, `normal` and `color`
attributes. Parts are made with `P(geometry, colour, [x,y,z], [rx,ry,rz], [sx,sy,sz])` (the part style of
`src/models3d.js`), then merged; parts marked smooth keep soft normals, the rest are faceted. If the skill produces
a different format (a glTF, a different builder), keep its output in this folder and make `sheet.html` able to show
it, so the render and compare tools still work.

## Tools

- `sheet.html` (open from a server at the repo root): `?src=zoe.js&fn=ZoeHead&back=1&dist=16&look=0.2`. Options:
  `flat` (faceted shading for the whole model, Emile), `only=Front` (one view), `yaw=` (radians; 0 = front, +0.5
  turns the face to the viewer's right), `dist` / `look` (camera distance and target height), `size`.
- `node tools/heads-render.js` (serves the repo itself; needs playwright-core, `PB_CHROME=<chrome path>` like the
  tests):
  - contact sheet: `node tools/heads-render.js --src zoe.js --fn ZoeHead --out zoe-sheet.png --back --dist 16 --look 0.2`
    (Emile: `--src emile.js --fn EmileHead --flat --dist 11 --look -0.15`)
  - side by side with the reference: `node tools/heads-render.js --src zoe.js --fn ZoeHead --out cmp.png --only Front --yaw 0.5 --dist 12 --look 0.3 --ref models/heads/refs/zoe-reference.png --crop 250,0,590,720`
    Crops of the Zoe sheet (1536 x 1024): hero 3/4 `250,0,590,720`; front turnaround `835,60,160,175` (use `--yaw 0`).
    Emile's sheet has the same layout.

## Suggested order

1. Zoe with the skill, from `refs/zoe-reference.png`. Compare at the front and 3/4 angles with
   `tools/heads-render.js` and show Vilhelm the side-by-sides plus a contact sheet.
2. Once Vilhelm approves Zoe, the same pipeline for Cage, Wilhelm, Phil and Felix as he sends their sheets.
3. Later: shared idle animations (parts tagged brow / lid / jaw / prop, the expressions on each sheet), a live 3D
   view, then putting the heads into the UI.
