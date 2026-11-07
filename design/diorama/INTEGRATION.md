# Handoff: putting the Diorama UI into the game

Written 2026-11-07 at the end of the session that finished the mockup. Read `design/diorama/HANDOFF.md` first (the
design language and every screen), then this file. Work on a branch; nothing reaches `main` until the whole list below
works in the real game (the owner's call: "before pushing to main I want everything to work with the code").

## Where things stand

- **The Diorama is a finished, tested mockup, not part of the game.** It lives in `design/diorama/` (`src/menu.html`,
  `src/base.css`, `build.js` → `diorama-menu.html`) and runs on sample data. The game (`src/`) has not been touched.
- **The game's UI** is `src/site-template.html` (10,817 lines; CSS inline at lines 18–920, plus `src/game.css`). `node
  src/build.js` fills its `/*PLACEHOLDERS*/` and writes `index.html`, which is **committed**: GitHub Pages serves `main`
  exactly as committed (no Pages build, `.nojekyll`). So "live" = `index.html` on `main`. The 3D files are not inlined:
  `index.html` loads `src/{camera3d,kaykit3d,models3d,scenery3d,render3d}.js?v=…` at runtime, so `src/` stays deployed.
- **Fully working** means: on the live site, every Diorama screen does what the old one did, with real accounts,
  rooms, matches, music and friends, on PC and on phones, with the game's test suite passing.

Line numbers below are for `src/site-template.html` (ST) on 2026-11-07; they drift, so search for the names.

## How to build it (recommended approach)

1. **A switch, not a rewrite in place.** Add the new UI alongside the old one, chosen by `?ui=diorama` or
   localStorage `pb-ui` (default: old). Every milestone is testable in the real game, the tests can run both ways, and
   the final step is flipping the default and removing the old home code. (If the owner agrees, milestones can even go
   to `main` behind the switch so they can try it live; ask first: by default nothing goes to `main` until the end.)
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
  `lookSeg`/`wireLookSeg` 2144/2161), not the mockup's `nml-diorama-battlefield`. The looks are `Game.SKINS`
  (game.js:624). The menu music follows the look (`LOOK_MUSIC`, ST:1264), so Change battlefield must call the same
  setter. New room's battlefield is the host's `m.skin`.
- **Fallbacks:** no WebGL, `?board=2d`, or `fallback2d` (ST:6969) → a flat painted island (the look's floor in 2D) or
  today's `paintHomeBg`, with the same words and notes. Respect `prefers-reduced-motion` (the mockup's `still`).
- **Performance on phones:** the mockup uses a 2048 shadow map and pixel ratio up to 2 for screenshots; measure on a
  phone and lower both, pause the render loop when the tab is hidden or nothing moves.

## Screen by screen: what each Diorama part must call

| Diorama | Game today (ST line) | Notes |
|---|---|---|
| **Welcome** LOG IN / SIGN UP / PLAY AS GUEST | `drawWelcome` 3670, `home.screen='login'/'signup'`, `playAsGuest` 3685 | `pb-welcomed`; `?test` skips welcome (`HOME_AUTO` 3507), `?welcome` brings it back |
| Welcome invite note | `invitePending()` 4655 (`?invite=` 4657) | The owner wants "**You** get this golem's skin". The server's rule (`server/src/accounts.js` INVITE, checked 2026-11-07) gives it to the **inviter**, once the new friend has finished an online match: ask the owner whether to change the rule (server + `accounts.js` tests) or the line |
| **Sign up / Log in** | `drawSignIn` 3695–3729, `cleanTagOk` 3730, `acctCall('guest',{tag})`, `acctUi.after` | **Google's own button** must render into the Google row: `acctGoogleButton(text)` 4757 (`signup_with` / `signin_with`), `GOOGLE_CLIENT_ID` 4634. Errors from `acctFail` 4700 go in the username row's note |
| "Stay logged in?" question after signing in | popup in `drawMenu` | Needs a Diorama version (a note on the menu with On / Off) |
| **Menu** PLAY, Puzzles, How to play, Units, Rankings | `drawMenu` 3734–3810 | Puzzles → `openPuzzles` 5767, How to play → `openHowTo` 4035 (still sheets: see "Not designed") |
| Units roster and sheet | `ROSTER`/`Shapes`, the game's tiers by cost | Use the game's live roster (`demo-units.json`, factions), `M.kindOf` as the mockup does |
| Rankings podium and STANDINGS | `openLeaderboard` 3958, `GET /leaderboard` | Real top five; Legend title line stays |
| Menu new-Title and new-Skin popups | `titlesUnseen` 3488, the skin popup in `drawMenu` | Need Diorama versions (a saffron note) |
| Resume / Back to match / Back to tournament | `home.ctx {resume, netBack}`, `showTour` | **Missing in the mockup.** Add a word above PLAY when there's a match to go back to |
| **Play** Vs computer | `startAiMatch` 5956 | Id `go` (43 tests click `#go`) |
| Multiplayer → 1v1 Standard / Ranked | `playPop` 3822, `wirePop` 3869, `rankedCheck` 3812, `rankedLogin` 3925 | Ranked needs Google; show the game's reasons |
| 2v2 (locked) | `duo.js`, `?duo=`, `duoJoin` | Exists for developers: unlock for `devMode()` |
| **Rooms** list, filter, search | `openLobby` 8900, `drawLobbyScreen` 8967–9007, WebSocket `/lobby`, `openSortSheet` 9022 | Real fields replace the sample ones (host, look, players, age/round, watchers, ranked score) |
| Join by room code | `#code-in` / `#join` → `srvJoin` 8681, `joinMatch` 8482, `tourJoin`, `duoJoin` | **Missing in the mockup.** The search line says "player or room code": a code in it should join |
| Join / Watch a room | lobby join/spectate calls in `drawLobbyScreen` | |
| **New room** Kind, Battlefield, Public/Private, Spectators, CREATE ROOM | `openCreateSheet` 9036, `hostLobby` 8054, `rankedHost` 3916 → `srvHost` 8670 | Then the room's waiting screen (not designed: keep the game's for now) |
| Play vs Friend (phone to phone) | `#friend` → `hostLobby` | 22 tests use `#friend`; give it a place (e.g. under Multiplayer) |
| Developer items in the PLAY popup | factions, devtest, late game, duo, exploit bot, Load units, `startClaudeMatch`, Tournaments `openToursSheet` 3947 | **Missing in the mockup.** Suggest a Developer group on Play for `devMode()` only |
| **Profile** account state, name, title | `acct` 4636, `acctDraw` 4781, `openAccountSheet` 4827, `acctCall('title')` | `nameplate`/`TITLES` 3475 |
| Username | `acctRename` 4721, `acctCall('tag')`, `tagNext`, `tagWhen` 4710 | |
| Skins (on the unit sheet) | `acctCall('skin',{skin,worn})` 4820, `Shapes.SKINS` (shapes.js:233), `useSkins` | Only owned skins + the limited one locked, as in the mockup |
| Log out / Delete account | `acctLogOut` 4734, `acctDelete` 4746, `acctUi.outSure/sure` | |
| Keep it (guest → Google) | `acctGoogleButton`, `acctGoogle` | |
| Rewards: Discord (BABABABA), invite link | `rewardsCard` 5157, `wireRewardsCard` 5236, `openRewardsSheet` 5227, `rw` | **Missing in the mockup** (only the golem note). Suggest a Rewards row on Profile |
| **Match history** | `openHistorySheet` 4511, `histLoad` 4579, `histMatchItem` 4556, `playReplay` 4531 | Tabs My matches / All online / Phone-to-phone (`HISTORY_URL`); **add Load more** (`hist.next`); Add friend on an opponent (`histFriendBtn`) |
| **Friends** dropdown | `openFriends` 4992, `fr` 4843, `frOk` (Google only), `frBadge`/`frBadgeN` 4846, hub `hubOpen` 4861 / `hubRecv` 4873 / `frTick` 4900, `frWhere` 4855 | Routes `friends`, `friend/add` (several players with a name → pick one), `invite`, `dm/list`, `dm/read`, `dm/report`, mute, remove. Game invites: `fr.invites` and its banner. Id `fr-open` |
| **Settings** dropdown | `openSoundSheet` 1972, `snd` 1271 (`phonebellum.sound.v1`), `musicOn` 1453, `setMusic` 1456, `pb-stay`, `talk.spectate`, `acctCall('ranked')` | Other apps' sound (`navigator.audioSession`), Report a bug → `openBugSheet` 1925, Playlists → `openPlaylist` 1698. Id `music-open` |
| In-match Settings: 2D/3D, phone layout, 3D quality | same sheet when in a match (`set3d` 6963, `setPhoneLayout` 2347) | The match HUD keeps opening Settings: the Diorama panel must show these there (or keep the old sheet in matches) |
| **Music player and playlist** | `SONGS` 1229, `PLAYLISTS` 1254, `playlist()` 1298, `playerHtml` 1487, `wirePlayer` 1519, `openPlaylist` 1698 (anchor / dock), `myMusic` (`phonebellum.playlists.v1`), `/account/music` | Real songs, Menu playlist / All music / + New (own playlists), Shuffle / Repeat. Ids `mp-now` |

