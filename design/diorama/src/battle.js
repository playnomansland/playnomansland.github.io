// ===== The battle screen in the Diorama's look: a prototype on a real match against the computer (2026-11-08) =====
// The board is the game's own 3D renderer (src/render3d.js) running edge to edge; the match is the game's engine
// (src/game.js), the computer is the game's AI. Everything the deploy panel does in the game works here the same way
// (panelDeploy() in src/site-template.html): gold, deployments left and +1, the clock, Help, Ready (with the carry-cap
// warning), the hint line, Loan / Pay back, Undo all, Refund unused, the shop by tier with Unlock, cards dragged onto
// the board or picked and tapped, squads dragged to move or back onto the shop to take them back, a squad's own actions
// (take back, level up, sell), and round 1's start pick, round 2's leader and round 3's tower as picks over the board.
// Not here (yet): leaders' and maps' own extras (Otto's slots, Zoe's tiles, Mark, Fortify, the elves, the altar...),
// skills, phone layouts, online play. URL: ?look=<Game.SKINS id> (default meadow), ?timer=off (no deploy clock),
// ?cam=top (open in the game's top-down view instead of the tilted one). window.__battle: hooks for checks and shots.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const Q = new URLSearchParams(location.search);
const units = Shapes.assign(DATA.units).map(u => ({ ...Engine.withTraits(u), level: 0, bodies: Math.max(1, Math.round(u.bodies)), skillDefs: Engine.SLOTS.map(() => null) }));
const ME = 0, FOE = 1;
const DEPLOY_MS = 90 * 1000, AI_READY_MS = 5000;
const TIER_COLORS = ['#9AA5A8', '#6FD08C', '#5BA8F5', '#C58BF2', '#F2B84B'];
const tierOf = (i) => Game.tierOf(units, i);
const tierColor = (t) => TIER_COLORS[Math.min(TIER_COLORS.length - 1, t - 1)];
const now = () => performance.now();
const plural = (n, w) => `${n} ${n === 1 ? w : w === 'body' ? 'bodies' : w + 's'}`;
const SHARD = '<svg class="shard" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="2,9 61,0 99,6 96,93 38,100 0,86"/></svg>';
const SONGS = { deploy: ['Bulgaria', 'audio/bulgaria.mp3'], battle: ['Habbyourmam', 'audio/habbyourmam.mp3'] };

// ---------- the match ----------
let m = null, hpMax = 100, phase = 'deploy'; // deploy | battle | result | end
let bt = null, pre = null, fx = [], acc = 0, summary = null, lastSummary = null;
let selected = null, drag = null, dragEndAt = 0, hoverTile = null, cardDrag = null;
let ready = [false, false], deadline = 0, timeUp = false, aiReadyAt = 0, aiRound = 0, fightAt = 0;
let timerOn = Q.get('timer') !== 'off', look = Game.SKINS.some(s => s.id === Q.get('look')) ? Q.get('look') : 'meadow';
let undoSnap = null, capWarn = false, shopOpen = true, unlockTier = null, sqOpen = null, pickSel = null, pickHidden = false, sheetKind = null;

function newMatch() {
  m = Game.createMatch(units, DATA.matrix, (Math.random() * 1e9) >>> 0, 'standard', null, [], { skin: look });
  hpMax = m.hp[ME]; lastSummary = null;
  startRound();
}
function startRound() {
  phase = 'deploy'; bt = null; pre = null; fx = []; summary = null;
  selected = null; drag = null; sqOpen = null; unlockTier = null; pickSel = null; pickHidden = false;
  ready = [false, false]; timeUp = false; capWarn = false; aiReadyAt = 0; fightAt = 0;
  deadline = timerOn ? now() + DEPLOY_MS : 0;
  closeSheet();
  aiTurn();
  music();
  paint();
}
// the computer's side, as lab3d's: its package (round 1), its leader once it's its turn to pick, its squads and tower
function aiTurn() {
  if (aiRound === m.round || phase !== 'deploy') return;
  if (Game.needsLeaderPick(m, FOE)) { if (!Game.leaderTurn(m, FOE)) return; Game.pickLeader(m, FOE, Game.draftLeft(m)[0]); }
  if (Game.needsPack(m, FOE)) Game.choosePack(m, FOE, Math.floor(Math.random() * m.packages[FOE].length));
  Game.aiDeploy(m, FOE); Game.ensureTower(m, FOE);
  if (m.round === 1) Game.ensurePack(m, FOE);
  aiRound = m.round;
}
// the pick this player owes before deploying: round 1's start, the leader (on their turn), round 3's tower
const myPick = () => phase !== 'deploy' || !m ? null : Game.needsPack(m, ME) ? 'pack'
  : Game.needsLeaderPick(m, ME) && Game.leaderTurn(m, ME) ? 'leader' : Game.needsTowerPick(m, ME) ? 'tower' : null;
const placingTower = () => phase === 'deploy' && !myPick() && Game.needsTower(m, ME);
const editable = () => phase === 'deploy' && !ready[ME] && !timeUp;
const locked = (i) => !Game.isUnlocked(m, ME, i);
const freeN = (i) => Game.freeLeft(m, ME).filter(x => x === i).length;
const canBuy = (i) => editable() && !myPick() && !placingTower() && !Game.capFull(m, ME, i)
  && (freeN(i) > 0 || (!locked(i) && m.gold[ME] >= Game.shopCost(m, ME, i) && Game.deploysLeft(m, ME, i) > 0));

// ---------- Undo all: this side as it stood once the round's picks were done (the game's takeUndoSnap) ----------
const sideNow = () => JSON.stringify(Referee.sideState(m, ME));
function takeSnap() { if (editable() && !myPick() && (!undoSnap || undoSnap.round !== m.round)) undoSnap = { round: m.round, state: sideNow() }; }
const undoable = () => editable() && undoSnap && undoSnap.round === m.round && sideNow() !== undoSnap.state;

// ---------- a change: redraw the words (the board draws itself every frame) ----------
function changed() { capWarn = false; paint(); }
function paint() {
  takeSnap();
  document.body.classList.toggle('fighting', phase !== 'deploy');
  paintSides(); paintRound(); paintCol(); paintMoment(); paintSheet();
}

