# Showcase captures

The scripts that took the screenshots, the battle clip and the cards in `showcase/`. They drive the real game (the Diorama UI on the 3D board) in headless Chromium with software WebGL, so they are slow: a late round takes about five minutes to reach, a still about 30 seconds, a clip frame a few seconds.

Serve the repo first (any static server), then run from this folder. Output goes to `shots/` here (git-ignored), or to `$SHOTS`.

```bash
python3 -m http.server 8790 --bind 127.0.0.1   # from the repo root, in another terminal
```

## Battle stills

`drive.js <scene> <width> <height> <rounds>` starts a VS Computer match (`?test&ui=diorama`), lets the AI deploy for both sides, skips the fights up to the given round, then hands over to the scene script.

```bash
LOOK=snow TAG=snow BOOST=400 node drive.js ./scene-hero.js 1920 1080 7
LOOK=ash TAG=ash BOOST=400 node drive.js ./scene-ground.js 1920 1080 7
```

- `LOOK`: the battlefield look (`meadow`, `autumn`, `snow`, `frost` = Forest Glade, `desert`, `ash`, `moonlit`, `savanna`), saved as `pb-skin` before the page loads.
- `BOOST`: extra gold for both sides each round from round 3, so late rounds have big armies with tier 4 units. The AI spends it.
- `scene-hero.js`: the deploy board, then the fight from the angled, ground and tilted cameras, with and without the page UI (`h.clean(true)` hides everything but the board and the squads' 3-letter tags), then the result.
- `scene-ground.js`: angled and ground-level shots pushed into the clash (`h.pan`).
- The deploy clock keeps running (the Diorama has no clock switch), so a scene that is slow to press Ready can find the fight already started.

## The battle clip

`scene-clip.js` takes over the page's clock (`requestAnimationFrame` and `performance.now`) once the fight starts and steps it 1/24 s per frame, saving a PNG each time. The replay is time-based, so the result is smooth however slow the renderer is.

```bash
LOOK=snow TAG=clip-snow BOOST=500 FINALBOOST=1500 LEAD=1.5 YAWKEY=e YAWF=7 SECS=12 node drive.js ./scene-clip.js 1280 720 6
ffmpeg -framerate 24 -i shots/clip-snow/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart battle-snow.mp4
```

`FINALBOOST` is extra gold for both sides in the filmed round, so the fight is long and even. `LEAD` is how many seconds of the fight play before the first frame. `YAWKEY` / `YAWF` turn the camera (Q / E held for that many frames).

## Battlefields and cards

- `looks.js`: the Play screen's top-down board for each of the eight looks, stepping Change battlefield.
- `card.html` + `cardshot.js`: the 1600 × 900 Discord title card and the 1200 × 630 link preview card (`og-card`), from `showcase/img/hero.jpg` and the logo.

The main menu and Units pictures in the showcase come from the Diorama mockup screenshots in `design/diorama/screens/` (`menu.jpg`, `units-golem-skin.jpg`): the live game opens on the Play screen, and its menu hash states only work in the mockup.
