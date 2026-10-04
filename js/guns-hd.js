// Detailed 3D guns ("Detailed 3D" gun style): beveled parts with metal, polymer and wood
// materials, textured and reflecting a studio environment, held by gloved hands.
// Same gun-local space as viewmodel.js: origin at the top of the grip, +y up, barrel -z.
// Each builder returns the same info as the simple guns (muzzle, grip, fore, hip ...) plus
// the moving parts: slide/carrier, revolver cylinder and hammer, sniper bolt, magazine.
window.GS = window.GS || {};

GS.GunsHD = (function () {
  const G = GS.Geo, PI = Math.PI;
  const UV = 1 / 0.09; // one texture tile per 9 cm
  let M = null;

  function materials(env) {
    const T = GS.Tex.gunTex;
    const std = (o, kind, bump = 0.0004, useMap = true) => {
      // the environment also lights non-metals from all sides, so they get less of it
      const m = new THREE.MeshStandardMaterial(Object.assign({ envMap: env, envMapIntensity: o.metalness > 0.5 ? 1 : 0.3 }, o));
      if (kind) {
        const t = T(kind);
        m.roughnessMap = t.rough; m.bumpMap = t.bump; m.bumpScale = bump;
        if (useMap) m.map = t.map;
      }
      return m;
    };
    const glow = c => new THREE.MeshBasicMaterial({ color: c });
    return {
      steel: std({ color: 0x60636a, metalness: 0.95, roughness: 0.42, envMapIntensity: 1.4 }, 'brushed', 0.0002),
      anod: std({ color: 0x2c2d31, metalness: 0.7, roughness: 0.5 }, 'stipple', 0.0001),
      bright: std({ color: 0xb4b7bb, metalness: 1, roughness: 0.4 }, 'brushed', 0.0002),
      polymer: std({ color: 0x38393d, metalness: 0, roughness: 0.8 }, 'stipple', 0.0003),
      grip: std({ color: 0x2c2d30, metalness: 0, roughness: 1 }, 'stipple', 0.0012),
      white: std({ color: 0xc4c2bc, metalness: 0.05, roughness: 0.55 }, 'stipple', 0.0001),
      wood: std({ color: 0x8c6a52, metalness: 0, roughness: 0.55 }, 'wood', 0.0003),
      darkwood: std({ color: 0x5c4434, metalness: 0, roughness: 0.5 }, 'wood', 0.0003),
      bakelite: std({ color: 0x8a3c1c, metalness: 0, roughness: 0.55 }, 'paint', 0.0002),
      brass: std({ color: 0xd8aa50, metalness: 1, roughness: 0.4 }, 'brushed', 0.0002),
      copper: std({ color: 0xc8743a, metalness: 1, roughness: 0.4 }, 'brushed', 0.0002),
      olive: std({ color: 0x59633a, metalness: 0.3, roughness: 0.75 }, 'paint', 0.0004),
      candy: std({ color: 0xd61f4f, metalness: 0, roughness: 0.25 }, 'paint', 0.0001),
      candyWhite: std({ color: 0xf2ece4, metalness: 0, roughness: 0.3 }, 'paint', 0.0001),
      lemon: std({ color: 0xf2c935, metalness: 0, roughness: 0.3 }, 'paint', 0.0001),
      warhead: std({ color: 0x6a7440, metalness: 0.3, roughness: 0.6 }, 'paint', 0.0003),
      rubber: std({ color: 0x18181a, metalness: 0, roughness: 1 }, 'checker', 0.0008, false),
      glove: std({ color: 0x2a2925, metalness: 0, roughness: 1 }, 'knit', 0.0008),
      pad: std({ color: 0x1f1f21, metalness: 0, roughness: 0.75 }, 'stipple', 0.0005),
      sleeve: std({ color: 0x2e3d50, metalness: 0, roughness: 1 }, 'knit', 0.001),
      glass: new THREE.MeshStandardMaterial({ color: 0x103844, metalness: 1, roughness: 0.04, envMap: env, envMapIntensity: 1.6 }),
      black: glow(0x060606), dot: glow(0xd8ffb0), red: glow(0xff3020), laser: glow(0xff4a3a),
    };
  }

  // ---------- part helpers ----------
  function mk(parent, geo, mat, p = [0, 0, 0], r = [0, 0, 0]) {
    if (!geo.userData.uv) { G.projectUV(geo, UV); geo.userData.uv = true; }
    const m = new THREE.Mesh(geo, typeof mat === 'string' ? M[mat] : mat);
    m.position.fromArray(p);
    m.rotation.set(r[0], r[1], r[2]);
    parent.add(m);
    return m;
  }
  const B = (w, h, d, r = 0) => (r ? G.roundBox(w, h, d, r, 2) : new THREE.BoxGeometry(w, h, d));
  const Cz = (r, len, seg = 16) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(PI / 2);
  const Cx = (r, len, seg = 12) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(PI / 2);
  const Cy = (r, len, seg = 14) => new THREE.CylinderGeometry(r, r, len, seg);
  const ring = (R, t, seg = 20) => new THREE.TorusGeometry(R, t, 8, seg);
  const many = (geo, list) => G.merge(list.map(([p, r]) => G.place(geo, p, r)));
  // dark disc facing -z (a bore) or +z
  function bore(parent, r, x, y, z, back = false) {
    const g = new THREE.CircleGeometry(r, 16);
    if (!back) g.rotateY(PI);
    return mk(parent, g, 'black', [x, y, z]);
  }
  function lens(parent, r, x, y, z, back = false) {
    const g = new THREE.CircleGeometry(r, 24);
    if (!back) g.rotateY(PI);
    return mk(parent, g, 'glass', [x, y, z]);
  }
  // a group to hang moving parts on
  const group = (parent, p = [0, 0, 0], r = [0, 0, 0]) => {
    const g = new THREE.Group();
    g.position.fromArray(p); g.rotation.set(r[0], r[1], r[2]);
    parent.add(g);
    return g;
  };

  // Trigger guard (a loop) and trigger, dz shifts them back along the gun
  function triggerGuard(g, dz, mat = 'polymer', top = -0.006) {
    const o = (pts) => pts.map(([z, y, r]) => [z + dz, y, r]);
    mk(g, G.side(o([[-0.05, top], [-0.056, -0.03, 0.008], [-0.03, -0.042, 0.008], [0.0, -0.042, 0.006], [0.022, -0.028, 0.004], [0.022, top]]), 0.012, 0.0015,
      [o([[-0.044, top - 0.004], [-0.048, -0.028, 0.006], [-0.028, -0.036, 0.006], [-0.002, -0.036, 0.004], [0.016, -0.025], [0.016, top - 0.004]])]), mat);
    mk(g, G.side(o([[-0.012, top], [-0.02, -0.016, 0.005], [-0.016, -0.03, 0.002], [-0.011, -0.031], [-0.009, -0.017], [-0.004, top]]), 0.006, 0.001), 'bright');
  }
  // Pistol grip in its own tilted frame (same frame as the right hand)
  function pistolGrip(g, grip, mat, len = 0.075, w = 0.03) {
    const f = group(g, [0, grip.y, grip.z], [grip.a, 0, 0]);
    mk(f, G.side([[-0.019, 0.035], [-0.023, -0.01, 0.01], [-0.024, -len + 0.012, 0.008], [-0.018, -len, 0.006], [0.021, -len, 0.006], [0.025, -len * 0.4, 0.015], [0.022, 0.035]], w, 0.004), mat);
    return f;
  }

  // ---------- the guns ----------
  const builders = {
    pistol(g) { // "Free": blocky slide, grip full of holes
      const slide = group(g);
      mk(slide, G.side([[0.027, 0.006], [0.027, 0.041, 0.004], [0.021, 0.046, 0.003], [-0.152, 0.046, 0.004], [-0.167, 0.037, 0.004], [-0.167, 0.006]], 0.03, 0.002), 'steel');
      mk(slide, many(B(0.0312, 0.022, 0.0012), Array.from({ length: 8 }, (_, i) => [[0, 0.027, 0.004 + i * 0.0027]])), 'black'); // grip serrations
      mk(slide, B(0.012, 0.003, 0.03, 0.001), 'bright', [0.006, 0.0458, -0.04]);   // chamber hood in the port
      mk(slide, B(0.014, 0.0012, 0.034), 'black', [0.006, 0.0462, -0.04]);
      mk(slide, B(0.024, 0.007, 0.007, 0.0015), 'steel', [0, 0.049, 0.019]);       // sights with glowing dots
      mk(slide, B(0.005, 0.007, 0.005, 0.001), 'steel', [0, 0.049, -0.158]);
      [[-0.0065, 0.051, 0.0155], [0.0065, 0.051, 0.0155], [0, 0.0515, -0.1555]].forEach(p => mk(slide, new THREE.SphereGeometry(0.0013, 6, 4), 'dot', p));
      mk(slide, Cz(0.0072, 0.006), 'bright', [0, 0.025, -0.165]);
      bore(slide, 0.0045, 0, 0.025, -0.1685);
      // polymer frame with an accessory rail
      mk(g, G.side([[0.028, 0.007], [-0.16, 0.007], [-0.16, -0.004, 0.003], [-0.15, -0.013, 0.002], [-0.06, -0.013], [-0.05, -0.008], [0.028, -0.008]], 0.028), 'polymer');
      mk(g, many(B(0.029, 0.004, 0.004), [-0.14, -0.125, -0.11].map(z => [[0, -0.011, z]])), 'black');
      triggerGuard(g, 0.0, 'polymer', -0.008);
      const grip = { y: -0.05, z: 0.02, a: -0.25 };
      const f = group(g, [0, grip.y, grip.z], [grip.a, 0, 0]);
      mk(f, G.side([[-0.019, 0.042], [-0.022, 0.01, 0.01], [-0.026, -0.004, 0.004], [-0.021, -0.016, 0.006], [-0.025, -0.03, 0.006], [-0.021, -0.042, 0.006],
        [-0.024, -0.055, 0.004], [-0.02, -0.062, 0.003], [0.024, -0.062, 0.003], [0.026, -0.02, 0.02], [0.028, 0.02, 0.01], [0.036, 0.046, 0.006], [0.03, 0.05, 0.003], [0.0, 0.05]], 0.03, 0.003), 'grip');
      // Gustav's holes in the grip
      [-0.03, -0.005, 0.02].forEach(y => {
        mk(f, new THREE.CircleGeometry(0.0062, 16).rotateY(-PI / 2), 'black', [-0.0158, y, 0.004]);
        mk(f, ring(0.0064, 0.0011).rotateY(PI / 2), 'bright', [-0.0156, y, 0.004]);
      });
      const mag = group(f);
      mk(mag, B(0.032, 0.007, 0.05, 0.002), 'polymer', [0, -0.066, 0.002]);
      mk(mag, B(0.022, 0.1, 0.034), 'steel', [0, -0.015, 0]);
      return { muzzle: [0.025, -0.17], grip, hip: [0.15, -0.15, -0.5],
        slide: { o: slide, travel: 0.028, lock: true }, mag: { o: mag, dir: [0, -1, 0] }, eject: [0.008, 0.047, -0.04], casing: 0.8 };
    },

    revolver(g) { // "1k": round barrel, big drum, wooden grip
      mk(g, Cz(0.0105, 0.15), 'bright', [0, 0.03, -0.14]);
      mk(g, B(0.016, 0.014, 0.13, 0.004), 'bright', [0, 0.019, -0.145]);                 // underlug
      mk(g, B(0.009, 0.006, 0.15, 0.0015), 'bright', [0, 0.042, -0.14]);                  // vent rib
      mk(g, many(B(0.0095, 0.003, 0.006), [-0.19, -0.165, -0.14, -0.115, -0.09].map(z => [[0, 0.0438, z]])), 'black');
      mk(g, G.side([[-0.214, 0.044], [-0.198, 0.044], [-0.206, 0.054, 0.002], [-0.214, 0.054]], 0.004, 0.0008), 'bright');
      mk(g, B(0.0045, 0.004, 0.003), 'red', [0, 0.052, -0.209]);
      bore(g, 0.0055, 0, 0.03, -0.2155);
      // frame around the cylinder
      mk(g, B(0.02, 0.006, 0.066, 0.002), 'bright', [0, 0.045, -0.03]);
      mk(g, G.side([[0.03, 0.048], [0.036, 0.02, 0.008], [0.026, -0.012, 0.006], [0.006, -0.012], [0.006, 0.048]], 0.03), 'bright');
      mk(g, G.side([[-0.058, 0.048], [-0.058, -0.008], [-0.074, -0.008], [-0.074, 0.048]], 0.028), 'bright');
      mk(g, B(0.024, 0.006, 0.07, 0.002), 'bright', [0, -0.009, -0.025]);
      const cyl = group(g, [0, 0.018, -0.026]);
      mk(cyl, G.lathe([[0.021, 0], [0.021, 0.02], [0.019, 0.0235], [-0.019, 0.0235], [-0.021, 0.02], [-0.021, 0]], 24), 'bright');
      mk(cyl, many(B(0.0075, 0.005, 0.03, 0.002), Array.from({ length: 6 }, (_, i) => {
        const a = (i + 0.5) / 6 * PI * 2; return [[Math.cos(a) * 0.0225, Math.sin(a) * 0.0225, 0], [0, 0, a]];
      })), 'steel');
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; bore(cyl, 0.0052, Math.cos(a) * 0.013, Math.sin(a) * 0.013, -0.0212); }
      const hammer = group(g, [0, 0.042, 0.03]);
      mk(hammer, G.side([[0, -0.004], [0.006, 0.012, 0.003], [0.016, 0.02, 0.003], [0.021, 0.016], [0.011, 0.004], [0.008, -0.008]], 0.008, 0.001), 'steel');
      triggerGuard(g, 0.005, 'bright', -0.01);
      const grip = { y: -0.045, z: 0.035, a: -0.35 };
      const f = group(g, [0, grip.y, grip.z], [grip.a, 0, 0]);
      mk(f, G.side([[-0.016, 0.04], [-0.022, 0.0, 0.01], [-0.026, -0.05, 0.012], [-0.018, -0.068, 0.008], [0.022, -0.066, 0.008], [0.026, -0.03, 0.015], [0.02, 0.04]], 0.032, 0.004), 'wood');
      mk(f, new THREE.CircleGeometry(0.0065, 18).rotateY(-PI / 2), 'brass', [-0.0166, -0.012, 0.002]);
      return { muzzle: [0.03, -0.22], grip, hip: [0.15, -0.15, -0.5], cyl, hammer, reloadEject: 6, casing: 0.9 };
    },

    rifle(g) { // "50k": curved magazine, wooden stock and handguard
      mk(g, G.side([[0.1, 0.052], [0.1, -0.008, 0.004], [-0.2, -0.008], [-0.2, 0.052]], 0.044, 0.002), 'steel');
      mk(g, G.side([[0.1, 0.061, 0.008], [0.1, 0.048], [-0.17, 0.048], [-0.17, 0.058, 0.004], [-0.155, 0.063]], 0.038), 'steel');   // dust cover
      mk(g, B(0.012, 0.008, 0.008, 0.002), 'steel', [0, 0.058, 0.104]);
      mk(g, B(0.046, 0.05, 0.035, 0.004), 'steel', [0, 0.024, -0.2]);                                                               // trunnion
      mk(g, G.side([[-0.17, 0.05], [-0.205, 0.05], [-0.205, 0.068], [-0.175, 0.06]], 0.03), 'steel');                                 // rear sight block
      mk(g, B(0.022, 0.002, 0.06, 0.0008), 'steel', [0, 0.065, -0.145], [0.06, 0, 0]);
      mk(g, G.side([[-0.218, 0.044], [-0.218, 0.008, 0.006], [-0.21, 0.0, 0.004], [-0.37, 0.0, 0.006], [-0.376, 0.012, 0.004], [-0.376, 0.044]], 0.052, 0.004), 'wood');
      mk(g, many(B(0.0525, 0.003, 0.012), [-0.25, -0.28, -0.31, -0.34].map(z => [[0, 0.004, z]])), 'black');              // finger grooves
      mk(g, B(0.04, 0.024, 0.15, 0.009), 'wood', [0, 0.058, -0.29]);
      mk(g, Cz(0.0085, 0.04), 'steel', [0, 0.058, -0.385]);
      mk(g, B(0.03, 0.042, 0.03, 0.004), 'steel', [0, 0.044, -0.42]);
      mk(g, Cz(0.0095, 0.3), 'steel', [0, 0.032, -0.47]);
      mk(g, B(0.026, 0.035, 0.03, 0.003), 'steel', [0, 0.045, -0.55]);
      mk(g, many(B(0.003, 0.022, 0.012, 0.001), [[[-0.009, 0.072, -0.55]], [[0.009, 0.072, -0.55]]]), 'steel');
      mk(g, B(0.0022, 0.016, 0.0022), 'steel', [0, 0.07, -0.55]);
      mk(g, Cz(0.012, 0.035), 'steel', [0, 0.032, -0.635]);
      mk(g, many(B(0.025, 0.006, 0.008), [[[0, 0.04, -0.63]], [[0, 0.04, -0.642]]]), 'black');
      mk(g, Cz(0.003, 0.25, 8), 'bright', [0, 0.014, -0.5]);
      bore(g, 0.0055, 0, 0.032, -0.6528);
      const carrier = group(g);
      mk(carrier, Cx(0.004, 0.02), 'bright', [0.03, 0.033, -0.07]);
      mk(carrier, new THREE.SphereGeometry(0.0065, 12, 8), 'bright', [0.041, 0.033, -0.07]);
      mk(g, B(0.003, 0.012, 0.09, 0.0012), 'steel', [0.0235, 0.04, 0.03], [-0.08, 0, 0]);                                // selector
      mk(g, B(0.002, 0.016, 0.06), 'black', [0.0222, 0.038, -0.1]);                                                        // ejection port
      const mag = group(g);
      mk(mag, G.side([[-0.072, -0.004], [-0.084, -0.06, 0.02], [-0.11, -0.11, 0.03], [-0.15, -0.158, 0.008], [-0.19, -0.142, 0.008], [-0.155, -0.095, 0.03], [-0.136, -0.05, 0.02], [-0.127, -0.004]], 0.03, 0.003), 'bakelite');
      mk(g, G.side([[0.1, -0.008], [0.1, 0.045], [0.15, 0.04, 0.01], [0.33, 0.032, 0.006], [0.33, -0.07, 0.006], [0.14, -0.022]], 0.04, 0.005), 'wood');  // stock
      mk(g, G.side([[0.33, -0.072], [0.342, -0.072], [0.346, 0.034, 0.003], [0.33, 0.034]], 0.042, 0.002), 'steel');
      triggerGuard(g, 0.0, 'steel', -0.008);
      const grip = { y: -0.035, z: 0.06, a: -0.3 };
      pistolGrip(g, grip, 'wood');
      return { muzzle: [0.035, -0.63], grip, fore: { y: -0.012, z: -0.29 }, hip: [0.16, -0.17, -0.52],
        slide: { o: carrier, travel: 0.06 }, mag: { o: mag, dir: [0, -1, -0.35] }, eject: [0.024, 0.04, -0.1], casing: 1.2 };
    },

    sniper(g) { // "500k": long barrel, big scope, the eye on the stock
      mk(g, G.side([[-0.37, 0.026, 0.004], [-0.37, 0.0, 0.006], [-0.3, -0.014, 0.02], [-0.1, -0.016], [-0.07, -0.006], [0.02, -0.006], [0.035, -0.02, 0.006],
        [0.045, -0.095, 0.008], [0.075, -0.106, 0.008], [0.095, -0.07, 0.01], [0.13, -0.045, 0.01], [0.25, -0.06], [0.4, -0.1, 0.008], [0.41, 0.048, 0.008],
        [0.3, 0.062, 0.02], [0.16, 0.055, 0.01], [0.13, 0.026]], 0.046, 0.006), 'darkwood');
      mk(g, G.side([[0.4, -0.1], [0.416, -0.102], [0.426, 0.05, 0.004], [0.41, 0.05]], 0.048, 0.003), 'rubber');
      mk(g, G.lathe([[-0.18, 0], [-0.18, 0.017], [-0.175, 0.019], [0.11, 0.019], [0.12, 0.015], [0.12, 0]], 20), 'steel', [0, 0.03, 0]);
      mk(g, B(0.002, 0.016, 0.05), 'black', [0.0185, 0.034, 0.0]);
      mk(g, G.lathe([[-0.18, 0], [-0.18, 0.0145], [-0.3, 0.0128], [-0.66, 0.0105], [-0.66, 0]], 18), 'steel', [0, 0.03, 0]);
      mk(g, B(0.03, 0.026, 0.045, 0.004), 'steel', [0, 0.03, -0.685]);
      mk(g, many(B(0.031, 0.008, 0.006), [-0.672, -0.685, -0.698].map(z => [[0, 0.03, z]])), 'black');
      bore(g, 0.005, 0, 0.03, -0.7085);
      // scope: eyepiece, tube, objective bell, turrets, rings
      mk(g, G.lathe([[0.12, 0], [0.12, 0.024], [0.1, 0.026], [0.075, 0.017], [0.06, 0.016], [-0.13, 0.016], [-0.16, 0.028], [-0.235, 0.03], [-0.235, 0]], 28), 'anod', [0, 0.1, 0]);
      lens(g, 0.026, 0, 0.1, -0.2356);
      lens(g, 0.021, 0, 0.1, 0.1206, true);
      mk(g, Cy(0.011, 0.022, 18), 'anod', [0, 0.124, -0.03]);
      mk(g, Cx(0.011, 0.022, 18), 'anod', [0.024, 0.1, -0.03]);
      mk(g, Cx(0.008, 0.016, 14), 'anod', [-0.022, 0.1, -0.03]);
      [-0.11, 0.03].forEach(z => {
        mk(g, ring(0.0185, 0.004).scale(1, 1, 2.5), 'anod', [0, 0.1, z]);
        mk(g, B(0.016, 0.036, 0.022, 0.003), 'anod', [0, 0.066, z]);
      });
      // the bolt: lifts, pulls back and pushes forward after every shot
      const bolt = group(g, [0, 0.03, 0.06]);
      mk(bolt, Cz(0.0125, 0.06), 'bright', [0, 0, 0.04]);
      mk(bolt, Cx(0.0045, 0.045), 'bright', [0.0225, 0, 0], [0, 0, -0.1]);
      mk(bolt, new THREE.SphereGeometry(0.0105, 14, 10), 'polymer', [0.047, -0.004, 0]);
      mk(g, B(0.03, 0.004, 0.07, 0.0015), 'bright', [0, -0.017, -0.13]);   // floor plate
      triggerGuard(g, 0.005, 'steel', -0.006);
      // Gustav's eye painted on the left of the stock
      const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.03).rotateY(-PI / 2), new THREE.MeshStandardMaterial({ map: eyeDecal(), transparent: true, roughness: 0.6, envMap: M.wood.envMap }));
      eye.position.set(-0.0236, 0.002, 0.24);
      g.add(eye);
      return { muzzle: [0.03, -0.72], grip: { y: -0.03, z: 0.08, a: -0.3 }, fore: { y: -0.022, z: -0.27 }, hip: [0.17, -0.18, -0.55],
        bolt, eject: [0.02, 0.04, 0.0], casing: 1.5 };
    },

    smg(g) { // "750k": boxy body, long magazine held by the left hand
      mk(g, G.side([[0.07, 0.062, 0.004], [0.07, 0.005], [-0.19, 0.005], [-0.19, 0.05, 0.006], [-0.17, 0.062]], 0.056, 0.004), 'polymer');
      mk(g, G.side([[0.06, 0.006], [0.06, -0.012, 0.004], [-0.065, -0.012], [-0.075, -0.02], [-0.13, -0.02, 0.004], [-0.13, 0.006]], 0.05), 'polymer');
      mk(g, B(0.022, 0.006, 0.24, 0.001), 'anod', [0, 0.066, -0.06]);
      mk(g, many(B(0.0226, 0.0026, 0.004), Array.from({ length: 22 }, (_, i) => [[0, 0.068, 0.045 - i * 0.01]])), 'black');
      // red dot sight
      mk(g, B(0.02, 0.012, 0.04, 0.002), 'anod', [0, 0.075, -0.005]);
      mk(g, G.lathe([[0.012, 0.013], [0.012, 0.0165], [-0.025, 0.0165], [-0.025, 0.013], [0.012, 0.013]], 20), 'anod', [0, 0.094, -0.005]);
      lens(g, 0.013, 0, 0.094, -0.026, true);
      mk(g, new THREE.SphereGeometry(0.0012, 6, 4), 'red', [0, 0.094, -0.022]);
      mk(g, Cz(0.014, 0.045), 'steel', [0, 0.03, -0.21]);
      mk(g, Cz(0.008, 0.03), 'steel', [0, 0.03, -0.245]);
      mk(g, Cz(0.011, 0.025), 'steel', [0, 0.03, -0.27]);
      mk(g, many(B(0.0225, 0.004, 0.005), [-0.265, -0.275].map(z => [[0, 0.036, z]])), 'black');
      bore(g, 0.0045, 0, 0.03, -0.2828);
      const carrier = group(g);
      mk(carrier, B(0.03, 0.008, 0.012, 0.002), 'steel', [0, 0.058, 0.076]);
      mk(g, B(0.002, 0.018, 0.04), 'black', [0.0285, 0.035, -0.02]);
      mk(g, B(0.05, 0.05, 0.04, 0.006), 'polymer', [0, 0.03, 0.085]);
      triggerGuard(g, 0.005, 'polymer', -0.012);
      const grip = { y: -0.04, z: 0.02, a: -0.2 };
      pistolGrip(g, grip, 'grip', 0.072, 0.032);
      const mag = group(g);
      mk(mag, B(0.026, 0.17, 0.04, 0.003), 'steel', [0, -0.08, -0.1]);
      mk(mag, B(0.032, 0.012, 0.048, 0.003), 'polymer', [0, -0.168, -0.1]);
      [-0.05, -0.08, -0.11].forEach(y => mk(mag, new THREE.CircleGeometry(0.003, 10).rotateY(-PI / 2), 'black', [-0.0131, y, -0.1]));
      return { muzzle: [0.03, -0.28], grip, fore: { y: -0.1, z: -0.1 }, hip: [0.16, -0.17, -0.5],
        slide: { o: carrier, travel: 0.035 }, mag: { o: mag, dir: [0, -1, 0], hand: true }, eject: [0.03, 0.035, -0.02], casing: 0.8 };
    },

    // ---------- sketches/monstersandweapons2.png ----------
    keysniper(g) { // "Nyckel sniper": built like a big key – brass bow at the back, stepped shaft, key bits
      mk(g, ring(0.075, 0.02, 32).rotateY(PI / 2), 'brass', [0, 0.01, 0.2]);
      mk(g, ring(0.05, 0.006, 28).rotateY(PI / 2), 'brass', [0, 0.01, 0.2]);
      mk(g, G.lathe([[0.135, 0], [0.135, 0.018], [0.125, 0.03], [0.105, 0.03], [0.1, 0.022], [0.1, 0]], 20), 'brass', [0, 0.02, 0]);
      mk(g, G.side([[0.1, 0.05, 0.004], [0.1, -0.01], [-0.2, -0.01], [-0.2, 0.05, 0.004]], 0.05), 'steel');
      mk(g, many(B(0.0512, 0.003, 0.26), [[[0, 0.03, -0.05]], [[0, 0.008, -0.05]]]), 'black');      // the key's ward grooves
      mk(g, G.side([[-0.2, 0.047], [-0.2, 0.003], [-0.42, 0.003], [-0.42, 0.047]], 0.04), 'brass');
      mk(g, B(0.0412, 0.003, 0.2), 'black', [0, 0.025, -0.31]);
      mk(g, G.side([[-0.42, 0.045], [-0.42, 0.015], [-0.68, 0.015], [-0.68, 0.045]], 0.028), 'bright');
      // key bits under the front of the shaft
      [0.02, 0.035, 0.015, 0.03, 0.022, 0.012].forEach((h, i) => mk(g, B(0.026, h, 0.022, 0.003), 'brass', [0, 0.016 - h / 2, -0.46 - i * 0.034]));
      mk(g, G.lathe([[-0.68, 0], [-0.68, 0.017], [-0.695, 0.015], [-0.695, 0]], 18), 'brass', [0, 0.03, 0]);
      bore(g, 0.006, 0, 0.03, -0.6955);
      mk(g, G.lathe([[0.05, 0], [0.05, 0.02], [0.04, 0.022], [0.03, 0.016], [-0.17, 0.016], [-0.19, 0.024], [-0.211, 0.024], [-0.211, 0]], 24), 'anod', [0, 0.1, 0]);
      [-0.19, 0.04].forEach(z => mk(g, ring(0.0235, 0.0025), 'brass', [0, 0.1, z]));
      lens(g, 0.022, 0, 0.1, -0.2116);
      lens(g, 0.018, 0, 0.1, 0.0506, true);
      mk(g, B(0.012, 0.04, 0.015, 0.002), 'brass', [0, 0.065, -0.15]);
      mk(g, B(0.012, 0.04, 0.015, 0.002), 'brass', [0, 0.065, 0]);
      triggerGuard(g, 0.0, 'brass', -0.01);
      const grip = { y: -0.03, z: 0.06, a: -0.3 };
      pistolGrip(g, grip, 'darkwood');
      return { muzzle: [0.03, -0.69], grip, fore: { y: -0.012, z: -0.3 }, hip: [0.17, -0.18, -0.55], eject: [0.026, 0.04, -0.05], casing: 1.5 };
    },

    laser(g) { // "AR" laser gun: white body, copper coils, glowing tip
      mk(g, G.side([[0.1, 0.05, 0.008], [0.1, -0.01, 0.006], [-0.2, -0.01, 0.006], [-0.21, 0.02, 0.01], [-0.2, 0.05, 0.006]], 0.05, 0.004), 'white');
      mk(g, G.merge([G.place(B(0.0505, 0.0012, 0.12), [0, 0.036, -0.08]), G.place(B(0.0505, 0.06, 0.0012), [0, 0.02, -0.02]), G.place(B(0.0505, 0.06, 0.0012), [0, 0.02, 0.06])]), 'black'); // panel lines
      const cell = mk(g, B(0.0515, 0.008, 0.08, 0.002), new THREE.MeshBasicMaterial({ color: 0xff4a3a }), [0, 0.012, -0.08]);
      mk(g, Cz(0.012, 0.3), 'anod', [0, 0.025, -0.33]);
      [-0.26, -0.4].forEach(z => {
        mk(g, G.merge(Array.from({ length: 6 }, (_, i) => G.place(ring(0.028, 0.0045, 18), [0, 0, (i - 2.5) * 0.009]))), 'copper', [0, 0.025, z]);
        mk(g, G.merge([-1, 1].map(s => G.place(ring(0.034, 0.004, 18), [0, 0, s * 0.03]))), 'bright', [0, 0.025, z]);
      });
      mk(g, G.lathe([[-0.47, 0], [-0.47, 0.02], [-0.49, 0.016], [-0.493, 0.0]], 18), 'bright', [0, 0.025, 0]);
      const tip = mk(g, new THREE.SphereGeometry(0.013, 14, 10), 'laser', [0, 0.025, -0.493]);
      // heat-sink fins in a loop stock
      mk(g, G.tube([[0, 0.045, 0.09], [0, 0.05, 0.2], [0, 0.0, 0.27], [0, -0.05, 0.24], [0, -0.04, 0.1]], 0.008, 24, 8), 'white');
      mk(g, many(B(0.04, 0.05, 0.0035, 0.001), [0.13, 0.155, 0.18, 0.205].map(z => [[0, 0.0, z], [0.4, 0, 0]])), 'bright');
      triggerGuard(g, -0.005, 'white', -0.01);
      const grip = { y: -0.035, z: 0.05, a: -0.3 };
      pistolGrip(g, grip, 'grip');
      return { muzzle: [0.025, -0.5], grip, fore: { y: -0.01, z: -0.22 }, hip: [0.16, -0.17, -0.52], glow: [cell, tip] };
    },

    rpg(g) { // "RPG": olive tube, wooden heat shield, the rocket sticking out of the front
      mk(g, G.lathe([[0.42, 0], [0.42, 0.064], [0.4, 0.066], [0.32, 0.046], [0.3, 0.041], [-0.5, 0.041], [-0.51, 0.045], [-0.53, 0.045], [-0.53, 0.036]], 24), 'olive', [0, 0.04, 0]);
      bore(g, 0.058, 0, 0.04, 0.4205, true);
      mk(g, G.lathe([[0.0, 0.0405], [0.0, 0.048], [-0.02, 0.051], [-0.2, 0.051], [-0.22, 0.048], [-0.22, 0.0405]], 24), 'wood', [0, 0.04, 0]);
      [0.005, -0.225].forEach(z => mk(g, ring(0.046, 0.004, 24), 'olive', [0, 0.04, z]));
      mk(g, B(0.025, 0.03, 0.09, 0.004), 'olive', [0, 0.004, -0.01]);
      mk(g, G.side([[-0.19, 0.0], [-0.2, -0.06, 0.01], [-0.19, -0.075, 0.006], [-0.16, -0.075, 0.006], [-0.165, -0.04, 0.01], [-0.16, 0.0]], 0.03, 0.004), 'darkwood');
      triggerGuard(g, 0.0, 'olive', -0.01);
      const grip = { y: -0.035, z: 0.03, a: -0.25 };
      pistolGrip(g, grip, 'darkwood');
      // optical sight on the left, iron sights on top
      mk(g, B(0.03, 0.012, 0.03, 0.002), 'olive', [-0.045, 0.06, -0.1]);
      mk(g, B(0.026, 0.05, 0.09, 0.006), 'anod', [-0.065, 0.09, -0.1]);
      mk(g, Cz(0.013, 0.04, 16), 'rubber', [-0.065, 0.095, -0.035]);
      lens(g, 0.011, -0.065, 0.095, -0.0145, true);
      lens(g, 0.01, -0.065, 0.095, -0.1455);
      mk(g, B(0.004, 0.03, 0.006, 0.001), 'olive', [0, 0.095, -0.48]);
      mk(g, B(0.02, 0.02, 0.006, 0.002), 'olive', [0, 0.092, -0.12]);
      const round = group(g, [0, 0.04, -0.53]);
      mk(round, G.lathe([[0.06, 0], [0.06, 0.022], [0.0, 0.024], [-0.03, 0.042], [-0.12, 0.045], [-0.16, 0.04], [-0.24, 0.016], [-0.27, 0.008], [-0.29, 0.005], [-0.29, 0]], 24), 'warhead');
      mk(round, G.lathe([[-0.289, 0], [-0.289, 0.0055], [-0.302, 0.003], [-0.305, 0]], 12), 'bright');
      return { muzzle: [0.04, -0.6], grip, fore: { y: -0.06, z: -0.2 }, hip: [0.16, -0.19, -0.5], round, dipTurn: 0.25 };
    },

    minigun(g) { // "Minigun": spinning barrel bundle, round front, handle on top
      mk(g, G.side([[0.12, 0.07, 0.012], [0.12, -0.03, 0.012], [-0.08, -0.03, 0.012], [-0.08, 0.07, 0.012]], 0.1, 0.006), 'steel');
      mk(g, many(B(0.101, 0.004, 0.006), [0.0, 0.03, 0.06, 0.09].map(z => [[0, 0.055, z]])), 'black');
      mk(g, Cz(0.032, 0.07, 20), 'anod', [0, 0.02, 0.15]);
      mk(g, G.merge([0.13, 0.145, 0.16, 0.175].map(z => G.place(ring(0.033, 0.003, 20), [0, 0, z]))), 'bright', [0, 0.02, 0]);
      mk(g, Cz(0.05, 0.014, 24), 'bright', [0, 0.02, -0.087]);
      const spinner = group(g, [0, 0.02, -0.25]);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * PI * 2;
        mk(spinner, Cz(0.0085, 0.42, 10), 'steel', [Math.cos(a) * 0.028, Math.sin(a) * 0.028, -0.05]);
        bore(spinner, 0.0055, Math.cos(a) * 0.028, Math.sin(a) * 0.028, -0.2465);
      }
      [-0.2, -0.05, 0.12].forEach(z => mk(spinner, Cz(0.046, 0.014, 24), 'bright', [0, 0, z]));
      mk(spinner, G.lathe([[-0.215, 0.036], [-0.215, 0.048], [-0.245, 0.048], [-0.245, 0.036]], 24), 'steel');
      mk(g, G.tube([[0, 0.07, 0.085], [0, 0.125, 0.075], [0, 0.135, 0.02], [0, 0.125, -0.04], [0, 0.07, -0.05]], 0.008, 20, 8), 'polymer');
      mk(g, G.tube([[-0.05, 0.02, 0.0], [-0.11, 0.0, 0.03], [-0.16, -0.1, 0.07], [-0.18, -0.3, 0.1]], 0.02, 16, 10), 'polymer');
      mk(g, G.merge([0, 1, 2, 3].map(i => G.place(ring(0.022, 0.003, 14).rotateY(PI / 2).rotateZ(-0.3 - i * 0.25), [-0.08 - i * 0.03, 0.01 - i * 0.04, 0.02 + i * 0.015]))), 'steel');
      triggerGuard(g, 0.01, 'steel', -0.03);
      const grip = { y: -0.065, z: 0.07, a: -0.25 };
      pistolGrip(g, grip, 'grip');
      return { muzzle: [0.02, -0.46], grip, fore: { y: -0.03, z: -0.14 }, hip: [0.16, -0.2, -0.5], spinner, eject: [0.052, 0.0, 0.0], casing: 1.1, ejectEvery: 2 };
    },

    // ---------- sketches/20261004_135325.jpg, sketches/candysniper.jpg ----------
    scoperevolver(g) { // "Kikarrevolver": the revolver with a scope on two round mounts and saw teeth under the barrel
      const info = builders.revolver(g);
      mk(g, G.lathe([[0.0, 0], [0.0, 0.018], [-0.012, 0.019], [-0.03, 0.014], [-0.13, 0.014], [-0.15, 0.021], [-0.172, 0.021], [-0.172, 0]], 24), 'anod', [0, 0.095, 0]);
      lens(g, 0.018, 0, 0.095, -0.1722);
      lens(g, 0.016, 0, 0.095, 0.0002, true);
      mk(g, Cy(0.008, 0.014, 16), 'anod', [0, 0.115, -0.075]);
      [-0.035, -0.125].forEach(z => {
        mk(g, ring(0.0155, 0.0035).scale(1, 1, 2.5), 'bright', [0, 0.095, z]);
        mk(g, B(0.012, 0.034, 0.016, 0.003), 'bright', [0, 0.064, z]);
      });
      mk(g, many(new THREE.ConeGeometry(0.0065, 0.014, 4).rotateX(PI), Array.from({ length: 6 }, (_, i) => [[0, 0.006, -0.09 - i * 0.022]])), 'bright');
      return info;
    },

    candysniper(g) { // "Candy sniper": candy-cane barrel and hook stock, ring sight, star at the muzzle
      const cane = len => new THREE.MeshStandardMaterial({ map: stripes(len), roughness: 0.28, metalness: 0, envMap: M.wood.envMap, envMapIntensity: 0.5 });
      const tube = (pts, r, len) => { const t = G.tube(pts, r, 48, 14); t.userData.uv = true; return mk(g, t, cane(len)); };
      // the barrel dips and rises to the muzzle (as drawn)
      const Q = t => [0, (1 - t) ** 2 * 0.02 + 2 * t * (1 - t) * -0.03 + t * t * 0.035, (1 - t) ** 2 * -0.1 + 2 * t * (1 - t) * -0.4 + t * t * -0.68];
      tube(Array.from({ length: 9 }, (_, i) => Q(i / 8)), 0.015, 0.6);
      // the stock: a candy-cane hook curling back and down
      tube([[0, 0.02, 0.06], [0, 0.021, 0.2]].concat(Array.from({ length: 8 }, (_, i) => {
        const a = PI / 2 - (i + 1) / 8 * PI * 0.85; return [0, -0.025 + Math.sin(a) * 0.045, 0.2 + Math.cos(a) * 0.045];
      })), 0.017, 0.3);
      mk(g, G.side([[0.1, 0.05, 0.01], [0.1, -0.008, 0.006], [-0.13, -0.008, 0.006], [-0.13, 0.05, 0.01]], 0.048, 0.005), 'candy');
      mk(g, Cz(0.017, 0.03), 'candyWhite', [0, 0.02, -0.14]);
      // the top rail with its block at the back, two posts and the ring sight
      mk(g, B(0.03, 0.014, 0.3, 0.004), 'candyWhite', [0, 0.078, -0.1]);
      mk(g, B(0.03, 0.04, 0.03, 0.005), 'candyWhite', [0, 0.058, 0.04]);
      [-0.03, -0.17].forEach(z => mk(g, Cy(0.0045, 0.03, 10), 'bright', [0, 0.062, z]));
      mk(g, ring(0.03, 0.0065, 32), 'candy', [0, 0.118, -0.08]);
      mk(g, ring(0.03, 0.0015, 32), 'bright', [0, 0.118, -0.08]);
      mk(g, B(0.008, 0.012, 0.008, 0.002), 'candy', [0, 0.087, -0.08]);
      // a lemon star around the muzzle
      const star = new THREE.Shape(Array.from({ length: 10 }, (_, i) => { const a = i / 10 * PI * 2, r = i % 2 ? 0.009 : 0.022; return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r); }));
      mk(g, new THREE.ExtrudeGeometry(star, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 }), 'lemon', [0, 0.035, -0.69]);
      bore(g, 0.006, 0, 0.035, -0.6925);
      // a bolt with a candy-ball knob
      const bolt = group(g, [0, 0.03, 0.06]);
      mk(bolt, Cz(0.011, 0.05), 'bright', [0, 0, 0.03]);
      mk(bolt, Cx(0.004, 0.04), 'bright', [0.02, 0, 0], [0, 0, -0.1]);
      mk(bolt, new THREE.SphereGeometry(0.011, 14, 10), 'candy', [0.043, -0.004, 0]);
      triggerGuard(g, 0.005, 'candyWhite', -0.008);
      const grip = { y: -0.035, z: 0.07, a: -0.3 };
      pistolGrip(g, grip, 'candy');
      return { muzzle: [0.035, -0.71], grip, fore: { y: -0.028, z: -0.28 }, hip: [0.17, -0.18, -0.55], bolt, eject: [0.02, 0.04, 0.0], casing: 1.3 };
    },
  };

  // Candy-cane stripes running round a tube (u along it, v around): diagonal bands make a spiral.
  // len: tube length in metres, so every gun gets stripes about 2.5 cm apart.
  function stripes(len) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#f6f0ea'; x.fillRect(0, 0, 256, 64);
    x.fillStyle = '#d61f4f';
    for (let i = -1; i < 9; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 14, 0); x.lineTo(i * 32 + 14 + 64, 64); x.lineTo(i * 32 + 64, 64); x.fill(); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(len / 0.2, 1);
    return t;
  }

  // Gustav's eye, painted on a decal
  function eyeDecal() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 80;
    const x = c.getContext('2d');
    x.lineWidth = 5; x.strokeStyle = '#1a1a1a'; x.fillStyle = '#f2ede0';
    x.beginPath(); x.moveTo(8, 40); x.quadraticCurveTo(64, -8, 120, 40); x.quadraticCurveTo(64, 88, 8, 40); x.fill(); x.stroke();
    x.fillStyle = '#2b6fae'; x.beginPath(); x.arc(68, 40, 18, 0, PI * 2); x.fill();
    x.fillStyle = '#111'; x.beginPath(); x.arc(70, 40, 9, 0, PI * 2); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(63, 34, 4, 0, PI * 2); x.fill();
    return new THREE.CanvasTexture(c);
  }

  // ---------- gloved hands ----------
  const finger = (pts, r) => G.merge([G.tube(pts, r, 10, 7), G.place(new THREE.SphereGeometry(r, 8, 6), pts[pts.length - 1])]);
  const UP = new THREE.Vector3(0, 1, 0);
  function arm(parent, from, dir, len, r, mat) {
    const d = new THREE.Vector3(...dir).normalize();
    const m = mk(parent, new THREE.CylinderGeometry(r, r * 1.08, len, 14), mat);
    m.quaternion.setFromUnitVectors(UP, d);
    m.position.set(from[0], from[1], from[2]).addScaledVector(d, len / 2);
    return m;
  }

  // Right hand wraps the grip: palm on the right, fingers round the front, thumb over the top
  function rightHand(g, grip) {
    const f = group(g, [0, grip.y, grip.z], [grip.a, 0, 0]);
    const parts = [
      G.place(G.roundBox(0.024, 0.085, 0.072, 0.01, 2), [0.026, 0, 0.006]),
      G.place(G.roundBox(0.05, 0.075, 0.022, 0.009, 2), [0.01, 0.002, 0.034]),
      finger([[0.028, 0.03, -0.006], [0.023, 0.03, -0.03], [0.013, 0.026, -0.05], [0.003, 0.018, -0.056]], 0.0085),
      finger([[0.022, 0.03, 0.022], [0.008, 0.046, 0.02], [-0.014, 0.046, 0.004], [-0.021, 0.04, -0.02]], 0.0095),
    ];
    [0.01, -0.01, -0.029].forEach((y, i) => parts.push(finger([[0.03, y, -0.004], [0.026, y, -0.026], [0.008, y - 0.002, -0.036], [-0.012, y - 0.003, -0.032], [-0.02, y - 0.003, -0.016]], i === 2 ? 0.0075 : 0.0085)));
    mk(f, G.merge(parts), 'glove');
    mk(f, G.roundBox(0.036, 0.05, 0.008, 0.003, 2), 'pad', [0.014, 0.004, 0.046]);
    const wrist = [0.02, grip.y - 0.03, grip.z + 0.045];
    arm(g, wrist, [0.25, -0.55, 1], 0.08, 0.025, 'glove');
    arm(g, [wrist[0] + 0.017, wrist[1] - 0.038, wrist[2] + 0.068], [0.25, -0.55, 1], 0.5, 0.036, 'sleeve');
  }

  // Left hand supports the front: palm under the gun, fingers up the right side, thumb on the left
  function leftHand(g, fore) {
    const { y, z } = fore;
    const parts = [G.place(G.roundBox(0.06, 0.024, 0.085, 0.01, 2), [0, y, z])];
    for (let i = 0; i < 4; i++) {
      const dz = -0.03 + i * 0.019;
      parts.push(finger([[0.018, y + 0.002, z + dz], [0.034, y + 0.01, z + dz], [0.036, y + 0.03, z + dz - 0.003], [0.03, y + 0.045, z + dz - 0.005]], i === 3 ? 0.0072 : 0.008));
    }
    parts.push(finger([[-0.02, y + 0.004, z + 0.025], [-0.035, y + 0.016, z + 0.01], [-0.035, y + 0.035, z - 0.012], [-0.03, y + 0.045, z - 0.03]], 0.009));
    mk(g, G.merge(parts), 'glove');
    const wrist = [-0.012, y - 0.012, z + 0.04];
    arm(g, wrist, [-0.35, -0.45, 1], 0.07, 0.025, 'glove');
    arm(g, [wrist[0] - 0.02, wrist[1] - 0.026, wrist[2] + 0.058], [-0.35, -0.45, 1], 0.6, 0.036, 'sleeve');
  }

  // Build every gun; returns [{ g, info }] in GS.weapons order
  function build(env) {
    M = M || materials(env);
    return GS.weapons.map(w => {
      const g = new THREE.Group();
      const info = builders[w.id](g);
      rightHand(g, info.grip);
      if (info.fore) leftHand(info.mag && info.mag.hand ? info.mag.o : g, info.fore);
      info.mag && (info.mag.base = info.mag.o.position.clone());
      return { g, info };
    });
  }

  // A brass casing (scaled per gun)
  const casingGeo = () => G.lathe([[0.01, 0], [0.01, 0.0055], [0.0085, 0.005], [-0.008, 0.005], [-0.011, 0.0035], [-0.012, 0]], 10);

  return { build, materials: () => M, casingGeo };
})();
