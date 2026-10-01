// Monster blood: flying drops, splats on the ground and on the monsters.
// Every family bleeds its own colour (passed in as a hex number).
window.GS = window.GS || {};

GS.Blood = function (scene) {
  const MAX = 300, GRAVITY = 14;
  const drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX);
  drops.frustumCulled = false;
  drops.setColorAt(0, new THREE.Color(0x5ee02c)); // creates the colour buffer before the first render
  drops.count = 0;
  scene.add(drops);
  const P = [];
  const m4 = new THREE.Matrix4();

  // A white blob with droplets around it, tinted per material
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  const blob = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  blob(64, 64, 30);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + Math.random() * 0.5, d = 22 + Math.random() * 14;
    blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 8 + Math.random() * 8);
    const e = d + 12 + Math.random() * 16;
    blob(64 + Math.cos(a) * e, 64 + Math.sin(a) * e, 2 + Math.random() * 4);
  }
  const tex = new THREE.CanvasTexture(c);
  // three shades of each colour, made when first needed
  const shades = {};
  const mats = color => shades[color] || (shades[color] = [0.75, 0.6, 0.92].map(k => new THREE.MeshBasicMaterial({
    map: tex, color: new THREE.Color(color).multiplyScalar(k), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
  })));
  const GREEN = 0x5ee02c;
  const plane = new THREE.PlaneGeometry(1, 1);
  const splats = [], stuck = [], growing = [];
  const tmp = new THREE.Vector3(), col = new THREE.Color();

  // grow: seconds for the splat to spread out to its full size (a pool under a body)
  function splat(x, z, size, color = GREEN, grow = 0) {
    const set = mats(color);
    const m = new THREE.Mesh(plane, set[Math.floor(Math.random() * set.length)]);
    m.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
    m.position.set(x, 0.02, z);
    m.scale.setScalar(grow ? size * 0.2 : size);
    if (grow) growing.push({ m, size, t: 0, grow });
    scene.add(m);
    splats.push(m);
    if (splats.length > 90) scene.remove(splats.shift());
  }

  // Small splat stuck on the part of the monster that was hit
  function stick(obj, point, normal, color = GREEN) {
    const m = new THREE.Mesh(plane, mats(color)[0]);
    m.scale.setScalar(0.2 + Math.random() * 0.15);
    m.position.copy(point).addScaledVector(normal, 0.02);
    m.lookAt(tmp.copy(m.position).add(normal));
    obj.attach(m);
    stuck.push(m);
    if (stuck.length > 50) { const old = stuck.shift(); if (old.parent) old.parent.remove(old); }
  }

  function add(x, y, z, vx, vy, vz, c) {
    if (P.length >= MAX) P.shift();
    P.push({ x, y, z, vx, vy, vz, s: 0.6 + Math.random() * 0.9, c });
  }

  // Bullet hit: most drops fly on in the bullet's direction, some back at the shooter
  function spray(p, dir, n, c = GREEN) {
    for (let i = 0; i < n; i++) {
      const k = i % 3 === 0 ? -1.2 : 2 + Math.random() * 2;
      add(p.x, p.y, p.z,
        dir.x * k + (Math.random() - 0.5) * 3,
        dir.y * k + Math.random() * 2.5,
        dir.z * k + (Math.random() - 0.5) * 3, c);
    }
  }

  function burst(x, y, z, n, c = GREEN) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3;
      add(x, y + Math.random(), z, Math.cos(a) * s, 2 + Math.random() * 4, Math.sin(a) * s, c);
    }
  }

  function update(dt) {
    let n = 0;
    for (let i = P.length - 1; i >= 0; i--) {
      const d = P[i];
      d.vy -= GRAVITY * dt;
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      if (d.y <= 0.02) {
        if (Math.random() < 0.3) splat(d.x, d.z, 0.15 + Math.random() * 0.3, d.c);
        P.splice(i, 1);
      }
    }
    for (const d of P) {
      drops.setColorAt(n, col.setHex(d.c));
      drops.setMatrixAt(n++, m4.makeScale(d.s, d.s, d.s).setPosition(d.x, d.y, d.z));
    }
    drops.count = n;
    drops.instanceMatrix.needsUpdate = true;
    drops.instanceColor.needsUpdate = true;
    for (let i = growing.length - 1; i >= 0; i--) {
      const g = growing[i];
      g.t = Math.min(1, g.t + dt / g.grow);
      g.m.scale.setScalar(g.size * (0.2 + 0.8 * (1 - (1 - g.t) ** 2)));
      if (g.t >= 1) growing.splice(i, 1);
    }
  }

  function reset() {
    P.length = 0;
    drops.count = 0;
    splats.splice(0).forEach(m => scene.remove(m));
    growing.length = 0;
    stuck.splice(0).forEach(m => { if (m.parent) m.parent.remove(m); });
  }

  return { spray, burst, splat, stick, update, reset };
};
