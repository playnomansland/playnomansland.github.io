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
| `battle.html` | The room and battle screen prototype (2026-11-08), built: the room you wait in, then a real match on the game's own 3D board. Serve the repo root and open `/design/diorama/battle.html`. See "Battle screen" and "The room" below. |
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

## The room you wait in (first prototype, 2026-11-08)

The screen after CREATE ROOM (the game's `drawLobby()`, and `guestWaiting()` for the one who joined). It is the first
state of `battle.html`: **the room is the battlefield you are about to fight on**, edge to edge in the tilted view, and
when the match starts the same column turns into the deploy panel, with no screen change. (`screens/room-*.jpg`)
- **Top, as in the match:** you top left with your 100 health and "Host" (or "Joined"); the other seat top right is
  an **open seat**: "Open seat", a dashed bar where their health will be, "Waiting for a player…" (or "Pebble is on the
  way…" once an invite is accepted); when someone takes it, their name, title and health, with a saffron HERE tag.
  Top middle: `Play · Rooms · your room · Meadow`, 1V1 STANDARD (or 1V1 RANKED · BO3), Settings and the music line.
- **The keeps say who is in the game** (the owner, 2026-11-08): a dot on each keep, a line, and one typed line: your
  keep always "Wren · connected"; theirs "Pebble · connected", or "Waiting for opponent…" while the seat is open. (Room
  only for now; open question: keep them through the match, where "connected" would matter online?)
- **The column:** a kicker (`Your room · public · watchable`), YOUR ROOM huge, a status line, then New room's rows of
  words: Who can find it (Public / Private), Spectators (On / Off), Units (Learn the game / Standard, with the game's
  pack note; ranked: Standard only, with the series rule), Battlefield (‹ Meadow ›, changes the board at once), then
  **+ Invite a friend** (an ink sheet: friends with a saffron dot online or a ring offline, where they are, Invite →
  Invited), and **START MATCH** on the saffron shard (off until the seat is taken), "Close room" (tap twice).
- **Joined someone's room** (`?room=guest`): PEBBLE'S ROOM, the settings shown as picked words only (the host picks),
  "Waiting for Pebble · Pebble starts the match", Leave room.
- **Left out on purpose:** the match code, the link (Share / Copy) and Phone to phone instead: the owner's call of
  2026-11-07 (no join by code; everything through Rooms and friends' invites). Easy to put back as a typed
  "Copy invite link" if wanted. The developer's Match settings (other maps, Custom pack, Factions) aren't in it yet.
- **Prototype stand-ins:** nobody can really join: inviting Pebble (in the menu) seats Pebble after a moment; Juniper
  is mid-match and never comes; "Prototype: seat the computer" fills the seat. Whoever sits there, the game's AI plays
  them. The match uses the room's Units pack for real (`matchArgs`: the game's matchOff / matchChars / offTowers).
  After the match, Rematch or Back to the room. URL: `?room=host|guest|ranked|private|none` (none: straight into a
  match).

### Fixed: the camera jump between views (2026-11-08)

The owner saw the camera glitch on a view switch. Cause: `fitView` measured the board's corners in every view, so going
in past Tilted it fought the zoom, then flipped to "follow the camera" at zoom 1.2, a one-frame jump of about 100 px
coming back from Angled. Now it measures only in the Top and Tilted views and, between Tilted and Angled, blends from
that last fit to no fit at all, so it is continuous both ways (`fitHeld`; checked frame by frame through Top, Tilted,
Angled and back: the 101 px jump is down to 19 px of ordinary glide).

## The way in: the island flies into the battlefield (prototype, 2026-11-08)

The owner's wish: what leads to the room (Create room, Join, Vs computer; not Start match) zooms in on the menu's
floating island, moves it over and fades it into the real map. `battle.html` now opens on it: New room on the saffron
field with the island (the menu's `orders` view), CREATE ROOM (it presses itself once the board has loaded; `?auto=off`
holds it, `?fly=off` skips it, Settings: Replay the way in), then about 1.9 s:
- **The island is the menu's own:** `build-battle.js` lifts its block out of `src/diorama.js` (the slab, the look's painted
  ground and miniatures, the keeps and pieces) into `buildIsland()`, with stand-ins for the few page names it uses, and
  checks the block is still there at build time.
- **It lands exactly on the board:** the island and the board are the same map at two scales (a tile is 1 on the
  island, `Game.TILE` metres on the board, both centred, the same row and column directions), so the island's camera
  ends on the board camera's exact pose: its position / TILE, the same angle and lens, and the same view offset (the
  framing beside the column). The flight blends from New room's orthographic view (taken as a 5° lens far away, which
  looks the same) to that pose: target, angle, height of view (log), lens and offset, eased in and out.
