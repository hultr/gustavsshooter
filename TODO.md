# To do

## Testing
- [ ] Try it on a real phone: how smooth is it with many monsters? Touch devices are capped at
      16 monsters at once (desktop up to 28) because each monster costs ~30–60 draw calls.
- [ ] Try the detailed graphics on a phone (they start off there) and on a slower computer.
      Detailed monsters are ~6–27 draw calls and ~12–20k triangles each (skin + teeth/claws);
      the skin resolution is set in `voxelFor()` in `js/monsters.js`.
- [ ] Try the detailed world (monster valley) on a real computer and phone: frame rate with
      shadows (4096 shadow map, desktop only) and ~240k triangles; fewer pebbles and grass
      tufts on touch devices. Only checked in headless screenshots so far.
- [ ] Look at the detailed monsters and guns in a real browser (only checked in headless
      screenshots so far): skin and wood colours, mouth size, reload pose.

- [ ] Play Runthrough on a real computer and phone: frame rate (~170 merged meshes, ~500
      colliders), whether the turnstiles and revolving doors feel OK to walk through, and if
      the monsters come out of the rooms often enough. Only checked headless so far.
- [ ] Runthrough: the inside of the Concept lab (the garage) is still a guess – the video
      cuts at its door. Layout otherwise measured on the plans and checked against the video
      (2026-10-10); reference material in `assets/office/`.

- [ ] Runthrough: play a few rounds from each entrance and see if the random obstacles make
      fair and fun routes; the ten places and what fits where are `SITES` in `js/runthrough.js`.

## Next features
- [ ] Shared scoreboard is on Firebase: check that the first real score shows up on another
      computer.
- [ ] Buying weapons: the weapons have prices (Free, 1k … 10M) but there is no way to earn
      money or buy them yet; all eleven are available from the start.

- [ ] New weapons from 2026-10-04: the name "Kikarrevolver" (the label on the sketch is
      unreadable) and the prices 15M / 25M are guesses – check with Gustav.

## Tuning (after more playing)
- [ ] Runthrough: exit bonus in `escaped()` in `js/game.js`; spawn distance (8–40 m) and the
      "ahead" weighting in `spawnPlace()` in `js/monsters.js`; monsters more than 55 m away give up.
- [ ] Difficulty: `speedMul`, `spawnEvery`, `maxAlive` in `js/monsters.js`,
      per-monster hp/speed/damage in the `SPECIES` table.
- [ ] Per-monster pace range: `PACE_MIN`/`PACE_MAX` in `js/monsters.js`.
- [ ] Healing rate and poison strength: `updateHealth`, `POISON`, `POISON_TICK` in `js/game.js`.
- [ ] Weapon damage, RPG radius, minigun spin-up/slowdown in `js/weapons.js`.
- [ ] Detailed world: rock colours and moss (`rockMaterial` options in `valley()`), cliff shape
      (`cliff()`), grass amount and the path (`grassAt`), sun shadow settings in `js/arena.js`.
- [ ] Detailed graphics: blood colours `BLOOD` and skins `SKINS` in `js/monsters.js`,
      gun materials in `materials()` in `js/guns-hd.js`, recoil/sway springs in `js/viewmodel.js`.

## Done
- [x] Runthrough layout from the video and plans (2026-10-10): café, gates, corridor with WC
      blocks at each pod column, lounge, Concept lab and labs round it, stair hall, South pods,
      reception gates and desk moved to measured positions; the ten obstacle places moved with
      them. Headless checks: every spawn reachable, every place/mix closes its passage and
      leaves a way round, no obstacle inside a wall, 200 random rounds all with a way out.
- [x] Runthrough random obstacles (2026-10-10): ten places, 3–6 blocked per round with a random
      fitting mix, random entrance; headless checks: every place/mix closes its passage, 200
      random rounds all leave a way out for you and the monsters.
- [x] Runthrough map (2026-10-09): from the reference in `assets/` (floor plans, photos, video); headless
      checks: every spawn spot and the exit reachable on the path grid, a simulated 90 s walk
      to the exit with 31 monsters spawning, none stuck in walls, flyers staying under 3.2 m.
- [x] Detailed world (2026-10-04): lifelike rock, cliffs, cave, boulders, columns, ground,
      pebbles, grass and sun shadows in the monster valley; same colliders as before.
- [x] New sketches (2026-10-04): Kikarrevolver and Candy sniper (keys 0 and -), monsters
      Bollboll (hops on one leg, white blood) and Roo (black blood), each its own family.
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
