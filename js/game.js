// Main game: player movement, shooting, round timer, HUD.
(function () {
  const $ = id => document.getElementById(id);
  const input = GS.Input, I = input.state;

  // ---------- Renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: !I.isTouch, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, I.isTouch ? 1.25 : 1.5));
  $('game').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 200);
  camera.rotation.order = 'YXZ';
  const world = GS.World.build(scene);
  const vm = GS.Viewmodel.create();
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
    const speed = (I.sprint && !zoomed ? 8.5 : 5.5) * (zoomed ? 0.5 : 1);
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
    const vx = (-sin * my + cos * mx) * speed * dt;
    const vz = (-cos * my - sin * mx) * speed * dt;

    const p = player.pos;
    if (!blocked(p.x + vx, p.z, p.y)) p.x += vx;
    if (!blocked(p.x, p.z + vz, p.y)) p.z += vz;

    if (I.jump && player.onGround) { player.vy = JUMP; player.onGround = false; }
    player.vy -= GRAVITY * dt;
    p.y += player.vy * dt;
    const g = groundAt(p.x, p.z, p.y);
    if (p.y <= g) { p.y = g; player.vy = 0; player.onGround = true; } else if (p.y > g + 0.05) player.onGround = false;

    const moving = player.onGround && (Math.abs(mx) + Math.abs(my) > 0.1);
    player.bob += moving ? dt * speed * 1.6 : 0;

    camera.position.set(p.x, p.y + EYE + (moving ? Math.sin(player.bob * 2) * 0.04 : 0), p.z);
    camera.rotation.set(player.pitch + recoilPitch, player.yaw, 0);
  }

  // ---------- Weapons ----------
  const weapons = GS.weapons;
  let current = 0, ammo = weapons.map(w => w.mag), cooldown = 0, reloadT = 0;
  let zoomed = false, recoil = 0, recoilPitch = 0, flashT = 0;
  const gunCanvas = $('gunCanvas'), flash = $('flash'), gunWrap = $('gunWrap'), hud = $('hud');

  function buildWeaponBar() {
    const bar = $('weaponBar');
    weapons.forEach((w, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      const c = document.createElement('canvas'); c.width = 140; c.height = 74;
      GS.drawWeapon(c, w);
      slot.append(c);
      slot.insertAdjacentHTML('beforeend', `<span>${i + 1}</span><b>${w.price}</b>`);
      slot.addEventListener('mousedown', e => { e.stopPropagation(); selectWeapon(i); });
      bar.append(slot);
    });
  }

  function selectWeapon(i) {
    i = (i + weapons.length) % weapons.length;
    if (i === current && gunCanvas.dataset.drawn) return;
    current = i; reloadT = 0; cooldown = 0.25; setZoom(false);
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
  const stats = { score: 0, shots: 0, hits: 0, bulls: 0 };

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
    raycaster.set(camera.position, dir);
    const hit = raycaster.intersectObjects(world.shootables, false)[0];

    GS.Audio.shot(w.kick);
    recoil = Math.min(1.4, recoil + 0.5 * w.kick);
    recoilPitch += 0.012 * w.kick;
    flashT = 0.05;
    vm.fire();
    if (hit) {
      const t = hit.object.userData.target;
      if (t && t.down <= 0 && t.fall === 0) hitTarget(t, hit);
      addDecal(hit);
    }
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
    scene.add(m);
    hit.object.attach(m);
    decals.push(m);
    if (decals.length > 60) { const old = decals.shift(); old.parent.remove(old); }
  }

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
    vm.update(dt, { bob: player.bob, recoil, dip });
  }

  // Gun style: 3D models with hands, or the original 2D sketches
  let style3d = true;
  try { style3d = localStorage.getItem('gunStyle') !== 'sketch'; } catch (e) {}
  function setStyle(on) {
    style3d = on;
    document.body.classList.toggle('style-3d', on);
    $('styleBtn').textContent = 'Gun style: ' + (on ? '3D' : 'Sketch');
    try { localStorage.setItem('gunStyle', on ? '3d' : 'sketch'); } catch (e) {}
  }
  setStyle(style3d);
  $('styleBtn').addEventListener('click', () => setStyle(!style3d));
  addEventListener('keydown', e => { if (e.code === 'KeyV' && running) setStyle(!style3d); });

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
  const HEART = '<svg viewBox="0 0 32 30"><path d="M16 28 C 6 20 2 15 2 9 C 2 4 6 2 9 2 C 12 2 15 4 16 7 C 17 4 20 2 23 2 C 26 2 30 4 30 9 C 30 15 26 20 16 28 Z" fill="#e74c3c" stroke="#262626" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  $('hearts').innerHTML = HEART.repeat(5);

  // ---------- Round / menus ----------
  const ROUND = 180;
  let timeLeft = ROUND, running = false, started = false;

  function resetRound() {
    Object.assign(stats, { score: 0, shots: 0, hits: 0, bulls: 0 });
    $('score').textContent = 0;
    timeLeft = ROUND;
    player.pos.set(0, 0, 9); player.vy = 0; player.yaw = 0; player.pitch = 0;
    ammo = weapons.map(w => w.mag); reloadT = 0;
    world.targets.forEach(t => { t.down = 0; t.fall = 0; });
    decals.splice(0).forEach(d => d.parent.remove(d));
    selectWeapon(current);
  }

  function play() {
    GS.Audio.init();
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
  }

  $('startBtn').addEventListener('click', () => { started = true; resetRound(); play(); });
  $('resumeBtn').addEventListener('click', play);
  $('exitBtn').addEventListener('click', pause);
  input.setOnUnlock(pause);
  addEventListener('keydown', e => { if (e.code === 'Escape' || e.code === 'KeyP') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  function updateTimer(dt) {
    timeLeft = Math.max(0, timeLeft - dt);
    const s = Math.ceil(timeLeft);
    const el = $('timer');
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    el.classList.toggle('low', s <= 10);
    if (timeLeft <= 0) endRound();
  }

  // ---------- Loop ----------
  buildWeaponBar();
  resetRound();
  camera.position.set(0, EYE, 9);

  let last = performance.now(), time = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    input.poll();
    if (running) {
      updatePlayer(dt);
      updateWeapon(dt);
      updateTimer(dt);
    } else {
      // slow idle pan behind the menu
      camera.rotation.set(-0.05, Math.sin(time * 0.15) * 0.3, 0);
    }
    world.update(dt, time);
    renderer.clear();
    renderer.render(scene, camera);
    if (style3d && running && !zoomed) {
      renderer.clearDepth();
      renderer.render(vm.scene, vm.camera);
    }
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