// ---------- top: you, the round, the opponent ----------
function hpShown(sd) { return phase === 'battle' && summary ? summary.hpBefore[sd] : m.hp[sd]; }
function sideHtml(sd) {
  const hp = hpShown(sd), w = Math.max(0, hp / hpMax * 100);
  const lost = phase === 'result' && summary && summary.dmg[sd] > 0 ? summary.dmg[sd] / hpMax * 100 : 0;
  const name = sd === ME ? 'Wren' : 'Computer', ttl = sd === ME ? '<span class="ttl" style="color:#F2B23A">Day 1</span>' : '<span class="ttl" style="opacity:.7">AI</span>';
  const streak = (m.streak && m.streak[sd]) >= 2 ? `<span class="streak">${m.streak[sd]} in a row</span>` : '';
  let state = '';
  if (sd === FOE && phase === 'deploy') state = ready[FOE] ? '<span class="tag">Ready</span>' : 'Deploying…';
  if (sd === FOE && phase === 'deploy' && Game.charOf(m, FOE)) state += `${state ? '<br>' : ''}<span style="opacity:.8">Leader: ${esc(charName(Game.charOf(m, FOE)))}</span>`;
  if (sd === ME && phase === 'deploy' && Game.charOf(m, ME)) state = `<span style="opacity:.8">Leader: ${esc(charName(Game.charOf(m, ME)))}</span>`;
  return `<div class="who">${sd === ME ? `${esc(name)} ${ttl} ${streak}` : `${streak} ${ttl} ${esc(name)}`}</div>
    <div class="hp"><b class="num">${hp}</b><span class="bar" role="meter" aria-label="Health" aria-valuemin="0" aria-valuemax="${hpMax}" aria-valuenow="${hp}" style="--w:${w}%;--lost:${lost}%"><i></i>${lost ? '<s></s>' : ''}</span></div>
    ${state ? `<div class="state">${state}</div>` : ''}`;
}
let sidesKey = '';
function paintSides() {
  const k = JSON.stringify([phase, hpShown(0), hpShown(1), ready, m.round, m.chars, m.streak]);
  if (k === sidesKey) return; sidesKey = k;
  $('you').innerHTML = sideHtml(ME); $('foe').innerHTML = sideHtml(FOE);
}
const charName = (id) => (Game.CHARACTERS.find(c => c.id === id) || { name: id }).name;
const PH = { deploy: 'Deploy', battle: 'Battle', result: 'Result', end: 'Match over' };
let songOn = false;
function paintRound() {
  const r = phase === 'deploy' || phase === 'end' ? m.round : pre ? pre.round : m.round;
  const song = SONGS[phase === 'deploy' ? 'deploy' : 'battle'];
  $('round').innerHTML = `<div class="k">Standard · ${esc((Game.SKINS.find(s => s.id === look) || {}).name || '')}</div>
    <h1>Round ${phase === 'end' ? m.round - 1 : r} · <span class="ph">${PH[phase]}</span></h1>
    <nav aria-label="Match">
      <button data-sheet="damage" aria-expanded="${sheetKind === 'damage'}" ${lastSummary ? '' : 'disabled style="opacity:.35"'}>Damage</button>
      <button data-sheet="settings" aria-expanded="${sheetKind === 'settings'}">Settings</button>
      <button class="song" id="song" aria-label="${songOn ? 'Pause' : 'Play'} the music">${songOn ? '❚❚' : '▶'} <b>${song[0]}</b> by Snetänd</button>
    </nav>`;
  $('round').querySelectorAll('[data-sheet]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); openSheet(b.dataset.sheet, b); }));
  $('song').addEventListener('click', () => { songOn = !songOn; music(); paintRound(); });
}
// the deployment and battle music (from the repo's audio/; the self-contained build has none, so the line just says it)
const audio = new Audio(); audio.loop = true; audio.volume = 0.5;
function music() {
  const s = SONGS[phase === 'deploy' ? 'deploy' : 'battle'][1];
  if (!songOn) { audio.pause(); return; }
  if (!audio.src.endsWith(s)) audio.src = s;
  audio.play().catch(() => {});
}

// ---------- the left column ----------
function hintText() {
  const u = (i) => esc(units[i].name), left = Game.deploysLeft(m, ME);
  if (!editable()) return ready[ME] ? (ready[FOE] ? 'Both ready. To battle.' : 'You’re ready. Waiting for the computer.') : timeUp ? 'Time’s up.' : '';
  if (myPick()) return 'Choose first: the board waits.';
  if (placingTower()) return 'Tap a <b>gold tile</b> to place your tower.';
  if (selected !== null) return canBuy(selected) ? `Tap a tile in your zone to place <b>${u(selected)}</b>. Esc to put it down.`
    : Game.capFull(m, ME, selected) ? `${Game.LATE.cap} squads of ${u(selected)} is the most you can have.`
    : Game.deploysLeft(m, ME, selected) <= 0 ? 'No deployments left this round.' : `Not enough gold for ${u(selected)}.`;
  const freeL = Game.freeLeft(m, ME);
  if (freeL.length) return `Place your free squads: ${[...new Set(freeL)].map(i => `${freeL.filter(x => x === i).length}× ${u(i)}`).join(', ')}.`;
  if (m.round === 1 && m.armies[ME].some(s => s.free) && !m.armies[ME].some(s => !s.free && s.round === m.round)) return 'Your free squads are on the board: drag them where you want them. Then spend your gold.';
  const readyN = m.armies[ME].filter(s => Game.isReady(m, s)).length;
  if (readyN) return `${plural(readyN, 'squad')} ready to level up: tap ${readyN === 1 ? 'it' : 'one'} on the board.`;
  if (left <= 0) return Game.deployBuyable(m, ME) ? `No deployments left. <b>+1</b> costs ${Game.deployCost(m, ME)}.` : 'No deployments left. Tap a squad to level it up.';
  const fresh = m.armies[ME].some(s => s.round === m.round && !s.free);
  return fresh ? 'Drag a squad to move it, or back onto the shop to take it back.' : 'Drag a card onto your zone, or pick one and tap a tile.';
}
function cardHtml(i) {
  const u = units[i], free = freeN(i), stars = Engine.SLOTS.filter(k => Game.hasSkill(m, ME, i, k)).length, dis = !canBuy(i);
  return `<button class="card" data-i="${i}" style="--tc:${tierColor(tierOf(i))}" aria-pressed="${selected === i}" aria-disabled="${dis}" aria-label="${esc(u.name)}, ${free ? `${free} free` : `${Game.shopCost(m, ME, i)} gold`}">
    ${stars ? `<span class="st">${'★'.repeat(stars)}</span>` : ''}${Game.capped(m, i) ? `<span class="cap">${Game.capCount(m, ME, i)}/${Game.LATE.cap}</span>` : ''}
    <span class="ic" style="color:${u.color}">${Shapes.svg(u.shape, 30)}</span><span class="n">${esc(u.name)}</span>
    <span class="c${free ? ' free' : ''}">${free ? `Free ×${free}` : Game.shopCost(m, ME, i)}</span></button>`;
}
const ADD_FRAME = '<svg class="frame" viewBox="0 0 70 92" preserveAspectRatio="none" aria-hidden="true"><polygon points="1,1 57,1 69,13 69,91 1,91"/></svg>';
function shopHtml() {
  const tiers = [...new Set(units.map((u, i) => Game.isOff(m, i, ME) ? 0 : tierOf(i)))].filter(t => t > 0).sort((a, b) => a - b);
  return tiers.map(t => {
    const idx = units.map((u, i) => i).filter(i => tierOf(i) === t && !Game.isOff(m, i, ME));
    const open = idx.filter(i => !locked(i) || freeN(i) > 0), rest = idx.filter(i => locked(i) && !freeN(i)).length;
    return `<div class="tier" style="--tc:${tierColor(t)}"><div class="lab" aria-label="Tier ${t}, ${Game.shopCost(m, ME, idx[0])} gold"><b>${t}</b><span>${Game.shopCost(m, ME, idx[0])}</span></div><div class="cards">
      ${open.map(cardHtml).join('')}
      ${rest ? `<button class="card add" data-add="${t}" aria-expanded="${unlockTier === t}" aria-label="Unlock a tier ${t} unit, ${rest} left">${ADD_FRAME}<span class="p">+</span><span class="n">Unlock</span><span class="c">${rest} more</span></button>` : ''}
    </div></div>`;
  }).join('');
}
function paintCol() {
  const col = $('col');
  if (phase !== 'deploy') { paintFight(); return; }
  const g = m.gold[ME], left = Game.deploysLeft(m, ME), allowed = Game.deploysAllowed(m, ME), can = editable();
  const pips = Array.from({ length: Math.max(allowed, 0) }, (_, k) => `<i class="${k < left ? 'on' : ''}"></i>`).join('');
  const xb = [
    undoable() ? '<button class="w" id="undo-all">Undo all</button>' : '',
    Game.loanNow(m, ME) ? `<button class="w" id="loan-undo" ${can && g >= Game.loanTaken(m, ME).gold ? '' : 'disabled'}>Pay back loan <small>−${Game.loanTaken(m, ME).gold}</small></button>`
      : !myPick() ? `<button class="w" id="loan" ${can && Game.canTakeLoan(m, ME) ? '' : 'disabled'} title="Take ${Game.loanTerms(m, ME).gold} gold now; next round you get ${Game.loanTerms(m, ME).payback} less.">Loan <small>+${Game.loanTerms(m, ME).gold}</small></button>` : '',
    can && m.extraDeploys[ME] > 0 && left > 0 ? `<button class="w" id="refund-deploy">Refund unused <small>+${Game.deployCost(m, ME)}</small></button>` : '',
  ].join('');
  const lost = g - Game.CARRY_CAP;
  const readyLabel = ready[ME] ? 'Not ready' : capWarn ? 'Ready anyway' : 'Ready';
  const say = capWarn ? `<small>${g} gold: only ${Game.CARRY_CAP} carries over, so ${lost} will be lost.</small>`
    : ready[ME] ? `<small>${ready[FOE] ? 'The fight starts.' : 'Waiting for the computer.'}</small>` : `<small>${ready[FOE] ? 'The computer is ready.' : 'The computer is deploying.'}</small>`;
  const clock = deadline ? `<span class="clock num" id="clock"></span>` : '<span class="clock" style="opacity:.6;font-size:16px">No clock</span>';
  const shopKeep = col.querySelector('#shop') ? col.querySelector('#shop').scrollTop : 0;
  col.innerHTML = `
    <div class="purse">
      <div class="g"><b class="num">${g}</b><span>gold</span></div>
      <div class="deps"><span class="pips" aria-label="${Math.max(0, left)} of ${allowed} deployments left">${pips}</span>
        <small>${Math.max(0, left)} of ${allowed} deployments</small>
        ${Game.deployBuyable(m, ME) ? `<button class="chip" id="buy-deploy" ${can && Game.canBuyDeploy(m, ME) && !myPick() ? '' : 'disabled'}>+1 deployment · ${Game.deployCost(m, ME)}</button>` : ''}</div>
    </div>
    <p class="hint" aria-live="polite">${hintText()}</p>
    ${xb ? `<div class="xrow">${xb}</div>` : ''}
    <div class="shophd"><span>Shop</span><span class="rule"></span><button id="shop-fold" aria-expanded="${shopOpen}">${shopOpen ? 'Fold ▾' : 'Open ▴'}</button></div>
    <div id="shop" ${shopOpen ? '' : 'hidden'}>${shopHtml()}</div>
    <div style="flex:1" ${shopOpen ? 'hidden' : ''}></div>
    <div class="go">
      <button class="ready${ready[ME] ? ' on' : ''}${capWarn ? ' warn' : ''}${capWarn || ready[ME] ? ' small' : ''}" id="ready" ${timeUp || myPick() ? 'disabled' : ''}>${SHARD}${readyLabel}</button>
      <div class="say">${clock}${say}<button class="help" data-sheet="help">How to deploy</button></div>
    </div>`;
  if ($('shop')) $('shop').scrollTop = shopKeep;
  tickClock();
  wireCol();
}
function wireCol() {
  const on = (id, f) => { const b = $(id); if (b) b.addEventListener('click', f); };
  on('buy-deploy', () => { if (editable() && Game.buyDeploy(m, ME)) changed(); });
  on('loan', () => { if (editable() && Game.takeLoan(m, ME)) changed(); });
  on('loan-undo', () => { if (editable() && Game.undoLoan(m, ME)) changed(); });
  on('refund-deploy', () => { if (editable() && Game.refundDeploy(m, ME)) changed(); });
  on('undo-all', () => { if (!undoable()) return; Referee.restoreSide(m, ME, JSON.parse(undoSnap.state)); selected = null; sqOpen = null; changed(); });
  on('shop-fold', () => { shopOpen = !shopOpen; paint(); });
  on('ready', pressReady);
  $('col').querySelectorAll('[data-sheet]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); openSheet(b.dataset.sheet, b); }));
  $('col').querySelectorAll('.card[data-i]').forEach(b => {
    b.addEventListener('pointerdown', (e) => cardPress(e, +b.dataset.i, b));
    b.addEventListener('pointerenter', () => unitNote(+b.dataset.i, b));
    b.addEventListener('pointerleave', () => unitNote(null));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  $('col').querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); const t = +b.dataset.add; unlockTier = unlockTier === t ? null : t; openSheet(unlockTier ? 'unlock' : null, b); paint(); }));
}
function tickClock() {
  const c = $('clock'); if (!c || !deadline) return;
  const ms = Math.max(0, deadline - now()), s = Math.ceil(ms / 1000);
  const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  if (c.textContent !== txt) c.textContent = txt;
  c.classList.toggle('low', s <= 10);
}
function pressReady() {
  if (timeUp || myPick() || phase !== 'deploy') return;
  if (ready[ME]) { ready[ME] = false; paint(); return; }
  if (m.gold[ME] > Game.CARRY_CAP && !capWarn) { capWarn = true; paint(); return; } // the game's capCheck, as a second press
  capWarn = false; ready[ME] = true; selected = null; sqOpen = null; closeSheet(); paint();
}
// the column in a fight: what's left of each army, and a way to the end
function paintFight() {
  const col = $('col');
  const alive = (sd) => bt ? bt.bodies.filter(b => b.side === sd && b.alive && !b.u.structure).length : 0;
  const total = (sd) => bt ? Math.max(1, bt.bodies.filter(b => b.side === sd && !b.u.structure).length) : 1;
  if (!col.querySelector('.fight') || col.dataset.ph !== phase) {
    col.dataset.ph = phase;
    col.innerHTML = `<div class="purse"><div class="g"><b class="num">${m.gold[ME]}</b><span>gold ${phase === 'battle' ? 'after the fight' : 'next round'}</span></div></div>
      <div class="fight"><span class="k">${phase === 'battle' ? 'Fighting' : 'The armies'}</span>
        <div class="army" style="--tc:var(--you)"><span>You</span><span class="track"><i id="arm0"></i></span><span class="num" id="armn0"></span></div>
        <div class="army" style="--tc:var(--foe)"><span>Them</span><span class="track"><i id="arm1"></i></span><span class="num" id="armn1"></span></div>
        ${phase === 'battle' ? '<div class="xrow" style="margin-top:6px"><button class="w" id="skip">Skip to the end</button></div>' : ''}
      </div>`;
    if ($('skip')) $('skip').addEventListener('click', () => { if (phase === 'battle') { while (bt.step()) absorb(); fx = []; endFight(); } });
  }
  for (const sd of [0, 1]) { const a = alive(sd); $('arm' + sd).style.setProperty('--w', `${a / total(sd) * 100}%`); $('armn' + sd).textContent = a; }
}

