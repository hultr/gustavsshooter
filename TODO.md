# To do

## Needs a person to play it
- [ ] Play Monster attack for real with mouse/keyboard and say how it feels
      (difficulty, speed, weapon balance). Scripted keyboard movement is tested; aiming by hand isn't.
- [ ] Try it on a real phone: how smooth is it with many monsters? Touch devices are capped at
      16 monsters at once (desktop up to 28) because each monster costs ~30–60 draw calls.

## Check with Gustav
- [ ] The red numbers on `sketches/monsters.png` were read as 5 and 7; is that right?
- [ ] Made-up names for unnamed monsters: Tangle, Leaper, Runner. What are they really called?
- [ ] A bigger photo of `sketches/monsters.png` would help match the monsters more closely.
- [ ] Gob has no number on the sketch; does it belong to one of the families?
- [ ] Weapon prices 1M/2M/5M/10M were made up.

## Tuning (after playing)
- [ ] Difficulty: `speedMul`, `spawnEvery`, `maxAlive` in `js/monsters.js`,
      per-monster hp/speed/damage in the `SPECIES` table.
- [ ] Per-monster pace range: `PACE_MIN`/`PACE_MAX` in `js/monsters.js`.
- [ ] Healing rate and poison strength: `updateHealth`, `POISON`, `POISON_TICK` in `js/game.js`.
- [ ] Weapon damage, RPG radius, minigun spin-up/slowdown in `js/weapons.js`.

## Done (tested headless, 2026-09-28)
- [x] Poison (family 2): hits keep ticking damage; fixed the green glow staying on after death.
- [x] Nyckel sniper pierce: one zoomed shot killed 5 Bobs in a row.
- [x] RPG explosion kills several monsters; laser beam shows and hits; minigun spins up and fires.
- [x] Minigun slows walking to 60 % (keyboard test: 16.5 m vs 9.9 m in 3 s).
- [x] Phone-size layout (844×390, touch): buttons fit, weapon bar hidden, GUN button cycles guns.
- [x] Monster cap on touch devices to keep draw calls down.
