// Builds index.html (the game) and lab.html (Counter Lab) into the repo root.
// Run from the repo root:  node src/build.js
const fs = require('fs'), path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const shapes = src('shapes.js'), eng = src('engine.js');
// Counter Lab
const SK = JSON.parse(src('skills-default.json'));
const withSkills = (u) => ({ ...u, skills: SK.assign[u.name] || [null, null, null], skillsOn: [false, false, false] });
const sample = JSON.parse(src('default-roster.json')); // the default roster for Counter Lab
const ex = JSON.parse(src('r9.json')).units.slice(7).map(u => ({ ...u, cost: Math.round(u.cost * 100) }));
ex.push({ name: 'Ogre Smasher', cost: 100, bodies: 1, hp: 1100, hit: 260, aps: 0.5, range: 3, speed: 7, splash: 2.5, defense: 'none', defVal: 0, windUp: 1.0, knockback: 4 });
ex.forEach((u, i) => { ex[i] = withSkills(u); });
const lab = src('template.html').replace('/*SHAPES*/', () => shapes).replace('/*ENGINE*/', () => eng)
  .replace('/*SAMPLE*/', () => JSON.stringify(sample)).replace('/*EXAMPLES*/', () => JSON.stringify(ex))
  .replace('/*FACTIONS*/', () => src('factions.json'));
const cut = lab.indexOf('</style>') + '</style>'.length;
const labDoc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0D1315">
<link rel="icon" href="icon.png">
<link rel="apple-touch-icon" href="icon.png">
${lab.slice(0, cut)}
</head>
<body>
${lab.slice(cut)
  .replace('<div class="eyebrow">No Mans Land · balance sandbox</div>', '<div class="eyebrow"><a href="./" style="color:inherit">No Mans Land</a> · balance sandbox</div>')
  .replace('Tap a cell to watch that fight.</p>', 'Tap a cell to watch that fight. Units you make here show up in the game under Load units on this device.</p>')}
</body>
</html>
`;
fs.writeFileSync('lab.html', labDoc);
// Game
const game0 = src('site-template.html').replace('/*BASECSS*/', () => src('game.css'))
  .replace('/*UI_DEFAULT*/', () => ['diorama', 'pc'].includes(process.env.PB_UI_DEFAULT) ? process.env.PB_UI_DEFAULT : 'classic').replace('/*DIORAMA_CSS*/', () => src('diorama.css')).replace('/*DIORAMA*/', () => src('diorama.js')) // the Diorama UI (?ui=diorama)
  .replace('/*SHAPES*/', () => shapes).replace('/*ENGINE*/', () => eng)
  .replace('/*GAME*/', () => src('game.js')).replace('/*REFEREE*/', () => src('referee.js')).replace('/*MPB*/', () => src('mpb.js')).replace('/*DUO*/', () => src('duo.js')).replace('/*TOUR*/', () => src('tournament.js'))
  .replace('/*EXPLOITBOT*/', () => src('exploit-bot.js'))
  .replace('/*ART*/', () => src('art.js')).replace('/*RENDER2D*/', () => src('render2d.js') + '\n' + src('floors.js')).replace('/*DATA*/', () => src('demo-units.json'))
  .replace('/*FACTIONS*/', () => src('faction-units.json')).replace('/*PUZZLES*/', () => src('puzzles.json'))
  .replace('/*V3D*/', () => require('crypto').createHash('sha1').update(['camera3d.js', 'kaykit3d.js', 'models3d.js', 'scenery3d.js', 'render3d.js', 'game.js', 'engine.js', 'floors.js'].map(src).join('')).digest('hex').slice(0, 10));
// the game version shown in bug reports: the newest date in PATCH-NOTES.md and a hash of the page, e.g. "4 Nov 2026 · 1a2b3c4"
const noteDate = (() => { try { const d = fs.readFileSync(path.join(__dirname, '..', 'PATCH-NOTES.md'), 'utf8').match(/^## (\d{1,2}) (\w{3})\w* (\d{4})/m); return d ? `${d[1]} ${d[2]} ${d[3]}` : ''; } catch (e) { return ''; } })();
const game = game0.replace('/*BUILD*/', () => [noteDate, require('crypto').createHash('sha1').update(game0).digest('hex').slice(0, 7)].filter(Boolean).join(' · '));
game.split('<script>').slice(1).map(s => s.split('</script>')[0]).forEach(s => new Function(s));
// the 3D board's code is loaded on its own when 3D starts: make sure it parses too
for (const f of ['camera3d.js', 'kaykit3d.js', 'models3d.js', 'scenery3d.js', 'render3d.js']) new Function(src(f));
fs.writeFileSync('index.html', game);
// --diorama-page: the same game with the Diorama always on, as design/diorama/game.html, the Diorama's test page on the
// site (playnomansland.github.io/design/diorama/game.html) beside the mockups. The live game (index.html) is not changed
// by it; the page loads the repo root's files (src/ 3D, vendor/, models/, audio/, img/) through <base>.
if (process.argv.includes('--diorama-page')) {
  const dio = game.replace("const DEF = 'classic';", () => "const DEF = 'force';").replace("const DEF = 'pc';", () => "const DEF = 'force';").replace("const DEF = 'diorama';", () => "const DEF = 'force';")
    .replace('<head>', () => '<head>\n<base href="../../">\n<meta name="robots" content="noindex">');
  if (!dio.includes("const DEF = 'force';") || !dio.includes('<base href="../../">')) throw new Error('build.js: the Diorama page could not be made (the UI switch or <head> moved)');
  fs.writeFileSync(path.join(__dirname, '..', 'design', 'diorama', 'game.html'), dio);
  console.log('built design/diorama/game.html (the Diorama always on)');
}
// 3D test page
const lab3d = src('lab3d-template.html').replace('/*BASECSS*/', () => src('game.css'))
  .replace('/*SHAPES*/', () => shapes).replace('/*ENGINE*/', () => eng).replace('/*GAME*/', () => src('game.js'))
  .replace('/*ART*/', () => src('art.js')).replace('/*RENDER2D*/', () => src('render2d.js') + '\n' + src('floors.js')).replace('/*CAMERA3D*/', () => src('camera3d.js'))
  .replace('/*MODELS3D*/', () => src('kaykit3d.js') + '\n' + src('models3d.js') + '\n' + src('scenery3d.js')).replace('/*RENDER3D*/', () => src('render3d.js'))
  .replace('/*DATA*/', () => src('demo-units.json')).replace('/*LAB3D*/', () => src('lab3d.js'));
fs.writeFileSync('lab3d.html', lab3d);
console.log('built index.html, lab.html and lab3d.html');
