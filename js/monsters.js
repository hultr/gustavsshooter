// Gustav's monsters (sketches/monsters.png), built in 3D from simple low-poly parts.
// Monsters with the same number on the sketch are one family: they share a colour
// and a way of moving.
//   1  blade stalkers – Fob, Bob, Olt (a hand on one arm, a blade on the other)
//   2  root things    – Frot (walking tree), Tangle (bundle of stalks), Dhi (flies)
//   3  small crawlers – Bek (worm), Durk (on wheels), Dir (hopping head)
//   5  the leaper     – long grasshopper legs, jumps at you
//   7  runners        – Runner (spiky hair, long arms), Bok (hairy with a big claw)
window.GS = window.GS || {};

GS.Monsters = (function () {
  const EDGE = new THREE.LineBasicMaterial({ color: 0x262626 });
  const FLASH = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cache = {};
  const once = (key, make) => cache[key] || (cache[key] = make());
  const lambert = c => once('m' + c, () => new THREE.MeshLambertMaterial({ color: c }));
  const basic = c => once('b' + c, () => new THREE.MeshBasicMaterial({ color: c }));

  // Limbs hang down from their origin and trunks grow up from it,
  // so a joint placed at a hip or shoulder swings the whole piece.
  const limb = (rt, rb, h, s = 6) => once(`l${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s).translate(0, -h / 2, 0));
  const trunk = (rt, rb, h, s = 7) => once(`t${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s).translate(0, h / 2, 0));
  const ball = (r, d = 1) => once(`s${r},${d}`, () => new THREE.IcosahedronGeometry(r, d));
  const box = (w, h, d) => once(`x${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
  const spike = (r, h, s = 4) => once(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s).translate(0, h / 2, 0));
  const wheel = r => once('w' + r, () => new THREE.CylinderGeometry(r, r, 0.12, 8).rotateZ(Math.PI / 2));
  const smile = r => once('smile' + r, () => new THREE.TorusGeometry(r, 0.04, 4, 8, Math.PI).rotateZ(Math.PI));
  const edges = g => once('e' + g.uuid, () => new THREE.EdgesGeometry(g, 25));

  const C = {
    bone: 0xe6dfcc, blade: 0x3a3a40, dark: 0x3b302a, mouth: 0x2a1212, eye: 0xfff06a,
    bark: 0x94805f, moss: 0x9fae80, slime: 0xc4d68f, pink: 0xe6bca8, grey: 0xb4a9c8, rust: 0xcf9f72,
  };
  const PI = Math.PI;

  // ---------- Rig: the parts of one monster ----------
  function rig() {
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    return { root, body, meshes: [], swing: [], arms: [], spin: [] };
  }
  // o: p position, r rotation, s scale, glow (unlit, no outline), head (headshot zone)
  function part(R, parent, geo, color, o = {}) {
    const m = new THREE.Mesh(geo, o.glow ? basic(color) : lambert(color));
    if (o.p) m.position.fromArray(o.p);
    if (o.r) m.rotation.fromArray(o.r);
    if (o.s) m.scale.fromArray(o.s);
    if (!o.glow) m.add(new THREE.LineSegments(edges(geo), EDGE));
    m.userData.head = !!o.head;
    parent.add(m);
    R.meshes.push(m);
    return m;
  }
  function joint(parent, p, r) {
    const j = new THREE.Group();
    j.position.fromArray(p);
    if (r) j.rotation.fromArray(r);
    parent.add(j);
    return j;
  }
  // swings while walking
  const swing = (R, o, amp, ph = 0, axis = 'x') => R.swing.push({ o, axis, amp, ph, base: o.rotation[axis] });
  // strikes when attacking (and swings a little while walking)
  const arm = (R, o, ph = 0, reach = 1) => R.arms.push({ o, ph, reach, base: o.rotation.x });
  function eyes(R, parent, y, z, dx, r = 0.05) {
    part(R, parent, ball(r, 0), C.eye, { p: [-dx, y, z], glow: true, head: true });
    part(R, parent, ball(r, 0), C.eye, { p: [dx, y, z], glow: true, head: true });
  }
  function claws(R, parent, n, len, color, spread = 0.35) {
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * spread;
      part(R, parent, spike(0.03, len), color, { r: [PI - 0.3, 0, a] });
    }
  }

  // ---------- Family 1: blade stalkers ----------
  function stalker(o) {
    return function () {
      const R = rig(), b = R.body, col = C.bone;
      const hip = o.legLen;
      for (let i = 0; i < o.legs; i++) {
        const a = i / o.legs * PI * 2;
        const j = joint(b, [Math.cos(a) * o.hipR, hip, Math.sin(a) * o.hipR * 0.8], [0, 0, Math.cos(a) * 0.12]);
        part(R, j, limb(o.legR, o.legR * 0.6, o.legLen + 0.05), col);
        swing(R, j, 0.4, (i % 2) * PI + i * 0.3);
      }
      part(R, b, trunk(o.chest, o.waist, o.torso), col, { p: [0, hip - 0.05, 0] });
      for (let k = 0; k < 3; k++) {
        part(R, b, box(o.chest * 1.2, 0.03, 0.03), C.dark, { p: [0, hip + o.torso * (0.45 + k * 0.15), (o.chest + o.waist) * 0.47] });
      }
      const sh = hip + o.torso;
      part(R, b, trunk(0.08, 0.1, 0.25), col, { p: [0, sh - 0.05, 0] });
      const head = joint(b, [0, sh + 0.2, 0]);
      if (o.head === 'long') {          // Fob: long head, gaping mouth
        part(R, head, ball(0.28), col, { p: [0, 0.4, 0], s: [0.9, 1.5, 0.9], head: true });
        part(R, head, box(0.16, 0.34, 0.06), C.mouth, { p: [0, 0.3, 0.24], glow: true, head: true });
        eyes(R, head, 0.6, 0.2, 0.09);
      } else if (o.head === 'egg') {    // Bob: bald egg head
        part(R, head, ball(0.24), col, { p: [0, 0.32, 0], s: [0.85, 1.3, 1], head: true });
        eyes(R, head, 0.36, 0.2, 0.08);
      } else {                          // Olt: spiky head
        part(R, head, ball(0.26), col, { p: [0, 0.28, 0], head: true });
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * PI * 2;
          part(R, head, spike(0.07, 0.35), C.dark, { p: [0, 0.4, 0], r: [Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9], head: true });
        }
        eyes(R, head, 0.3, 0.22, 0.09);
      }
      // hand/claw arm
      const la = joint(b, [o.chest + 0.08, sh - 0.05, 0], [0, 0, 0.35]);
      part(R, la, limb(0.07, 0.055, o.arm), col);
      const lf = joint(la, [0, -o.arm, 0], [-0.5, 0, 0]);
      part(R, lf, limb(0.055, 0.045, o.arm * 0.8), col);
      const hand = joint(lf, [0, -o.arm * 0.8, 0]);
      if (o.hand === 'hand') {
        part(R, hand, ball(0.1, 0), col, { s: [1, 1.2, 0.5] });
        claws(R, hand, 5, 0.22, col, 0.28);
      } else {
        claws(R, hand, 3, 0.3, C.dark, 0.4);
      }
      arm(R, la, 0);
      // blade arm
      const ra = joint(b, [-o.chest - 0.08, sh - 0.05, 0], [0, 0, -0.35]);
      part(R, ra, limb(0.07, 0.055, o.arm), col);
      const rf = joint(ra, [0, -o.arm, 0], [-0.7, 0, 0]);
      part(R, rf, limb(0.055, 0.05, o.arm * 0.5), col);
      part(R, rf, spike(0.16, o.blade), C.blade, { p: [0, -o.arm * 0.45, 0], r: [PI, 0, 0], s: [1, 1, 0.25] });
      arm(R, ra, PI, 1.1);
      return R;
    };
  }

  // ---------- Family 2: root things ----------
  function frot() {
    const R = rig(), b = R.body;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * PI * 2;
      const j = joint(b, [Math.cos(a) * 0.35, 1.3, Math.sin(a) * 0.35], [0, -a, 0]);
      const k = joint(j, [0, 0, 0], [0, 0, 0.7]);
      part(R, k, limb(0.13, 0.09, 0.9), C.bark);
      const knee = joint(k, [0, -0.9, 0], [0, 0, -0.9]);
      part(R, knee, limb(0.09, 0.04, 0.85), C.bark);
      swing(R, k, 0.3, i * 1.1, 'z');
    }
    part(R, b, trunk(0.3, 0.5, 2.6), C.bark, { p: [0, 1.2, 0] });
    [1.8, 2.5, 3.2].forEach(y => part(R, b, box(0.28, 0.07, 0.1), C.dark, { p: [0, y, 0.5 - (y - 1.2) * 0.08] }));
    const head = joint(b, [0, 3.85, 0]);
    part(R, head, ball(0.34, 0), C.dark, { head: true });
    eyes(R, head, 0.05, 0.3, 0.12, 0.07);
    for (let i = 0; i < 7; i++) {
      const h = joint(head, [0, 0.15, 0], [0, i / 7 * PI * 2, 0.9 + (i % 2) * 0.4]);
      part(R, h, spike(0.04, 0.9), C.dark);
      swing(R, h, 0.35, i, 'z');
    }
    return R;
  }

  function tangle() {
    const R = rig(), b = R.body;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * PI * 2 + 0.4;
      const j = joint(b, [0, 1.55, 0], [0, a, 0.35]);
      part(R, j, limb(0.06, 0.03, 1.65), C.dark);
      swing(R, j, 0.45, (i % 2) * PI);
    }
    part(R, b, ball(0.3, 0), C.dark, { p: [0, 1.6, 0] });
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * PI * 2;
      part(R, b, trunk(0.04, 0.07, 0.8 + (i % 3) * 0.2), C.bark, { p: [Math.cos(a) * 0.12, 1.7, Math.sin(a) * 0.12], r: [Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2] });
    }
    const head = joint(b, [0, 2.55, 0.05]);
    part(R, head, ball(0.2), C.bark, { head: true });
    eyes(R, head, 0.04, 0.17, 0.07);
    for (const s of [-1, 1]) {
      const w = joint(b, [s * 0.2, 2.2, 0.1], [0, 0, s * 0.5]);
      part(R, w, limb(0.05, 0.02, 1.4), C.dark);
      arm(R, w, s > 0 ? 0 : PI, 1.2);
    }
    return R;
  }

  function dhi() {
    const R = rig(), b = R.body;
    part(R, b, ball(0.35), C.moss, { s: [0.8, 0.7, 2.2] });
    [-0.35, 0, 0.35].forEach(z => part(R, b, box(0.58, 0.5, 0.05), C.dark, { p: [0, 0, z], s: z ? [0.88, 0.88, 1] : [0.97, 0.97, 1] }));
    const head = joint(b, [0, 0.05, 0.8]);
    part(R, head, ball(0.24), C.bone, { head: true });
    part(R, head, box(0.2, 0.06, 0.05), C.mouth, { p: [0, -0.08, 0.22], glow: true, head: true });
    eyes(R, head, 0.08, 0.2, 0.08);
    part(R, b, spike(0.12, 0.7), C.moss, { p: [0, 0, -0.7], r: [-PI / 2, 0, 0] });
    for (const s of [-1, 1]) {
      const w = joint(b, [s * 0.2, 0.15, 0.05]);
      part(R, w, box(1.2, 0.03, 0.55), C.moss, { p: [s * 0.6, 0, 0] });
      swing(R, w, s * 0.7, 0, 'z');
    }
    return R;
  }

  // ---------- Family 3: small crawlers ----------
  function bek() {
    const R = rig(), b = R.body;
    const tail = joint(b, [0, 0, 0]);
    part(R, tail, ball(0.3), C.slime, { p: [0, 0.26, 0] });
    part(R, tail, ball(0.24), C.slime, { p: [0, 0.22, -0.45] });
    part(R, tail, ball(0.17), C.slime, { p: [0, 0.25, -0.8] });
    part(R, tail, spike(0.1, 0.45), C.slime, { p: [0, 0.3, -0.95], r: [-0.6, 0, 0] });
    swing(R, tail, 0.35, 0, 'y');
    part(R, b, trunk(0.14, 0.22, 0.65), C.slime, { p: [0, 0.3, 0.2], r: [0.4, 0, 0] });
    const head = joint(b, [0, 0.95, 0.47]);
    part(R, head, ball(0.2), C.slime, { s: [1, 1.3, 1], head: true });
    part(R, head, ball(0.08, 0), C.eye, { p: [0, 0.08, 0.17], glow: true, head: true });
    const a = joint(b, [0.2, 0.7, 0.4], [0, 0, 0.5]);
    part(R, a, limb(0.04, 0.03, 0.4), C.slime);
    claws(R, joint(a, [0, -0.4, 0]), 3, 0.18, C.dark);
    arm(R, a, 0);
    return R;
  }

  function durk() {
    const R = rig(), b = R.body;
    for (const s of [-1, 1]) R.spin.push(part(R, b, wheel(0.25), C.dark, { p: [s * 0.42, 0.25, 0] }));
    part(R, b, trunk(0.3, 0.42, 0.8), C.pink, { p: [0, 0.2, 0] });
    [0.45, 0.65].forEach(y => part(R, b, box(0.5, 0.03, 0.03), C.dark, { p: [0, y, 0.39 - (y - 0.2) * 0.1] }));
    const head = joint(b, [0, 1.3, 0]);
    part(R, head, ball(0.4), C.pink, { head: true });
    part(R, head, smile(0.2), C.mouth, { p: [0, -0.05, 0.37], glow: true, head: true });
    eyes(R, head, 0.14, 0.34, 0.13, 0.06);
    const a = joint(b, [0.35, 0.85, 0.1], [0, 0, 0.5]);
    part(R, a, limb(0.05, 0.04, 0.5), C.pink);
    claws(R, joint(a, [0, -0.5, 0]), 4, 0.14, C.pink);
    arm(R, a, 0);
    return R;
  }

  function dir() {
    const R = rig(), b = R.body;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * PI * 2 + PI / 4;
      const j = joint(b, [Math.cos(a) * 0.15, 0.25, Math.sin(a) * 0.15], [0, -a, 0.4]);
      part(R, j, limb(0.03, 0.02, 0.27), C.dark);
      swing(R, j, 0.5, i * PI / 2, 'z');
    }
    const head = joint(b, [0, 0.45, 0]);
    part(R, head, ball(0.28), C.pink, { head: true });
    for (let i = 0; i < 4; i++) part(R, head, spike(0.05, 0.3), C.dark, { p: [0, 0.2, -0.05], r: [-0.3, 0, (i - 1.5) * 0.4], head: true });
    part(R, head, box(0.18, 0.05, 0.05), C.mouth, { p: [0, -0.08, 0.26], glow: true, head: true });
    eyes(R, head, 0.07, 0.24, 0.09);
    return R;
  }

  // ---------- Family 5: the leaper ----------
  function leaper() {
    const R = rig(), b = R.body;
    for (const s of [-1, 1]) {
      const t = joint(b, [s * 0.32, 1.5, -0.2], [2.4, 0, 0]);
      part(R, t, limb(0.08, 0.06, 0.9), C.grey);
      const k = joint(t, [0, -0.9, 0], [-2.6, 0, 0]);
      part(R, k, limb(0.06, 0.03, 2.2), C.grey);
      swing(R, t, 0.25, s > 0 ? 0 : PI);
    }
    part(R, b, ball(0.35), C.grey, { p: [0, 1.6, 0.05], r: [0.4, 0, 0], s: [0.9, 0.8, 1.5] });
    const head = joint(b, [0, 1.95, 0.55]);
    part(R, head, ball(0.22), C.grey, { head: true });
    for (let i = 0; i < 5; i++) part(R, head, spike(0.05, 0.3), C.dark, { p: [0, 0.1, -0.05], r: [-0.6, 0, (i - 2) * 0.4], head: true });
    eyes(R, head, 0.02, 0.19, 0.08);
    for (const s of [-1, 1]) {
      const a = joint(b, [s * 0.28, 1.7, 0.45], [-0.3, 0, s * 0.2]);
      part(R, a, limb(0.05, 0.04, 1.2), C.grey);
      claws(R, joint(a, [0, -1.2, 0]), 3, 0.2, C.dark);
      arm(R, a, s > 0 ? 0 : PI);
    }
    return R;
  }

  // ---------- Family 7: runners ----------
  function runner() {
    const R = rig(), b = R.body;
    for (const s of [-1, 1]) {
      const t = joint(b, [s * 0.14, 1.0, 0]);
      part(R, t, limb(0.08, 0.06, 0.5), C.rust);
      const k = joint(t, [0, -0.5, 0], [0.3, 0, 0]);
      part(R, k, limb(0.06, 0.04, 0.52), C.rust);
      swing(R, t, 0.8, s > 0 ? 0 : PI);
    }
    const chest = joint(b, [0, 0.95, 0], [0.35, 0, 0]);
    part(R, chest, trunk(0.22, 0.16, 0.7), C.rust);
    const head = joint(chest, [0, 0.9, 0]);
    part(R, head, ball(0.18), C.rust, { head: true });
    for (let i = 0; i < 6; i++) part(R, head, spike(0.05, 0.32), C.dark, { p: [0, 0.08, -0.04], r: [-0.4 - (i % 2) * 0.4, 0, (i - 2.5) * 0.35], head: true });
    eyes(R, head, 0.03, 0.15, 0.07);
    for (const s of [-1, 1]) {
      const a = joint(chest, [s * 0.26, 0.65, 0], [-0.2, 0, s * 0.25]);
      part(R, a, limb(0.05, 0.04, 0.95), C.rust);
      claws(R, joint(a, [0, -0.95, 0]), 3, 0.15, C.dark);
      arm(R, a, s > 0 ? PI : 0);
    }
    return R;
  }

  function bok() {
    const R = rig(), b = R.body;
    for (const s of [-1, 1]) {
      const l = joint(b, [s * 0.2, 0.42, 0]);
      part(R, l, limb(0.08, 0.05, 0.42), C.rust);
      swing(R, l, 0.7, s > 0 ? 0 : PI);
    }
    part(R, b, ball(0.42), C.rust, { p: [0, 0.78, 0], s: [1, 1.1, 0.9], head: true });
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * PI * 2;
      part(R, b, spike(0.07, 0.3), C.dark, { p: [Math.sin(a) * 0.3, 0.95, Math.cos(a) * 0.25 - 0.05], r: [Math.cos(a) * 0.9 - 0.2, 0, -Math.sin(a) * 0.9] });
    }
    eyes(R, b, 0.9, 0.36, 0.12, 0.06);
    const big = joint(b, [0.42, 0.85, 0.1], [0, 0, 0.4]);
    part(R, big, limb(0.07, 0.06, 0.55), C.rust);
    claws(R, joint(big, [0, -0.55, 0]), 3, 0.35, C.dark, 0.45);
    arm(R, big, 0, 1.2);
    const small = joint(b, [-0.4, 0.8, 0.1], [0, 0, -0.4]);
    part(R, small, limb(0.04, 0.03, 0.35), C.rust);
    arm(R, small, PI, 0.6);
    return R;
  }

  // ---------- Species table ----------
  // speed m/s and attack rate are multiplied by the difficulty, which grows over time.
  // from: seconds into the fight before it starts showing up.
  const SPECIES = [
    { id: 'bek', name: 'Bek', family: 3, build: bek, hp: 45, speed: 2.6, dmg: 1, r: 0.45, h: 1.1, move: 'walk', from: 0, weight: 3, score: 10 },
    { id: 'bob', name: 'Bob', family: 1, build: stalker({ legs: 5, legLen: 1.45, legR: 0.05, hipR: 0.2, torso: 0.9, chest: 0.25, waist: 0.3, head: 'egg', hand: 'claw', arm: 0.7, blade: 1.1 }),
      hp: 90, speed: 3.0, dmg: 2, r: 0.6, h: 3.0, move: 'walk', from: 0, weight: 3, score: 20 },
    { id: 'dir', name: 'Dir', family: 3, build: dir, hp: 25, speed: 3.6, dmg: 1, r: 0.3, h: 0.8, move: 'hop', jump: 4, from: 15, weight: 2, score: 10 },
    { id: 'durk', name: 'Durk', family: 3, build: durk, hp: 60, speed: 3.0, dmg: 1, r: 0.5, h: 1.7, move: 'walk', from: 25, weight: 2, score: 15 },
    { id: 'fob', name: 'Fob', family: 1, build: stalker({ legs: 6, legLen: 1.5, legR: 0.09, hipR: 0.3, torso: 1.0, chest: 0.3, waist: 0.42, head: 'long', hand: 'hand', arm: 0.75, blade: 1.3 }),
      hp: 110, speed: 2.6, dmg: 2, r: 0.7, h: 3.4, move: 'walk', from: 35, weight: 2, score: 25 },
    { id: 'runner', name: 'Runner', family: 7, build: runner, hp: 50, speed: 4.6, dmg: 1, r: 0.5, h: 2.0, move: 'walk', stride: 0.5, from: 45, weight: 2, score: 20 },
    { id: 'olt', name: 'Olt', family: 1, build: stalker({ legs: 4, legLen: 1.3, legR: 0.11, hipR: 0.25, torso: 0.9, chest: 0.3, waist: 0.35, head: 'spiky', hand: 'claw', arm: 0.7, blade: 1.5 }),
      hp: 120, speed: 2.8, dmg: 2, r: 0.7, h: 3.0, move: 'walk', from: 60, weight: 2, score: 25 },
    { id: 'bok', name: 'Bok', family: 7, build: bok, hp: 45, speed: 4.0, dmg: 1, r: 0.45, h: 1.3, move: 'walk', stride: 0.35, from: 60, weight: 2, score: 15 },
    { id: 'tangle', name: 'Tangle', family: 2, build: tangle, hp: 80, speed: 3.2, dmg: 2, r: 0.6, h: 2.8, move: 'walk', from: 75, weight: 2, score: 20 },
    { id: 'leaper', name: 'Leaper', family: 5, build: leaper, hp: 70, speed: 6, dmg: 2, r: 0.6, h: 2.3, move: 'hop', jump: 6, from: 90, weight: 2, score: 25 },
    { id: 'dhi', name: 'Dhi', family: 2, build: dhi, hp: 35, speed: 3.8, dmg: 1, r: 0.6, h: 0.8, move: 'fly', from: 105, weight: 2, score: 20 },
    { id: 'frot', name: 'Frot', family: 2, build: frot, hp: 300, speed: 1.8, dmg: 3, r: 1.0, h: 4.4, move: 'walk', lean: 0.6, from: 120, weight: 1, score: 60 },
  ];

  // Difficulty over time: slow at first, then faster and faster.
  const speedMul = t => Math.min(2.4, 0.5 + t / 120);
  const spawnEvery = t => Math.max(0.7, 4 - t / 45);
  const maxAlive = t => Math.min(28, 5 + Math.floor(t / 8));

  // ---------- Path finding: distance field on a 1 m grid, flooded from the player ----------
  // Steps cost 10 straight and 14 diagonal, so paths are straight lines instead of hugging walls.
  function makeNav(map) {
    const b = map.bounds, W = Math.ceil(b.maxX - b.minX), H = Math.ceil(b.maxZ - b.minZ), INF = 65535, N = W * H;
    const solid = new Uint8Array(N), dist = new Uint16Array(N), queue = new Int32Array(N), queued = new Uint8Array(N);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = b.minX + i + 0.5, z = b.minZ + j + 0.5;
      for (const c of map.colliders) {
        if (c.top > 0.5 && x > c.minX - 0.5 && x < c.maxX + 0.5 && z > c.minZ - 0.5 && z < c.maxZ + 0.5) { solid[j * W + i] = 1; break; }
      }
    }
    function cell(x, z) {
      const i = Math.floor(x - b.minX), j = Math.floor(z - b.minZ);
      return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i;
    }
    // may step diagonally only when both side cells are open (no corner cutting)
    function open(c, di, dj) {
      const i = c % W + di, j = (c / W | 0) + dj;
      if (i < 0 || j < 0 || i >= W || j >= H) return -1;
      const n = j * W + i;
      if (solid[n] || (di && dj && (solid[c + di] || solid[c + dj * W]))) return -1;
      return n;
    }
    function build(px, pz) {
      dist.fill(INF);
      const start = cell(px, pz);
      if (start < 0) return;
      // queue-based relaxation (a cell is re-queued whenever a shorter way to it is found)
      let head = 0, size = 1;
      dist[start] = 0; queue[0] = start; queued[start] = 1;
      while (size > 0) {
        const c = queue[head]; head = (head + 1) % N; size--; queued[c] = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const n = open(c, di, dj), d = dist[c] + (di && dj ? 14 : 10);
          if (n >= 0 && dist[n] > d) {
            dist[n] = d;
            if (!queued[n]) { queued[n] = 1; queue[(head + size) % N] = n; size++; }
          }
        }
      }
    }
    // Nothing solid on the straight line between two points?
    function clear(x0, z0, x1, z1) {
      const len = Math.hypot(x1 - x0, z1 - z0), steps = Math.ceil(len / 0.5);
      for (let k = 1; k < steps; k++) {
        const c = cell(x0 + (x1 - x0) * k / steps, z0 + (z1 - z0) * k / steps);
        if (c < 0 || solid[c]) return false;
      }
      return true;
    }
    function downhill(c) {
      let best = -1, bd = dist[c];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const n = (di || dj) ? open(c, di, dj) : -1;
        if (n >= 0 && dist[n] < bd) { bd = dist[n]; best = n; }
      }
      return best;
    }
    // Direction towards the player, following the field two cells ahead to smooth corners
    function dirFrom(x, z, out) {
      const c = cell(x, z);
      if (c < 0 || dist[c] >= INF) return false;
      let n = downhill(c);
      if (n < 0) return false;
      const n2 = downhill(n);
      if (n2 >= 0) n = n2;
      out.set(b.minX + n % W + 0.5 - x, b.minZ + (n / W | 0) + 0.5 - z).normalize();
      return true;
    }
    return { build, dirFrom, clear };
  }

  // ---------- The horde ----------
  function create(map, hooks) {
    const scene = map.scene, list = [], meshes = [];
    const nav = makeNav(map), blood = GS.Blood(scene);
    const v2 = new THREE.Vector2(), tmp = new THREE.Vector3();
    let spawnT = 0, navT = 0;

    function spawn(elapsed) {
      const pool = SPECIES.filter(s => elapsed >= s.from);
      let r = Math.random() * pool.reduce((a, s) => a + s.weight, 0), sp = pool[0];
      for (const s of pool) if ((r -= s.weight) < 0) { sp = s; break; }
      const R = sp.build();
      const z = map.spawn.z + (Math.random() - 0.5) * map.spawn.d, x = map.spawn.x + (Math.random() - 0.5) * map.spawn.w;
      R.root.position.set(x, sp.move === 'fly' ? 3 : 0, z);
      scene.add(R.root);
      const m = {
        sp, R, hp: sp.hp, pos: R.root.position, vy: 0, yaw: 0, dir: new THREE.Vector2(0, 1),
        state: 'walk', at: 0, cd: 0, stun: 0, flash: 0, dead: -1, t: 0,
        walk: Math.random() * 6, gait: 0, moved: 0, hopT: 0.5, hopX: 0, hopZ: 0, los: false, losT: 0,
      };
      R.meshes.forEach(p => { p.userData.monster = m; meshes.push(p); });
      list.push(m);
      if (Math.random() < 0.4) GS.Audio.growl(sp.h);
    }

    function hitsWall(x, z, r, y) {
      for (const c of map.colliders) {
        if (c.top <= y + 0.5) continue;
        if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
      }
      return false;
    }
    function step(m, vx, vz) {
      const p = m.pos, r = Math.min(m.sp.r, 0.45), x0 = p.x, z0 = p.z;
      if (!hitsWall(p.x + vx, p.z, r, p.y)) p.x += vx;
      if (!hitsWall(p.x, p.z + vz, r, p.y)) p.z += vz;
      m.moved += Math.hypot(p.x - x0, p.z - z0);
    }
    function turnTo(m, yaw, dt) {
      let d = yaw - m.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      m.yaw += d * Math.min(1, dt * 8);
      m.R.root.rotation.y = m.yaw;
    }

    function think(m, dt, mul, target) {
      const sp = m.sp, p = m.pos, fly = sp.move === 'fly', hop = sp.move === 'hop';
      m.t += dt; m.cd -= dt; m.stun -= dt;
      const dx = target.x - p.x, dz = target.z - p.z, d = Math.hypot(dx, dz) || 0.001;
      const reach = sp.r + 0.9;
      const inReach = d < reach && (fly ? Math.abs(target.y + 1.3 - p.y) < 1.5 : target.y - p.y < sp.h + 0.3);
      const grounded = !hop || p.y <= 0;

      if (m.state === 'attack') {
        const before = m.at;
        m.at += dt * Math.sqrt(mul) / 0.9;
        if (before < 0.7 && m.at >= 0.7 && d < reach + 0.6) hooks.onPlayerHit(sp.dmg, m);
        if (m.at >= 1) { m.state = 'walk'; m.cd = 0.8 / mul; }
        turnTo(m, Math.atan2(dx, dz), dt);
        return;
      }
      if (inReach && grounded && m.cd <= 0) { m.state = 'attack'; m.at = 0; return; }

      // where to go
      let ux = dx / d, uz = dz / d;
      if (!fly && (m.losT -= dt) <= 0) { m.los = nav.clear(p.x, p.z, target.x, target.z); m.losT = 0.25; }
      if (!fly && !m.los && d > 2.5 && nav.dirFrom(p.x, p.z, v2)) { ux = v2.x; uz = v2.y; }
      const k = Math.min(1, dt * 6);
      m.dir.x += (ux - m.dir.x) * k; m.dir.y += (uz - m.dir.y) * k;
      m.dir.normalize();
      turnTo(m, d < 4 ? Math.atan2(dx, dz) : Math.atan2(m.dir.x, m.dir.y), dt);

      const s = sp.speed * mul * (m.stun > 0 ? 0 : 1);
      if (fly) {
        const alt = d > 6 ? 3.2 + Math.sin(m.t * 2) * 0.4 : target.y + 1.3;
        p.y += (alt - p.y) * Math.min(1, dt * 2);
        if (d > reach * 0.7) { p.x += ux * s * dt; p.z += uz * s * dt; m.moved += s * dt; }
      } else if (hop) {
        if (p.y <= 0) {
          m.hopT -= dt;
          if (m.hopT <= 0 && d > reach * 0.7 && m.stun <= 0) {
            m.vy = sp.jump * Math.min(1.3, 0.8 + mul * 0.25);
            m.hopX = m.dir.x * s; m.hopZ = m.dir.y * s;
          }
        }
        if (m.vy > 0 || p.y > 0) {
          step(m, m.hopX * dt, m.hopZ * dt);
          m.vy -= 18 * dt;
          p.y += m.vy * dt;
          if (p.y <= 0) { p.y = 0; m.vy = 0; m.hopT = 0.45 / mul; }
        }
      } else if (d > reach * 0.7) {
        step(m, m.dir.x * s * dt, m.dir.y * s * dt);
      }
    }

    function animate(m, dt) {
      const R = m.R, sp = m.sp;
      if (sp.move === 'fly') { m.walk += dt * 14; m.gait = 1; }
      else {
        m.walk += m.moved / (sp.stride || sp.h * 0.3);
        m.gait += ((m.moved > 0.001 ? 1 : 0) - m.gait) * Math.min(1, dt * 8);
      }
      for (const s of R.spin) s.rotation.x += m.moved / 0.25;
      m.moved = 0;
      for (const s of R.swing) s.o.rotation[s.axis] = s.base + Math.sin(m.walk + s.ph) * s.amp * m.gait;

      let lift = 0, lean = 0;
      if (m.state === 'attack') {
        const a = m.at;
        lift = a < 0.7 ? 2.6 * a / 0.7 : 2.6 - 3.0 * (a - 0.7) / 0.3;
        lean = (a < 0.7 ? -0.1 * a / 0.7 : 0.3) * (sp.lean || 1);
      }
      for (const a of R.arms) {
        a.o.rotation.x = a.base + (m.state === 'attack' ? -lift * a.reach : Math.sin(m.walk + a.ph) * 0.35 * m.gait);
      }
      R.body.rotation.x = lean;
      R.body.position.y = sp.move === 'walk' ? Math.abs(Math.sin(m.walk)) * 0.03 * sp.h * m.gait : 0;

      if (m.flash > 0 && (m.flash -= dt) <= 0) unflash(m);
    }

    function unflash(m) {
      m.flash = 0;
      m.R.meshes.forEach(p => { if (p.userData.mat) { p.material = p.userData.mat; p.userData.mat = null; } });
    }

    // Falls over backwards, bleeds, then sinks into the ground
    function dying(m, dt) {
      const p = m.pos, sp = m.sp, before = m.dead;
      m.dead += dt;
      if (sp.move !== 'walk' && p.y > 0) {
        m.vy -= 18 * dt;
        p.y = Math.max(0, p.y + m.vy * dt);
      }
      m.R.body.rotation.x = -Math.min(1, m.dead / 0.4) * PI / 2 * 0.95;
      if (before < 0.4 && m.dead >= 0.4) {
        const back = sp.h * 0.45;
        blood.splat(p.x - Math.sin(m.yaw) * back, p.z - Math.cos(m.yaw) * back, 1 + sp.h * 0.5);
        blood.burst(p.x, 0.2, p.z, 10);
      }
      if (m.dead > 2.5) p.y -= dt * 0.8;
      return m.dead > 4.5;
    }

    function damage(hit, amount, dir) {
      const m = hit.object.userData.monster;
      if (!m || m.dead >= 0) return null;
      const head = hit.object.userData.head;
      m.hp -= amount * (head ? 2 : 1);
      blood.spray(hit.point, dir, head ? 16 : 9);
      if (hit.face) blood.stick(hit.object, hit.point, tmp.copy(hit.face.normal).transformDirection(hit.object.matrixWorld));
      m.stun = 0.12;
      if (!m.flash) m.R.meshes.forEach(p => { p.userData.mat = p.material; p.material = FLASH; });
      m.flash = 0.06;
      if (m.hp > 0) return { killed: false, head, m };
      m.dead = 0; m.state = 'dead'; m.vy = Math.min(m.vy, 0);
      unflash(m);
      for (let i = meshes.length - 1; i >= 0; i--) if (meshes[i].userData.monster === m) meshes.splice(i, 1);
      blood.burst(m.pos.x, m.pos.y + m.sp.h * 0.6, m.pos.z, 24);
      GS.Audio.splat();
      return { killed: true, head, m };
    }

    // keep monsters from overlapping each other
    function separate() {
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (a.dead >= 0 || a.sp.move === 'fly') continue;
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (b.dead >= 0 || b.sp.move === 'fly') continue;
          const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, min = a.sp.r + b.sp.r;
          const d2 = dx * dx + dz * dz;
          if (d2 > min * min || d2 < 1e-6) continue;
          const d = Math.sqrt(d2), push = (min - d) * 0.5 / d, ma = a.moved, mb = b.moved;
          step(a, -dx * push, -dz * push);
          step(b, dx * push, dz * push);
          a.moved = ma; b.moved = mb; // being pushed is not walking
        }
      }
    }

    // push the player out of monsters so they can't walk through them
    function pushOut(pos, r) {
      for (const m of list) {
        if (m.dead >= 0 || m.sp.move === 'fly' || pos.y > m.pos.y + m.sp.h) continue;
        const dx = pos.x - m.pos.x, dz = pos.z - m.pos.z, min = m.sp.r + r, d = Math.hypot(dx, dz);
        if (d < min && d > 1e-4) { pos.x = m.pos.x + dx / d * min; pos.z = m.pos.z + dz / d * min; }
      }
    }

    function update(dt, elapsed, target) {
      const mul = speedMul(elapsed);
      if ((navT -= dt) <= 0) { nav.build(target.x, target.z); navT = 0.3; }
      let alive = 0;
      for (const m of list) if (m.dead < 0) alive++;
      if ((spawnT -= dt) <= 0 && alive < maxAlive(elapsed)) { spawn(elapsed); spawnT = spawnEvery(elapsed); }
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m.dead >= 0) {
          if (dying(m, dt)) { scene.remove(m.R.root); list.splice(i, 1); }
          continue;
        }
        think(m, dt, mul, target);
      }
      separate();
      for (const m of list) if (m.dead < 0) animate(m, dt);
      blood.update(dt);
    }

    function reset() {
      list.splice(0).forEach(m => scene.remove(m.R.root));
      meshes.length = 0;
      spawnT = 0.5; navT = 0;
      blood.reset();
    }

    return { list, meshes, update, damage, pushOut, reset, speedMul };
  }

  return { create, SPECIES };
})();
