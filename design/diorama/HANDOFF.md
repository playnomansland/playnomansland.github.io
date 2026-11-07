# Handoff: the Diorama UI, next up the PLAY screen

A redesign of the game's UI, worked out as a standalone mockup in this folder. Nothing in the game itself (`src/`) has
changed yet. The main menu is done for now; **the next screen to work on is PLAY**, the saffron "new match" screen you
get by clicking PLAY.

## What is here

| Path | What it is |
|---|---|
| `diorama-menu.html` | The built mockup: one self-contained page (three.js, the game's models, the roster, the font and the title art are inlined). Open it in a browser with WebGL. |
| `diorama-language.html` | The design language document (research, principles, kit, screens). It predates the latest menu changes; this file is the newer summary. |
| `src/menu.html` | The mockup's source: markup, CSS on top of `src/base.css`, and the 3D scene as an inline module. `{{NAME}}` placeholders are filled by the build. |
| `src/base.css` | The base styles the page builds on. |
| `build.js` | `node design/diorama/build.js` writes `diorama-menu.html` from `src/menu.html` plus `vendor/three*.js`, `src/kaykit3d.js`, `src/models3d.js`, `src/default-roster.json`, `img/title.png` and `fonts/`. |
| `shots.js` | Screenshots of the built page in given states, into `screens/` (see the comment at its top for the states). Needs Playwright with Chromium; without a GPU it renders through SwiftShader, about 20 to 40 s a shot. |
| `fonts/` | Chakra Petch Bold (OFL, licence included). |
| `screens/` | Screenshots of the current state, including `play-current.jpg`. |

Screenshot states (address hash): `#still` (no idle motion), `#play`, `#music`, `#view=puzzles|rules|units|ranks`,
`#pin`, `#tier=1..4`, `#unit=N`, `#hover=keepYou|keepFoe|vaultYou|vaultFoe|mammoth|u:N`; on Play, `#multi` (Multiplayer
folded out), `#rooms=standard|ranked` (Rooms, filtered), `#filter` (the filter's list open) and
`#on=vs-ai|multi|standard|ranked|r0..` (look as if pointed at, a room row by index). For example:

```bash
node design/diorama/build.js
```

```bash
node design/diorama/shots.js '[["play","#still,play",1440,900]]'
```

## The design language: "Diorama"

- **The menu is the battlefield.** A live, floating low-poly island built as the real Standard map, 14 by 18 tiles:
  zones of 7 rows, 4 rows of no man's land, your keep on col 8, row 16, theirs mirrored to col 5, row 1, each treasury
  one tile diagonally in front of its keep (`Game` `TOWER_SPOT` / `treasurySpot`). Pieces are the game's own
  `Models3D` (with KayKit's chest and torches). Each screen has a camera view; pieces sink into the board and other
  things rise (the Rankings podium, the Units roster).
- **One field colour per screen**, flat, with paper grain. No gloss, glass, blur or glow. Ultramarine `#2E3E9C` is the
  menu, saffron `#F2B23A` is Play. Ink `#17140F`, cream `#F4ECD8`.
- **Type.** Chakra Petch Bold, uppercase, for what you press and for titles (it is already the game's display face).
  Bricolage Grotesque for names and labels. Courier Prime for notes, stats and the voice.
- **The shard.** A hand-cut polygon of 4 to 6 corners behind whatever has focus. Never a rectangle. Saffron on dark
  fields, ink on saffron.
- **Notes.** A dot and ring on the thing, a thin line, and a typed label: `Name.` and then a small
  `Kind · fact · fact`. Minimal text. Labels find open space on screen (the menu words' notes run a rail up the left
  margin or out to the right of PLAY, so no line crosses another word).
- **No boxes**, except where text has to sit over the busy board: the unit sheet is an ink panel with a cut corner.
- **Voice.** Deadpan: plain words first, a dry joke at most ("it never gets tired").
- **Music.** The player sits bottom right; the playlist is a minimal list that grows up out of it, same type, no panel.

## The main menu (done for now)

PLAY with "Assemble your army. Master your strategy. Defeat your opponent." beside it; Puzzles, How to play, Units,
Rankings in a 2 by 2 grid. Hovering a word moves the camera and shows its note. Notes on the island: the golem
reward ("This golem skin is yours."), the Sniper and the Fire Mage; pointing at a keep, a treasury or the mammoth
lifts it and shows its note. Units: tier tabs above the island, a row of units on named tiles, click one for its
sheet (stats from the roster). Rankings: the board clears, five random tier 4 units on a numbered podium, names and
scores printed on the tiles (sample data), the STANDINGS header top left.

## The PLAY screen as it is now (`#play`, see `screens/play*.jpg` and `screens/rooms-*.jpg`)

- The field turns saffron and the camera rises to the plan view, straight down on the island (right side).
- Left: two choices with typed asides, no kicker: VS COMPUTER "it never gets tired" and MULTIPLAYER ⌄ "friendships
  may be tested". The ink shard shows on hover only; one click does the thing (no Deploy button, no option rows).
  VS COMPUTER would start a match against the AI straight away (a no-op in the mockup).
- MULTIPLAYER folds out its kinds below it on an ink rail with a tick to each (no panel): 1v1 STANDARD "no stakes",
  1v1 RANKED "it goes on your record", 2v2 dimmed with a lock and "coming soon" (not clickable).
- A kind opens **Rooms** in the same place: the kicker `Multiplayer · rooms`, ROOMS with "n open · n playing", a search
  line (magnifier, the filter as an ink token set to the kind you picked, ⌄ to switch it, then free text for a player
  or room code), one CREATE ROOM + button, then the list: "Host's room", ★ score for ranked, a NO WATCHERS tag,
  `map · players · age or round · watching`, and JOIN / WATCH / full on the right (the ink shard on hover). Sample data,
  shaped like the game's lobby (`roomCard()` in `src/site-template.html`). "← Menu" becomes "← Play" here; Escape too.
- The music player bottom right, as before.

What the real game's Play popup has (`playPop()` in `src/site-template.html`, around line 3821): vs Friend; vs AI
(disabled in ranked); Online · Rooms (when the server is up); Normal / Ranked; the pack, map and leader pickers
(`packSeg`, `mapSeg`, `charSeg`; `lookSeg` instead in ranked); the deploy timer vs AI (On / Off); the ranked note.

## Next tasks

1. Done: the PLAY screen reworked as above (owner's list of 2026-11-07). Waiting on the owner's feedback.
