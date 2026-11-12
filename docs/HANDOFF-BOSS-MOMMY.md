# Handoff: the Mommy boss puzzle

Work branches `claude/charming-allen-kjik08`, then `claude/epic-cray-2tmw9w`, merged into `main` (live) after each step. Written 11 November 2026 over one long day; sections are in the order the work happened. **Start with section 0 (where things stand now)**, then section 7 (working with the owner); the rest is history and evidence. Section 12 is the session before last (her attacks reworked, difficulty measured again, unit priorities measured); section 13 the owner's answers and the 3D board first; section 14 the countdown, acid in place of the poison tiles, nest map and leaderboard; section 15 the latest (the server replays a run).

## 0. Where things stand now (12 November)

**Live for developer accounts, phone and PC.** Puzzles → *Weekly boss - The Mommy* (a "Weekly boss · developers only" section at the top), the Developer menu → *Mommy*, or the test link `playnomansland.github.io/?mommy` (opens her straight away on a developer account; on any other it says which account the page sees). It runs on the device against nobody: no server, no AI.

**Code:** her rules are `src/boss.js` (global `Boss`), shared by the page and the prototype tools in `tools/boss/`; engine features she uses are opt-in properties in `src/engine.js`; game hooks in `src/game.js` act only when `m.boss` is set. README section "The Mommy boss puzzle" lists every hook. Check: `node tools/tests/boss.js`.

