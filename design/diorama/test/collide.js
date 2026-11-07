// Collision check (2026-11-07): node design/diorama/test/collide.js design/diorama '[[1440,900],[1280,720]]' "$(tr -d '\n' < design/diorama/test/states.json)" [shots dir]
// Loads every state at every window size and reports
// text boxes that overlap, note lines that cross other text, and text that runs off screen.
const { chromium } = require('playwright'); const path = require('path');
const page0 = 'file://' + path.join(process.argv[2], 'diorama-menu.html');
const sizes = JSON.parse(process.argv[3] || '[[1440,900]]');
const states = JSON.parse(process.argv[4] || '["#still,profile"]');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let bad = 0;
  for (const [w, h] of sizes) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => console.log('page error:', e.message));
    for (const st of states) {
      await p.goto('about:blank'); await p.goto(page0 + st);
      await p.waitForFunction(() => window.__ready, null, { timeout: 90000 }); await p.waitForTimeout(400);
      const r = await p.evaluate(() => {
        const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; return el.parentElement ? vis(el.parentElement) : true; };
        const textRects = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); return [...rg.getClientRects()].filter(r => r.width > 1 && r.height > 1); };
        const box = (rs) => rs.length ? rs.reduce((a, r) => ({ l: Math.min(a.l, r.left), t: Math.min(a.t, r.top), r: Math.max(a.r, r.right), b: Math.max(a.b, r.bottom) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 }) : null;
        // the things that carry words, each as one group of text rects
        const sel = ['.menu .item', '.orders .item', '.rooms .k', '.rooms h2', '.rsearch', '.rooms .create', '.rlist > li > span', '.rlist > li > .go', '.rlist .full', '.tok-menu', '.newroom .k', '.newroom h2', '.nr-opts .lab', '.nr-opts .nr-note', '.nr-opts .seg > *', '.newroom .create', '.standings .k', '.standings h2', '.standings li', '.standings .leg', '.door .item', '.signin .k', '.signin h2', '.si-lead', '.si-other', '.build', '.logo', '.back', '.acct', '.pf .k', '#pf-name', '#pf-title', '.pf-opts .lab', '.pf-opts .nr-note', '.pf-opts .seg > *', '#pf-hist', '.history .k', '.history h2', '.h-tabs', '#h-list > li > span', '#h-list .rd', '#h-list .rounds > li', '#h-list > li > .go',
          '.note', '#unote', '#usheet', '.tiers', '.music', '.pl', '.badge', '.drop h3', '.drop .k', '.drop .hint', '.drop .lab', '.drop .sn', '.drop .w', '.drop .lnk', '.drop .vol', '.fr-list li > span:not(.acts)', '.fr-list .msg', '.fr-list .more', '.fr-add input', '.thread li', '.fr-inv p', '.fr-tabs', '.drop .gbtn', '.fr-back'];
        const items = [];
        for (const s of sel) for (const el of document.querySelectorAll(s)) { if (!vis(el)) continue;
          let rs = ['IMG', 'INPUT'].includes(el.tagName) || el.id === 'usheet' || el.matches('.gbtn, .item, .create') ? [el.getBoundingClientRect()] : textRects(el);
          rs = rs.filter(r => r.width > 1 && r.height > 1).map(r => { const solid = ['IMG', 'INPUT'].includes(el.tagName) || el.matches('#usheet, .gbtn, .item, .create'), fs = parseFloat(getComputedStyle(el).fontSize);
            const k = solid ? 0 : fs >= 40 ? r.height * 0.18 : -3, kx = solid || fs >= 40 ? 0 : -3; return new DOMRect(r.left + kx, r.top + k, r.width - 2 * kx, r.height - 2 * k); }); { const c = el.closest('.rlist, .drop'); if (c && c !== el) { const k = c.getBoundingClientRect(); rs = rs.map(r => { const t = Math.max(r.top, k.top), b2 = Math.min(r.bottom, k.bottom); return new DOMRect(r.left, t, r.width, b2 - t); }).filter(r => r.height > 1); } } if (!rs.length) continue;
          items.push({ name: s + (el.id ? '#' + el.id : '') + ' "' + (el.textContent || el.value || el.alt || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"', el, rs, bx: box(rs) }); }
        const hit = (a, c, pad = 1) => a.left < c.right - pad && c.left < a.right - pad && a.top < c.bottom - pad && c.top < a.bottom - pad;
        const out = [];
        for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
          const A = items[i], B = items[j]; if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
          const same = (q) => { const x = A.el.closest(q); return x && x === B.el.closest(q); }; if (same('.nr-opts') || same('#h-list > li') || same('.rlist > li') || same('.menu') || same('.door') || same('.orders')) continue; if (!!A.el.closest('.drop') !== !!B.el.closest('.drop')) continue; if ((A.el.closest('.tok-menu, .rsearch') || B.el.closest('.tok-menu, .rsearch')) && !document.getElementById('r-menu').hidden) continue; // the dropdown is the top layer
          if (A.rs.some(a => B.rs.some(c => hit(a, c)))) out.push(`overlap: ${A.name} × ${B.name}`); }
        for (const it of items) { if (it.el.closest('.rlist, .drop') && !it.el.matches('.drop')) { const c = it.el.closest('.rlist, .drop').getBoundingClientRect(), x = it.bx; if (x.b <= c.top || x.t >= c.bottom) continue; } const x = it.bx; if (x.l < 0 || x.t < 0 || x.r > innerWidth || x.b > innerHeight) out.push(`off screen: ${it.name} [${x.l|0},${x.t|0},${x.r|0},${x.b|0}]`); }
        // note lines: each path's last point sits under its own label; any segment through another text box is a crossing
        const segHit = (x1, y1, x2, y2, r) => { // segment vs rect (shrunk by 2px)
          const L = r.left + 2, R = r.right - 2, T = r.top + 2, Bm = r.bottom - 2; if (R <= L || Bm <= T) return false;
          let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
          for (const [p, q] of [[-dx, x1 - L], [dx, R - x1], [-dy, y1 - T], [dy, Bm - y1]]) { if (p === 0) { if (q < 0) return false; } else { const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } } }
          return true; };
        for (const pa of document.querySelectorAll('#lines path')) {
          const pts = (pa.getAttribute('d').match(/-?[\d.]+/g) || []).map(Number), P = []; for (let k = 0; k < pts.length; k += 2) P.push([pts[k], pts[k + 1]]);
          const end = P[P.length - 1], own = items.find(it => it.el.matches('.note, #unote, #usheet') && (Math.abs(it.el.getBoundingClientRect().bottom - end[1]) < 12 || Math.abs(it.el.getBoundingClientRect().top - end[1]) < 3));
          for (let k = 0; k + 1 < P.length; k++) for (const it of items) { if (it === own) continue;
            if (it.rs.some(r => segHit(P[k][0], P[k][1], P[k + 1][0], P[k + 1][1], r))) out.push(`line of ${own ? own.name : '?'} crosses ${it.name}`); } }
        return [...new Set(out)];
      });
      if (process.argv[5] && w === 1440) await p.screenshot({ path: path.join(process.argv[5], st.replace(/[^a-z0-9=]+/gi, '_').replace(/^_+/, '') + '.png') });
      if (r.length) { bad += r.length; console.log(`\n${w}x${h} ${st}`); r.forEach(x => console.log('  ' + x)); }
      else console.log(`ok ${w}x${h} ${st}`);
    }
    await p.close();
  }
  console.log(`\n${bad} problem(s)`); await b.close();
})();
