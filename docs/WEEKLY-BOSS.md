# The weekly boss: layout, style and how to ship a new one

The owner's goal (12 November 2026): **a new boss every week, each in the same style and UI as the Mommy.** This
document is that template. The Mommy (`src/boss.js`, `docs/HANDOFF-BOSS-MOMMY.md`) is the reference boss: when in
doubt, make the new boss's screen look and read like hers, with only her name, colours, lair, attacks and rewards
swapped.

A Claude Code session asked to make or change a boss gets this document through the project skill
`.claude/skills/weekly-boss/SKILL.md`.

---

## 1. What the player sees: the surfaces every boss has

Every boss has all of these, in this order of discovery. Do not add a surface or skip one without asking the owner.

| # | Surface | Where in the code (the Mommy's) |
|---|---------|---------------------------------|
| A | **Limited event note on the main menu**, pinned to the boss's own 3D model standing on the menu island | `src/site-template.html` `.ev-note`; model + anchor `mommy` in `src/diorama.js` (pieces), note shown by `showing()` |
| B | **The boss screen** (before a run), opened from the note, a click on the model, or Puzzles' "Weekly boss" row | HTML `section.bz` in `src/site-template.html`; `openBoss` / `drawBoss` / `drawBossBoard` / `bzView` / `buildBossStage` in `src/diorama.js`; CSS `#dio.bz`, `#dio .bz…` in `src/diorama.css` |
| C | **Rewards ladder** on the boss screen (three tiers by round) | `bossRewardList` (page), `drawBoss` (Diorama), `Boss.REWARDS` (`src/boss.js`), `bossRewards` / `bossBackfill` (server) |
| D | **"<Boss>'s attacks" panel**: attack cards + spawn map side panel; from How to play point 4 and, in a run, the on-screen **<Boss>'s attacks** button (the cog's Settings on phones) | `openBossAttacks` / `drawBossAttacks` / `drawBossNests` / `bossNestBoard` / `ATK_ICON` / `BITE_NAME` / `BITE_COL` in `src/site-template.html`; CSS `.bz-atk…`, `.bz-nests…` |
| E | **In the run**: boss bar (with a ? that opens the boss screen as a panel, and Restart on phones), round banner, spawn map in the deploy panel, Restart boss, Replay round, <Boss>'s attacks and Save/Load board on the screen, a replay mark left of Next round on the round card (`bossCtl`; in Settings on phones), a "! Next round" bite line on the round card | `startBoss`, `openBossInfo`, `restartBoss`, `replayBossRound`, `bossCtl`, `bossNextBite`, `bossBar`, `bossLine`, `openBossMap`, `openSoundSheet` |
| F | **Result card** after each fight / at the end | `bossResult` |
| G | **Leaderboard**: replayed by the server; on the boss screen, Rankings' boss tab, and the leaderboard sheet | `bossBoardLoad`, `bossReport`, `bossRunText`, `drawBossStandings`, `openLeaderboard('boss')`; server `bossBoard` / `bossRows` / route `boss` in `server/src/accounts.js`, replay in `server/src/room.js` `bossCheck` |

### A. Limited event note (main menu)
- The boss's real model (from `src/models3d.js`, the same one the fight uses) stands at the back of the enemy zone of
  the menu island, with one small prop of hers beside it (the Mommy: a hanging nest). Hidden while `bossOpen()` is false.
- The note uses the golem reward note's style (`.rw-note` look): a saffron tag **LIMITED EVENT**, two short lines,
  and a stencil button **GO TO BOSS FIGHT** in the event red `#8E2216` (hover `#A82A1C`), cream text.
- Copy: line 1 says what she is in five or six words, line 2 says what killing her earns. The Mommy: "A giant spider
  holds their zone. / Kill her for her brood's skin."
- It takes the place of the "Hover over stuff…" hint (`data-hint`) while the event is on. A click on the model opens
  the boss screen too.

### B. The boss screen
Laid out like Puzzles, on the boss's field colour. From top left:
1. kicker **LIMITED EVENT · WEEKLY BOSS** (amber, small caps)
2. the boss's name, huge stencil (`THE MOMMY`)
3. one-line lede: what she is and the round limit ("A giant spider hangs over their zone. You have 5 rounds to kill her.")
4. left column, **HOW TO PLAY**: exactly five numbered points, red stencil numbers, every number read from the boss's
   CFG (never typed in). Point 4 ends with the inline link **<Boss>'s attacks ↗** that opens surface D.
5. **FIGHT HER →** (amber shard button) and **← BACK** (returns to where the screen was opened: Puzzles or the menu).
6. right column, **REWARDS** (surface C), then **LEADERBOARD** (top 8, your row highlighted, your own row added under
   them if lower; the list scrolls on short windows).
