---
name: weekly-boss
description: Use when making a new weekly boss for No Mans Land, or changing anything about the weekly boss event — the menu's Limited event note, the boss screen (how to play, rewards ladder, leaderboard), the "<Boss>'s attacks" panel and spawn map, boss rewards (titles, skins), the boss leaderboard, or the boss's server replay. Keeps every boss on the same layout, style and copy as the Mommy.
---

# Weekly boss

The owner ships a new boss every week, each in the same style and UI as the first one, the Mommy.

1. **Read `docs/WEEKLY-BOSS.md` first.** It holds the template:
   - the seven surfaces every boss has (menu note, boss screen, rewards ladder, attacks panel, in-run pieces, result
     card, leaderboard);
   - the style tokens and copy rules;
   - the shipping checklist;
   - the list of places that still name the Mommy.

   For her rules and history, read `docs/HANDOFF-BOSS-MOMMY.md`.
2. **Copy the Mommy, don't redesign.** Change only:
   - the boss's name, field colour and lair;
   - her attacks and their symbols;
   - her spawn map;
   - her reward names.

   Keep the layout, the order of things, the button words (GO TO BOSS FIGHT, FIGHT HER, BACK) and the copy style. If
   a new boss seems to need a different layout, ask the owner before building it.
3. **Second boss onward:** first do section 5 of the doc. Move the Mommy's facts into the `Boss.BOSSES` registry and
   make every surface read the current boss from it. Keep the Mommy working while you do it.
4. **Numbers come from the boss's CFG.** Never type a number into copy. Reward rounds live in `Boss.REWARDS`, outside
   CFG, so they don't reset the leaderboard.
5. **Edit the sources, then build.** Edit `src/` and `server/src/`, never `index.html`. Run `node src/build.js` and
   commit the built `index.html`, `lab.html` and `lab3d.html`.
6. **Check before you say it's done.** Run the server tests (`cd server && node test/accounts.test.js && node
   test/skins.test.js`). Then check in a browser:
   - the boss screen at 1440×900, 1280×720 and on a phone;
   - the attacks panel from the boss screen and from the fight's cog (the clock should say "paused");
   - FIGHT HER and the result card.

   Send the owner screenshots.
7. **Ship.** Merge to `main` when the owner asks. The page and the game server deploy together from `main`.
