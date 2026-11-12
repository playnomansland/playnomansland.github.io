# No Mans Land: notes for Claude

## Screenshots and checks on a phone: use the new UI (the Diorama)

The live build (`index.html`, built with `PB_UI_DEFAULT=pc`) turns the Diorama on only for a computer: a mouse that
hovers and a window at least 900 px wide. Phones, tablets and headless Chrome at a phone size get the **old UI**.
So when you work on the phone UI, or show the owner a phone screenshot, open the game with **`?ui=diorama`**
(e.g. `index.html?ui=diorama&test&board=3d`), or use `design/diorama/game.html` (the Diorama always on).
A screenshot without it shows the old UI: don't show that unless the old UI is what was asked about.

- Emulate a phone with touch: `{ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }`, and check
  360×740 too.
- Add `&board=3d`. Software WebGL is slow, so 3D drops to 2D after a slow fight, and the 2D board on a phone still
  gets the old match layout.
- `?ui=` is kept in localStorage (`pb-ui`), so a new browser context starts clean; `?ui=classic` goes back.
- Check you got the Diorama: `<html>` has the class `diorama`.
- More: `design/diorama/PHONES.md` (the phone layouts, what's done and not) and `design/diorama/INTEGRATION.md`.
