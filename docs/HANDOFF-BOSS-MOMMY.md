# Handoff: the Mommy boss puzzle

Branch `claude/sleepy-noether-613e5e` (not merged, no pull request). Written 11 November 2026.

**Status: design mostly agreed, a headless prototype exists, nothing is in the game yet.** The next job is to finish tuning in the prototype until the fight is hard but fair, then get the owner's go-ahead before building it into the game.

The prototype lives in `tools/boss/` and does not touch `src/`. Run it from the repo root:

```
node tools/boss/mommy.js            # unit ranking, then the sample plans
node tools/boss/mommy.js rank       # what each unit does against her, per 100 gold
node tools/boss/mommy.js tanks      # how long each squad alone holds her attention, per bite style
node tools/boss/mommy.js plans      # the sample plans in tools/boss/plans.js
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

### Not tested, or known weak

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
