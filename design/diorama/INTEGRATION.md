# Handoff: putting the Diorama UI into the game

Written 2026-11-07 at the end of the session that finished the mockup. Read `design/diorama/HANDOFF.md` first (the
design language and every screen), then this file. Work on a branch (`claude/nice-mendel-scnrpy` has the mockup and
is level with `main` as of 2026-11-07; merge `main` in again before starting, the game moves fast).

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
3. **Menu and Play:** Vs computer (`#go`) starts a real match; Resume / Back to match; Units on the game's roster;
   Rankings from `/leaderboard`; Puzzles and How to play open their sheets; the new-Title / new-Skin notes.
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

- Whether the developer buttons' design (`screens/dev-play.jpg`) is OK, or what to change.
