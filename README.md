# Gustav's Shooter

Browser first-person shooter based on Gustav's drawings in `sketches/`.
Version 1 is a 3-minute training range with targets.

## Run

- **Desktop:** open `index.html` in a browser (no install, no build step).
- **Phone/tablet:** serve the folder and open it on the phone over the same Wi-Fi:
  ```
  python3 -m http.server 8000
  ```
  then browse to `http://<your-pc-ip>:8000`.

## Controls

Desktop: WASD move · mouse aim · click shoot · right-click zoom (sniper) · R reload ·
1–5 / mouse wheel switch gun · Space jump · Shift run · V toggle 3D/sketch guns · Esc/P menu.

Touch: left thumb moves, right thumb aims, on-screen buttons for fire/reload/zoom/jump/gun.

## Code

| File | What |
|------|------|
| `js/world.js` | Range layout, crates, targets |
| `js/weapons.js` | Gun stats + drawings (from `sketches/weapons.png`) |
| `js/viewmodel.js` | 3D guns + hands (first-person view) |
| `js/sketch.js` | Pencil-style drawing helpers |
| `js/game.js` | Player, shooting, round timer, HUD, menus |
| `js/input.js` | Keyboard/mouse + touch controls |
| `js/audio.js` | Synthesized sounds |
| `vendor/three.min.js` | Three.js r149 (last classic build, works from `file://`) |
