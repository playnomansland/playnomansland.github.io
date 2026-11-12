// The keyword registry's check (phase 1 of the design plan, 2026-11-12). Headless, no browser.
// It fails when the registry and the roster disagree: a unit without a verb, a skill type that is not sorted, a
// keyword that is not in the registry, more wave 1 keywords than the cap, or a keyword line over the word limit.
// A missing kit part (icon, fx, sound, demo) is reported, not failed: none are made yet.
// Run from the repo root:  node tools/tests/keywords.js            (check only)
//                          node tools/tests/keywords.js --report   (also writes docs/KEYWORDS-TAGGING.md)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const E = require('../../src/engine.js');
const roster = require('../../src/default-roster.json');
const reg = require('../../src/keyword-registry.json');

const own = (o) => Object.keys(o).filter(k => k[0] !== '_');
const KW = reg.keywords, ROLES = reg.roles, UNITS = reg.units, ST = reg.skillTypes, R = reg.rules;
const rolesOf = (w) => [].concat(w.role);
const roleNames = (w) => rolesOf(w).map(r => ROLES[r].name).join(' or ');
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const skills = Array.isArray(roster.skills) ? roster.skills : Object.values(roster.skills);
const skillById = Object.fromEntries(skills.map(s => [s.id, s]));

// ---------- the registry itself ----------
const wave1 = own(KW).filter(k => KW[k].wave === 1);
assert(wave1.length <= R.wave1Cap, `wave 1 has ${wave1.length} keywords, the cap is ${R.wave1Cap}: retire one before adding one`);
for (const k of own(KW)) {
  const w = KW[k];
  for (const r of rolesOf(w)) assert(ROLES[r], `keyword ${k}: unknown role "${r}"`);
  assert(w.wave === 1 || w.wave === 2, `keyword ${k}: wave must be 1 or 2`);
  if (w.wave !== 1) continue;
  assert(w.line && words(w.line) <= R.maxWords, `keyword ${k}: its line needs 1 to ${R.maxWords} words ("${w.line || ''}")`);
  for (const part of R.kit) assert(part in w, `keyword ${k}: kit part "${part}" is missing (use null until it is made)`);
}

// ---------- units ----------
const rosterNames = roster.units.map(u => u.name);
for (const n of rosterNames) {
  const t = UNITS[n];
  assert(t, `unit "${n}" is in the roster but has no entry in keyword-registry.json`);
  if (t.verb) assert(KW[t.verb], `unit "${n}": verb "${t.verb}" is not a keyword`);
  else assert(ROLES[t.role], `unit "${n}": needs a verb (a keyword) or a role alone`);
  for (const a of t.also || []) assert(KW[a], `unit "${n}": also "${a}" is not a keyword`);
}
for (const n of own(UNITS)) assert(rosterNames.includes(n), `keyword-registry.json has a unit "${n}" that is not in the roster`);

// ---------- skills ----------
const kindOf = (type) => {
  const t = ST[type];
  assert(t, `skill type "${type}" is used in the roster but is not sorted in keyword-registry.json`);
  const n = (t.keywords ? 1 : 0) + (t.stat ? 1 : 0) + (t.unfit ? 1 : 0);
  assert(n === 1, `skill type "${type}": give it exactly one of keywords, stat, unfit`);
  if (t.stat) return 'stat';
  if (t.unfit) return 'unfit';
  for (const k of t.keywords) assert(KW[k], `skill type "${type}": "${k}" is not a keyword`);
  return t.keywords.every(k => KW[k].wave === 1) ? 'wave1' : 'wave2';
};
const usedIds = [...new Set(roster.units.flatMap(u => u.skills || []))].filter(id => skillById[id]);
const used = usedIds.map(id => skillById[id]);
const all = skills.map(s => ({ s, kind: kindOf(s.type) }));
for (const type of own(ST)) assert(skills.some(s => s.type === type), `keyword-registry.json sorts a skill type "${type}" that no skill uses`);

const count = (kind) => all.filter(x => x.kind === kind).length;
const types = (kind) => [...new Set(all.filter(x => x.kind === kind).map(x => x.s.type))];
const unitsW1 = rosterNames.filter(n => UNITS[n].verb ? KW[UNITS[n].verb].wave === 1 : true);
// ---------- role plates and the armor set ----------
for (const r of own(ROLES)) assert(ROLES[r].plate && ROLES[r].glyph, `role ${r}: needs a plate and a glyph placement`);
for (const set of ['armor', 'levels']) for (const a of own(reg[set]).filter(k => k !== 'color')) assert(reg[set][a].name && reg[set][a].icon, `${set} ${a}: needs a name and an icon`);
const kitDone = wave1.filter(k => R.kit.every(p => KW[k][p]));

