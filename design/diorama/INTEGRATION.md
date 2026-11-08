# Handoff: putting the Diorama UI into the game

Written 2026-11-07 at the end of the session that finished the mockup. Read `design/diorama/HANDOFF.md` first (the
design language and every screen), then this file. Work on a branch (`claude/nice-mendel-scnrpy` has the mockup and
is level with `main` as of 2026-11-07; merge `main` in again before starting, the game moves fast).

## Next session: start here (handoff, 2026-11-08)

**State.** The Diorama is in the game behind the switch and live on `main` as a trial: every player gets the old UI;
`?ui=diorama` turns the Diorama on for that device (`?ui=classic` off). Branch: `claude/nice-mendel-scnrpy` (level
with `main` after the last push). Steps 1 to 7 and 9 are done (notes under Progress); step 8 (phones) and the test
rewrite were set aside for their own sessions by the owner.

**Done from the owner's first trial notes (2026-11-08):** Friends, your name and Settings on every screen; the logo
goes to the menu; no back link (sub-screens have a clickable trail in their small heading: Play · Rooms · New room,
Profile · Match history, Welcome · sign up); Profile's rows stay when Units is open, no note under Units; accents
(Ä) clear the line above big names; pointing at any keep or treasury shows all four notes (their keep: "Bring it
down to hurt the opponent and weaken their army", their treasury: "Destroy their treasury to steal their gold"), and
notes change only after half a second so a sweep doesn't flicker (the piece lifts at once); Full screen in Settings;
the developer rows no longer show on Rooms; Vs computer plays the island's battlefield (Change battlefield saves the
look as itself, and a developer's empty map pick is the Standard map under the Diorama); Change battlefield sits in
one fixed place (bottom right, beside the music player) on every screen; the match's old music panel closes when
you come home; the playlist has no scrollbar; Log out's underline sits closer to the word.

**Done from the owner's second trial notes (2026-11-08, second session):**
- Profile opened from Play, Rooms or New room showed on top of them. Profile now opens over the plain menu
  (`leavePlay()`, shared with the logo's `goMenu`); `dioPaint` never reopens Play while Profile is open, `openPlay`
  closes Profile, and the CSS hides the Play side under `#dio.profile`. (The owner's second report was most likely a
  cached page: Pages lets browsers keep `index.html` 10 minutes.) **Back** (`#pf-back`, saffron, under Match history)
  returns to where Profile was opened from (`pfFrom`: Play, Rooms, New room or the menu).
- Profile's buttons share one hover, the saffron board (Titles, Save, Log out, as Units); the picked title keeps its colour.
- Change battlefield's line is back: from the fixed note to the nearest island corner or edge (`bfDots`).
- Island notes: a piece's note shows at once (leaving waits 250 ms); Sniper and Fire Mage only on hover; the Ent on
  hover ("Sleeping Ent. · Sshhhh!"); the skeleton's always-on hint "Hover stuff on the island to learn more!" (above
  left, clear of the golem's note; to the right where the logo is in the way).
- Full leaderboard hangs under the Rankings note (`.lb-rank`, moved out of the standings at boot; on phones it is
  hidden with the notes: step 8). The right-hand menu notes' rail clears HOW TO PLAY.
- Multiplayer: "challenge your friend"; 1v1 Ranked: "BO3"; 2v2 (developers): "with new buildings and units".
- How to play's Leaders (both UIs): "Leaders give you passive abilities throughout the game. Choose a leader in round
  2 of a match." and the list, no draft rules.
- Settings: Full screen is a saffron button under the heading.
- Puzzles' note (the left-hand menu notes) sits above Back to match when it shows.
- The player redraws when the home shows and on every `dioPaint` (the owner saw a wrong song after a match; not
  reproduced here after a vs-computer round, so ask what they saw if it happens again).
- Third round: a full-screen icon after Settings (`#dio-fs`, toggles full screen; hidden where the browser can't); the
  skeleton's hint reads "Hover over stuff on the island with your mouse!" and goes up-right of it (left only without
  room); a note's box stays on screen under the header and moves below a box it would cover (`placed` in `pin`);
  pointing at a piece lays the notes out at once (`notes()` from `setHover`, not on the next frame).
- Fourth round: no hover delay either way (`setHover`); the golem's and the skeleton's notes (`data-home`) fade out
  over 1 s while something is pointed at and back in over 0.25 s (opacity drawn per frame in `notes()`, its line in a
  `<g opacity>`; a fading note doesn't push others). A pointed-at piece's note tries six spots before hiding (the Fire
  Mage's first spot lands on PLAY on small windows). Goblin Swarm note (the five goblins are one group, `goblins`).
  A click on a unit model (`UNIT_MODELS`) on the main menu opens Units; notes are their own elements, so a click on
  one doesn't. `#dio` has `user-select: none` (inputs excepted).
- Fifth round: every island note fades out over 1 s once it isn't wanted (a quick sweep leaves each readable for a
  second); a pointed-at note shows at once. A hover note keeps the spot it got when it appeared (`el._off`, offsets
  from its dot) until it's gone; the menu's own notes are laid out first, then notes already up, then new ones, each
  avoiding the boxes before it; the pointed-at note may sit over fading boxes when there's no free spot.
- Sixth round: the goblin swarm has one invisible hit box (a `colorWrite: false` box in the `goblins` group); each
  tower and treasury shows only its own note (the four-at-once group is gone).
- "Joe biden" as Ashlands battle music was the owner's request (2026-11-07, its own session, commit 8ae8492).

**Open, in order:**
1. **Ask the owner to try again** at `?ui=diorama` (list below) and fix what they find.
2. **The in-match music panel:** the owner designs it with the new Battle screen, in that separate session (answered
   2026-11-08). Leave the game's panel (`openPlaylist`, `mp-pop`) as it is here.
3. **The PC launch** when the owner says so (planned for 2026-11-08 if all goes well, otherwise Monday 2026-11-09): `PB_UI_DEFAULT=pc node src/build.js`, commit `index.html`, push to `main`
   (the Diorama on computers, the old UI on phones and tablets). Never commit a non-`classic` build otherwise.
4. **Designs the owner wants before the full launch:** Puzzles, How to play, and the room you wait in (still the
   game's sheets / screens, restyled).
5. **Own sessions (owner's call):** step 8, phone layouts for every screen; the test rewrite (tests that click Play vs
   Friend `#friend`, `#online`, Quick play, join by code, the old Create-room sheet, the old playlist panel,
   `#tutorial-new`, `[data-tm]` / `#settings` in the old popup must go through the Diorama's screens: Vs computer
   `#go`, Rooms `#lob-list` / `#lob-create`, Settings' Deploy timer). 57 of the 78 page tests already fail on a clean
   `main` in the sandbox (see Live trial below), so compare against `main` before blaming a change.
6. Small: Quick play isn't on Rooms (not in the design; ask if wanted); no "Add friend" on an opponent in history (the
   game doesn't have it yet).

**How to check work here:** build with `node src/build.js`; serve with `python3 -m http.server 8766 --bind 127.0.0.1`
from the repo root; Chromium + Playwright are preinstalled (`require('playwright')`). Load
`/?ui=diorama&test` (?test skips the welcome screen; `&welcome` brings it back; `&server=http://stub.test` with
`page.route` / `page.routeWebSocket` stubs the game server, which this sandbox can't reach). The game's own tests:
`export NODE_PATH=/opt/node-tools/node_modules` and see "Running the UI tests in this sandbox" below.

## Live trial (2026-11-08): what is live, what to try

**On `main` (the live site) since the night of 2026-11-07/08,** if the final checks passed (see the commit log):
- **Every player gets the old UI**, as before (the build's default is `'classic'`).
- **The Diorama** is at `playnomansland.github.io/?ui=diorama` (this device remembers it; `?ui=classic` goes back).
- **Phones keep the old UI** whatever happens next: the switch can split by device (`PB_UI_DEFAULT=pc`), and the phone
  layouts (step 8) aren't done.

**What to try (on a PC):** Welcome / Sign up / Log in (open `?ui=diorama&welcome` in a private window), Vs computer,
Multiplayer → Rooms → Join / Create room, Profile (title, username, skins on a unit's sheet), Match history and a
replay, Friends (invite, a message), Settings (sound, Deploy timer, Stay logged in), the playlist, Puzzles, How to
play, Units, Rankings, Change battlefield, and a developer account's Developer rows.

**After the trial, the PC launch** is one build setting: `PB_UI_DEFAULT=pc node src/build.js`, commit `index.html`,
push to `main` (the Diorama for PCs, the old UI on phones and tablets). `PB_UI_DEFAULT=diorama` would be everywhere:
only after step 8.

**Test status (2026-11-08):** of the 78 tests that load the page, with the switch off 57 fail on a clean `main` too
(28 click a "Match settings" box that is no longer on the PLAY popup; the rest need the network, Google or the local
server's accounts, or time out under software 3D); none fails because of this work. With the switch on, the extra
failures are tests that click controls the Diorama doesn't have (Play vs Friend `#friend`, `#online`, Quick play, join
by code, the old Create-room sheet, the old playlist panel, `#tutorial-new`, `[data-tm]` / `#settings` in the old
popup): the test-rewrite session's work. Two real gaps the run found are fixed: the Deploy timer vs AI setting (now in
Settings) and uppercased sheet titles.

## The owner's decisions (2026-11-07)

- **Everything works with the real game before the launch.** Nothing reaches `main` except **one live trial** (below).
- **One live trial before the final launch:** when every step through 8 is done, push to `main` with the new UI behind
  the switch (`?ui=diorama`; the old UI stays the default), so the owner can try it on the live site. Fix what they
  find, then the launch: flip the default, merge, push. The owner does nothing by hand.
- **Join by code and Play vs Friend are gone.** Everything goes through Rooms: public rooms are listed, private ones
  are reached by inviting friends from Friends. Leave both out of the new UI and drop them from the game at the switch
  (their tests change too: see Tests).
- **Hold the other extra buttons** (Rewards, Encyclopedia, Tournaments outside developer mode, and the like): not in
  the new UI for now.
- **Developer buttons go in,** looking OK with the rest; no deep dive. The next session designs them quickly before
  starting (a proposal is under "Developer buttons").
- **The invite reward is the inviter's.** The one who sends the link gets the skin, so the game says "you get" to
  *them*: the menu's note ("Invite a friend. This golem skin is yours.") and the locked skin on the unit sheet already
  do. The welcome screen is the *invited friend's* screen, so it says "Your friend gets this golem's skin." (Matches
  `server/src/accounts.js` INVITE: the reward for inviting a friend, once the new friend has finished an online
  match.)

## Where things stand

- **The Diorama is a finished, tested mockup, not part of the game.** It lives in `design/diorama/` (`src/menu.html`,
  `src/base.css`, `build.js` → `diorama-menu.html`) and runs on sample data. The game (`src/`) has not been touched.
- **The game's UI** is `src/site-template.html` (10,868 lines on 2026-11-07; CSS inline at lines 18–920, plus `src/game.css`). `node
  src/build.js` fills its `/*PLACEHOLDERS*/` and writes `index.html`, which is **committed**: GitHub Pages serves `main`
  exactly as committed (no Pages build, `.nojekyll`). So "live" = `index.html` on `main`. The 3D files are not inlined:
  `index.html` loads `src/{camera3d,kaykit3d,models3d,scenery3d,render3d}.js?v=…` at runtime, so `src/` stays deployed.
- **Fully working** means: on the live site, every Diorama screen does what the old one did, with real accounts,
  rooms, matches, music and friends, on PC and on phones, with the game's test suite passing.

Line numbers below are for `src/site-template.html` (ST) on 2026-11-07; they drift, so search for the names.

## How to build it (recommended approach)

1. **A switch, not a rewrite in place.** Add the new UI alongside the old one, chosen by `?ui=diorama` or
   localStorage `pb-ui` (default: old). Every milestone is testable in the real game, the tests can run both ways, and
   the final step is flipping the default and removing the old home code. The switch is also what makes the one live
   trial possible: `main` gets the new UI with the old one still the default.
2. **Two new source files, inlined by `src/build.js`:** `src/diorama.css` (from `design/diorama/src/base.css` plus the
   `<style>` in `menu.html`) and `src/diorama.js` (the scene and the screens from `menu.html`'s module). Add
   placeholders (e.g. `/*DIORAMA_CSS*/`, `/*DIORAMA*/`) to ST and `src/build.js`. Keep the mockup as the visual
   reference; don't delete it.
3. **Keep the game's ids on the new controls** so the ~150 tests in `tools/tests/` keep working (list under Tests).
4. **Replace sample data with the game's own state and calls**, screen by screen (the table below). Every sample
   constant in `menu.html` has to go: `ROSTER` (the mockup inlines `src/default-roster.json`; **the game plays
   `demo-units.json`**, `/*DATA*/`, and Factions mode has its own), `PLAYERS`, `ROOMS`, `NOTE`, `ACCTS`, `HIST`, `ALL`,
   `FRIENDS`, `REQ_IN`, `REQ_OUT`, `THREAD`, `SET`, the playlist's song rows, and the `#acct=` / hash-state switches
   (keep the hash states only under `?test` for screenshots).

## The 3D island on the menu

- The game already has three.js (`vendor/three.module.min.js`, loaded with `import(THREE_URL)`, ST:6898) and loads
  Models3D/KayKit in `start3d` (ST:6920). Today the menu's only WebGL is `wizPic` (ST:3603: one still render, then the
  context is thrown away). The Diorama needs a **live renderer on the home screen**: load three + `kaykit3d.js` +
  `models3d.js` the same way, build the island (`menu.html`'s scene code), and **stop and dispose it when a match
  starts** (phase leaves `start`), recreating it on `showStart` (ST:3442). Don't run two WebGL contexts at once on
  phones.
- Floors: `Floors.floor` is already in `index.html` (`/*RENDER2D*/` includes `floors.js`); Snow's ground is
  `paintIce` in `render2d.js` (the mockup lifts it out in `design/diorama/build.js`; in the game call the real one).
- **The home battlefield must be the game's look pick**, `skinPick` in localStorage **`pb-skin`** (ST:2129, set by
  `lookSeg`/`wireLookSeg` 2166/2161), not the mockup's `nml-diorama-battlefield`. The looks are `Game.SKINS`
  (game.js:624). The menu music follows the look (`LOOK_MUSIC`, ST:1264), so Change battlefield must call the same
  setter. New room's battlefield is the host's `m.skin`.
- **Fallbacks:** no WebGL, `?board=2d`, or `fallback2d` (ST:6969) → a flat painted island (the look's floor in 2D) or
  today's `paintHomeBg`, with the same words and notes. Respect `prefers-reduced-motion` (the mockup's `still`).
- **Performance on phones:** the mockup uses a 2048 shadow map and pixel ratio up to 2 for screenshots; measure on a
  phone and lower both, pause the render loop when the tab is hidden or nothing moves.

## Screen by screen: what each Diorama part must call

| Diorama | Game today (ST line) | Notes |
|---|---|---|
| **Welcome** LOG IN / SIGN UP / PLAY AS GUEST | `drawWelcome` 3720, `home.screen='login'/'signup'`, `playAsGuest` 3735 | `pb-welcomed`; `?test` skips welcome (`HOME_AUTO` 3557), `?welcome` brings it back |
| Welcome invite note | `invitePending()` 4705 (`?invite=` 4707) | Shown to the invited friend: "Your friend gets this golem's skin." (the inviter's reward, as the server has it) |
| **Sign up / Log in** | `drawSignIn` 3745–3779, `cleanTagOk` 3780, `acctCall('guest',{tag})`, `acctUi.after` | **Google's own button** must render into the Google row: `acctGoogleButton(text)` 4757 (`signup_with` / `signin_with`), `GOOGLE_CLIENT_ID` 4684. Errors from `acctFail` 4750 go in the username row's note |
| "Stay logged in?" question after signing in | popup in `drawMenu` | Needs a Diorama version (a note on the menu with On / Off) |
| **Menu** PLAY, Puzzles, How to play, Units, Rankings | `drawMenu` 3784–3860 | Puzzles → `openPuzzles` 5817, How to play → `openHowTo` 4085 (still sheets: see "Not designed") |
| Units roster and sheet | `ROSTER`/`Shapes`, the game's tiers by cost | Use the game's live roster (`demo-units.json`, factions), `M.kindOf` as the mockup does |
| Rankings podium and STANDINGS | `openLeaderboard` 4008, `GET /leaderboard` | Real top five; Legend title line stays |
| Menu new-Title and new-Skin popups | `titlesUnseen` 3538, the skin popup in `drawMenu` | Need Diorama versions (a saffron note) |
| Resume / Back to match / Back to tournament | `home.ctx {resume, netBack}`, `showTour` | **Missing in the mockup.** Add a word above PLAY when there's a match to go back to |
| **Play** Vs computer | `startAiMatch` 6006 | Id `go` (43 tests click `#go`) |
| Multiplayer → 1v1 Standard / Ranked | `playPop` 3872, `wirePop` 3919, `rankedCheck` 3862, `rankedLogin` 3975 | Ranked needs Google; show the game's reasons |
| 2v2 (locked) | `duo.js`, `?duo=`, `duoJoin` | Exists for developers: unlock for `devMode()` |
| **Rooms** list, filter, search | `openLobby` 8951, `drawLobbyScreen` 9018–9058, WebSocket `/lobby`, `openSortSheet` 9073 | Real fields replace the sample ones (host, look, players, age/round, watchers, ranked score) |
| Join / Watch a room | lobby join/spectate calls in `drawLobbyScreen` | |
| **New room** Kind, Battlefield, Public/Private, Spectators, CREATE ROOM | `openCreateSheet` 9087, `hostLobby` 8104, `rankedHost` 3966 → `srvHost` 8721 | Then the room's waiting screen (not designed: keep the game's for now) |
| Developer buttons | the developer block of the PLAY popup (`playPop` 3872): factions, devtest, late game, duo (2v2), exploit bot, Load units, `startClaudeMatch`, Tournaments `openToursSheet` 3997 | **Missing in the mockup.** Design quickly first (see "Developer buttons"); `devMode()` only |
| **Profile** account state, name, title | `acct` 4686, `acctDraw` 4831, `openAccountSheet` 4877, `acctCall('title')` | `nameplate`/`TITLES` 3525 |
| Username | `acctRename` 4771, `acctCall('tag')`, `tagNext`, `tagWhen` 4760 | |
| Skins (on the unit sheet) | `acctCall('skin',{skin,worn})` 4820, `Shapes.SKINS` (shapes.js:233), `useSkins` | Only owned skins + the limited one locked, as in the mockup |
| Log out / Delete account | `acctLogOut` 4784, `acctDelete` 4796, `acctUi.outSure/sure` | |
| Keep it (guest → Google) | `acctGoogleButton`, `acctGoogle` | |
| Rewards: Discord (BABABABA), invite link | `rewardsCard` 5207, `wireRewardsCard` 5286, `openRewardsSheet` 5277, `rw` | **On hold** (owner, 2026-11-07). The menu's golem note ("Invite a friend") opens the game's Rewards sheet, restyled, until Rewards is designed (owner, 2026-11-07) |
| **Match history** | `openHistorySheet` 4561, `histLoad` 4629, `histMatchItem` 4606, `playReplay` 4581 | Tabs My matches / All online / Phone-to-phone (`HISTORY_URL`); **add Load more** (`hist.next`); Add friend on an opponent (`histFriendBtn`) |
| **Friends** dropdown | `openFriends` 5042, `fr` 4893, `frOk` (Google only), `frBadge`/`frBadgeN` 4896, hub `hubOpen` 4911 / `hubRecv` 4923 / `frTick` 4950, `frWhere` 4905 | Routes `friends`, `friend/add` (several players with a name → pick one), `invite`, `dm/list`, `dm/read`, `dm/report`, mute, remove. Game invites: `fr.invites` and its banner. Id `fr-open` |
| **Settings** dropdown | `openSoundSheet` 1977, `snd` 1276 (`phonebellum.sound.v1`), `musicOn` 1458, `setMusic` 1461, `pb-stay`, `talk.spectate`, `acctCall('ranked')` | Other apps' sound (`navigator.audioSession`), Report a bug → `openBugSheet` 1930, Playlists → `openPlaylist` 1703. Id `music-open` |
| In-match Settings: 2D/3D, phone layout, 3D quality | same sheet when in a match (`set3d` 7013, `setPhoneLayout` 2368) | The match HUD keeps opening Settings: the Diorama panel must show these there (or keep the old sheet in matches) |
| **Music player and playlist** | `SONGS` 1234, `PLAYLISTS` 1259, `playlist()` 1298, `playerHtml` 1492, `wirePlayer` 1524, `openPlaylist` 1703 (anchor / dock), `myMusic` (`phonebellum.playlists.v1`), `/account/music` | Real songs, Menu playlist / All music / + New (own playlists), Shuffle / Repeat. Ids `mp-now` |

## Not designed yet (keep the game's own, restyled, or design them first)

Puzzles list, How to play / Help, Leaderboard beyond the podium, Tournaments and the bracket (developers), the room you've made (waiting for a second player, chat), Report a bug, the Rewards sheet, and the whole
match (draft, deploy, battle HUD, results, replays). Until they're designed, they keep opening the game's `#sheet`
(ST:962; `closeSheet` 7870). Restyle `.sheet` with the Diorama tokens (ink panel, cut corner, Chakra Petch titles,
Courier notes) so they don't clash.

On hold, not in the new UI for now: Rewards, Encyclopedia (towers, leaders, maps), and the other extra buttons.

## Developer buttons (design quickly, before starting)

Developers (`devMode()`) get every feature. Today their extras sit in a developer block at the bottom of the PLAY
popup: Factions, Devtest, Late game, 2v2 (duo), Exploit bot, Load units, Vs Claude (`startClaudeMatch`), and
Tournaments. A proposal that fits the Diorama: on the Play screen, under VS COMPUTER and MULTIPLAYER, a typed
`Developer` kicker in DEV pink (`#FF5FC4`, as in Settings' Developer group and Profile's "developer mode is on"),
then the extras as one or two rows of small stencil words (the Settings dropdown's 20px words), each with a typed
note on hover. 2v2 unlocks in Multiplayer for developers. Settings already has the developer's Ranked play switch.
Show the owner one screenshot, adjust, then build.

## Phones (the biggest gap)

The game is played mostly on phones ("guest on this phone"), and **the mockup only has a phone layout for the main
menu** (`@media (max-width: 700px)` in `base.css`: the island on top, the words under it). Play, Rooms, New room,
Profile, Match history, Welcome, Sign up / Log in and both dropdowns need phone layouts before switching: words under
a smaller island, the dropdowns as full-width sheets from the top, the unit sheet as a bottom sheet. The game's own
breakpoints: `html.pc` (hover + fine pointer, width ≥ 900, ST:924), 640, 520, 380. Check 390×844 and 360×740.

## Fonts and styles

- The game loads Chakra Petch 500–700, IBM Plex Sans and Plex Mono, and Bangers from Google Fonts (ST:17). The
  Diorama uses **Chakra Petch Bold, Bricolage Grotesque and Courier Prime**: add the last two to that link (or
  self-host, as the mockup does with Chakra Petch).
- The game's inline CSS uses short flat names (`.btn`, `.seg`, `.bar`, `.pop`, `.hbtn`...). Scope the Diorama's CSS
  under `html.diorama` so the two don't fight while the switch exists.
- The match itself keeps the game's "Gilded low-poly glass" look (`docs/UI-STYLE.md`) until it's redesigned.

## Things that must keep working

- URL params: `?test`, `?welcome`, `?board=2d|3d`, `?server=`, `?invite=`, the Discord return `?code&state&error`,
  `?tour=` (+ `&watch`), cleaned by `urlDrop`. `?join=`, `?play=`, `?duo=` and `?peer*` belong to the phone-to-phone
  and join-by-code flows that are going: check what each one opens and keep only what Rooms or friends' invites use.
- `typingIn` (ST:1152) in every key handler; the global Escape handler (ST:8004); `aria-live` message lines; `role=
  dialog` and a heading in each panel; reduced motion.
- `tools/build-artifact.js` exact-string replaces (`<script src="peerjs.min.js">`, `id="lab-link"`, `</style>`,
  `const THREE_URL = './vendor/three.module.min.js';`, `<title>No Mans Land</title>`). `account-ui.js` test rewrites
  the `const GOOGLE_CLIENT_ID = '…';` line.
- The test hooks: `window.__pb`, `__tour`, `__pbRedraw`, `__pbSheet`, `__music`, `__bug`, `__acct`, `__fr`,
  `__rewards`, `__talk`.

## Tests

- **Game UI tests:** `tools/tests/*.js`, run one by one with `node tools/tests/<name>.js` against `python3 -m
  http.server 8766` at the repo root (Chromium at `/opt/pw-browsers/chromium`). They load `/?test…`. Ids they click,
  which the new controls must keep: `#go` (43 tests), `#acct-open`, `#music-open`, `#mp-now`,
  `#online`, `#lob-*`, `#fr-open`, `#pop-close`, `#puzzles-open`, `#w-guest`, `#home-in`, `#rw-*`,
  `#tour-new`, `#tour-practice`. Under `?test` the old UI opens the PLAY popup at once; the new one should open the
  Play screen at once so `#go` is there.
- **Tests of the flows that are going:** `#friend` (Play vs Friend, 22 tests) and `#code-in` (join by code, e.g.
  `server-match-ui`) start matches the old way, often as test setup. Rewrite them to set up through Rooms (host a
  room, join it), or retire the ones that only test the removed flows. List them first with `grep -l "#friend\|#code-in"
  tools/tests/*.js`.
- **Server tests:** `cd server && npm test`. **CI** only runs balance checks on PRs touching `src/**` and the
  server's tests; there are no UI tests in CI.
- **The Diorama's own checks** (`design/diorama/test/`): `collide.js` (text overlaps, note lines through words, text
  off screen, over `states.json` at given window sizes; it can save shots for `contact-sheet.py`) and `flow.js` (a
  39-step click-through). Point them at the built game (`index.html?ui=diorama&test…`) and extend `flow.js` with real
  steps (start a match vs the AI, open the lobby, join by code, sign in as a guest).
- Done = every `tools/tests` UI test passes with the switch **on and off**, the server tests pass, `collide.js` is
  clean at 1440×900, 1366×768, 1280×720, 1024×768, 1920×1080 **and two phone sizes**, and the owner has clicked
  through it.

## Order of work (each step testable in the real game)

1. **Scaffold:** the switch, `src/diorama.css` + `src/diorama.js` inlined by `src/build.js`, fonts, the island
   rendering on the home screen (real looks via `pb-skin`, Change battlefield), disposed when a match starts, 2D
   fallback. The old home hidden under the switch.
2. **Welcome, Sign up, Log in** on the real accounts and Google's button; Stay logged in; ids `w-guest` etc.
3. **Menu and Play:** Vs computer (`#go`) starts a real match; Resume / Back to match; Puzzles and How to play open
   their sheets; the invite note opens Rewards. **3.5:** Units on the game's roster; Rankings from `/leaderboard`; the
   new-Title / new-Skin notes.
4. **Multiplayer:** Rooms on the live lobby, Join / Watch, New room creating real rooms (look, privacy,
   spectators), Ranked gating, the developer buttons, 2v2 for developers. Friends' Invite brings them into your room.
5. **Profile:** the real account (title, username, skins on the unit sheet, log out, delete, keep it), Match history
   with replays and Load more.
6. **Friends and Settings** on the hub and `snd`; the in-match Settings items.
7. **Music:** the real player and playlists in the Diorama style.
8. **Phones:** every screen at 390×844 and 360×740. (Its own session, owner 2026-11-07.)
9. **Restyle the remaining sheets** and run every test with the switch on and off.
10. **The live trial:** `node src/build.js`, commit `index.html`, merge to `main` and push with the old UI still the
    default. Tell the owner the address (`playnomansland.github.io/?ui=diorama`) and what to try. Fix what they find.
11. **The launch:** flip the default, remove the old home code, Join by code and Play vs Friend (and their tests,
    rewritten), build, run everything once more, merge to `main` and push. Tell the owner the commit.

## Progress

**Step 1 done (2026-11-07):** `?ui=diorama` shows the Diorama instead of the old home, with the live island
(`screens/game-step1.jpg`). What is where:
- **The switch:** a script in ST's `<head>` puts `diorama` on `<html>` for `?ui=diorama` (kept as localStorage `pb-ui`;
  `?ui=classic` turns it off) and loads Bricolage Grotesque and Courier Prime only then. In the main script, `DIO` and
  `dio` (its state) sit right after `const qs`, since `hud()` → `syncHome()` runs early.
- **`src/diorama.css`:** the mockup's CSS scoped under `#dio` (state classes on `#dio` instead of `body`: `#dio.play`,
  `#dio.profile`...). `#dio` is fixed, z-index 4 like `#home`, so the game's sheets (z 5) open over it. Watch the
  game's global `canvas { width: 100%; height: 100% }`.
- **The markup:** the mockup's body inside `<div id="dio" hidden>` after `#home`.
- **`src/diorama.js`** (inlined into the main closure at `/*DIORAMA*/`): `dioSync(on)` from `syncHome` (shows or hides
  `#dio`, pauses or resumes the renderer); `dioDraw()` from `drawHome` (the old `#home-in` stays empty under the
  switch); `dioBoot()` runs `dioStart()` once: the mockup's module, with `three` from `import(THREE_URL)` and
  Models3D/KayKit from `load3d`. If three.js can't load at all, the old home comes back for that visit.
- **Renderer lifecycle:** `pause()` frees the WebGL renderer and swaps in a fresh canvas when the home hides;
  `resume()` makes a new one (the scene stays in memory). On phones (no `html.pc`) the board's 3D is stopped while the
  island is up and started again when the home hides (`start3d` waits while `dio.shown`). Pixel ratio 1.5 on phones.
- **Looks:** `LOOKS` is `Game.SKINS` with the island's art per look (`ART`); the ground is `Floors.floor` with
  `Floors.LOOKS[id].floor` on the Standard grid (Snow is now the glacier pass, white rim). Home look = `lookShown()`
  (`skinPick`/`pb-skin`; 'random' picks one); Change battlefield saves `skinPick` as the PLAY popup's Look row does. The
  menu's music does not follow the look (only a match's does), so nothing else to call.
- **Fallback:** no WebGL, `?board=2d` or a lost context → `#dio.flat`: the look's floor as a flat tilted picture, island
  notes hidden, the words as they are. `still` (no idle motion) with reduced motion and under automation (webdriver),
  so tests can click notes.
- **Still sample data** in every screen (the mockup's `ACCTS`, `ROOMS`, `HIST`, `FRIENDS`, `SET`...; `TITLES` renamed
  `DTITLES`); steps 2 to 7 replace them. The Units roster already uses the game's `units`. The hash states only work
  under `?test`; `window.__dio.sync(on)` (under `?test`) shows or hides the home by hand.

**Step 2 done (2026-11-07):** Welcome, Sign up and Log in run on the game's accounts (`screens/game-step2.jpg`).
- `dioPaint()` (the Diorama's `drawHome`) follows `home.screen`: 'welcome' / 'signup' / 'login' open the door screens,
  anything else closes them. The buttons set `home.screen` and call `drawHome()`, as the old screens did; ← Back from
  Sign up / Log in goes to 'welcome'.
- Play as guest is the game's `playAsGuest` (message in `#home-msg` on the welcome screen). Sign up as a guest
  (`#su-guest`, username `#su-tag` = `home.tag`) calls `acctCall('guest', {tag})`; a bad name (`cleanTagOk`, or the
  server's 'bad tag') turns the Username row saffron with the rule; other failures (`acctFail`) go in `#acct-msg`.
- Google's own button renders into `#acct-google` in the Google row (`acctGoogleButton('signup_with' |
  'signin_with')`); `acctUi.after` keeps the typed username on a new Google account and calls `homeDone`, as the old
  Sign up does. Off (no client id, or accounts off): a line says so.
- **Stay logged in?** (the old menu popup) is a note hanging off the account button (`#dio-stay`): Yes / No call
  `setStay`. Asked once after making an account or logging in (`stayPref() == null`), never under `?test`. The Change
  battlefield note steps aside while it shows.
- The invited friend's golem note shows on the welcome screen when `invitePending()`.
- `A` (the Diorama's player) is now the game's `acct` (same fields: tag, google, dev, titles, title, skins, tagNext);
  the sample accounts only under `?test#acct=`. The account button shows the real name. Profile's actions still
  change `A` locally (step 5).
- **The game's global classes leak in:** `.seg` (a box), `.hint` (colour), `.tiers`, `.ptitle`, `.fr-list`, `.fr-inv`.
  A `:where(...)` reset at the top of `src/diorama.css` clears them at `#dio`'s weight. Watch for more.
- With the switch off, `#dio` is removed from the page at startup (its markup reuses `#w-guest`, `#home-msg`...;
  Playwright's strict locators would see two).
- Checked against a stubbed account API (the sandbox's local server answers 503 to account routes, on `main` too):
  welcome → guest → menu with the name → Stay note → Yes; Sign up with a bad, a refused and a good name; Log in,
  Sign up ↔ Log in, Back. Google's script throws `gis is not defined` headless here, on the old screens too.

**Step 3 split (owner, 2026-11-07):** 3 = Vs computer, Resume / Back to match / Back to tournament, Puzzles and How to
play, the invite note → Rewards, `?test` opening Play; 3.5 = Units on the game's roster, Rankings from `/leaderboard`,
the new-Title / new-Skin notes.

**Step 3 done (2026-11-07):**
- **The Play screen is the old PLAY popup:** `home.pop` says it's open (`openPlay` / `closePlay` set it; `dioPaint`
  follows it). So `?test` (`HOME_AUTO`) opens Play at once and `#go` is there, and after a match you land back on Play,
  as the old popup stayed open.
- **Vs computer** is `#go`: `home.mode = 'normal'`, `matchKind = 'standard'`, `lateGame = false`, `startAiMatch()`.
  The old popup's option rows (pack, map, characters, deploy timer, Have a code?) aren't on the Play screen: tests
  that set them through the popup need another way under the switch (step 9).
- **Resume match / Back to match / Back to tournament** (`home.ctx.resume`, `netBack`, `tour.role`) are typed words on
  an ink shard above PLAY (`#dio-backto`), with the old ids `#resume`, `#net-resume`, `#tour-back` and the old calls.
- **Puzzles** (`#puzzles-open`) and **How to play** (`#how`) open `openPuzzles` / `openHowTo`; pointing at them still
  moves the camera. A newcomer's Puzzles says "start here" in saffron (the old "New here? Try the tutorial puzzles").
- **The golem's invite note** (`.rw-note`) opens `openRewardsSheet()` (click, Enter or Space).
- The Diorama menu does what the old `drawMenu` did quietly: `rankedCheck()` (also fills `home.board` for Rankings),
  the `me` refresh, `discordFinish()`.

**Step 3.5 done (2026-11-07):**
- **Units** stand on the game's roster (`units`: demo-units.json, a Counter Lab set or Factions), tiers by
  `Game.tierOf`; the tier tabs are made for the tiers there are, and the roster is built again when `units` changes.
  Skins and titles are the game's (`Shapes.SKINS` with its `limited`, `TITLES` / `TITLE_WHY` as `DTITLES`). Wearing a
  skin on the unit sheet still only changes it locally (step 5 sends it).
- **Rankings:** the podium is the top five of `GET /leaderboard` (`home.board`, from `rankedCheck` or the leaderboard
  sheet; `dio.api.board()` redraws it); an empty spot is a blank tile with "nobody yet" and no unit. The line under
  STANDINGS says the Legend rule and how long the month has left (or that there are no results yet, or no server).
  **Full leaderboard →** (`#lb-open`, the old menu's id) opens the game's leaderboard sheet.
- **New Title / new skin** (the old menu's popups): the account note off the account button (`#dio-stay`), after
  Stay logged in?: the new titles in their colours with why, or the new skin with its line; **Nice** (`#title-ok`,
  `#skin-ok`) calls `titlesSeen()` / `skinsSeen()`. Not under `?test`, as before.
- The Diorama's Escape runs in the capture phase, so with a game sheet open one Escape only closes the sheet.
- Checked with a stubbed server (leaderboard, account): the titles then the skin announced once per phone, the
  Legend line, Full leaderboard, four tier tabs, tier 2 on the island.

**Step 4 done (2026-11-07):** Multiplayer on the live lobby (`screens/game-step4.jpg`).
- **Rooms is `home.screen === 'lobby'`** (the game's state; a kind calls the same thing `openLobby` does). `dioPaint`
  shows it (`showRooms`: `lobbyOpen()`) or hides it (`lobbyClose()`); ← Play goes back to the Play screen. The game's
  `lobbyDraw` hands over to the Diorama (`dio.api.rooms()`) under the switch.
- **The list** is `lobbySorted()` filtered to the kind token and the search line (host, battlefield = the listing's
  `look`, map): `host's room`, ★ leaderboard score on ranked (`boardScore`), No watchers, `battlefield · players · age
  or round · watching`, JOIN (`srvJoin` / `duoJoin`) or WATCH (`lobbyWatch`), with `home.back = 'lobby'` so the end of
  the match comes back to Rooms. Ids: `#lob-list`, `#lob-create`, `#lob-msg` (the game's `lobMsg`). No Quick play and
  no join by code (owner's decision for the code; Quick play wasn't in the design: tests that use `#lob-quick` or
  `#lob-code` need another way under the switch).
- **New room** shares the game's `create` choices (mode, pub, spectate). CREATE ROOM is the old create sheet's button:
  `srvHost(o)` / `srvHost({ ranked })` / `duoHost(o)`. Ranked without Google opens `rankedLogin`, whose "instead"
  button now makes a Standard room (the old one hosted phone-to-phone). The battlefield row sets `skinPick` for the
  room only (it goes out in the room's hello as `skin`); `restoreLook` puts your own back from `pb-skin` when the home
  shows again. 2v2 has no Spectators row.
- **Ranked gating** on Multiplayer's 1v1 Ranked: "switched off right now" / "needs the game server" (disabled), or
  "needs a Google login" (`rankedReady`), else "it goes on your record".
- **Developer** (`devMode()`): the designed rows call the old popup's functions: Factions / Devtest (`matchKind`,
  disabled without `factionsReady` / `devReady`), Late game (`lateGame = true`, vs AI; vs Friend went with Play vs
  Friend), Vs Claude (`startClaudeMatch`, only with `sampleFn`), Exploit bot (`exploitTactic`, the tactics from
  `ExploitBot.TACTICS`; the note is the name, the win rate and the first sentence), Tournaments (`openToursSheet`),
  Load units (`openLoader`), Counter Lab (a link to lab.html; left out of the artifact build). 2v2 opens for
  developers (`devMode() || lob.dev`).
- Not yet: Friends' Invite into your room (step 6, with the Friends dropdown).
- Checked with stubbed `/lobby` and `/room` sockets (`page.routeWebSocket`): the list, count, search, kinds, ★ score,
  Join, New room's hello (`public`, `spectate: false`, `skin`), back to Rooms with your own battlefield, the developer
  rows, Late game starting.

**Step 5 done (2026-11-07):** Profile and Match history on the game's account (`screens/game-step5.jpg`).
- **Profile** (`#acct-open`, the old id) shows `acct` and refreshes it (`me`) on opening. Each change goes to the
  server and its answer is `acctTake`n (`pfDo`, message in `#pf-msg`): Title (`acctCall('title')`), Username
  (`acctCall('tag')`; locked until `tagNext` with "You can change it again on …" via `tagWhen`, developers any time),
  Keep it (a guest: Google's own button in `#acct-google`, `acctUi.after` redraws), Log out (`#acct-out`; a guest taps
  twice; Profile closes and `acctLogOut` goes to the welcome screen), Delete account (`#acct-del`, tap twice,
  `acctDelete`), no account: Play as a guest (`#acct-guest`) and Google.
- **Skins** on the unit sheet go to the server: a skin `acctCall('skin', { skin, worn: true })`, Plain takes the worn
  one off (`worn: false`); then `render()` so the board's models follow.
- **Match history**: My matches (`acctCall('history', { before })`, a row per match: WON / LOST / DRAW / Unfinished,
  `vs` the opponent, `kind · rounds won–lost (or you left / they left) · map · when · dealt, took`, its rounds fold
  out with REPLAY → `playReplay`) and All online (`GET /history`, a row per battle; no replay, as before). **Load
  more** (`#h-more`) follows the server's `next`. After a replay, "Back to match history" comes back to the
  Diorama's history (`dio.api.history()`); a replay that can't load says so in `#h-msg`. No Add friend on an
  opponent yet: the game's `histFriendBtn` is still empty.
- **A game bug fixed on the way:** `acctFail` checked the general 429 before 'too soon', so a refused rename said
  "Too many tries" instead of when the next change is; the order is swapped (old UI too).
- Checked against a stubbed account server: refresh, title, a refused and a saved rename, Keep it's button, Plain /
  Champion on the Brute's sheet, both history tabs, Load more, a replay that fails, a guest's double-tap Log out.

**Step 6 done (2026-11-07):** Friends and Settings on the game (`screens/game-step6.jpg`).
- **Friends** (`#fr-open`, the dropdown `#dd-friends`) draws from the game's `fr` (the hub keeps it live; `frRedraw`
  now also redraws the dropdown, `dio.api.friends()`). The badge is the game's `frBadge` (`.fr-badge`). Rows: the dot,
  the name and title, where they are (from `f.status`), INVITE (online in the menu; folds out Standard / Ranked when
  ranked can be played, then the game's `frInvite`: a private room and the hub's invite), WATCH (a friend in a match
  with a code: `lobbyWatch`), messages with the unread count, ⋯ (Mute, Remove twice: `frAct`). Requests: Accept /
  Decline / Cancel (`frAct`). Add by username (`#fr-tag`, `#fr-add`; several players with a name → pick one), messages
  in `#fr-msg` (the game's `frNote`). Game invites at the top: JOIN (`frJoin`) / Decline. A guest or no account: why it
  needs Google, and Google's button.
- **A thread** (`openThread`): `dm/list`, the game's `frThreadDraw` into `#fr-thread`, SEND over the hub, a live message
  lands in it (`frDm` knows the dropdown's thread is open: `dio.frOpen`), Mute, Report (twice, `dm/report`).
- **Settings** (`#music-open`, `#dd-settings`): Music (`setMusic`), Music volume, Sound effects, Effects volume (with a
  sample), Other apps' sound where the browser has it, Chat, Emotes (`snd`, `saveSound`), Stay logged in (`setStay`),
  Developer: Ranked play (`acctCall('ranked')`), Playlists (`openPlaylist`, the game's sheet until step 7) and Report a
  bug (`openBugSheet`). The mockup's general Spectators switch is gone: the game sets spectators per room (New room).
- **In a match** the HUD keeps opening the old Settings sheet (it has the 2D / 3D board, the phone layout and the 3D
  quality); it gets the Diorama's look in step 9.
- The game's invite banner and friend toasts (`.fr-banner`, `.fr-toast`, outside `#dio`) take the Diorama's look while
  the switch is on.
- Checked with a stubbed account server and hub socket: badge, rows, Invite → private room, a thread both ways, a live
  invite, Requests, Accept, Add with several matches, Esc, Settings to the game's storage, Report a bug.

**Step 7 done (2026-11-07):** the music player and playlists on the game's music engine (`screens/game-step7.jpg`).
- **The player** (bottom right): the song playing (`ctlPl().song()`, title by artist), what plays (`nowLabel`), the
  progress line (`#mp-bar`: the game's timer sets its `scaleX`), Back / Play-Pause / Next (`#mp-back`, `#mp-play`,
  `#mp-next`, what the old `wirePlayer` did: `menuPaused`, `musicGo`, `.next()`, `.back()`). The game's `showPlayer` now
  also redraws the Diorama's (`dio.api.music()`).
- **PLAYLIST** (`#mp-now`) grows the list up out of the player (`#pl`, `#dio.music-open`): tabs Menu playlist, All
  music, your own (`myMusic.lists`) and + New; the songs of a tab, the playing one marked (a click: `playFrom`); Shuffle
  (`#mp-shuffle`) and Repeat (`#mp-repeat`) on `snd`; your own: Edit and Delete (twice). + New / Edit: a name and songs
  from All music in the order tapped, Create / Save as the old panel (up to 20; `musicChanged` keeps them on the
  account). Settings' Playlists opens this list. No song lengths (the game doesn't know them before a song loads).
- **In a match** the HUD's music button keeps the game's own panel (it has the map's Adaptive music tab).
- Note for test runs: some tests (music-account-ui, ...) start their own web server on 8766; stop yours first.

**Step 9 (2026-11-07):**
- **The game's sheets** (`#sheet`: Puzzles, How to play, Leaderboard, Rewards, Report a bug, Tournaments, Load units,
  Sort, the log-in sheet, the in-match Settings...) take the Diorama's look while the switch is on (end of
  `src/diorama.css`, scoped to `html.diorama .sheet`): the game's tokens (`--panel`, `--ink`, `--gold`, the fonts) point
  at the Diorama's inside a sheet, then an ink panel with a cut corner, stencil titles, buttons as stencil words (the
  primary on the saffron shard), segments with the saffron shard on the picked one, dashed inputs, Close as a typed
  link. Centred on a PC, a bottom sheet on a phone. Rewards' cards keep their rounded edges (Rewards is on hold).
- **A build-time default:** the `<head>` switch reads `DEF` (`/*UI_DEFAULT*/`): `node src/build.js` builds `'classic'`;
  `PB_UI_DEFAULT=diorama node src/build.js` builds the Diorama on by default (`?ui=classic` still turns it off). That
  is how the suite runs with the switch on, and the launch's flip (step 11). Never commit an index.html built with it
  before the launch.

**Running the UI tests in this sandbox:** `export NODE_PATH=/opt/node-tools/node_modules` (they require
`playwright-core`), and some tests launch `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`: link it to
`/opt/pw-browsers/chromium`. These fail on a clean `main` here too (no server `node_modules`, and so on), so compare
against `main` before blaming a change: account-ui, board-switch, game3d, tutorial-ui, server-match-ui, rewards-ui,
skins-ui, server-history-ui. `cd server && npm ci` gives the tests their local game server (wrangler); a test killed by a
timeout leaves `wrangler dev` / `workerd` running and the next run's accounts fail (`g.player` undefined): `pkill -f
"wrangler dev"; pkill -f workerd` between runs.

## Answered by the owner (2026-11-07, second session)

- **Developer buttons:** proposal built into the mockup (`screens/dev-play.jpg`, state `#still,play,multi,acct=dev,xb=steel`),
  waiting for the owner's OK before the integration starts. Top left on Play, clear of the choices: a pink DEVELOPER
  tag (ink type: pink type doesn't read on saffron), then rows of small words: Vs computer (Factions, Devtest, Late
  game, Vs Claude: each starts at once), Exploit bot (Off and the six tactics: a pick, on the ink shard), Tools
  (Tournaments, Load units, Counter Lab). One typed note under the rows follows the pointer and falls back to the
  exploit bot's state. 2v2 unlocks in Multiplayer and New room with a DEV tag. Late game vs Friend goes with Play vs
  Friend. The Level-up cost row stays a `?test`-only setting.
- **The "Invite a friend" note** opens the game's Rewards sheet (restyled) while Rewards is on hold.
- **Designed before the launch:** Puzzles, How to play, and the room you're waiting in. The match keeps the game's
  look (sheets restyled) for now.
- **Branch:** the work is on `claude/nice-mendel-scnrpy`.
- **Own sessions:** the phone layouts (step 8) and the test-suite rewrite (the `#friend` / `#code-in` tests) are
  done in their own sessions, not in the main integration one.
- **Working style:** fewer screenshots (show only the final one) and test summaries, not full output.

## Still to ask the owner

- After the live trial: make the Diorama the PC default (`PB_UI_DEFAULT=pc`)?
