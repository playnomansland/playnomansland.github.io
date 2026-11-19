# Turncoat (prototype)

A hidden-role game with the mechanics of MINDNIGHT / The Resistance, dressed in No Mans Land. 5 to 8 players, one device each.
Live at `https://playnomansland.github.io/turncoat/`.

## Rules (as in MINDNIGHT)

- Turncoats (hackers): 2 with 5-6 players, 3 with 7-8. They know each other. Loyalists (agents) know nothing.
- Five towers (nodes). Squad size per tower: 5 players 2-3-2-3-3, 6 players 2-3-4-3-4, 7 players 2-3-3-4-4, 8 players 3-4-4-5-5.
- The player whose turn it is picks a squad or passes the pick on. A pass does not use up a proposal.
- Everyone votes Accept or Refuse at once. More than half must accept. Votes are shown afterwards.
- The squad chooses Hold or Sabotage in secret. Loyalists can only hold. Only the number of sabotages is shown.
- One sabotage brings a tower down, except tower 4 with 7-8 players, which needs two.
- First side to three towers wins. Five refused proposals in a row on one tower: the turncoats win.

Bots: the host can add bots to any lobby, and "Practice vs bots" on the start screen runs a game on one device with
no relay. Loyal bots judge squads only from what everyone can see; turncoat bots know their own side.

Not in yet: timers, text chat, spectators, the extra roles of Mainframe mode.

## How it is put together

- `index.html` is the whole game. The `W` block at the top of the script holds every themed word; `RULES` holds the tables.
- The host's page runs the game (`Engine`). Guests send moves and get back a public view and a private view.
- Messages go through a public MQTT relay over WebSocket (`mqtt.min.js`, MQTT.js, MIT). The first letter of the room code
  says which relay the room is on. Roles, votes and hold/sabotage choices are encrypted between each player and the host
  (ECDH P-256, AES-GCM).
- The host's state is kept in the browser, so a host or guest who reloads walks back into the game.
- Art, font colours, crests and sounds are read from the main site: `../src/art.js` (leader crests), `../img/skins/*.png`,
  `../img/title.png`, `../audio/sfx/*.mp3`.
- Local test: serve the repo root and open `/turncoat/?broker=ws://localhost:9001` against any MQTT-over-WebSocket broker.