7. The island shows **the boss's lair** (her own floor, rim, soil and miniatures: `HOLLOW` + `KITS.hollow` in
   `src/diorama.js`, the floor from `src/floors.js`) with her stage (`buildBossStage`: her model big, her round-1
   spawns, a few of her minions, your treasury). **No "Change battlefield"** on this screen: she is fought in her lair
   only. Your own battlefield comes back when the screen closes.
- Must fit 1440×900 and 1280×720 without scrolling the page, and work on a phone (one column, island on top).

### C. Rewards ladder
A panel with a one-line lede and one row per tier, slowest kill first:

| Round | Reward | Kind |
|-------|--------|------|
| 5 | a title (the Mommy: **Crawler**, her lair's amber `#E8962E`) | Title |
| 4 | a skin from her world (the Mommy: **Sporespreader Spider**, `spiders-hollow`) | Skin |
| 3 | the **Epic** title (the Mommy: **Widowmaker**, black `#0B0B0B` with a cream edge and red glow) | Title |

- A kill by a tier's round earns that tier **and every tier above it** (a round-3 kill earns all three). Lede: "The
  faster she falls, the more you earn. A kill by a reward's round earns it, and everything above it."
- Row: `ROUND / n` (stencil n in amber) · a 44 px preview (a title's diamond in its colour, a skin's picture) · name
  (titles in their own colour) and kind ("Title", "Spiders skin"), with "· Yours" in green when owned · a green tick or
  a grey lock on the right.
- The round-3 row is highlighted (amber gradient and border) and tagged **EPIC REWARD**, "Epic" in purple `#C38BFF`
  on a dark `#160806` tag.
- Rounds live in `Boss.REWARDS` (`{ crawler: 5, skin: 4, widowmaker: 3 }`), **outside `Boss.CFG`**: `Boss.rulesTag`
  hashes CFG, so changing a reward round must not reset the leaderboard.
- A title that is black (or any very dark colour) needs the halo rule in `src/site-template.html`
  (`[style*="--tc:#0B0B0B" i]`): cream 1 px edge + the boss's glow. Give a new dark title its own exact colour value and
  add it to that rule.

### D. "<Boss>'s attacks" panel
One panel, made once at the end of `<body>`, so it opens over the boss screen and over the board alike.
- Header: kicker `THE MOMMY`, title **MOMMY'S ATTACKS** (stencil 40 px), ✕ top right.
- Left: **cards**, two columns, the first card across both. Each card has a **one-word title** (Bite, Web, Web mortar,
  Acid, Shed: never "Her web" / "She sheds") with a **26 px symbol** before it (`ATK_ICON`), a coloured left bar per
  attack, and two or three short sentences with the numbers in pale gold bold.
- The main-attack card has a **strip of the five rounds**, each with the attack's symbol drawn by the game's own art in
  that round's colour (the Mommy: `Art.bossJaws` in `BITE_COL`), "ROUND n" and the attack's name; then one line per
  variant saying what counters it. Variant names are the boss's own (the Mommy: Fast, **Acid-Bite**, Sweep) and are
  the same everywhere: boss bar, rules, nest map, banner.
- Right: a **spawn side panel** (the Mommy: **Nest spawns**): round tabs R1-R5 (the round in play marked "now"), the
  board for that round (`bossNestBoard`), one line on what spawns and how often, and a key.
- Opened from the boss screen (point 4 link, round 1) and in a run from the cog's Settings (the current round).
  **The fight waits while it is open** (there is no deploy clock: a boss run is PvE) (`bossReading` checks `bossAtkOpen`). Esc, ✕ or a click
  outside closes it; Esc closes only it.

### E-G. In the run, result card, leaderboard
- No rules sheet (removed 12 November): the boss screen says it all. In the run, the ? beside the boss bar (and the ? by
  the gold) opens it as one scrolling panel (`openBossInfo`; its words come from `bossHowHtml`, `bossTiersHtml`,
  `bossBoardHtml`, shared with the menu's screen). No deploy clock in a boss run (PvE); the fight waits while it is open.
- The boss bar: on the PC layout it sits in the opponent's corner (top right, top left when the deploy panel is on the
  right), off the board, with Restart boss / Replay round under it; on phones, over the top of the board. One soft panel, sentence case, a slim health bar, the time as a number, her state as a quiet line, and
  on phones Restart (asks Restart? Yes / No in place; the PC layout has the on-screen Restart boss below instead). A full card (n/n) tapped shakes and says You have the max of this unit type.
- Skills with no use in the boss's fight go in `Boss.NO_USE` (id → why): crossed out in the unit sheet, not for sale.
- The round card's headline is X damage dealt.
- Cog Settings in a run: nothing of the boss's on the PC layout; on phones a row "The Mommy · <Boss>'s attacks", Restart
  boss and Replay round.
- **Restart boss** and **Replay round** on the screen through the whole run (deploy, fight, round card, end) on the PC
  layout: stacked at the top right under her name (top left when the deploy panel is on the right), ink chips with a
  coloured top edge and a cut corner, Restart coral, Replay gold (`bossCtl`, `.bz-ctl`). Restart asks once more on the
  button ("Sure? Restart", 3 s). Replay drops the rounds this run has reached, each with its bite's mark and name, the
  current one marked NOW. Under them **<Boss>'s attacks** (her jaws, a cream edge) opens surface D on this round
  (moved off Settings, 12 November). Under that **Save/Load board** (green edge, 12 November), one button that drops a
  list: on top **Save round n** keeps this round's board on the device (in the deploy as it stands now; in the fight, on
  the round's card or at the end, as it went into that fight), one save per round; under it the rounds saved, each
  with its bite's mark and when it was saved, and a pick puts that board back in the deploy (`saveBossBoard`,
  `loadBossBoard`, localStorage `phonebellum.bossBoards.v1`, under `bossRulesTag()` so new rules drop old saves; the
  run's record goes with it, so the server's replay still matches). They step aside for a sheet, surface D or her
  screen's panel. The classic layout (phones) keeps all four in the cog's Settings.
