# Handoff: the Mommy boss puzzle

Branch `claude/charming-allen-kjik08` (built on `claude/sleepy-noether-613e5e`; not merged, no pull request). Written 11 November 2026, second session added the same day (section 8).

**Status: design mostly agreed, a headless prototype exists, nothing is in the game yet.** Five-round hand-built plans now exist and win; section 8 has what they showed and the questions waiting on the owner. The next job is the owner's answers to those, then the go-ahead before building it into the game.

The prototype lives in `tools/boss/` and does not touch `src/`. Run it from the repo root:

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
| Poison pools on the firing line | Cut from the first version to keep the rule count down. May come back only if she proves too easy |
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
