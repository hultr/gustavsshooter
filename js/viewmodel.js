// 3D first-person guns + hands, built from simple boxes/cylinders to match the sketches.
// The detailed guns (js/guns-hd.js) are built the first time they are switched on and get
// extra motion: spring recoil, sway, working slides/bolts, casings, magazine drops.
// Rendered in a separate pass (own scene + camera) so guns never clip into walls.
// Gun-local space: origin at the top of the grip, +y up, barrel pointing -z.
window.GS = window.GS || {};

GS.Viewmodel = (function () {
  const COL = { metal: 0x9d9a92, dark: 0x4f4c47, wood: 0xb57b45, skin: 0xf1c9a2, sleeve: 0x3f6e9e, lens: 0x7fc4ea, white: 0xffffff, brass: 0xd9b25a, olive: 0x6f7c40, laser: 0xff4a3a };
  const EDGE = new THREE.LineBasicMaterial({ color: 0x1e1e1e });
  const mats = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));

  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const C = (r, len, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2); // axis along z

  // add a mesh with sketch edges. rot = x-rotation (or [x,y,z])
  function part(parent, geo, color, x, y, z, rot = 0, edges = true) {
    const m = new THREE.Mesh(geo, mat(COL[color] || color));
    m.position.set(x, y, z);
    if (Array.isArray(rot)) m.rotation.set(rot[0], rot[1], rot[2]); else m.rotation.x = rot;
    if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), EDGE));
    parent.add(m);
    return m;
  }

  function disc(parent, r, color, x, y, z, ry) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: COL[color] || color }));
    m.position.set(x, y, z); m.rotation.y = ry;
    parent.add(m);
    return m;
  }

  // a cylinder (arm) from a point along a direction
  const UP = new THREE.Vector3(0, 1, 0);
  function limb(parent, from, dir, len, r, color) {
    const d = new THREE.Vector3(...dir).normalize();
    const m = part(parent, new THREE.CylinderGeometry(r, r * 1.08, len, 8), color, 0, 0, 0, 0, false);
    m.quaternion.setFromUnitVectors(UP, d);
    m.position.set(from[0], from[1], from[2]).addScaledVector(d, len / 2);
    return m;
  }

  // Right hand wraps the grip; built in the grip's own (tilted) frame
  function rightHand(g, grip) {
    const f = new THREE.Group();
    f.position.set(0, grip.y, grip.z);
    f.rotation.x = grip.a;
    g.add(f);
    part(f, B(0.018, 0.08, 0.06), 'skin', 0.024, 0.005, 0.004);      // palm (right side)
    part(f, B(0.05, 0.08, 0.018), 'skin', 0.008, 0.005, 0.031);      // back of hand
    part(f, B(0.042, 0.066, 0.017), 'skin', 0.005, -0.004, -0.03);   // fingers around the front
    part(f, B(0.013, 0.013, 0.05), 'skin', -0.021, 0.036, -0.012);   // thumb
    const wrist = [0.02, grip.y - 0.03, grip.z + 0.045];
    limb(g, wrist, [0.25, -0.55, 1], 0.08, 0.022, 'skin');
    limb(g, [wrist[0] + 0.017, wrist[1] - 0.038, wrist[2] + 0.068], [0.25, -0.55, 1], 0.5, 0.034, 'sleeve');
  }

  // Left hand supports the front of long guns
  function leftHand(g, fore) {
    const { y, z } = fore;
    part(g, B(0.056, 0.024, 0.08), 'skin', 0, y, z);                  // palm under the gun
    part(g, B(0.012, 0.045, 0.07), 'skin', 0.031, y + 0.02, z);       // fingers up the right side
    part(g, B(0.012, 0.035, 0.06), 'skin', -0.031, y + 0.016, z);     // thumb up the left side
    const wrist = [-0.012, y - 0.012, z + 0.04];
    limb(g, wrist, [-0.35, -0.45, 1], 0.07, 0.022, 'skin');
    limb(g, [wrist[0] - 0.02, wrist[1] - 0.026, wrist[2] + 0.058], [-0.35, -0.45, 1], 0.6, 0.034, 'sleeve');
  }

  // ---------- Guns (shapes follow sketches/weapons.png) ----------
  const builders = {
    pistol(g) { // "Free": blocky slide, grip full of holes
      part(g, B(0.032, 0.04, 0.19), 'metal', 0, 0.025, -0.07);
      part(g, B(0.028, 0.018, 0.12), 'dark', 0, -0.002, -0.05);
      part(g, B(0.006, 0.008, 0.008), 'dark', 0, 0.049, -0.155);
      part(g, B(0.02, 0.008, 0.008), 'dark', 0, 0.049, 0.015);
      part(g, B(0.006, 0.004, 0.045), 'dark', 0, -0.03, -0.035);
      const grip = part(g, B(0.03, 0.11, 0.045), 'dark', 0, -0.055, 0.02, -0.25);
      [-0.03, -0.005, 0.02].forEach(y => disc(grip, 0.0065, 'white', -0.0155, y, 0.004, -Math.PI / 2));
      return { muzzle: [0.025, -0.17], grip: { y: -0.05, z: 0.02, a: -0.25 }, hip: [0.15, -0.15, -0.5] };
    },
    revolver(g) { // "1k": round barrel, big drum, wooden grip
      part(g, C(0.011, 0.15), 'metal', 0, 0.03, -0.14);
      part(g, B(0.008, 0.006, 0.15), 'metal', 0, 0.043, -0.14);
      part(g, B(0.03, 0.05, 0.09), 'dark', 0, 0.018, -0.02);
      part(g, C(0.025, 0.045, 8), 'metal', 0, 0.018, -0.035);
      part(g, B(0.008, 0.02, 0.015), 'dark', 0, 0.05, 0.025);
      part(g, B(0.004, 0.012, 0.01), 'dark', 0, 0.051, -0.205);
      part(g, B(0.006, 0.004, 0.035), 'dark', 0, -0.012, -0.02);
      part(g, B(0.03, 0.1, 0.045), 'wood', 0, -0.045, 0.035, -0.35);
      return { muzzle: [0.03, -0.22], grip: { y: -0.045, z: 0.035, a: -0.35 }, hip: [0.15, -0.15, -0.5] };
    },
    rifle(g) { // "50k": curved magazine, wooden stock and handguard
      part(g, B(0.045, 0.06, 0.3), 'metal', 0, 0.02, -0.05);
      part(g, B(0.04, 0.015, 0.26), 'dark', 0, 0.057, -0.05);
      part(g, B(0.05, 0.05, 0.17), 'wood', 0, 0.025, -0.29);
      part(g, C(0.009, 0.3), 'dark', 0, 0.035, -0.47);
      part(g, C(0.008, 0.16), 'dark', 0, 0.058, -0.28);
      part(g, B(0.006, 0.035, 0.012), 'dark', 0, 0.065, -0.55);
      part(g, B(0.02, 0.012, 0.02), 'dark', 0, 0.071, 0.05);
      part(g, B(0.03, 0.09, 0.05), 'dark', 0, -0.045, -0.1, 0.15);
      part(g, B(0.03, 0.08, 0.05), 'dark', 0, -0.115, -0.13, 0.45);
      part(g, B(0.028, 0.09, 0.04), 'wood', 0, -0.04, 0.06, -0.3);
      part(g, B(0.04, 0.065, 0.24), 'wood', 0, -0.005, 0.21, 0.12);
      return { muzzle: [0.035, -0.63], grip: { y: -0.035, z: 0.06, a: -0.3 }, fore: { y: -0.012, z: -0.29 }, hip: [0.16, -0.17, -0.52] };
    },
    sniper(g) { // "500k": long barrel, big scope, the eye on the stock
      part(g, B(0.045, 0.055, 0.3), 'metal', 0, 0.02, -0.03);
      part(g, B(0.05, 0.045, 0.2), 'wood', 0, 0.012, -0.27);
      part(g, C(0.011, 0.5), 'dark', 0, 0.03, -0.43);
      part(g, B(0.03, 0.025, 0.04), 'dark', 0, 0.03, -0.69);
      part(g, C(0.02, 0.3), 'dark', 0, 0.1, -0.05);
      part(g, C(0.028, 0.06), 'dark', 0, 0.1, -0.2);
      part(g, C(0.026, 0.05), 'dark', 0, 0.1, 0.1);
      disc(g, 0.024, 'lens', 0, 0.1, -0.231, Math.PI);
      disc(g, 0.022, 'lens', 0, 0.1, 0.126, 0);
      part(g, B(0.012, 0.04, 0.015), 'dark', 0, 0.065, -0.12);
      part(g, B(0.012, 0.04, 0.015), 'dark', 0, 0.065, 0.02);
      part(g, new THREE.CylinderGeometry(0.005, 0.005, 0.04, 6).rotateZ(Math.PI / 2), 'dark', 0.035, 0.03, 0.06);
      part(g, new THREE.SphereGeometry(0.009, 8, 6), 'dark', 0.057, 0.03, 0.06, 0, false);
      part(g, B(0.03, 0.04, 0.06), 'dark', 0, -0.02, -0.06);
      part(g, B(0.028, 0.08, 0.04), 'dark', 0, -0.035, 0.08, -0.3);
      part(g, B(0.045, 0.07, 0.28), 'wood', 0, 0, 0.26);
      part(g, B(0.045, 0.06, 0.12), 'wood', 0, -0.055, 0.34);
      disc(g, 0.02, 'white', -0.0235, 0.002, 0.24, -Math.PI / 2);
      disc(g, 0.008, 0x1e1e1e, -0.024, 0.002, 0.237, -Math.PI / 2);
      return { muzzle: [0.03, -0.72], grip: { y: -0.03, z: 0.08, a: -0.3 }, fore: { y: -0.022, z: -0.27 }, hip: [0.17, -0.18, -0.55] };
    },
    smg(g) { // "750k": boxy body, long magazine held by the left hand
      part(g, B(0.06, 0.075, 0.26), 'metal', 0, 0.025, -0.06);
      part(g, B(0.03, 0.014, 0.2), 'dark', 0, 0.069, -0.06);
      part(g, C(0.01, 0.09), 'dark', 0, 0.03, -0.23);
      part(g, C(0.018, 0.05, 8), 'dark', 0, 0.03, -0.2);
      part(g, B(0.03, 0.085, 0.04), 'dark', 0, -0.05, 0.02, -0.2);
      part(g, B(0.03, 0.16, 0.045), 'dark', 0, -0.08, -0.1);
      part(g, B(0.04, 0.05, 0.07), 'metal', 0, 0.03, 0.1);
      return { muzzle: [0.03, -0.28], grip: { y: -0.04, z: 0.02, a: -0.2 }, fore: { y: -0.1, z: -0.1 }, hip: [0.16, -0.17, -0.5] };
    },

    // ---------- sketches/monstersandweapons2.png ----------
    keysniper(g) { // "Nyckel sniper": stepped barrel, scope, a key ring at the back
      part(g, B(0.05, 0.06, 0.3), 'metal', 0, 0.02, -0.05);
      part(g, B(0.04, 0.045, 0.22), 'dark', 0, 0.025, -0.31);
      part(g, B(0.028, 0.03, 0.26), 'metal', 0, 0.03, -0.55);
      part(g, C(0.022, 0.26), 'dark', 0, 0.1, -0.08);
      disc(g, 0.02, 'lens', 0, 0.1, -0.211, Math.PI);
      part(g, B(0.012, 0.04, 0.015), 'dark', 0, 0.065, -0.15);
      part(g, B(0.012, 0.04, 0.015), 'dark', 0, 0.065, 0);
      part(g, new THREE.TorusGeometry(0.075, 0.022, 6, 14).rotateY(Math.PI / 2), 'brass', 0, 0.01, 0.2);
      part(g, B(0.028, 0.08, 0.04), 'dark', 0, -0.035, 0.06, -0.3);
      return { muzzle: [0.03, -0.69], grip: { y: -0.03, z: 0.06, a: -0.3 }, fore: { y: -0.012, z: -0.3 }, hip: [0.17, -0.18, -0.55] };
    },
    laser(g) { // "AR" laser gun: tube barrel with two coils and a glowing tip
      part(g, B(0.05, 0.06, 0.28), 'metal', 0, 0.02, -0.05);
      part(g, C(0.014, 0.3), 'dark', 0, 0.025, -0.33);
      [-0.26, -0.4].forEach(z => part(g, new THREE.TorusGeometry(0.035, 0.009, 6, 12), 'metal', 0, 0.025, z));
      part(g, new THREE.SphereGeometry(0.018, 8, 6), 'laser', 0, 0.025, -0.49, 0, false).material = new THREE.MeshBasicMaterial({ color: COL.laser });
      for (let i = 0; i < 4; i++) part(g, B(0.04, 0.012, 0.03), 'dark', 0, 0.02 - (i % 2) * 0.02, 0.12 + i * 0.045, 0.5);
      part(g, B(0.028, 0.09, 0.04), 'dark', 0, -0.04, 0.05, -0.3);
      return { muzzle: [0.025, -0.5], grip: { y: -0.035, z: 0.05, a: -0.3 }, fore: { y: -0.01, z: -0.22 }, hip: [0.16, -0.17, -0.52] };
    },
    rpg(g) { // "RPG": long olive tube with the rocket sticking out of the front
      part(g, C(0.04, 0.85, 10), 'olive', 0, 0.04, -0.1);
      part(g, new THREE.CylinderGeometry(0.06, 0.04, 0.1, 10).rotateX(Math.PI / 2), 'dark', 0, 0.04, 0.37);
      const round = part(g, new THREE.ConeGeometry(0.045, 0.16, 8).rotateX(-Math.PI / 2), 0x9aa06a, 0, 0.04, -0.6);
      part(g, B(0.015, 0.035, 0.03), 'dark', -0.035, 0.09, -0.1);
      part(g, B(0.03, 0.09, 0.04), 'dark', 0, -0.035, 0.03, -0.25);
      part(g, B(0.03, 0.07, 0.035), 'dark', 0, -0.03, -0.2, -0.1);
      return { muzzle: [0.04, -0.6], grip: { y: -0.035, z: 0.03, a: -0.25 }, fore: { y: -0.06, z: -0.2 }, hip: [0.16, -0.19, -0.5], round, dipTurn: 0.25 };
    },
    minigun(g) { // "Minigun": spinning barrel bundle, round front, handle on top
      part(g, B(0.1, 0.1, 0.2), 'dark', 0, 0.02, 0.02);
      const spinner = new THREE.Group();
      spinner.position.set(0, 0.02, -0.25);
      g.add(spinner);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        part(spinner, C(0.009, 0.4, 6), 'metal', Math.cos(a) * 0.028, Math.sin(a) * 0.028, -0.05);
      }
      part(spinner, C(0.048, 0.03, 12), 'metal', 0, 0, -0.2);
      part(spinner, C(0.048, 0.03, 12), 'metal', 0, 0, 0.05);
      part(g, B(0.015, 0.015, 0.14), 'dark', 0, 0.105, 0.02);
      part(g, B(0.015, 0.05, 0.015), 'dark', 0, 0.08, -0.045);
      part(g, B(0.015, 0.05, 0.015), 'dark', 0, 0.08, 0.085);
      part(g, B(0.03, 0.09, 0.045), 'dark', 0, -0.07, 0.07, -0.25);
      return { muzzle: [0.02, -0.46], grip: { y: -0.065, z: 0.07, a: -0.25 }, fore: { y: -0.03, z: -0.14 }, hip: [0.16, -0.2, -0.5], spinner };
    },

    // ---------- sketches/20261004_135325.jpg, sketches/candysniper.jpg ----------
    scoperevolver(g) { // "Kikarrevolver": the revolver with a scope on top and saw teeth under the barrel
      const info = builders.revolver(g);
      part(g, C(0.016, 0.17), 'dark', 0, 0.095, -0.085);
      disc(g, 0.015, 'lens', 0, 0.095, -0.171, Math.PI);
      disc(g, 0.015, 'lens', 0, 0.095, 0.001, 0);
      [-0.03, -0.13].forEach(z => part(g, B(0.012, 0.04, 0.014), 'dark', 0, 0.064, z));
      for (let i = 0; i < 6; i++) part(g, new THREE.ConeGeometry(0.006, 0.014, 4).rotateX(Math.PI), 'metal', 0, 0.012, -0.085 - i * 0.022, 0, false);
      return info;
    },
    candysniper(g) { // "Candy sniper": candy-cane barrel and hook stock, ring sight, star muzzle
      // the barrel dips and rises again (as drawn); striped by alternating pieces
      const Q = t => [(1 - t) ** 2 * -0.1 + 2 * t * (1 - t) * -0.4 + t * t * -0.68, (1 - t) ** 2 * 0.02 + 2 * t * (1 - t) * -0.03 + t * t * 0.035];
      const stripes = (pts, r) => pts.slice(1).forEach(([z, y], i) => {
        const [z0, y0] = pts[i];
        limb(g, [0, y0, z0], [0, y - y0, z - z0], Math.hypot(z - z0, y - y0), r, i % 2 ? 0xe8417a : 'white');
      });
      stripes(Array.from({ length: 13 }, (_, i) => Q(i / 12)), 0.015);
      const hook = [[0.1, 0.02], [0.2, 0.02]].concat(Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI / 2 - (i + 1) / 8 * Math.PI * 0.85; return [0.2 + Math.cos(a) * 0.045, -0.025 + Math.sin(a) * 0.045];
      }));
      stripes(hook, 0.017);
      part(g, B(0.046, 0.055, 0.22), 0xe8417a, 0, 0.02, -0.01);
      part(g, B(0.03, 0.014, 0.3), 'white', 0, 0.075, -0.1);
      part(g, B(0.03, 0.05, 0.03), 'white', 0, 0.06, 0.04);
      [-0.03, -0.17].forEach(z => part(g, B(0.008, 0.03, 0.008), 'dark', 0, 0.06, z));
      part(g, new THREE.TorusGeometry(0.03, 0.006, 6, 16), 0xe8417a, 0, 0.115, -0.08);
      part(g, new THREE.OctahedronGeometry(0.02), 0xf2c935, 0, 0.035, -0.69);
      part(g, B(0.028, 0.085, 0.04), 0xe8417a, 0, -0.035, 0.07, -0.3);
      return { muzzle: [0.035, -0.71], grip: { y: -0.035, z: 0.07, a: -0.3 }, fore: { y: -0.028, z: -0.28 }, hip: [0.17, -0.18, -0.55] };
    },
  };

  function flashTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, '#fffbe0'); grd.addColorStop(0.3, '#ffd23a'); grd.addColorStop(1, 'rgba(255,140,0,0)');
    g.fillStyle = grd;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, r = i % 2 ? 12 : 32;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    g.fill();
    return new THREE.CanvasTexture(c);
  }

  // soft round puff for gun smoke
  function smokeTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(220,220,215,.55)'); grd.addColorStop(1, 'rgba(220,220,215,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function create(renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 5);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(-1, 2, 1);
    scene.add(sun);

    const root = new THREE.Group();
    scene.add(root);
    const flashTex = flashTexture();
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flash.scale.setScalar(0.12);

    const models = GS.weapons.map(w => {
      const g = new THREE.Group();
      const info = builders[w.id](g);
      rightHand(g, info.grip);
      if (info.fore) leftHand(g, info.fore);
      g.visible = false;
      root.add(g);
      return { g, info };
    });

    // ---------- detailed guns ----------
    let hd = false, hdModels = null, index = 0;
    const V = THREE.Vector3;
    // side flash: two crossed planes along the barrel, and a light that flashes on the gun
    const crossMat = new THREE.MeshBasicMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide });
    const cross = new THREE.Group();
    cross.add(new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.16).rotateX(-Math.PI / 2), crossMat));
    cross.add(new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.16).rotateX(-Math.PI / 2).rotateZ(Math.PI / 2), crossMat));
    const light = new THREE.PointLight(0xffb45a, 0, 1.2, 2);
    scene.add(light);
    const kick = { p: new V(), v: new V(), r: new V(), w: new V() }, sway = { x: 0, y: 0, vx: 0, vy: 0 };
    const part = { slide: 9, hammer: 9, bolt: 9, cylA: 0, cylT: 0, shots: 0, reloadP: -1 };
    const casings = [], smokes = [];
    const casingMat = () => GS.GunsHD.materials().brass;
    let casingGeo = null;
    const smokeMat = new THREE.SpriteMaterial({ map: smokeTexture(), depthWrite: false, transparent: true });

    function buildHD() {
      hdModels = GS.GunsHD.build(GS.Tex.env(renderer));
      hdModels.forEach(m => { m.g.visible = false; root.add(m.g); });
      casingGeo = GS.GunsHD.casingGeo();
    }
    const set = () => (hd ? hdModels : models);

    function setDetail(on) {
      if (on && !hdModels) buildHD();
      hd = on;
      setWeapon(index);
    }

    let cur = models[0], flashT = 0;

    function setWeapon(i) {
      index = i;
      models.forEach(m => (m.g.visible = false));
      if (hdModels) hdModels.forEach(m => (m.g.visible = false));
      cur = set()[i];
      cur.g.visible = true;
      cur.g.add(flash);
      flash.position.set(0, cur.info.muzzle[0], cur.info.muzzle[1] - 0.04);
      if (hd) { cur.g.add(cross); cross.position.set(0, cur.info.muzzle[0], cur.info.muzzle[1] - 0.08); }
      else cross.removeFromParent();
      part.slide = part.hammer = part.bolt = 9; part.cylA = part.cylT = 0; part.reloadP = -1;
    }

    // k: the gun's kick (GS.weapons[].kick)
    function fire(k = 1) {
      flashT = 0.05; flash.material.rotation = Math.random() * Math.PI;
      if (!hd) return;
      const s = Math.sqrt(k);
      kick.v.z += 0.55 * s; kick.v.y += 0.12 * s;
      kick.w.x += 3.2 * s; kick.w.y += (Math.random() - 0.5) * 1.2 * s; kick.w.z += (Math.random() - 0.5) * 2 * s;
      const sc = 0.09 + Math.random() * 0.07;
      flash.scale.setScalar(sc * 1.3);
      cross.scale.set(1, 1, 0.7 + Math.random() * 0.6);
      cross.rotation.z = Math.random() * Math.PI;
      part.slide = 0; part.hammer = 0; part.bolt = 0; part.cylT += Math.PI / 3; part.shots++;
      const info = cur.info;
      if (info.eject && !info.bolt && part.shots % (info.ejectEvery || 1) === 0) eject(info);
      for (let i = 0; i < 2; i++) smoke(0.15 + i * 0.1);
    }

    const tmpV = new V();
    function eject(info, spread = 0) {
      if (casings.length > 24) { const c = casings.shift(); c.m.removeFromParent(); }
      const m = new THREE.Mesh(casingGeo, casingMat());
      m.scale.setScalar(info.casing || 1);
      cur.g.localToWorld(m.position.fromArray(info.eject));
      m.position.x += (Math.random() - 0.5) * spread;
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      scene.add(m);
      casings.push({ m, life: 0.9, v: new V(0.9 + Math.random() * 0.5, 0.9 + Math.random() * 0.5, 0.2 + Math.random() * 0.3).multiplyScalar(spread ? 0.3 : 1), w: new V(Math.random() * 30, Math.random() * 30, 0) });
    }
    function smoke(life) {
      if (smokes.length > 12) { const o = smokes.shift(); o.s.removeFromParent(); }
      const s = new THREE.Sprite(smokeMat.clone());
      cur.g.localToWorld(s.position.set(0, cur.info.muzzle[0], cur.info.muzzle[1] - 0.02));
      s.scale.setScalar(0.03);
      scene.add(s);
      smokes.push({ s, life, max: life, v: new V((Math.random() - 0.5) * 0.06, 0.08 + Math.random() * 0.05, -0.05) });
    }

    // spring: x'' = -k x - c x'
    function springStep(x, v, k, c, dt) {
      v.addScaledVector(x, -k * dt).multiplyScalar(Math.max(0, 1 - c * dt));
      x.addScaledVector(v, dt);
    }

    // s: { bob, recoil, dip, spin (0..1 minigun spin-up), loaded (gun has a round),
    //      look: [dx, dy] mouse movement this frame, reload: 0..1 progress or -1 }
    function update(dt, s) {
      if (cur.info.spinner) cur.info.spinner.rotation.z += (s.spin || 0) * dt * 40;
      if (cur.info.round) cur.info.round.visible = s.loaded !== false;
      const hip = cur.info.hip;
      const turn = cur.info.dipTurn || 1; // long guns tilt less when reloading so they don't swing into the camera
      flashT -= dt;
      flash.visible = flashT > 0;
      if (!hd) {
        root.position.set(
          hip[0] + Math.cos(s.bob) * 0.008,
          hip[1] + Math.abs(Math.sin(s.bob)) * 0.008 - s.dip * 0.12 - s.recoil * 0.005,
          hip[2] + s.recoil * 0.035);
        root.rotation.set(s.recoil * 0.1 - s.dip * 0.9 * turn, 0.05, s.dip * 0.4 * turn);
        return;
      }
      updateHD(dt, s, hip, turn);
    }

    let breathT = 0;
    function updateHD(dt, s, hip, turn) {
      const info = cur.info;
      dt = Math.min(dt, 0.033);
      springStep(kick.p, kick.v, 260, 20, dt);
      springStep(kick.r, kick.w, 220, 16, dt);
      // the gun lags behind the aim and swings back
      const look = s.look || [0, 0];
      const tx = Math.max(-0.05, Math.min(0.05, -look[0] * 0.0006)), ty = Math.max(-0.05, Math.min(0.05, look[1] * 0.0006));
      sway.vx += ((tx - sway.x) * 140 - sway.vx * 14) * dt; sway.x += sway.vx * dt;
      sway.vy += ((ty - sway.y) * 140 - sway.vy * 14) * dt; sway.y += sway.vy * dt;
      breathT += dt;
      const breath = Math.sin(breathT * 1.6) * 0.0025;
      // reloading: the gun is pulled in a little and rolled over so the magazine faces you
      root.position.set(
        hip[0] + Math.cos(s.bob) * 0.01 + sway.x * 0.4 - s.dip * 0.05,
        hip[1] + Math.abs(Math.sin(s.bob)) * 0.01 + breath - s.dip * 0.06 + sway.y * 0.3 - kick.p.y * 0.2,
        hip[2] + kick.p.z + s.dip * 0.04);
      root.rotation.set(kick.r.x * 0.12 - s.dip * 0.25 * turn + sway.y + breath, 0.05 + kick.r.y * 0.1 + sway.x + s.dip * 0.3, s.dip * 0.7 * turn + kick.r.z * 0.06 - sway.x * 0.6);
      if (info.spinner) root.position.x += (s.spin || 0) * (Math.random() - 0.5) * 0.002;

      // working parts
      part.slide += dt; part.hammer += dt; part.bolt += dt;
      if (info.slide) {
        const t = part.slide;
        let f = t < 0.025 ? t / 0.025 : Math.max(0, 1 - (t - 0.025) / 0.06);
        if (info.slide.lock && s.loaded === false && s.reload < 0.75) f = 1; // empty: slide locks back
        info.slide.o.position.z = info.slide.travel * f;
      }
      if (info.cyl) {
        part.cylA += (part.cylT - part.cylA) * Math.min(1, dt * 18);
        info.cyl.rotation.z = part.cylA;
      }
      if (info.hammer) {
        const t = part.hammer;
        info.hammer.rotation.x = t < 0.04 ? -0.6 : -0.6 * Math.max(0, 1 - (t - 0.2) / 0.2);
      }
      if (info.bolt) {  // lift, pull back (casing out), push, lower
        const t = part.bolt, o = info.bolt;
        const ph = (a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
        const lift = ph(0.15, 0.28) - ph(0.66, 0.78), back = ph(0.3, 0.42) - ph(0.5, 0.62);
        o.rotation.z = lift * 1.2;
        o.position.z = 0.06 + back * 0.08;
        if (t - dt < 0.42 && t >= 0.42) eject(info);
      }
      if (info.glow) {
        const k = 0.55 + 0.45 * Math.max(0, 1 - part.slide / 0.12) + 0.08 * Math.sin(breathT * 9);
        info.glow.forEach(m => m.material.color.setRGB(k, k * 0.3, k * 0.22));
      }
      // reload: the magazine drops out and a new one goes in; the RPG round slides in
      const p = s.reload, was = part.reloadP;
      part.reloadP = p;
      if (info.mag) {
        const d = p < 0 ? 0 : p < 0.15 ? 0 : p < 0.35 ? (p - 0.15) / 0.2 : p < 0.6 ? 1 : p < 0.85 ? 1 - (p - 0.6) / 0.25 : 0;
        const dir = info.mag.dir, k = d * d * 0.25;
        info.mag.o.position.set(info.mag.base.x + dir[0] * k, info.mag.base.y + dir[1] * k, info.mag.base.z + dir[2] * k);
        info.mag.o.visible = d < 0.99;
      }
      if (info.round && p >= 0) {
        info.round.visible = p > 0.45;
        info.round.position.z = -0.53 - Math.max(0, 1 - (p - 0.45) / 0.35) * 0.3;
      } else if (info.round) info.round.position.z = -0.53;
      if (info.reloadEject && was < 0.25 && p >= 0.25) for (let i = 0; i < info.reloadEject; i++) eject({ eject: [0, 0.02, -0.05], casing: info.casing }, 0.04);

      // flash light, casings, smoke
      light.intensity = flashT > 0 ? 2.5 : 0;
      cur.g.localToWorld(light.position.set(0, info.muzzle[0], info.muzzle[1] - 0.05));
      cross.visible = flashT > 0;
      for (let i = casings.length - 1; i >= 0; i--) {
        const c = casings[i];
        c.v.y -= 9.8 * dt;
        c.m.position.addScaledVector(c.v, dt);
        c.m.rotation.x += c.w.x * dt; c.m.rotation.y += c.w.y * dt;
        if ((c.life -= dt) <= 0) { c.m.removeFromParent(); casings.splice(i, 1); }
      }
      for (let i = smokes.length - 1; i >= 0; i--) {
        const o = smokes[i], k = 1 - o.life / o.max;
        o.s.position.addScaledVector(o.v, dt);
        o.s.scale.setScalar(0.03 + k * 0.12);
        o.s.material.opacity = (1 - k) * 0.6;
        if ((o.life -= dt * 0.5) <= 0) { o.s.removeFromParent(); o.s.material.dispose(); smokes.splice(i, 1); }
      }
    }

    function resize(aspect) { camera.aspect = aspect; camera.updateProjectionMatrix(); }

    return { scene, camera, setWeapon, setDetail, fire, update, resize };
  }

  return { create };
})();
