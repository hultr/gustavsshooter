// Monster valley: a long valley at dusk. The monsters come out of the glowing cave at
// the far end and walk towards the player, who starts behind a sandbag barricade.
window.GS = window.GS || {};

GS.Arena = (function () {
  const { mat, outlined, canvasTex } = GS.World;

  function build() {
    const scene = new THREE.Scene();
    const colliders = [], shootables = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // same map every time

    const SKY = 0x6f6688;
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(SKY, 30, 105);
    scene.add(new THREE.HemisphereLight(0xd6ccff, 0x4d4a3a, 0.75));
    const sun = new THREE.DirectionalLight(0xffc49a, 0.5);
    sun.position.set(10, 16, -20);
    scene.add(sun);

    // Ground: dark grass with pencil scribbles
    const groundTex = canvasTex(256, (g, s) => {
      g.fillStyle = '#6c7552'; g.fillRect(0, 0, s, s);
      g.lineWidth = 2;
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = `rgba(30,35,20,${0.15 + Math.random() * 0.2})`;
        const x = Math.random() * s, y = Math.random() * s;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y - 8); g.stroke();
      }
      g.strokeStyle = 'rgba(30,30,20,0.25)'; g.strokeRect(1, 1, s - 2, s - 2);
    });
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(13, 27);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(52, 110), new THREE.MeshLambertMaterial({ map: groundTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -37;
    scene.add(ground);
    shootables.push(ground);

    function solid(m, x, z, hw, hd, top) {
      scene.add(m);
      shootables.push(m);
      colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd, top });
      return m;
    }
    function box(x, y, z, w, h, d, color) {
      const m = outlined(new THREE.BoxGeometry(w, h, d), color);
      m.position.set(x, y + h / 2, z);
      return solid(m, x, z, w / 2, d / 2, y + h);
    }
    // Overhead pieces: colliders only know their top, so these must not block anything
    function roof(x, y, z, w, h, d, color) {
      const m = outlined(new THREE.BoxGeometry(w, h, d), color);
      m.position.set(x, y + h / 2, z);
      scene.add(m);
      shootables.push(m);
    }

    // Cliffs down both sides, walls at both ends
    for (let z = 14; z > -86; z -= 8) {
      for (const s of [-1, 1]) box(s * 24.5, 0, z - 4, 3, 5 + rnd() * 4, 8.2, rnd() < 0.5 ? 0x7a7064 : 0x6e665b);
    }
    box(0, 0, 17, 52, 4, 1, 0x7a7064);

    // The cave: a wall with a gate, a short tunnel and a green glow inside
    box(-15.5, 0, -82, 21, 10, 4, 0x6e665b);
    box(15.5, 0, -82, 21, 10, 4, 0x6e665b);
    roof(0, 6, -82, 10, 4, 4, 0x5e574e);
    box(-5.5, 0, -87, 1, 7, 6, 0x2e2a26);
    box(5.5, 0, -87, 1, 7, 6, 0x2e2a26);
    roof(0, 6, -87, 12, 1, 6, 0x2e2a26);
    box(0, 0, -90.5, 12, 7, 1, 0x1a1a1a);
    const glowTex = canvasTex(128, (g, s) => {
      const grd = g.createRadialGradient(s / 2, s * 0.6, 4, s / 2, s * 0.6, s * 0.6);
      grd.addColorStop(0, '#b6ff7a'); grd.addColorStop(0.35, '#3f8f25'); grd.addColorStop(1, '#0c120a');
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
    });
    const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, fog: false });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), glowMat);
    glow.position.set(0, 3, -89.9);
    scene.add(glow);

    // Sandbag barricade in front of the player, with gaps the monsters come through
    [[-19, -12], [-8, -3], [3, 8], [12, 19]].forEach(([a, b]) => box((a + b) / 2, 0, -2, b - a, 1.1, 0.9, 0xb49f74));
    box(0, 0, 11, 8, 1.2, 3, 0x8a7d68);          // low platform to shoot from
    box(-16, 0, 5, 1.4, 1.4, 1.4, 0xd9a55c);
    box(15, 0, 6, 1.6, 1.6, 1.6, 0xd9a55c);

    // Rocks
    [[-12, -22, 1.6], [9, -30, 2], [-4, -42, 1.4], [15, -52, 2.2], [-15, -58, 1.8], [5, -66, 1.5]].forEach(([x, z, s]) => {
      const m = outlined(new THREE.DodecahedronGeometry(s, 0), 0x8b8478);
      m.position.set(x, s * 0.55, z);
      m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      m.scale.set(1.2, 0.8, 1);
      solid(m, x, z, s * 1.1, s * 0.9, s * 1.3);
    });

    // Dead trees
    [[-17, -12, 6], [18, -20, 7], [-19, -40, 6.5], [19, -62, 7], [-9, -70, 6], [8, -48, 5.5]].forEach(([x, z, h]) => {
      const t = outlined(new THREE.CylinderGeometry(0.18, 0.35, h, 6), 0x5a4a3a);
      t.position.set(x, h / 2, z);
      solid(t, x, z, 0.4, 0.4, h);
      for (let i = 0; i < 3; i++) {
        const len = h * (0.35 - i * 0.07), a = (i % 2 ? 1 : -1) * (0.7 + rnd() * 0.4);
        const b = outlined(new THREE.CylinderGeometry(0.04, 0.1, len, 5), 0x5a4a3a);
        b.position.set(x - Math.sin(a) * len / 2, h * (0.55 + i * 0.15) + Math.cos(a) * len / 2, z);
        b.rotation.z = a;
        scene.add(b);
      }
    });

    // Broken stone pillars
    [[-6, -16, 2.5], [6, -36, 1.2], [-2, -56, 3], [11, -72, 2]].forEach(([x, z, h]) => {
      const p = outlined(new THREE.CylinderGeometry(0.6, 0.7, h, 8), 0xbdb5a6);
      p.position.set(x, h / 2, z);
      solid(p, x, z, 0.7, 0.7, h);
      const top = outlined(new THREE.BoxGeometry(0.9, 0.3, 0.9), 0xbdb5a6);
      top.position.set(x + 0.1, h + 0.1, z);
      top.rotation.set(0.3, 0.5, 0.2);
      scene.add(top);
    });

    // Crosses along the sides (just decoration)
    for (let i = 0; i < 8; i++) {
      const x = (i % 2 ? 1 : -1) * (19 + rnd() * 2), z = -8 - i * 8 - rnd() * 3;
      const g = new THREE.Group();
      const v = outlined(new THREE.BoxGeometry(0.15, 1.2, 0.1), 0x5a4a3a);
      v.position.y = 0.6;
      const h = outlined(new THREE.BoxGeometry(0.6, 0.12, 0.1), 0x5a4a3a);
      h.position.y = 0.85;
      g.add(v, h);
      g.position.set(x, 0, z);
      g.rotation.set(0, rnd() - 0.5, (rnd() - 0.5) * 0.3);
      scene.add(g);
    }

    function update(dt, time) {
      glowMat.color.setScalar(0.8 + Math.sin(time * 2) * 0.2);
    }

    return {
      scene, colliders, shootables, update,
      start: { x: 0, z: 8, yaw: 0 },
      bounds: { minX: -24, maxX: 24, minZ: -90, maxZ: 16 },
      spawn: { x: 0, z: -87, w: 7, d: 3 },
    };
  }

  return { build };
})();
