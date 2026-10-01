# To do

## Testing
- [ ] Try it on a real phone: how smooth is it with many monsters? Touch devices are capped at
      16 monsters at once (desktop up to 28) because each monster costs ~30–60 draw calls.
- [ ] Try the detailed graphics on a phone (they start off there) and on a slower computer.
      Detailed monsters are ~6–27 draw calls and ~12–20k triangles each (skin + teeth/claws);
      the skin resolution is set in `voxelFor()` in `js/monsters.js`.
- [ ] Look at the detailed monsters and guns in a real browser (only checked in headless
      screenshots so far): skin and wood colours, mouth size, reload pose.

## Next features
- [ ] Shared scoreboard: pick an online option in `docs/scoreboard.md` (Firebase recommended),
      set it up and fill in `js/scores-config.js`. Until then scores are per computer.
- [ ] Buying weapons: the weapons have prices (Free, 1k … 10M) but there is no way to earn
      money or buy them yet; all nine are available from the start.

## Tuning (after more playing)
- [ ] Difficulty: `speedMul`, `spawnEvery`, `maxAlive` in `js/monsters.js`,
      per-monster hp/speed/damage in the `SPECIES` table.
- [ ] Per-monster pace range: `PACE_MIN`/`PACE_MAX` in `js/monsters.js`.
- [ ] Healing rate and poison strength: `updateHealth`, `POISON`, `POISON_TICK` in `js/game.js`.
- [ ] Weapon damage, RPG radius, minigun spin-up/slowdown in `js/weapons.js`.
- [ ] Detailed graphics: blood colours `BLOOD` and skins `SKINS` in `js/monsters.js`,
      gun materials in `materials()` in `js/guns-hd.js`, recoil/sway springs in `js/viewmodel.js`.

## Done
- [x] Graphics settings: guns Sketch / 3D / Detailed 3D, monsters Simple / Detailed.
- [x] Detailed monsters: one continuous skinned body per monster (distance fields + surface
      nets), carved mouths/eye sockets, fangs, talons, wet eyes, lifelike motion.
- [x] Detailed guns: metal/wood/plastic textures, moving parts, casings, recoil and sway.
- [x] Blood colour per family (no red).
- [x] Bartek family: Spindelbartek and Ormbartek, faces after a private reference picture
      (not in git, not used as a texture). Detailed heads are baked as a finer second mesh.
- [x] Scoreboard (local, or online once `js/scores-config.js` is filled in).
- [x] Monsters reshaped from the high-res photo `sketches/monstershires.jpg`.
- [x] Played with mouse and keyboard: works.
- [x] Sketch numbers confirmed: the red ones are 5 and 7. Gob is its own family.
- [x] Unnamed monsters got Swedish names: Trassel, Hopparen, Löparen.
- [x] Weapon prices confirmed.
- [x] Headless tests (2026-09-28): poison ticks (and its glow clears on death), Nyckel sniper
      pierces (5 Bobs in one shot), RPG/laser/minigun work, minigun slows walking to 60 %,
      phone-size layout fits, monster cap on touch devices.