- **On the way:** New room's words slide off; the miniatures sink (0.4 to 0.75), the keeps just after, so the hand-off
  is ground on ground; the soil drops away; the saffron field opens from the middle of the board outward (a radial
  mask) onto the battlefield's own scenery underneath, which was loaded and framed before the press; the island fades
  out over the last quarter, into the board under it; the room's words come in (0.78 on).
- Reduced motion: no flight, the fades only. (`screens/fly-*.jpg`: New room, then four moments of the flight.)
- **For the game:** the same, with the menu's live scene instead of a second copy: on Create room / Join / Vs computer,
  make the match's board under the field (preload it while on Play / Rooms), fly the menu's island camera to the
  board's pose, then free the menu's renderer (`dio.api.pause`). Phones: one WebGL context at a time today, so there
  the fades only, or measure first.

## Online: a dropped opponent

The owner, 2026-11-08: in a match, "disconnected" beside the opponent's name in the top line (where their health is),
nothing more. In the prototype: Settings, Opponent, Connected / Disconnected.

## For Monday (2026-11-08, end of session)

- Done 2026-11-09: `main` merged in; the prototype's small text is Bricolage Grotesque 700, as the menu's (`--type`).
- Then: the owner's notes on the flight, the room and the battle screen; phones; moving them into the game.

## Phones (2026-11-09)

The room, the battle screen and the way in, held upright (700 px wide or less; `@media (max-width: 700px)` in
`src/battle.html`, `phone()` in `src/battle.js`). Checked at 390 x 844 and 360 x 740 with touch. (`screens/phone-*.jpg`)
- **The world stays edge to edge.** The left column becomes a **drawer along the bottom** over the scenery (an ink
  scrim rises from the bottom edge), and the camera frames the board between the top line and the drawer: the same
  `fitView`, measuring a different free space (`safeRect`). Fold the shop and the board grows; in a fight the drawer is
  only the gold and the armies, so the board is bigger still.
