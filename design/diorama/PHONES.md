# The Diorama on phones: first prototype (2026-11-10)

Step 8 of `INTEGRATION.md` ("Phones: every screen at 390×844 and 360×740"), started. **Merged into `main` on
2026-11-12** (from the branch `claude/fervent-davinci-ni76yl`; How to play, added on `main` meanwhile, still opens the
old sheet on a phone). The live game is unchanged for phones: `index.html` is still built with
`PB_UI_DEFAULT=pc`, so phones and tablets get the old UI there. The Diorama shows on a phone only on the test page
(`design/diorama/game.html`, always on) or with `?ui=diorama`.

Screenshots: `screens/phone-game-home.jpg` (menu, Play, Rooms, New room, Units, Settings, Profile) and
`screens/phone-game-match.jpg` (choose your start, deploy, the fight, a round's result, the leader pick).

## What changed

**Home screens** (`src/diorama.css`, the "phones" block at the end; `@media (max-width: 700px)`):
- The page scrolls. The island sits in the top part (`--isle`, about 42% of the screen; smaller on Rooms and New
  room so the list shows), and each screen's words come under it. The PC layout pins everything with
  `position: fixed`; on a phone it all goes back into the page's flow, in the order set with `order`.
- Logo and account icons on one top line, 44 px tap targets. The island's notes are hidden (there's no hover on a
  phone).
- Menu: PLAY on its shard, the four words two by two, then the reward, the music player and the credits. The music
  and credits show on the menu only.
- Play: VS COMPUTER and MULTIPLAYER sized to fit, the kinds folded out under them. Rooms: the list scrolls with the
  page. New room: each row's label sits above its words.
- Friends and Settings: full-width sheets from the top. A unit's sheet (Units) is a bottom sheet. Rankings: the
  podium on the island, STANDINGS under it.
- `src/diorama.js`: the island re-fits when its canvas changes size (a phone's island changes height per screen).

**The match** (`src/site-template.html` `dock()` and `dioSafe()`; the second "phones" block in `src/diorama.css`):
- A phone with the Diorama and the 3D board gets the Diorama match screen (`html.pcwide` without `html.pc`) instead
  of the old drawer (`html.dock`). This follows the earlier phone mockup (`HANDOFF.md`, "Phones (2026-11-09)").
- Top line: you, `R1 · DEPLOY`, the opponent in one compact row. Damage, Settings and Full screen are icons.
- The left column is a **drawer along the bottom** over an ink scrim: gold, deployments, hint, extra moves, then the
  **shop as one strip that scrolls sideways**. READY is bottom left, the clock bottom right.
- The board is framed between the top line and the drawer's top (`dioSafe` measures `#panel`; `--dph` is the
  drawer's height).
- Picks (start, leader, tower) take the whole screen and the drawer steps aside. A round's result sits over the
  board. Sheets rise from the bottom, full width. The corner music player is hidden on a phone.

**Shop mode and board mode** (the owner's idea, 2026-11-10; `dioBoardMode` in `src/site-template.html`, `html.dboard`):
- **Shop mode** is the screen above: the drawer up, the board in the tilted overview.
- **Board mode**: the drawer drops to its top row (gold, deployments, READY) with a saffron **SHOP ▴** tab on its edge,
  and the board is seen **from straight above, filling the rest of the screen**. Tiles are square, about 27 px on a
  390 px phone. That's as big as they get with all 14 columns showing; bigger means cropping columns and panning, so
  not yet.
- **Dragging a card** up out of the drawer goes to board mode at once. The view then holds still while you aim (the
  tile under the card is lit, your zone's grid shows). **Letting go** goes back to the shop after a short beat, unless
  the squad still wants something (an aim, a move: the task line is up).
- **A tap on the board in shop mode** only brings up board mode (nothing is placed or picked by that tap). In board
  mode, taps work as before: place a picked card, pick a squad to move it.
- Back to the shop: the SHOP tab, a tap on the drawer (not on a button), or a swipe up on it.
- READY from board mode, a pick (leader, tower) or the fight end board mode; the fight keeps its tilted view.
- Screenshots: `screens/phone-game-boardmode.jpg` (shop mode, dragging a card, back in the shop, board mode from a
  tap).

## Checked

- 390×844 and 360×740 with touch emulation (Chromium, software WebGL): menu, Play, Multiplayer, Rooms, New room,
  Units with a unit's sheet, Rankings, Settings, Friends, Profile, Match history; a match against the AI from
  choose your start through the round 1 fight, the result, the round 2 leader pick and round 2's deploy. No page
  errors, no sideways scroll.
- Board mode with touch at 390×844 and 360×740: a card dragged up and dropped (it lands, gold goes down, back to the
  shop); a tap on the board in shop mode; the SHOP tab; READY pressed in board mode into the fight and round 2.
- Nothing changed elsewhere: the old UI on a phone (`index.html`, the old drawer) and the Diorama on a PC at
  1440×900 (left column, READY) look as before.

## Not done / to ask the owner

- **A real phone.** Only emulated here, where 3D runs at 1–2 fps. Software 3D falls back to 2D after a slow fight,
  so add `&board=3d` to keep it 3D.
- **The 2D board on a phone** still gets the old match layout.
- Board mode in the hand: whether going back to the shop after each drop feels good or tiring when placing several
  squads (if it tires, stay in board mode after a drop until SHOP is tapped). The camera's turn takes 0.3 s on a real
  phone; here it crawls (about 1 frame a second).
- **The room** (waiting for an opponent, `html.droom-on`) on a phone: not checked here (it needs the game server).
  Its column will be in the drawer, but it hasn't been styled for that.
- **Welcome / Sign up / Log in** under the Diorama on a phone: not checked (`?test` shows the old welcome first).
- **Phones held sideways**: they get these portrait layouts as long as the window is 700 px wide or less; wider
  ones get the PC layout. Neither is designed for it yet.
- **Tablets** (wider than 700 px, no mouse) with `?ui=diorama` now get the PC match screen too. Untested.
- The fight's drawer shows only the speeds and Skip. The mockup also had "gold after the fight" and the armies' bars.
- Dragging a card up from the sideways shop onto the board (the mockup's gesture) hasn't been tried with touch.
- Units on a phone: the tier tabs sit just above the white PLAY word. It reads, but it's busy.

## Try it

Rebuild with `node src/build.js --diorama-page` (keeps `index.html` on `pc`, the default since 2026-11-12, and writes
the test page). Serve the repo root (`python3 -m http.server 8766 --bind 127.0.0.1`) and open
`/design/diorama/game.html?test&fly=off` in a phone-sized window with touch.