**What a player sees** (all built and checked in a browser, 2D and 3D, classic menu and the new PC/Diorama menu):
- a rules popup (*Mommy's rules*) as a run starts; the ? while deploying and a button in the fight open it again
- a banner per round; her reach (dashed ring) and the nests marked LOW / HIGH on the board while deploying; **Nest map** in the deploy panel shows every round's nests (they are fixed, not random)
- a boss bar over the board: name, phase (HANGING / FALLEN · STUNNED n s / ON THE GROUND / DEAD), health with numbers, a white strip for the latest damage, tokens (damage taken %, nests left, bite, mortar countdown or who holds her, molt countdown, poison / bleed / burn / frost / slow on her)
- on the board: her silk thread while she hangs, her web ring, a dust ring and SHE FALLS when she falls, stars while stunned, MOLT when she sheds something
- **her bite** (reworked, section 12): her jaws open on the ground where her target stands, with a ring the size of the bite (yellow fast, red heavy, orange sweep), close for 0.5 s and snap shut. Whoever stands in the ring then is bitten; a unit that walked out is missed. The bite mark stays 4 s
- **her mortar** (reworked, section 12): her thread lies on the nest she will throw (THROWS IN n s), a dashed ring follows the clump she aims at; the nest then flies in an arc for 1.6 s to a red ring (WEB MORTAR) that fills as it comes, lands on whoever stands there then, and leaves a web on the ground
- **the 3D board is the one that counts** (owner, 12 November: "put all effort into the 3d version and keep some small functionality for 2d"). There she hangs off the ground and drops when she falls, lies on her back while stunned, her nests are egg sacs (LOW on the ground, HIGH hanging on a thread) that keep their label through the fight, her reach ring shows through the fight (red while nobody is in it), her web is silk on the ground. The 2D board has a simple version; don't spend effort on it
- the top left says Round n of 5 (no player health), the top right only her name; the fight's time left is a big count in the middle of the boss bar
- **no poison tiles any more** (owner, 12 November): her heavy bite is acid (green) and leaves a pool where it lands
- a finished run goes on **the boss leaderboard** (developer accounts; the game server plays the run again and ranks what its replay got: section 15); the result card has a Leaderboard button and the menu's leaderboard a Mommy tab
- shop cards show n/3 (the squad cap); Settings in a match has *Restart Mommy*; a report after every fight

**Numbers in force** (`Boss.CFG`): health 54,000 (owner agreed, 12 November); start 450 gold; 30 s fights; hang 15%; reach 22 m; web 14 m; bites fast 150×0.8/s, heavy 480×0.25/s splash 2.5, sweep 70×1/s splash 5, order fast, heavy, sweep, heavy, sweep, each landing 0.5 s after her jaws open, where they opened (owner, 12 November); mortar after 5 s with nobody in reach, every 4 s, 1.6 s in the air, 120 damage, only rips nests within her reach; nests 500 health, burst 3, hatch 6/5/4/3/3 s, lure 12 m; spiderlings 90 health; acid: the heavy bite leaves a pool 3 m across (half) for 8 s, 4%/s, linger 2 s; wing-nest layouts per round as in CFG; molt 6 s; no share-of-max-health damage on her; banned Meteor Caller, Assassin, Rogue, Truespear, Sun Priest; at most 3 squads of a type; one free move and one free extra deployment a round; a treasury, no tower.

**Owner decisions since section 8:** questions 1-5 there agreed; health 46,000 with no late-round rule; leave Goblins as they are; pools at 4% for now; the round-3 ceiling should be searched further before a real launch; poison pools back (in place of "spiders go for the biggest clump"); wing nests (5b); the Puzzles button is named "Weekly boss - The Mommy".

**Owner decisions on 12 November** (the section-12 questions): health 54,000; unit priorities left as they are; jaws shut after 0.5 s; mortar 1.6 s in the air; Round n of 5 in place of the player's health; her reach ring in the fight; nests as egg sacs that keep LOW / HIGH; her health not repeated top right. All built (section 13).

**Owner requests on 12 November, later** (all built, section 14): the time ticking down central and obvious; a Leaderboard button on the result screen and a Mommy tab in the menu's leaderboard; the green tiles and their effects removed, one bite made green with an acid pool instead; "Restart boss"; a button in the deploy panel showing every round's nest places (confirmed: they are fixed).

**Owner on 12 November, last:** acid on the heavy bite agreed; the Mommy tab stays developers only until the boss opens up; build the server-side replay (built: section 15).

**Open, waiting on the owner:**
1. The round-3 title at 54,000: the best plan known wins by 1% (54.6k by round 3). Search further before a real launch (already agreed).
2. Not built: the "Mommy" title (the win screen mentions it), a weekly rotation (it is the one boss), a model of her own (the spider model drawn big), opening her to everyone (the leaderboard's server check no longer stands in the way).

**Her lair (12 November, a separate session):** every boss run is drawn in the Hollow, a forest sinkhole with a root bridge her thread is tied to, silk growing per round and a warm light column (README, "Her lair, the Hollow"). Looks only; nothing in her rules changed. Ideas and next steps: the project doc `claude/mommy-lair-ideas.md`.

**Things that bit this session (read before working):**
- Build like live: `PB_UI_DEFAULT=pc node src/build.js` (live's `index.html` has `const DEF = 'pc'`; a plain build makes 'classic' and the merge then changes PC players' menu).
- Merging: `git checkout -B main origin/main && git merge --no-ff claude/charming-allen-kjik08`; `index.html` conflicts are the built file: rebuild with the line above and add it. Then `git checkout claude/charming-allen-kjik08 && git merge --ff-only main` so the next merge is clean.
- Engine changes: run `QUICK=1 node tools/tests/fast-paths.js` (identical battles in both targeting modes) and the server tests one at a time (`cd server && node test/<name>.test.js`; run together on a busy machine `hub.test.js` can time out).
- Browser tests here: serve on a high port (`python3 -m http.server 18795 --bind 127.0.0.1`; 879x are taken by the server tests' wrangler) and restart it each turn. A fake developer account in localStorage (`phonebellum.account.v1`) needs `skins: [], titles: [], puzzles: []` or the Diorama won't start; `?ui=diorama` forces the PC menu (headless Chrome has no mouse, so 'pc' shows the classic menu), `?board=3d` the 3D board, `?test` exposes `window.__pb()` (the live match) and `__pbRedraw`.
- Developer status arrives with the server's answer a moment after the page opens; anything developer-only drawn before it must be drawn again (`bossRowChanged`, from `acctSave`).
- Looking at a fight: `tools/boss/watch.js` plays one in a headless browser and saves screenshots at exact fight times (it steps the frames itself; with real time a slow machine shoots the wrong moment). The 3D board is slow there (software rendering): keep the window small.
- The PC layout (`html.diorama.pcwide`) lays the round line over the top of the board, so anything pinned to the top of the board (`#wrap`) sits behind it unless it is moved down (`diorama.css`).
- The boss hook runs before the tick's attacks, so the engine's `shots` are empty there; her bites are read from `api.projectiles` the tick after.
- Server tests (`cd server && node test/accounts.test.js`) start a local server with `npx wrangler`; a test that fails or is cut short leaves it running on its port, and the next run then talks to the old one (odd 429s and 503s). `pkill -f workerd; pkill -f "wrangler dev"` first.
- Pushing `server/**` to main deploys the game server (`.github/workflows/server-deploy.yml`, after its tests). Check the run afterwards: on 12 November `server/test/match.test.js` failed once there ("phone and server in step", in a match's first deploy) on code that passed it three times locally and passed on a re-run, so the deploy was skipped until the failed job was run again. Not looked into.
- The page plays each fight twice (headless for the result, then on screen from the same snapshot); `Boss.battle` must stay deterministic and never change `m`. Her visual events (`mom.ev`, `mom.bs.aim`, `mom.bs.mortarAim`) are recorded only when `o.record` is set (the shown fight).

The prototype tools live in `tools/boss/` and run the game's own `src/boss.js`. Run them from the repo root:

```
node tools/boss/mommy.js            # unit ranking, the sample plans, the five-round lines
node tools/boss/mommy.js rank       # what each unit does against her, per 100 gold
node tools/boss/mommy.js skills     # the same with each skill bought
node tools/boss/mommy.js tanks      # how long each squad alone holds her attention, per bite style
node tools/boss/mommy.js plans      # the sample plans in tools/boss/plans.js: won or lost, round by round
node tools/boss/mommy.js lines      # the five-round lines, damage per round with her health out of reach
node tools/boss/mommy.js show "Line B: read each round (no tank in round 4)"   # one plan, board by board
node tools/boss/mommy.js greedy 40  # a round-by-round planner (weak, see "The planners")
node tools/boss/mommy.js search 150 # a hill climb over five-round plans (weak)
```

---

## 1. What the owner wants

A **boss puzzle**: a multi-round fight against one unique boss with her own mechanics, on top of the six one-fight tutorial puzzles (`src/puzzles.json`).

In the owner's words, across the design talk:

- Difficult even for a good player.
- **Creative strategies rewarded, not damage checks.** Examples given: a Brute set to walk at a nest, so it holds Mommy while it clears the nest; a Leaf Wizard dodging; a Steel Wizard's toughness; a Water Mage healing its summoned water elemental.
- Selling a squad to afford the right unit should sometimes be the right move.
- Placement matters, and each round should ask for a different approach.
- The thinking should borrow from good boss fights in other games (roles, a window you earn, a time limit, few rules that overlap, every loss explainable). The big difference: our player has no control once the fight starts, so every mechanic has to become a question at deploy.

---

## 2. The design as agreed

Numbers are the prototype's (`CFG` in `tools/boss/mommy.js`) and are starting points, not decisions, unless marked **decided**.

### The boss

- **Mommy** is a huge spider hanging on a thread at the front edge of her zone (col 5.5, row 5). She never moves. Her health carries over between rounds and never comes back (14,000 for now).
- **Hanging:** she takes far less damage (15%) and can't be stunned, rooted, slowed or moved. **Decided.**
- **Nests:** in scripted places that differ every round. A **high** nest can only be hit by ranged units; a **low** nest by melee units too. All nests have the same health every round (500). Each hatches a spider every few seconds while it stands, faster each round. A destroyed nest bursts into 3 spiders. **Decided** (the rules; not the numbers).
- **The fall:** when every nest is gone she falls. She and every spider on the board are stunned for 5 s, and she takes full damage for the rest of the fight. **Decided.**
- **Attention:** she attacks the nearest body within her reach (22 m, long enough that mid-range shooters can hold her too). Bodies within 14 m are also webbed: slower, and they hit softer.
- **The mortar:** while she hangs and nobody is in her reach, she winds up a web mortar (first shot after 5 s, then every 4 s) at the biggest clump of the player's army. **Each shot is one of her own nests, ripped loose**, and the blast cripples (web) more than it kills. So leaving her alone and letting her spend her nests is a real way to play. **Decided** (agreed in the last message of the design talk).
- **Her bite changes by round:** fast and light (rewards health), slow and heavy (rewards many bodies, shields, wards), or a sweep (rewards one big body). **Decided** as a rule; which round gets which is open.
- **Molt:** every 6 s she sheds poison, bleed, burn, frost, slows and range cuts. Bleed's share of max health never works on her. Reason: without this, stacking bleed was the best answer by far.

### The player

- **Win:** kill her by the end of round 5. **Decided.** Fights last 30 s. The deploy clock is the game's normal one.
- **Lose:** only by running out of rounds. There is no player health in this puzzle. **Decided.**
- **Gold:** 450 to start (**decided**; 250 made round 1 a dead round), then the game's normal income.
- **Units:** every allowed unit is already unlocked. Skills and level-ups are on. **At most 3 squads of one unit type. Decided.**
- **Banned: Meteor Caller, Assassin, Rogue, Truespear, Sun Priest. Decided.** The plan is to ban few, then look at the data for more.
- **Every round: one free reposition and one free extra deployment. Decided.** That is 4 deployments in round 1 and 3 in later rounds.
- **Selling** works as in a match (half for a squad from an earlier round).
- **A treasury, no tower. Decided.** The game's own rule: 50 gold for each fight it survives, gold lost when it falls. The fight runs to the timer so leftover spiders can raid it.

### Around the fight

- **Show next round's nests while deploying**, so placement can be planned ahead. Agreed.
- **A report after each fight**, for example "Nests down at 17 s, window 13 s, mortar shots 0". Agreed.
- **Reward:** beating her within 3 rounds gives the **"Mommy" title, in black**. It should be very hard. Agreed.

### Rejected, do not bring back without asking

| Idea | Why it is out |
|---|---|
| Her health in thirds (each fall takes at most a third) | The owner said no |
| Twin nests (two that regrow unless both die together) | The owner said no |
| Nests whose spawn count doubles each round and resets when destroyed | Replaced by nests that hatch over time |
| Nest health that grows by round | It is a damage check; replaced by position (low/high, where they hang) |
| Melee double damage on the fallen Mommy | Not needed once her body is big on the ground (see findings) |
| Player health | One way to lose is enough |
| Poison pools on the firing line | Cut from the first version, brought back by the owner (section 10), then removed again by the owner on 12 November: the heavy bite leaves acid instead (section 14) |
| The mortar hurting nests inside its blast | It never came into play (see findings); replaced by "each shot is a nest" |

---

## 3. What the prototype showed

All from `tools/boss/mommy.js`. Reproduce the round 1 rows with `node tools/boss/mommy.js plans`.

**Round 1 with 450 gold** (low nest at col 4, row 7, inside her reach; high nest at col 9, row 8, outside it):

| Plan | Nests down | Damage to her |
|---|---|---|
| Goblins on the low nest; Wisps, Archers, Sniper on the high one | 8.3 s | 2,029 |
| Brute on the low nest; Wisps, Archers on the high one | 7.7 s | 1,924 |
| Two Goblin squads on the low nest; Wisps, Archers on the high one | 7.1 s | 5,561 |
| No tank: four shooters in a clump (she spends a nest on the mortar) | 5.0 s | 2,580 |
| No tank: four shooters spread wide | 9.0 s | 0 (nobody left) |

The first three rows are the owner's Brute idea working: a melee squad walking up the low nest's column kills it and holds her at the same time.

Other findings:

- **With 250 gold (two squads), every round 1 plan ended with nobody alive to hit her.** That is why the start is 450.
- **Flat nest health has a narrow band.** At 400, two Wisps squads cleared round 1 in 5.4 s, before the mortar could matter. At 700 nothing cleared with a round 1 army. It is 500 now.
- **The mortar's timing depends on walking time.** At first it fired after 2 s, before anything could reach her. With her at the front edge of her zone and a 22 m reach, even slow units arrive within about 4 s, so the first shot is at 5 s.
- **The first mortar rule did nothing.** Shooters stand 18 to 29 m from the nest they shoot and melee squads walk on to her, so a 6 m blast never caught a nest. "Each shot is a nest" fixed that. At 350 blast damage it killed everything it landed on; at 120 (plus the web) the no-tank line became comparable to the tank lines.
- **Only a few melee bodies fit around one normal body.** With 600 gold of Goblins on her, most stood idle. The prototype gives her a 4 m body once she is on the ground. With that, in the current `rank` (18 s on the ground, damage per 100 gold): Goblin Swarm about 1,800, Skeleton Archers 1,090, Sniper 910, Earth Wizard 880. Goblins lead clearly; whether that is too much is open.
- **Bleed was the one outlier.** At 3 and 4 stacks it takes a share of max health, which made Shiv the best unit by far. Switched off for her.
- **Who can hold her depends on the bite** (`tanks`, seconds out of 30, one squad alone):

  | Squad | Cost | Fast | Heavy | Sweep |
  |---|---|---|---|---|
  | Goblin Swarm | 100 | 14 | 12 | 2 |
  | Skeleton Archers | 100 | 9 | 11 | 0 |
  | Brute | 200 | 9 | 8 | 16 |
  | Steel Wizard | 300 | 16 | 16 | 26 |
  | Ether Golem | 500 | 27 | 27 | 27 |
  | Leaf Wizard + Wind walk | 300 | 1 | 4 | 2 |

  The heavy bite has a 2.5 m splash. Without it a 100 gold Goblin Swarm or Archers squad held her for the whole fight.
- **Leaf Wizard can't hold her.** It has 111 health and Wind walk only dodges every fifth attack. The owner named it as a tank they would like to see work, so this needs an answer (a stronger dodge in this fight, or a bite it can dodge).
- **The ranking moves a lot with her reach.** At 16 m Wisps were the best shooter and the fastest at nests. At 22 m, shooters with 18 to 20 m range stand inside her reach and get bitten, and Wisps (65 health a body) dropped out of the top. Run `rank` again after any change to her reach or bite rather than trusting old numbers.
- **The treasury is now lost in bad rounds**, since fights run to the timer.

### Not tested, or known weak (as of the first session; section 8 answers most of these)

- **Rounds 3 to 5.** The planners never cleared the nests that hang up in her zone. It is not known whether the layouts are too hard or the planners too weak. Walking time is the suspect: a Sniper walks 2 m a second and a fight is 30 s.
- **Her health.** 14,000 is a placeholder from before the gold change. One round 1 plan already does 40% of it.
- **Late rounds may dominate.** Armies grow about sevenfold over five rounds and her health is one pool, so a plan can coast and then burst. Capping damage per fall was rejected, so this needs another lever (ideas in section 6).
- **Skills, levels, selling and moving** are wired into the script (`act()` in `mommy.js`) but only skills have been exercised, and only in `tanks`. Fourth-slot skills (Summon water elemental, Summon hellfiend) could not be bought there; find out why before judging those tanks.
- **Direction arrows** (Set direction, `sq.aim`) are not set by the plans. The Brute example only worked because the Brute stood in the nest's own column. Plans should be able to set an arrow.
- **Stealth, carriers, Overwatch, Necromancer's raised dead, Obelisk eating spiders:** none looked at.

---

## 4. How the prototype works

`tools/boss/mommy.js`

- **Loads `src/engine.js` as text, applies `PATCHES`, and evaluates it.** Each patch must match exactly once or the script stops, so an engine edit that breaks a patch is loud. The patched engine is put on `global.Engine` before `src/game.js` is loaded, so the game's rules run on it.
- **The patches:** a body with `u.rangedOnly = N` can only be picked or hurt by bodies with range at least N; `b.takeMul` scales all damage a body takes; `b.noPct` switches off bleed's share of max health; `opts.toTimer` keeps the fight going when a side has nobody left; `opts.bossTick(api)` is called once a tick with `{ t, dt, all, sides, hurt, direct }`.
- **Everything else is in the hook** inside `fight()`: the fall, the stun, the web, attention, the mortar, the molt. Nests hatch and burst with the engine's own `u.spawn` and `u.deathSpawn`.
- **`CFG`** holds every number, with a comment on each. Nest layouts are `CFG.nests`: `[col, row]` is a high nest, `[col, row, 'low']` a low one.
- **A run** uses the real match: `Game.createMatch`, `Game.place`, `Game.sell`, `Game.moveSquad`, `Game.buySkill`, `Game.levelUp`, and `Game.resolve` after each fight for experience, income and the treasury. `endRound()` then resets player health and gives the free deployment back.
- **Reports:** `rank()`, `tanks()`, and `fmt()` for one fight's line.

`tools/boss/plans.js`

- **A plan** is a list of rounds; a round is a list of steps: `['buy', unit, col, row]`, `['skill', unit, slot]`, `['sell', unit]`, `['move', unit, col, row]`, `['level', unit]`.
- **`PLANS`** holds the tested round 1 lines.
- **The planners** (`greedy`, `search`) only buy units on random tiles. They are too weak to judge difficulty. Hand-built plans told far more. A better planner would place by job (a melee squad in a low nest's column, shooters in range of each high nest) and use the free move.

---

## 5. Things about the game worth knowing first

- **Board:** 12 columns by 16 rows of 6 m tiles. The player deploys in rows 10 to 15, rows 6 to 9 are no man's land, rows 0 to 5 are her zone. `Game.tileToWorld(col, row)`.
- **Units choose their own targets:** the nearest enemy they can pick. Squads walk up their own column. Shooters stop at their range. Nothing can be told to wait.
- **Ranges (m):** Sniper 29, Slime and Frost Wizard 25, Earth Wizard 24, Water Mage 22, Slimeshots 21, Fire Mage, Leaf Wizard and Necromancer 20, Wisps 19, Archers and Shiv 18, Steel Wizard 15, Flame Wizard 12, Ember Imps 10. Melee is 5 or less.
- **Speeds (m/s):** Goblins 7.5, Spiders 6, Brute and Leaf Wizard 5, Wisps 4, Fire Mage 3, Ent 2.2, Archers and Water Mage 2.1, Sniper and Steel Wizard 2.
- **Money:** a tier 1 squad is 100 gold, tier 2 200, tier 3 300, tier 5 500. Income after round 1 is 250, then 350, 450, 550. Skills cost 100 to 300 and need a squad of that unit on the board.
- **A fight normally ends** when one side has no bodies left that count (structures don't) or at 60 s.
- **The treasury** is recognised by its squad id (-150), so `Game.resolve` pays and takes its gold without help.
- **The existing puzzles:** `src/puzzles.json`, `startPuzzle` and `puzResult` in `src/site-template.html`, the headless check `tools/tests/puzzles.js`. The server believes no claim: it replays each win (`server/src/accounts.js`, `puzzleWon`). Titles are also in `accounts.js`.
- **After changing `src/`:** `node src/build.js` rebuilds `index.html`, `lab.html` and `lab3d.html`. Features are written up in `README.md` and `PATCH-NOTES.md`, each with its check in `tools/tests/`.
- **A bug found on the way:** in `src/engine.js` the web's timer and slow sit inside the poison block, so a Spiders web never wears off on a target that isn't poisoned. It was raised as a separate task; it is not part of this work.

---

## 6. Suggested next steps

1. **Better plans, by hand first.** For each round write the plan the design intends (who holds her, who takes which nest, or the no-tank line) and see if it works. Add direction arrows and the free move to the plan steps.
2. **Make rounds 2 to 5 clearable with good play.** Check each layout for walking time. Decide which bite goes with which round so the best tank changes.
3. **Deal with late rounds dominating**, without capping damage per fall. Things to try and show the owner: nests left standing carry over to the next round on top of the new ones; spiders left alive at the end stay for the next round; more nests and faster hatching in late rounds; her health set so rounds 1 to 3 have to count.
4. **Set her health** so a strong plan wins in round 4 or 5 and a near-perfect one in round 3.
5. **Run the unit ranking again** with skills, and look for anything that breaks her (stealth, Necromancer, Obelisk, Web-shots on her, Frost Wizard). Fix her rule before banning a unit.
6. **Show the owner** the round-by-round picture and the plans that win and lose, and ask for the go-ahead to build.

### Building it into the game (not started, my notes only)

- The patches become real engine features that do nothing unless a unit asks for them. The engine is shared with the server, so both change together.
- The puzzle mode today is one fight. This needs rounds, her carried health, the nest preview, the mortar's wind-up shown on the board, and the after-fight report.
- The server has to replay a whole run, so a win is sent as each round's actions, not one army.
- The "Mommy" title, in black, needs to read on a dark screen.
- She needs a model (`HANDOFF-3D.md` for how models are made here).

---

## 7. Working with the owner

- The owner decides the design. Give a recommendation with each question, and back it with numbers from the prototype where possible.
- Answers come as short lists (agree / don't agree per point). Number the options to make that easy.
- Write for a reader who doesn't read code: plain sentences, short tables.

---

## 8. Second session (11 November): hand-built plans, and what they showed

### What was built

- **Plans can now do what a player does.** A step can name a squad (`{ as: 'brute' }`), give a melee squad a direction arrow (`aim`), use the free move (one a round, enforced), sell or level a squad by name, and level every ready squad (`levels`). A step that doesn't go through is listed, so a plan can't quietly do less than it says.
- **New reports:** `lines` (damage per round for the five-round lines, with her health out of reach), `skills` (the ranking with each skill), `show` (one plan, the board as deployed, then when each nest fell, who held her, who did the damage, who was wiped out). `tanks` now also buys the fourth-slot summons (they need one of slots 1-2 first: that was why they "could not be bought").
- **Three hand-built five-round lines** in `tools/boss/plans.js`, plus a "coaster" and the two best plans a hill climb found (`best-r1-3.json`, `best-r1-5.json`).

### The lines (her health out of reach; damage per round in thousands; `node tools/boss/mommy.js lines`)

| Line | R1 | R2 | R3 | R4 | R5 | By R3 | By R4 | All | Done in R4-5 | Falls at (s) |
|---|---|---|---|---|---|---|---|---|---|---|
| A: hold her every round | 6.7 | 14.2 | 10.9 | 9.1 | 19.3 | 31.7 | 40.8 | 60.1 | 47% | 8 / 7 / 12 / 20 / 14 |
| B: read each round (no tank in R4) | 6.7 | 14.2 | 10.9 | 12.8 | 20.3 | 31.7 | 44.6 | 64.9 | 51% | 8 / 7 / 12 / 5 / 13 |
| C: never hold her | 4.6 | 10.7 | 5.8 | 15.4 | 22.7 | 21.1 | 36.6 | 59.2 | 64% | 5 / 5 / 10 / 5 / 5 |
| Coaster: bank gold, burst late | 0 | 0 | 0 | 5.1 | 0 | 0 | 5.1 | 5.1 | - | - |
| Search best, five rounds | 6.8 | 18.5 | 9.1 | 19.4 | 27.9 | 34.4 | 53.8 | 81.7 | 58% | |
| Search best, rounds 1-3 | 6.7 | 16.2 | 15.3 | | | 38.2 | | | | |

What each round asks for, as the lines play it:

- **R1 (fast bite):** two Goblin squads walk the low nest's column, kill it and hold her; Wisps and Archers take the high nest.
- **R2 (heavy bite):** one Goblin squad gets an arrow to the far low nest, the other an arrow at her (a swarm soaks the heavy bite).
- **R3 (sweep):** sell both Goblin squads (the sweep kills a swarm in 1.5 s); a Brute with an arrow to the low nest in her web holds her; the free move takes the Wisps to the left nest.
- **R4 (heavy, the nest behind her):** either a Goblin squad holds and a Leaf Wizard dives (falls at 20 s), or sell the Brute and keep out of her reach so she spends the nest behind her on a mortar shot (falls at 5 s). Line B does the second.
- **R5 (sweep):** a second Brute with an arrow to the low nest in her reach holds; Goblins come back to hit her on the ground.

Weaker plans, for scale (cumulative damage by round, in thousands): Line B without level-ups 6.7 / 14.1 / 18.8 / 27.0 / 36.7. Plain placement (middle tiles, no arrows, no moves) 7.8 / 17.8 / 23.5 / 36.6 / 41.9. Line B but stubborn (keeps the Goblins in R3, holds in R4) 6.7 / 20.9 / 26.6 / 38.7 / 57.3.

The coaster shows that saving gold for a late burst does not work: the deployment limit (3 a round) and the experience from fights stop it.

**Warning on noise.** The fight is deterministic but touchy: moving one squad a tile can swing a round by 20-40%. Set her health with a margin, and judge by several plans, not one.

### Rule changes the plans needed (proposed, in CFG, each can be switched off)

| Change | Why | With it vs without (A / B / C, all five rounds) |
|---|---|---|
| While she hangs, units pick her only when none of her nests or spiders are left to pick (`mommy.lastPick`) | She stood nearer than the far nests, so shooters spent their shots on her at 15% and never walked on | 60.1 / 64.9 / 59.2k vs 38.8 / 48.8 / 59.4k; without it A never clears R4 or R5 |
| Spiderlings have 90 health, not a full Spiders body's 185 (`spider.hp`) | The stream of hatchlings pinned the army for 10+ s; shooters only walk on when no spider is in range | 60.1 / 64.9 / 59.2k vs 49.9 / 56.0 / 51.0k |
| The mortar only rips loose a nest within her reach (`mortar.ammoReach`, 22 m) | Without it a player can always leave the hardest nest to her: with nobody in reach she falls by 5 + 4 x (nests left) seconds whatever the layout, so layouts stop mattering | Lines are not hurt by it (C: 59.2k with, 48.1k without, since she rips different nests) |
| A hit's share of max health never works on her (`noPct` now also covers `pctHit`) | The Sniper's Deadeye hits for 5% of the target's max health: at 14,000 it was the top unit (2,077 per 100 gold), and it grows with her health | Deadeye: 2,077 -> 605 per 100 gold |
| R3's high nests move from (2, 5) and (9, 3) to (1, 4) and (10, 4) | (9, 3) sat behind the other two and 42 m from the deploy rows; the spiders kept shooters from ever reaching it | R3 falls at 12.3 s (A, B) and 10.2 s (C), vs 16.9 s, 16.9 s and never |

Tried and left alone: the mortar's hit (60, 120 or 200 moves the lines by under 5k; it does kill a squad of Goblins, Archers or Wisps outright, so "cripples more than kills" is only true for bigger units); the bite order (four orders tried, no round moved by more than 4k, because each line already picks the holder that suits the bite).

### Who holds her, by bite (seconds of 30, one squad alone; `tanks`)

| Squad | Cost | Fast | Heavy | Sweep |
|---|---|---|---|---|
| Goblin Swarm | 100 | 14 | 12 | 2 |
| Skeleton Archers + Dread rangers (a shield) | 250 | 19 | 24 | 2 |
| Brute + Tuff skin | 350 | 11 | 8 | 21 |
| Steel Wizard | 300 | 16 | 16 | 26 |
| Ember Imps + Flare + Summon hellfiend | 550 | 11 | 8 | 21 |
| Water Mage + Pool shaper + Summon water elemental | 750 | 13 | 12 | 22 |
| Necromancer (raised skeletons soak her) | 500 | 27 | 26 | 26 |
| Ether Golem | 500 | 27 | 27 | 27 |
| Leaf Wizard + Wind walk | 300 | 1 | 4 (27 if the heavy bite can be dodged) | 2 |

The bites do what they were meant to: heavy rewards many bodies and shields, sweep rewards one big body, fast rewards health. The 500-gold units hold anything.

**Leaf Wizard:** with `bites.heavy.dodgeable` on, Wind walk sidesteps every heavy bite (not only every fifth attack), and a Leaf Wizard holds her 27 s of 30 in the heavy rounds. Off for now; a question for the owner.

### The ranking with skills (`skills`; 600 gold of the unit plus the skill, damage per 100 gold of the whole)

Top: Goblin Swarm + AAARGH! 1,930, Goblin Swarm 1,811, Skeleton Archers 1,088, Wisps + Sightweavers 1,029, Earth Wizard + Stone spikes 939, Sniper 910. Goblins are about twice anything else on the ground, but the sweep rounds (R3, R5) and the mortar kill them, so they are a choice with a cost rather than a break.

Looked for things that break her:

- **Deadeye** (above): fixed by her rule, no ban.
- **Stealth** (Shadowborn, Hunter, Cavestalkers): no effect worth noting; stealthed units show themselves when they attack.
- **Necromancer:** holds her alone for 26-27 s; priced like the Ether Golem, which does the same. Not a break.
- **Obelisk eating spiders:** it stops at its cap (15 eaten) by round 5. Not a break.
- **Bleed:** still off for her (first session).

### Late rounds (with her health out of reach; cumulative damage by R3 / R4 / R5, thousands)

| Option | Line A | Line B | Line C | Search best | Done in R4-5 (A / B / C) |
|---|---|---|---|---|---|
| 1. As now | 31.7 / 40.8 / 60.1 | 31.7 / 44.6 / 64.9 | 21.1 / 36.6 / 59.2 | 38.2 (R3), 53.8 / 81.7 | 47 / 51 / 64% |
| 2. Tougher hide: on the ground she takes 75% in R4, 60% in R5 | 31.7 / 38.6 / 49.4 | 31.7 / 41.4 / 53.6 | 21.1 / 32.7 / 46.3 | 38.2, 48.9 / 64.6 | 36 / 41 / 54% |
| 3. Flat income: 300 a round after R1, in place of the game's growing income | 34.1 / 41.9 / 57.2 | 34.1 / 47.1 / 64.9 | 21.6 / 37.0 / 49.6 | 38.8, 47.8 / 64.1 | 40 / 48 / 56% |
| 4. Wounds: each earlier fall makes her take 25% more on the ground | 40.7 / 56.6 / 97.8 | 40.7 / 63.2 / 103.7 | 26.7 / 53.7 / 99.1 | 49.9, 77.5 / 133.3 | 58 / 61 / 73% |
| 5. She climbs back up her thread after 15 s on the ground in R4, 12 s in R5 | 31.7 / 40.8 / 57.0 | 31.7 / 39.9 / 54.5 | 21.1 / 31.6 / 42.2 | 38.2, 45.9 / 64.7 | 44 / 42 / 50% |
| 6. Nests left standing carry over to the next round | no change: none of the lines leave a nest | | | | |

Notes: option 5 caps how long a fall lasts, so a fall faster than 15 s earns nothing extra; it works against "a window you earn" and hits the no-tank line hardest. Option 4 does not shrink the late share (it grows it); what it does is make every fall count, since a missed fall early weakens every later one. Option 6 only punishes a round that failed. The switches are `CFG.late` (`groundMul`, `income`, `wound`, `climb`, `carryNests`).

### Her health

Health is set to 42,000 for now (proposed). With the rules as now:

- Line B wins in R4; Lines A and C, and the stubborn plan, win in R5.
- Plain placement (41.9k) and Line B without level-ups (36.7k) lose.
- R3 needs 42k by round 3. The best the search found is 38.2k, so the title needs about 10% more than that: very hard, not proven possible.

At 45,000 every hand line needs R5 and the R3 title needs 18% more than the search found. If the owner picks option 2 or 3 above, set her health again (`node tools/boss/mommy.js plans` shows each plan won or lost).

### Questions for the owner (open; recommendation first)

Rule changes the plans needed:
1. While she hangs, units pick her only when none of her nests or spiders are left. Recommended: agree.
2. Spiderlings have 90 health. Recommended: agree.
3. The mortar only rips loose a nest within her reach. Recommended: agree.
4. A hit's share of max health (Deadeye) never works on her, like bleed. Recommended: agree.
5. Round 3's high nests move to (1, 4) and (10, 4). Recommended: agree.
6. Wind walk dodges every heavy bite, so a Leaf Wizard can hold her in the heavy rounds (27 s of 30, for 300 gold). Recommended: agree.
7. Keep the mortar's hit at 120. It kills a cheap squad outright, so the description becomes "it hurts and webs" rather than "it cripples more than it kills". Recommended: agree.

Rounds:
8. Keep the bite order fast, heavy, sweep, heavy, sweep. Recommended: agree.

Late rounds (pick one, or none):
9. Options 1-6 in the late-rounds table. Recommended: 3 (flat income of 300). It deals with the cause (armies grow fast), still rewards a fast fall, and keeps "sell a squad to afford the right unit" alive late. Second choice: 2. Not recommended: 4, 5, 6.

Health:
10. 42,000 (recommended) or 45,000. Re-check after question 9.

Units:
11. Leave Goblins as they are: they are twice anything else on the ground, but the sweep rounds and the mortar kill them. Recommended: agree.


---

## 9. Measuring difficulty without making it a damage check (11 November, later)

`node tools/boss/difficulty.js [games per player, default 40] [health]` plays many automatic players against her, each knowing a different amount, and reports how often each wins by round 3, 4 and 5. Her health is set out of reach during the games, so one set of games answers any health.

- **random:** random units on random tiles, levels up.
- **statmax:** the top of the damage ranking (Goblins, Archers, Wisps, Earth Wizard, Sniper...) and their best skills, in the middle front rows, levels everything. No arrows, moves or selling, and it never reads the round. Also run with +100 and +200 gold a round, to price knowledge in gold.
- **aware:** reads each round with random but sensible choices: a melee squad with an arrow on each low nest, shooters in the nest columns, a holder that suits the bite (selling the swarm before a sweep), no tank when a nest she can rip sits deep, the free move, gold spread over the deployments.
- **Ablations:** Line B with one piece of knowledge taken out, and Line B with every squad nudged up to a tile (40 times).

### At 42,000 health (40 games each)

| Player | Win by R4 | Win by R5 | Median damage by R5 |
|---|---|---|---|
| random | 0% | 3% | 15.5k |
| statmax | 0% | 10% | 30.2k |
| statmax + 100 gold a round | 3% | 38% | 40.0k |
| statmax + 200 gold a round | 28% | 93% | 56.3k |
| aware | 3% | 63% | 45.3k |
| Line B nudged a tile | 15% | 75% | 51.8k |
| Line B as written | 100% | 100% | 64.9k |

Line B with one thing taken out (damage by R4 / R5, thousands): no arrows 36.1 / 56.4, no free moves 35.9 / 49.1, keeps the Goblins in R3 39.0 / 47.5, holds her in R4 35.9 / 53.1, no level-ups 27.0 / 36.7, shooters in the middle 28.0 / 34.2. Each one alone costs the round-4 win.

### What it shows

- **Round 4 already needs knowledge.** Only the exact Line B wins it (3% of aware games, 0% of stat-max). It is fragile, though: nudging squads a tile drops it to 15%.
- **Round 5 is too easy.** 63% of aware games and 10% of stat-max games win, and 1 random game in 40 does too.
- **Knowledge is worth about 150 gold a round.** Aware players land between stat-max +100 and stat-max +200.
- **Raising her health is a damage check.** From 42k to 52k, aware drops from 63% to 20% by R5, but stat-max +200 only drops from 93% to 73%. Health punishes knowing less than it punishes having less.
- **A bigger mortar blast (9 m, 120 or 200) changed nothing for stat-max** (10% → 7% by R5). Its middle-stacked army walks into her reach, so someone is always holding her and the mortar never fires.

### The method (proposed)

The gap between "knows the systems" and "has more stats" is called skill depth (Nielsen, Barros, Togelius and Nelson, 2015, relative algorithm performance profiles). Changes are judged by that gap; her health is set last, as a fine dial. See the owner's questions in the message that came with this commit.

---

## 10. Poison pools and wing nests (11 November, later)

The owner asked to bring the poison pools back (in place of "spiders go for the biggest clump") and to move the nests out to the wings (5b). A round-3 win must stay possible but very difficult.

### What changed in the prototype

- **Poison pools** (`CFG.pools`): scripted tile rectangles per round, shown on the board as `~`, so the preview can show them with the nests. A player's body standing in one is poisoned for 4% of its max health a second (past armor), slowed by the engine's poison, and keeps it for 2 s after walking out. Her spiders don't mind them. Slime units drink poison: the engine heals them with it, so a Slime Wizard can stand in a pool. Every round has a pool on the middle lane in front of her, plus pools on the wings' firing spots from round 2. The game's own toxic tile poisons only once, on entry, so the pools live in the boss hook.
- **Wing nests** (`CFG.nests`, the old layouts are in a comment):
  - R1: low (2, 6), high (10, 8)
  - R2: low (0, 7), high (11, 8), high (9, 4)
  - R3: low (9, 6), high (0, 5), high (11, 5)
  - R4: low (1, 8), low (10, 8), high (5.5, 2), high (11, 5)
  - R5: low (0, 6), low (8, 7), high (3, 3), high (11, 5)

  R3's wing nests sat at row 4 at first; that made the round nearly impossible (falls at 15-20 s, 1-3k damage), so they moved to row 5.
- **The aware player knows the pools:** it keeps squads out of pool columns where it can.
- **Lines A, B and C were rewritten** for the new layouts. The old search-best plans were replaced by new ones.

### Effect on the gap (16 games each, median damage by R5, thousands)

| Rules | statmax | statmax + 100 gold | aware | aware / (statmax + 100) |
|---|---|---|---|---|
| Before | 30.2 | 37.8 | 46.3 | 1.22 |
| Pools only | 26.8 | 34.0 | 38.5 | 1.13 |
| Wing nests only | 25.7 | 32.9 | 46.4 | 1.41 |
| Both (pool-aware player) | 24.0 | 26.9 | 43.5 | 1.62 |

### The lines now (cumulative damage by R1 / R2 / R3 / R4 / R5, thousands)

- Line A: 6.3 / 22.8 / 32.5 / 49.2 / 72.6
- Line B: 6.3 / 22.8 / 32.5 / 45.0 / 70.9
- Line C: 2.6 / 9.8 / 14.3 / 23.9 / 50.1
- Search best, rounds 1-3: 8.2 / 30.1 / 54.4. Three Goblin squads, one kept fighting through R3's sweep (10.7k there on its own).
- Search best, five rounds: 6.3 / 26.2 / 40.6 / 56.9 / 86.9

### Win rates by health (40 games each for the rules as now, 30 for the late options; by R4 / by R5)

| Player | As now, 43k | As now, 46k | As now, 50k | Hide 85/70%, 43k | Flat income 300, 43k |
|---|---|---|---|---|---|
| random | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% |
| statmax | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% |
| statmax + 100 gold | 0 / 18% | 0 / 15% | 0 / 8% | 0 / 10% | 3 / 7% |
| statmax + 200 gold | 8 / 68% | 8 / 65% | 3 / 53% | 7 / 60% | 10 / 57% |
| aware | 3 / 53% | 0 / 35% | 0 / 20% | 0 / 30% | 3 / 27% |
| Line A / B / C | R4 / R4 / R5 | R4 / R5 / R5 | R5 / R5 / R5 | R4 / R4 / lost | R5 / R5 / R5 |
| Search best, R1-3 | wins R3 | wins R3 | wins R3 (54.4k) | wins R3 | wins R3 |

"Hide 85/70%" is late option 2 with milder numbers: on the ground she takes 85% in R4 and 70% in R5. Late options leave rounds 1-3 alone, so the round-3 title is unchanged by them.

Health is set to **46,000** for now (proposed). Against the targets in section 9:
- statmax 0% ✓
- random 0% ✓
- aware 35% by R5 ✓, 0% by R4 ✓
- the R3 title only for the best plan found ✓
- statmax + 100 gold 15% by R5 ✗ (target 5-10%)

**The searches are weak.** The R3 search found 43.4k; a search aimed at R4 then found a plan with 54.4k by R3. The real ceiling may be higher still, so the title needs checking again whenever her rules change.


---

## 11. In the game (11 November, late)

The owner agreed: 46,000 health with no extra late-round rule; Goblins left as they are; the round-3 ceiling to be searched further before the real launch; pools at 4% a second for now. Then asked for it on live for developer accounts, on phone and PC, with the Puzzles button named "Weekly boss - The Mommy".

- **Where:** Puzzles → *Weekly boss - The Mommy* (developers only for now), and the Developer menu → *Mommy*. Phone (classic menu) and PC (Diorama). It runs on the phone against nobody: no server, no AI, the normal deploy panel and clock.
- **Code:** the prototype's rules moved into `src/boss.js`, which the page and `tools/boss/` both run, so the prototype's numbers are the game's. The engine patches became engine features that do nothing unless asked for. README "The Mommy boss puzzle" lists the hooks. Check: `node tools/tests/boss.js`.
- **One change from the prototype:** the prototype's player quietly had the game's default tower (an Outpost at col 8, row 14). The design says a treasury and no tower, so the game has none, and so does the prototype now. Lines A and B and the round-3 winner came out the same (Line B 71.6k over five rounds, A 71.6k); Line C moved (59.1k).
- **What a round shows:** a banner with the round's bite, the nests (low and high) and her health; on the board her reach (a dashed ring), the nests marked LOW or HIGH, and the poison pools (green tiles, also in the fight). After the fight a report: nests down at, how long she was down, mortar shots, damage to her (and how much while she hung), the three squads that hurt her most, her health.
- **Not done yet:** the "Mommy" title (the win screen says it would be earned), the server checking a win, a weekly rotation (it is the one boss), a model of her own (she is the spider model, drawn big), the mortar's wind-up on the board.


---

## 12. Her attacks reworked, difficulty measured again, unit priorities measured (11 November, night)

The owner: the round title overlapped the boss bar on PC, and her attacks were hard to read ("Bite is a bite mark that stays on the screen. Throwing something somewhere needs low projectile speed so you see what's happening as well as some animation").

### What changed

- **The overlap.** On the PC layout the round line lies over the top of the board, and the boss bar sat behind it. The bar now sits under it. Her health number was also cut off by the bar's edge (on every layout); fixed.
- **The bite** is no longer a web ball. Her jaws open on the ground where her target stands and shut `biteSecs` (1 s) later; it lands there, on whoever stands in the ring then. Before, the ball flew at 15 m/s (0.3 to 1.5 s, by distance) and hit the first body in its way. The mark stays 4 s. Engine: `u.lob` (lands where aimed, already there) and the new `u.projSecs`.
- **The mortar** is thrown, not instant: the nest is gone the moment she throws it (as before, so fall times don't move), flies 1.6 s (`mortar.fly`), and its hit and web land where the clump stood when she threw. A squad that walks on is missed.
- **Both boards draw the same pictures** (`Art.bossJaws`, `bossBiteMark`, `bossWeb`); the 3D board got pictures that lie on the ground (`decal`).
- `tools/boss/difficulty.js` judges one set of games at several healths and takes changed rules (`--set`); `tools/boss/watch.js` takes screenshots of a fight.

### Difficulty (40 games each; win by round 4 / by round 5; `node tools/boss/difficulty.js 40 46000,50000,54000,58000`)

| Player | 46,000 when agreed (section 10) | 46,000 before this session | 46,000 now | 50,000 now | 54,000 now | 58,000 now |
|---|---|---|---|---|---|---|
| random | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% |
| statmax | 0 / 0% | 0 / 15% | 0 / 5% | 0 / 3% | 0 / 0% | 0 / 0% |
| statmax + 100 gold | 0 / 15% | 5 / 30% | 0 / 28% | 0 / 23% | 0 / 13% | 0 / 3% |
| statmax + 200 gold | 8 / 65% | 8 / 93% | 15 / 85% | 8 / 78% | 5 / 63% | 0 / 50% |
| aware | 0 / 35% | 10 / 57% | 8 / 65% | 3 / 48% | 0 / 30% | 0 / 20% |
| Line B nudged a tile | | 0 / 70% | 0 / 85% | 0 / 78% | 0 / 63% | |

"Before this session" is the targeting work and the slow web-ball bite of the session before, which were never measured. The new bite and mortar moved the medians by under 5% (damage by round 5, thousands, before → now: statmax 33.0 → 33.4, +100 39.2 → 40.8, +200 57.7 → 58.1, aware 47.6 → 49.8).

Where the extra ease came from (median damage by round 5, thousands):

| Rules | statmax | + 100 gold | + 200 gold | aware |
|---|---|---|---|---|
| Now | 33.4 | 40.8 | 58.1 | 49.8 |
| The bite lands at once (can't be dodged) | 28.6 | 33.6 | 53.4 | 44.8 |
| Jaws shut after 0.7 s | 33.1 | 39.0 | 55.2 | 49.1 |
| No targeting help (no nest pull, units march up their column first) | 29.8 | 39.1 | 55.4 | 45.0 |

A bite that can be dodged is worth 10 to 20% damage, more to the stat-max player than to the knowing one; the targeting help about 10% to everyone.

**The round-3 title.** With her health out of reach the best plan known does 8.5 / 30.9 / 55.2k by rounds 1 / 2 / 3 (56.7k before the rework). At 54,000 it still wins in round 3, by 2%. No automatic player won by round 3 in any run. Lines now (by R3 / R4 / R5): A 32.0 / 49.2 / 65.0, B 32.0 / 44.8 / 71.5, C 21.3 / 31.5 / 56.1, search best five rounds 35.0 / 51.2 / 81.9.

### Unit priorities (median damage by round 5, thousands; 40 games each)

| Option | statmax | + 100 gold | aware | best aware game |
|---|---|---|---|---|
| 4. As now (nests pull 12 m) | 33.4 | 40.8 | 49.8 | 73.6 |
| 1. Shooters can be pointed at a nest: every shooter pointed | 33.4 | 40.8 | 47.9 | 65.7 |
| 1. ...only the shooters bought or moved this round | 33.4 | 40.8 | 49.2 | 66.9 |
| 1. ...only shooters that outrange her reach | 33.4 | 40.8 | 48.6 | 66.3 |
| 2. A stronger pull (25 m) | 34.6 | 41.4 | 51.8 | 73.9 |
| 3. Squads keep to their own side (lane cost 1.5 for 0.5) | 30.4 | 41.3 | 48.2 | 71.6 |

Pointing shooters at a nest did not help the knowing test player in any of three ways of using it: a pointed squad walks past the spiderlings that are biting it. The stronger pull adds 2 to 4% to everyone, so it is ease, not knowledge. Keeping to a side costs the stat-max player 9% and the knowing one 3%. Recommended: leave it (option 4). The switch for option 1 stays in the engine (`b.focus`, set from `sq.focus` in `Boss.battle`; the test player uses it with `--set proto.focus=true`), with no button in the game.

### Noticed while playing it (not built)

- Top left on PC and phone the player has "100" and a health bar; there is no player health in this puzzle.
- Her reach (the dashed ring) shows only while deploying. In the fight only the web ring (14 m) shows, which reads as her reach.
- Nests are little houses tagged NES on the 2D board and small grey lumps on the 3D one, and lose their LOW / HIGH label when the fight starts.
- The top right repeats her health next to the boss bar.


---

## 13. The owner's answers, and the 3D board first (12 November)

The owner answered the section-12 questions (all agreed, the jaws at 0.5 s in place of 1 s) and said: "No need to focus on animation for the old 2d version. Put all effort into the 3d version and keep some small functionality for 2d."

### Built

- `CFG.mommy.hp` 54,000, `CFG.mommy.biteSecs` 0.5.
- The HUD in her fights: top left **Round n of 5** with a bar of the rounds left; top right only her name.
- The 3D board (`render3d.js collectBoss`): she hangs off the ground and drops when she falls; stunned, she lies on her back; nests are egg sacs (`models3d.js BUILD.nest`), LOW on the ground, HIGH hanging on a thread, with their ring and label through the fight; the nest she is about to throw strains at her thread; her reach ring through the fight (red while nobody is inside); her web as silk on the ground.
- The 2D board, kept simple: the reach ring, nests as pale discs with LOW / HIGH. Its attack pictures from section 12 stay as they are.

### Difficulty with the 0.5 s jaws (40 games each; win by round 4 / by round 5)

| Player | 50,000 | 51,000 | 52,000 | 53,000 | 54,000 (in force) | 58,000 |
|---|---|---|---|---|---|---|
| random | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% |
| statmax | 0 / 3% | 0 / 3% | 0 / 3% | 0 / 3% | 0 / 3% | 0 / 0% |
| statmax + 100 gold | 0 / 18% | 0 / 13% | 0 / 13% | 0 / 13% | 0 / 13% | 0 / 3% |
| statmax + 200 gold | 8 / 73% | 8 / 65% | 8 / 63% | 5 / 60% | 3 / 55% | 0 / 45% |
| aware | 3 / 40% | 3 / 33% | 3 / 25% | 0 / 20% | 0 / 15% | 0 / 15% |
| Line B nudged a tile | 0 / 73% | | | | 0 / 63% | 0 / 45% |

Median damage by round 5 (thousands), jaws 1 s → 0.5 s: statmax 33.4 → 31.6, +100 gold 40.8 → 39.3, +200 gold 58.1 → 55.5, aware 49.8 → 49.0. The shorter jaws cost the stat-max players about 4% and the knowing one under 2%, but at 54,000 many knowing games sat just above her health, so its wins fell from 30% to 15%.

**The round-3 title at 54,000.** The best plan known does 8.0 / 30.4 / 54.4k by rounds 1 / 2 / 3: it kills her at 29.5 s of round 3's 30. Lines (by R3 / R4 / R5): A 30.8 / 46.4 / 65.5, B 30.8 / 43.4 / 70.1, C 20.9 / 27.7 / 51.4, search best five rounds 33.5 / 49.4 / 79.8.


---

## 14. Countdown, acid in place of the poison tiles, nest map, leaderboard (12 November, later)

### Built

- **Countdown.** The boss bar's middle is the fight's time left, large, with a strip under her health that drains with it; both turn red in the last 10 s. (The PC layout hides the board's small clock, so before this there was none there.)
- **Acid in place of the poison tiles.** The scripted green tiles and their poison are gone (`CFG.pools` removed). The heavy bite (rounds 2 and 4) is acid: green jaws, and where it lands a green pool stays 8 s (`CFG.acid`: 3 m, 4% of max health a second, linger 2 s; her spiders don't mind it, slime units drink it). Why the heavy bite: it comes every 4 s, so at most three pools lie on the board; the fast and sweep bites come every second and would carpet it.
- **Restart boss** (was Restart Mommy).
- **Nest map** in the deploy panel: five small boards, one a round, with the nests (L / H), her reach, the bite and the hatch time. The places are fixed (`CFG.nests`), the same every run.
- **Leaderboard.** Server: table `boss_runs`, POST /account/boss, GET /leaderboard/boss (docs/SERVER.md). Page: `bossReport` when a run ends, a line on the result card (where the run landed), a Leaderboard button there, and a Mommy tab in the menu's leaderboard (classic sheet and the PC menu's Rankings), for developers only while the boss is. Best first: a kill in the earliest round, then the earliest second; without a kill, the most damage. One row a player; each set of her rules has its own board.
  - At first the server took the page's word for a run. It replays it now (section 15).

### Difficulty now (no tiles, acid heavy bite, 0.5 s jaws; 40 games each; win by round 4 / by round 5)

| Player | 50,000 | 52,000 | 54,000 (in force) | 56,000 | 58,000 | 62,000 |
|---|---|---|---|---|---|---|
| random | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% | 0 / 0% |
| statmax | 0 / 3% | 0 / 3% | 0 / 3% | 0 / 3% | 0 / 0% | 0 / 0% |
| statmax + 100 gold | 0 / 30% | 0 / 20% | 0 / 18% | 0 / 13% | 0 / 8% | 0 / 3% |
| statmax + 200 gold | 5 / 80% | 5 / 68% | 5 / 55% | 5 / 50% | 3 / 45% | 0 / 30% |
| aware | 0 / 43% | 0 / 35% | 0 / 33% | 0 / 30% | 0 / 23% | 0 / 15% |
| Line B nudged a tile | 0 / 73% | 0 / 70% | 0 / 65% | 0 / 60% | 0 / 55% | 0 / 38% |

Median damage by round 5 (thousands): random 19.1, statmax 30.5, +100 gold 40.3, +200 gold 56.3, aware 46.0. Without the acid (and without tiles): 19.5 / 31.7 / 42.2 / 57.2 / 48.2, so the acid costs 2 to 5%. With the tiles (section 13): statmax 31.6, +100 39.3, +200 55.5, aware 49.0.

At 54,000 this is the picture 46,000 gave when it was first agreed (aware 35% by round 5 and none by round 4, statmax and random none, statmax + 100 gold above its 5-10% target). Win rates from 40 games move by several points between runs with the same medians (aware at 54,000 read 15% in section 13).

**The round-3 title at 54,000.** The best plan known does 8.0 / 29.3 / 54.6k by rounds 1 / 2 / 3. Lines (by R3 / R4 / R5): A 32.5 / 41.6 / 59.5, B 32.5 / 47.5 / 77.4, C 21.2 / 30.7 / 55.5, search best five rounds 34.6 / 51.0 / 82.0.


---

## 15. The server replays a run (12 November, last)

The owner agreed to the three questions of section 14's message: acid on the heavy bite, the Mommy tab for developers only until the boss opens up, and the server-side replay.

- **The record.** `m.boss.run = { seed, rounds: [...] }`: the match's seed and, for each round, the player's side as it went into the fight (`Boss.snapshot`: every squad's id, unit, tile, level, arrow and carrier; the skills owned; whether a loan was taken). `Game.resolve` calls `Boss.record(m)` before it pays the fight out, so the page and the tools both keep it without doing anything.
- **The replay.** `Boss.replay(run, units, matrix)` starts the same match from the seed. Before each fight it works out what must have happened since the last one (squads sold, moved, bought, skills, level-ups, a loan), does it through the game's own functions (`sell`, `moveSquad`, `place`, `buySkill`, `levelUp`, `takeLoan`), then checks its side looks exactly like the record and plays the fight. Gold only comes from the loan and from sales, so those go first, except a sale that would take the last squad of a unit whose skill is still to be bought. A new squad gets the id it had (gaps are squads bought and taken back), since ids order the bodies in a fight. Anything the rules refuse, or a side that doesn't come out as recorded, fails the run with a reason.
- **The server** (`accounts.js` BOSS, `room.js` bossCheck): POST /account/boss takes `{ boss, rules, run }`, refuses a page whose rules tag isn't its own (409), replays the run in a Durable Object (about a second of processor time, too much for the Worker itself) and ranks what the replay got; a claimed result isn't even read. `src/boss.js` is now in the server deploy's paths.
- **Checked.** 131 recorded runs replay to exactly the same damage every round: the 11 hand lines and search plans, and 40 games each of the random, stat-max and aware players (`tools/tests/boss.js` keeps one, with five cheats that must fail). A run played on the page (an Undo all, a loan, a skill, a sale, a move, level-ups, arrows) replays the same in the page and in node, and the page's rules tag is the server's. The server's test sends the tools' runs and cheats (a level not earned, squads the gold doesn't reach, a banned unit, a squad in her zone).
- **What would make an honest run fail:** a page and a server on different versions (answered as "other rules", not as a failure), and anything the page lets a player do that the replay doesn't know to derive. Carriers (a squad riding Just a horse: boarding, stepping out, another boarding) were tried in one run and replayed the same. The result card says why when a run fails, so it can be found.

