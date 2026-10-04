// Main game: player movement, shooting, round timer, HUD.
(function () {
  const $ = id => document.getElementById(id);
  const input = GS.Input, I = input.state;

  // ---------- Renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: !I.isTouch, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, I.isTouch ? 1.25 : 1.5));
  $('game').appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 200);
  camera.rotation.order = 'YXZ';

  // ---------- Maps ----------
  const maps = {
    range: Object.assign(GS.World.build(), {
      title: 'Training range',
      intro: 'Shoot as many targets as you can in 3 minutes.<br>Bullseye = 10 points.',
    }),
    monsters: Object.assign(GS.Arena.build(), {
      title: 'Monster attack',
      intro: 'Gustav\'s monsters are coming out of the cave!<br>Slow at first… then faster and faster.<br>Headshots do double damage.',
    }),
  };
  let mapId = 'range';
  try { if (localStorage.getItem('map') in maps) mapId = localStorage.getItem('map'); } catch (e) {}
  let world = maps[mapId];
  // Each monster is ~30-60 draw calls, so phones get fewer at once
  const horde = GS.Monsters.create(maps.monsters, { onPlayerHit: playerHit, cap: I.isTouch ? 16 : Infinity });
  const vm = GS.Viewmodel.create(renderer);
  renderer.autoClear = false;

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    vm.resize(camera.aspect);
  }
  addEventListener('resize', resize);
  resize();

  // ---------- Player ----------
  const EYE = 1.6, RADIUS = 0.4, GRAVITY = 18, JUMP = 7, STEP = 0.4;
  const player = { pos: new THREE.Vector3(), vy: 0, onGround: true, yaw: 0, pitch: 0, bob: 0 };

  function blocked(x, z, y) {
    for (const c of world.colliders) {
      if (c.top <= y + STEP) continue;
      if (x > c.minX - RADIUS && x < c.maxX + RADIUS && z > c.minZ - RADIUS && z < c.maxZ + RADIUS) return true;
    }
    return false;
  }
  function groundAt(x, z, y) {
    let h = 0;
    for (const c of world.colliders) {
      if (c.top > y + STEP) continue;
      if (x > c.minX - RADIUS * 0.5 && x < c.maxX + RADIUS * 0.5 && z > c.minZ - RADIUS * 0.5 && z < c.maxZ + RADIUS * 0.5) h = Math.max(h, c.top);
    }
    return h;
  }

  function updatePlayer(dt) {
    const sens = zoomed ? 0.0007 : 0.0022;
    player.yaw -= I.lookX * sens;
    player.pitch -= I.lookY * sens;
    player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch));

    let mx = I.moveX, my = I.moveY;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const speed = (I.sprint && !zoomed ? 8.5 : 5.5) * (zoomed ? 0.5 : 1) * (weapons[current].slow || 1);
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
    const vx = (-sin * my + cos * mx) * speed * dt;
    const vz = (-cos * my - sin * mx) * speed * dt;

    const p = player.pos;
    if (!blocked(p.x + vx, p.z, p.y)) p.x += vx;
    if (!blocked(p.x, p.z + vz, p.y)) p.z += vz;
    if (world === maps.monsters) horde.pushOut(p, RADIUS);

    if (I.jump && player.onGround) { player.vy = JUMP; player.onGround = false; }
    player.vy -= GRAVITY * dt;
    p.y += player.vy * dt;
    const g = groundAt(p.x, p.z, p.y);
    if (p.y <= g) { p.y = g; player.vy = 0; player.onGround = true; } else if (p.y > g + 0.05) player.onGround = false;

    const moving = player.onGround && (Math.abs(mx) + Math.abs(my) > 0.1);
    player.bob += moving ? dt * speed * 1.6 : 0;

    camera.position.set(p.x, p.y + EYE + (moving ? Math.sin(player.bob * 2) * 0.04 : 0), p.z);
    const shake = shakeT > 0 ? shakeT * 0.08 : 0;
    camera.rotation.set(player.pitch + recoilPitch + (Math.random() - 0.5) * shake, player.yaw + (Math.random() - 0.5) * shake, 0);
  }

  // ---------- Weapons ----------
  const weapons = GS.weapons;
  let current = 0, ammo = weapons.map(w => w.mag), cooldown = 0, reloadT = 0;
  let zoomed = false, recoil = 0, recoilPitch = 0, flashT = 0, spin = 0;
  const gunCanvas = $('gunCanvas'), flash = $('flash'), gunWrap = $('gunWrap'), hud = $('hud');

  const KEY_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'];
  function buildWeaponBar() {
    const bar = $('weaponBar');
    weapons.forEach((w, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      const c = document.createElement('canvas'); c.width = 140; c.height = 74;
      GS.drawWeapon(c, w);
      slot.append(c);
      slot.insertAdjacentHTML('beforeend', `<span>${KEY_LABELS[i]}</span><b>${w.price}</b>`);
      slot.addEventListener('mousedown', e => { e.stopPropagation(); selectWeapon(i); });
      bar.append(slot);
    });
  }

  function selectWeapon(i) {
    i = (i + weapons.length) % weapons.length;
    if (i === current && gunCanvas.dataset.drawn) return;
    current = i; reloadT = 0; cooldown = 0.25; spin = 0; setZoom(false);
    const w = weapons[i];
    GS.drawWeapon(gunCanvas, w);
    gunCanvas.dataset.drawn = '1';
    vm.setWeapon(i);
    flash.style.left = (w.muzzle[0] / 420 * 100) + '%';
    flash.style.top = (w.muzzle[1] / 220 * 100) + '%';
    document.querySelectorAll('#weaponBar .slot').forEach((s, k) => s.classList.toggle('active', k === i));
    recoil = 1; // quick "raise" animation
    updateAmmo();
  }

  function setZoom(on) {
    zoomed = on && weapons[current].zoom;
    hud.classList.toggle('zoomed', zoomed);
    camera.fov = zoomed ? 20 : 75;
    camera.updateProjectionMatrix();
  }

  function startReload() {
    const w = weapons[current];
    if (reloadT > 0 || ammo[current] === w.mag) return;
    reloadT = w.reload; setZoom(false);
    GS.Audio.reload();
    updateAmmo();
  }

  const raycaster = new THREE.Raycaster();
  raycaster.far = 200;
  const dir = new THREE.Vector3(), tmp = new THREE.Vector3();
  const stats = { score: 0, shots: 0, hits: 0, bulls: 0, kills: 0, heads: 0 };

  function shoot() {
    const w = weapons[current];
    ammo[current]--; cooldown = w.fireDelay; stats.shots++;
    const moving = Math.abs(I.moveX) + Math.abs(I.moveY) > 0.1;
    const spread = zoomed ? 0.0005 : w.spread * (moving ? 1.6 : 1) * (player.onGround ? 1 : 2);
    camera.getWorldDirection(dir);
    dir.x += (Math.random() - 0.5) * 2 * spread;
    dir.y += (Math.random() - 0.5) * 2 * spread;
    dir.z += (Math.random() - 0.5) * 2 * spread;
    dir.normalize();
    GS.Audio[w.sound || 'shot'](w.kick);
    recoil = Math.min(1.4, recoil + 0.5 * w.kick);
    recoilPitch += 0.012 * w.kick;
    flashT = 0.05;
    vm.fire(w.kick);
    if (w.rocket) { fireRocket(w); return finishShot(); }

    // Walk along everything the bullet hits; a piercing bullet goes on through monsters
    raycaster.set(camera.position, dir);
    raycaster.far = 200;
    let end = null;
    const done = new Set();
    for (const hit of raycaster.intersectObjects(shootables(), false)) {
      const m = hit.object.userData.monster;
      end = hit.point;
      if (m) {
        if (!done.has(m)) { done.add(m); hitMonster(hit, w); }
        if (w.pierce) continue;
        break;
      }
      const t = hit.object.userData.target;
      if (t && t.down <= 0 && t.fall === 0) hitTarget(t, hit);
      addDecal(hit);
      break;
    }
    if (w.beam) addBeam(w.beam, end || tmp.copy(camera.position).addScaledVector(dir, 150));
    finishShot();
  }

  function finishShot() {
    if (ammo[current] === 0) setTimeout(startReload, 250);
    updateAmmo();
  }

  function hitTarget(t, hit) {
    tmp.copy(hit.point);
    t.disc.worldToLocal(tmp);
    const d = Math.hypot(tmp.x, tmp.y) / t.r;
    const bull = d < 0.2;
    const pts = (bull ? 10 : d < 0.55 ? 5 : 2) * t.value;
    stats.score += pts; stats.hits++; if (bull) stats.bulls++;
    t.down = 3;
    GS.Audio.hit(bull);
    showHitmarker();
    popup(bull ? `BULLSEYE! +${pts}` : `+${pts}`);
    $('score').textContent = stats.score;
  }

  const shootables = () => world === maps.monsters ? world.shootables.concat(horde.meshes) : world.shootables;

  function hitMonster(hit, w) {
    const r = horde.damage(hit, w.damage, dir);
    if (!r) return;
    if (w.candy && !r.killed) horde.stick(r.m, w.candy.slow, w.candy.time);
    stats.hits++;
    showHitmarker();
    GS.Audio.hit(r.head);
    scoreKill(r);
  }
  function scoreKill(r) {
    if (r.killed) {
      const pts = Math.round(r.m.sp.score * (r.head ? 1.5 : 1));
      stats.score += pts; stats.kills++; if (r.head) stats.heads++;
      popup(`${r.head ? 'HEADSHOT! ' : ''}${r.m.sp.name} +${pts}`);
      $('score').textContent = stats.score;
    }
  }

  // Bullet holes, oldest removed first
  const decals = [];
  const decalGeo = new THREE.CircleGeometry(0.05, 6);
  const decalMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, polygonOffset: true, polygonOffsetFactor: -2 });
  function addDecal(hit) {
    if (!hit.face) return;
    const m = new THREE.Mesh(decalGeo, decalMat);
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    m.position.copy(hit.point).addScaledVector(n, 0.01);
    m.lookAt(tmp.copy(m.position).add(n));
    hit.object.attach(m);
    decals.push(m);
    if (decals.length > 60) { const old = decals.shift(); old.parent.remove(old); }
  }

  // ---------- Laser beams, rockets and explosions ----------
  const effects = [];   // {obj, life, max, tick(e, dt)}
  const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 5).translate(0, 0.5, 0).rotateX(Math.PI / 2);
  const muzzleAt = out => camera.localToWorld(out.set(0.12, -0.1, -0.5));
  const UPV = new THREE.Vector3(0, 1, 0);

  function addEffect(obj, life, tick) {
    world.scene.add(obj);
    effects.push({ obj, life, max: life, tick });
  }

  function addBeam(color, end) {
    const start = muzzleAt(new THREE.Vector3());
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(start);
    m.lookAt(end);
    m.scale.set(1, 1, start.distanceTo(end));
    addEffect(m, 0.07, e => { e.obj.material.opacity = e.life / e.max; });
  }

  const rocketGeo = new THREE.ConeGeometry(0.07, 0.35, 8).rotateX(Math.PI / 2);
  const rocketMat = new THREE.MeshLambertMaterial({ color: 0x9aa06a });
  function fireRocket(w) {
    const m = new THREE.Mesh(rocketGeo, rocketMat);
    muzzleAt(m.position);
    const vel = dir.clone().multiplyScalar(w.rocket.speed);
    m.lookAt(tmp.copy(m.position).add(vel));
    const step = new THREE.Vector3();
    addEffect(m, 4, e => {
      step.copy(vel).multiplyScalar(e.dt);
      raycaster.set(m.position, tmp.copy(vel).normalize());
      raycaster.far = step.length() + 0.1;
      const hit = raycaster.intersectObjects(shootables(), false)[0];
      if (hit) { explode(hit.point, w); e.life = 0; return; }
      m.position.add(step);
      vel.y -= 0.5 * e.dt; // slight drop
      if (Math.random() < 0.7) puff(m.position, 0x9a9a9a, 0.25, 0.5);
    });
  }

  const puffGeo = new THREE.IcosahedronGeometry(1, 1);
  function puff(p, color, size, life, grow = 2) {
    const m = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
    m.position.copy(p);
    m.scale.setScalar(size);
    addEffect(m, life, e => {
      const k = 1 - e.life / e.max;
      e.obj.scale.setScalar(size * (1 + k * grow));
      e.obj.material.opacity = 1 - k;
    });
  }

  function explode(p, w) {
    const R = w.rocket.radius;
    GS.Audio.boom();
    puff(p, 0xffb13a, R * 0.3, 0.4, 2.2);
    puff(p, 0xfff2a0, R * 0.15, 0.25, 2);
    for (let i = 0; i < 5; i++) puff(tmp.set(p.x + (Math.random() - 0.5) * R * 0.6, p.y + Math.random() * R * 0.4, p.z + (Math.random() - 0.5) * R * 0.6), 0x555049, R * 0.12, 1.2, 3);
    if (camera.position.distanceTo(p) < R * 3) shakeT = 0.35;
    if (world === maps.monsters) {
      const hits = horde.blast(p, R, w.damage);
      if (hits.length) { stats.hits++; showHitmarker(); }
      hits.forEach(scoreKill);
    } else {
      for (const t of maps.range.targets) {
        if (t.down > 0 || t.fall > 0) continue;
        t.disc.getWorldPosition(tmp);
        if (tmp.distanceTo(p) < R) {
          t.down = 3; stats.hits++; stats.score += 5 * t.value;
          popup(`BOOM! +${5 * t.value}`);
          $('score').textContent = stats.score;
        }
      }
    }
  }

  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.dt = dt;
      e.life -= dt;
      if (e.life > 0) e.tick(e, dt);
      if (e.life <= 0) {
        e.obj.parent && e.obj.parent.remove(e.obj);
        if (e.obj.material !== rocketMat) e.obj.material.dispose();
        effects.splice(i, 1);
      }
    }
  }
  function clearEffects() { effects.forEach(e => { e.life = 0; }); updateEffects(0); }

  function updateWeapon(dt) {
    const w = weapons[current];
    if (I.weapon >= 0) selectWeapon(I.weapon);
    if (I.weaponStep) selectWeapon(current + I.weaponStep);
    if (I.zoomToggle) setZoom(!zoomed);
    if (I.reload) startReload();

    cooldown -= dt;
    if (reloadT > 0) {
      reloadT -= dt;
      if (reloadT <= 0) { reloadT = 0; ammo[current] = w.mag; updateAmmo(); }
    } else if (w.spin && (spin = Math.max(0, Math.min(1, spin + (I.fire ? dt : -dt) / w.spin))) < 1) {
      // minigun still spinning up
    } else if (cooldown <= 0 && (w.auto ? I.fire : I.firePressed)) {
      if (ammo[current] > 0) shoot();
      else if (I.firePressed) { GS.Audio.empty(); startReload(); }
    }

    // gun animation: bob + recoil + reload dip
    recoil = Math.max(0, recoil - dt * 6);
    recoilPitch = Math.max(0, recoilPitch - dt * 0.15 - recoilPitch * dt * 8);
    const bobX = Math.cos(player.bob) * 8, bobY = Math.abs(Math.sin(player.bob)) * 8;
    const dip = reloadT > 0 ? Math.sin(Math.min(1, (w.reload - reloadT) / w.reload) * Math.PI) : 0;
    gunWrap.style.transform =
      `translate(${bobX + recoil * 14}px, ${bobY + recoil * 18 + dip * 120}px) rotate(${12 - recoil * 7 + dip * 25}deg) scaleX(-1)`;
    flashT -= dt;
    flash.style.opacity = flashT > 0 ? 1 : 0;
    vm.update(dt, { bob: player.bob, recoil, dip, spin, loaded: ammo[current] > 0,
      look: [I.lookX, I.lookY], reload: reloadT > 0 ? (w.reload - reloadT) / w.reload : -1 });
  }

  // Graphics settings, saved between visits.
  // Guns: the original 2D sketches, simple 3D models, or detailed 3D (textured metal, wood
  // and plastic, moving parts). Monsters: simple low-poly or detailed (organic, textured).
  const GUN_STYLES = ['sketch', '3d', 'hd'], GUN_NAMES = { sketch: 'Sketch', '3d': '3D', hd: 'Detailed 3D' };
  const load = (key, ok, def) => { try { const v = localStorage.getItem(key); return ok.includes(v) ? v : def; } catch (e) { return def; } };
  const save = (key, v) => { try { localStorage.setItem(key, v); } catch (e) {} };
  let gunStyle = load('gunStyle', GUN_STYLES, 'hd'), style3d = true;
  function setStyle(st) {
    gunStyle = st; style3d = st !== 'sketch';
    document.body.classList.toggle('style-3d', style3d);
    if (style3d) vm.setDetail(st === 'hd');
    $('styleBtn').textContent = 'Guns: ' + GUN_NAMES[st];
    save('gunStyle', st);
  }
  const nextStyle = () => setStyle(GUN_STYLES[(GUN_STYLES.indexOf(gunStyle) + 1) % GUN_STYLES.length]);
  $('styleBtn').addEventListener('click', nextStyle);
  addEventListener('keydown', e => { if (e.code === 'KeyV' && running) nextStyle(); });

  let monsterStyle = load('monsterStyle', ['simple', 'hd'], 'hd');
  function setMonsterStyle(st) {
    monsterStyle = st;
    horde.setDetail(st === 'hd');
    $('monsterStyleBtn').textContent = 'Monsters: ' + (st === 'hd' ? 'Detailed' : 'Simple');
    save('monsterStyle', st);
  }
  $('monsterStyleBtn').addEventListener('click', () => setMonsterStyle(monsterStyle === 'hd' ? 'simple' : 'hd'));

  function updateAmmo() {
    const el = $('ammo');
    el.textContent = reloadT > 0 ? 'Reloading…' : `${weapons[current].name}  ${ammo[current]} / ${weapons[current].mag}`;
    el.classList.toggle('reloading', reloadT > 0);
  }

  let hitTimer = 0;
  function showHitmarker() {
    const h = $('hitmarker'); h.classList.add('show');
    clearTimeout(hitTimer); hitTimer = setTimeout(() => h.classList.remove('show'), 80);
  }
  function popup(text) {
    const p = $('popup');
    p.textContent = text;
    p.getAnimations().forEach(a => a.cancel());
    p.animate([{ opacity: 1, transform: 'translate(-50%, 0) scale(1.2)' }, { opacity: 0, transform: 'translate(-50%, -40px) scale(1)' }],
      { duration: 700, easing: 'ease-out' });
  }

  // ---------- HUD ----------
  // Hearts: 5 hearts, each takes two hits (half hearts)
  const HEART_PATH = 'M16 28 C 6 20 2 15 2 9 C 2 4 6 2 9 2 C 12 2 15 4 16 7 C 17 4 20 2 23 2 C 26 2 30 4 30 9 C 30 15 26 20 16 28 Z';
  const HALF_PATH = 'M16 28 C 6 20 2 15 2 9 C 2 4 6 2 9 2 C 12 2 15 4 16 7 Z';
  const heart = fill => `<svg viewBox="0 0 32 30"><path d="${HEART_PATH}" fill="${fill === 1 ? '#e74c3c' : '#d9d2bd'}" stroke="#262626" stroke-width="2.5" stroke-linejoin="round"/>` +
    (fill === 0.5 ? `<path d="${HALF_PATH}" fill="#e74c3c"/><path d="${HEART_PATH}" fill="none" stroke="#262626" stroke-width="2.5" stroke-linejoin="round"/>` : '') + '</svg>';
  const MAX_HP = 10;
  let hp = MAX_HP, hurtT = 99, regenT = 0, shakeT = 0, poisonT = 0, poisonTick = 0;
  function drawHearts() {
    let html = '';
    for (let i = 0; i < MAX_HP / 2; i++) html += heart(Math.max(0, Math.min(1, (hp - i * 2) / 2)));
    $('hearts').innerHTML = html;
  }

  // Family 2 on the sketch is poisonous: their hits keep hurting for a while
  const POISON = 6, POISON_TICK = 2;
  function playerHit(dmg, m) {
    if (!running) return;
    if (m && m.sp.family === 2) { poisonT = POISON; poisonTick = 0; popup('Poisoned!'); }
    hp = Math.max(0, hp - dmg);
    hurtT = 0; shakeT = 0.3;
    drawHearts();
    GS.Audio.hurt();
    $('hurt').getAnimations().forEach(a => a.cancel());
    $('hurt').animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 500, easing: 'ease-out' });
    if (hp <= 0) gameOver();
  }

  // Slowly heal half a heart at a time after a while without getting hit
  function updateHealth(dt) {
    hurtT += dt;
    shakeT = Math.max(0, shakeT - dt);
    if (poisonT > 0) {
      poisonT -= dt;
      if ((poisonTick += dt) >= POISON_TICK) { poisonTick = 0; playerHit(1); }
    } else if (hp < MAX_HP && hurtT > 8 && (regenT += dt) > 4) { regenT = 0; hp++; drawHearts(); }
    // a poison tick can end the game; the menu has hidden the glow then
    $('poison').style.opacity = poisonT > 0 && running ? 0.35 + Math.sin(time * 6) * 0.15 : 0;
  }

  // ---------- Round / menus ----------
  const ROUND = 180, WAVE = 30;
  let timeLeft = ROUND, elapsed = 0, wave = 1, running = false, started = false;

  function resetRound() {
    Object.assign(stats, { score: 0, shots: 0, hits: 0, bulls: 0, kills: 0, heads: 0 });
    $('score').textContent = 0;
    timeLeft = ROUND; elapsed = 0; wave = 1;
    hp = MAX_HP; hurtT = 99; shakeT = 0; poisonT = 0;
    drawHearts();
    const s = world.start;
    player.pos.set(s.x, 0, s.z); player.vy = 0; player.yaw = s.yaw; player.pitch = 0;
    ammo = weapons.map(w => w.mag); reloadT = 0;
    maps.range.targets.forEach(t => { t.down = 0; t.fall = 0; });
    horde.reset();
    decals.splice(0).forEach(d => d.parent.remove(d));
    clearEffects();
    showTime();
    selectWeapon(current);
  }

  function play() {
    GS.Audio.init();
    $('board').hidden = true; $('nameForm').hidden = true;
    $('menu').hidden = true;
    hud.hidden = false;
    running = true; I.enabled = true;
    input.requestLock();
    if (I.isTouch) {
      const el = document.documentElement;
      if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  }

  function showMenu(title, text, canResume) {
    running = false; I.enabled = false; I.fire = false;
    setZoom(false);
    $('poison').style.opacity = 0;
    input.releaseLock();
    $('menuTitle').textContent = title;
    $('menuText').innerHTML = text;
    $('resumeBtn').hidden = !canResume;
    $('startBtn').textContent = started ? 'RESTART' : 'START';
    $('menu').hidden = false;
  }

  function pause() { if (running) showMenu('Paused', `Score: <b>${stats.score}</b>`, true); }

  function endRound() {
    GS.Audio.end();
    const acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;
    showMenu('Time is up!',
      `Score: <b>${stats.score}</b><br>Targets hit: ${stats.hits} · Bullseyes: ${stats.bulls}<br>Accuracy: ${acc}%`, false);
    $('startBtn').textContent = 'PLAY AGAIN';
    offerScore({ score: stats.score });
  }

  function gameOver() {
    GS.Audio.end();
    const t = clock(elapsed);
    let best = { score: 0, time: 0 };
    try { best = JSON.parse(localStorage.getItem('monsterBest')) || best; } catch (e) {}
    const record = stats.score > best.score;
    if (record) {
      best = { score: stats.score, time: elapsed };
      try { localStorage.setItem('monsterBest', JSON.stringify(best)); } catch (e) {}
    }
    showMenu('The monsters got you!',
      `Survived <b>${t}</b> · Wave ${wave}<br>Score: <b>${stats.score}</b>${record ? ' – new record!' : ''}<br>` +
      `Monsters killed: ${stats.kills} · Headshots: ${stats.heads}` +
      (record ? '' : `<br>Best: ${best.score} (${clock(best.time)})`), false);
    $('startBtn').textContent = 'PLAY AGAIN';
    offerScore({ score: stats.score, time: elapsed, wave });
  }

  // ---------- Scoreboard (js/scores.js) ----------
  // After a round: if the score makes the top 10, ask for a name, then show the board.
  let pending = null;
  async function offerScore(result) {
    const board = mapId;
    pending = null;
    $('nameForm').hidden = true;
    if (await GS.Scores.qualifies(board, result.score)) {
      if (running || board !== mapId) return; // a new round started meanwhile
      pending = { board, result };
      let last = '';
      try { last = localStorage.getItem('playerName') || ''; } catch (e) {}
      $('nameInput').value = last;
      $('nameSave').disabled = false;
      $('nameForm').hidden = false;
      $('nameInput').focus();
    }
    showBoard();
  }
  $('nameForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!pending) return;
    const { board, result } = pending;
    pending = null;
    $('nameSave').disabled = true;
    const name = $('nameInput').value;
    try { localStorage.setItem('playerName', name); } catch (err) {}
    const { entry } = await GS.Scores.submit(board, Object.assign({ name }, result));
    $('nameForm').hidden = true;
    showBoard(entry);
  });
  // keys typed into the name box are not game controls
  $('nameInput').addEventListener('keydown', e => e.stopPropagation());

  async function showBoard(mine) {
    const board = mapId, top = await GS.Scores.list(board);
    if (board !== mapId) return;
    const monsters = board === 'monsters';
    $('boardTitle').textContent = '🏆 ' + maps[board].title;
    const table = $('boardTable');
    table.textContent = '';
    if (!top.length) table.insertAdjacentHTML('beforeend', '<tr class="empty"><td>No scores yet – be the first!</td></tr>');
    let marked = false; // highlight the new entry (first row with its name and score)
    top.forEach((e, i) => {
      const tr = table.insertRow();
      if (mine && !marked && e.name === mine.name && e.score === mine.score) { tr.className = 'me'; marked = true; }
      [i + 1 + '.', e.name, e.score].concat(monsters ? [clock(e.time) + ' · wave ' + e.wave] : []).forEach((v, k) => {
        const td = tr.insertCell();
        td.textContent = v;
        if (k === 0 || k === 2) td.className = 'num';
      });
    });
    $('boardNote').textContent = GS.Scores.status() === 'online' ? 'Shared scoreboard' : 'Scores on this computer';
    $('board').hidden = false;
  }
  $('boardBtn').addEventListener('click', () => { if ($('board').hidden) showBoard(); else $('board').hidden = true; });

  function setMap(id) {
    mapId = id; world = maps[id];
    try { localStorage.setItem('map', id); } catch (e) {}
    document.querySelectorAll('.mapBtn').forEach(b => b.classList.toggle('active', b.dataset.map === id));
    document.body.classList.toggle('mode-monsters', id === 'monsters');
    started = false;
    $('board').hidden = true; $('nameForm').hidden = true; pending = null;
    showMenu(world.title, world.intro, false);
    resetRound();
  }
  document.querySelectorAll('.mapBtn').forEach(b => b.addEventListener('click', () => { if (b.dataset.map !== mapId) setMap(b.dataset.map); }));

  // Monster speed setting (movement only), saved between visits
  function setMonsterSpeed(pct) {
    $('speedRange').value = pct;
    $('speedVal').textContent = pct + '%';
    horde.setSpeed(pct / 100);
    try { localStorage.setItem('monsterSpeed', pct); } catch (e) {}
  }
  let savedSpeed = 100;
  try { savedSpeed = +localStorage.getItem('monsterSpeed') || 100; } catch (e) {}
  setMonsterSpeed(savedSpeed);
  $('speedRange').addEventListener('input', e => setMonsterSpeed(+e.target.value));

  $('startBtn').addEventListener('click', () => { started = true; resetRound(); play(); });
  $('resumeBtn').addEventListener('click', play);
  $('exitBtn').addEventListener('click', pause);
  input.setOnUnlock(pause);
  addEventListener('keydown', e => { if (e.code === 'Escape' || e.code === 'KeyP') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  const clock = t => { const s = Math.floor(t); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function showTime() {
    const el = $('timer');
    if (world === maps.monsters) {
      el.textContent = `Wave ${wave} · ${clock(elapsed)}`;
      el.classList.remove('low');
    } else {
      const s = Math.ceil(timeLeft);
      el.textContent = clock(s);
      el.classList.toggle('low', s <= 10);
    }
  }

  function updateTimer(dt) {
    if (world === maps.monsters) {
      elapsed += dt;
      const w = Math.floor(elapsed / WAVE) + 1;
      if (w > wave) { wave = w; popup(`Wave ${wave} – faster!`); GS.Audio.growl(3); }
    } else {
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) endRound();
    }
    showTime();
  }

  // ---------- Loop ----------
  buildWeaponBar();
  setStyle(gunStyle);
  setMonsterStyle(monsterStyle);
  setMap(mapId);

  let last = performance.now(), time = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    input.poll();
    if (running) {
      updatePlayer(dt);
      updateWeapon(dt);
      updateEffects(dt);
      if (world === maps.monsters) {
        horde.update(dt, elapsed, player.pos);
        updateHealth(dt);
      }
      if (running) updateTimer(dt);
    } else {
      // slow idle pan behind the menu
      if (!started) camera.position.set(world.start.x, EYE, world.start.z);
      camera.rotation.set(-0.05, world.start.yaw + Math.sin(time * 0.15) * 0.3, 0);
    }
    world.update(dt, time);
    renderer.clear();
    renderer.render(world.scene, camera);
    if (style3d && running && !zoomed) {
      renderer.clearDepth();
      renderer.render(vm.scene, vm.camera);
    }
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
