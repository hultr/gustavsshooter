// 3D first-person guns + hands, built from simple boxes/cylinders to match the sketches.
// Rendered in a separate pass (own scene + camera) so guns never clip into walls.
// Gun-local space: origin at the top of the grip, +y up, barrel pointing -z.
window.GS = window.GS || {};

GS.Viewmodel = (function () {
  const COL = { metal: 0x9d9a92, dark: 0x4f4c47, wood: 0xb57b45, skin: 0xf1c9a2, sleeve: 0x3f6e9e, lens: 0x7fc4ea, white: 0xffffff, brass: 0xd9b25a };
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

  function create() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 5);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(-1, 2, 1);
    scene.add(sun);

    const root = new THREE.Group();
    scene.add(root);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
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

    let cur = models[0], flashT = 0;

    function setWeapon(i) {
      models.forEach((m, k) => (m.g.visible = k === i));
      cur = models[i];
      cur.g.add(flash);
      flash.position.set(0, cur.info.muzzle[0], cur.info.muzzle[1] - 0.04);
    }

    function fire() { flashT = 0.05; flash.material.rotation = Math.random() * Math.PI; }

    // s: { bob, recoil, dip }
    function update(dt, s) {
      const hip = cur.info.hip;
      root.position.set(
        hip[0] + Math.cos(s.bob) * 0.008,
        hip[1] + Math.abs(Math.sin(s.bob)) * 0.008 - s.dip * 0.12 - s.recoil * 0.005,
        hip[2] + s.recoil * 0.035);
      root.rotation.set(s.recoil * 0.1 - s.dip * 0.9, 0.05, s.dip * 0.4);
      flashT -= dt;
      flash.visible = flashT > 0;
    }

    function resize(aspect) { camera.aspect = aspect; camera.updateProjectionMatrix(); }

    return { scene, camera, setWeapon, fire, update, resize };
  }

  return { create };
})();
