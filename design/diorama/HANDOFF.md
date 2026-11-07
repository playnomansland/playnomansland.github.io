# Handoff: the Diorama UI, next up the PROFILE screen

A redesign of the game's UI, worked out as a standalone mockup in this folder. Nothing in the game itself (`src/`) has
changed. Done so far: the main menu, the PLAY screen (with Rooms and New room), the playlist, and battlefields (the
island takes the look you pick). **Next: the Profile screen** (see the last section). Work happens on the branch
`claude/wonderful-carson-fdud2o`, which started from `design/diorama`.

## What is here

| Path | What it is |
|---|---|
| `diorama-menu.html` | The built mockup: one self-contained page (three.js, the game's models, KayKit models, floors, the roster, the font and the title art inlined). Open it in a browser with WebGL. |
| `src/menu.html` | The source: markup, CSS on top of `src/base.css`, and the 3D scene as an inline module. `{{NAME}}` placeholders are filled by the build. |
| `src/base.css` | Base styles: the field, menu words, notes, music, and the PLAY / Rooms / New room screens. |
| `build.js` | `node design/diorama/build.js` writes `diorama-menu.html`. Inlines `vendor/three*.js`, `src/kaykit3d.js`, `src/models3d.js`, `src/default-roster.json`, `src/floors.js`, `paintIce` lifted out of `src/render2d.js`, `img/title.png`, `fonts/`. |
| `shots.js` | Screenshots of the built page in given states into `screens/` (PNG). Needs Playwright with Chromium; without a GPU it renders through SwiftShader, about 25 s a shot. Convert to JPG to keep (PIL is there). |
| `diorama-language.html` | The original design language document. Older than everything below; this file is the current summary. |
| `screens/` | Screenshots of the current state (listed below). |

```bash
node design/diorama/build.js
```

```bash
node design/diorama/shots.js '[["play","#still,play",1440,900]]'
```

### Screenshot states (the address hash, combine with commas)

- `#still`: no idle motion (always use it for shots).
- Menu: `#view=puzzles|rules|units|ranks` (as if that word were hovered), `#pin`, `#tier=1..4`, `#unit=N`,
  `#hover=keepYou|keepFoe|vaultYou|vaultFoe|mammoth|u:N`, `#music` (playlist open), `#plh=N` (playlist song N pointed at).
- Play: `#play`, `#multi` (Multiplayer folded out), `#rooms=standard|ranked` (Rooms, filtered), `#filter` (the filter's
  list open), `#create` (New room, with `#rooms=`), `#private`, `#on=vs-ai|multi|standard|ranked|r0..` (as if pointed at).
- Battlefields: `#bf=meadow|autumn|snow|frost|desert|ash|moonlit|savanna` (home), `#roombf=<same>` (New room's).

## The design language: "Diorama"

- **The menu is the battlefield.** A floating low-poly island built as the real Standard map, 14 by 18 tiles: your keep
  col 8 row 16, theirs col 5 row 1, treasuries diagonally in front. Pieces are the game's own `Models3D`. Each screen
  has a camera view; pieces sink into the board and other things rise (the Rankings podium, the Units roster).
- **One field colour per screen**, flat, with paper grain. No gloss, glass, blur or glow. Ultramarine `#2E3E9C` is the
  menu, saffron `#F2B23A` is Play. Ink `#17140F`, cream `#F4ECD8`.
- **Type.** Chakra Petch Bold, uppercase, for what you press and for titles. Bricolage Grotesque for names and labels.
  Courier Prime for notes, stats and the voice.
- **The shard.** A hand-cut polygon of 4 to 6 corners behind whatever has focus or is picked. Never a rectangle.
  Saffron on dark fields, ink on saffron.
- **Notes.** A dot and ring on the thing, a thin line, a typed label: `Name.` then a small `Kind · fact · fact`.
  Labels find open space; no line crosses a word.
- **No boxes**, except where text sits over the busy board: the unit sheet (ink panel, cut corner), the Rooms filter
  list, and the soft dark box behind a pointed-at playlist song.
- **Voice.** Deadpan: plain words first, a dry joke at most ("it never gets tired", "friendships may be tested").
- **Rows of words for settings** (New room): a typed label on the left, big words on the right, the picked one on an
  ink shard, a typed note under the row that changes with the pick.

## What's done

**Main menu.** PLAY with "Assemble your army. Master your strategy. Defeat your opponent."; Puzzles, How to play,
Units, Rankings in a 2 by 2 grid. Hovering a word moves the camera and shows its note. Island notes: the golem reward,
the Sniper, the Fire Mage; pointing at a keep, treasury or the mammoth lifts it with its note. Units: tier tabs, a row of
units, click for its sheet. Rankings: a podium of five tier 4 units, the STANDINGS header (sample data). Top right:
Friends, Guest (the Profile button; nothing behind it yet), Settings. (`screens/menu.jpg`, `rankings.jpg`, `units-*.jpg`)

**PLAY** (saffron, plan view of the island). VS COMPUTER "it never gets tired" and MULTIPLAYER ⌄ "friendships may be
tested"; one click does it (no Deploy, no option rows). Multiplayer folds out on an ink rail: 1v1 STANDARD "no stakes",
1v1 RANKED "it goes on your record", 2v2 locked "coming soon". (`play*.jpg`)

**Rooms** (a kind from Multiplayer). ROOMS with "n open · n playing", a search line with the kind as an ink filter
token (⌄ to switch), one CREATE ROOM + button, the list: host's room, ★ score for ranked, NO WATCHERS tag,
`battlefield · players · age or round · watching`, JOIN / WATCH / full. "← Play". (`rooms-*.jpg`)

**New room** (Create room). Kind (starts on the list's filter; 2v2 locked), Battlefield (‹ name ›), Who can find it
(Public / Private), Spectators (On / Off), then CREATE ROOM →. From the game's create sheet (`openCreateSheet()` in
`src/site-template.html`). "← Rooms". (`create-room*.jpg`, `battlefield-create.jpg`)

**Playlist.** A minimal list that grows up out of the player bottom right, same type, no panel; the pointed-at song gets
a soft dark cut-corner box with cream type so it reads over the board. (`playlist-open.jpg`, `music-*-hover.jpg`)

**Battlefields.** The only map is Standard (1v1); a battlefield is one of the game's live looks (`Game.SKINS`):
Meadow, Autumn, Snow, Forest Glade, Desert, Ashlands, Moonlit Snow, Savanna.
- The island's top is that look's real painted ground (`Floors.floor`; Snow: `paintIce`), no tile grid; the slab edge
  and soil take the look's colours.
- 10 toy miniatures per look in the same slots (`SLOTS`, `KITS` in `src/menu.html`): 1 centrepiece, 6 trees, 3 accents,
  from the look's signature assets; the game's KayKit models where they exist (arch gate and shrine, ruined walls,
  broken sword and shield, snowman, acacias). Meadow: oak, leafy trees, flower bushes · Autumn: red maple, gold birches,
  leaf piles · Snow: snowy rocks, snowy pines, snow piles · Forest Glade: gate and shrine, twisted trees, mushrooms ·
  Desert: oasis, palms, sandstone · Ashlands: burnt ruin, charred trees, broken swords · Moonlit Snow: lit cabin, blue
  pines, snowmen · Savanna: granite kopje, acacias, termite mounds.
- **Change battlefield.** A note on the island (right corner on the menu, below the near edge on the saffron screens)
  steps through the eight: the island dips, the miniatures pop up. At home it is cosmetic, kept on this device. On New
  room it steps the room's battlefield, which is what the match is played on; your own comes back when you leave.
- Snow's real ground is dark ice (the white on the real board is snow on the scenery round it), so the island is dark
  with a white rim and snowy miniatures. (`battlefields.jpg`, `battlefield-*.jpg`)

## Open threads (raised, not done)

- With the playlist open on the saffron screens, the list sits over the board; only the hovered song has a box. Ideas:
  move the island aside while it's open; an ink shard on the playing track (the saffron accent turns ink on saffron).
- Hovering a room in Rooms could preview its battlefield on the island.
- Ashlands' dragon / Savanna's vultures circling the island (would break "same number of miniatures" unless every
  battlefield gets a flying piece).
- Vs computer and Create room → do nothing in the mockup (in the game: start the match / open the room).

## Next: the Profile screen

Not started. Ask the owner what they have in mind before building; they usually give a list. Opened from the account
button top right (`Guest` in the mockup; the player's name once they have one).

What the game's Profile has today (`openAccountSheet()` / `acctDraw()` in `src/site-template.html`, around line 4827;
the account code from about line 4630):
- **Account state.** Signed in with Google, or a guest on this phone (sign in with Google to keep it), or no account yet
  (Play as a guest / sign in). Developer accounts get a "Developer mode is on" line.
- **Nameplate.** The username with the chosen title under it (`nameplate(tag, title, 'big')`).
- **Title under your name.** Pick one of the titles you've earned, or None. Titles (`TITLES`, line 3475): Day 1, DEV,
  Legend (top 5 when a month ends), BABABABA (joined the Discord), Initiate, Good sport (10 GGs). Each has a colour;
  why you got it is in `TITLE_WHY`.
- **Skins.** Each owned unit skin with its picture (`img/skins/*.png`), name, unit and line, and On / Off
  (`Shapes.SKINS` in `src/shapes.js`: Champion Brute, Aquamarine Ether Golem (the invite-a-friend reward on the menu),
  Omni-Per Brute (developers only), ...). Skins have 3D models in `Models3D` (`brute:champion`, `golem:aquamarine`, ...),
  so they can stand on the island.
- **Username.** Change it once a week (developers any time).
- **Match history** (`openHistorySheet()`, line 4511: "My matches", each online match with the opponent, result, time).
- **Log out**, and **Delete account** (tap twice; a guest can't log back in).

Thoughts to bring to that conversation (not decided): the island fits a profile well, e.g. your skins standing on it
in place of the battle, your nameplate set like the STANDINGS header, titles as a row of words with the picked one on a
shard (the New room style), match history as typed rows like the Rooms list.
