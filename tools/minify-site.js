// Minifies the published copy of the site (the Pages deploy's _site folder, .github/workflows/pages.yml), so the live
// pages carry no comments and no readable names. The repo's own files are never touched: index.html and src/ stay as
// they are, for editing and for the tests.
//   - every .html (except showcase/: promo pages with no game code, and raw text the HTML minifier can't parse): each inline <script> through terser (comments gone, local names shortened), then the page's
//     HTML and CSS through html-minifier-terser. The copyright comment at the top of the page is kept.
//   - every .js under src/ (the 3D board's files, loaded when 3D starts): terser, with a one-line copyright on top.
// After minifying, each classic script is parsed again (new Function), so a broken result fails the deploy instead
// of going live.
// Needs terser and html-minifier-terser (the deploy installs pinned versions, see pages.yml). Run:
//   node tools/minify-site.js _site
const fs = require('fs'), path = require('path');
const { minify: terser } = require('terser');
const { minify: htmlMin } = require('html-minifier-terser');

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.error('usage: node tools/minify-site.js <site folder>'); process.exit(1); }
const NOTICE = '/*! No Mans Land. Copyright (c) 2026 Vilhelm. All rights reserved. */';
const JS_OPTS = { compress: true, mangle: true, format: { comments: false } };

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const kb = (n) => Math.round(n / 1024) + ' KB';
const isJs = (attrs) => { const t = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1]; return !t || /^(module|text\/javascript|application\/javascript)$/i.test(t); };

async function minHtml(file) {
  const src = fs.readFileSync(file, 'utf8');
  // the inline scripts first (terser is async; html-minifier's own JS hook is not)
  const parts = [], re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let last = 0, m;
  while ((m = re.exec(src))) {
    const [all, attrs, body] = m;
    parts.push(src.slice(last, m.index)); last = m.index + all.length;
    if (/\bsrc\s*=/i.test(attrs) || !isJs(attrs) || !body.trim()) { parts.push(all); continue; }
    const module = /\btype\s*=\s*["']?module/i.test(attrs);
    let out;
    try { out = (await terser(body, { ...JS_OPTS, module })).code; }
    catch (e) { throw new Error(`${file}: a <script> could not be minified: ${e.message}${e.line ? ` (line ${e.line} of that script)` : ''}`); }
    if (!module) new Function(out); // (throws if the result does not parse)
    parts.push(`<script${attrs}>${out.replace(/<\/script/gi, '<\\/script')}</script>`);
  }
  parts.push(src.slice(last));
  const html = await htmlMin(parts.join(''), {
    collapseWhitespace: true, conservativeCollapse: true, // (one space kept where there was some, so inline text keeps its gaps)
    removeComments: true, ignoreCustomComments: [/Copyright \(c\)/],
    minifyCSS: true, minifyJS: false, // (the scripts are done above)
  });
  fs.writeFileSync(file, html);
  return [src.length, html.length];
}

async function minJs(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = (await terser(src, { ...JS_OPTS, format: { comments: false, preamble: NOTICE } })).code;
  new Function(out);
  fs.writeFileSync(file, out);
  return [src.length, out.length];
}

(async () => {
  let before = 0, after = 0;
  for (const f of walk(dir)) {
    const rel = path.relative(dir, f).split(path.sep).join('/');
    let r = null;
    if (rel.endsWith('.html') && !rel.startsWith('showcase/')) r = await minHtml(f).catch(e => { throw new Error(`${rel}: ${e.message}`); });
    else if (/^src\/.*\.js$/.test(rel)) r = await minJs(f);
    if (!r) continue;
    before += r[0]; after += r[1];
    console.log(`${rel}: ${kb(r[0])} -> ${kb(r[1])}`);
  }
  console.log(`minified: ${kb(before)} -> ${kb(after)}`);
})().catch(e => { console.error(e.message || e); process.exit(1); });
