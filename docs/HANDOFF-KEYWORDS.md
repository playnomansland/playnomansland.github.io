# Handoff: keywords and symbols (phase 1 of the design plan)

Written 13 November 2026 for the next session. Read this first, then the three files under "What exists".

## Where it stands

- **Branch `design/keywords`** has everything below. **Nothing is on `main`, and nothing may be merged to `main`
  without the owner's word.** He said so for this whole piece of work.
- `main` was merged into the branch on 13 Nov (its 15 commits of that day). If main has moved again, merge it again
  before starting: `index.html` and `lab3d.html` conflict, take main's, then rebuild with `node src/build.js`.
- **Portraits have started** (13 Nov): `tools/unit-pic.js` renders a unit's portrait in three framings (full, half =
  waist up, bust = head and shoulders); `docs/unit-portraits-proto.jpg` shows the Fire Mage, the Shiv and the War
  Mammoth in all three. **On hold (14 Nov): the owner wants the 3D models redone by a human before any portraits.**
  No framing was picked; `img/units/` holds the half ones, unused. Do not render the other 25 or wire any in. He
  wants the unit cards to become playing cards (Marvel Snap, Gwent, Pokemon, Riftbound as inspiration), with
  overlays and art later: portraits first. A model's face point is set per model in `FACE` in the tool; only the
  wizards and the mammoth are tuned, the other 25 use the default and need a look.
- No screen in the game uses the keywords or symbols yet. The only change a player could see on this branch is the
  wizards' staffs (below).
- The plan this belongs to: the Claude doc **"No Mans Land: design audit and keyword plan"**,
  https://claude.ai/artifact/G9eneYpw9nZBkUaTJWJsGG (what works in the Diorama, eight ranked problems, nine rules,
  five phases, eleven questions for the owner). Only the Diorama UI counts; the old UI is to be ignored completely.

## What exists

| File | What it is |
|---|---|
| `src/keyword-registry.json` | The one list: rules, six roles (colour, plate shape), 18 wave 1 keywords (role, line of at most 8 words, icon), wave 2 names, every unit's verb, every skill type sorted (keywords / stat / unfit), the armor set, the levels idea. Nothing in the game reads it yet. **Not** `src/keywords.json` (that one feeds the Miro board). |
| `tools/tests/keywords.js` | The check. Fails when a unit has no verb or role, a skill type is unsorted, a keyword is unknown, wave 1 is over its cap (18), or a line is over 8 words. `--report` writes `docs/KEYWORDS-TAGGING.md`. |
| `docs/KEYWORDS-TAGGING.md` | Generated. Today's game in the keywords: 27 of 28 units fit (the Obelisk's verb, Grow, is wave 2); of 85 skills 26 read with wave 1 keywords, 28 are plain stat changes, 19 need a wave 2 keyword, 12 fit none. |
| `tools/keyword-sheet.js` | Writes `docs/keyword-icons.html` (every symbol at three sizes) and, with a path, a screenshot. This is how the owner judges symbols. |
| `tools/unit-pic.js` | Renders units' portraits from their 3D models to `img/units/<unit>.png` (`--frame=full|half|bust`, `--sheet=out.png` for all three framings side by side, `--dry` for the sheet only) and prints the units with no model of their own. |
| `tools/model-sheet.js` | Renders units' 3D models side by side to a PNG (`wizards` = the eight wizards, `--dark` = outlines only) and prints triangle counts. |

Icons are the inside of an svg on a 24 by 24 grid, drawn in `currentColor`, so the colour comes from the page.

## What the owner has decided

- **18 keywords in wave 1**: Strike, Shoot, Splash, Pierce, Shred (Damage) · Rush, Taunt (Guard) · Pull, Teleport
  (Control) · Burn, Slow, Poison, Bleed (Afflict) · Heal, Carry, Hide, Reveal, Teleport (Support) · Spawn (Conjure).
- **Tank is not a keyword.** A Guard with no keyword is a tank (Ent, Steel Wizard, Ether Golem: `role: "guard"`, no verb).
- **Teleport is Control or Support**, by what the ability does.
- **The Summon role is called Conjure in the registry** (making anything on the board, not only units). The Verbs and
  Roster docs still say Summon and he said to leave them.
- **Bare symbols are the default.** Role plates (diamond, shield, hexagon, triangle, circle, arch) exist but are to be
  used sparingly; where is **not decided**, and he wants to decide it later. Do not put plates on things unasked.
