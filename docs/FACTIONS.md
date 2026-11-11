# Factions gamemode

Moved out of the README on 2026-11-11 so sessions only read the part they need; the text is unchanged.
See also `FACTIONS-DEVTEST.md`.

## Factions gamemode

A second gamemode on the standard map. Each faction is a small roster with its own theme, a trait and its own tower. Before the match the players draft factions one at a time, two each (A, B, B, A). Each player can then only unlock, buy and place units of their own two factions, and at round 3 they pick between their two factions' towers instead of the usual tower offer. Starting packages are dealt from your own factions' units, so give every faction at least one unit at 200 gold or less.

The mode unlocks on the start screen (Factions vs AI) and in the friend lobby (Standard / Factions) once there are enough factions for a draft (4 for now; each pick and ban needs its own).

Factions go in `src/factions.json`, then run `node tools/counter-table.js` and rebuild. Format:

```json
{
  "factions": [{
    "id": "deepsea", "name": "Deep Sea", "color": "#3FA7D6",
    "theme": "One line shown in the draft",
    "trait": { "name": "Crushing depths", "text": "+20% damage, -15% speed", "hit": 20, "speed": -15 },
    "tower": { "name": "Coral Spire", "text": "What it does", "unit": { "hp": 650, "hit": 30, "aps": 1.2, "range": 10 } },
    "units": [ { "name": "...", "cost": 100, "bodies": 4, "hp": 200, "...": "same fields as units in default-roster.json" } ]
  }],
  "skills": []
}
```

- `trait` changes all the faction's units (spawned ones too) by a percentage: `hp`, `hit`, `aps`, `range`, `speed`. It is optional.
- `tower.unit` overrides the standard tower's stats. With `drone: { orbit, unit }` (and `idle: true`) the tower doesn't shoot itself: a drone circles it `orbit` metres out and does the shooting (the Mecha Tower).
- `tower.awake`: the tower's stats while Core Awoken is on (the Mecha Tower drives and lobs mortar shells).
- `tower.rounds`: skills bought every round for that round's fight, each `{ id, name, cost, text, bots: { count, unit }, mines: { each, hit, radius } }` (the Mecha Tower's minebots and repairbots; a bot unit has `bot: "mine"` or `"repair"`).
- `skills`: skills only the factions use. Units can also use any skill from `default-roster.json` by its id.
- Unit names must be unique across all factions.
- The draft order, picks per player and the map are in `FACTION_MODE` in `src/game.js`. A ban phase later is a matter of adding `{ "who": "A", "act": "ban" }` steps to its order.
- `node tools/tests/factions.js` checks the draft and faction matches headlessly with six throwaway test factions.
- `node tools/tests/tutorial.js` checks headlessly that tutorial rounds 1 and 2 come out the same wherever the player places.
- `node tools/tests/standard-pack.js` checks the Standard pack (units, leaders, packages, towers), the bank's one action a round (a loan or the Major investment) and Frozen Peak with its extras off, headlessly.

### Factions – devtest

A test bed for the Factions mode while it's being designed: the Test Grid board, a draft where both players may take the same faction, no tower until round 3, a free pick every round (lesser buildings, the Powertower, Powers, neutral units), spells, arrows that guide a squad, and disguised units. vs AI only. The plan, who does what and the data formats are in [docs/FACTIONS-DEVTEST.md](FACTIONS-DEVTEST.md); notes on unit awareness and targeting in [docs/AWARENESS.md](AWARENESS.md).
- Until there are 4 factions the mode stays locked. To try a faction's units now: Counter Lab → Import units → "From <faction> (faction)", save, then Load units in the game.

Fight mechanics added for factions (they work for any unit, in Counter Lab too):

