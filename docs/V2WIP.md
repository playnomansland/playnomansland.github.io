# V2WIP: a roster in the works (developer mode)

Added 2026-11-13. A developer mode for trying roster changes while the live roster stays as it is. Developer menu →
**V2WIP** (Diorama: the Developer row; classic menu: "V2WIP vs AI"). Against the AI on this device only.

## What is in it

- The standard roster **without Slime Wizard and Slimeshots**, **without the Slime tower**, and without Mubarak (the
  Slime Lord: no slime units left to lead).
- Two new units: **Warper** (tier 2) and **Catcher** (tier 3), with the skills **Netcaster** and **Gutter**.

## Files

| File | What |
|---|---|
| `src/v2wip.json` | The mode's data: `remove` (unit names), `offTowers`, `offChars`, its own `units` and `skills`. Edit this. |
| `src/v2wip-units.json` | Built by `node tools/counter-table.js`: the whole V2WIP roster with its counter table. The page reads this (`/*V2WIP*/` in `src/build.js`). |
| `src/engine.js` | `u.hook`, `b.hookDir`, `b.warp`, `u.warper` (see the comment block above `HOOK_WAIT`); skill types `netcaster`, `gutter`. Nothing happens unless a unit or body has these fields: the standard and Factions counter tables came out identical before and after. |
| `src/game.js` | The section "V2WIP": `setWarp` / `clearWarp` / `warpedBy`, `setHook` / `clearHook` / `hookRange`, `aiOrders`; `bodiesFor` puts `b.warp` and `b.hookDir` on the bodies; `seenBy` hides both from the opponent; `createMatch` opts `v2`. |
| `src/site-template.html` | `V2DATA`, `useV2Set`, `matchKind 'v2wip'` in `startAiMatch`, `orderMode` (the next board tap sets a tile or an arrow), the squad sheet's buttons, the fight effects (`warp`, `hookhit`). |
| `src/render2d.js`, `src/render3d.js` | `ordersFloor` (the tile, the tile across, the hook chain: on the floor, so both boards get them), the root ring, the chain in the fight. |
| `src/site-template.html` `warpFx` | The motes over the teleport tiles while deploying (layer `#warpfx`, its own frame loop; still motes with reduced motion). |
| `tools/tests/v2wip.js`, `tools/tests/v2wip-ui.js` | Headless rules and fights; the browser flow on the 2D and 3D board. |

After changing `src/v2wip.json`: `node tools/counter-table.js` (only the changed unit's row is fought again), then
`node src/build.js`.

## Warper (tier 2, 200 gold, unlock 50)

1 body, 900 health, hit 60, 0.9 attacks/s, range 20, speed 3, projectile 30 m/s. No skills yet.
Counter table average **-15** (tier 2 units run from -79 to +57): a little under average on stats, as asked.

**Teleport (Control).** From the squad's sheet: Set teleport tile, then tap a tile in your zone.
- When the fight starts, the enemy squad on the tile **straight across the board** (the same column, the row
  mirrored) is rooted: it can't walk, it can still attack what is in its range.
- 1.5 s later (`Game.WARP.secs`) its bodies are moved onto your tile, keeping their places in the formation.
- Any squad, giants too. Not buildings or towers.
- If every Warper of that squad has fallen before the 1.5 s are up, the squad is let go where it stands.
- One Warper squad takes one enemy squad; two Warpers on the same tile don't add anything.
- The tile is kept from round to round until cleared, and stays put when the Warper moves.
- Hidden from the opponent while deploying.

## Catcher (tier 3, 300 gold, unlock 100)

1 body, 2000 health, hit 300, 0.4 attacks/s (one strike every 2.5 s), range 2, speed 2, no armor.
Counter table average **+20**: beats single big units, loses to swarms.

**Hook (Control).** `hook: { range: 42, hit: 100, speed: 20, cd: 8, max: 1, net: 0, reel: 30 }`
- The hook flies in a straight line, 20 m/s, at most 42 m (7 tiles; 30 m until 2026-11-14). The first enemy body it
  touches takes 100 (armor counts) and is reeled in at 30 m/s until it stands in the Catcher's reach. On the hook it
  can't walk or attack.
- Its catch box is a tile wide (`HOOK_HIT`: 3 m either side of the hook on both axes; 1 m around it until
  2026-11-14): an enemy that shares a tile with the hook as it flies is caught, it can't slip past beside it. The
  arrow's line counts an enemy as on it within the same 3 m.
- The Catcher holds still while its hook is out. It still strikes what is in its reach.
- A body that can't be displaced (unstoppable, anchored, a structure) takes the hit and stays.
- **The hook arrow** (from the sheet: Set hook direction, then tap a tile; only the direction counts): the first
  throw is kept for that line. The Catcher throws as soon as an enemy stands on it within range. If an enemy has been
  within range for 2 s (`HOOK_WAIT`) and nobody stepped onto the line, it gives the arrow up.
- Then, every 8 s: at the nearest enemy within range that is not in its reach already.

Either-or skills (150 gold each):
- **Netcaster:** the hook pulls up to 4 bodies (those nearest the first, within 4 m of it; each takes the 100), and
  the Catcher's strikes splash 3 m.
- **Gutter:** hook range 50 m, hook speed 30 m/s, and the Catcher's strikes add 2 bleed (the hook's own hit doesn't).

## Decisions taken while building (say if any should change)

- "Mirrored" is read as straight across: the same column. Not rotated through the middle of the board.
- Rooted means can't walk; it still shoots. (On a hook a body can't do either.)
- The first hook throw waits for an enemy on the arrow's line, instead of going out at second 0: at the start of a
  fight nearly everything is further than 30 m away, so a throw at once would almost always miss.
- The Catcher never throws by itself at something it can't reel in.
- Mubarak is out of V2WIP along with the slime units.

## Not done yet

- **Friends and the server.** The referee and the game server don't know `setWarp` / `setHook`, and the server
  doesn't have the V2WIP roster. Playing V2WIP against a friend needs referee actions, `Referee.hide` for both
  fields, the roster on the server, and a server deploy.
- The AI doesn't set hook arrows (its Catchers pick for themselves) and doesn't play around your Warper.
- No sounds, no models or pictures of their own (Warper: the caster model and a star; Catcher: the brute model and a
  cross), no keyword symbols on the cards (Teleport and Pull are in the keyword registry on `design/keywords`).
- Balance Lab doesn't run on this roster.
- Not tried on an iPhone. The 3D board was only checked in a slow software renderer.
