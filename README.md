# Gustav's Shooter

Browser first-person shooter based on Gustav's drawings in `sketches/`.
Pick a map in the menu:

- **Training range** – shoot targets for 3 minutes.
- **Monster attack** – Gustav's monsters (`sketches/monsters.png`) come out of the cave at the
  end of the valley. Slow at first, then faster every wave (30 s). Survive as long as you can.
  Headshots do double damage, monsters bleed green, family 2 is poisonous.
  You heal half a heart at a time after a while without getting hit.
  The menu has a **Monster speed** slider (40–160 %), and every monster gets its own
  random pace, so some are quicker than others.

Monster families (same number on the sketch = same family):
1 blade stalkers Fob, Bob, Olt · 2 root things Frot, Tangle, Dhi (flies, poisonous) ·
3 crawlers Bek, Durk, Dir · 5 the Leaper · 7 runners Runner, Bok ·
and Gob (head full of teeth) from `sketches/monstersandweapons2.png`.

Weapons 1–5 are from `sketches/weapons.png`; 6–9 from `sketches/monstersandweapons2.png`:
Nyckel sniper (goes through monsters), AR laser, RPG (explodes), Minigun (spins up, heavy).

## Run

- **Desktop:** open `index.html` in a browser (no install, no build step).
- **Phone/tablet:** serve the folder and open it on the phone over the same Wi-Fi:
  ```
  python3 -m http.server 8000
  ```
  then browse to `http://<your-pc-ip>:8000`.

## Controls

Desktop: WASD move · mouse aim · click shoot · right-click zoom (sniper) · R reload ·
1–9 / mouse wheel switch gun · Space jump · Shift run · V toggle 3D/sketch guns · Esc/P menu.

Touch: left thumb moves, right thumb aims, on-screen buttons for fire/reload/zoom/jump/gun.

## Code

| File | What |
|------|------|
| `js/world.js` | Training range: layout, crates, targets |
| `js/arena.js` | Monster valley map |
| `js/monsters.js` | Monster models, movement, path finding, difficulty |
| `js/blood.js` | Green blood drops and splats |
| `js/weapons.js` | Gun stats + drawings (from `sketches/weapons.png`) |
| `js/viewmodel.js` | 3D guns + hands (first-person view) |
| `js/sketch.js` | Pencil-style drawing helpers |
| `js/game.js` | Player, shooting, round timer, HUD, menus |
| `js/input.js` | Keyboard/mouse + touch controls |
| `js/audio.js` | Synthesized sounds |
| `vendor/three.min.js` | Three.js r149 (last classic build, works from `file://`) |
