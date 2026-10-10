// Runthrough: Office X, built from the floor plans, the photos and the walk-through video of
// a real office (kept out of the repo in assets/office/; floorplan.svg marks where each view was
// taken; positions are measured on the plans). You start outside the main entrance
// (HUVUDENTRÉ) and have to get out through the revolving door at the far end of the South
// building. The way the video goes: revolving door → café, down the lane between the counter and
// the seating steps → turnstiles → the corridor, squeezing between the WC blocks of the pod
// column by the café → the Concept lab (the garage, where the video cuts, so its inside is
// guessed) → the stair hall ("same feature" on the plan) → the passage through the South
// building past its two-storey room pods → turnstiles → reception → revolving door.
// Rolling sign stands, mail carts and scissor lifts block the obvious way in a few places, so
// you have to cut through a room or round the side. Monsters come out of the rooms along the
// way and from the open team areas at the sides.
// x runs east (right on the plan), z south (down on the plan); 1 m on the plan is ~0.8 m here.
window.GS = window.GS || {};

GS.Runthrough = (function () {
  const PI = Math.PI;
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // same office every time
  const rr = (a, b) => a + (b - a) * rnd();

  // ---------- Textures drawn in code; each covers `mu` x `mv` metres ----------
  function canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return c;
  }
  function tex(c, mu, mv = mu) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / mu, 1 / mv);
    t.anisotropy = 8;
    return t;
  }
  const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  function speckle(g, w, h, n, base, spread, alpha = 0.5, size = 1.5) {
    for (let i = 0; i < n; i++) {
      const v = base + rr(-spread, spread);
      g.fillStyle = rgb(v, v, v, alpha * rnd());
      g.fillRect(rnd() * w, rnd() * h, size * rr(0.5, 1.5), size * rr(0.5, 1.5));
    }
  }

  // Light grey stone planks (lobby, corridor, reception): 1.2 x 0.4 m, staggered
  const tileTex = () => tex(canvas(512, 512, (g, s) => {
    const pw = 256, ph = s / 6;
    for (let r = 0; r < 6; r++) for (let c = -1; c < 2; c++) {
      const x = c * pw + (r % 2 ? 128 : 0), y = r * ph, v = rr(-14, 10);
      g.save(); g.beginPath(); g.rect(x, y, pw, ph); g.clip();
      g.fillStyle = rgb(170 + v, 168 + v, 163 + v); g.fillRect(x, y, pw, ph);
      for (let k = 0; k < 5; k++) {
        g.strokeStyle = rgb(110, 108, 104, rr(0.05, 0.16)); g.lineWidth = rr(0.6, 2.2);
        g.beginPath(); g.moveTo(x + rr(-40, pw), y + rr(0, ph));
        g.bezierCurveTo(x + rr(0, pw), y + rr(0, ph), x + rr(0, pw), y + rr(0, ph), x + rr(0, pw + 40), y + rr(0, ph));
        g.stroke();
      }
      g.restore();
      g.fillStyle = 'rgba(105,102,97,0.8)';
      g.fillRect(x, y, pw, 2); g.fillRect(x, y, 2, ph);
    }
    speckle(g, s, s, 5000, 160, 50, 0.25);
  }), 2.4);
  // Carpet: dark runner (corridors) and light grey (offices)
  const carpetTex = (base, mu) => tex(canvas(256, 256, (g, s) => {
    g.fillStyle = rgb(base, base + 2, base + 4); g.fillRect(0, 0, s, s);
    speckle(g, s, s, 9000, base, 30, 0.6, 1.4);
    for (let y = 0; y < s; y += 4) { g.fillStyle = rgb(0, 0, 0, 0.04); g.fillRect(0, y, s, 1); }
  }), mu);
  // Concrete garage floor: blotches, a few cracks and saw-cut joints every 3 m
  const concreteTex = () => tex(canvas(512, 512, (g, s) => {
    g.fillStyle = '#8f8e8a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      const x = rnd() * s, y = rnd() * s, r = rr(20, 120), v = rr(90, 170);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rgb(v, v, v - 4, 0.12)); gr.addColorStop(1, rgb(v, v, v, 0));
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    speckle(g, s, s, 9000, 140, 60, 0.3);
    g.strokeStyle = 'rgba(50,50,48,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      let x = rnd() * s, y = rnd() * s;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += rr(-25, 25); y += rr(-25, 25); g.lineTo(x, y); }
      g.stroke();
    }
    g.fillStyle = 'rgba(40,40,38,0.6)';
    g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s); g.fillRect(0, s / 2, s, 2); g.fillRect(s / 2, 0, 2, s);
  }), 6);
  // Red-orange factory brick (the old factory buildings), 9 bricks a row, 26 rows in 2 m
  const brickTex = () => tex(canvas(512, 512, (g, s) => {
    g.fillStyle = '#c4b49f'; g.fillRect(0, 0, s, s);
    const rows = 26, per = 9, rh = s / rows, bw = s / per;
    for (let r = 0; r < rows; r++) for (let c = -1; c <= per; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * rh;
      const t = rnd(), base = t < 0.15 ? [150, 72, 50] : t < 0.3 ? [190, 112, 76] : [168, 88, 60];
      const v = rr(-18, 14);
      g.fillStyle = rgb(base[0] + v, base[1] + v * 0.7, base[2] + v * 0.6);
      g.fillRect(x + 2, y + 2, bw - 3, rh - 3);
      g.fillStyle = rgb(60, 25, 15, rr(0, 0.18));
      g.fillRect(x + 2, y + rh - 5, bw - 3, 3);
    }
    speckle(g, s, s, 6000, 100, 60, 0.18);
  }), 2);
  // Birch plywood wall panels, 1.2 m wide, with grain and seams
  const woodTex = () => tex(canvas(512, 512, (g, s) => {
    for (let p = 0; p < 2; p++) {
      const x0 = p * 256, v = rr(-10, 10);
      g.fillStyle = rgb(222 + v, 199 + v, 160 + v); g.fillRect(x0, 0, 256, s);
      for (let k = 0; k < 70; k++) {
        g.strokeStyle = rgb(150, 115, 70, rr(0.04, 0.12)); g.lineWidth = rr(0.5, 2);
        let x = x0 + rnd() * 256;
        g.beginPath(); g.moveTo(x, 0);
        for (let y = 0; y <= s; y += 32) { x += rr(-3, 3); g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = 'rgba(120,95,60,0.7)'; g.fillRect(x0, 0, 3, s);
    }
    g.fillStyle = 'rgba(120,95,60,0.6)'; g.fillRect(0, 0, s, 3);
  }), 2.4);
  // Beige acoustic wall panels (wood wool), 1.2 x 0.6 m with dark seams: the pod and WC walls
  // in the video (0:17, 0:25-0:31)
  const panelTex = () => tex(canvas(256, 256, (g, s) => {
    g.fillStyle = '#d4c6ad'; g.fillRect(0, 0, s, s);
    speckle(g, s, s, 9000, 196, 45, 0.35, 1.6);
    g.fillStyle = 'rgba(118,102,80,0.7)';
    for (let i = 0; i < 2; i++) g.fillRect(i * 128, 0, 2, s);
    for (let j = 0; j < 4; j++) g.fillRect(0, j * 64, s, 2);
  }), 2.4);
  const plainTex = (base, n, spread, mu) => tex(canvas(128, 128, (g, s) => {
    g.fillStyle = rgb(base[0], base[1], base[2]); g.fillRect(0, 0, s, s);
    speckle(g, s, s, n, (base[0] + base[1] + base[2]) / 3, spread, 0.35);
  }), mu);
  // Outdoor paving: wet grey slabs
  const pavingTex = () => tex(canvas(256, 256, (g, s) => {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const v = rr(-12, 12);
      g.fillStyle = rgb(108 + v, 110 + v, 110 + v); g.fillRect(i * 64, j * 64, 64, 64);
    }
    speckle(g, s, s, 4000, 110, 40, 0.4);
    g.fillStyle = 'rgba(40,42,44,0.8)';
    for (let i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 2, s); g.fillRect(0, i * 64, s, 2); }
  }), 2.4);
  // Black ceiling with an open mesh grid (the office ceilings in the photos)
  const ceilingTex = () => tex(canvas(256, 256, (g, s) => {
    g.fillStyle = '#2a2b2e'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#3c3e43';
    for (let i = 0; i < s; i += 16) { g.fillRect(i, 0, 1, s); g.fillRect(0, i, s, 1); }
  }), 2.4);
  // Window: pale overcast sky in a dark frame with a transom
  const windowTex = () => tex(canvas(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#eef3f6'); gr.addColorStop(0.7, '#c9d6de'); gr.addColorStop(1, '#a9b5ad');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3c3f';
    g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
    g.fillRect(0, h * 0.3, w, 4); g.fillRect(w / 2 - 2, 0, 4, h);
  }), 1.2, 2.4);
  // Roller door slats
  const slatTex = () => tex(canvas(64, 64, (g, s) => {
    for (let y = 0; y < s; y += 8) {
      const gr = g.createLinearGradient(0, y, 0, y + 8);
      gr.addColorStop(0, '#b9bcbf'); gr.addColorStop(0.5, '#9a9da1'); gr.addColorStop(1, '#6f7276');
      g.fillStyle = gr; g.fillRect(0, y, s, 8);
    }
  }), 1, 0.8);

  // The black-and-white doodle wall in the café (views A and B)
  function muralCanvas() {
    return canvas(1024, 512, (g, w, h) => {
      g.fillStyle = '#efede7'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#151515'; g.fillStyle = '#151515'; g.lineCap = g.lineJoin = 'round';
      for (let i = 0; i < 70; i++) {
        const x = rnd() * w, y = rnd() * h, r = rr(12, 45);
        g.lineWidth = rr(2, 5);
        const k = rnd();
        g.beginPath();
        if (k < 0.25) { // face with eyes
          g.arc(x, y, r, 0, PI * 2); g.stroke();
          g.beginPath(); g.arc(x - r * 0.35, y - r * 0.2, r * 0.15, 0, PI * 2); g.arc(x + r * 0.35, y - r * 0.2, r * 0.15, 0, PI * 2); g.fill();
          g.beginPath(); g.arc(x, y + r * 0.15, r * 0.45, 0.2, PI - 0.2); g.stroke();
        } else if (k < 0.45) { // spiral
          for (let a = 0; a < 14; a += 0.3) g.lineTo(x + Math.cos(a) * a * r / 14, y + Math.sin(a) * a * r / 14);
          g.stroke();
        } else if (k < 0.6) { // zigzag
          g.moveTo(x, y);
          for (let j = 0; j < 7; j++) g.lineTo(x + j * r * 0.4, y + (j % 2 ? r * 0.5 : 0));
          g.stroke();
        } else if (k < 0.72) { // star
          for (let j = 0; j <= 10; j++) { const a = j * PI / 5, q = j % 2 ? r * 0.45 : r; g.lineTo(x + Math.sin(a) * q, y - Math.cos(a) * q); }
          g.stroke();
        } else if (k < 0.85) { // truck
          g.strokeRect(x, y, r * 2.2, r); g.strokeRect(x + r * 2.2, y + r * 0.2, r * 0.9, r * 0.8);
          g.beginPath(); g.arc(x + r * 0.5, y + r * 1.1, r * 0.25, 0, PI * 2); g.arc(x + r * 2.6, y + r * 1.1, r * 0.25, 0, PI * 2); g.stroke();
        } else { // words
          g.font = `bold ${r | 0}px Arial`; g.lineWidth = 2;
          g.strokeText(['OFFICE X', 'GO!', 'IDEAS', 'ZOOM', 'WOW', 'FIKA', 'AI'][(rnd() * 7) | 0], x, y);
        }
      }
    });
  }

  // Signs: text on a panel (canvas texture), one mesh each
  function signCanvas(draw, w, h) { return canvas(w, h, draw); }
  function officeSign(g, w, h) {
    g.fillStyle = '#18191b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${h * 0.45}px Arial, Helvetica, sans-serif`;
    g.fillText('Office X', w / 2, h * 0.42);
    g.font = `${h * 0.1}px Arial, Helvetica, sans-serif`;
    g.fillText('W E L C O M E', w / 2, h * 0.8);
  }
  function noCameraSign(g, w, h) {
    g.fillStyle = '#d6201f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.fillRect(w * 0.12, h * 0.06, w * 0.76, h * 0.56);
    g.fillStyle = '#222'; g.fillRect(w * 0.3, h * 0.25, w * 0.4, h * 0.22); g.fillRect(w * 0.42, h * 0.2, w * 0.14, h * 0.06);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.5, h * 0.36, w * 0.08, 0, PI * 2); g.fill();
    g.strokeStyle = '#d6201f'; g.lineWidth = w * 0.06;
    g.beginPath(); g.arc(w / 2, h * 0.34, w * 0.3, 0, PI * 2); g.stroke();
    g.beginPath(); g.moveTo(w * 0.29, h * 0.15); g.lineTo(w * 0.71, h * 0.53); g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `bold ${h * 0.1}px Arial`;
    g.fillText('PLEASE', w / 2, h * 0.76); g.fillText('NO CAMERA', w / 2, h * 0.9);
  }
  // The signs on the rolling stands: red "closed, use the other way" and yellow "ceiling work"
  function closedSign(g, w, h) {
    g.fillStyle = '#d6201f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = w * 0.03; g.strokeRect(w * 0.06, w * 0.06, w * 0.88, h - w * 0.12);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${h * 0.13}px Arial`; g.fillText('CLOSED', w / 2, h * 0.17);
    g.font = `bold ${h * 0.075}px Arial`; g.fillText('PLEASE USE', w / 2, h * 0.33); g.fillText('OTHER WAY', w / 2, h * 0.42);
    g.beginPath(); g.arc(w / 2, h * 0.7, w * 0.25, 0, PI * 2); g.fill();
    g.fillStyle = '#d6201f'; g.fillRect(w * 0.32, h * 0.7 - w * 0.06, w * 0.36, w * 0.12);
  }
  function liftSign(g, w, h) {
    g.fillStyle = '#f2c417'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#111'; g.lineWidth = w * 0.04; g.strokeRect(w * 0.06, w * 0.06, w * 0.88, h - w * 0.12);
    g.lineJoin = 'round'; g.lineWidth = w * 0.06;
    g.beginPath(); g.moveTo(w / 2, h * 0.12); g.lineTo(w * 0.82, h * 0.5); g.lineTo(w * 0.18, h * 0.5); g.closePath(); g.stroke();
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${h * 0.2}px Arial`; g.fillText('!', w / 2, h * 0.37);
    g.font = `bold ${h * 0.08}px Arial`; g.fillText('CEILING WORK', w / 2, h * 0.64); g.fillText('KEEP OUT', w / 2, h * 0.76);
    g.font = `${h * 0.055}px Arial`; g.fillText('use the other way', w / 2, h * 0.87);
  }
  function incubatorSign(g, w, h) {
    g.fillStyle = '#ecebe6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#222'; g.textAlign = 'center';
    g.font = `${h * 0.06}px Arial`; g.fillText('Startup incubator', w / 2, h * 0.16);
    g.strokeStyle = '#222'; g.lineWidth = 3;
    g.beginPath(); g.arc(w / 2, h * 0.4, w * 0.12, 0.2, PI - 0.2); g.stroke();
    g.beginPath(); g.moveTo(w / 2, h * 0.42); g.lineTo(w / 2, h * 0.3); g.stroke();
    g.beginPath(); g.ellipse(w * 0.45, h * 0.3, w * 0.05, h * 0.02, -0.5, 0, PI * 2); g.ellipse(w * 0.55, h * 0.3, w * 0.05, h * 0.02, 0.5, 0, PI * 2); g.stroke();
    g.font = `${h * 0.035}px Arial`;
    g.fillText('Co-create to accelerate', w / 2, h * 0.6); g.fillText('sustainable mobility', w / 2, h * 0.65);
    g.font = `600 ${h * 0.05}px Arial`; g.fillText('Office X', w / 2, h * 0.88);
  }
  function label(text) {
    return (g, w, h) => {
      g.fillStyle = '#18191b'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `600 ${h * 0.5}px Arial, Helvetica, sans-serif`;
      g.fillText(text, w / 2, h * 0.52);
    };
  }
  function letters(text, color) {
    return (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `bold ${h * 0.8}px Georgia, 'Times New Roman', serif`;
      g.fillText(text.split('').join(String.fromCharCode(8202)), w / 2, h * 0.55);
    };
  }

  function build() {
    const scene = new THREE.Scene();
    const colliders = [], shootables = [], spawns = [];
    const SKY = 0xb4bdc4;   // overcast evening
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(0xbdbab3, 28, 110);
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x5d5850, 0.7));
    scene.add(new THREE.AmbientLight(0xffffff, 0.08));
    const sun = new THREE.DirectionalLight(0xffffff, 0.3);
    sun.position.set(0.35, 1, 0.55);
    scene.add(sun);

    // ---------- Materials ----------
    const lam = (o) => new THREE.MeshLambertMaterial(o);
    const offset = m => Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const M = {
      tile: lam({ map: tileTex() }),
      carpet: offset(lam({ map: carpetTex(64, 2) })),
      office: lam({ map: carpetTex(140, 2) }),
      concrete: lam({ map: concreteTex() }),
      brick: lam({ map: brickTex() }),
      wood: lam({ map: woodTex() }),
      oak: lam({ map: woodTex(), color: 0xc8a070 }),
      plaster: lam({ map: plainTex([232, 229, 223], 800, 20, 2) }),
      felt: lam({ map: plainTex([104, 108, 112], 1500, 30, 1) }),
      paving: lam({ map: pavingTex() }),
      ceiling: lam({ map: ceilingTex() }),
      slats: lam({ map: slatTex() }),
      asphalt: lam({ map: plainTex([70, 72, 74], 2500, 30, 3) }),
      window: new THREE.MeshBasicMaterial({ map: windowTex() }),
      lamp: new THREE.MeshBasicMaterial({ color: 0xfffcf2 }),
      skylight: new THREE.MeshBasicMaterial({ color: 0xe6eef3 }),
      screen: new THREE.MeshBasicMaterial({ color: 0x23466e }),
      led: new THREE.MeshBasicMaterial({ color: 0x3cff7a }),
      glass: new THREE.MeshPhongMaterial({ color: 0xc4dde6, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, shininess: 90, specular: 0x666666 }),
      blueGlass: new THREE.MeshPhongMaterial({ color: 0x4f86d0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, shininess: 90, specular: 0x555555 }),
      steel: new THREE.MeshPhongMaterial({ color: 0xc3c7cc, shininess: 70, specular: 0x777777 }),
      duct: new THREE.MeshPhongMaterial({ color: 0xb8bcc0, shininess: 40, specular: 0x555555 }),
      white: lam({ color: 0xf1f0ec }),
      dark: lam({ color: 0x1f2022 }),
      grey: lam({ color: 0x5d6064 }),
      black: lam({ color: 0x121212 }),
      orange: lam({ color: 0xe0732c }),
      red: lam({ color: 0xb8322a }),
      yellow: offset(lam({ color: 0xf0c22a })),
      yellowPaint: lam({ color: 0xf0c22a }),
      green: lam({ color: 0x2f6b47 }),
      leaf: lam({ color: 0x3f7a35, flatShading: true }),
      hedge: lam({ color: 0x35582c, flatShading: true }),
      trunk: lam({ color: 0x4d3b2c }),
      blue: lam({ color: 0x2c5aa0 }),
      navy: lam({ color: 0x1f3550 }),
      pink: lam({ color: 0xc98a9c }),
      purple: lam({ color: 0x6d5a8e }),
      truck: lam({ color: 0xeef0f2 }),
      cushion: lam({ color: 0x8f9a74 }),
      cardboard: lam({ color: 0xa87c4f }),
      kraft: lam({ color: 0xcaa574 }),
      liftBlue: lam({ color: 0x1f63c6 }),
      panel: lam({ map: panelTex() }),
      teal: lam({ color: 0x3d5e5a }),
      lime: lam({ color: 0xc8c47e }),
      paleBlue: offset(lam({ color: 0x8fb2c0 })),
      curtain: new THREE.MeshLambertMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
    };

    // ---------- Geometry: everything static is merged per material and per 32 m strip ----------
    // While a barrier variant is being built (`into`), its geometry, colliders and signs go
    // into the variant instead, so it can be switched on and off.
    const parts = new Map();
    let into = null;
    function add(m, geo) {
      GS.Geo.projectUV(geo, 1);       // UVs in metres; each texture's repeat sets its size
      geo.computeBoundingBox();
      const cx = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2;
      const key = m.uuid + ':' + Math.floor(cx / 32), P = into ? into.parts : parts;
      if (!P.has(key)) P.set(key, { m, geos: [] });
      P.get(key).geos.push(geo);
    }
    // pass: monsters climb over it (the turnstiles)
    function collide(x0, z0, x1, z1, top, pass) {
      (into ? into.cols : colliders).push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), top, pass });
    }
    // axis-aligned box from (x0,y0,z0) to (x1,y1,z1); solid ones block walking
    function box(m, x0, y0, z0, x1, y1, z1, solid) {
      if (x1 - x0 <= 0 || y1 - y0 <= 0 || z1 - z0 <= 0) return;
      add(m, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
      if (solid) collide(x0, z0, x1, z1, y1);
    }
    function cyl(m, x, y, z, r0, r1, h, seg = 12) {
      add(m, new THREE.CylinderGeometry(r0, r1, h, seg).translate(x, y + h / 2, z));
    }
    function ball(m, x, y, z, r, sy = 1) {
      add(m, new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z));
    }
    function ductX(x0, x1, y, z, r) { add(M.duct, new THREE.CylinderGeometry(r, r, x1 - x0, 14, 1, true).rotateZ(PI / 2).translate((x0 + x1) / 2, y, z)); }
    function ductZ(z0, z1, y, x, r) { add(M.duct, new THREE.CylinderGeometry(r, r, z1 - z0, 14, 1, true).rotateX(PI / 2).translate(x, y, (z0 + z1) / 2)); }

    // Walls with door openings. Doors are centres (2.2 m wide, 2.7 m high) or [centre, width, height].
    // The part above a door is decoration only (colliders only know their top).
    const DOOR = 2.2, DOOR_H = 2.7;
    function wall(m, alongX, c, a0, a1, h, doors = [], t = 0.2) {
      const gaps = doors.map(d => (Array.isArray(d) ? d : [d])).map(([at, w = DOOR, dh = DOOR_H]) => [at - w / 2, at + w / 2, dh]).sort((p, q) => p[0] - q[0]);
      const seg = (s0, s1, y0, y1, solid) => alongX ? box(m, s0, y0, c - t / 2, s1, y1, c + t / 2, solid) : box(m, c - t / 2, y0, s0, c + t / 2, y1, s1, solid);
      let cur = a0;
      for (const [g0, g1, dh] of gaps) {
        seg(cur, g0, 0, h, true);
        if (dh < h) seg(g0, g1, dh, h, false);
        cur = g1;
      }
      seg(cur, a1, 0, h, true);
    }
    const wallZ = (m, z, x0, x1, h, doors, t) => wall(m, true, z, x0, x1, h, doors, t);   // runs along x
    const wallX = (m, x, z0, z1, h, doors, t) => wall(m, false, x, z0, z1, h, doors, t);  // runs along z

    // Monsters appear inside rooms and at the far side of the team areas
    function spawnAt(x0, z0, x1, z1) {
      const x = (x0 + x1) / 2, z = (z0 + z1) / 2;
      spawns.push({ x, z, w: Math.max(0.2, x1 - x0), d: Math.max(0.2, z1 - z0), s: 0 });   // s: set by randomize()
    }

    // A room: four walls, a roof, a ceiling light, a table, a spawn point.
    // doors: { n, s, e, w } lists of door centres
    function room(x0, z0, x1, z1, o = {}) {
      const h = o.h || 3.6, m = o.m || M.panel, d = o.doors || {};
      // walls on the outer walls, or shared with a room built before (o.skip), are left out
      const skip = o.skip || [], has = k => !skip.includes(k);
      if (o.walls !== false) {
        if (has('n') && z0 > 0.05) wallZ(m, z0, x0, x1, h, d.n);
        if (has('s') && z1 < 47.45) wallZ(m, z1, x0, x1, h, d.s);
        if (has('w') && x0 > 0.05) wallX(m, x0, z0, z1, h, d.w);
        if (has('e') && x1 < 211.95) wallX(m, x1, z0, z1, h, d.e);
      }
      if (o.roof !== false) box(o.roofM || M.plaster, x0 - 0.1, h, z0 - 0.1, x1 + 0.1, h + 0.15, z1 + 0.1);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (o.roof !== false) box(M.lamp, cx - 0.6, h - 0.03, cz - 0.6, cx + 0.6, h - 0.01, cz + 0.6);
      if (o.table !== false && x1 - x0 > 3.5 && z1 - z0 > 3.5) meetingTable(cx, cz, x1 - x0 > z1 - z0);
      if (o.glass) {   // glass front for the "video" rooms
        const [side, a0, a1] = o.glass;
        if (side === 'n' || side === 's') box(M.blueGlass, a0, 0.9, (side === 'n' ? z0 : z1) - 0.13, a1, h - 0.3, (side === 'n' ? z0 : z1) + 0.13);
        else box(M.blueGlass, (side === 'w' ? x0 : x1) - 0.13, 0.9, a0, (side === 'w' ? x0 : x1) + 0.13, h - 0.3, a1);
      }
      if (o.spawn !== false) spawnAt(x0 + 1, z0 + 1, x1 - 1, z1 - 1);
    }
    function meetingTable(cx, cz, alongX) {
      const L = 2.2, W = 1;
      const [hx, hz] = alongX ? [L / 2, W / 2] : [W / 2, L / 2];
      box(M.white, cx - hx, 0.72, cz - hz, cx + hx, 0.76, cz + hz);
      box(M.grey, cx - 0.1, 0, cz - 0.1, cx + 0.1, 0.72, cz + 0.1);
      for (let k = -1; k <= 1; k += 2) for (let j = -1; j <= 1; j += 2) {
        const px = alongX ? cx + j * 0.6 : cx + k * (hx + 0.35), pz = alongX ? cz + k * (hz + 0.35) : cz + j * 0.6;
        chair(px, pz, alongX ? (k < 0 ? 's' : 'n') : (k < 0 ? 'e' : 'w'), M.black);
      }
    }
    // An office chair facing f ('n', 's', 'e', 'w')
    function chair(x, z, f, m = M.black) {
      box(m, x - 0.25, 0.42, z - 0.25, x + 0.25, 0.5, z + 0.25);
      cyl(M.grey, x, 0.05, z, 0.03, 0.03, 0.37, 6);
      const b = { n: [0, 0.22], s: [0, -0.22], e: [-0.22, 0], w: [0.22, 0] }[f];
      if (b[0]) box(m, x + b[0] - 0.04, 0.5, z - 0.24, x + b[0] + 0.04, 1.05, z + 0.24);
      else box(m, x - 0.24, 0.5, z + b[1] - 0.04, x + 0.24, 1.05, z + b[1] + 0.04);
    }
    function plant(x, z, s = 1) {
      cyl(M.dark, x, 0, z, 0.28 * s, 0.22 * s, 0.5 * s, 10);
      for (let i = 0; i < 6; i++) ball(M.leaf, x + rr(-0.3, 0.3) * s, (0.8 + rr(0, 1)) * s, z + rr(-0.3, 0.3) * s, rr(0.25, 0.4) * s);
      cyl(M.trunk, x, 0.5 * s, z, 0.03, 0.04, 1.3 * s, 5);
    }
    // Rows of white desks with screens, felt dividers and black chairs (views K and L).
    // Clusters are 1.6 m x 4.8 m, 2.4 m apart along the rows and 2.2 m from the sides, so the
    // doors of the rooms next to them stay free.
    function desks(x0, x1, z0, z1, farSide) {
      let n = 0;
      for (let x = x0 + 2.2; x + 1.6 <= x1 - 2.19; x += 3.4) {
        for (let z = z0 + 2.4; z + 4.8 <= z1 - 1.2; z += 7.2) {
          box(M.white, x, 0.72, z, x + 1.6, 0.75, z + 4.8);
          box(M.grey, x + 0.05, 0, z, x + 1.55, 0.72, z + 0.05, false);
          box(M.grey, x + 0.05, 0, z + 4.75, x + 1.55, 0.72, z + 4.8, false);
          box(M.felt, x + 0.78, 0.75, z + 0.1, x + 0.82, 1.2, z + 4.7);
          collide(x, z, x + 1.6, z + 4.8, 0.75);
          for (let k = 0; k < 3; k++) {
            const zc = z + 0.8 + k * 1.6;
            box(M.black, x + 0.62, 0.8, zc - 0.3, x + 0.65, 1.15, zc + 0.3);
            box(M.black, x + 0.95, 0.8, zc - 0.3, x + 0.98, 1.15, zc + 0.3);
            if (rnd() < 0.8) chair(x - 0.35, zc, 'e');
            if (rnd() < 0.8) chair(x + 1.95, zc, 'w');
          }
          n++;
        }
      }
      // monsters sneak in from the far side, away from the corridor
      if (farSide === 'n') spawnAt(x0 + 1, z0 + 0.6, x1 - 1, z0 + 1.8);
      if (farSide === 's') spawnAt(x0 + 1, z1 - 1.8, x1 - 1, z1 - 0.6);
      return n;
    }
    function windowsZ(z, x0, x1, skip = []) {
      for (let x = x0; x + 2.2 <= x1; x += 4.5) {
        if (skip.some(([a, b]) => x + 2.2 > a && x < b)) continue;
        box(M.window, x, 1.4, z - 0.14, x + 2.2, 5.6, z + 0.14);
      }
    }
    function windowsX(x, z0, z1, skip = []) {
      for (let z = z0; z + 2.2 <= z1; z += 4.5) {
        if (skip.some(([a, b]) => z + 2.2 > a && z < b)) continue;
        box(M.window, x - 0.14, 1.4, z, x + 0.14, 5.6, z + 2.2);
      }
    }
    // Ceiling at height h over a rectangle, with LED lines
    function ceiling(x0, z0, x1, z1, h, ledAlongX = true) {
      box(M.ceiling, x0, h, z0, x1, h + 0.1, z1);
      if (ledAlongX) for (let z = z0 + 2.5; z < z1 - 1; z += 5) box(M.lamp, x0 + 1, h - 0.6, z - 0.04, x1 - 1, h - 0.55, z + 0.04);
      else for (let x = x0 + 2.5; x < x1 - 1; x += 5) box(M.lamp, x - 0.04, h - 0.6, z0 + 1, x + 0.04, h - 0.55, z1 - 1);
    }
    // A square LED ring hanging from the ceiling (views F and N)
    function ring(x, z, y, s) {
      box(M.lamp, x - s, y, z - s, x + s, y + 0.05, z - s + 0.06);
      box(M.lamp, x - s, y, z + s - 0.06, x + s, y + 0.05, z + s);
      box(M.lamp, x - s, y, z - s, x - s + 0.06, y + 0.05, z + s);
      box(M.lamp, x + s - 0.06, y, z - s, x + s, y + 0.05, z + s);
    }
    function tree(x, z, h = 6) {
      cyl(M.trunk, x, 0, z, 0.12, 0.2, h * 0.55, 7);
      for (let i = 0; i < 5; i++) ball(M.leaf, x + rr(-0.9, 0.9), h * rr(0.6, 0.85), z + rr(-0.9, 0.9), rr(0.9, 1.4));
      collide(x - 0.3, z - 0.3, x + 0.3, z + 0.3, h);
    }
    const signMats = new Map();   // signs drawn by the same function share a material
    function sign(draw, w, h, cw, ch, x, y, z, rotY, transparent) {
      if (!signMats.has(draw)) {
        const t = new THREE.CanvasTexture(signCanvas(draw, cw, ch));
        t.anisotropy = 4;
        signMats.set(draw, new THREE.MeshBasicMaterial({ map: t, transparent: !!transparent, alphaTest: transparent ? 0.3 : 0 }));
      }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMats.get(draw));
      m.position.set(x, y, z);
      m.rotation.y = rotY;
      if (into) { into.group.add(m); into.shoot.push(m); } else { scene.add(m); shootables.push(m); }
      return m;
    }

    // Revolving door in a wall: drum, canopy, curved glass sides and four turning wings.
    // alongX: you walk through it along x (the exit), otherwise along z (the main entrance).
    const wings = [];
    function revolving(cx, cz, alongX) {
      const R = 1.5, H = 2.6, rot = alongX ? PI / 2 : 0;
      const put = (m, g) => add(m, g.rotateY(rot).translate(cx, 0, cz));
      for (const s of [PI / 4, PI * 5 / 4]) put(M.glass, new THREE.CylinderGeometry(R, R, H, 16, 1, true, s, PI / 2).translate(0, H / 2, 0));
      put(M.steel, new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.35, 28).translate(0, H + 0.17, 0));
      put(M.dark, new THREE.CylinderGeometry(R, R, 0.02, 28).translate(0, 0.01, 0));
      // the curved sides are solid (as boxes on the chord)
      for (const s of [-1, 1]) {
        if (alongX) collide(cx - 1.06, cz + s * 1.38, cx + 1.06, cz + s * 1.52, H);
        else collide(cx + s * 1.38, cz - 1.06, cx + s * 1.52, cz + 1.06, H);
      }
      const g = new THREE.Group();
      g.position.set(cx, 0, cz);
      for (let i = 0; i < 4; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(R - 0.08, H - 0.1, 0.03).translate((R - 0.08) / 2, H / 2, 0), M.glass);
        p.rotation.y = i * PI / 2;
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, H - 0.1, 0.05).translate(R - 0.1, H / 2, 0), M.steel);
        p.add(f);
        g.add(p);
      }
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, H, 8).translate(0, H / 2, 0), M.steel));
      scene.add(g);
      wings.push(g);
    }

    // Speed gates (turnstiles) across a passage: steel cabinets 1 m apart, plus a wide gate.
    // alongX: the line of gates runs along x (you pass through along z)
    function turnstiles(line, a0, a1, wide, alongX) {
      const cab = a => {
        const [x0, z0, x1, z1] = alongX ? [a, line - 0.7, a + 0.2, line + 0.7] : [line - 0.7, a, line + 0.7, a + 0.2];
        box(M.steel, x0, 0, z0, x1, 1.0, z1);
        collide(x0, z0, x1, z1, 1.0, true);
        box(M.dark, x0, 1.0, z0, x1, 1.04, z1);
        const [lx, lz] = alongX ? [a + 0.1, line - 0.6] : [line - 0.6, a + 0.1];
        box(M.led, lx - 0.05, 1.04, lz - 0.05, lx + 0.05, 1.07, lz + 0.05);
        // glass flaps, open
        if (alongX) { box(M.glass, a + 0.2, 0.5, line - 0.25, a + 0.24, 1.15, line + 0.25); }
        else box(M.glass, line - 0.25, 0.5, a + 0.2, line + 0.25, 1.15, a + 0.24);
      };
      for (let a = a0; a < wide - 0.3; a += 1.2) cab(a);
      cab(wide - 0.2);
      // the wide gate's far post
      cab(a1 - 0.2);
    }

    // ---------- Things in the way: mail carts, rolling sign stands and scissor lifts ----------
    // Built in their own frame (long side along x, centred on 0,0) and turned into place;
    // alongX false turns them to run along z. All are too high to jump over.
    function placer(cx, cz, alongX) {
      const put = (m, g) => add(m, g.rotateY(alongX ? 0 : PI / 2).translate(cx, 0, cz));
      return {
        put,
        box: (m, x0, y0, z0, x1, y1, z1) => put(m, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)),
        wheel: (m, x, z, r, w) => put(m, new THREE.CylinderGeometry(r, r, w, 12).rotateX(PI / 2).translate(x, r, z)),
        solid: (hl, hw, top) => alongX ? collide(cx - hl, cz - hw, cx + hl, cz + hw, top) : collide(cx - hw, cz - hl, cx + hw, cz + hl, top),
      };
    }
    // A mail cart: steel frame on four castors, two shelves stacked with parcels and post,
    // a push handle at the -x end. 1.3 m x 0.7 m.
    function mailCart(cx, cz, alongX) {
      const P = placer(cx, cz, alongX), L = 0.53, W = 0.33;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        P.wheel(M.black, sx * (L - 0.08), sz * (W - 0.07), 0.07, 0.05);
        P.box(M.steel, sx * L - 0.015, 0.12, sz * W - 0.015, sx * L + 0.015, 1.0, sz * W + 0.015);
        P.box(M.steel, -L, 0.97, sz * W - 0.015, L, 1.0, sz * W + 0.015);   // top rails
      }
      for (const y of [0.16, 0.6]) P.box(M.grey, -L, y, -W, L, y + 0.03, W);
      // push handle
      for (const sz of [-1, 1]) {
        P.box(M.steel, -L - 0.13, 0.55, sz * (W - 0.05) - 0.015, -L - 0.1, 1.12, sz * (W - 0.05) + 0.015);
        for (const y of [0.6, 0.98]) P.box(M.steel, -L - 0.12, y, sz * (W - 0.05) - 0.012, -L, y + 0.025, sz * (W - 0.05) + 0.012);
      }
      P.put(M.black, new THREE.CylinderGeometry(0.025, 0.025, 2 * W - 0.04, 8).rotateX(PI / 2).translate(-L - 0.115, 1.12, 0));
      // parcels: brown and tan boxes along each shelf, some stacked, the top pile higher
      const parcels = (y, top) => {
        for (let x = -L + 0.03; x < L - 0.2;) {
          const l = Math.min(rr(0.22, 0.45), L - 0.02 - x), w = rr(0.3, 0.6), h = rr(0.14, 0.3), z = rr(-W + 0.03 + w / 2, W - 0.03 - w / 2);
          const m = rnd() < 0.5 ? M.cardboard : M.kraft;
          P.box(m, x, y, z - w / 2, x + l, y + h, z + w / 2);
          P.box(M.white, x + l * 0.3, y + h, z - w / 2 - 0.002, x + l * 0.7, y + h + 0.003, z + w / 2 + 0.002);   // label
          if (top || rnd() < 0.4) P.box(m === M.kraft ? M.cardboard : M.kraft, x + 0.03, y + h, z - w * 0.4, x + l - 0.04, y + h + rr(0.12, top ? 0.3 : 0.18), z + w * 0.35);
          x += l + 0.02;
        }
      };
      parcels(0.19, false);
      parcels(0.63, true);
      // a grey tray of white envelopes on the top pile, and a bundle of post on the lower shelf
      P.box(M.grey, -0.15, 1.15, -0.2, 0.25, 1.2, 0.2);
      for (let i = 0; i < 9; i++) P.box(M.white, -0.13 + i * 0.042, 1.17, -0.17, -0.12 + i * 0.042, 1.17 + rr(0.14, 0.2), 0.17);
      P.box(M.white, L - 0.3, 0.19, -W + 0.04, L - 0.04, 0.27, -W + 0.24);
      P.box(M.white, L - 0.28, 0.27, -W + 0.06, L - 0.06, 0.32, -W + 0.22);
      P.solid(L + 0.13, W, 1.85);
    }
    // A rolling sign stand: heavy round base on castors, a yellow-and-black striped pole, a sign
    // on top facing both ways (rotY turns the sign; 0 faces +z)
    function signStand(x, z, rotY, draw) {
      cyl(M.dark, x, 0.05, z, 0.22, 0.26, 0.08, 20);
      for (let k = 0; k < 4; k++) ball(M.black, x + Math.cos(k * PI / 2 + PI / 4) * 0.18, 0.035, z + Math.sin(k * PI / 2 + PI / 4) * 0.18, 0.035);
      for (let i = 0; i < 12; i++) cyl(i % 2 ? M.black : M.yellowPaint, x, 0.13 + i * 0.1, z, 0.03, 0.03, 0.1, 8);
      cyl(M.dark, x, 0.82, z, 0.05, 0.05, 0.13, 12);   // the belt cassette
      const nx = Math.sin(rotY), nz = Math.cos(rotY), across = Math.abs(nz) > 0.5;
      if (across) box(M.dark, x - 0.27, 1.18, z - 0.02, x + 0.27, 1.92, z + 0.02);
      else box(M.dark, x - 0.02, 1.18, z - 0.27, x + 0.02, 1.92, z + 0.27);
      sign(draw, 0.5, 0.7, 256, 360, x + nx * 0.025, 1.55, z + nz * 0.025, rotY);
      sign(draw, 0.5, 0.7, 256, 360, x - nx * 0.025, 1.55, z - nz * 0.025, rotY + PI);
    }
    // A row of n sign stands from (x0, z0) to (x1, z1) (a line along x or z) with red belts
    // pulled between them; solid as one barrier
    function signRow(x0, z0, x1, z1, n, draws) {
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), R = 0.27;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = n > 1 ? i / (n - 1) : 0.5;
        pts.push(alongX ? [x0 + R + (x1 - x0 - 2 * R) * t, z0] : [x0, z0 + R + (z1 - z0 - 2 * R) * t]);
      }
      pts.forEach(([x, z], i) => signStand(x, z, alongX ? 0 : PI / 2, draws[i % draws.length]));
      for (let i = 1; i < n; i++) {
        const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
        if (alongX) box(M.red, ax + 0.05, 0.86, az - 0.01, bx - 0.05, 0.91, az + 0.01);
        else box(M.red, ax - 0.01, 0.86, az + 0.05, ax + 0.01, 0.91, bz - 0.05);
      }
      if (alongX) collide(x0, z0 - R, x1, z0 + R, 1.92); else collide(x0 - R, z0, x0 + R, z1, 1.92);
    }
    // A blue scissor lift raised to work on the ceiling: chassis on four wheels, crossed arms,
    // a deck with a yellow railing at height `deck`, cables hanging from the ceiling (`ceil`)
    // to the deck. 2.5 m x 1.2 m; solid where the chassis stands.
    function scissorLift(cx, cz, alongX, deck, ceil) {
      const P = placer(cx, cz, alongX), L = 1.25, W = 0.6, A = 1.0;
      P.box(M.liftBlue, -L, 0.14, -W + 0.06, L, 0.62, W - 0.06);
      P.box(M.dark, -L + 0.45, 0.06, -W + 0.08, L - 0.45, 0.14, W - 0.08);   // pothole guards
      P.box(M.dark, -L - 0.03, 0.14, -W + 0.1, -L, 0.4, W - 0.1);           // bumpers
      P.box(M.dark, L, 0.14, -W + 0.1, L + 0.03, 0.4, W - 0.1);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        P.wheel(M.black, sx * (L - 0.3), sz * (W - 0.05), 0.19, 0.14);
        P.wheel(M.grey, sx * (L - 0.3), sz * (W - 0.02), 0.1, 0.14);
      }
      P.box(M.grey, L - 0.35, 0.62, -W + 0.1, L - 0.05, 0.74, W - 0.1);       // battery box
      // the arms: n stages of crossed bars on both sides, with a cross shaft at each pin
      const n = Math.max(3, Math.round((deck - 0.7) / 1.05)), hs = (deck - 0.74) / n;
      const len = Math.hypot(2 * A, hs), ang = Math.atan2(hs, 2 * A);
      for (let i = 0; i < n; i++) {
        const y = 0.74 + hs * (i + 0.5);
        for (const sz of [-1, 1]) for (const d of [-1, 1]) {
          P.put(M.liftBlue, new THREE.BoxGeometry(len, 0.09, 0.05).rotateZ(d * ang).translate(0, y, sz * (W - 0.2) + d * 0.03));
        }
        P.put(M.steel, new THREE.CylinderGeometry(0.035, 0.035, 2 * W - 0.3, 8).rotateX(PI / 2).translate(0, y, 0));
        for (const sx of [-1, 1]) P.put(M.steel, new THREE.CylinderGeometry(0.03, 0.03, 2 * W - 0.3, 8).rotateX(PI / 2).translate(sx * A, y + hs / 2, 0));
      }
      // the deck with toe boards, the railing and a control box
      P.box(M.liftBlue, -L + 0.05, deck - 0.12, -W + 0.06, L - 0.05, deck, W - 0.06);
      P.box(M.grey, -L - 0.05, deck, -W, L + 0.05, deck + 0.05, W);
      for (const [a0, z0, a1, z1] of [[-L - 0.05, -W, L + 0.05, -W + 0.02], [-L - 0.05, W - 0.02, L + 0.05, W], [-L - 0.05, -W, -L - 0.03, W], [L + 0.03, -W, L + 0.05, W]]) {
        P.box(M.grey, a0, deck + 0.05, z0, a1, deck + 0.17, z1);
        for (const y of [0.55, 1.05]) P.box(M.yellowPaint, a0 - 0.01, deck + y, z0 - 0.01, a1 + 0.01, deck + y + 0.04, z1 + 0.01);
      }
      for (const x of [-L - 0.04, 0, L + 0.04]) for (const sz of [-1, 1]) P.box(M.yellowPaint, x - 0.02, deck + 0.05, sz * (W - 0.01) - 0.02, x + 0.02, deck + 1.09, sz * (W - 0.01) + 0.02);
      P.box(M.dark, L - 0.25, deck + 0.85, -0.2, L - 0.05, deck + 1.05, 0.2);
      P.box(M.red, -L + 0.2, deck + 0.05, -0.15, -L + 0.65, deck + 0.3, 0.1);    // toolbox
      P.put(M.orange, new THREE.CylinderGeometry(0.2, 0.2, 0.12, 14).rotateX(PI / 2).translate(-0.2, deck + 0.25, 0.3));   // cable reel
      // cables down from an opened ceiling panel
      if (ceil) {
        P.box(M.grey, 0.15, ceil - 0.12, -0.55, 0.9, ceil - 0.08, 0.05);
        for (const [x, z, m] of [[0.3, -0.3, M.orange], [0.5, -0.2, M.dark], [0.7, -0.35, M.dark]]) {
          P.put(m, new THREE.CylinderGeometry(0.012, 0.012, ceil - deck - 0.9, 4).translate(x, (ceil + deck + 0.9) / 2, z));
        }
      }
      P.solid(L + 0.03, W, deck + 1.1);
    }

    // =========================================================================================
    // Ground and plazas outside
    box(M.asphalt, -40, -0.2, -60, 280, -0.05, 110);
    box(M.paving, 34, -0.05, -20, 74, 0, 0);       // in front of the main entrance
    box(M.paving, 212, -0.05, 2, 234, 0, 38);      // in front of the exit
    const hedge = (x0, z0, x1, z1) => { box(M.hedge, x0, 0, z0, x1, 1.9, z1, true); };
    hedge(34, -20, 35.2, 0); hedge(72.8, -20, 74, 0); hedge(34, -20, 74, -18.8);
    hedge(232.8, 2, 234, 38); hedge(212, 2, 234, 3.2); hedge(212, 36.8, 234, 38);
    [[40, -14], [68, -14], [44, -6], [64, -6], [54, -16.5]].forEach(([x, z]) => tree(x, z, 6.5));
    [[220, 7], [228, 12], [228, 27], [220, 32]].forEach(([x, z]) => tree(x, z, 6));
    for (let x = 47; x <= 61; x += 2) if (Math.abs(x - 53.7) > 2) cyl(M.steel, x, 0, -4, 0.1, 0.1, 0.9, 8);
    for (let z = 12; z <= 27; z += 2) if (Math.abs(z - 19.5) > 2) cyl(M.steel, 217, 0, z, 0.1, 0.1, 0.9, 8);
    [[42, -9], [66, -9]].forEach(([x, z]) => { box(M.oak, x - 1, 0.42, z - 0.25, x + 1, 0.5, z + 0.25); box(M.dark, x - 0.9, 0, z - 0.2, x + 0.9, 0.42, z + 0.2, true); });

    // =========================================================================================
    // The main building (Plan 1): x 0..108, z 0..47.5. Brick outside, ceilings at 6.5 m.
    // Measured on the plan: the café x 46.5..57.6, the corridor z 23.4..25.6 with collaboration
    // strips either side, pod columns at x 10.7, 30.8 and 56, the Concept lab from x 72.6.
    const H1 = 6.5, OUT = 9, HG = 9;
    box(M.tile, 46.5, -0.1, 0, 57.6, 0, 18.6);         // lobby and café
    box(M.office, 0, -0.1, 0, 46.5, 0, 47.5);
    box(M.office, 46.5, -0.1, 18.6, 72.6, 0, 47.5);
    box(M.office, 57.6, -0.1, 0, 72.6, 0, 18.6);
    box(M.concrete, 72.6, -0.1, 0, 101.5, 0, 25.6);    // the Concept lab
    box(M.concrete, 72.6, -0.1, 25.6, 97, 0, 35.8);
    box(M.tile, 72.6, -0.1, 35.8, 108, 0, 47.5);       // the labs round it and the stair hall
    box(M.tile, 97, -0.1, 25.6, 108, 0, 35.8);
    box(M.tile, 101.5, -0.1, 0, 108, 0, 25.6);
    box(M.carpet, 0.2, 0, 23.4, 72.4, 0.01, 25.6);     // dark carpet along the corridor (video 0:13-0:19)
    box(M.carpet, 46.6, 0, 18.6, 50.6, 0.01, 23.4);    // and from the gates to it

    wallZ(M.brick, 0, 0, 108, OUT, [[53.7, 3.0, 2.8]]);
    wallZ(M.brick, 47.5, 0, 108, OUT);
    wallX(M.brick, 0, 0, 47.5, OUT);
    wallX(M.brick, 108, 0, 47.5, OUT, [[22.3, 2.8, 3.0]]);
    windowsZ(0, 2, 106, [[49, 58.5], [72, 76.5], [79, 89]]);
    windowsZ(47.5, 2, 106);
    windowsX(0, 2, 46);
    ceiling(0, 0, 72.6, 47.5, H1);
    ceiling(101.5, 0, 108, 25.6, H1);
    ceiling(97, 25.6, 108, 35.8, H1);
    ceiling(72.6, 35.8, 108, 47.5, H1);
    for (let x = 6; x < 70; x += 12) box(M.skylight, x - 0.8, H1 - 0.02, 1.5, x + 0.8, H1, 46);   // skylights (view L)

    // Outside the main entrance: canopy, COMPANY letters (view J) and the revolving door
    revolving(53.7, 0, false);
    box(M.dark, 50.7, 2.95, -2.2, 56.7, 3.2, 0);
    sign(letters('COMPANY', '#f4f4f4'), 9.6, 1.3, 1400, 190, 53.7, 5.3, -0.12, PI, true);

    // Coloured acoustic tiles, 1.2 x 0.6 m, on a wall face at x = c (alongX false) or z = c,
    // d thick towards the room (video 0:07-0:12)
    const tileMats = [0x1f3550, 0x2c5aa0, 0x6c7178, 0x7d5f72, 0xcfc4ad, 0xb5ae78].map(c => lam({ color: c }));
    function tiles(alongX, c, a0, a1, y0, y1, d) {
      const [c0, c1] = d > 0 ? [c, c + d] : [c + d, c];
      for (let a = a0; a < a1 - 0.1; a += 1.2) for (let y = y0; y < y1 - 0.1; y += 0.6) {
        const m = tileMats[(rnd() * tileMats.length) | 0], b = Math.min(a + 1.18, a1), t = Math.min(y + 0.58, y1);
        if (alongX) box(m, a, y, c0, b, t, c1); else box(m, c0, y, a, c1, t, b);
      }
    }
    // The big X-shaped LED fittings over the café (video 0:09-0:12)
    function xLamp(x, z, y, s) {
      for (const a of [0.5, -0.5]) add(M.lamp, new THREE.BoxGeometry(s, 0.04, 0.06).rotateY(a).translate(x, y, z));
      cyl(M.dark, x, y, z, 0.01, 0.01, H1 - y, 3);
    }

    // --- Lobby and café (views A, B; video 0:04-0:13). In through the revolving door, the tables
    // are ahead, the counter on the right; the lane between the counter and the seating steps
    // leads to the gates. ---
    wallX(M.dark, 46.5, 0, 18.6, H1);
    wallX(M.plaster, 57.6, 0, 19.5, H1, [10.3]);         // door to the Innovation Garage
    tiles(false, 46.6, 2, 18.4, 3.6, 6.2, 0.04);
    add(M.red, new THREE.CylinderGeometry(0.5, 0.5, 0.04, 24).rotateZ(PI / 2).translate(46.66, 4.3, 7.5));   // the bar's round sign
    const mural = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.6), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(muralCanvas()) }));
    mural.position.set(57.48, 3.4, 5); mural.rotation.y = -PI / 2;
    scene.add(mural); shootables.push(mural);
    // the long black counter with glass displays, coffee machines and a black hood over it
    box(M.dark, 46.6, 0, 2.0, 48.4, 1.05, 12.4, true);
    box(M.steel, 47.15, 1.05, 2.0, 48.45, 1.09, 12.4);
    box(M.glass, 47.6, 1.09, 2.5, 48.4, 1.55, 7.5);
    for (let z = 2.7; z < 7.3; z += 0.5) box([M.orange, M.green, M.white, M.red][(rnd() * 4) | 0], 47.7, 1.09, z, 48.2, 1.2, z + 0.3);
    for (let z = 8; z < 12; z += 0.7) box(M.black, 47.3, 1.09, z, 47.8, 1.6, z + 0.45);
    box(M.dark, 47.0, 2.7, 2.0, 48.6, 3.4, 12.4);
    box(M.lamp, 47.1, 2.68, 2.1, 48.5, 2.7, 12.3);
    // the lime-green coffee and water counter by the gates (video 0:11)
    box(M.lime, 46.6, 0, 13.2, 47.3, 0.95, 17.6, true);
    box(M.black, 46.6, 0.95, 13.2, 47.35, 0.99, 17.6);
    for (const z of [13.8, 15.2, 16.6]) box(M.steel, 46.7, 0.99, z, 47.1, 1.4, z + 0.45);
    // the bench with its orange back to the counter, black tables in front (video 0:06)
    box(M.oak, 50.2, 0, 2.5, 50.9, 0.38, 10.5, true);
    box(M.white, 50.2, 0.38, 2.5, 50.9, 0.47, 10.5);
    box(M.orange, 50.0, 0, 2.5, 50.2, 1.3, 10.5, true);
    for (const z of [3.5, 6.5, 9.5]) {
      box(M.black, 51.0, 0.72, z - 0.6, 51.8, 0.76, z + 0.6);
      cyl(M.black, 51.4, 0, z, 0.04, 0.04, 0.72, 6);
      collide(51.0, z - 0.6, 51.8, z + 0.6, 0.76);
    }
    // round white tables on black legs, black chairs, planters by the wall (video 0:05)
    for (const x of [52.9, 55.6]) for (const z of [4.0, 6.7, 9.2]) {
      cyl(M.white, x, 0.72, z, 0.45, 0.45, 0.04, 16);
      cyl(M.black, x, 0, z, 0.05, 0.05, 0.72, 6);
      cyl(M.black, x, 0, z, 0.3, 0.3, 0.03, 12);
      collide(x - 0.35, z - 0.35, x + 0.35, z + 0.35, 0.76);
      chair(x - 0.75, z, 'e'); chair(x + 0.75, z, 'w');
    }
    for (const z of [5.35, 7.95]) {
      box(M.dark, 56.75, 0, z - 0.3, 57.35, 0.7, z + 0.3, true);
      for (let i = 0; i < 3; i++) ball(M.leaf, 57.05 + rr(-0.2, 0.2), 0.85, z + rr(-0.2, 0.2), 0.25);
    }
    // the wooden seating steps (view B, video 0:04-0:09): you can climb them
    for (let i = 0; i < 5; i++) {
      box(M.oak, 50.6, 0, 11.8 + i * 0.68, 57.5, 0.38 * (i + 1), 15.2, true);
      if (i % 2) for (let x = 51.1; x < 56.8; x += 1.6) box(M.cushion, x, 0.38 * (i + 1), 11.9 + i * 0.68, x + 0.9, 0.38 * (i + 1) + 0.1, 11.9 + i * 0.68 + 0.5);
    }
    // behind them: the wood-clad dish return with its hatch to the lane (video 0:10-0:11), the
    // kitchen, planters on top
    box(M.wood, 50.6, 0, 15.2, 55.0, 3.4, 18.6, true);
    box(M.dark, 50.55, 0.9, 16.0, 50.62, 1.7, 17.4);
    box(M.steel, 50.3, 0.9, 16.0, 50.6, 0.94, 17.4);
    box(M.dark, 55.0, 0, 15.2, 57.6, 3.4, 19.5, true);
    box(M.dark, 50.7, 3.4, 15.3, 57.5, 3.7, 15.9);
    for (let x = 51; x < 57.3; x += 0.7) ball(M.leaf, x, 3.85, 15.6, rr(0.25, 0.35));
    xLamp(49.3, 9.5, 5.2, 4.5); xLamp(48.6, 15.4, 5.2, 4.5);
    plant(56.9, 1.2, 1.2);
    // the gates into the office (video 0:11-0:13): four steel cabinets under a bulkhead of
    // coloured tiles, the wide gate by the dish return
    turnstiles(18.3, 46.6, 50.6, 49.2, true);
    box(M.dark, 46.5, 2.6, 18.2, 50.6, 4.6, 18.45);
    tiles(true, 18.2, 46.5, 50.6, 2.6, 4.6, -0.04);
    sign(officeSign, 3.0, 1.0, 600, 200, 48.55, 3.6, 18.47, 0);   // on the corridor side
    // past the gates on the left: a white wall, then a stair up along the corridor (video 0:13-0:14)
    box(M.white, 50.6, 0, 18.6, 55.5, 3.4, 20.3, true);
    for (let i = 0; i < 8; i++) box(M.plaster, 50.8 + i * 0.55, 0, 20.3, 55.5, 0.38 * (i + 1), 22.2, true);
    box(M.glass, 51.35, 0.4, 22.15, 55.5, 4.1, 22.22);
    box(M.black, 55.0, 0, 22.5, 55.45, 0.9, 22.95);                 // the cleaning robot's charger (video 0:16)
    box(M.led, 54.98, 0.4, 22.6, 55.0, 0.75, 22.68);
    plant(54.4, 22.95, 1.1);

    // --- Pod columns: meeting rooms stacked along z, a stair-and-lift lobby, and a WC block on
    // each side of the corridor, so the corridor squeezes between them (video 0:17-0:19) ---
    function podRooms(x0, x1, z0, z1, n) {   // doors alternate east/west, glass on the other side
      const step = (z1 - z0) / n;
      for (let i = 0; i < n; i++) {
        const a = z0 + i * step, b = a + step, d = i % 2 ? 'w' : 'e';
        room(x0, a, x1, b, { doors: { [d]: [(a + b) / 2] }, glass: [d === 'e' ? 'w' : 'e', a + 0.6, b - 0.6] });
      }
    }
    // A WC block: solid, beige panels, with doors and a radiator drawn on the corridor face
    function wcBlock(x0, z0, x1, z1, face) {
      box(M.panel, x0, 0, z0, x1, 3.4, z1, true);
      box(M.plaster, x0 - 0.05, 3.4, z0 - 0.05, x1 + 0.05, 3.5, z1 + 0.05);
      if (!face) return;
      const f = face === 'n' ? z0 - 0.03 : z1, g = f + 0.03;
      for (const x of [x0 + 0.6, x1 - 1.5]) { box(M.oak, x, 0, f, x + 0.9, 2.1, g); box(M.white, x + 0.3, 2.2, f, x + 0.6, 2.4, g); }
      box(M.white, x0 + 2.0, 0.15, face === 'n' ? f - 0.05 : g, x1 - 2.0, 0.75, face === 'n' ? f : g + 0.05);
    }
    // a lobby across the column, open east-west, with the spiral stair in a corner
    function podColumn(x0, x1, north, southWC = true) {
      if (north) {
        podRooms(x0, x1, 0, 12, 3);
        spiral(x0 + 0.6, 12.6);
        room(x0, 15, x1, 20.3, { doors: { w: [17.6], e: [17.6] }, table: false });
        wcBlock(x0, 20.3, x1, 23.4, 's');
      }
      if (southWC) wcBlock(x0, 25.6, x1, 29.6, 'n');
      spiral(x0 + 0.6, 32.0);
      podRooms(x0, x1, 32.6, 47.5, 4);
    }
    podColumn(10.7, 15.8, true);
    podColumn(30.8, 35.8, true);
    podColumn(56, 61.5, false, false);
    // the column by the café: WCs north of the corridor, with a teal niche for recycling and one
    // for coffee where the passage starts (video 0:17-0:18)
    wcBlock(55.5, 19.5, 56.2, 23.4, null);
    wcBlock(56.2, 19.5, 58.4, 22.0, null);
    wcBlock(58.4, 19.5, 61.5, 23.4, 's');
    box(M.plaster, 56.2, 3.4, 22.0, 58.4, 3.5, 23.4);
    box(M.teal, 56.2, 0, 21.97, 58.4, 3.4, 22.0); box(M.teal, 56.2, 0, 22.0, 56.23, 3.4, 23.4); box(M.teal, 58.37, 0, 22.0, 58.4, 3.4, 23.4);
    box(M.paleBlue, 56.2, 0, 22.0, 58.4, 0.015, 25.6);
    for (const x of [56.4, 56.9, 57.4]) box(M.white, x, 0, 22.05, x + 0.4, 0.95, 22.5, true);   // recycling bins
    box(M.steel, 57.9, 0.2, 22.05, 58.35, 0.9, 22.9);                                           // trolley
    wcBlock(56, 25.6, 56.2, 29.6, null);
    wcBlock(58.4, 25.6, 61.5, 29.6, 'n');
    wcBlock(56.2, 27.0, 58.4, 29.6, null);
    box(M.plaster, 56.2, 3.4, 25.6, 58.4, 3.5, 27.0);
    box(M.teal, 56.2, 0, 27.0, 58.4, 3.4, 27.03); box(M.teal, 56.2, 0, 25.6, 56.23, 3.4, 27.0); box(M.teal, 58.37, 0, 25.6, 58.4, 3.4, 27.0);
    box(M.dark, 56.3, 0, 26.4, 58.3, 0.92, 27.0, true);                                         // coffee counter
    for (const x of [56.5, 57.4]) box(M.black, x, 0.92, 26.55, x + 0.5, 1.6, 26.95);
    // open team areas between the columns
    desks(0, 10.7, 0, 20.3, 'n');
    desks(15.8, 30.8, 0, 20.3, 'n');
    desks(35.8, 46.5, 0, 20.3, 'n');
    desks(15.8, 30.8, 29.6, 47.5, 's');
    desks(35.8, 56, 29.6, 47.5, 's');
    desks(61.5, 72.6, 29.6, 47.5, 's');

    // --- The corridor and its collaboration strips: ducts, LED lines, high tables, a cleaning robot ---
    for (const x of [20, 25, 41, 44, 64.5, 68.5]) {
      cyl(M.white, x, 0, 27.6, 0.5, 0.5, 1.05, 16);
      cyl(M.steel, x, 1.05, 27.6, 0.55, 0.55, 0.03, 16);
      collide(x - 0.4, 27.2, x + 0.4, 28.0, 1.08);
    }
    for (const [x0, x1] of [[19, 24], [39, 43.5]]) {
      box(M.white, x0, 1.0, 21.3, x1, 1.05, 22.2);
      box(M.grey, x0 + 0.2, 0, 21.6, x1 - 0.2, 1.0, 21.9, true);
    }
    ductX(0.5, 72.4, 5.6, 24.5, 0.45);
    for (let x = 3; x < 72; x += 6) box(M.dark, x, 5.15, 24.4, x + 0.1, H1, 24.6);
    for (const x of [4, 8, 26, 37, 45, 63, 70]) plant(x, 22.9, 1.1);
    const robot = new THREE.Group();
    robot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.55, 18).translate(0, 0.3, 0), M.dark));
    robot.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06).translate(0.05, 0.6, 0), M.led));
    robot.position.set(10, 0, 24.5);
    scene.add(robot);
    // the lounge across the corridor from the gates (video 0:14-0:15): green sofas round little
    // oak tables inside a curved black mesh curtain, white storage and an orange coat stand
    box(M.green, 48.2, 0, 27.6, 52.8, 0.42, 28.4, true);
    box(M.green, 48.2, 0.42, 28.15, 52.8, 0.85, 28.45, true);
    for (const x of [47.9, 52.4]) { box(M.green, x, 0, 26.3, x + 0.7, 0.42, 27.6, true); box(M.green, x < 50 ? x : x + 0.45, 0.42, 26.3, x < 50 ? x + 0.25 : x + 0.7, 0.85, 27.6); }
    for (const [x, z] of [[49.4, 26.9], [50.6, 26.6], [51.8, 26.9]]) { cyl(M.oak, x, 0.48, z, 0.32, 0.32, 0.04, 14); cyl(M.oak, x, 0, z, 0.04, 0.04, 0.48, 6); }
    add(M.curtain, new THREE.CylinderGeometry(3.4, 3.4, 3.3, 28, 1, true, -PI / 2, PI).translate(50.5, 1.75, 26.0));
    box(M.dark, 47.0, 3.4, 25.9, 54.0, 3.45, 29.5);
    box(M.white, 54.3, 0, 26.0, 55.6, 1.25, 27.8, true);
    for (let i = 0; i < 3; i++) ball(M.leaf, 54.95 + rr(-0.3, 0.3), 1.4, 26.4 + i * 0.55, 0.28);
    cyl(M.orange, 54.6, 0, 28.6, 0.22, 0.22, 0.03, 12); cyl(M.orange, 54.6, 0, 28.6, 0.025, 0.025, 1.8, 6);
    ball(M.red, 54.75, 1.35, 28.6, 0.2, 2);

    // --- Innovation Garage (orange on the plan): workshop tables, teal lockers on the corridor side ---
    wallZ(M.plaster, 19.5, 57.6, 61.5, H1);
    wallX(M.plaster, 61.5, 19.5, 20.5, H1);
    wallZ(M.plaster, 20.5, 61.5, 72.6, H1, [66.7]);
    for (let x = 59.5; x < 71; x += 3.4) {
      box(M.oak, x, 0.85, 3, x + 1.6, 0.9, 13);
      box(M.grey, x + 0.1, 0, 3, x + 1.5, 0.85, 13, true);
      for (let z = 4; z < 13; z += 2.5) box([M.orange, M.blue, M.white][(rnd() * 3) | 0], x + 0.3, 0.9, z, x + 1.2, 1.3, z + 0.7);
    }
    box(M.white, 57.7, 0, 1, 57.8, 2.2, 6);   // whiteboard
    spawnAt(58.5, 14.5, 71.5, 19.5);
    spawnAt(58.5, 0.6, 71.5, 2.6);
    for (const [x0, x1] of [[62, 66.0], [67.4, 71.6]]) {
      box(M.teal, x0, 0, 20.62, x1, 0.9, 21.2, true);
      for (let x = x0 + 0.3; x < x1; x += 0.6) ball(M.leaf, x, 1.05, 20.9, rr(0.2, 0.3));
    }

    // --- The Concept lab (the garage; the video cuts at its door, so the inside is guessed):
    // x 72.6..101.5 down to the stair hall, x 72.6..97 below that, 9 m high ---
    wallX(M.plaster, 72.6, 0, 47.5, HG, [18, [24.5, 3.0, 3.2], 34.3]);
    wallZ(M.plaster, 35.8, 72.6, 97, HG, [[80, 2.6, 3], [91.2, 2.6, 3], [95.2, 1.6, 2.7]]);
    wallX(M.plaster, 97, 25.6, 47.5, HG, [[33, 1.8, 2.7], [41.5, 1.6, 2.7]]);
    wallZ(M.plaster, 25.6, 97, 108, HG, [[104.5, 1.8, 2.7]]);
    wallX(M.plaster, 101.5, 0, 25.6, HG, [9.5, [12.5, 1.8], [23.7, 3.4, 3.4]]);
    box(M.ceiling, 72.6, HG, 0, 101.5, HG + 0.1, 25.6);
    box(M.ceiling, 72.6, HG, 25.6, 97, HG + 0.1, 35.8);
    for (let x = 76; x < 96; x += 6) box(M.skylight, x, HG - 0.02, 2, x + 2, HG, 34);
    for (let x = 75; x < 100; x += 7) for (let z = 5; z < 36; z += 8) {
      if (x > 96 && z > 25) continue;
      cyl(M.dark, x, 7.2, z, 0.45, 0.25, 0.4, 14);
      cyl(M.lamp, x, 7.18, z, 0.42, 0.42, 0.02, 14);
    }
    sign(noCameraSign, 0.55, 0.8, 220, 320, 72.47, 1.6, 26.6, -PI / 2);   // video 0:19-0:20
    sign(label('CONCEPT LAB'), 3.6, 0.7, 720, 140, 72.47, 5.3, 24.5, -PI / 2);
    for (const z of [22.95, 26.05]) box(M.yellowPaint, 72.45, 0, z - 0.05, 72.5, 0.6, z + 0.05);   // bumpers at the black door (video 0:20)
    room(72.6, 0, 76.2, 5.5, { h: 3.6, m: M.plaster, skip: ['w'], doors: { s: [74.4] }, table: false });   // switchgear and tea rooms
    // roller door in the north wall
    box(M.slats, 79.5, 0, 0.1, 88.5, 6, 0.25);
    for (const x of [79.3, 88.5]) box(M.yellowPaint, x, 0, 0.1, x + 0.2, 6.2, 0.35, true);
    // yellow lines marking the bays and the walkway from the corridor door to the stair hall
    for (const z of [3.5, 15]) box(M.yellow, 76.5, 0, z, 101.2, 0.012, z + 0.12);
    box(M.yellow, 73, 0, 28, 96.7, 0.012, 28.12);
    for (const z of [22.4, 25.3]) box(M.yellow, 72.8, 0, z, 101.3, 0.012, z + 0.12);
    for (let x = 80; x < 100; x += 8) box(M.yellow, x, 0, 3.5, x + 0.12, 0.012, 15);

    // An autonomous truck: white cab with sensors on the roof, dark chassis, three axles
    function truck(x, z, len, color, cab = true) {
      box(M.dark, x, 0.5, z + 0.25, x + len, 1.2, z + 2.25);
      for (const ax of [x + 0.9, x + len - 2.5, x + len - 1.2]) for (const s of [0, 1]) {
        add(M.black, new THREE.CylinderGeometry(0.52, 0.52, 0.4, 16).rotateX(PI / 2).translate(ax, 0.52, z + 0.2 + s * 2.1));
        add(M.steel, new THREE.CylinderGeometry(0.28, 0.28, 0.42, 10).rotateX(PI / 2).translate(ax, 0.52, z + 0.2 + s * 2.1));
      }
      if (cab) {
        box(color, x + len - 2.4, 1.2, z, x + len, 3.7, z + 2.5);
        box(M.navy, x + len - 0.02, 2.2, z + 0.15, x + len + 0.02, 3.3, z + 2.35);   // windscreen
        box(M.blue, x + len - 2.42, 1.4, z - 0.01, x + len - 0.2, 1.6, z + 2.51);
        box(M.dark, x + len - 1.6, 3.7, z + 0.3, x + len - 0.2, 3.9, z + 2.2);
        for (const s of [0.4, 2.1]) cyl(M.dark, x + len - 0.4, 3.9, z + s, 0.13, 0.13, 0.25, 12);   // lidars
        for (const s of [-0.15, 2.65]) box(M.dark, x + len - 0.3, 2.2, z + s - 0.05, x + len - 0.1, 3.0, z + s + 0.05);
        box(M.steel, x + 0.3, 1.2, z + 0.4, x + len - 2.5, 1.35, z + 2.1);   // fifth wheel plate
      } else {
        box(color, x, 1.2, z, x + len, 2.1, z + 2.5);
        box(M.navy, x + len - 0.02, 1.4, z + 0.3, x + len + 0.02, 1.9, z + 2.2);
        box(M.blue, x - 0.01, 1.3, z - 0.01, x + len + 0.01, 1.45, z + 2.51);
        for (const px of [x + 0.3, x + len - 0.3]) cyl(M.dark, px, 2.1, z + 1.25, 0.15, 0.15, 0.2, 12);
      }
      collide(x, z, x + len, z + 2.5, cab ? 3.9 : 2.1);
    }
    truck(77.5, 6.2, 6.8, M.truck);
    truck(88, 11.6, 7, M.white);
    truck(79, 29.5, 6.4, M.truck, false);   // cab-less hauler
    // a car on a two-post lift
    for (const z of [28.4, 31.9]) box(M.blue, 89.2, 0, z, 89.6, 3.6, z + 0.4, true);
    box(M.grey, 88.6, 1.5, 28.9, 95, 1.6, 31.8);
    box(M.red, 89, 1.9, 29.1, 94.6, 2.6, 31.6);
    box(M.navy, 90.2, 2.6, 29.3, 93.2, 3.1, 31.4);
    for (const x of [89.8, 93.8]) for (const z of [29, 31.7]) add(M.black, new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12).rotateX(PI / 2).translate(x, 1.95, z));
    collide(88.6, 28.9, 95, 31.8, 3.1);
    // shelving racks: blue uprights, orange beams, boxes
    function rack(x0, x1, z0, z1) {
      const alongX = x1 - x0 > z1 - z0;
      for (let a = alongX ? x0 : z0; a <= (alongX ? x1 : z1) + 0.01; a += 2.4) {
        if (alongX) { box(M.blue, a, 0, z0, a + 0.1, 4.5, z0 + 0.1); box(M.blue, a, 0, z1 - 0.1, a + 0.1, 4.5, z1); }
        else { box(M.blue, x0, 0, a, x0 + 0.1, 4.5, a + 0.1); box(M.blue, x1 - 0.1, 0, a, x1, 4.5, a + 0.1); }
      }
      for (const y of [1.4, 2.8, 4.2]) {
        box(M.orange, x0, y - 0.12, z0, x1, y, z1);
        for (let k = 0; k < 6; k++) {
          const t = rnd(), s = rr(0.5, 0.9);
          if (alongX) { const a = x0 + t * (x1 - x0 - s); box(M.oak, a, y, z0 + 0.1, a + s, y + rr(0.4, 0.9), z1 - 0.1); }
          else { const a = z0 + t * (z1 - z0 - s); box(M.oak, x0 + 0.1, y, a, x1 - 0.1, y + rr(0.4, 0.9), a + s); }
        }
      }
      collide(x0, z0, x1, z1, 4.5);
    }
    rack(76.5, 79.0, 0.2, 1.4);
    rack(89.2, 98.8, 0.2, 1.4);
    rack(95.6, 96.8, 26.5, 35.5);
    rack(100.2, 101.3, 1.8, 8.4);
    // workbench with a pegboard along the west wall
    box(M.oak, 72.7, 0.9, 6.5, 73.7, 0.95, 15.5);
    box(M.grey, 72.7, 0, 6.5, 73.7, 0.9, 15.5, true);
    box(M.felt, 72.71, 1.2, 7, 72.8, 2.6, 15);
    for (let z = 7.5; z < 14.8; z += 1.1) box(M.steel, 72.8, rr(1.4, 2.3), z, 72.9, rr(2.0, 2.5), z + 0.2);
    for (const [x, z] of [[76.2, 28], [100.6, 16.5], [84, 17.5]]) { box(M.red, x - 0.5, 0, z - 0.35, x + 0.5, 1.1, z + 0.35, true); box(M.steel, x - 0.5, 1.1, z - 0.35, x + 0.5, 1.13, z + 0.35); }
    for (const [x, z] of [[86, 7], [86.8, 7.6], [76, 16.2], [93, 26.8], [80, 26.8]]) { add(M.orange, new THREE.ConeGeometry(0.18, 0.7, 10).translate(x, 0.35, z)); box(M.orange, x - 0.22, 0, z - 0.22, x + 0.22, 0.03, z + 0.22); }
    // overhead crane
    for (const z of [2, 34.5]) box(M.yellowPaint, 72.8, 7.6, z - 0.2, 96.8, 8.0, z + 0.2);
    box(M.yellowPaint, 84.6, 7.4, 2, 85.4, 7.9, 34.5);
    box(M.dark, 84.7, 6.6, 14, 85.3, 7.4, 14.8);
    cyl(M.steel, 85, 4.2, 14.4, 0.02, 0.02, 2.4, 4);
    ductZ(0.3, 35.5, 8.2, 75, 0.5);
    // spawn spots in the garage (behind the trucks and racks)
    spawnAt(77, 2, 81, 4.5); spawnAt(91, 2, 98, 4.5); spawnAt(88, 15, 95, 17.5); spawnAt(73.5, 31.5, 77, 35.3);

    // --- Labs round the Concept lab: workshops south of it, battery and power electronics labs
    // east of it, 3D printers and HIL automation in the north-east corner ---
    wallX(M.plaster, 76, 35.8, 47.5, H1);
    wallX(M.plaster, 89, 35.8, 47.5, H1);
    wallX(M.plaster, 93.5, 35.8, 47.5, H1);
    wallZ(M.plaster, 35.8, 97, 108, H1, [102]);
    wallZ(M.plaster, 10, 101.5, 108, H1);
    wallZ(M.plaster, 19.6, 101.5, 108, HG);
    wcBlock(72.7, 35.9, 75.9, 47.4, null);
    for (const [x0, z0, x1, z1] of [[76, 35.8, 89, 47.5], [89, 35.8, 93.5, 47.5], [93.5, 35.8, 97, 47.5], [97, 25.6, 108, 35.8], [97, 35.8, 108, 47.5], [101.5, 0, 108, 10], [101.5, 10, 108, 19.6]]) {
      room(x0, z0, x1, z1, { h: H1, walls: false, roof: false });
    }
    for (const [x0, x1] of [[77, 83], [89.5, 93], [93.9, 96.6]]) { box(M.grey, x0, 0, 45.5, x1, 0.9, 46.6, true); box(M.steel, x0, 0.9, 45.5, x1, 0.93, 46.6); }
    for (const [z0, z1] of [[1, 8], [11, 18.5]]) { box(M.white, 104, 0, z0 + 1, 107.5, 0.9, z0 + 2.2, true); box(M.screen, 105, 0.9, z0 + 1.3, 106.2, 1.6, z0 + 1.35); }

    // --- The stair hall ("same feature" on both plans): from the Concept lab through to the
    // South building, past a stair going up ---
    for (let i = 0; i < 9; i++) box(M.oak, 103.4 + i * 0.5, 0, 19.7, 107.9, 0.36 * (i + 1), 21.1, true);
    box(M.glass, 103.4, 0.4, 21.08, 107.9, 4.3, 21.15);
    ductX(101.5, 108, 5.5, 23.6, 0.4);

    // =========================================================================================
    // The South building: x 108..212, z 0..47.5, one high hall (7.5 m) with two-storey room pods
    const H2 = 7.5;
    box(M.office, 108, -0.1, 0, 189, 0, 47.5);
    box(M.office, 189, -0.1, 0, 212, 0, 15.6);
    box(M.tile, 189, -0.1, 15.6, 212, 0, 23.2);        // the gates and reception
    box(M.office, 189, -0.1, 23.2, 212, 0, 47.5);
    box(M.carpet, 108.2, 0, 21.3, 116.2, 0.01, 23.3);
    box(M.carpet, 116.2, 0, 21.3, 142.5, 0.01, 22.7);
    box(M.carpet, 142.5, 0, 20.2, 189, 0.01, 22.6);
    wallZ(M.brick, 0, 108, 212, OUT);
    wallZ(M.brick, 47.5, 108, 212, OUT);
    wallX(M.brick, 212, 0, 15.7, OUT);
    wallX(M.brick, 212, 23.5, 47.5, OUT);
    wallX(M.glass, 212, 15.7, 23.5, 3.2, [[19.5, 3.0, 2.8]], 0.1);
    box(M.brick, 211.9, 3.2, 15.7, 212.1, OUT, 23.5);
    for (let z = 15.7; z <= 23.6; z += 1.3) box(M.dark, 211.92, 0, z - 0.04, 212.08, 3.2, z + 0.04);
    windowsZ(0, 110, 210);
    windowsZ(47.5, 110, 210);
    windowsX(212, 1, 15, []);
    windowsX(212, 24, 47, []);
    ceiling(108, 0, 212, 47.5, H2);
    revolving(212, 19.5, true);
    box(M.dark, 212, 2.95, 16.5, 214.2, 3.2, 22.5);
    sign(letters('COMPANY', '#f4f4f4'), 8.4, 1.1, 1400, 190, 212.13, 5.0, 19.5, PI / 2, true);

    // west end: a passage from the stair hall between closed rooms (north) and service rooms (south)
    wallZ(M.plaster, 20.8, 108, 120.8, 4.5, [110.6, 118.5]);
    wallZ(M.plaster, 10, 108, 120.8, 4.5);
    wallX(M.plaster, 120.8, 0, 20.8, H2);
    box(M.plaster, 108, 4.5, 0, 120.8, 4.7, 20.8);
    spawnAt(110, 11.5, 119.5, 19.5);
    wallZ(M.plaster, 23.8, 108, 116.2, 4.5);
    wallZ(M.plaster, 34, 108, 116.2, 4.5);
    wallX(M.plaster, 116.2, 23.8, 47.5, 4.5, [29.1, 41.1]);
    box(M.plaster, 108, 4.5, 23.8, 116.2, 4.7, 47.5);
    spawnAt(109.5, 25.3, 115, 33); spawnAt(109.5, 35.5, 115, 46.5);
    // the lab with six vehicle bays (the rectangles on the plan)
    wallZ(M.plaster, 20.8, 120.8, 137.8, H2, [[130.1, 3.0, 3.4]]);
    wallX(M.plaster, 137.8, 0, 20.8, H2, [[17.1, 2.6, 3.2]]);
    function car(x, z, color) {   // along z
      box(color, x - 0.85, 0.35, z, x + 0.85, 1.05, z + 4.4);
      box(M.navy, x - 0.75, 1.05, z + 1.2, x + 0.75, 1.55, z + 3.4);
      for (const dz of [0.8, 3.6]) for (const s of [-1, 1]) add(M.black, new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12).rotateZ(PI / 2).translate(x + s * 0.82, 0.33, z + dz));
      cyl(M.dark, x, 1.55, z + 2.3, 0.12, 0.12, 0.18, 10);
      collide(x - 0.85, z, x + 0.85, z + 4.4, 1.55);
    }
    for (const x of [124.5, 129.5, 134.5]) for (const z of [1.8, 11.9]) {
      box(M.grey, x - 1.3, 0, z, x + 1.3, 0.12, z + 7.5);
      if (rnd() < 0.6) car(x, z + 1.5, [M.white, M.red, M.blue, M.dark][(rnd() * 4) | 0]);
    }
    spawnAt(122, 9.6, 136.5, 11.6); spawnAt(122, 19.5, 136.5, 20.4);

    // Room pods: a ground floor of rooms (beige panels, blue glass for the video studios) under a
    // white upper storey with a blue window band, and a spiral stair (views E, F, M; video
    // 0:24-0:33). Measured on the plan: three pods north of the passage, five south of it, each
    // with a WC block between the passage and the pod.
    function upper(x0, z0, x1, z1, h = 3.5) {
      box(M.white, x0 - 0.1, h, z0 - 0.1, x1 + 0.1, 6.3, z1 + 0.1);
      box(M.blueGlass, x0 - 0.16, h + 0.9, z0 + 0.4, x1 + 0.16, 5.5, z1 - 0.4);
      box(M.blueGlass, x0 + 0.4, h + 0.9, z0 - 0.16, x1 - 0.4, 5.5, z1 + 0.16);
    }
    function spiral(x, z) {
      cyl(M.steel, x, 0, z, 0.06, 0.06, 3.6, 8);
      for (let i = 0; i < 10; i++) {
        const a = i * 0.62;
        add(M.dark, new THREE.BoxGeometry(0.8, 0.05, 0.3).translate(0.4, 0, 0).rotateY(a).translate(x, 0.33 * (i + 1), z));
      }
      collide(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 3.6);
    }
    const TOP = [[142.5, 147.7], [157.3, 162.5], [172.3, 177.5]];
    TOP.forEach(([x0, x1], i) => {
      const cx = (x0 + x1) / 2;
      room(x0, 0.1, x1, 6.6, { h: 3.5, doors: { [i % 2 ? 'e' : 'w']: [3.4] }, glass: [i % 2 ? 'w' : 'e', 1, 6], roofM: M.white });
      room(x0, 6.6, x1, 13.1, { h: 3.5, doors: { s: [cx] }, glass: [i % 2 ? 'e' : 'w', 7.2, 12.5], roofM: M.white });
      upper(x0, 0.1, x1, 13.1);
      spiral(x0 + 0.8, 14.0);
      // small glass-fronted rooms with screens by the passage (video 0:33-0:34)
      room(x0, 15.8, x1, 19.5, { h: 3.0, doors: { n: [cx] }, glass: ['s', x0 + 0.5, x1 - 0.5], table: false });
      box(M.screen, cx - 0.7, 1.0, 19.1, cx + 0.7, 1.8, 19.15);
    });
    // the last small room, west of the reception gates, opens to the team area
    room(187.7, 15.8, 192.5, 19.5, { h: 3.0, doors: { w: [17.6] }, glass: ['s', 188.2, 192.0], table: false });
    const PODS = [[127.5, 132.8], [142.5, 147.7], [157.3, 162.5], [172.3, 177.5], [187.7, 192.5]];
    // WC blocks with doors at both ends: a way round when the passage is blocked
    PODS.forEach(([x0, x1], i) => {
      const n = i === PODS.length - 1 ? x0 + 1.1 : (x0 + x1) / 2;
      room(x0, 23.2, x1, 28.9, { h: 3.2, doors: { n: [n], s: [(x0 + x1) / 2] }, table: false });
    });
    for (let i = 0; i < 10; i++) box(M.oak, 147.8 + i * 0.57, 0, 21.4, 153.5, 0.35 * (i + 1), 23.1, true);   // stair up
    box(M.glass, 147.8, 0.4, 21.35, 153.5, 4.4, 21.4);
    PODS.forEach(([x0, x1], i) => {
      room(x0, 31.5, x1, 36.8, { h: 3.5, doors: { n: [x1 - 1.6] }, roofM: M.white });
      room(x0, 36.8, x1, 42.1, { h: 3.5, doors: { [i % 2 ? 'w' : 'e']: [39.45] }, glass: [i % 2 ? 'e' : 'w', 37.3, 41.6], roofM: M.white });
      room(x0, 42.1, x1, 47.4, { h: 3.5, doors: { [i % 2 ? 'e' : 'w']: [44.75] }, glass: [i % 2 ? 'w' : 'e', 42.6, 46.9], roofM: M.white });
      upper(x0, 31.5, x1, 47.4);
      spiral(x0 + 0.6, 30.6);   // on the west corner (video 0:27-0:28)
    });
    // open team areas between the pods
    desks(137.8, 142.5, 0, 14.6, 'n');
    [[147.7, 157.3], [162.5, 172.3], [177.5, 187.7]].forEach(([a, b]) => desks(a, b, 0, 14.6, 'n'));
    [[116.2, 127.5], [132.8, 142.5], [147.7, 157.3], [162.5, 172.3], [177.5, 187.7]].forEach(([a, b]) => desks(a, b, 31.5, 47.5, 's'));
    // white storage units with planters along the passage (video 0:22-0:24, 0:34)
    for (const [a, b] of [[147.7, 157.3], [162.5, 172.3], [177.5, 187.7]]) {
      box(M.white, (a + b) / 2 - 1.2, 0, 14.9, (a + b) / 2 + 1.2, 1.25, 15.3, true);
      for (let x = (a + b) / 2 - 1; x < (a + b) / 2 + 1.1; x += 0.5) ball(M.leaf, x, 1.4, 15.1, 0.22);
    }
    for (const [a, b] of [[116.2, 127.5], [132.8, 142.5], [147.7, 157.3], [162.5, 172.3], [177.5, 187.7]]) box(M.white, (a + b) / 2 - 1.2, 0, 30.4, (a + b) / 2 + 1.2, 1.25, 30.9, true);
    for (const x of [137, 152.5, 167.4, 182.6]) plant(x, 29.9, 1.2);
    // round pendant lamps over the passage (video 0:25), ducts, LED rings
    for (let x = 150; x < 166; x += 2.2) { ball(M.lamp, x, 3.8 + (x % 2) * 0.3, 20.5, 0.35); cyl(M.dark, x, 4.1, 20.5, 0.01, 0.01, H2 - 4.1, 3); }
    ductX(108.5, 211, 6.5, 21, 0.55);
    ductX(116.2, 193, 6.6, 30, 0.35);
    ductZ(0.5, 47, 6.7, 140, 0.35);
    for (const [x, z] of [[152.5, 7], [167.4, 7], [182.6, 7], [121.9, 39.5], [137.7, 39.5], [152.5, 39.5], [167.4, 39.5], [182.6, 39.5], [122, 28.8]]) ring(x, z, 4.4, 1.6);

    // The studio X210 (views C, F, G): cameras, high tables, a ring light and a big screen. A way
    // round the reception gates: in from the team area on the west, out into reception.
    wallX(M.plaster, 187.7, 0, 15.6, H2, [12.5]);
    wallZ(M.plaster, 15.6, 187.7, 212, H2, [[200.6, 2.4, 3.2], [203.7, 1.8]]);
    wallX(M.plaster, 202.5, 0, 15.6, H2, [8.4]);
    wallX(M.plaster, 207.6, 0, 15.6, 4, [3, 10.8]);
    wallZ(M.plaster, 6, 202.5, 207.6, 4, [205]);
    box(M.plaster, 202.5, 4, 0, 212, 4.2, 15.6);
    box(M.dark, 187.8, 0, 0.1, 202.4, 0.02, 15.5);
    box(M.screen, 192.6, 1.5, 0.12, 197.6, 4.2, 0.2);
    ring(195.1, 7.5, 4.6, 2.2); ring(195.1, 7.5, 4.9, 1.4);
    for (const [x, z] of [[193.1, 8.5], [197.1, 7]]) { cyl(M.white, x, 1.08, z, 0.5, 0.5, 0.04, 16); cyl(M.grey, x, 0, z, 0.05, 0.05, 1.08, 6); collide(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 1.12); }
    for (const [x, z] of [[190.6, 12.5], [199.6, 12], [195.1, 13.5]]) {
      for (let k = 0; k < 3; k++) add(M.dark, new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4).translate(0, 0.8, 0).rotateZ(0.25).rotateY(k * 2.1).translate(x, 0, z));
      box(M.black, x - 0.2, 1.5, z - 0.35, x + 0.2, 1.85, z + 0.35);
      cyl(M.dark, x, 1.55, z - 0.5, 0.1, 0.12, 0.2, 10);
    }
    spawnAt(189.5, 1.5, 201, 6); spawnAt(203.5, 1, 207, 5.3); spawnAt(203.5, 7, 207, 14.8); spawnAt(208.2, 1, 211.4, 14.8);
    box(M.white, 203, 0, 0.2, 207.4, 0.9, 1.0, true);   // the kitchenette
    // the gates into reception (video 0:36-0:38), with the Office X sign above (view I)
    turnstiles(191.5, 19.5, 23.2, 22.1, false);
    box(M.dark, 191.4, 3.0, 19.5, 191.6, 4.3, 23.2);
    sign(officeSign, 3.3, 1.1, 600, 200, 191.38, 3.65, 21.35, -PI / 2);
    // reception (video 0:38-0:42, view D): a curved white desk on the left, chairs by the
    // revolving door, a coffee counter on the right
    for (let k = 0; k < 6; k++) {
      const t = -0.55 + k * 0.22;
      add(M.white, new THREE.BoxGeometry(0.85, 1.1, 0.5).rotateY(t).translate(197 + 3.9 * Math.sin(t), 0.55, 13.0 + 3.9 * Math.cos(t)));
    }
    collide(194.8, 16.0, 199.2, 17.2, 1.1);
    box(M.white, 193.6, 0, 16.0, 194.4, 0.9, 16.5, true);   // the little cart
    box(M.navy, 194.8, 2.2, 15.75, 195.8, 3.0, 15.8);         // logo plate
    sign(officeSign, 4.5, 1.5, 600, 200, 206.5, 4.6, 15.83, 0);
    for (const x of [205.6, 207.2, 209.5]) { box(M.grey, x - 0.4, 0, 16.0, x + 0.4, 0.45, 16.8, true); box(M.grey, x - 0.4, 0.45, 15.95, x + 0.4, 0.85, 16.15); }
    box(M.white, 206.0, 0, 17.3, 207.0, 0.4, 17.9, true);
    plant(210.8, 16.5, 1.3); plant(203.0, 22.6, 1.1);
    box(M.white, 208.0, 0, 22.5, 211.0, 0.95, 23.1, true);
    box(M.black, 209.6, 0.95, 22.6, 210.3, 1.55, 23.0);       // coffee machine
    box(M.navy, 193.8, 0, 23.0, 196.0, 4.0, 23.1);           // dark blue panel with a screen (video 0:39)
    box(M.screen, 194.3, 1.6, 22.94, 195.5, 2.3, 23.0);
    // the café kitchen, the video rooms and the rooms behind reception
    room(193.8, 23.2, 202, 31, { h: 3.6, m: M.plaster, doors: { n: [199] }, table: false });
    box(M.white, 200.5, 0, 24, 201.8, 0.95, 30, true);
    box(M.oak, 200.4, 0.95, 24, 201.8, 1.0, 30);
    room(193.8, 31, 202, 33.6, { h: 3.6, m: M.plaster, skip: ['n'], doors: { w: [32.3] }, table: false });
    room(193.8, 33.6, 202, 40.5, { h: 3.6, skip: ['n'], doors: { w: [37] }, glass: ['w', 38.6, 40.1] });
    room(193.8, 40.5, 202, 47.5, { h: 3.6, skip: ['n'], doors: { w: [44] }, glass: ['w', 41, 42.8] });
    box(M.panel, 202, 0, 23.2, 204.5, 4, 30.5, true);        // the stairwell
    room(204.5, 23.2, 212, 30.5, { h: 4, m: M.plaster, doors: { n: [207], s: [208] } });
    room(202, 30.5, 212, 47.5, { h: 4, m: M.plaster, skip: ['n'] });

    // ---------- Things in the way, different every round ----------
    // Each site is a line across a passage that has a way round it (through the Innovation
    // Garage, a lab, the studio, the WC blocks or the next gap between the pods). `types` lists what fits there: a row of sign
    // stands, or scissor lifts and mail carts with sign stands filling the rest of the line.
    // Every site/type pair is built once, hidden; randomize() picks a few for each round.
    const SITES = [
      { name: 'café gates', line: 16.9, a0: 47.35, a1: 50.55, alongX: true, deck: 2.4, ceil: H1, types: ['signs', 'lift', 'cart+cart'] },
      { name: 'WC passage by the café', line: 58.8, a0: 23.45, a1: 25.55, types: ['signs', 'cart'] },
      { name: 'Concept lab, way in', line: 73.3, a0: 23.05, a1: 25.95, deck: 5.4, ceil: HG, types: ['signs', 'lift', 'cart+cart'] },
      { name: 'Concept lab, way out', line: 100.85, a0: 22.05, a1: 25.35, deck: 5.4, ceil: HG, types: ['signs', 'lift', 'cart+cart'] },
      { name: 'after the stair hall', line: 113, a0: 20.95, a1: 23.65, deck: 3.6, ceil: H2, types: ['signs', 'lift', 'cart+cart'] },
      { name: 'south, by the vehicle lab', line: 131.9, a0: 20.95, a1: 23.1, types: ['signs', 'cart'] },
      { name: 'south, pod 2', line: 145.1, a0: 19.65, a1: 23.1, deck: 4.6, ceil: H2, types: ['signs', 'lift', 'cart+cart'] },
      { name: 'south, pod 3', line: 159.9, a0: 19.65, a1: 23.1, deck: 4.6, ceil: H2, types: ['signs', 'lift', 'cart+cart'] },
      { name: 'south, pod 4', line: 174.9, a0: 19.65, a1: 23.1, deck: 4.6, ceil: H2, types: ['signs', 'lift', 'cart+cart'] },
      { name: 'reception gates', line: 189.9, a0: 19.65, a1: 23.1, deck: 4.6, ceil: H2, types: ['signs', 'lift', 'cart+cart'] },
    ];
    const PIECE = { lift: 2.56, cart: 1.32 };   // length along the line
    function barrier(site, type) {
      const { line, a0, a1, alongX } = site, at = a => (alongX ? [a, line] : [line, a]);
      const pieces = type === 'signs' ? [] : type.split('+'), span = pieces.reduce((n, p) => n + PIECE[p], 0);
      const atEnd = rnd() < 0.5;   // the big pieces at one end, sign stands filling the rest
      let a = atEnd ? a1 - span : a0;
      for (const p of pieces) {
        const [cx, cz] = at(a + PIECE[p] / 2);
        if (p === 'lift') scissorLift(cx, cz, alongX, site.deck, site.ceil); else mailCart(cx, cz, alongX);
        a += PIECE[p];
      }
      const [r0, r1] = atEnd ? [a0, a1 - span] : [a0 + span, a1];
      if (r1 - r0 > 0.25) {
        const draws = pieces.includes('lift') ? [liftSign, closedSign] : [closedSign];
        signRow(...at(r0), ...at(r1), Math.max(1, Math.round((r1 - r0) / 1.2)), draws);
      }
    }
    for (const site of SITES) {
      site.variants = site.types.map(type => {
        into = { parts: new Map(), cols: [], group: new THREE.Group(), shoot: [] };
        barrier(site, type);
        const v = into;
        into = null;
        for (const { m, geos } of v.parts.values()) {
          const mesh = new THREE.Mesh(GS.Geo.merge(geos), m);
          v.group.add(mesh); v.shoot.push(mesh);
        }
        v.group.visible = false;
        scene.add(v.group);
        return { type, group: v.group, cols: v.cols, shoot: v.shoot };
      });
    }

    // ---------- Merge into meshes ----------
    for (const { m, geos } of parts.values()) {
      const mesh = new THREE.Mesh(GS.Geo.merge(geos), m);
      if (m === M.glass || m === M.blueGlass || m === M.curtain) mesh.renderOrder = 1;
      scene.add(mesh);
      shootables.push(mesh);
    }

    // ---------- The way out: walking distance to the goal on a 0.25 m grid ----------
    // Cells closer than 0.3 m to something you can't step over are blocked (that keeps the
    // 1 m turnstile lanes open). Flooded from the goal, it tells how far it is to walk out
    // from anywhere, round whatever is in the way this round.
    const bounds = { minX: -2, maxX: 236, minZ: -22, maxZ: 50 }, CELL = 0.25, GROW = 0.3;
    const GW = Math.ceil((bounds.maxX - bounds.minX) / CELL), GH = Math.ceil((bounds.maxZ - bounds.minZ) / CELL), INF = 1e9;
    const baseSolid = new Uint8Array(GW * GH), solid = new Uint8Array(GW * GH), far = new Float32Array(GW * GH);
    const queue = new Int32Array(GW * GH), queued = new Uint8Array(GW * GH);
    function blockOut(cols, grid) {
      for (const c of cols) {
        if (c.top <= 0.4) continue;
        const i0 = Math.max(0, Math.ceil((c.minX - GROW - bounds.minX) / CELL - 0.5)), i1 = Math.min(GW - 1, Math.floor((c.maxX + GROW - bounds.minX) / CELL - 0.5));
        const j0 = Math.max(0, Math.ceil((c.minZ - GROW - bounds.minZ) / CELL - 0.5)), j1 = Math.min(GH - 1, Math.floor((c.maxZ + GROW - bounds.minZ) / CELL - 0.5));
        if (i0 <= i1) for (let j = j0; j <= j1; j++) grid.fill(1, j * GW + i0, j * GW + i1 + 1);
      }
    }
    blockOut(colliders, baseSolid);
    const cellOf = (x, z) => {
      const i = Math.floor((x - bounds.minX) / CELL), j = Math.floor((z - bounds.minZ) / CELL);
      return i < 0 || j < 0 || i >= GW || j >= GH ? -1 : j * GW + i;
    };
    function flood(goal) {
      far.fill(INF);
      let head = 0, size = 0;
      for (let c = 0; c < GW * GH; c++) {
        if (solid[c] || !goal(bounds.minX + (c % GW + 0.5) * CELL, bounds.minZ + ((c / GW | 0) + 0.5) * CELL)) continue;
        far[c] = 0; queue[size++] = c; queued[c] = 1;
      }
      const N = GW * GH;
      while (size > 0) {   // queue-based relaxation, as in the monsters' path finding
        const c = queue[head]; head = (head + 1) % N; size--; queued[c] = 0;
        const i = c % GW, j = c / GW | 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = i + di, nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
          const n = nj * GW + ni;
          if (solid[n] || (di && dj && (solid[c + di] || solid[c + dj * GW]))) continue;
          const d = far[c] + (di && dj ? 1.4142 : 1) * CELL;
          if (d < far[n]) {
            far[n] = d;
            if (!queued[n]) { queued[n] = 1; queue[(head + size) % N] = n; size++; }
          }
        }
      }
    }
    // metres still to walk from (x, z); next to a wall, the nearest open cell counts
    function toGo(x, z) {
      const c = cellOf(x, z);
      if (c < 0) return INF;
      let best = far[c];
      for (let r = 1; best >= INF && r <= 3; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        const n = c + dj * GW + di;
        if (n >= 0 && n < GW * GH && far[n] < best) best = far[n];
      }
      return best;
    }

    // Two ways through: in at the main entrance and out at the far end, or the other way round
    const ENDS = {
      main: { start: { x: 53.7, z: -11, yaw: PI }, goal: (x, z) => x > 216 },
      south: { start: { x: 225, z: 19.5, yaw: PI / 2 }, goal: (x, z) => z < -3 && x > 35 && x < 73 },
    };
    let end = ENDS.main;
    const staticCols = colliders.length, staticShoot = shootables.length;
    // A new round: pick the entrance, then 3-6 sites to block with a random type each, and
    // check there is still a way out (otherwise try again)
    function randomize() {
      end = Math.random() < 0.5 ? ENDS.main : ENDS.south;
      Object.assign(api.start, end.start);
      let picks = [];
      for (let tries = 0; tries < 30 && !picks.length; tries++) {
        const order = SITES.map(s => [Math.random(), s]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
        const p = order.slice(0, 3 + Math.floor(Math.random() * 4)).map(s => [s, s.variants[Math.floor(Math.random() * s.variants.length)]]);
        if (tryPicks(p)) picks = p;
      }
      if (!picks.length) tryPicks(picks);   // (never happens: every site has a way round)
      for (const s of SITES) for (const v of s.variants) v.group.visible = false;
      for (const [, v] of picks) v.group.visible = true;
      colliders.length = staticCols; shootables.length = staticShoot;
      for (const [, v] of picks) { colliders.push(...v.cols); shootables.push(...v.shoot); }
      api.blocked = picks.map(([s, v]) => s.name + ': ' + v.type);
      for (const sp of spawns) sp.s = progress(sp.x, sp.z);
    }
    function tryPicks(picks) {
      solid.set(baseSolid);
      for (const [, v] of picks) blockOut(v.cols, solid);
      flood(end.goal);
      api.length = toGo(end.start.x, end.start.z);
      return api.length < INF;
    }
    // how far along the way (metres from the start, as you walk)
    function progress(x, z) { return Math.max(0, api.length - Math.min(api.length, toGo(x, z))); }

    let robotDir = 1;
    function update(dt, time) {
      for (const w of wings) w.rotation.y = time * 0.5;
      robot.position.x += robotDir * dt * 0.6;
      if (robot.position.x > 44 || robot.position.x < 4) { robotDir = -robotDir; robot.position.x += robotDir * 0.05; }
      robot.rotation.y = robotDir > 0 ? 0 : PI;
    }

    const api = {
      scene, colliders, shootables, update, spawns, progress, randomize, length: 0, blocked: [], sites: SITES,
      indoor: true, flyY: 2.6,
      start: Object.assign({}, ENDS.main.start),
      bounds,
      spawn: { x: 66, z: 16, w: 6, d: 2 },
      goal: p => end.goal(p.x, p.z),
      // how js/monsters.js treats this map: more monsters at once and more often, none taller
      // than the doors, more of the Bartek family (weight x1.5, from 15 s) and the office-only
      // Barteks
      monsters: { density: 1.8, maxHeight: 2.5, boost: { Bartek: { weight: 1.5, from: 15 } }, office: true },
    };
    randomize();
    return api;
  }

  return { build };
})();
