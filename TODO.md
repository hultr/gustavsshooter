# To do

## Testing
- [ ] Play Monster attack for real with mouse/keyboard (only tested headless so far).
- [ ] Try it on a phone: touch controls and frame rate with many monsters on screen.
- [ ] Check the poison (family 2) in a real game; they only appear after 75 s.
- [ ] Try the new weapons (6–9) for real: Nyckel sniper pierce, RPG explosion size,
      minigun spin-up and slowdown, laser beam look.
- [ ] Weapon bar with 9 slots on small screens (touch hides it; GUN button cycles).

## Check with Gustav
- [ ] The red numbers on `sketches/monsters.png` were read as 5 and 7; is that right?
- [ ] Made-up names for unnamed monsters: Tangle, Leaper, Runner. What are they really called?
- [ ] A bigger photo of `sketches/monsters.png` would help match the monsters more closely.
- [ ] Gob has no number on the sketch; does it belong to one of the families?
- [ ] Weapon prices 1M/2M/5M/10M were made up.

## Tuning
- [ ] Difficulty numbers are guesses (`speedMul`, `spawnEvery`, `maxAlive` in `js/monsters.js`,
      per-monster hp/speed/damage in the `SPECIES` table).
- [ ] Healing rate and poison strength (`js/game.js`).
- [ ] Weapon balance for the new guns (damage, RPG radius) in `js/weapons.js`.
- [ ] Per-monster pace range (`PACE_MIN`/`PACE_MAX` in `js/monsters.js`).
