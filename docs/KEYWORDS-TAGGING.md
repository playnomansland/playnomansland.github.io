# Keyword tagging: today's game in the wave 1 keywords

Written by `node tools/tests/keywords.js --report` from `src/keyword-registry.json` and `src/default-roster.json`. Do not edit by hand: change the registry and run it again.

Nothing in the game reads the registry yet. This page only shows how well a small keyword list describes the game as it is.

## In short

- **19 keywords** in wave 1 (the cap is 19). 0 have their full kit (icon, fight effect, sound, demo).
- **27 of 28 units** have a wave 1 keyword as their verb, or are their role alone (a Guard with no keyword is a tank).
- **85 skills** of 59 types: **32** read with wave 1 keywords alone, **4** give a passive mechanic (Shield or Ward: not keywords), **28** are plain stat changes that need no keyword, **9** need a wave 2 keyword, **12** fit no keyword.

## Wave 1 keywords

| Keyword | Role | Line | Units with it as their verb | Skills that give it |
| --- | --- | --- | --- | --- |
| Strike | Damage | Hits one enemy up close. | Goblin Swarm, Brute, Rogue, Spiders | none |
| Shoot | Damage | Hits one enemy from range. | Skeleton Archers, Sniper, Wisps, Leaf Wizard, Sun Priest | 1: Eye of the Obelisk |
| Splash | Damage | Hits everything in a small circle. | Ember Imps, Fire Mage, Flame Wizard, Slime Wizard, Meteor Caller, Slimeshots | 4: Death burst (death effect), Explode on death (death effect), Explode on death (death effect), Snow storm |
| Pierce | Damage | Hits every enemy in a line. | Earth Wizard | none |
| Shred | Damage | Cuts a share of the target's health. | Truespear | none |
| Rush | Guard | Charges in and knocks enemies back. | War Mammoth | 1: Bullhead |
| Taunt | Guard | Enemies nearby must attack it. | none | none |
| Pull | Control | Drags an enemy to it. | Catcher (V2WIP) | 1: Grasping roots |
| Teleport | Control or Support | Moves a squad somewhere else at once. | Warper (V2WIP) | none |
| Displace (covers Stun, Root, Knockback) | Control | Pushes, roots or stuns an enemy. | none | 3: Anemia, Living armor, Deepfreeze |
| Burn | Afflict | Fire damage over a short time. | none | 1: Spitfire |
| Slow | Afflict | Enemies move and attack slower. | Frost Wizard | 4: Slow, Web-shots, Deepfreeze, Snow storm |
| Poison | Afflict | Damage over time, past armor. | none | 4: Poison shot, Poisonous fangs, Graverot arrows, Eye of the Obelisk |
| Bleed | Afflict | Stacking wounds that hurt over time. | Shiv, Assassin | 3: Too deep, Anemia, Shape Titanium spears |
| Heal | Support | Gives health back. | Water Mage | 4: Regeneration, Healing touch, Lifesteal, Pool shaper |
| Carry | Support | Carries a squad into the fight. | Just a horse | none |
| Hide | Support | Unseen until it attacks. | none | 5: Stealth, Cavestalkers, Hunter, Shadowborn, Silent blade |
| Reveal | Support | Sees hidden enemies. | none | 2: Overwatch, Hunter |
| Spawn | Conjure | Brings more bodies into the fight. | Necromancer | 6: Spawn goblins, Raise dead, Spiderlings (death effect), Summon water elemental, More where that came from, Summon hellfiend |

## Units

Verb = what the unit does in today's build. Planned = the job in the Roster doc, where it differs.

| Unit | Verb today | Also built in | Planned | Note |
| --- | --- | --- | --- | --- |
| Goblin Swarm | Strike |  |  |  |
| Skeleton Archers | Shoot |  |  |  |
| Ember Imps | Splash |  |  |  |
| Fire Mage | Splash |  |  |  |
| Sniper | Shoot |  |  | Snipe folds into Shoot with long range. |
| Brute | Strike |  |  |  |
| Wisps | Shoot |  |  |  |
| Leaf Wizard | Shoot |  |  |  |
| Earth Wizard | Pierce |  | Hurl: a boulder that stops at the first unit it hits. |  |
| Flame Wizard | Splash |  | Burn | A flame cone with no burn built in today; Spitfire is a skill. |
| Steel Wizard | Guard (the role alone) |  | Pierce |  |
| Slime Wizard | Splash |  |  |  |
| Ether Golem | Guard (the role alone) |  |  |  |
| Sun Priest | Shoot |  |  |  |
| Meteor Caller | Splash |  |  |  |
| War Mammoth | Rush |  |  |  |
| Necromancer | Spawn |  |  |  |
| Ent | Guard (the role alone) |  |  |  |
| Slimeshots | Splash |  | Shoot | Has 3 m splash today; the Verbs doc lists it as Shoot. |
| Just a horse | Carry |  |  |  |
| Rogue | Strike |  |  |  |
| Spiders | Strike |  | Poison | No poison built in today; Poisonous fangs is a skill. |
| Truespear | Shred |  |  |  |
| Shiv | Bleed |  |  |  |
| Water Mage | Heal | Splash |  |  |
| Assassin | Bleed | Hide |  |  |
| Frost Wizard | Slow |  |  |  |
| Obelisk | Grow (wave 2) | Heal |  | Grow is wave 2, so the Obelisk has no wave 1 verb. On hold in the Roster doc as well. |

