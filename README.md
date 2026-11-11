# No Mans Land

A small auto-battler for the browser (phone and PC). Buy squads, place them, and watch the armies fight. Play the AI, solve the tutorial puzzles, or play others live (1v1, ranked, tournaments; 2v2 and factions as developer tests). Live at https://playnomansland.github.io/.

This README is the short map. The detail lives in topic docs: read only the one your task touches.

## Where to read

| Working on | Read |
|---|---|
| Match rules, economy, the match screen, tutorial and puzzles, Otto | [docs/GAMEPLAY.md](docs/GAMEPLAY.md) |
| Units, towers, skills, balance changes | [docs/UNITS.md](docs/UNITS.md) (+ `FROST-OBELISK.md`, `STAT-LEVERS.md`, `AWARENESS.md`) |
| Maps and terrain | [docs/MAPS.md](docs/MAPS.md) |
| Live matches, lobby, friends, history, rewards, leader draft, tournaments | [docs/ONLINE.md](docs/ONLINE.md), then [docs/SERVER.md](docs/SERVER.md), `LOBBY.md`, `FRIENDS.md` |
| 2v2 and DEVTESTLATEGAME | [docs/2V2.md](docs/2V2.md), `MPB-2V2.md` (2v2 buildings), `mpb-notes/` |
| Factions | [docs/FACTIONS.md](docs/FACTIONS.md), `FACTIONS-DEVTEST.md` |
| A source file or tool in detail (music, sound, 3D, phone layout, tests) | [docs/CODE.md](docs/CODE.md) |
| The Diorama UI (the PC UI) | `design/diorama/HANDOFF.md`, then `design/diorama/INTEGRATION.md` |
| UI look | `docs/UI-STYLE.md`, `docs/art-direction.md` |
| 3D performance, model triangles | `docs/PERFORMANCE.md`, `docs/RENDER-BUDGET.md` |
| Balance Lab, exploits | `docs/BALANCE_LAB.md`, `docs/LAB-RESULTS-2026-11.md`, `docs/EXPLOITS-2026-11.md` |
| What's planned | `docs/ROADMAP.md`, `docs/FFA.md` + `docs/HANDOFF-FFA.md` (free-for-all, not built) |
| Leader heads, models | `models/README.md`, `models/heads/HANDOFF.md` |

`PATCH-NOTES.md` is the player-facing changelog, newest first. Add an entry when players will notice a change; the build reads its newest date for the game version.

## Build

The source is in `src/`; `index.html` (the game), `lab.html` (Counter Lab) and `lab3d.html` (3D test) are built files, committed. After changing `src/`, rebuild from the repo root with:

```bash
PB_UI_DEFAULT=pc node src/build.js
```

`PB_UI_DEFAULT=pc` gives computers the Diorama UI and phones the old one, as live. A plain `node src/build.js` builds `classic` (the old UI everywhere), so don't use it. Add `--diorama-page` to also rebuild `design/diorama/game.html`, the Diorama's test page.

## Test

- Browser checks are in `tools/tests/` (Playwright). Install once with `cd tools && npm i`. They expect the site served on port 8766 (`python3 -m http.server 8766`) and, for two-player checks, `node tools/peer-server.js` on port 9000. Some start their own servers on other ports (said at the top of each file). `PB_BOARD=3d node tools/tests/<check>.js` runs a 2D check on the 3D board.
- Headless checks (no browser) are also in `tools/tests/`, e.g. `node tools/tests/duo.js`.
- Server tests: `cd server && npm test`.
- `node tools/tests/snapshots.js before`, then `node tools/tests/snapshots.js after before`, for changes that shouldn't alter what players see.

## Deploy

Pushing to `main` deploys both:
- the site to GitHub Pages (`.github/workflows/pages.yml`);
- the game server to Cloudflare (`.github/workflows/server-deploy.yml`), when `server/`, `src/engine.js`, `src/game.js`, `src/referee.js`, `src/duo.js`, `src/tournament.js` or `src/*.json` change. The server tests run first.

So run the checks for what you changed before pushing to `main`. Other sessions push to `main` too: fetch and rebase first.

## Source files (`src/`)

- `engine.js`: the battle engine. Plain arithmetic only, so every phone and the server play the same fight. Draws nothing.
- `game.js`: match rules (gold, rounds, maps, leaders, towers, the AI, what each player may see of the other). Draws nothing.
- `referee.js`: the server's referee of a live match: players send actions, never state.
- `duo.js`: 2v2. `mpb.js`: 2v2 buildings, the Vault and artifacts. `tournament.js`: tournaments.
- `site-template.html` + `game.css`: the game page (panels, menus, live matches, music, sound).
- `diorama.js` + `diorama.css`: the Diorama UI inside the game page.
- `render2d.js`: the 2D board. `render3d.js`, `camera3d.js`, `models3d.js`, `scenery3d.js`, `kaykit3d.js` (generated), `floors.js`: the 3D board.
- `shapes.js`, `art.js`: how units look, the palette, coats of arms and tower icons.
- `template.html`: Counter Lab. `lab3d.js` + `lab3d-template.html`: the 3D test page.
- `exploit-bot.js`: a developer-only AI playing the exploit lab's strongest lines.
- Data: `default-roster.json` (the units), `factions.json`, `faction-units.json`, `keywords.json`, `skills-default.json`, `puzzles.json`, `demo-units.json` (`node tools/counter-table.js` recomputes it and `faction-units.json`).

Other folders: `server/` (Cloudflare Workers + Durable Objects, `docs/SERVER.md`), `tools/` (tests, Balance Lab, exploit lab, artifact build, Miro sync), `models/`, `audio/`, `img/`, `vendor/` (three.js 0.180.0), `design/diorama/` (the Diorama mockups and their screenshots).

## Licence

All rights reserved: see [LICENSE](LICENSE). The repository is public only so the game can be hosted. Third-party parts (three.js, PeerJS, the CC0 model and icon packs, Google Fonts) keep their own licences, listed in the same file.