- The round card: left of **Next round** a circle arrow with no words (aria-label and title "Play this round again",
  `againBossRound`): the round just fought again, from its board as it went into the fight.
- The round card (between rounds): "! Next round" with the next round's attack mark and name, in its colour.
- The result card's eyebrow: `<Boss> · weekly boss`. After a kill: "Killed in round n:" and the rewards earned; the
  next reward to chase.
- A kill on the leaderboard reads **"Finished round X, Y seconds"**; no kill reads "N damage, not killed".
- Any account's finished run goes to the server, which **replays it** (`Boss.replay` in a Durable Object) and ranks
  what the replay got; the page's word is never taken. A player without an account is told to make one.

---

## 2. Style tokens

| Token | Value | Used for |
|-------|-------|----------|
| Field (boss screen) | `#4A1A14`, low `#2E0E0A` | the screen's background (the Mommy's lair maroon; a new boss may take her own dark colour, same lightness) |
| Panel | `#2E0E0A`, cards `rgba(0,0,0,.25)` | attacks panel, cards |
| Amber | `#E8962E`, light `#FFC457` | kickers, headings, round numbers, primary button, borders |
| Cream | `#F4ECD8` | body text |
| Pale gold | `#F6DFA6` | numbers in sentences (`<b>`) |
| Red | `#FF4A36` | How to play numbers, the main attack's bar |
| Event red | `#8E2216` / hover `#A82A1C` | the menu note's button |
| Owned | `#9FE0B0` | "Yours", ticks |
| Epic | `#C38BFF` on `#160806` | the "Epic" word |
| Stencil | `"Big Shoulders Stencil"` (`--stencil`), uppercase | names, headings, buttons, round numbers |
| Text | `"Bricolage Grotesque"` (`--type`) | everything else |

Rules: square cut shapes (no rounded corners); left colour bars on cards; uppercase stencil for anything that is a
name; the screen never scrolls on a computer; nothing overlaps at 1280×720.

