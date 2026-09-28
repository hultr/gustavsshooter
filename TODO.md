# To do

## Testing
- [ ] Try it on a real phone: how smooth is it with many monsters? Touch devices are capped at
      16 monsters at once (desktop up to 28) because each monster costs ~30–60 draw calls.

## Next features
- [ ] Buying weapons: the weapons have prices (Free, 1k … 10M) but there is no way to earn
      money or buy them yet; all nine are available from the start.

## Tuning (after more playing)
- [ ] Difficulty: `speedMul`, `spawnEvery`, `maxAlive` in `js/monsters.js`,
      per-monster hp/speed/damage in the `SPECIES` table.
- [ ] Per-monster pace range: `PACE_MIN`/`PACE_MAX` in `js/monsters.js`.
- [ ] Healing rate and poison strength: `updateHealth`, `POISON`, `POISON_TICK` in `js/game.js`.
- [ ] Weapon damage, RPG radius, minigun spin-up/slowdown in `js/weapons.js`.

## Done
- [x] Monsters reshaped from the high-res photo `sketches/monstershires.jpg`.
- [x] Played with mouse and keyboard: works.
- [x] Sketch numbers confirmed: the red ones are 5 and 7. Gob is its own family.
- [x] Unnamed monsters got Swedish names: Trassel, Hopparen, Löparen.
- [x] Weapon prices confirmed.
- [x] Headless tests (2026-09-28): poison ticks (and its glow clears on death), Nyckel sniper
      pierces (5 Bobs in one shot), RPG/laser/minigun work, minigun slows walking to 60 %,
      phone-size layout fits, monster cap on touch devices.