- **Symbols he has accepted as they are**: all 18, including Splash (a broken blast ring, nothing inside), Pierce
  (a level arrow through three pairs of plates, using the Shoot arrow), Taunt (an exclamation mark between sound
  waves), Shred (three claw marks), Carry (the cart), Spawn (a skeleton hand: his pick of five tries, the third).
- **Splash with its weapon**: in the game he wants Splash shown with the Strike sword (melee splash) or the Shoot
  arrow (ranged splash) to its left, smaller than the ring and never touching it. The sword is the Strike symbol as it
  is; the arrow is turned level. Built in `tools/keyword-sheet.js` (`wide`), on the sheet only. "OK for now."
- **Armor weight is its own set**, apart from the keywords: a flat-topped steel shield that fills up (none, light,
  medium, heavy, fortified with battlements). Which unit gets which weight is not decided.
- **Stacked chevrons** are kept as a possible symbol for squad levels later (one lit chevron = level 1). Not decided.
- **A small circle means one body.** He wants to reuse it for crowd counts later. Nothing uses it yet.
- **Wizards**: he wants the one shared model, told apart by colour and staff top. Nothing may float beside a staff.
  The Leaf Wizard's staff top is one flat leaf. (A try with separate hats and builds was taken back.)
- **The Verbs doc is not to be scaled down** and **the class system stays** (base, path A, path B at a level-up).
  Wave 1 is only what a new player meets first.

## Still open (his calls, not ours)

- Where role plates are used.
- Questions 1, 4, 5, 6, 7, 8, 9 and 10 in the audit doc (device priority, pips for numbers, portraits, a lighter
  first game, level-up per squad, one aim gesture, the setting, counter hints). Each has a default there; none is
  confirmed.
- Whether Shield, Leave behind or Stun (the most used wave 2 keywords) join wave 1, and what happens to the 12
  skills that fit no keyword.

## Next task: unit portraits, then the unit card

This is the rest of phase 1. It needs a real screen, which is why it was handed over.

1. **Portraits.** One picture per unit, rendered from its 3D model in the unit's colour, to replace the flat glyphs
   and the three-letter tags over time. `tools/skin-pic.js` already renders one model to a 192 px transparent PNG
   (`img/skins/`); a `tools/unit-pic.js` on the same lines can write `img/units/<unit>.png` for all 28. Some units
   have no model of their own (`Models3D.kindOf` gives them a generic one): list those for the owner instead of
   shipping a generic face. Show him a sheet of all 28 before wiring anything in.
2. **The unit card on the Units screen**, in three layers (rule 6 of the plan):
   - glance: the portrait, the verb symbol in its role colour, the cost;
   - hover or hold: the keyword's line (at most 8 words), later its demo;
   - sheet: the numbers and skills, as today.
   The card today is in `src/diorama.js` (search `damage a second`): it lists health, damage a second, range, speed
   and splash as numbers and the skill names. The full sheet is in `src/site-template.html` (search
   `Strong against`). Read the registry at build time (`src/build.js`) rather than copying it into the page by hand.
3. Leave the shop cards, the picks and the match screen alone: that is phase 2.

## How he works (learned in this session)

- **Show, then ask.** He judges by pictures. Send the image and say in one or two lines what changed.
- **Offer two or three candidates** when redrawing, and say which you would pick and why. He picks fast.
- **Change only what he named.** "Small changes" means small: a full redesign of the wizards was taken back.
- He likes symbols that look like a game or a battle, not an office (a pie chart for Shred was rejected; claw marks
  were accepted).
- Replies in plain text: no bold markers, no tables in chat. Direct answers. Explain any new term before using it.
- Keep usage low: no re-reading of things already read, no screenshots for number changes.
- After each session: update `PATCH-NOTES.md` (newest first; rewrite an entry you rework), commit, push the branch.

## Running things

```
node tools/tests/keywords.js --report       # the check, and docs/KEYWORDS-TAGGING.md
node tools/keyword-sheet.js out.png         # docs/keyword-icons.html and a screenshot
node tools/model-sheet.js out.png wizards   # models side by side
node src/build.js                           # index.html, lab.html, lab3d.html (a plain build is the Diorama on PC)
```

Seeing the Diorama: `index.html?ui=diorama&fly=off&board=3d`. In a cloud workspace 3D runs in software at 1 to 2
frames a second, and a headless browser counts as a phone unless Playwright launches it (it needs a hovering
pointer for the PC layout); `localStorage['phone-bellum-3d-quality'] = 'low'` helps a little. On the owner's PC none
of that applies.
