# Handoff: the Diorama UI, the PROFILE screen in progress

A redesign of the game's UI, worked out as a standalone mockup in this folder. Nothing in the game itself (`src/`) has
changed. Done so far: the main menu, the PLAY screen (with Rooms and New room), the playlist, battlefields (the
island takes the look you pick), and a **first prototype of the Profile screen** (see "Profile", near the end). Work happens on the branch
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
  together. You get this golem's skin." Owner's wording, 2026-11-07.)
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

Open questions for the owner: is ink the right field for Profile; should skins you don't own show (locked) on the
island; where Friends goes (its own screen or part of Profile); the phone layout (not done for Profile).

### What the game's Profile has (for reference) Opened from the account
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