- **Top line:** you, the round and the opponent in one compact row: the name, the health big with its bar; the round
  reads "R1 · DEPLOY"; titles and the music line drop out (titles still show in Friends and on the keeps' notes).
- **Deploy drawer:** gold, deployments, the hint, the extra moves, then **the shop as one strip that scrolls sideways**
  (tier label, cards, + Unlock, tier after tier), READY with the clock. A card is dragged **up** onto the board (a
  sideways swipe scrolls the shop instead); a tap picks it, as on PC.
- **The room:** YOUR ROOM, the status line, and the settings **folded into one line** ("Public · watchable · Learn
  the game · Desert · Change"), which opens to New room's rows; + Invite a friend; START MATCH with the seat's status
  under it. Folded, the board keeps about 60% of the screen.
- **Sheets rise from the bottom** (Unlock, a squad, Invite, Settings, Damage, Help), full width. Picks (start, leader,
  tower) and the match's end take the whole screen and the drawer steps aside; a round's result sits over the board.
- **The way in:** the island in the top half, New room's words under it (the menu's phone layout), then the same
  flight into the board's pose above the drawer.
- Not done: phones held sideways (the PC layout is too tall for them; probably the column on the left again, tighter),
  and a real touch device (only checked with Chromium's touch emulation).

## In the game (2026-11-09): the battle screen, the room and the way in, on a PC

The owner: "I want everything to be ready and testable asap (for PC)." The three prototypes are now the real game's
screens under the Diorama switch (`?ui=diorama`), on a PC with the 3D board. Phones and the old UI are unchanged.
**Not the prototype's code:** the game's own match screen is restyled, so every feature keeps working (leaders' buttons,
Otto's Slots, buildings, walls, online play, spectating, the tutorial, replays, chat).
- **The match** (`html.diorama.pcwide`; CSS at the end of `src/diorama.css`): the 3D canvas is the whole window, with
  ink scrims on the left and the top. The board frames itself in the free space (`dioFit` in `src/site-template.html`,
  the prototype's `fitView`: THREE's view offset). `src/render3d.js` now hands out its THREE camera as `cam3`, a one-line
  change; `build-battle.js` uses it when it is there. The top line is the game's `.hud`, restyled:
  - the map and look above ROUND n · PHASE;
  - Damage, Settings and Music as words;
  - the opponent's Ready / Deploying… under their health;
  - online, "· disconnected" beside the name of an opponent who dropped, and "· reconnecting…" beside yours when you
    drop. The old status line above the board is hidden (`dioHud`).

  The left column is the game's own `panelDeploy()`, restyled (gold, diamonds, the hint, the extra moves as stencil
  words, SHOP by tier, + UNLOCK). READY / Fight / Not ready sit on the big saffron shard at the bottom left with the
  clock. The picks (start, leader, tower), round results and the match's end are centred on the free space. The match
  opens in the Tilted view.
- **The room** (`dioRoom` / `dioRoomOn` in the page; `html.droom-on`): `drawLobby` and `guestWaiting` draw it on a PC
  under the Diorama. The board shows the room's map in its look (`menuPre` now also runs in the lobby). The top line
  shows you and the open seat (Open seat, a dashed bar, "Waiting for a player…", then their name and HERE). The keeps
  carry "Name · connected" / "Waiting for opponent…" (`dioRoomNotes`, drawn with the board's frames). The column:
  - the rows Who can find it, Spectators, Units and Battlefield (‹ › changes the board at once and saves `pb-skin`);
  - + Invite a friend (the game's Friends sheet);
  - START MATCH on the shard, with Close room (tap twice);
  - for a guest: Leave room;
  - for a developer: Factions, Match settings and Phone to phone.

  There is no code or link, except in a developer's phone-to-phone room, which can't be found any other way.
- **The way in** (`flyStart` in `src/diorama.js`; `dioFlyWanted` / `dioBoardPose` in the page): Create room, Join and
  Vs computer on a PC fly the menu's island into the board, as in the prototype. It waits up to 4 s for the board to
  be framed and its scenery loaded, then takes 1.9 s. The match's words wait (`html.dfly`) until 0.78, then the home
  hides and frees its renderer. Not with reduced motion, `?fly=off`, phones, or the 2D board.
- **Checked here** (Chromium, software 3D, 1440×900):
  - Vs computer: start pick, deploy, a card picked, fight, result;
  - a room against a stand-in game server: open seat, then Pebble seated;
  - the flight at pinned moments (`window.__flyT`).

  The classic UI's carry-cap and ai-ready tests pass. Not checked: a real online match with two players (the sandbox
  can't reach the game server), the 2D board under the Diorama (it keeps the old layout, restyled sheets only).

### The owner's calls on the match screen (2026-11-09, after the first in-game shots)
- **Unit cards:** never cut from the scenery. They take the game's own card colour, tinted per battlefield at the same
  darkness (`--dcard` in `src/diorama.css`, set by `data-dlook` on `<html>`): Meadow `#0D130D` (moss), Autumn `#17110D`
  (rust), Snow `#0E1317` (ice), Forest Glade `#0D1311` (pine), Desert `#14120C` (sand), Ashlands `#19100F` (ember),
  Moonlit Snow `#0F121A` (night), Savanna `#13120C` (dry grass). The owner: "go with these colours for now".
- **Scenery-cut panels** (`dioPatterns`): only the picks' options and details and the coach / task lines, a trial on
  Forest Glade (`?dpat=all` tries every look). The + Unlock tiles stay see-through, the sheets keep their own colour.
- **Buttons:** the old ones from before the Diorama (hairline box, gold primary, IBM Plex Sans) everywhere in a match
  "for now", except READY / Fight / Not ready, which keep the skewed saffron shard. The tile slab (owner's pick for
  small buttons before this) is in the CSS history (commit c0e3854) if it comes back.
- **Sheets in a match:** back toward the old layout (rising from the bottom over the board, hairline edge, title and
  Close, a box per row), as the old one the panel lighter than the rows in it (both from the battlefield's card colour),
  clipped tile corners and a thin saffron top edge. The owner on the old buttons in the new screens: "Much better".
- **Still in the new style:** the room's choices (Public / Private, On / Off, the units, the battlefield arrows). Ask.

### The test page (2026-11-09)
The owner asked for it "behind the Diorama site, not the actual live site": `design/diorama/game.html`, at
`playnomansland.github.io/design/diorama/game.html`, is the whole game with the Diorama always on (`node src/build.js
--diorama-page`; `const DEF = 'force'`, a `<base href="../../">` so it loads the root's `src/`, `vendor/`, `models/`,
`audio/`). It never changes a device's `pb-ui` choice for the live game. On `main` since commit b3a6407, with only the
`cam3` line of `src/render3d.js` beside it; the live `index.html` is not changed. Rebuild it with `--diorama-page` and
put it on `main` the same way (only that file, plus any `src/` 3D file it needs) to update the test page.

### The deploy panel's side (2026-11-09)
The owner: "an option in settings to put deploy left or right. Make right side the standard for now." Settings (the
menu's dropdown, Match screen; and the match's own Settings sheet, on a PC) has **Deploy panel: Left / Right**, kept on
the device as `pb-deploy-side` (default right; `?side=left|right` sets it). `setDeploySide` toggles `html.dright`; the CSS
mirrors the column, its scrim, READY, the clock, the room's START MATCH, the music player and the sheets; `dioSafe`
frames the board in what's left. Also fixed: on short windows (laptops) the column's rows collapsed onto each other (a
flex column squeezing them); they keep their size now, the column scrolls and ends above READY, with a tighter layout
under 860 px high.
- **Music in a match (2026-11-09):** the owner asked "where is the music player?", then: put it on the side opposite
  the deploy panel, and keep it down where the player is. The home-style player (`openPlaylist`'s dock, restyled) now
  stays in the bottom corner opposite the panel for the whole match ('mini': the player only, `dioMusicDock` from
  `dock()`); the song or "Playlist" unfolds the playlists above it, their down arrow or Esc folds them back (`mpClose`
  doesn't close it there). The top-line music line (`dioMusicLine`) is hidden; the "Music" link too. **+1 deployment** reads "+1 deployment, a gold coin, the cost" (the owner). The right
  panel sits closer to the edge.
  The player itself hides too (the owner): its down arrow (`.dm-hide`) slides it away, leaving a small "♪ Music ⌃"
  (`.dm-show`) that slides it back up; kept on the device (`pb-dmusic`). Three steps down: playlists → player → Music.
- **2026-11-10 (owner):** the deploy panel is on the **left by default again** (Settings still has Left / Right).
  **It slides away:** when the mouse leaves the column it tucks to its side after 0.45 s and comes back when the pointer
  reaches that side (the column, or the 60 px edge while tucked); never while a button is held (dragging), a sheet is
  open, or in the room; READY and the clock stay; the board keeps its framing so nothing moves under the pointer; a
  thin saffron tab marks the edge. Settings: "Slides away" On / Off (`pb-deploy-auto`, on by default). **Full screen**
  in the match's top line (`#dfs`). **Take back / Sell drop zone** restyled: no box, the column darkens with a saffron
  edge toward the board, TAKE BACK (or SELL) in stencil with the gold back in saffron.
- **2026-11-10 (owner):** the music player **starts down** (just "♪ Music ⌃"; `pb-dmusic` = 'shown' once opened). With
  the panel on the **right**, the top line swaps too: your name and health on the right above the panel, the
  opponent's on the left, both mirrored (`html.dright .hud`).
- **2026-11-10 (owner):** the slide-away panel comes back from a wider zone (140 px from the edge while tucked; the
  column plus 40 px while out) and stays out 1.5 s after the pointer leaves. **The board is central:** with
  slide-away on, `dioSafe` frames it in the middle of the screen with half the column's width as a margin on both
  sides (the panel overlaps its outer edge only while out); with it off, the board stays clear of the column. **The
  top line's buttons are symbols again** (bars, cog, full-screen corners; tooltips). **The match's Settings sheet is
  redesigned:** grouped under Sound, Board, Deploy panel (Side, Slides away), Online matches (Chat, Emotes); segmented
  pills in Bricolage with the picked one gold; Friends, Report a bug and Open playlists as a row of buttons, Main menu
  last in red. Done in CSS (`order`, `:has`, `::before` headings) over the game's own rows, so every control is the
  game's.
- **2026-11-10 (owner): the deploy panel is always out by default** ("Slides away" is off; `pb-deploy-auto2`, a new
  key so earlier choices don't carry over). With it off, the board frames beside the column (no overlap); the central
  framing only applies while sliding is on.
- **2026-11-10 (owner):** the match's Settings sheet sits **in the exact middle of the screen** (not risen from the bottom, not beside the column); the other sheets still rise from the bottom.
- **2026-11-10 (owner):** the picks' options (start, leader, tower), their details box and the coach line take **the unit cards' colour for the battlefield** (`--dcard`), not the scenery patches (`DPAT_LOOKS` is empty; `?dpat=all` still tries them).
- **2026-11-10 (owner):** the board stays **centred with either option**: the same margin both sides, half the column in both cases (the owner preferred the bigger board, the always-out column overlapping its outer edge a little).
- **2026-11-10 (owner):** **every sheet in a match is centred** on the screen (Main menu's question, Unlock, Help, a squad, Settings), all corners clipped. Damage stays a drop-down under its icon (already centred horizontally).
