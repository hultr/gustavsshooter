// Gustav's monsters (sketches/monsters.png), built in 3D. Two detail levels from the same
// builders: simple low-poly parts with ink outlines, or detailed organic shapes with
// textured skin, fangs, talons and more lifelike motion (js/geo.js, js/textures.js).
// Monsters with the same number on the sketch are one family: they share a colour
// and a way of moving.
//   1  blade stalkers – Fob, Bob, Olt (a hand on one arm, a blade on the other)
//   2  root things    – Frot (walking tree), Trassel (bundle of stalks), Dhi (flies)
//   3  small crawlers – Bek (worm), Durk (grin on a round base), Dir (hopping head)
//   5  Hopparen       – long grasshopper legs, jumps at you
//   7  runners        – Löparen (spiky hair, long arms), Bok (hairy with a big claw)
// From sketches/monstersandweapons2.png:
//      Gob            – its own family: head full of teeth, curved blade on one arm
window.GS = window.GS || {};

GS.Monsters = (function () {
  const EDGE = new THREE.LineBasicMaterial({ color: 0x262626 });
  const FLASH = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const G = GS.Geo;
  const cache = {};
  const once = (key, make) => cache[key] || (cache[key] = make());
  const lambert = c => once('m' + c, () => new THREE.MeshLambertMaterial({ color: c }));
  const basic = c => once('b' + c, () => new THREE.MeshBasicMaterial({ color: c }));

  // Detail level of the monster being built. Simple: low-poly parts with ink outlines.
  // Detailed: organic shapes, textured skin, wet eyes, fangs, talons and moving jaws.
  let HD = false, IRIS = 0xd8c21f;
  const k = s => (HD ? 'H' : '') + s;

  // Limbs hang down from their origin and trunks grow up from it,
  // so a joint placed at a hip or shoulder swings the whole piece.
  const limb = (rt, rb, h, s = 6) => once(k(`l${rt},${rb},${h},${s}`), () => HD ? G.limb(rt, rb, h) : new THREE.CylinderGeometry(rt, rb, h, s).translate(0, -h / 2, 0));
  const trunk = (rt, rb, h, s = 7) => once(k(`t${rt},${rb},${h},${s}`), () => HD ? G.trunk(rt, rb, h) : new THREE.CylinderGeometry(rt, rb, h, s).translate(0, h / 2, 0));
  const ball = (r, d = 1) => once(k(`s${r},${d}`), () => HD ? G.blob(r, 0.07, Math.round(r * 100)) : new THREE.IcosahedronGeometry(r, d));
  const box = (w, h, d) => once(k(`x${w},${h},${d}`), () => HD ? G.roundBox(w, h, d, Math.min(w, h, d) * 0.35) : new THREE.BoxGeometry(w, h, d));
  const spike = (r, h, s = 4) => once(k(`k${r},${h},${s}`), () => HD ? G.horn(r, h, 0.22) : new THREE.ConeGeometry(r, h, s).translate(0, h / 2, 0));
  // a flat blade: simple = a squashed cone (the caller scales it), detailed = a curved edge
  const blade = (r, h) => once(k(`bl${r},${h}`), () => HD ? G.horn(r, h, 0.3, 'x', 10) : new THREE.ConeGeometry(r, h, 4).translate(0, h / 2, 0));
  const arc = r => once('arc' + r, () => new THREE.TorusGeometry(r, 0.018, 3, 10, Math.PI).rotateZ(Math.PI)); // ink smile
  const edges = g => once('e' + g.uuid, () => new THREE.EdgesGeometry(g, 25));
  const unitBall = () => once('unitBall', () => new THREE.SphereGeometry(1, 16, 12));

  const C = {
    bone: 0xe6dfcc, blade: 0x2a2a30, dark: 0x3b302a, mouth: 0x2a1212, ink: 0x1c1c1c, white: 0xf7f4ea,
    bark: 0x94805f, moss: 0x9fae80, gob: 0xcfc9bd, tooth: 0xfffbe8, slime: 0xc4d68f, pink: 0xe6bca8, grey: 0xb4a9c8, rust: 0xcf9f72,
  };
  const PI = Math.PI;

  // Detailed skin per colour: [pattern, shininess, specular, bump, colour used]
  const SKINS = {
    [C.bone]: ['flesh', 18, 0x3a3530, 0.035, 0xd9cfb6], [C.gob]: ['wrinkle', 14, 0x302c28, 0.045, 0xc4bcae],
    [C.pink]: ['flesh', 40, 0x553838, 0.03, 0xd9a08e], [C.bark]: ['bark', 4, 0x111111, 0.08, 0x8a7352],
    [C.moss]: ['bark', 8, 0x1a1f14, 0.06, 0x8fa06c], [C.slime]: ['slime', 90, 0x8a9a70, 0.03, 0xb4c87a],
    [C.grey]: ['leather', 10, 0x2a2830, 0.06, 0xa89cbc], [C.rust]: ['fur', 3, 0x0a0806, 0.09, 0xc08a5a],
    [C.ink]: ['chitin', 90, 0x6a6a6a, 0.02, 0x241e1c], [C.blade]: ['chitin', 140, 0xb0b0b8, 0.01, 0x2a2a32],
    [C.dark]: ['chitin', 50, 0x444444, 0.03, 0x3b302a], [C.mouth]: ['gum', 60, 0x442222, 0.02, 0x1c0609],
    [C.tooth]: ['enamel', 90, 0x999988, 0.01, 0xf2ead0], [C.white]: ['enamel', 90, 0x999988, 0.01, 0xf2ead0],
    bone: ['enamel', 30, 0x555550, 0.02, 0xd8cfb4],
  };
  const skin = c => once('hd' + c, () => {
    const [kind, shininess, specular, bumpScale, color] = SKINS[c] || ['flesh', 20, 0x333333, 0.03, c];
    const t = GS.Tex.skin(kind, kind === 'fur' ? 4 : 3, kind === 'fur' ? 3 : 2);
    return new THREE.MeshPhongMaterial({ color, map: t.map, bumpMap: t.bump, bumpScale, shininess, specular });
  });

  // ---------- Rig: the parts of one monster ----------
  function rig() {
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    return { root, body, meshes: [], swing: [], arms: [], spin: [], jaws: [], head: null };
  }
  // o: p position, r rotation, s scale, glow (unlit, no outline), head (headshot zone)
  function part(R, parent, geo, color, o = {}) {
    const m = new THREE.Mesh(geo, HD ? (o.mat || skin(color)) : o.glow ? basic(color) : lambert(color));
    if (o.p) m.position.fromArray(o.p);
    if (o.r) m.rotation.fromArray(o.r);
    if (o.s) m.scale.fromArray(o.s);
    if (!o.glow && !HD) m.add(new THREE.LineSegments(edges(geo), EDGE));
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
  // swings while walking. o.knee: a lower joint that bends while the leg swings forward
  // (kneeAmp radians); o.wave: a tendril that keeps waving when standing still.
  const swing = (R, j, amp, ph = 0, axis = 'x', o = {}) => R.swing.push({
    o: j, axis, amp, ph, base: j.rotation[axis], knee: o.knee, kneeAmp: o.kneeAmp || 0, kbase: o.knee ? o.knee.rotation[axis] : 0, wave: !!o.wave,
  });
  // strikes when attacking (and swings a little while walking)
  const arm = (R, o, ph = 0, reach = 1) => R.arms.push({ o, ph, reach, base: o.rotation.x, bz: o.rotation.z });
  const look = (R, j) => { R.head = j; j.userData.base = j.rotation.clone(); return j; };

  // Eyes as Gustav draws them: a white almond with a black pupil (unlit, so they read at dusk).
  // dark: a solid black eye, like Fob's. Detailed: a wet veiny eyeball with a glowing slit iris.
  function eye(R, parent, x, y, z, r = 0.05, dark = false) {
    if (HD) {
      const mat = dark ? once('eyeDark', () => new THREE.MeshPhongMaterial({ color: 0x050505, specular: 0xaaaaaa, shininess: 140 }))
        : once('eyeWhite', () => { const t = GS.Tex.skin('eyeball'); return new THREE.MeshPhongMaterial({ color: 0xf4eedc, map: t.map, specular: 0x999999, shininess: 120 }); });
      const e = part(R, parent, once('eyeball', () => new THREE.SphereGeometry(1, 16, 12)), 0, { p: [x, y, z], s: [r * 1.4, r * 0.8, r * 0.6], head: true, mat });
      if (!dark) {
        const irisMat = once('irisMat' + IRIS, () => new THREE.MeshBasicMaterial({ map: GS.Tex.iris(IRIS) }));
        part(R, e, once('irisDisc', () => new THREE.CircleGeometry(0.6, 20)), 0, { p: [0, 0, 1.0], s: [0.8 / 1.4, 1, 1], head: true, mat: irisMat });
      }
      return e;
    }
    const e = part(R, parent, ball(r, 1), dark ? C.ink : C.white, { p: [x, y, z], s: [1.4, 0.8, 0.6], glow: true, head: true });
    if (!dark) part(R, e, ball(r * 0.5, 0), C.ink, { p: [0, 0, r * 0.7], glow: true, head: true });
    return e;
  }
  function eyes(R, parent, y, z, dx, r = 0.05, dark = false) {
    eye(R, parent, -dx, y, z, r, dark);
    eye(R, parent, dx, y, z, r, dark);
  }
  // Rib lines drawn across a chest: small ink smiles. Detailed: bare rib bones poking out.
  function ribs(R, parent, y0, z, w, n = 3, step = 0.13) {
    for (let i = 0; i < n; i++) {
      if (!HD) { part(R, parent, arc(w * (1 - i * 0.08)), C.ink, { p: [0, y0 - i * step, z], glow: true }); continue; }
      // two ribs curving down and round from the breastbone, a gap in the middle
      const rr = z * 1.0, sag = 0.05 + w * 0.45, t = Math.max(0.016, w * 0.12);
      const geo = once(`rib${rr},${sag},${t}`, () => G.merge([-1, 1].map(sd => G.tube([0.12, 0.4, 0.7, 1.0].map(a =>
        [sd * Math.sin(a) * rr, -sag * a * a, Math.cos(a) * rr]), t, 10, 6))));
      part(R, parent, geo, 'bone', { p: [0, y0 - i * step, 0] });
    }
  }
  // A row of n fangs across width w, pointing down (up = false) or up, canines longest
  const fangRow = (w, n, len, up) => once(`fangs${w},${n},${len},${up}`, () => {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) * 2 - 1 : 0, edge = Math.abs(t);
      const l = len * (0.55 + 0.6 * Math.exp(-(((edge - 0.55) / 0.2) ** 2)) + 0.15 * (i % 2));
      const f = G.horn(len * 0.16 * (1 + 0.4 * (l > len * 0.9)), l, -0.18, 'z', 6, 6);
      parts.push(G.place(f, [t * w / 2, 0, -edge * edge * w * 0.25], up ? [0, 0, t * 0.15] : [PI, 0, -t * 0.15]));
    }
    return G.merge(parts);
  });
  // Detailed mouth: a wet hole with fangs top and bottom; the lower jaw opens and closes.
  // (x, y, z) is the centre of the mouth on the face, w x h its size.
  function maw(R, parent, x, y, z, w, h, n = 7) {
    // a shallow, nearly black dome on the face reads as the opening
    part(R, parent, unitBall(), C.mouth, { p: [x, y, z], s: [w * 0.52, h * 0.58, w * 0.22], head: true });
    const len = Math.min(h * 0.7, w * 0.55);
    part(R, parent, fangRow(w * 0.9, n, len, false), C.tooth, { p: [x, y + h * 0.5, z + w * 0.14], head: true });
    const jaw = joint(parent, [x, y - h * 0.05, z - w * 0.25]);
    part(R, jaw, fangRow(w * 0.8, Math.max(3, n - 1), len * 0.85, true), C.tooth, { p: [0, -h * 0.48, w * 0.39], head: true });
    R.jaws.push({ o: jaw, amp: 0.35 + h / w * 0.15 });
  }
  function claws(R, parent, n, len, color, spread = 0.35) {
    if (HD) {  // curved talons merged into one piece, longer and sharper
      const geo = once(`talons${n},${len},${spread}`, () => G.merge(Array.from({ length: n }, (_, i) =>
        G.place(G.horn(0.032 + len * 0.05, len * 1.35, -0.4, 'z', 7, 8), [0, 0, 0], [PI - 0.3, 0, (i - (n - 1) / 2) * spread]))));
      part(R, parent, geo, color === C.ink || color === C.dark ? C.ink : C.blade);
      return;
    }
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * spread;
      part(R, parent, spike(0.03, len), color, { r: [PI - 0.3, 0, a] });
    }
  }
  // Two horns on top of a head (the red family has them); detailed ones sweep back
  function horns(R, parent, y, dx, len = 0.3) {
    for (const s of [-1, 1]) {
      const geo = HD ? once(`horn${len}`, () => G.horn(0.07 * len / 0.3, len * 1.35, 0.45, 'z', 9, 12)) : spike(0.06, len);
      part(R, parent, geo, C.ink, { p: [s * dx, y, 0], r: [0, 0, -s * 0.35], head: true });
    }
  }

  // ---------- Family 1: blade stalkers ----------
  // Front view (Fob): long head with black eyes and an open mouth, a raised hand with an
  // eye in the palm, the other forearm is a black blade, and the body flares into a skirt
  // of pointed legs. Back view (Bob): slim, black fist. Dead (Olt): antler strands where
  // the head was, a black streak down the chest, big claw hand.
  function stalker(o) {
    return function () {
      const R = rig(), b = R.body, col = C.bone;
      const hip = o.legLen;
      for (let i = 0; i < o.legs; i++) {
        const a = i / o.legs * PI * 2;
        const j = joint(b, [Math.cos(a) * o.hipR, hip, Math.sin(a) * o.hipR * 0.8], [0, 0, Math.cos(a) * 0.12]);
        part(R, j, limb(o.legR, o.legR * 0.8, o.legLen - 0.2), col);
        part(R, j, spike(o.legR * 0.8, 0.28), col, { p: [0, -(o.legLen - 0.2), 0], r: [PI, 0, 0] }); // pointed foot
        swing(R, j, 0.4, (i % 2) * PI + i * 0.3);
      }
      part(R, b, trunk(o.chest, o.waist, o.torso), col, { p: [0, hip - 0.05, 0] });
      ribs(R, b, hip + o.torso * 0.8, (o.chest + o.waist) * 0.5, o.chest * 0.5);
      const sh = hip + o.torso;
      const head = look(R, joint(b, [0, sh + 0.2, 0]));
      if (o.head === 'long') {          // Fob
        part(R, b, trunk(0.07, 0.09, 0.3), col, { p: [0, sh - 0.05, 0] });
        part(R, head, ball(0.26), col, { p: [0, 0.45, 0], s: [0.85, 1.7, 0.85], head: true });
        eyes(R, head, 0.72, 0.2, 0.08, 0.06, true);
        if (HD) maw(R, head, 0, 0.38, 0.2, 0.17, 0.3, 6);  // screaming mouth full of fangs
        else {
          part(R, head, box(0.13, 0.3, 0.06), C.mouth, { p: [0, 0.38, 0.2], glow: true, head: true });
          for (const x of [-0.035, 0.035]) part(R, head, box(0.02, 0.07, 0.02), C.white, { p: [x, 0.5, 0.23], glow: true, head: true });
        }
      } else if (o.head === 'egg') {    // Bob, seen from behind: narrow head, one eye peeking
        part(R, b, trunk(0.07, 0.09, 0.3), col, { p: [0, sh - 0.05, 0] });
        part(R, head, ball(0.2), col, { p: [0, 0.4, 0], s: [0.8, 1.8, 0.9], head: true });
        eye(R, head, 0.05, 0.55, 0.17, 0.045);
      } else {                          // Olt, dead: antler strands instead of a head
        part(R, head, ball(0.12, 0), C.ink, { p: [0, 0.02, 0], head: true });
        for (let i = 0; i < 6; i++) {
          const a = (i - 2.5) * 0.35;
          const j = joint(head, [0, 0.05, 0], [0, i % 2 ? 0.4 : -0.4, a]);
          part(R, j, spike(0.03, 0.45 + (i % 3) * 0.12), C.ink, { head: true });
          swing(R, j, 0.15, i, 'z', { wave: true });
        }
        part(R, b, box(0.14, o.torso * 0.8, 0.04), C.ink, { p: [0, hip + o.torso * 0.55, (o.chest + o.waist) * 0.48], glow: true });
      }
      // hand arm
      const la = joint(b, [o.chest + 0.08, sh - 0.05, 0], [0, 0, 0.35]);
      part(R, la, limb(0.065, 0.055, o.arm), col);
      const lf = joint(la, [0, -o.arm, 0], [-0.5, 0, 0]);
      part(R, lf, limb(0.055, 0.045, o.arm * 0.8), col);
      const hand = joint(lf, [0, -o.arm * 0.8, 0]);
      if (o.hand === 'eye') {           // open hand with an eye in the palm
        part(R, hand, ball(0.1, 0), col, { s: [1.1, 1.3, 0.5] });
        eye(R, hand, 0, -0.02, 0.06, 0.035);
        claws(R, hand, 5, 0.22, col, 0.28);
      } else if (o.hand === 'fist') {   // black fist
        part(R, hand, ball(0.11, 0), C.ink, { s: [1, 1.2, 0.9] });
        claws(R, hand, 4, 0.14, C.ink, 0.3);
      } else {                          // big black claw
        part(R, hand, ball(0.1, 0), C.ink);
        claws(R, hand, 5, 0.34, C.ink, 0.32);
      }
      arm(R, la, 0);
      // blade arm: the forearm itself is a curved black blade
      const ra = joint(b, [-o.chest - 0.08, sh - 0.05, 0], [0, 0, -0.35]);
      part(R, ra, limb(0.065, 0.055, o.arm), col);
      const rf = joint(ra, [0, -o.arm, 0], [-0.6, 0, 0]);
      part(R, rf, blade(0.13, o.blade * 0.6), C.blade, { r: [PI, 0, 0], s: [1, 1, 0.3] });
      const tip = joint(rf, [0, -o.blade * 0.55, 0], [-0.5, 0, 0]);
      part(R, tip, blade(0.09, o.blade * 0.5), C.blade, { r: [PI, 0, 0], s: [1, 1, 0.3] });
      arm(R, ra, PI, 1.1);
      return R;
    };
  }

  // ---------- Family 2: root things ----------
  // Front (Frot): a tall trunk with eyes down it, curly tendrils on top, splitting into
  // root legs at the bottom with rib lines where it splits.
  function frot() {
    const R = rig(), b = R.body;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * PI * 2;
      const j = joint(b, [Math.cos(a) * 0.35, 1.3, Math.sin(a) * 0.35], [0, -a, 0]);
      const k = joint(j, [0, 0, 0], [0, 0, 0.7]);
      part(R, k, limb(0.13, 0.09, 0.9), C.bark);
      const knee = joint(k, [0, -0.9, 0], [0, 0, -0.9]);
      part(R, knee, limb(0.09, 0.05, 0.75), C.bark);
      part(R, knee, spike(0.05, 0.2), C.bark, { p: [0, -0.75, 0], r: [PI, 0, 0] });
      swing(R, k, 0.3, i * 1.1, 'z', { knee, kneeAmp: -0.4 });
    }
    part(R, b, trunk(0.3, 0.5, 2.7), C.bark, { p: [0, 1.2, 0] });
    ribs(R, b, 1.75, 0.49, 0.2);
    [2.3, 3.0, 3.6].forEach((y, i) => eye(R, b, 0, y, 0.47 - (y - 1.2) * 0.075, 0.09, false));
    const head = look(R, joint(b, [0, 3.9, 0]));
    part(R, head, ball(0.3, 0), C.bark, { s: [1, 0.6, 1], head: true });
    for (let i = 0; i < 7; i++) {
      const h = joint(head, [0, 0.1, 0], [0, i / 7 * PI * 2, 0.7 + (i % 2) * 0.5]);
      part(R, h, spike(0.035, 0.6), C.ink);
      const curl = joint(h, [0, 0.6, 0], [0, 0, -1.1]);   // curls over at the end
      part(R, curl, spike(0.025, 0.35), C.ink);
      swing(R, h, 0.35, i, 'z', { wave: true });
    }
    return R;
  }

  // Back (Trassel): a bundle of stalks splitting into long forked legs, whiskers on top
  function tangle() {
    const R = rig(), b = R.body;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * PI * 2 + 0.4;
      const j = joint(b, [0, 1.55, 0], [0, a, 0.3]);
      part(R, j, limb(0.07, 0.04, 1.35), C.bark);
      for (const f of [-0.35, 0.35]) part(R, j, spike(0.03, 0.35), C.bark, { p: [0, -1.33, 0], r: [PI, 0, f] }); // forked foot
      swing(R, j, 0.45, (i % 2) * PI);
    }
    part(R, b, ball(0.3, 0), C.bark, { p: [0, 1.6, 0] });
    ribs(R, b, 1.6, 0.28, 0.15, 2, 0.1);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * PI * 2;
      part(R, b, trunk(0.04, 0.07, 0.8 + (i % 3) * 0.2), C.bark, { p: [Math.cos(a) * 0.12, 1.7, Math.sin(a) * 0.12], r: [Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2] });
    }
    const head = look(R, joint(b, [0, 2.55, 0.05]));
    part(R, head, ball(0.2), C.bark, { head: true });
    eyes(R, head, 0.04, 0.17, 0.07);
    if (HD) maw(R, head, 0, -0.09, 0.15, 0.16, 0.1, 6);
    for (const s of [-1, 1]) {
      const w = joint(head, [s * 0.12, 0.1, 0], [0, 0, -s * 1.2]);  // whiskers curling out
      part(R, w, spike(0.02, 0.5), C.ink);
      swing(R, w, 0.3, s, 'z', { wave: true });
    }
    for (const s of [-1, 1]) {
      const w = joint(b, [s * 0.2, 2.2, 0.1], [0, 0, s * 0.5]);
      part(R, w, limb(0.05, 0.02, 1.4), C.bark);
      arm(R, w, s > 0 ? 0 : PI, 1.2);
    }
    return R;
  }

  // Dead (Dhi): a flying head with long strands streaming out behind it, eyes shut
  function dhi() {
    const R = rig(), b = R.body;
    const head = look(R, joint(b, [0, 0, 0.3]));
    part(R, head, ball(0.32), C.moss, { s: [1, 0.9, 1.1], head: true });
    for (const x of [-0.08, 0.08]) part(R, head, box(0.025, 0.1, 0.02), C.ink, { p: [x, 0.08, 0.33], glow: true, head: true }); // closed eyes "ll"
    if (HD) maw(R, head, 0, -0.1, 0.3, 0.26, 0.14, 9);  // the smile is a grin full of teeth
    else part(R, head, arc(0.12), C.ink, { p: [0, -0.08, 0.32], glow: true, head: true });
    for (let i = 0; i < 6; i++) {
      const a = (i - 2.5) * 0.35;
      const j = joint(b, [Math.sin(a) * 0.18, Math.cos(a) * 0.18 - 0.05, 0.1], [PI / 2 + a * 0.4, 0, 0]); // strands trail behind (-z)
      part(R, j, spike(0.05, 1.2 + (i % 2) * 0.4), C.ink, { r: [PI, 0, 0] });
      swing(R, j, 0.25, i * 0.8, 'y', { wave: true });
    }
    return R;
  }

  // ---------- Family 3: small crawlers ----------
  // Back (Bek): a worm neck rising from a coil, one eye, tail curling round with a claw
  function bek() {
    const R = rig(), b = R.body;
    const tail = joint(b, [0, 0, 0]);
    part(R, tail, ball(0.3), C.slime, { p: [0, 0.26, 0] });
    part(R, tail, ball(0.24), C.slime, { p: [0.15, 0.22, -0.42] });
    part(R, tail, ball(0.17), C.slime, { p: [0.4, 0.25, -0.6] });
    const tip = joint(tail, [0.55, 0.35, -0.6], [0, 0, -0.6]);
    part(R, tip, trunk(0.06, 0.1, 0.4), C.slime);
    claws(R, joint(tip, [0, 0.5, 0], [PI, 0, 0]), 3, 0.15, C.ink);
    swing(R, tail, 0.35, 0, 'y', { wave: true });
    part(R, b, trunk(0.14, 0.22, 0.65), C.slime, { p: [0, 0.3, 0.2], r: [0.4, 0, 0] });
    const head = look(R, joint(b, [0, 0.95, 0.47]));
    part(R, head, ball(0.2), C.slime, { s: [1, 1.3, 1], head: true });
    eye(R, head, 0, 0.08, 0.17, 0.07);
    if (HD) maw(R, head, 0, -0.1, 0.16, 0.18, 0.12, 7);
    const a = joint(b, [0.2, 0.7, 0.4], [0, 0, 0.5]);
    part(R, a, limb(0.04, 0.03, 0.4), C.slime);
    claws(R, joint(a, [0, -0.4, 0]), 3, 0.18, C.ink);
    arm(R, a, 0);
    return R;
  }

  // Front (Durk): a tall worm on a round base, big grin full of teeth, ribs down the neck
  function durk() {
    const R = rig(), b = R.body;
    part(R, b, trunk(0.5, 0.5, 0.12, 12), C.pink, { p: [0, 0, 0] });                 // round base
    for (let i = 0; i < 3; i++) eye(R, b, (i - 1) * 0.22, 0.07, 0.46, 0.04, true);    // spots on the base
    for (const s of [-1, 1]) {                                                         // little claws at the base
      const c = joint(b, [s * 0.45, 0.15, 0.1], [0, 0, s * 0.9]);
      claws(R, c, 3, 0.15, C.ink, 0.4);
    }
    part(R, b, trunk(0.3, 0.38, 0.9), C.pink, { p: [0, 0.1, 0] });
    ribs(R, b, 0.65, 0.35, 0.18);
    const head = look(R, joint(b, [0, 1.3, 0]));
    part(R, head, ball(0.38), C.pink, { s: [1, 1.1, 1], head: true });
    if (HD) maw(R, head, 0, -0.06, 0.33, 0.4, 0.2, 11);  // the big grin
    else {
      part(R, head, box(0.36, 0.14, 0.1), C.mouth, { p: [0, -0.06, 0.33], glow: true, head: true });
      for (let i = 0; i < 5; i++) part(R, head, box(0.03, 0.04, 0.02), C.white, { p: [(i - 2) * 0.06, 0, 0.38], glow: true, head: true });
    }
    eyes(R, head, 0.16, 0.32, 0.12, 0.05, true);
    const a = joint(b, [0.35, 0.8, 0.1], [0, 0, 0.5]);
    part(R, a, limb(0.05, 0.04, 0.45), C.pink);
    claws(R, joint(a, [0, -0.45, 0]), 3, 0.14, C.ink);
    arm(R, a, 0);
    return R;
  }

  // Dead (Dir): just the head, with a black hair cap and dotted eyes
  function dir() {
    const R = rig(), b = R.body;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * PI * 2 + PI / 4;
      const j = joint(b, [Math.cos(a) * 0.15, 0.25, Math.sin(a) * 0.15], [0, -a, 0.4]);
      part(R, j, limb(0.03, 0.02, 0.27), C.ink);
      swing(R, j, 0.5, i * PI / 2, 'z');
    }
    const head = look(R, joint(b, [0, 0.45, 0]));
    part(R, head, ball(0.28), C.pink, { head: true });
    part(R, head, ball(0.29), C.ink, { p: [0, 0.08, -0.04], s: [1, 0.6, 1], head: true });  // hair cap
    if (HD) maw(R, head, 0, -0.1, 0.24, 0.24, 0.12, 8);
    else for (let i = 0; i < 4; i++) part(R, head, box(0.03, 0.06, 0.02), C.ink, { p: [(i - 1.5) * 0.08, -0.08, 0.26], glow: true, head: true });
    eyes(R, head, 0.04, 0.24, 0.1, 0.04);
    return R;
  }

  // ---------- Family 5: Hopparen ----------
  // Front: a hunched body with two horns and one big eye, one long arm reaching the ground
  function leaper() {
    const R = rig(), b = R.body;
    for (const s of [-1, 1]) {
      const t = joint(b, [s * 0.25, 0.9, 0]);
      part(R, t, limb(0.1, 0.08, 0.5), C.grey);
      const k = joint(t, [0, -0.5, 0], [0.4, 0, 0]);
      part(R, k, limb(0.08, 0.06, 0.45), C.grey);
      claws(R, joint(k, [0, -0.45, 0.05]), 3, 0.15, C.ink, 0.5);
      swing(R, t, 0.5, s > 0 ? 0 : PI, 'x', { knee: k, kneeAmp: 0.6 });
    }
    const hump = joint(b, [0, 0.85, 0], [0.35, 0, 0]);
    part(R, hump, trunk(0.42, 0.32, 0.9), C.grey);
    const head = look(R, joint(hump, HD ? [0, 0.98, 0.2] : [0, 0.9, 0.05]));
    part(R, head, ball(0.34), C.grey, { s: [1.2, 0.8, 1], head: true });
    horns(R, head, 0.18, 0.25, 0.38);
    eye(R, head, 0, -0.05, 0.3, 0.1);
    if (HD) maw(R, head, 0, -0.17, 0.27, 0.3, 0.13, 9);
    for (const s of [-1, 1]) {
      const a = joint(hump, [s * 0.42, 0.75, 0.1], [-0.4, 0, s * 0.25]);
      part(R, a, limb(0.07, 0.05, s > 0 ? 1.3 : 0.7), C.grey);
      claws(R, joint(a, [0, s > 0 ? -1.3 : -0.7, 0]), 4, 0.22, C.ink, 0.3);
      arm(R, a, s > 0 ? 0 : PI);
    }
    return R;
  }

  // ---------- Family 7: Löparen and Bok ----------
  // Dead drawing (Löparen): a thin twisted figure with a small horned head and long arms
  function runner() {
    const R = rig(), b = R.body;
    for (const s of [-1, 1]) {
      const t = joint(b, [s * 0.14, 1.0, 0]);
      part(R, t, limb(0.08, 0.06, 0.5), C.rust);
      const k = joint(t, [0, -0.5, 0], [0.3, 0, 0]);
      part(R, k, limb(0.06, 0.04, 0.52), C.rust);
      swing(R, t, 0.8, s > 0 ? 0 : PI, 'x', { knee: k, kneeAmp: 0.9 });
    }
    const chest = joint(b, [0, 0.95, 0], [0.35, 0, 0]);
    part(R, chest, trunk(0.22, 0.16, 0.7), C.rust);
    ribs(R, chest, 0.5, 0.2, 0.12);
    const head = look(R, joint(chest, [0, 0.9, 0]));
    part(R, head, ball(0.16), C.rust, { s: [1, 1.3, 1], head: true });
    horns(R, head, 0.12, 0.09, 0.25);
    eyes(R, head, 0.03, 0.14, 0.06, 0.035);
    if (HD) maw(R, head, 0, -0.1, 0.13, 0.13, 0.09, 6);
    for (const s of [-1, 1]) {
      const a = joint(chest, [s * 0.26, 0.65, 0], [-0.2, 0, s * 0.25]);
      part(R, a, limb(0.05, 0.04, 0.95), C.rust);
      claws(R, joint(a, [0, -0.95, 0]), 4, 0.18, C.ink);
      arm(R, a, s > 0 ? PI : 0);
    }
    return R;
  }

  // Back drawing (Bok): squat, two horns, a black patch on the neck, long clawed arms
  function bok() {
    const R = rig(), b = R.body;
    for (const s of [-1, 1]) {
      const l = joint(b, [s * 0.2, 0.42, 0]);
      part(R, l, limb(0.09, 0.06, 0.42), C.rust);
      swing(R, l, 0.7, s > 0 ? 0 : PI);
    }
    part(R, b, trunk(0.38, 0.32, 0.6), C.rust, { p: [0, 0.4, 0] });
    const head = look(R, joint(b, [0, 1.05, 0]));
    part(R, head, ball(0.3), C.rust, { s: [1.1, 0.8, 1], head: true });
    part(R, head, ball(0.2, 0), C.ink, { p: [0, -0.1, -0.15], s: [1.4, 0.6, 1] });  // black patch on the neck
    horns(R, head, 0.12, 0.22, 0.32);
    eyes(R, head, 0.02, 0.25, 0.1, 0.045);
    if (HD) maw(R, head, 0, -0.12, 0.24, 0.26, 0.11, 9);
    for (const s of [-1, 1]) {
      const a = joint(b, [s * 0.4, 0.9, 0.05], [0, 0, s * 0.3]);
      part(R, a, limb(0.07, 0.05, 0.75), C.rust);
      claws(R, joint(a, [0, -0.75, 0]), 3, 0.25, C.ink, 0.45);
      arm(R, a, s > 0 ? 0 : PI, s > 0 ? 1.2 : 0.8);
    }
    return R;
  }

  // ---------- Gob (its own family) ----------
  function gob() {
    const R = rig(), b = R.body, col = C.gob;
    for (const s of [-1, 1]) {
      const t = joint(b, [s * 0.14, 1.22, 0]);
      part(R, t, limb(0.08, 0.06, 0.62), col);
      const k = joint(t, [0, -0.62, 0], [0.15, 0, 0]);
      part(R, k, limb(0.06, 0.05, 0.56), col);
      part(R, k, box(0.14, 0.06, 0.14), C.dark, { p: [0, -0.42, 0] });
      part(R, k, box(0.12, 0.06, 0.26), C.dark, { p: [0, -0.57, 0.06] });
      swing(R, t, 0.6, s > 0 ? 0 : PI, 'x', { knee: k, kneeAmp: 0.8 });
    }
    part(R, b, trunk(0.25, 0.18, 0.8), col, { p: [0, 1.15, 0] });
    part(R, b, trunk(0.06, 0.07, 0.18), col, { p: [0, 1.93, 0] });
    const head = look(R, joint(b, [0, 2.3, 0]));
    part(R, head, ball(0.25), col, { head: true });
    // the whole face is a mouth full of teeth
    if (HD) {
      maw(R, head, 0, -0.01, 0.19, 0.32, 0.34, 9);
      part(R, head, fangRow(0.2, 6, 0.09, false), C.tooth, { p: [0, 0.1, 0.12], head: true });  // second row further in
    } else {
      part(R, head, ball(0.2), C.mouth, { p: [0, -0.01, 0.1], s: [0.85, 1.05, 0.8], glow: true, head: true });
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.05;
        part(R, head, spike(0.028, 0.11), C.tooth, { p: [x, 0.14, 0.2], r: [PI, 0, 0], head: true });
        part(R, head, spike(0.028, 0.11), C.tooth, { p: [x, -0.15, 0.2], head: true });
      }
    }
    // blade arm
    const ba = joint(b, [0.28, 1.88, 0], [0, 0, 0.25]);
    part(R, ba, limb(0.06, 0.05, 0.55), col);
    const bf = joint(ba, [0, -0.55, 0], [-0.5, 0, 0]);
    part(R, bf, limb(0.05, 0.045, 0.5), col);
    part(R, bf, spike(0.18, 1.1), C.blade, { p: [0, -0.3, 0.05], r: [PI - 0.5, 0, 0], s: [0.25, 1, 1] });
    arm(R, ba, 0, 1.1);
    // claw arm
    const ca = joint(b, [-0.28, 1.88, 0], [0, 0, -0.25]);
    part(R, ca, limb(0.06, 0.045, 1.0), col);
    claws(R, joint(ca, [0, -1.0, 0]), 4, 0.16, C.dark);
    arm(R, ca, PI);
    return R;
  }

  // ---------- Species table ----------
  // speed m/s and attack rate are multiplied by the difficulty, which grows over time.
  // from: seconds into the fight before it starts showing up.
  const SPECIES = [
    { id: 'bek', name: 'Bek', family: 3, build: bek, hp: 45, speed: 2.6, dmg: 1, r: 0.45, h: 1.1, move: 'walk', from: 0, weight: 3, score: 10 },
    { id: 'bob', name: 'Bob', family: 1, build: stalker({ legs: 5, legLen: 1.45, legR: 0.05, hipR: 0.2, torso: 0.9, chest: 0.25, waist: 0.3, head: 'egg', hand: 'fist', arm: 0.7, blade: 1.2 }),
      hp: 90, speed: 3.0, dmg: 2, r: 0.6, h: 3.0, move: 'walk', from: 0, weight: 3, score: 20 },
    { id: 'dir', name: 'Dir', family: 3, build: dir, hp: 25, speed: 3.6, dmg: 1, r: 0.3, h: 0.8, move: 'hop', jump: 4, from: 15, weight: 2, score: 10 },
    { id: 'durk', name: 'Durk', family: 3, build: durk, hp: 60, speed: 3.0, dmg: 1, r: 0.5, h: 1.7, move: 'walk', from: 25, weight: 2, score: 15 },
    { id: 'gob', name: 'Gob', family: 'Gob', build: gob, hp: 80, speed: 3.4, dmg: 2, r: 0.5, h: 2.6, move: 'walk', stride: 0.7, from: 30, weight: 2, score: 20 },
    { id: 'fob', name: 'Fob', family: 1, build: stalker({ legs: 6, legLen: 1.5, legR: 0.09, hipR: 0.3, torso: 1.0, chest: 0.26, waist: 0.48, head: 'long', hand: 'eye', arm: 0.75, blade: 1.4 }),
      hp: 110, speed: 2.6, dmg: 2, r: 0.7, h: 3.4, move: 'walk', from: 35, weight: 2, score: 25 },
    { id: 'runner', name: 'Löparen', family: 7, build: runner, hp: 50, speed: 4.6, dmg: 1, r: 0.5, h: 2.0, move: 'walk', stride: 0.5, from: 45, weight: 2, score: 20 },
    { id: 'olt', name: 'Olt', family: 1, build: stalker({ legs: 4, legLen: 1.3, legR: 0.11, hipR: 0.25, torso: 0.9, chest: 0.3, waist: 0.35, head: 'antler', hand: 'claw', arm: 0.7, blade: 1.5 }),
      hp: 120, speed: 2.8, dmg: 2, r: 0.7, h: 3.0, move: 'walk', from: 60, weight: 2, score: 25 },
    { id: 'bok', name: 'Bok', family: 7, build: bok, hp: 45, speed: 4.0, dmg: 1, r: 0.45, h: 1.3, move: 'walk', stride: 0.35, from: 60, weight: 2, score: 15 },
    { id: 'tangle', name: 'Trassel', family: 2, build: tangle, hp: 80, speed: 3.2, dmg: 2, r: 0.6, h: 2.8, move: 'walk', from: 75, weight: 2, score: 20 },
    { id: 'leaper', name: 'Hopparen', family: 5, build: leaper, hp: 70, speed: 6, dmg: 2, r: 0.6, h: 2.3, move: 'hop', jump: 6, from: 90, weight: 2, score: 25 },
    { id: 'dhi', name: 'Dhi', family: 2, build: dhi, hp: 35, speed: 3.8, dmg: 1, r: 0.6, h: 0.8, move: 'fly', from: 105, weight: 2, score: 20 },
    { id: 'frot', name: 'Frot', family: 2, build: frot, hp: 300, speed: 1.8, dmg: 3, r: 1.0, h: 4.4, move: 'walk', lean: 0.6, from: 120, weight: 1, score: 60 },
  ];

  // Blood colour per family, never red: purple, poison green, yellow, blue, orange, teal.
  // Detailed eyes get the same colour in the iris.
  const BLOOD = { 1: 0x8b45d6, 2: 0x5ee02c, 3: 0xe8c81e, 5: 0x2f7ff0, 7: 0xff8c1a, Gob: 0x1fcab4 };
  SPECIES.forEach(s => { s.blood = BLOOD[s.family]; });

  function build(sp, hd) {
    HD = hd; IRIS = sp.blood;
    try { return sp.build(); } finally { HD = false; }
  }

  // Difficulty over time: slow at first, then faster and faster.
  const speedMul = t => Math.min(2.4, 0.5 + t / 120);
  const PACE_MIN = 0.7, PACE_MAX = 1.35; // each monster gets its own random pace in this range
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
    let spawnT = 0, navT = 0, moveSpeed = 1, detail = false;

    function spawn(elapsed) {
      const pool = SPECIES.filter(s => elapsed >= s.from);
      let r = Math.random() * pool.reduce((a, s) => a + s.weight, 0), sp = pool[0];
      for (const s of pool) if ((r -= s.weight) < 0) { sp = s; break; }
      const R = build(sp, detail);
      const z = map.spawn.z + (Math.random() - 0.5) * map.spawn.d, x = map.spawn.x + (Math.random() - 0.5) * map.spawn.w;
      R.root.position.set(x, sp.move === 'fly' ? 3 : 0, z);
      scene.add(R.root);
      const m = {
        sp, R, hp: sp.hp, pos: R.root.position, vy: 0, yaw: 0, dir: new THREE.Vector2(0, 1),
        state: 'walk', at: 0, cd: 0, stun: 0, flash: 0, dead: -1, t: 0,
        pace: PACE_MIN + Math.random() * (PACE_MAX - PACE_MIN),
        walk: Math.random() * 6, gait: 0, moved: 0, hopT: 0.5, hopX: 0, hopZ: 0, los: false, losT: 0,
        hd: detail, flinch: 0, lean: 0, roll: 0, yawRate: 0, twitch: 0, twitchT: 1 + Math.random() * 3, seed: Math.random() * 10,
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
      const turn = d * Math.min(1, dt * 8);
      m.yaw += turn;
      m.yawRate = dt > 0 ? turn / dt : 0;
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

      const s = sp.speed * mul * m.pace * moveSpeed * (m.stun > 0 ? 0 : 1);
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

    function animate(m, dt, target) {
      const R = m.R, sp = m.sp;
      const moved = m.moved;
      if (sp.move === 'fly') { m.walk += dt * 14; m.gait = 1; }
      else {
        m.walk += m.moved / (sp.stride || sp.h * 0.3);
        m.gait += ((m.moved > 0.001 ? 1 : 0) - m.gait) * Math.min(1, dt * 8);
      }
      for (const s of R.spin) s.rotation.x += m.moved / 0.25;
      m.moved = 0;
      if (m.hd) animateHD(m, dt, target, moved);
      else for (const s of R.swing) s.o.rotation[s.axis] = s.base + Math.sin(m.walk + s.ph) * s.amp * m.gait;

      let lift = 0, lean = 0;
      if (m.state === 'attack') {
        const a = m.at;
        if (m.hd) {  // wind up slowly, then a fast strike that overshoots
          lift = a < 0.7 ? 2.6 * (1 - (1 - a / 0.7) ** 3) : 2.6 - 3.4 * Math.sin((a - 0.7) / 0.3 * PI / 2);
        } else lift = a < 0.7 ? 2.6 * a / 0.7 : 2.6 - 3.0 * (a - 0.7) / 0.3;
        lean = (a < 0.7 ? -0.1 * a / 0.7 : 0.3) * (sp.lean || 1);
      }
      for (const a of R.arms) {
        a.o.rotation.x = a.base + (m.state === 'attack' ? -lift * a.reach : Math.sin(m.walk + a.ph) * 0.35 * m.gait);
      }
      R.body.rotation.x = lean;
      R.body.position.y = sp.move === 'walk' ? Math.abs(Math.sin(m.walk)) * 0.03 * sp.h * m.gait : 0;
      if (m.hd) bodyHD(m, dt);

      if (m.flash > 0 && (m.flash -= dt) <= 0) unflash(m);
    }

    // ---------- Lifelike motion for detailed monsters ----------
    const clampA = (x, a) => Math.max(-a, Math.min(a, x));
    function animateHD(m, dt, target, moved) {
      const R = m.R, sp = m.sp, t = m.t + m.seed;
      for (const s of R.swing) {
        const ph = m.walk + s.ph;
        let a = Math.sin(ph) * s.amp * m.gait;
        // tendrils keep drifting when it stands still
        if (s.wave) a += s.amp * (1 - m.gait * 0.5) * (0.6 * Math.sin(t * 1.9 + s.ph * 1.3) + 0.3 * Math.sin(t * 3.7 + s.ph));
        s.o.rotation[s.axis] = s.base + a;
        // the knee folds while the foot swings forward, straight while it carries weight
        if (s.knee) s.knee.rotation[s.axis] = s.kbase + Math.max(0, -Math.cos(ph)) * s.kneeAmp * m.gait;
      }
      // the head follows the player, with now and then a sudden twitch
      if (R.head) {
        const base = R.head.userData.base, p = m.pos;
        let yaw = Math.atan2(target.x - p.x, target.z - p.z) - m.yaw;
        yaw = clampA(Math.atan2(Math.sin(yaw), Math.cos(yaw)), 0.9);
        const pitch = clampA(Math.atan2(target.y + 1.5 - (p.y + sp.h * 0.85), Math.hypot(target.x - p.x, target.z - p.z)), 0.5);
        if ((m.twitchT -= dt) <= 0) { m.twitch = 1; m.twitchT = 1.5 + Math.random() * 4; m.twitchX = (Math.random() - 0.5) * 0.9; m.twitchZ = (Math.random() - 0.5) * 0.9; }
        m.twitch = Math.max(0, m.twitch - dt * 5);
        const k = Math.min(1, dt * 5), h = R.head.rotation;
        h.y += (base.y + yaw * 0.8 - h.y) * k;
        h.x += (base.x - pitch * 0.6 - m.flinch * 0.6 + m.twitch * (m.twitchX || 0) - h.x) * k * 1.5;
        h.z = base.z + m.twitch * (m.twitchZ || 0) * 0.6 + Math.sin(t * 0.7) * 0.06;
      }
      // jaws: slow breathing, gaping wide when it strikes
      let open = 0.1 + 0.08 * Math.sin(t * 2.3);
      if (m.state === 'attack') open = m.at < 0.7 ? 0.2 + 0.8 * m.at / 0.7 : 1 - (m.at - 0.7) / 0.3 * 0.9;
      for (const j of R.jaws) j.o.rotation.x = open * j.amp;
      // lean into the run, bank into turns
      const speed = moved / Math.max(dt, 1e-3);
      m.lean += (Math.min(1, speed / 4) * 0.14 - m.lean) * Math.min(1, dt * 4);
      m.roll += (clampA(-m.yawRate * 0.06, 0.25) + Math.sin(m.walk) * 0.05 * m.gait - m.roll) * Math.min(1, dt * 6);
    }
    function bodyHD(m, dt) {
      const B = m.R.body, sp = m.sp, t = m.t + m.seed;
      m.flinch = Math.max(0, m.flinch - dt * 5);
      B.rotation.x += m.lean - m.flinch * 0.3 + Math.sin(t * 1.3) * 0.02;
      B.rotation.z = m.roll;
      if (m.state === 'attack' && m.at > 0.7) B.position.z = Math.sin((m.at - 0.7) / 0.3 * PI) * 0.35 * sp.r;  // lunge
      else B.position.z = -m.flinch * 0.15;
      const breath = Math.sin(t * 2.2) * 0.015 * (1 - m.gait * 0.6);
      B.scale.set(1 + breath, 1 + breath * 0.5, 1 + breath);
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
      const land = m.hd ? 0.6 : 0.4;
      if (m.hd) collapse(m, dt);
      else m.R.body.rotation.x = -Math.min(1, m.dead / 0.4) * PI / 2 * 0.95;
      if (before < land && m.dead >= land) {
        // the pool spreads out where the body landed
        const back = sp.h * 0.45, fx = m.hd ? m.fallX : -1, fz = m.hd ? m.fallZ : 0;
        const bx = -fx * Math.sin(m.yaw) + fz * Math.cos(m.yaw), bz = -fx * Math.cos(m.yaw) - fz * Math.sin(m.yaw);
        blood.splat(p.x - bx * back, p.z - bz * back, 1 + sp.h * 0.5, sp.blood, m.hd ? 1.6 : 0);
        blood.burst(p.x, 0.2, p.z, 10, sp.blood);
      }
      if (m.dead > 2.5) p.y -= dt * 0.8;
      return m.dead > 4.5;
    }

    // Detailed death: the knees buckle, it topples (backwards or to one side) with a small
    // bounce, the limbs go limp and twitch a few times.
    function collapse(m, dt) {
      const R = m.R, B = R.body, t = m.dead, h = m.sp.h;
      if (!m.limp) {
        m.fallX = Math.random() < 0.7 ? 1 : 0.3;
        m.fallZ = m.fallX < 1 ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() - 0.5) * 0.4;
        m.limp = R.swing.map(() => (Math.random() - 0.5) * 0.8).concat(R.arms.map(() => 0.4 + Math.random() * 1.4));
        m.spin = (Math.random() - 0.5) * 0.8;
      }
      const buckle = Math.min(1, t / 0.15), u = Math.max(0, Math.min(1, (t - 0.12) / 0.45));
      const fall = u < 1 ? u * u : 1 - 0.07 * Math.sin(Math.min(1, (t - 0.57) / 0.25) * PI);  // gravity, then a bounce
      B.rotation.set(-fall * PI / 2 * 0.95 * m.fallX, m.spin * fall, fall * PI / 2 * 0.9 * m.fallZ);
      B.position.set(0, -0.08 * h * buckle * (1 - fall), 0);
      B.scale.set(1, 1, 1);
      const k = Math.min(1, dt * 6), jerk = t > 0.8 && t < 2.4 ? Math.max(0, Math.sin(t * 23 + m.seed)) ** 12 * 0.5 : 0;
      R.swing.forEach((s, i) => {
        s.o.rotation[s.axis] += (s.base + m.limp[i] - s.o.rotation[s.axis]) * k + (i % 3 === 0 ? jerk : 0);
        if (s.knee) s.knee.rotation[s.axis] += (s.kbase + s.kneeAmp * 1.3 - s.knee.rotation[s.axis]) * k;
      });
      R.arms.forEach((a, i) => { a.o.rotation.x += (a.base + m.limp[R.swing.length + i] - a.o.rotation.x) * k * 0.7 + (i === 0 ? jerk : 0); });
      for (const j of R.jaws) j.o.rotation.x += (j.amp * 1.2 - j.o.rotation.x) * k;
    }

    function damage(hit, amount, dir) {
      const m = hit.object.userData.monster;
      if (!m || m.dead >= 0) return null;
      const head = hit.object.userData.head;
      if (hit.face) blood.stick(hit.object, hit.point, tmp.copy(hit.face.normal).transformDirection(hit.object.matrixWorld), m.sp.blood);
      return hurt(m, amount * (head ? 2 : 1), head, hit.point, dir);
    }

    // Explosion: damage falls off with distance from the centre
    function blast(point, radius, amount) {
      const out = [], dir = new THREE.Vector3();
      for (const m of list) {
        if (m.dead >= 0) continue;
        tmp.set(m.pos.x, m.pos.y + m.sp.h * 0.5, m.pos.z);
        const d = tmp.distanceTo(point), reach = radius + m.sp.r;
        if (d > reach) continue;
        dir.subVectors(tmp, point).normalize();
        out.push(hurt(m, amount * (1 - 0.6 * d / reach), false, tmp.clone(), dir));
      }
      return out;
    }

    function hurt(m, amount, head, point, dir) {
      m.hp -= amount;
      blood.spray(point, dir, head ? 16 : 9, m.sp.blood);
      m.stun = 0.12;
      m.flinch = Math.min(1.2, m.flinch + 0.5 + amount / m.sp.hp);
      if (!m.flash) m.R.meshes.forEach(p => { p.userData.mat = p.material; p.material = FLASH; });
      m.flash = 0.06;
      if (m.hp > 0) return { killed: false, head, m };
      m.dead = 0; m.state = 'dead'; m.vy = Math.min(m.vy, 0);
      unflash(m);
      for (let i = meshes.length - 1; i >= 0; i--) if (meshes[i].userData.monster === m) meshes.splice(i, 1);
      blood.burst(m.pos.x, m.pos.y + m.sp.h * 0.6, m.pos.z, 24, m.sp.blood);
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
      if ((spawnT -= dt) <= 0 && alive < Math.min(maxAlive(elapsed), hooks.cap || Infinity)) { spawn(elapsed); spawnT = spawnEvery(elapsed); }
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (m.dead >= 0) {
          if (dying(m, dt)) { scene.remove(m.R.root); list.splice(i, 1); }
          continue;
        }
        think(m, dt, mul, target);
      }
      separate();
      for (const m of list) if (m.dead < 0) animate(m, dt, target);
      blood.update(dt);
    }

    // Switch between simple and detailed models; monsters already out are rebuilt in place
    function setDetail(hd) {
      if (hd === detail) return;
      detail = hd;
      for (const m of list) {
        if (m.dead >= 0) continue;
        unflash(m);
        const old = m.R, R = build(m.sp, hd);
        R.root.position.copy(old.root.position);
        R.root.rotation.y = m.yaw;
        scene.remove(old.root);
        scene.add(R.root);
        for (let i = meshes.length - 1; i >= 0; i--) if (meshes[i].userData.monster === m) meshes.splice(i, 1);
        R.meshes.forEach(p => { p.userData.monster = m; meshes.push(p); });
        m.R = R; m.pos = R.root.position; m.hd = hd;
      }
    }

    function reset() {
      list.splice(0).forEach(m => scene.remove(m.R.root));
      meshes.length = 0;
      spawnT = 0.5; navT = 0;
      blood.reset();
    }

    return { list, meshes, update, damage, blast, pushOut, reset, speedMul, setSpeed: k => { moveSpeed = k; }, setDetail };
  }

  return { create, build, SPECIES };
})();