// ---------- the unit note: a card pointed at ----------
function unitNote(i, el) {
  const n = $('unote'); if (i == null || cardDrag) { n.hidden = true; noteLine = null; drawLines(); return; }
  const u = units[i], r = el.getBoundingClientRect(), t = tierOf(i), c = $('col').getBoundingClientRect();
  const reach = u.range <= 1.6 ? 'melee' : `range ${Math.round(u.range)}`;
  const facts = [`Tier ${t}`, plural(u.bodies, 'body'), `${Math.round(u.hp)} health`, `hits ${Math.round(u.hit)}`, reach];
  const why = editable() && !canBuy(i) && !(locked(i) && !freeN(i)) ? (Game.deploysLeft(m, ME, i) <= 0 ? 'No deployments left.' : m.gold[ME] < Game.shopCost(m, ME, i) ? 'Not enough gold.' : '') : '';
  n.innerHTML = `<b>${esc(u.name)}.</b><small>${facts.join(' · ')}</small>${why ? `<small style="color:var(--saffron)">${why}</small>` : ''}`;
  // a Diorama note: the dot on the card, up into the gap above its row, then along under the words, which stand in the
  // open space right of the column (no line through a word)
  const y = r.top - 5, x = c.right + 26;
  n.hidden = false; n.style.left = x + 'px'; n.style.top = y + 'px';
  noteLine = { pts: [[r.left + r.width / 2, r.top + 14], [r.left + r.width / 2, y], [x + n.offsetWidth, y]] };
  drawLines();
}