## Skills that need a wave 2 keyword (9)

| Skill | On | What it says today | Keywords |
| --- | --- | --- | --- |
| Shortsight | Sun Priest | Hits cut enemy range by 6 m for 4 s. | Blind (wave 2) |
| Forward planting | no unit | Can deploy in no man’s land. | Arrive elsewhere (wave 2) |
| Pool shaper | Water Mage | Attacks leave pools: they hurt enemies, heal and speed up allies. +2 m splash, −0.2 attacks/s. | Leave behind (wave 2), Heal |
| Reforge | Steel Wizard | +2 armor. Allies within 8 m: +20 hit, +0.1 attacks/s. | Boost (wave 2) |
| Forward planting | Ent | Can deploy in no man’s land. +10% health. | Arrive elsewhere (wave 2) |
| Hunter | Sniper | Marks an enemy squad. Always shoots a marked enemy in its range, for +100% damage, and sees it through stealth. Hidden until it attacks. Hides again 1.5 s after it stops attacking. | Mark (wave 2), Hide, Reveal |
| Bouncing blade | Leaf Wizard | Shots bounce 2 times for 30%. | Chain (wave 2) |
| Gluttony | Obelisk | Eats +1 a round. | Grow (wave 2) |
| Hunger’s haste | Obelisk | Glut also gives +0.1 m/s, +1.5% attack speed. | Grow (wave 2) |

## Skills that give a passive mechanic (4)

Mechanics are bonuses a body carries, like armor: not keywords.

| Skill | On | What it says today | Mechanic |
| --- | --- | --- | --- |
| Ward | Rogue | Takes at most 40 damage per hit. | Ward: Caps the damage of each hit. |
| Bone shield | no unit | Blocks the first hit each fight. | Shield: Blocks a set number of hits. |
| Dread rangers | Skeleton Archers | Blocks the first hit each fight. +2 m range. | Shield: Blocks a set number of hits. |
| Transphysical | Wisps | Takes at most 40 damage per hit. | Ward: Caps the damage of each hit. |

## V2WIP: the new units and skills

From `src/v2wip.json` (a developer roster; the live roster is unchanged).

| Unit | Verb | Role | Also built in | Note |
| --- | --- | --- | --- | --- |
| Warper | Teleport | Control | Displace | Roots the enemy squad straight across for 1.5 s, then teleports it to a chosen tile. |
| Catcher | Pull | Control |  | A hook reels the first enemy it touches into melee. |

| Skill | Keywords | Note |
| --- | --- | --- |
| Netcaster | Pull, Splash | The hook pulls up to 4 bodies; its strikes splash. |
| Gutter | Bleed | Strikes add bleed; the longer, faster hook is a stat change. |

## Skills that fit no keyword (12)

| Skill | On | What it says today | Why |
| --- | --- | --- | --- |
| Split beam | Sun Priest | Hits 4 enemies at once. −30% range. | Hits several targets at once (see turret). |
| Dual Flame | Fire Mage | Attacks 2 different enemies at once. | Hits several targets at once. Three skill types do this (turret, split, multibeam): a candidate for one keyword. |
| Dual Spear | Truespear | Attacks 2 different enemies at once. | Hits several targets at once. Three skill types do this (turret, split, multibeam): a candidate for one keyword. |
| Spread | no unit | Bodies scatter 1–6 m at fight start. | Changes the squad's formation. A deploy rule, not a fight keyword. |
| Dodge | no unit | 33% chance to dodge hits. | Avoids hits by chance. Chance is hard to show; could fold into Shield. |
| Tacticalness | Goblin Swarm | Bodies scatter 1–6 m at fight start. +3 bodies. | Changes the squad's formation. A deploy rule, not a fight keyword. |
| Spirit walk | Wisps | Moves are free. | Changes a deploy rule (moves cost nothing). |
| Shadow hunter | Assassin | Hunts lone enemies. | Changes who it targets. Targeting has no keyword yet. |
| Wind walk | Leaf Wizard | Dodge every 5th attack. | Dodges every 5th attack (see dodge). |
| Leafblade | Leaf Wizard | Becomes a leaf-mech: blade swipes, homing missiles. +150% health, +4 armor. Dash cooldown 1.5 s. | Turns the unit into another unit. In the new system this is a path, not a skill. |
| Berserkers | Brute | Can’t be slowed or pushed. Roar: enemies near it attack 5% slower. | Immune to Slow and Push, plus a small enemy debuff. Would need an Immune rule. |
| Multibeam | Frost Wizard | +1 beam on other enemies. | Hits several targets at once (see turret). |

## Plain stat changes (28)

These need no keyword: on a card they show as a change in pips.

Armor and health, Rapid fire, Swift strikes, Heavy shot, Long reach, Gallop, Frenzy, Ember Mortar, Steel plating, Aeroblades, Waterbomb, Flow state, Heavy metal, Stone spikes, AAARGH!, Tuff skin, Rampager, Longbones, Reinforced Bark, Ranger scope, Deadeye, Assaultgunner, Sightweavers, Flare, Death Flurry, Petalburst, Glacial gaze, Crushing maw.

## Wave 2 keywords used above

Units that are their role alone: Steel Wizard (Guard), Ether Golem (Guard), Ent (Guard).

Blind (1 skills), Mark (1 skills), Boost (1 skills), Arrive elsewhere (2 skills), Grow (2 skills), Leave behind (1 skills), Chain (1 skills).
