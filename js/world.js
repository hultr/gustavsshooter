// Training range: ground, walls, crates and targets.
// Everything is low-poly Lambert with black edge lines for a "drawn" look.
window.GS = window.GS || {};

GS.World = (function () {
  const EDGE = new THREE.LineBasicMaterial({ color: 0x262626 });
  const mats = {};
  function mat(color) {
    return mats[color] || (mats[color] = new THREE.MeshLambertMaterial({ color }));
  }

  function canvasTex(size, draw) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  function outlined(geo, color) {
    const m = new THREE.Mesh(geo, mat(color));
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), EDGE));
    return m;
  }

  function build(scene) {
    const colliders = [];   // {minX,maxX,minZ,maxZ,top}
    const shootables = [];  // meshes the bullets can hit
    const targets = [];

    scene.background = new THREE.Color(0xd8ecf7);
    scene.fog = new THREE.Fog(0xd8ecf7, 40, 110);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, 0.65));
    const sun = new THREE.DirectionalLight(0xffffff, 0.4);
    sun.position.set(10, 20, 8);
    scene.add(sun);

    // Ground: paper with a pencil grid
    const groundTex = canvasTex(256, (g, s) => {
      g.fillStyle = '#d9d2bd'; g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(60,60,60,0.35)'; g.lineWidth = 2;
      g.strokeRect(1, 1, s - 2, s - 2);
      g.strokeStyle = 'rgba(60,60,60,0.12)'; g.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * s, y = Math.random() * s;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 2); g.stroke();
      }
    });
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(20, 40);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 160),
      new THREE.MeshLambertMaterial({ map: groundTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -25;
    scene.add(ground);
    shootables.push(ground);

    function box(x, y, z, w, h, d, color, solid = true) {
      const m = outlined(new THREE.BoxGeometry(w, h, d), color);
      m.position.set(x, y + h / 2, z);
      scene.add(m);
      shootables.push(m);
      if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: y + h });
      return m;
    }

    // Perimeter walls
    box(0, 0, 16, 44, 4, 1, 0xbfb6a0);
    box(0, 0, -66, 44, 6, 1, 0xbfb6a0);
    box(-22, 0, -25, 1, 4, 83, 0xbfb6a0);
    box(22, 0, -25, 1, 4, 83, 0xbfb6a0);

    // Shooting line: low fence with gaps you can walk through
    box(-12, 0, 2, 16, 1, 0.4, 0xc28a52);
    box(12, 0, 2, 16, 1, 0.4, 0xc28a52);

    // Crates and barrels for cover
    [[-14, -6], [15, -14], [-6, -17], [8, -28], [-15, -31], [2, -42], [-10, -45], [14, -44]].forEach(([x, z], i) => {
      const s = 1.4 + (i % 3) * 0.4;
      box(x, 0, z, s, s, s, 0xd9a55c);
      if (i % 2 === 0) box(x + 0.2, s, z - 0.1, s * 0.7, s * 0.7, s * 0.7, 0xe0b574);
    });
    [[-18, 8], [18, 8], [-4, -30], [11, -8]].forEach(([x, z]) => {
      const m = outlined(new THREE.CylinderGeometry(0.5, 0.5, 1.3, 10), 0x6e8fa8);
      m.position.set(x, 0.65, z);
      scene.add(m); shootables.push(m);
      colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5, top: 1.3 });
    });

    // Sniper platform at the far end
    box(0, 0, -58, 16, 2, 4, 0xa89c84);

    // Bullseye texture
    const bullTex = canvasTex(256, (g, s) => {
      const c = s / 2;
      const rings = ['#ffffff', '#d63a2f', '#ffffff', '#d63a2f', '#ffffff', '#d63a2f'];
      rings.forEach((col, i) => {
        g.fillStyle = col;
        g.beginPath(); g.arc(c, c, c * (1 - i / rings.length), 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#262626'; g.lineWidth = 3; g.stroke();
      });
    });
    const frontMat = new THREE.MeshLambertMaterial({ map: bullTex });
    const backMat = mat(0x8b6a45);
    const postMat = mat(0x7a5a3a);

    function target(x, z, opts = {}) {
      const r = opts.r || 0.8, h = opts.h || 1.4, y = opts.y || 0;
      const root = new THREE.Group();
      root.position.set(x, y, z);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), postMat);
      post.position.y = h / 2;
      root.add(post);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 24), frontMat);
      disc.position.y = h + r * 0.9;
      disc.position.z = 0.07;
      const back = new THREE.Mesh(new THREE.CircleGeometry(r * 1.03, 24), backMat);
      back.rotation.y = Math.PI;
      back.position.set(0, h + r * 0.9, 0.05);
      root.add(disc, back);
      scene.add(root);

      const t = {
        root, disc, r, baseX: x, down: 0, fall: 0,
        move: opts.move || 0, speed: opts.speed || 1, phase: Math.random() * 6,
        value: opts.value || 1,
      };
      disc.userData.target = t;
      shootables.push(disc);
      targets.push(t);
      return t;
    }

    // Row 1 – close, static
    [-9, -3, 3, 9].forEach(x => target(x, -8));
    // Row 2 – mid, one mover
    target(-8, -20); target(8, -20);
    target(0, -22, { move: 6, speed: 0.9 });
    // Row 3 – far, two movers
    target(-6, -35, { move: 5, speed: 1.3, value: 2 });
    target(6, -38, { move: 5, speed: 1.0, value: 2 });
    target(16, -34, { value: 2 });
    // Row 4 – on the sniper platform, small
    target(-5, -58, { y: 2, r: 0.5, value: 3 });
    target(0, -58, { y: 2, r: 0.5, value: 3, move: 4, speed: 0.7 });
    target(5, -58, { y: 2, r: 0.5, value: 3 });

    function update(dt, time) {
      for (const t of targets) {
        if (t.move) t.root.position.x = t.baseX + Math.sin(time * t.speed + t.phase) * t.move;
        if (t.down > 0) {
          t.down -= dt;
          t.fall = Math.min(1, t.fall + dt * 6);
        } else if (t.fall > 0) {
          t.fall = Math.max(0, t.fall - dt * 3);
        }
        t.root.rotation.x = -t.fall * Math.PI / 2;
      }
    }

    return { colliders, shootables, targets, update };
  }

  return { build };
})();