## 3. Copy style
- Short sentences, second person ("your units"), the boss as "she"/"her" (or "it" for a boss that isn't a she).
- Every number comes from the boss's CFG at runtime. Never type a number into copy.
- Titles of cards are one word or a short noun ("Web mortar"). Rounds are written "Round 3", "by round 4".
- Kill time: "Finished round X, Y seconds".

---

## 4. Shipping a new weekly boss: the checklist

Work on a branch, check each step in the browser, merge when the owner says so.

1. **Design** with the owner: name, look, lair, her 3-5 mechanics, round limit, reward names (a round-5 title, a
   round-4 skin, a round-3 Epic title). Write it up as `docs/HANDOFF-BOSS-<NAME>.md` like the Mommy's.
2. **Rules** in `src/boss.js` (or a sibling file per boss once there are two, see section 5): her CFG, `REWARDS`,
   `setup`, the fight hooks, `record` / `replay` / `rulesTag`. Prototype and measure with `tools/boss/`.
   Check: `node tools/tests/boss.js`.
3. **Model** in `src/models3d.js` (her own kind, plus her minions'), used by the fight, the menu island and her stage.
4. **Lair**: the floor in `src/floors.js`, the 3D scenery in `src/scenery3d.js` (her biome), the menu island's kit and
   look in `src/diorama.js` (`KITS.<lair>`, a `HOLLOW`-like look object).
5. **Rewards**:
   - titles: `TITLES` + `TITLE_WHY` (page); server: a `players` column per title (ALTER list in `ensureSchema`),
     `titlesOf`, every `SELECT` that lists title columns, `BOSS.titles`;
   - skin: `Shapes.SKINS` (`src/shapes.js`, with `pic` under `img/skins/`), the model kind, the server's `SKINS` list;
   - rounds: `Boss.REWARDS`; `bossRewardList` lists the tiers for the page.
6. **Surfaces A-G** (section 1) with her name, copy, colours, attacks, spawn map.
7. **Server** (`server/src/accounts.js`): the board, the replay, rewards and backfill for her id. Extend
   `server/test/accounts.test.js` (rewards per round, titles pickable, a later kill earning less).
   Run: `cd server && node test/accounts.test.js && node test/skins.test.js`. If a run dies midway, stop stray
   `wrangler dev` / `workerd` processes before running again, or the next run hits rate limits.
8. **Build** `node src/build.js` (index.html, lab.html, lab3d.html are built files: commit them).
9. **Check in a browser** (Playwright, `?ui=diorama`, an account in `localStorage` `phonebellum.account.v1`, the
   `/account/` routes aborted and `/leaderboard/boss` mocked): the menu note, her screen at 1440×900 and 1280×720 and
   on a phone, Back from Puzzles and from the menu, her attacks panel (Esc closes only it), FIGHT HER, the cog's
   attacks button (no deploy clock; in the fight it waits), the result card. Send the owner screenshots.
10. **Merge to main**: both the Pages and the Server deploy workflows run on a push to `main`, so the page and the
    server ship together.

---

## 5. What is still Mommy-specific (do this first when boss #2 is built)

Today there is one boss and the code names her directly. Before a second boss, move her per-boss facts into **one
registry** and make every surface read the current boss from it. Suggested shape, in `src/boss.js`:

```js
Boss.BOSSES = {
  mommy: {
    name: 'The Mommy', short: 'Mommy', she: 'she',
    lede: 'A giant spider hangs over their zone.', note: ['A giant spider holds their zone.', 'Kill her for her brood’s skin.'],
    field: ['#4A1A14', '#2E0E0A'], lair: 'hollow', model: 'spider:mommy', prop: 'nest',
    rewards: [{ round: 5, kind: 'title', id: 'crawler' }, { round: 4, kind: 'skin', id: 'spiders-hollow' }, { round: 3, kind: 'title', id: 'widowmaker' }],
    attacks: [/* the cards: id, title, icon, colour, text(CFG) */], variants: { fast: ['Fast', '#FFE15A'], heavy: ['Acid-Bite', '#8BE04E'], sweep: ['Sweep', '#FF9A3D'] },
    spawns: { title: 'Nest spawns', board: bossNestBoard },
    howTo: (CFG) => [/* the five points */],
  },
};
Boss.current = () => /* this week's boss id, by date */ 'mommy';
```

Places that name the Mommy today and would read the registry instead:

- **Page** (`src/site-template.html`): `bossOpen`, `startBoss` (`Boss.setup`), `bossBoardLoad` (`?boss=mommy`),
  `bossReport` (`boss: 'mommy'`), `bossRewardList`, `BITE_NAME` / `BITE_COL` / `BITE_NOTE`, `ATK_ICON`,
  `drawBossAttacks` (her cards), `drawBossNests` / `bossNestBoard`, `openBossInfo`, `openBossMap`, `bossBar`
  (`MOMMY`), `bossLine`, `bossResult` (eyebrow, copy), the `.ev-note` HTML, the `section.bz` HTML (`THE MOMMY`),
  `TITLES.crawler` / `.widowmaker`, `openLeaderboard` (tab label), the cog row "The Mommy".
- **Diorama** (`src/diorama.js`): the menu island's `mommy` / `mommyNest` and anchor `mommy`, `HOLLOW` and
  `KITS.hollow`, `buildBossStage`, `drawBoss` (how-to points), `drawStandings` (tab label "Mommy"), Puzzles' boss row.
- **CSS** (`src/diorama.css`): `#dio.bz` field colours (read `--field` from the registry instead).
- **Server** (`server/src/accounts.js`): the `'mommy'` literal in the `boss` route, `bossRows`, `bossRewards`,
  `bossBackfill`, `bossBoard`'s check; `BOSS.titles` / `BOSS.skin` per boss. The `boss_runs` table already keys runs
  by boss id, so a second boss gets its own board for free once the literals are gone.
- **Assets**: `img/skins/<skin>.png` per reward skin.

Keep the Mommy working while doing this: she is the regression test for the template.