// ---------- dragging a card onto the board (the game's cardPress), or a tap to pick it ----------
function cardPress(e, i, el) {
  if (e.button > 0) return;
  const dis = el.getAttribute('aria-disabled') === 'true';
  cardDrag = { i, el, x0: e.clientX, y0: e.clientY, on: false, dis, was: selected };
  el.setPointerCapture(e.pointerId);
  const mv = (ev) => {
    if (!cardDrag) return;
    if (!cardDrag.on && Math.hypot(ev.clientX - cardDrag.x0, ev.clientY - cardDrag.y0) > 6 && !dis) {
      cardDrag.on = true; selected = i; el.classList.add('lift'); unitNote(null);
      $('ghost').innerHTML = `<span style="color:${units[i].color};display:grid">${Shapes.svg(units[i].shape, 28)}</span><b>${esc(units[i].name)}</b>`;
      $('ghost').hidden = false; paintHint();
    }
    if (cardDrag.on) {
      const g = $('ghost'); g.style.left = ev.clientX + 'px'; g.style.top = ev.clientY + 'px';
      const t = overCol(ev.clientX, ev.clientY) ? null : board.tileAt(ev.clientX, ev.clientY);
      hoverTile = t; g.classList.toggle('off', !(t && Game.canPlaceAt(m, ME, t.col, t.row, i)));
    }
  };
  const up = (ev) => {
    el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    const d = cardDrag; cardDrag = null; $('ghost').hidden = true; el.classList.remove('lift');
    if (!d) return;
    if (d.on) {
      const t = ev.type === 'pointerup' && !overCol(ev.clientX, ev.clientY) ? board.tileAt(ev.clientX, ev.clientY) : null;
      if (t && editable()) { selected = i; placeSel(t); } // placeSel puts the card down if no other squad of it can follow
      if (d.was !== i) selected = d.was;
      hoverTile = null; dragEndAt = now(); changed(); return;
    }
    // a tap: pick it (or put it down); a card that can't be bought says why in its note
    if (d.dis) { unitNote(i, el); return; }
    selected = selected === i ? null : i; sqOpen = null; closeSheet(); paint();
  };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
const overCol = (x, y) => { const r = $('col').getBoundingClientRect(); return x >= r.left - 12 && x <= r.right + 12 && y >= r.top && y <= r.bottom; };
function paintHint() { const h = $('col').querySelector('.hint'); if (h) h.innerHTML = hintText(); }

// ---------- the board: taps, drags and hover (the game's canvas handlers, as lab3d's) ----------
let pointer = { x: 0, y: 0 };
addEventListener('pointermove', (e) => { pointer = { x: e.clientX, y: e.clientY }; }, { capture: true, passive: true });
function tapTile(t) {
  if (now() - dragEndAt < 400 || phase !== 'deploy') return;
  closeSheet(); unlockTier = null;
  if (!t || !editable() || myPick()) { sqOpen = null; paint(); return; }
  if (placingTower()) { Game.placeTower(m, ME, t.col, t.row); changed(); return; }
  const own = Game.squadAt(m, ME, t.col, t.row);
  if (own && selected !== null && Game.boardable(m, ME, t.col, t.row, selected)) placeSel(t); // into a carrier with room
  else if (own) { sqOpen = sqOpen === own.id ? null : own.id; selected = null; if (sqOpen != null) openSheet('squad'); }
  else if (selected !== null) { if (Game.canPlaceAt(m, ME, t.col, t.row, selected)) placeSel(t); }
  else sqOpen = null;
  changed();
}
function placeSel(t) {
  if (!Game.place(m, ME, selected, t.col, t.row)) return;
  if (!Game.freeLeft(m, ME).includes(selected) && (m.gold[ME] < Game.shopCost(m, ME, selected) || Game.deploysLeft(m, ME, selected) <= 0)) selected = null;
}
function press(t) {
  if (!editable() || !t || myPick() || placingTower()) return false;
  const sq = Game.squadAt(m, ME, t.col, t.row);
  if (!sq || sq.round !== m.round || !Game.canMove(m, ME, sq)) return false;
  drag = { id: sq.id, from: t, over: t, moved: false };
  return true;
}
function dragTo(t) { if (drag && t && (t.col !== drag.over.col || t.row !== drag.over.row)) { drag.over = t; drag.moved = true; } if (drag) $('col').classList.toggle('take', overCol(pointer.x, pointer.y)); }
function drop(t, ended) {
  const d = drag; drag = null;
  if (!d || !ended) return;
  const sq = m.armies[ME].find(s => s.id === d.id);
  if (sq && overCol(pointer.x, pointer.y)) { dragEndAt = now(); if (!sq.free) Game.unplaceSquad(m, ME, d.id); changed(); return; } // dragged back onto the shop: taken back
  if (!d.moved) return;
  dragEndAt = now();
  const to = t || d.over;
  if (to.col !== d.from.col || to.row !== d.from.row) Game.moveSquad(m, ME, d.id, to.col, to.row);
  changed();
}

// ---------- sheets: Help, Settings, Damage, Unlock, a squad ----------
function openSheet(kind, anchor) {
  if (!kind || sheetKind === kind && kind !== 'squad' && kind !== 'unlock') { closeSheet(); paintRound(); return; }
  sheetKind = kind; sheetAnchor = anchor || null;
  if (kind !== 'unlock') unlockTier = null;
  if (kind !== 'squad') sqOpen = null;
  paintSheet(); paintRound();
}
let sheetAnchor = null;
function closeSheet() { sheetKind = null; sheetAnchor = null; unlockTier = null; sqOpen = null; const s = $('sheet'); if (s) s.hidden = true; noteLine = null; sqLine = null; drawLines(); }
function paintSheet() {
  const s = $('sheet');
  if (!sheetKind || (sheetKind === 'squad' && sqOpen == null) || (sheetKind === 'unlock' && unlockTier == null)) { s.hidden = true; sqLine = null; return; }
  const can = editable();
  let html = '';
  s.className = 'sheet' + (['settings', 'damage', 'help'].includes(sheetKind) ? ' drop' : '') + (sheetKind === 'settings' ? ' wide' : '');
  if (sheetKind === 'unlock') {
    const t = unlockTier, list = units.map((u, i) => i).filter(i => tierOf(i) === t && !Game.isOff(m, i, ME) && locked(i));
    html = `<span class="tag" style="background:${tierColor(t)}">Tier ${t}</span><h3>Unlock a unit<small>Once unlocked, it's yours for the match. The computer sees it after the next fight.</small></h3>
      ${list.map(i => { const u = units[i], c = Game.unlockCost(m, i, ME); return `<div class="urow"><span style="color:${u.color};display:grid;place-items:center">${Shapes.svg(u.shape, 28)}</span>
        <span class="nm">${esc(u.name)}<small>${plural(u.bodies, 'body')} · ${u.range <= 1.6 ? 'melee' : `range ${Math.round(u.range)}`} · ${Game.shopCost(m, ME, i)} a squad</small></span>
        <button class="w" data-unl="${i}" ${can && m.gold[ME] >= c ? '' : 'disabled'}>${c ? `Unlock <small>${c}</small>` : 'Unlock'}</button></div>`; }).join('') || '<p>Nothing left to unlock here.</p>'}`;
  } else if (sheetKind === 'squad') {
    const sq = m.armies[ME].find(q => q.id === sqOpen); if (!sq) { s.hidden = true; return; }
    const u = units[sq.unit], fresh = sq.round === m.round, rdy = Game.isReady(m, sq), lc = Game.levelCost(u), sv = Game.sellValue(m, sq);
    html = `<span class="tag">${fresh ? (sq.free ? 'Free squad' : 'New this round') : `Since round ${sq.round}`}</span><h3>${esc(u.name)}<small>Level ${sq.level + 1}${rdy ? ' · ready to level up' : ''} · ${plural(u.bodies, 'body')}</small></h3>
      <div class="acts">
        ${fresh && !sq.free ? `<button class="w" id="sq-back" ${can ? '' : 'disabled'}>Take back <small>+${sq.cost || Game.shopCost(m, ME, sq.unit)}</small></button>` : ''}
        ${rdy ? `<button class="w" id="sq-lvl" style="color:var(--ink);opacity:1" aria-pressed="true" ${can && m.gold[ME] >= lc ? '' : 'disabled'}>Level up <small>${lc}</small></button>` : ''}
        ${!fresh ? `<button class="w" id="sq-sell" ${can ? '' : 'disabled'}>Sell <small>+${sv}</small></button>` : ''}
      </div>
      <p>${fresh ? 'Drag it to move it, or back onto the shop to take it back.' : rdy ? 'It has the experience for its next level.' : 'It levels up once it has fought enough.'}</p>`;
  } else if (sheetKind === 'help') {
    html = `<h3>How to deploy<small>Round ${m.round}${m.round === 1 ? ' · your first' : ''}</small></h3>
      <p><b>Drag a card</b> from the shop onto your zone (the near seven rows), or tap a card, then a tile.</p>
      <p><b>Drag a squad</b> to move it. Drag it back onto the shop to take it back, gold and deployment returned.</p>
      <p><b>Tap a squad</b> for its actions: take back, level up, sell.</p>
      <p><b>+ Unlock</b> opens a tier's locked units. An unlock lasts the whole match.</p>
      <p><b>Ready</b> when you're done. Only ${Game.CARRY_CAP} unspent gold carries over to the next round.</p>
      <p style="opacity:.7">Scroll on the board to tilt the camera; Esc or scroll back to come out.</p>`;
  } else if (sheetKind === 'settings') {
    const lv = board.camera.level(), q = quality;
    const seg = (id, opts, cur) => `<div class="seg" data-set="${id}">${opts.map(([v, l]) => `<button class="w" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
    html = `<h3>Settings<small>For this match</small></h3>
      <div class="set">
        <span class="lab">Camera</span>${seg('cam', [[0, 'Top'], [1, 'Tilted'], [2, 'Angled']], lv)}
        <span class="lab">3D quality</span>${seg('q', [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']], q)}
        <span class="lab">Deploy timer</span>${seg('timer', [[1, 'On'], [0, 'Off']], timerOn ? 1 : 0)}
        <span class="lab">Battlefield</span>${seg('look', Game.SKINS.map(k => [k.id, k.name]), look)}
      </div>
      <div class="acts"><button class="w" id="new-match">New match</button></div>
      <p style="opacity:.7">Sound, chat and the rest stay in the menu's Settings.</p>`;
  } else if (sheetKind === 'damage') {
    const S = lastSummary; if (!S) { s.hidden = true; return; }
    const rows = (sd) => { const list = (S.squads[sd] || []).slice().sort((a, b) => b.dealt - a.dealt), top = Math.max(1, ...list.map(q => q.dealt));
      return list.map(q => `<span>${esc(units[q.unit].name)}</span><span class="track" style="--tc:var(--${sd === ME ? 'you' : 'foe'})"><i style="width:${q.dealt / top * 100}%"></i></span><b class="num">${q.dealt}</b>`).join(''); };
    html = `<h3>Damage<small>Round ${S.round}: who did the work</small></h3>
      <span class="k">Yours</span><div class="dmg">${rows(ME) || '<span>No squads.</span>'}</div>
      <span class="k">The computer's</span><div class="dmg">${rows(FOE) || '<span>No squads.</span>'}</div>`;
  }
  s.innerHTML = `<button class="x" aria-label="Close">✕</button>` + html;
  s.hidden = false;
  placeSheet();
  s.querySelector('.x').addEventListener('click', () => { closeSheet(); paint(); });
  s.querySelectorAll('[data-unl]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.unl; if (editable() && Game.unlock(m, ME, i)) { closeSheet(); selected = i; changed(); } }));
  const on = (id, f) => { const b = s.querySelector('#' + id); if (b) b.addEventListener('click', f); };
  on('sq-back', () => { if (editable() && Game.unplaceSquad(m, ME, sqOpen)) { closeSheet(); changed(); } });
  on('sq-lvl', () => { if (editable() && Game.levelUp(m, ME, sqOpen)) changed(); });
  on('sq-sell', () => { if (editable() && Game.sell(m, ME, sqOpen)) { closeSheet(); changed(); } });
  on('new-match', () => { closeSheet(); newMatch(); });
  s.querySelectorAll('[data-set]').forEach(g => g.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.v, k = g.dataset.set;
    if (k === 'cam') board.camera.setLevel(+v);
    if (k === 'q') { quality = v; board.quality(v); }
    if (k === 'timer') { timerOn = v === '1'; deadline = timerOn && phase === 'deploy' && !timeUp ? now() + DEPLOY_MS : 0; paintCol(); }
    if (k === 'look') { look = v; m.skin = v; paintRound(); }
    paintSheet();
  })));
}
function placeSheet() {
  const s = $('sheet'), w = s.offsetWidth, h = s.offsetHeight;
  let x, y;
  if (sheetKind === 'squad') {
    const sq = m.armies[ME].find(q => q.id === sqOpen); if (!sq) return;
    const [sx, sy] = board.screenAt(sq.col, sq.row, 1.2), right = sx + 60 + w < innerWidth - 16;
    x = right ? sx + 60 : sx - 60 - w; y = Math.max(110, Math.min(innerHeight - h - 16, sy - h / 2));
    sqLine = { x1: sx, y1: sy, x2: right ? x : x + w, y2: y + 28 };
  } else if (sheetKind === 'unlock' && sheetAnchor && document.body.contains(sheetAnchor)) {
    const r = $('col').getBoundingClientRect(), a = sheetAnchor.getBoundingClientRect();
    x = r.right + 18; y = Math.max(110, Math.min(innerHeight - h - 16, a.top - 20));
  } else {
    const a = (sheetAnchor && document.body.contains(sheetAnchor) ? sheetAnchor : $('round')).getBoundingClientRect();
    x = Math.max(16, Math.min(innerWidth - w - 16, a.left + a.width / 2 - w / 2)); y = a.bottom + 12;
    if (sheetKind === 'help') { const r = $('col').getBoundingClientRect(); x = r.right + 18; y = Math.max(110, innerHeight - h - 28); }
  }
  s.style.left = x + 'px'; s.style.top = y + 'px';
  drawLines();
}

