# The Diorama on phones: first prototype (2026-11-10)

Step 8 of `INTEGRATION.md` ("Phones: every screen at 390×844 and 360×740"), started. **Prototype only: on the
branch `claude/fervent-davinci-ni76yl`, not on `main`.** The live game is unchanged: `index.html` is still built with
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

## Checked

- 390×844 and 360×740 with touch emulation (Chromium, software WebGL): menu, Play, Multiplayer, Rooms, New room,
  Units with a unit's sheet, Rankings, Settings, Friends, Profile, Match history; a match against the AI from
  choose your start through the round 1 fight, the result, the round 2 leader pick and round 2's deploy. No page
  errors, no sideways scroll.
- Nothing changed elsewhere: the old UI on a phone (`index.html`, the old drawer) and the Diorama on a PC at
  1440×900 (left column, READY) look as before.

## Not done / to ask the owner

- **A real phone.** Only emulated here, where 3D runs at 1–2 fps. Software 3D falls back to 2D after a slow fight,
  so add `&board=3d` to keep it 3D.
- **The 2D board on a phone** still gets the old match layout.
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

Rebuild with `PB_UI_DEFAULT=pc node src/build.js --diorama-page` (keeps `index.html` on `pc` and writes the test
page). Serve the repo root (`python3 -m http.server 8766 --bind 127.0.0.1`) and open
`/design/diorama/game.html?test&fly=off` in a phone-sized window with touch.