## Not designed yet (keep the game's own, restyled, or design them first)

Puzzles list, How to play / Help, Encyclopedia (towers, leaders, maps), Leaderboard beyond the podium, Tournaments and
the bracket, the room you've made (waiting for a second player, chat), Report a bug, the Rewards sheet, and the whole
match (draft, deploy, battle HUD, results, replays). Until they're designed, they keep opening the game's `#sheet`
(ST:962; `closeSheet` 7820). Restyle `.sheet` with the Diorama tokens (ink panel, cut corner, Chakra Petch titles,
Courier notes) so they don't clash.

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

- URL params: `?test`, `?welcome`, `?board=2d|3d`, `?server=`, `?peer*`, `?join=`, `?play=`, `?duo=`, `?tour=` (+
  `&watch`), `?invite=`, the Discord return `?code&state&error` (ST:4658), cleaned by `urlDrop`.
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
  which the new controls must keep: `#go` (43 tests), `#friend` (22), `#acct-open`, `#music-open`, `#mp-now`,
  `#online`, `#lob-*`, `#fr-open`, `#pop-close`, `#puzzles-open`, `#w-guest`, `#home-in`, `#rw-*`, `#code-in`,
  `#tour-new`, `#tour-practice`. Under `?test` the old UI opens the PLAY popup at once; the new one should open the
  Play screen at once so `#go` is there.
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
4. **Multiplayer:** Rooms on the live lobby, join by code, Join / Watch, New room creating real rooms (look, privacy,
   spectators), Ranked gating, Play vs Friend, the developer items, 2v2 for developers.
5. **Profile:** the real account (title, username, skins on the unit sheet, log out, delete, keep it), Rewards,
   Match history with replays and Load more.
6. **Friends and Settings** on the hub and `snd`; the in-match Settings items.
7. **Music:** the real player and playlists in the Diorama style.
8. **Phones:** every screen at 390×844 and 360×740.
9. **Restyle the remaining sheets**, run every test with the switch on and off, fix, then **flip the default**,
   remove the old home code (or keep `?ui=old` for a while), `node src/build.js`, commit `index.html`, merge to
   `main` and push. Tell the owner the commit.

## Questions for the owner (ask at the start)

- Invite reward wording: the inviter or the new player gets the golem skin (or both)?
- May milestones go to `main` behind `?ui=diorama` so they can try them on the live site, or only at the end?
- Where should these live: Join by code, Play vs Friend, the developer items, Rewards, Encyclopedia?
- Which "not designed" screens must be designed before the switch, and which can keep the restyled sheet for now?
