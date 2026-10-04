# Gustav's Shooter

Browser first-person shooter based on Gustav's drawings in `sketches/`.
Pick a map in the menu:

- **Training range** – shoot targets for 3 minutes.
- **Monster attack** – Gustav's monsters (`sketches/monsters.png`) come out of the cave at the
  end of the valley. Slow at first, then faster every wave (30 s). Survive as long as you can.
  Headshots do double damage, family 2 is poisonous. Every family bleeds its own colour
  (purple, green, yellow, blue, orange, teal, magenta, white, black – never red).
  You heal half a heart at a time after a while without getting hit.
  The menu has a **Monster speed** slider (40–160 %), and every monster gets its own
  random pace, so some are quicker than others.

Monster families (same number on the sketch = same family):
1 blade stalkers Fob, Bob, Olt · 2 root things Frot, Trassel, Dhi (flies, poisonous) ·
3 crawlers Bek, Durk, Dir · 5 Hopparen · 7 runners Löparen, Bok ·
Gob (head full of teeth, its own family) from `sketches/monstersandweapons2.png` ·
Bartek: Spindelbartek (a spider) and Ormbartek (a rearing snake) with a human-like head –
hair with a side parting, thick brows, a mustache and a wide grin – modelled from shapes only.
The reference picture `sketches/bartek.png` is private and ignored by git.
Bollboll (`sketches/bollboll.jpg`): a ball hopping on one leg, a grid over its top, a big eye,
a dark eye, a mouth full of teeth and a little second face on its side.
Roo (`sketches/roo.jpg`): bald with round glasses, one round and one long pointed ear, the tongue
out, a long wrinkly neck and two eyes on its chest. Both are their own families.

Weapons 1–5 are from `sketches/weapons.png`; 6–9 from `sketches/monstersandweapons2.png`:
Nyckel sniper (goes through monsters), AR laser, RPG (explodes), Minigun (spins up, heavy).
10 (key 0) Kikarrevolver from `sketches/20261004_135325.jpg`: a revolver with a scope (zooms).
11 (key -) Candy sniper from `sketches/candysniper.jpg`: candy-cane barrel and hook stock, ring
sight; its sticky candy slows a monster that survives the hit down to 35 % for 3 s.

## Run

- **Desktop:** open `index.html` in a browser (no install, no build step).
- **Phone/tablet:** serve the folder and open it on the phone over the same Wi-Fi:
  ```
  python3 -m http.server 8000
  ```
  then browse to `http://<your-pc-ip>:8000`.

## Controls

Desktop: WASD move · mouse aim · click shoot · right-click zoom (sniper) · R reload ·
1–9, 0, - / mouse wheel switch gun · Space jump · Shift run · V switch gun graphics · Esc/P menu.

## Graphics

Two buttons in the menu, saved between visits:

- **Guns: Sketch / 3D / Detailed 3D** – Gustav's 2D drawings, simple 3D models, or detailed
  models with textured metal, wood and plastic, gloved hands, spring recoil and sway, working
  slides/bolts/revolver cylinder, flying casings and magazine changes.
- **Monsters: Simple / Detailed** – low-poly with ink outlines, or real-looking creatures: the
  body parts are melted into one continuous skin that bends with the skeleton, with carved
  mouths and eye sockets, ribs under the skin, textured hide, wet eyes, fangs and talons, and
  more lifelike motion: knees bend, heads follow you, jaws stretch open, they flinch when hit
  and collapse when they die. Each kind of monster is built once in the background (~0.1–0.5 s).

Both start on the detailed graphics; switch down if a phone or older computer gets slow.

## Scoreboard

Each map has a top 10. When a round ends with a score good enough for it, you type your name.
The **🏆 Scoreboard** button in the menu shows it. By default the scores are kept on this
computer; to share one board between everyone, set up one of the online options in
[`docs/scoreboard.md`](docs/scoreboard.md) and fill in `js/scores-config.js`.

Touch: left thumb moves, right thumb aims, on-screen buttons for fire/reload/zoom/jump/gun.

## Code

| File | What |
|------|------|
| `js/world.js` | Training range: layout, crates, targets |
| `js/arena.js` | Monster valley map |
| `js/monsters.js` | Monster models (both detail levels), movement, path finding, difficulty |
| `js/blood.js` | Blood drops, splats and pools, coloured per family |
| `js/weapons.js` | Gun stats + drawings (from `sketches/weapons.png`) |
| `js/viewmodel.js` | 3D guns + hands (first-person view), detailed gun motion |
| `js/guns-hd.js` | Detailed 3D guns and gloved hands |
| `js/flesh.js` | Detailed monster skin: distance fields melted together, surface nets, skinning |
| `js/geo.js` | Noise and shape helpers: horns, claws, fangs, beveled profiles |
| `js/textures.js` | Textures drawn in code: skins, metal, wood, plastic, reflections |
| `js/sketch.js` | Pencil-style drawing helpers |
| `js/game.js` | Player, shooting, round timer, HUD, menus |
| `js/scores.js` | Scoreboard: local or online (Firebase, Google Sheet, Supabase) |
| `js/scores-config.js` | Which scoreboard to use (see `docs/scoreboard.md`) |
| `js/input.js` | Keyboard/mouse + touch controls |
| `js/audio.js` | Synthesized sounds |
| `vendor/three.min.js` | Three.js r149 (last classic build, works from `file://`) |