- `roll` (seconds): a roller. It never stops to attack; it rolls at its target from 1 m/s up to its `speed` over this many seconds, hits every enemy body it rolls over for its `hit`, carries on `ROLL_PAST` (9 m since 2026-11-07, was 6) past the target, stops and rolls back. `aps` and `range` only matter for the shop's numbers.
- `build`: `{ "time": 1.5, "range": 25, "count": 1, "unit": { ...stats } }`. Once per fight the unit stops when an enemy is within `range` − 1 m, builds `count` copies of `unit` (a tile apart) in `time` seconds and fights on. Builders building next to each other speed each other up (1×, 1.5×, 1.75×, …). What it builds never moves, levels with its builder, earns the builder's squad its XP, and doesn't count as a unit left standing.
- `skillNeeds`: `[null, null, [0, 1]]` = skill 3 can only be bought once skills 1 and 2 are owned (empty slots are skipped).
- Skill types: `momentum` (a roller gets up to speed faster), `link` (a squad's bodies share one health pool and fall together), `healbot` (a construct follows each squad and heals it a share of max health per second), `builder` (more constructs per build, faster builds, better constructs).
- Buildings are listed under `"buildings"` in `src/factions.json`: `{ id, name, faction, hp, buildSecs, selfBuild, survive, rebuild, levelCost, color, text, awake, skills }`. A player gets one in two ways:
  - a unit skill of type `building` (`"params": { "building": "factory" }`): buying it places the building on a free tile of your zone (the Factory);
  - a unit with `"building": "altar"` bought in the shop like any unit (the Altar of Build): a squad that never moves; `footprint: 2` makes it take a 2x2 block (its col, row are the block's first ones). Give it `idle`, `noCount` and `anchored` too, so it doesn't fight in Counter Lab; the counter table scores it 0.
- A building is a site until it is built: the nearest builder without a job builds it during fights (`buildSecs` seconds of work; a site nobody builds builds itself at `selfBuild` times that speed). The work carries over between fights; with `survive` a site still standing at the end of a fight it was worked on is built at once. A built building that falls starts the next round at `rebuild` %. Once built, one of its `skills` can be bought each round: `unit` (one unit made `time` s into the fight), `make` (`[[building, its skill, count], ...]`), `bless` (Blessing of the Cycle: `build`, `hp`, `speed`, `aps` %, `regen` for all your constructs) or `awake` (Core Awoken: your buildings get their kind's `awake` stats and walk; `awake.built` changes what builders build). What it makes earns it XP; it levels up with gold, and its units with it.
- New unit fields: `spinCap` (how far spin-up goes; default 3×), `spinHitCap` (how far damage spin-up goes; default 3×), `lockOn` (seconds before it attacks each new target after its first; the spin-up starts after it: the Sun Priest's 0.5 s), `tag` (its 3-letter tag on the board), `smooth` (no bobbing in 3D), `flee` (metres: keeps away from enemies that close, still shooting), `backline` (shoots the farthest enemy in reach), `lob` (shells fly over whoever is in the way and only land where aimed).

### Mechites (in progress)

Rock elementals with clockwork hearts; what they build rattles and smokes. Done:
- Rollers, Cog Builder (turrets, Twin turrets, Master engineering), Mechite Guards (Oiled pumps, Linked cores, Healbot).
- The Factory (Cog Builder skill 1, 200 gold): placed with a tap on a free tile of your zone, built by your nearest Cog Builder during fights, then one unit a round from its sheet (tap it): Cogbot Fighter (100), Cogbot Machinegunner (100) or CogMech (300). Master engineering needs Build factory and Twin turrets, and its upgrades reach what the factory makes. Since 2026-11-07 Engine `aliveCount` leaves out a builder whose `b.siteJob` is a live site (`atSite`): a side left with only builders at work is beaten, and `kill()` clears `siteJob` / `siteAt` on a fallen site's builders so they count again (the 1.5 s turret build, `buildT`, still counts). game.js `settleBuildings`: the survive rule (Factory `survive: true`) needs `res.winner !== 1 - side`; a lost fight only keeps the progress. Test: `node tools/tests/factory.js`.
- The Altar of Build (500 gold in the shop, 4000 health): placed on a 2x2 block of your zone (the tile you tap is its first column and row), it stands where the four tiles meet with the Cog Spire in its middle. Built over 30 s of work, by your nearest free Cog Builder or, with none free, by itself 5 times slower. Its unit sheet sells one skill a round: Blessing of the Cycle (200), Cogbot Defensive Force (500: 2 Fighters and 2 Machinegunners) or Core Awoken (800: the Factory rolls out as a tank, the altar walks on spider legs firing 6 beams from the Cog Spire, turrets get wheels, keep away from enemies and lob mortar shells at the back line).
- Drawn on both boards: on the 2D board the workshop and the altar ring (scaffolds with a gold arc while they are built, tracks and legs when awoken); on the 3D board their own models (Rollers roll, Mechites glide, their constructs rattle and smoke).
- Checks: `node tools/tests/mechites.js`, `factory.js`, `altar.js` (headless); `tools/tests/factory-ui.js`, `altar-ui.js` (2D and 3D); `factory-mp.js`, `altar-mp.js` (a 2D host against a 3D guest).

Still to come: the Rollers' "ent" form, the faction's trait and its own tower (the "Mechite Tower" is the standard tower until then).
