# The animated unit models (Settings: Unit models: New)

Since 25 November 2026 the 3D board can draw units as animated models instead of the code-built ones in
`src/models3d.js`. It is a setting, **off by default** (`pb-unit-models` in localStorage: `new` / `classic`;
`?models=new` / `?models=classic` in the address for one visit). Looks only: the engine, the rules and what players
send each other are untouched.

## What is where

- `models/units/<unit>.glb`: one file per unit (28, about 7 MB in all). A unit's file is fetched the first time a body
  of that unit is drawn; until it has arrived, and if it fails, the classic model is drawn.
- `models/units/proj_<name>.glb`: the projectile models (11, about 130 KB in all), fetched with the unit that shoots
  them. If one fails to load, that unit's shots stay the game's own.
- `src/units3d.js`: **generated, do not edit by hand.** `Units3D(THREE, GLTFLoader, SkeletonUtils, host)` keeps one
  driver per unit name: Idle, Walk at the speed the body really moves, Attack on each strike, a Death clip where it
  falls, and it turns to face the enemy it attacks. Its table `UNITS` lists the units that have a model, by the name
  they have in the roster. A unit that is not in it (Slime Wizard, Slimeshots, towers, bosses) keeps its classic model.
  Since step 2 (25 November, later the same day) a unit's entry may carry `proj`: how its shots are drawn (a
  projectile model flying from its hand with a trail and a splash or burst, a tracer for an instant shot, a held
  beam, a flame jet, a hook on a chain, a meteor dropped from the sky) and its dashes (the Assassin's Dash clip, the
  Brute's Bullhead charge, the Leaf Wizard's Wind walk streak). `HIT` is the small spark on any body that takes a
  direct hit; a model that is hit also tips back a little.
- `vendor/addons/`: three.js 0.180.0's own `GLTFLoader.js`, `SkeletonUtils.js` and `BufferGeometryUtils.js` (MIT, from
  `examples/jsm`), with their `from 'three'` imports pointed at `../three.module.min.js` (the page has no import map).
- `src/render3d.js`: offers each body to `opts.units` before drawing it (`placeBodies`), hides its own model when the
  unit models draw it, calls `opts.units.frame()` once a frame, and reports the board as busy while a fallen model is
  still playing its death (`still()`), so the board does not go to rest halfway through one. It also leaves out what
  the unit models draw themselves: a projectile (`opts.units.proj`), a Catcher's reeling chain (`hooked`) and the
  team-colour dash streaks (`ownDash`).
- `src/engine.js`: ONE bookkeeping line in `hurt()`: a direct hit is noted on the body (`hitN`, `hitDmg`, `hitFrom`,
  `hitBy`) so the board can show it. Nothing in a fight reads these fields; the counter tables came out identical
  when recomputed with it (every battle re-run). Burn, bleed and poison ticks do not pass that line.
- `src/site-template.html`: the setting (`setUnitModels`), the loading in `start3d()` (the loader files and
  `src/units3d.js` are only fetched when the setting is on), the fight's speed (`unitSpeed`) and each recorded shot
  (`absorb()` -> `units3d.aimSeen`, so a body faces what it really shot at). In `absorb()` a shot line, a held frost
  beam and a flame wedge are also left out when the unit models draw that shot (`shotFx`, `beamFx`, `flameFx`).
  `?test` shows it as `__pb().units3d` (`stats()`, `dead()`, `busy()`, `fx()` = counts of what has been drawn,
  `api(name)` = one unit's driver).

## What it leaves alone

- A unit wearing a skin with its own model keeps that classic model (the new models have no skins yet).
- Burn / bleed / poison looks are the game's own for now. So are the shots of a unit whose classic model is drawn
  (a skin, a unit without a model): the unit models only draw the shots, chains and dashes of bodies they draw.
- The Ember Imp's new model attacks in melee (a pounce) while the roster still has it throwing: the game's own shot
  is drawn for it until its stats are settled.
- Speed: measured on one laptop only, a fight with the models and their effects cost about three times the classic
  frame time (about 14 ms against 5 ms with some 45 bodies). Phones are not measured; the too-slow rule still applies.
- The 2D board, the 3D test page (`lab3d.html`) and the artifact builds (three.js from jsDelivr): classic models.
- Team colour: the new models are the same for both sides; the ring under a unit tells whose it is.

## Where the models come from

They are made outside this repo, in the owner's model kit (Blender scripts, "ShapeLanguageStyle"). Its
`scripts/make_game_units.py <this checkout>` writes `src/units3d.js` and `models/units/*.glb` from the kit's
battlefield preview driver and built models. To change a model, an animation or the driver, change it there and run
that script again, then `node src/build.js` (the 3D code's version tag `V3D` covers `units3d.js`, so browsers take
the new files).