// ---------- lines: a dot on the thing, a thin line to its words (the Diorama's notes) ----------
let noteLine = null, sqLine = null;
function drawLines() {
  const ls = [noteLine, sqLine].filter(Boolean).map(l => l.pts || [[l.x1, l.y1], [l.x2, l.y2]]);
  $('lines').innerHTML = ls.map(p => `<polyline points="${p.map(q => q.join(',')).join(' ')}"/><circle class="ring" cx="${p[0][0]}" cy="${p[0][1]}" r="7"/><circle class="dot" cx="${p[0][0]}" cy="${p[0][1]}" r="3"/>`).join('');
}

// ---------- the big moments: a pick before deploying, a round's end, the match's end ----------
let momentKey = '';
function paintMoment() {
  const pick = myPick(), mo = $('moment');
  const show = phase === 'deploy' ? (pick && !pickHidden ? pick : null) : phase === 'result' ? 'result' : phase === 'end' ? 'end' : null;
  $('veil').hidden = !(show && show !== 'result');
  $('peek').hidden = !(phase === 'deploy' && pick && pickHidden);
  const key = JSON.stringify([show, pickSel, m.round, phase]);
  if (!show) { mo.hidden = true; momentKey = ''; return; }
  if (key === momentKey) return; momentKey = key;
  const R = safeRect(); mo.style.left = (R.x0 + R.x1) / 2 + 'px'; mo.style.top = (R.y0 + R.y1) / 2 + 'px';
  let html = '';
  const opt = (k, ics, title, sub) => `<button class="opt" data-k="${k}" aria-pressed="${pickSel === k}"><span class="n">0${k + 1}</span><span class="ics">${ics}</span><span class="t"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  const icon = (i) => `<span style="color:${units[i].color};display:inline-flex">${Shapes.svg(units[i].shape, 30)}</span>`;
  if (show === 'pack') {
    html = `<div class="k">Round 1 · Standard</div><h2 id="moment-h">Choose your start</h2>
      <p class="lead">Free squads, plus ${m.gold[ME]} gold. <b>Win this round: you pick your leader first in round 2.</b></p>
      <div class="opts">${m.packages[ME].map((p, k) => { const c = {}; for (const ui of p.squads) c[ui] = (c[ui] || 0) + 1;
        return opt(k, Object.keys(c).map(icon).join(''), Object.entries(c).map(([ui, n]) => `${n}× ${esc(units[ui].name)}`).join(' + '), p.char ? `Leader: ${esc(charName(p.char))}` : `${plural(p.squads.length, 'free squad')}, unlocked for the match`); }).join('')}</div>`;
  } else if (show === 'leader') {
    const ids = Game.draftLeft(m);
    html = `<div class="k">Round ${m.round} · the leader draft</div><h2 id="moment-h">Choose your leader</h2>
      <p class="lead">A leader gives you a passive ability for the rest of the match. ${Game.charOf(m, FOE) ? `<b>The computer took ${esc(charName(Game.charOf(m, FOE)))}.</b>` : 'You pick first.'}</p>
      <div class="opts">${ids.map((id, k) => { const c = Game.CHARACTERS.find(x => x.id === id) || { name: id, ability: '' }; return opt(k, '', esc(c.name), esc(c.ability)); }).join('')}</div>`;
  } else if (show === 'tower') {
    const ch = Game.towerChoices(m, ME);
    html = `<div class="k">Round ${m.round} · your keep</div><h2 id="moment-h">Choose your tower</h2>
      <p class="lead">Your keep becomes one of these for the rest of the match.</p>
      <div class="opts">${ch.map((t, k) => opt(k, `<span style="color:${t.unit.color};display:inline-flex">${Shapes.svg('square', 28)}</span>`, esc(t.name), `${esc(t.text)} · ${t.unit.hp} health`)).join('')}</div>`;
  } else if (show === 'result') {
    const S = summary, w = S.winner, dealt = S.dmg[FOE], took = S.dmg[ME];
    const word = w === ME ? 'Won' : w === FOE ? 'Lost' : 'Draw';
    html = `<div class="k">Round ${S.round}${S.timeout ? ' · time ran out' : ''}</div><h2 id="moment-h" class="${w === ME ? 'won' : w === FOE ? 'lost' : ''}">${word}</h2>
      <p class="lead">${w === ME ? `The computer takes <b>${dealt}</b> damage.` : w === FOE ? `You take <b>${took}</b> damage.` : took || dealt ? `You take ${took}, the computer ${dealt}.` : 'Nobody takes damage.'} ${m.over ? '' : `+${S.income} gold next round.`}</p>
      <div class="row"><button class="ready" id="next">${SHARD}${m.over ? 'See the end' : 'Next round'}</button><button class="lnk" data-sheet="damage">Damage</button></div>`;
  } else if (show === 'end') {
    const won = m.winner === ME;
    html = `<div class="k">Match over · ${plural(m.round - 1, 'round')}</div><h2 id="moment-h" class="${won ? 'won' : 'lost'}" style="font-size:clamp(80px,14vh,140px)">${won ? 'Victory' : 'Defeat'}</h2>
      <p class="lead">${won ? 'Their keep is rubble. The computer would like a rematch. It never gets tired.' : 'Your keep has fallen. The computer is gracious about it.'}</p>
      <div class="row"><button class="ready" id="again">${SHARD}Play again</button></div>`;
  }
  if (show === 'pack' || show === 'leader' || show === 'tower')
    html += `<div class="row"><button class="ready${pickSel == null ? '' : ''}" id="choose" ${pickSel == null ? 'disabled' : ''}>${SHARD}Choose</button><button class="lnk" id="hide">Look at the board</button></div>`;
  mo.className = 'moment' + (show === 'result' || show === 'end' ? ' result' : '');
  mo.innerHTML = html; mo.hidden = false;
  mo.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => { pickSel = +b.dataset.k; paintMoment(); }));
  mo.querySelectorAll('.opt').forEach(b => b.addEventListener('dblclick', () => { pickSel = +b.dataset.k; choose(); }));
  const on = (id, f) => { const b = mo.querySelector('#' + id); if (b) b.addEventListener('click', f); };
  on('choose', choose);
  on('hide', () => { pickHidden = true; paintMoment(); });
  on('next', () => { if (m.over) { phase = 'end'; music(); paint(); } else startRound(); });
  on('again', newMatch);
  mo.querySelectorAll('[data-sheet]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); openSheet(b.dataset.sheet, b); }));
}
function choose() {
  const pick = myPick(); if (pickSel == null || !pick) return;
  if (pick === 'pack') Game.choosePack(m, ME, pickSel);
  else if (pick === 'leader') { Game.pickLeader(m, ME, Game.draftLeft(m)[pickSel]); aiTurn(); }
  else if (pick === 'tower') Game.setTowerType(m, ME, Game.towerChoices(m, ME)[pickSel].id);
  pickSel = null; pickHidden = false; changed();
}
$('peek').addEventListener('click', () => { pickHidden = false; paintMoment(); });

// ---------- the fight: worked out first, then played back from the state before it (the game's runFight) ----------
function fight() {
  if (phase !== 'deploy') return;
  selected = null; drag = null; closeSheet();
  Game.ensureTower(m, ME); Game.ensureTower(m, FOE);
  Game.ensurePack(m, ME); Game.ensurePack(m, FOE);
  Game.settleTowerPicks(m);
  if (Game.ensureBwalls) { Game.ensureBwalls(m, 0); Game.ensureBwalls(m, 1); }
  pre = Referee.withUnits(Referee.snapshot(m), units, m.matrix);
  const hpBefore = m.hp.slice();
  const sim = Game.startBattle(m); while (sim.step()) {}
  summary = Game.resolve(m, sim.result()); summary.hpBefore = hpBefore;
  bt = Game.startBattle(pre); phase = 'battle'; fx = []; acc = 0; deadline = 0;
  music(); paint();
}
function endFight() { phase = 'result'; lastSummary = summary; fx = []; paint(); }
// as the game's absorb(): this tick's shots and deaths become effects
function absorb() {
  for (const s of bt.lastShots()) if (s[13] === 1) Art.frostBeam(fx, s);
  else if (s[13] === 2) fx.push({ kind: 'freeze', x: s[0], y: s[1], side: s[4], age: 0, life: 0.6 });
  else if (s[13] === 3) fx.push({ kind: 'eat', x1: s[0], y1: s[1], x2: s[2], y2: s[3], side: s[4], age: 0, life: 0.6 });
  else if (s[12] === 1) fx.push({ kind: 'roar', x: s[0], y: s[1], r: s[5], side: s[4], age: 0, life: 0.8 });
  else if (s[8] > 0) fx.push({ kind: 'flame', x1: s[0], y1: s[1], x2: s[2], y2: s[3], side: s[4], half: s[8], slam: s[11] === 1, spin: s[11] === 2, age: 0, life: s[11] === 1 ? 0.45 : 0.3 });
  else if (s[10] === 1) fx.push({ kind: 'bolt', x1: s[0], y1: s[1], x2: s[2], y2: s[3], side: s[4], age: 0, life: 0.22 });
  else fx.push({ kind: s[7] === 1 ? 'heal' : 'shot', x1: s[0], y1: s[1], x2: s[2], y2: s[3], side: s[4], age: 0, life: s[7] === 1 ? 0.35 : 0.18 });
  for (const b of bt.bodies) if (!b.alive && !b._gone) { b._gone = true; fx.push({ kind: 'death', x: b.x, y: b.y, u: b.u, side: b.side, age: 0, life: 0.5 }); }
}

// ---------- the board, edge to edge ----------
let quality = 'high';
const board = Render3D(THREE, $('view'), () => {
  const fighting = phase !== 'deploy';
  return { m: fighting && pre ? pre : m, me: ME, phase: phase === 'end' ? 'result' : phase, units, mode: 'ai', bt: fighting ? bt : null, battlePre: pre, fx,
    selected: phase === 'deploy' ? selected : null, moving: null, drag, hoverTile, editable: editable(), placingUnit: phase === 'deploy' ? placingUnit() : null,
    placingElf: false, placingTower: placingTower(), foeReady: phase === 'deploy' && ready[FOE] && !ready[ME] };
}, {
  onTap: tapTile, onPress: press, onDrag: dragTo, onDrop: drop,
  onHover: (t) => { if (!cardDrag) hoverTile = t; },
  placing: () => editable(),
  onLevel: () => { if (sheetKind === 'settings') setTimeout(paintSheet, 0); },
});
function placingUnit() {
  if (selected !== null) return selected;
  const sq = drag && drag.moved && m.armies[ME].find(s => s.id === drag.id);
  return sq ? sq.unit : null;
}
// The camera frames the board in what the words leave free: the canvas stays edge to edge (scenery under the words),
// and a view offset (THREE's setViewOffset, as the Diorama menu's island) moves and scales the picture so the board
// sits inside safeRect(). In the top and tilted views the board's corners are measured each frame and fitted; in the
// closer views the picture is only moved, so what the camera looks at sits in the middle of the free space.
const fit = { k: 1, ox: 0, oy: 0 };
function safeRect() {
  const c = $('col').getBoundingClientRect(), top = Math.max($('you').getBoundingClientRect().bottom, $('round').getBoundingClientRect().bottom);
  return { x0: c.right + 28, x1: innerWidth - 24, y0: top + 14, y1: innerHeight - 10 };
}
function fitView(dt) {
  const cam3 = board.cam3; if (!cam3) return;
  const W = innerWidth, H = innerHeight, R = safeRect(), z = board.camera.zoom();
  const base = (p) => [p[0] / fit.k + fit.ox, p[1] / fit.k + fit.oy];
  let k = 1, cx = W / 2, cy = H / 2;
  if (z < 1.2) {
    const C = Game.COLS - 1, Rw = Game.ROWS - 1;
    const pts = [[0, 0, 0], [C, 0, 0], [0, Rw, 0], [C, Rw, 0], [0, 0, 5], [C, 0, 5]].map(([c, r, h]) => base(board.screenAt(c, r, h)));
    let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    const px = (x1 - x0) / C * 0.6, py = (y1 - y0) / Rw * 0.6; x0 -= px; x1 += px; y0 -= py; y1 += py;
    k = Math.min(1.08, (R.x1 - R.x0) / (x1 - x0), (R.y1 - R.y0) / (y1 - y0));
    cx = (x0 + x1) / 2; cy = (y0 + y1) / 2;
  }
  const tox = cx - (R.x0 + R.x1) / 2 / k, toy = cy - (R.y0 + R.y1) / 2 / k;
  const a = dt == null ? 1 : 1 - Math.exp(-dt * 9);
  fit.k += (k - fit.k) * a; fit.ox += (tox - fit.ox) * a; fit.oy += (toy - fit.oy) * a;
  cam3.setViewOffset(W, H, fit.ox, fit.oy, W / fit.k, H / fit.k);
}
addEventListener('resize', () => { board.size(); fitView(); momentKey = ''; paint(); });
// Esc first closes a sheet or puts a picked card down; only when there's nothing of ours to close does it reach the
// camera (which takes it as "back to the top view"). Captured, so it runs before Camera3D's own window listener.
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (sheetKind || selected !== null)) {
    e.stopImmediatePropagation();
    if (sheetKind) closeSheet(); else selected = null;
    paint();
  }
  if (e.key === ' ' && phase === 'deploy' && !e.target.closest('button')) { e.preventDefault(); pressReady(); }
}, { capture: true });
document.addEventListener('pointerdown', (e) => { // a press outside an open sheet closes it (not on the board: a tap there decides)
  if (!sheetKind || e.target.closest('#sheet, #col, .round, #view, .moment')) return;
  closeSheet(); paint();
});

// ---------- the loop ----------
let last = 0;
function frame(ts) {
  const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0.016; last = ts;
  if (m && phase === 'deploy') {
    if (!ready[FOE] && aiRound === m.round && !myPick()) { if (!aiReadyAt) aiReadyAt = now() + AI_READY_MS; else if (now() >= aiReadyAt) { ready[FOE] = true; paint(); } }
    if (deadline && now() >= deadline && !timeUp) { timeUp = true; ready[ME] = true; ready[FOE] = true; pickSel = null; closeSheet(); paint(); }
    if (ready[ME] && ready[FOE] && !fightAt) fightAt = now() + 900;
    if (fightAt && now() >= fightAt && ready[ME] && ready[FOE]) fight();
    if (fightAt && !(ready[ME] && ready[FOE])) fightAt = 0;
    tickClock();
  }
  if (phase === 'battle' && bt) {
    const speed = bt.time() > 20 ? 3 : 1.5;
    acc += dt * speed;
    while (acc >= Game.SETTINGS.dt) { acc -= Game.SETTINGS.dt; if (!bt.step()) break; absorb(); }
    for (const e of fx) e.age += dt * speed;
    Art.frostFollow(fx);
    fx = fx.filter(e => e.age < e.life);
    paintFight();
    if (bt.isOver()) endFight();
  }
  board.draw();
  fitView(dt);
  if (sheetKind === 'squad') placeSheet();
  requestAnimationFrame(frame);
}
board.size();
if (Q.get('cam') !== 'top') board.camera.setLevel(1); // the tilted view: the board as the menu's island, your zone nearest and biggest
newMatch();
fitView();
requestAnimationFrame(frame);

// for checks and screenshots
window.__battle = { board, get m() { return m; }, get phase() { return phase; }, get selected() { return selected; }, set selected(i) { selected = i; paint(); },
  paint, pressReady, choose: (k) => { pickSel = k; choose(); }, fight: () => { ready = [true, true]; fight(); },
  skip: () => { if (phase === 'battle') { while (bt.step()) absorb(); fx = []; endFight(); } }, next: () => { if (m.over) { phase = 'end'; paint(); } else startRound(); },
  holdAi: () => { aiReadyAt = 1e15; ready[FOE] = false; paint(); }, // (shots: the computer still deploying)
  openSheet, unitNote, freeTiles: () => { const out = []; for (const row of Game.zoneRows(ME)) for (let col = 1; col < Game.COLS - 1; col++) if (!Game.occupied(m, ME, col, row)) out.push([col, row]); return out; } };
