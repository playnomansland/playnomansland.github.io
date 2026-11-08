# Handoff: the Diorama UI (mockup finished; next: putting it into the game, see INTEGRATION.md)

A redesign of the game's UI, worked out as a standalone mockup in this folder, on sample data. **Nothing in the game
itself (`src/`) has changed yet.** The mockup is finished and tested (2026-11-07): Welcome / Sign up / Log in, the
main menu (Units with skins, Rankings), Play (Rooms, New room), the playlist, battlefields, Profile with Match history,
and the Friends and Settings dropdowns. Every screen is on one page: `screens/contact-sheet.jpg`.

**Next: putting it into the game. That plan, and the owner's decisions for it, are in `INTEGRATION.md`.** This file is
the design reference. The work is on the branch `claude/nice-mendel-scnrpy` (from `claude/clever-tesla-l0aw0q`, from
`claude/wonderful-carson-fdud2o`, which started from `design/diorama`; `main` merged in on 2026-11-07).

## What is here

| Path | What it is |
|---|---|
| `diorama-menu.html` | The built mockup: one self-contained page (three.js, the game's models, KayKit models, floors, the roster, the font and the title art inlined). Open it in a browser with WebGL. |
| `src/menu.html` | The source: markup, CSS on top of `src/base.css`, and the 3D scene as an inline module. `{{NAME}}` placeholders are filled by the build. |
| `src/base.css` | Base styles: the field, menu words, notes, music, and the PLAY / Rooms / New room screens. |
| `build.js` | `node design/diorama/build.js` writes `diorama-menu.html`. Inlines `vendor/three*.js`, `src/kaykit3d.js`, `src/models3d.js`, `src/default-roster.json`, `src/floors.js`, `paintIce` lifted out of `src/render2d.js`, `img/title.png`, `fonts/`. |
| `shots.js` | Screenshots of the built page in given states into `screens/` (PNG). Needs Playwright with Chromium; without a GPU it renders through SwiftShader, about 25 s a shot. Convert to JPG to keep (PIL is there). |
| `diorama-language.html` | The original design language document. Older than everything below; this file is the current summary. |
| `screens/` | Screenshots of the current state (listed below); `contact-sheet.jpg` has every screen. |
| `test/` | The checks (2026-11-07): `collide.js` (text overlapping, note lines through words, text off screen, for every state in `states.json` at given window sizes; it can save shots), `flow.js` (a 39-step click-through of every screen), `contact-sheet.py`. Commands at the top of each file. |
| `INTEGRATION.md` | The plan for putting the Diorama into the game, and the owner's decisions for it. |
| `battle.html` | The battle screen prototype (2026-11-08), built: a real match against the computer on the game's own 3D board. Serve the repo root and open `/design/diorama/battle.html`. See "Battle screen" below. |
| `src/battle.html`, `src/battle.js`, `build-battle.js` | Its source and build: `node design/diorama/build-battle.js` (add `--standalone <out.html>` for one self-contained ~7 MB file with three.js and the scenery inlined, no music). |

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
- Play: `#play`, `#multi` (Multiplayer folded out), with `#acct=dev`: `#xb=<tactic>` (Exploit bot picked), `#dvon=<word>`
  (a developer word pointed at), `#rooms=standard|ranked` (Rooms, filtered), `#filter` (the filter's
  list open), `#create` (New room, with `#rooms=`), `#private`, `#on=vs-ai|multi|standard|ranked|r0..` (as if pointed at).
- Battlefields: `#bf=meadow|autumn|snow|frost|desert|ash|moonlit|savanna` (home), `#roombf=<same>` (New room's).
- Profile: `#profile`, `#acct=google|guest|dev|none` (sample account; google is the default), `#title=<id>` (picked title,
  empty for None), `#skinoff=N` (skin N taken off), `#out` / `#sure` (Log out / Delete account tapped once), `#history`
  (Match history), `#all` (its All online tab), `#rounds=N` (match N's rounds open), `#units` (Profile's Units, with
  `#tier=` and `#unit=`). `#acct=` also sets whose skins the menu's Units shows.
- Welcome: `#welcome` (the title screen), `#invited` (came from a friend's link), `#signup`, `#login`, `#tag=<name>`
  (typed in Sign up), `#err` (a bad username).
- Dropdowns: `#friends` (with a game invite at the top), `#friends=requests`, `#friends=chat` (the thread with Pebble),
  `#frinvite=N` (friend N's "Invite to" open), `#frmore=N` (friend N's ⋯ open), `#noinvite`, `#settings`. With
  `#acct=guest` Friends asks for Google; with `#acct=dev` Settings has the Developer group.
- Skins are on the unit sheet: e.g. `#still,view=units,pin,tier=4,unit=0` (Ether Golem), `tier=2,unit=0` (Brute),
  `tier=1,unit=3` (Fire Mage).

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
- No join by code and no Play vs Friend (owner, 2026-11-07): everything goes through Rooms. Rooms' search line finds a
  player or a battlefield; a private room is "Not listed. Invite friends to it from Friends."
- Developer buttons: designed on Play (`#acct=dev`; `screens/dev-play.jpg`), waiting for the owner's OK. See
  `INTEGRATION.md`, "Answered by the owner".
- On hold (owner, 2026-11-07): Rewards, Encyclopedia and the other extra buttons.

## Profile (first prototype, 2026-11-07)

Opened from the account button top right, which now shows the sample player's name (Wren; Guest with no account).
(`screens/profile*.jpg`, `history.jpg`, `units-golem-*.jpg`)
- **The field turns ink** (`#1D1A15`): the third screen colour, after ultramarine and saffron. The title colours were
  made for the game's dark UI and read on it; the logo and cream type stay as they are; the shard stays saffron.
- **Left column.** A typed kicker with the account state (`Profile · signed in with Google`, `· guest on this phone`,
  `· no account yet`, plus `· developer mode is on` in DEV pink). Your name huge in Chakra Petch, the picked title under
  it in its own colour between two small diamonds. Then rows of words (the New room style):
  - Title: each earned title, and None. The picked one sits on a shard of **its own colour**; the note is why you have it.
  - Skins: the menu's UNITS word (owner's call, 2026-11-07: no separate skins list). It brings up the Units roster on
    the island, tier tabs and all, with "← Profile"; the note says which skins are on.
  - Username: an input on a dashed line; Save appears when it changes. "Once a week" / "Developer: any time".
  - Keep it (guests only): Sign in with Google (a stand-in for Google's own button, which the game must use).
  - Account: Log out (a guest taps twice, with the warning) and a small typed "Delete account" (tap twice).
  - No account: "NOBODY YET", and Play as a guest on the saffron shard beside Sign in with Google.
  - MATCH HISTORY → on the saffron button.
- **Skins live on the unit sheet**, from the menu's Units and from Profile's alike. A unit with skins gets a SKIN row:
  Plain and each skin you own as words, the worn one on the saffron shard, the skin's line and "Only the look changes,
  never the stats." under it. One skin per unit. The limited Aquamarine shows locked ("Invite a friend...") until you
  have it; other skins you don't own stay hidden. The roster shows the skin you wear, and a changed one pops back in.
  The unit's pointed-at note counts its skins. On Profile the sheet's panel is lifted (`#2C2820`) off the ink field.
- **The island** on Profile is the battle as on the menu; while you don't have the golem skin, the golem's note says
  how to earn it. Change battlefield sits below the island's near edge.
- **Match history** (← Profile). MATCHES with "n played · n won", My matches / All online tabs, typed rows like Rooms:
  WON (saffron) / LOST (faded) / DRAW, `vs Pebble` with their title in its colour, `Ranked · 2–1 · Desert · 2 h ago ·
  dealt 72, took 28`, and "3 rounds ⌄", which folds out each round with a REPLAY. The island moves further right.
- Sample data only (`ACCTS`, `HIST`, `ALL` in `src/menu.html`); nothing talks to the server.

**Small screens (2026-11-07).** A collision check went through every Profile and dropdown state at 1024×768 to
1920×1080 (text boxes overlapping, note lines through words, text off screen). Fixes: Profile's column scales with the
window's height (`clamp(..vh..)`); Change battlefield sits on the island's right corner on Profile too; island notes
that would land on the left column or under an open dropdown hide; Units from Profile hides the other rows, keeps the
tier tabs clear of your name (under the Units row if they can't fit) and the sheet clear of the tabs and the music
player (which steps aside only if there's no other room).

## Welcome, Sign up, Log in (2026-11-07)

The first screen before the menu (the game's `drawWelcome` / `drawSignIn`). Ultramarine, like the menu.
(`screens/welcome*.jpg`, `signup*.jpg`, `login.jpg`)
- **Welcome.** The logo large top left; the island in a lower, wider shot (`VIEWS.welcome`). Bottom left, like the menu:
  LOG IN on the big saffron shard ("Your name, your record and your ranked results, back on this device."), then
  01 SIGN UP "new here" and 02 PLAY AS GUEST "no account needed". No account buttons, no island notes, except: from a
  friend's invite link, the golem's note ("A friend invited you · Sign up with Google and finish an online match
  together. Your friend gets this golem's skin."). The reward is the inviter's (owner, 2026-11-07): the game says
  "you get" to the one who sends the link (the menu's "Invite a friend. This golem skin is yours."), and this screen
  is the invited friend's.
- **Sign up / Log in.** A left column like New room (the logo back to its usual size, the island further right,
  "← Back"): kicker, SIGN UP / LOG IN, the game's lead line, then rows: Username (dashed line; a bad one turns the line
  saffron and its note into the rule), Keep it / Google (a stand-in for Google's own button, with "Sign-in is handled
  by Google. We never see your password or email."), Or: SIGN UP AS A GUEST. Under it "I have an account: log in" /
  "New here? Sign up". Getting in lands on the menu with that sample account (the name typed in Sign up kept).

## Friends and Settings (dropdowns, 2026-11-07)

Both hang off their buttons top right as an ink panel with a cut lower-left corner (`.drop`), one open at a time;
clicking outside, Esc, or the button again closes them. On the menu only (the buttons hide on Play and Profile).
(`screens/friends*.jpg`, `settings.jpg`)
- **Friends** (the game's `openFriends`; Google accounts only). The button carries a saffron badge: requests, unread
  messages and invites. FRIENDS with "n online · n friends"; a game invite on a saffron shard at the top ("Pebble
  wants a 1v1 Standard", JOIN / Decline); Friends / Requests tabs; "Add by username" on a dashed line with ADD. Each
  friend: a saffron dot (online) or a ring (offline), the name with their title in its colour, where they are (In the
  menu · In a room · Standard · Playing Ranked · round 3 · Offline · 2 days ago), then INVITE (in the menu: folds out
  "Invite to Standard / Ranked", then "Invited · 1v1 Standard"), WATCH (in a match), the messages button with its
  unread count, and ⋯ (Mute messages, Remove friend: tap twice). Requests: "Asking to be your friend" (ACCEPT /
  Decline) and "Waiting for them" (Cancel). A thread: ← Friends, the name and where they are, typed lines (yours
  right, in saffron), "Message Pebble" and SEND, Mute / Report. A guest or no account: why it needs Google, and the
  Google button.
- **Settings** (the game's `openSoundSheet`, as on the menu): Sound (Music On/Off, Music volume, Sound effects On/Off,
  Effects volume), Online matches (Chat, Emotes, Spectators), This device (Stay logged in, with the guest warning),
  Developer (Ranked play, developers only); Playlists (opens the player's list) and Report a bug. Rows of words like
  New room, small; volumes are a thin line with a saffron cut-corner handle and the number. The match-only settings
  (2D/3D board, phone layout, 3D quality) are not in it; a line says so.
- Sample data: `FRIENDS`, `REQ_IN`, `REQ_OUT`, `THREAD`, `SET` in `src/menu.html`.

Settled since the first Profile prototype: skins moved to the unit sheet; Friends is a dropdown off its button. Still
open: phone layouts for every screen except the main menu (see `INTEGRATION.md`, "Phones").

### What the game's Profile has (for reference)

What the game's Profile has today (`openAccountSheet()` / `acctDraw()` in `src/site-template.html`; `INTEGRATION.md`
has every function with its line):
- **Account state.** Signed in with Google, or a guest on this phone (sign in with Google to keep it), or no account yet
  (Play as a guest / sign in). Developer accounts get a "Developer mode is on" line.
- **Nameplate.** The username with the chosen title under it (`nameplate(tag, title, 'big')`).
- **Title under your name.** Pick one of the titles you've earned, or None. Titles (`TITLES`): Day 1, DEV,
  Legend (top 5 when a month ends), BABABABA (joined the Discord), Initiate, Good sport (10 GGs). Each has a colour;
  why you got it is in `TITLE_WHY`.
- **Skins.** Each owned unit skin with its picture (`img/skins/*.png`), name, unit and line, and On / Off
  (`Shapes.SKINS` in `src/shapes.js`: Champion Brute, Aquamarine Ether Golem (the invite-a-friend reward on the menu),
  Omni-Per Brute (developers only), ...). Skins have 3D models in `Models3D` (`brute:champion`, `golem:aquamarine`, ...),
  so they can stand on the island.
- **Username.** Change it once a week (developers any time).
- **Match history** (`openHistorySheet()`: "My matches", each online match with the opponent, result, time).
- **Log out**, and **Delete account** (tap twice; a guest can't log back in).



## Battle screen (first prototype, 2026-11-08)

The match screen in the Diorama's look. The owner's brief: the deployment panel keeps every function but needn't look
the same; the 3D view covers as much of the screen as possible; HP and the top section are overlaid; **no dead space
that isn't the 3D world or its scenery.** (`screens/battle-*.jpg`; `battle-before.jpg` is today's screen.)

**It runs the real thing.** `battle.html` is the game's engine, AI and 3D board (`src/game.js`, `src/referee.js`,
`src/render3d.js` and the scenery) with a new screen on top: a vs-computer match from round 1 to the end. Nothing in
`src/` changed; the build hands the page Render3D's THREE camera (`cam3`) by a string patch, checked at build time.

**Layout (PC).**
- The canvas is the whole window. There is no bar, panel box or gutter: words sit on the scenery with an ink halo and
  a soft ink scrim behind the left column and the top edge (the menu's `.scrim` idea), so the trees still show.
- **The board frames itself** in what the words leave free (`fitView` in `src/battle.js`): each frame the board's
  corners are measured and THREE's `setViewOffset` (as the menu's island) moves and scales the picture into the free
  rectangle right of the column and under the top line. The camera, taps and drags are the game's own; a resize or a
  camera change glides. It opens in the **Tilted** view (the icon's camera; your zone nearest and biggest); `?cam=top`
  for the game's top view. Settings switches Top / Tilted / Angled, and the wheel works as in the game.
- **Top, overlaid:** you top left (name, title, HP huge in Chakra Petch, a thin team-blue bar; damage taken flashes on
  the bar), the opponent top right, mirrored, with their state under it (Deploying… / the saffron READY tag, their
  leader). Top middle: `Standard · Meadow`, ROUND 1 · DEPLOY (the phase in saffron), and typed links: Damage (last
  round, per squad), Settings, and the music line (`▶ Bulgaria by Snetänd`, plays from `audio/`).
- **Left column = your army,** top to bottom: gold huge in saffron with "gold"; deployments as diamonds, "n of n
  deployments", `+1 deployment · 50` as a dashed link; the hint line (only what the next tap does, as the game's);
  extra moves as small stencil words (Undo all, Loan +100 / Pay back loan, Refund unused); SHOP with Fold; the tiers
  (a coloured rule, the tier number and price, then the cards: ink tiles with a cut corner and the tier's colour on
  top; the picked one on a saffron shard; + UNLOCK as a dashed tile); and at the bottom **READY on the big saffron
  shard**, as PLAY on the menu, with the clock and the opponent's state beside it. Ready again reads NOT READY on a
  dashed outline; over 500 gold the first press warns (READY ANYWAY: the game's carry-cap check).
- **Notes and sheets:** pointing at a card gives a Diorama note (dot on the card, up into the gap, along under the
  words right of the column: `Sniper. Tier 1 · 1 body · 140 health · hits 210 · range 29`, plus why it can't be
  bought). + Unlock, a tapped squad (Take back / Level up / Sell, with a line to the squad), Help, Settings and Damage
  are ink sheets with a cut corner, as the menu's dropdowns.
- **Moments over the board:** round 1's CHOOSE YOUR START, round 2's leader and round 3's tower are one component:
  a veil, the kicker, a huge title, numbered options that sit on a saffron shard when picked, CHOOSE and "Look at the
  board" (the game's Hide). The round's end: WON (saffron) / LOST / DRAW huge in the middle, the damage and the
  income, NEXT ROUND on the shard. The match's end: VICTORY / DEFEAT, PLAY AGAIN. In a fight the shop folds away and
  the column shows each army's bodies left and "Skip to the end".
- **Short windows** (720 to 820 px high): the same column, tighter, all four tiers in sight (`battle-deploy-1280.jpg`).

**Deploy panel, function by function** (the game's `panelDeploy()`): gold · deployments left · +1 deployment ·
clock · Help · Ready / Not ready with the carry-cap warning · the hint line · Undo all · Loan / Pay back · Refund
unused · the shop by tier · Unlock (a tier's locked units with their price) · a card dragged onto the board or tapped
then a tile · a squad dragged to move it, or back onto the shop to take it back · Fold. The squad sheet's take back,
level up and sell. All call the same `Game` functions as the game. Esc puts a card down or closes a sheet before it
reaches the camera; Space is Ready.

**Not in the prototype yet:** the leaders' and maps' own buttons (Otto's Slots, Charisma, Mark, Fortify, the tower
skill, the elves' bribe, the altar, mushrooms), skills on the squad sheet, the devtest extras, the battle cam, chat
and emotes, online play and spectating, the tutorial coach, and **phones** (PC only so far). Sample names (Wren /
Computer).

**Open questions for the owner:** Tilted as the default view? The left column vs the game's right-hand panel (left
keeps "yours on the left, theirs on the right" under the HP)? READY at the bottom (as PLAY) vs at the top of the shop?
How phones should work (probably the shop as a bottom drawer under a full-screen board, the HP still overlaid).