const sum = {
  keywords: wave1.length, cap: R.wave1Cap, units: rosterNames.length, unitsW1: unitsW1.length,
  skills: skills.length, skillTypes: new Set(skills.map(s => s.type)).size,
  wave1: count('wave1'), wave2: count('wave2'), stat: count('stat'), unfit: count('unfit'), kitDone: kitDone.length,
};
console.log(`keywords: ${sum.keywords} in wave 1 (cap ${sum.cap}), ${sum.kitDone} with a full kit`);
console.log(`units: ${sum.unitsW1} of ${sum.units} have a wave 1 verb or a role alone`);
console.log(`skills: ${sum.skills} (${sum.skillTypes} types): ${sum.wave1} read with wave 1 keywords, ${sum.stat} are plain stat changes, ${sum.wave2} need a wave 2 keyword, ${sum.unfit} fit no keyword`);
console.log('keywords check passed');

// ---------- the report ----------
if (process.argv.includes('--report')) {
  const desc = (s) => { try { return E.describeSkill(s); } catch (e) { return ''; } };
  const ownersOf = (id) => roster.units.filter(u => (u.skills || []).includes(id)).map(u => u.name);
  const kwName = (k) => KW[k].name;
  const L = [];
  L.push('# Keyword tagging: today\'s game in the wave 1 keywords', '');
  L.push('Written by `node tools/tests/keywords.js --report` from `src/keyword-registry.json` and `src/default-roster.json`. Do not edit by hand: change the registry and run it again.', '');
  L.push('Nothing in the game reads the registry yet. This page only shows how well a small keyword list describes the game as it is.', '');
  L.push('## In short', '');
  L.push(`- **${sum.keywords} keywords** in wave 1 (the cap is ${sum.cap}). ${sum.kitDone} have their full kit (icon, fight effect, sound, demo).`);
  L.push(`- **${sum.unitsW1} of ${sum.units} units** have a wave 1 keyword as their verb, or are their role alone (a Guard with no keyword is a tank).`);
  L.push(`- **${sum.skills} skills** of ${sum.skillTypes} types: **${sum.wave1}** read with wave 1 keywords alone, **${sum.stat}** are plain stat changes that need no keyword, **${sum.wave2}** need a wave 2 keyword, **${sum.unfit}** fit no keyword.`, '');
  L.push('## Wave 1 keywords', '', '| Keyword | Role | Line | Units with it as their verb | Skills that give it |', '| --- | --- | --- | --- | --- |');
  for (const k of wave1) {
    const us = rosterNames.filter(n => UNITS[n].verb === k);
    const ss = all.filter(x => (ST[x.s.type].keywords || []).includes(k)).map(x => x.s.name);
    L.push(`| ${kwName(k)} | ${roleNames(KW[k])} | ${KW[k].line} | ${us.join(', ') || 'none'} | ${ss.length ? ss.length + ': ' + ss.join(', ') : 'none'} |`);
  }
  L.push('', '## Units', '', 'Verb = what the unit does in today\'s build. Planned = the job in the Roster doc, where it differs.', '', '| Unit | Verb today | Also built in | Planned | Note |', '| --- | --- | --- | --- | --- |');
  for (const n of rosterNames) {
    const t = UNITS[n];
    L.push(`| ${n} | ${t.verb ? kwName(t.verb) + (KW[t.verb].wave === 2 ? ' (wave 2)' : '') : ROLES[t.role].name + ' (the role alone)'} | ${(t.also || []).map(kwName).join(', ')} | ${t.planned ? (KW[t.planned] ? kwName(t.planned) : t.planned) : ''} | ${t.note || ''} |`);
  }
  const table = (kind, last, cell) => {
    L.push('| Skill | On | What it says today | ' + last + ' |', '| --- | --- | --- | --- |');
    for (const x of all.filter(y => y.kind === kind)) L.push(`| ${x.s.name} | ${ownersOf(x.s.id).join(', ') || 'no unit'} | ${desc(x.s).replace(/\|/g, '/')} | ${cell(x.s)} |`);
    L.push('');
  };
  L.push('', `## Skills that need a wave 2 keyword (${sum.wave2})`, '');
  table('wave2', 'Keywords', (s) => ST[s.type].keywords.map(k => kwName(k) + (KW[k].wave === 2 ? ' (wave 2)' : '')).join(', '));
  L.push(`## Skills that fit no keyword (${sum.unfit})`, '');
  table('unfit', 'Why', (s) => ST[s.type].unfit);
  L.push(`## Plain stat changes (${sum.stat})`, '', 'These need no keyword: on a card they show as a change in pips.', '');
  L.push(all.filter(x => x.kind === 'stat').map(x => x.s.name).join(', ') + '.', '');
  L.push('## Wave 2 keywords used above', '');
  const w2 = own(KW).filter(k => KW[k].wave === 2 && (all.some(x => (ST[x.s.type].keywords || []).includes(k)) || rosterNames.some(n => UNITS[n].verb === k)));
  const lone = rosterNames.filter(n => !UNITS[n].verb);
  if (lone.length) L.push('Units that are their role alone: ' + lone.map(n => `${n} (${ROLES[UNITS[n].role].name})`).join(', ') + '.', '');
  L.push(w2.map(k => `${kwName(k)} (${all.filter(x => (ST[x.s.type].keywords || []).includes(k)).length} skills)`).join(', ') + '.', '');
  fs.writeFileSync(path.join(__dirname, '../../docs/KEYWORDS-TAGGING.md'), L.join('\n'));
  console.log('wrote docs/KEYWORDS-TAGGING.md');
}
