// Runthrough: Office X, built from the floor plans, the photos and the walk-through video of
// a real office (kept out of the repo in assets/office/; floorplan.svg marks where each view was
// taken). You start outside the main entrance (HUVUDENTRÉ) and have to get out through the
// revolving door at the far end of the South building. The way the video goes: revolving door →
// café → turnstiles → corridor between the team areas → the garage (the concept lab, where the
// video cuts, so it's guessed from the plan) → the stair hall ("same feature" on the plan) → the
// hall of two-storey room pods in the South building → turnstiles → reception → revolving door.
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
      const h = o.h || 3.6, m = o.m || M.wood, d = o.doors || {};
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
    const H1 = 6.5, OUT = 9;
    box(M.tile, 46.3, -0.1, 0, 61.5, 0, 19);           // lobby and café
    box(M.tile, 0, -0.1, 19, 72, 0, 29);               // corridor and the collaboration strips
    box(M.office, 0, -0.1, 0, 46.3, 0, 19);
    box(M.office, 61.5, -0.1, 0, 72, 0, 19);
    box(M.office, 0, -0.1, 29, 72, 0, 47.5);
    box(M.concrete, 72, -0.1, 0, 96.5, 0, 47.5);       // garage and its labs
    box(M.tile, 96.5, -0.1, 0, 108, 0, 47.5);
    box(M.carpet, 0.5, 0, 22.6, 71.5, 0.01, 24.4);     // dark runner (video 0:16)

    wallZ(M.brick, 0, 0, 108, OUT, [[53.7, 3.0, 2.8]]);
    wallZ(M.brick, 47.5, 0, 108, OUT);
    wallX(M.brick, 0, 0, 47.5, OUT);
    wallX(M.brick, 108, 0, 47.5, OUT, [[23.5, 4.0, 3.4]]);
    windowsZ(0, 2, 106, [[49, 58.5], [79, 89]]);
    windowsZ(47.5, 2, 106);
    windowsX(0, 2, 46);
    ceiling(0, 0, 72, 47.5, H1);
    ceiling(96.5, 0, 108, 47.5, H1);
    for (let x = 6; x < 70; x += 12) box(M.skylight, x - 0.8, H1 - 0.02, 1.5, x + 0.8, H1, 46);   // skylights (view L)

    // Outside the main entrance: canopy, COMPANY letters (view J) and the revolving door
    revolving(53.7, 0, false);
    box(M.dark, 50.7, 2.95, -2.2, 56.7, 3.2, 0);
    sign(letters('COMPANY', '#f4f4f4'), 9.6, 1.3, 1400, 190, 53.7, 5.3, -0.12, PI, true);

    // --- Lobby and café (views A, B; video 0:04-0:12) ---
    wallX(M.wood, 46.3, 0, 19, H1, [12.5]);
    wallX(M.plaster, 61.5, 0, 19, H1, [13.6]);
    const mural = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.6), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(muralCanvas()) }));
    mural.position.set(61.38, 3.2, 6.4); mural.rotation.y = -PI / 2;
    scene.add(mural); shootables.push(mural);
    // café counter on the right as you come in, with glass displays and a black hood
    box(M.dark, 46.4, 0, 2.5, 47.6, 1.05, 9.5, true);
    box(M.steel, 46.4, 1.05, 2.5, 47.7, 1.09, 9.5);
    box(M.glass, 46.6, 1.09, 3, 47.5, 1.55, 6.5);
    for (let z = 3.2; z < 6.4; z += 0.5) box([M.orange, M.green, M.white, M.red][(rnd() * 4) | 0], 46.8, 1.09, z, 47.2, 1.2, z + 0.3);
    for (let z = 7; z < 9.3; z += 0.7) box(M.black, 46.6, 1.09, z, 47.1, 1.6, z + 0.45);
    box(M.dark, 46.4, 2.7, 2.5, 47.9, 3.4, 9.5);
    box(M.lamp, 46.5, 2.68, 2.6, 47.8, 2.7, 9.4);
    // the orange bench on the left (video 0:06)
    box(M.orange, 51.4, 0, 3, 52.0, 0.45, 10);
    box(M.orange, 51.85, 0.45, 3, 52.05, 1.1, 10, true);
    // round black café tables with black chairs
    for (const x of [55.6, 58.3, 60.8]) for (const z of [3.8, 6.6, 9.4]) {
      cyl(M.black, x, 0.72, z, 0.45, 0.45, 0.04, 16);
      cyl(M.black, x, 0, z, 0.05, 0.05, 0.72, 6);
      collide(x - 0.35, z - 0.35, x + 0.35, z + 0.35, 0.76);
      chair(x - 0.75, z, 'e'); chair(x + 0.75, z, 'w');
    }
    // the wooden seating steps (view B, video 0:04): you can climb them
    for (let i = 0; i < 5; i++) {
      box(M.oak, 52.5, 0, 11.5 + i * 0.9, 58.5, 0.38 * (i + 1), 16, true);
      if (i % 2) for (let x = 53; x < 58; x += 1.6) box(M.cushion, x, 0.38 * (i + 1), 11.6 + i * 0.9, x + 0.9, 0.38 * (i + 1) + 0.1, 11.6 + i * 0.9 + 0.6);
    }
    box(M.orange, 52.5, 0, 16, 58.5, 2.4, 19, true);     // the dish return ("Disk")
    box(M.dark, 58.5, 0, 16, 61.5, 3.0, 19, true);       // kitchen
    plant(60.5, 11.2, 1.2); plant(47.2, 11, 1.1);
    // turnstiles into the office, with coloured acoustic panels above (video 0:10-0:12)
    turnstiles(17, 46.4, 52.5, 49.0, true);
    [[0x2c5aa0, 46.4, 15.6], [0x9a6f86, 48.4, 15.6], [0x6c7178, 50.4, 15.6], [0x1f3550, 47.4, 17.6], [0xb18a96, 49.4, 17.6]]
      .forEach(([c, x, z]) => box(lam({ color: c }), x, 3.4, z, x + 2, 3.5, z + 2));
    box(M.dark, 46.3, 2.35, 19.1, 52.5, 3.65, 19.25);
    sign(officeSign, 3.6, 1.2, 600, 200, 49.4, 3.0, 19.05, PI);   // over the gates

    // --- The north side: team areas and meeting-room pods between the columns ---
    // A pod: a stack of rooms along z; doors alternate east/west, the end room opens to the corridor
    // through: the end room also has a door on that side (a way round a blocked corridor)
    function podL(x0, x1, z0, z1, toCorridor, through) {
      const n = 4, step = (z1 - z0) / n, cx = (x0 + x1) / 2;
      for (let i = 0; i < n; i++) {
        const a = z0 + i * step, b = a + step, end = toCorridor === 's' ? i === n - 1 : i === 0;
        const doors = end ? { [toCorridor]: [cx], ...(through ? { [through]: [(a + b) / 2] } : {}) } : (i % 2 ? { w: [(a + b) / 2] } : { e: [(a + b) / 2] });
        room(x0, a, x1, b, { doors, glass: end ? null : [i % 2 ? 'e' : 'w', a + 0.6, b - 0.6] });
      }
    }
    podL(10.7, 16.5, 0, 19, 's');
    podL(31, 37, 0, 19, 's');
    desks(0, 10.7, 0, 19, 'n');
    desks(16.5, 31, 0, 19, 'n');
    desks(37, 46.3, 0, 19, 'n');

    // --- The corridor (video 0:14-0:18): green sofas, ducts, LED lines, a cleaning robot ---
    for (let x = 38.5; x < 45; x += 3.2) {
      box(M.green, x, 0, 19.3, x + 2.4, 0.45, 20.2);
      box(M.green, x, 0.45, 19.3, x + 2.4, 0.95, 19.55, true);
      cyl(M.white, x + 1.2, 0, 21.0, 0.35, 0.35, 0.42, 14);
    }
    for (const x of [20, 25, 41, 46, 52]) {
      cyl(M.white, x, 0, 27.6, 0.5, 0.5, 1.05, 16);
      cyl(M.steel, x, 1.05, 27.6, 0.55, 0.55, 0.03, 16);
      collide(x - 0.4, 27.2, x + 0.4, 28.0, 1.08);
    }
    ductX(0.5, 71.5, 5.6, 23.5, 0.45);
    for (let x = 3; x < 70; x += 6) box(M.dark, x, 5.15, 23.4, x + 0.1, H1, 23.6);
    for (let x = 4; x < 70; x += 9) plant(x, 21.3, 1.1);
    const robot = new THREE.Group();
    robot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.55, 18).translate(0, 0.3, 0), M.dark));
    robot.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06).translate(0.05, 0.6, 0), M.led));
    robot.position.set(10, 0, 25.4);
    scene.add(robot);

    // --- The south side: VR room and driving simulator, pods, team areas ---
    room(0, 29, 10.7, 38, { h: 4, skip: ['e'], doors: { n: [5], s: [5] }, roofM: M.pink });
    room(0, 38, 10.7, 47.5, { h: 4, skip: ['n', 'e'], roofM: M.pink, table: false });
    cyl(M.purple, 5.3, 0, 43, 2.0, 2.0, 0.3, 24);      // the simulator's round platform
    podL(10.7, 16.5, 29, 47.5, 'n');
    podL(31, 37, 29, 47.5, 'n');
    podL(56.3, 62, 29, 47.5, 'n', 'e');
    desks(16.5, 31, 29, 47.5, 's');
    desks(37, 56.3, 29, 47.5, 's');
    desks(62, 72, 29, 47.5, 's');
    // the Startup incubator banner (view L)
    sign(incubatorSign, 1.8, 2.7, 300, 450, 66.5, 4.6, 33, -PI / 2);
    box(M.steel, 66.45, 5.95, 32, 66.55, 6.0, 34);

    // --- Innovation Garage (orange on the plan) ---
    wallZ(M.plaster, 19, 61.5, 72, H1, [66.7]);
    for (let x = 63.5; x < 71; x += 3.4) {
      box(M.oak, x, 0.85, 3, x + 1.6, 0.9, 13);
      box(M.grey, x + 0.1, 0, 3, x + 1.5, 0.85, 13, true);
      for (let z = 4; z < 13; z += 2.5) box([M.orange, M.blue, M.white][(rnd() * 3) | 0], x + 0.3, 0.9, z, x + 1.2, 1.3, z + 0.7);
    }
    box(M.white, 62, 0, 1, 62.1, 2.2, 6);   // whiteboard
    spawnAt(62.5, 14.5, 71, 17.8);
    spawnAt(62.5, 0.6, 71, 2.6);

    // --- The garage: Concept lab, x 72..96.5, z 0..36.5, 9 m high (the video cuts here) ---
    const HG = 9;
    wallX(M.plaster, 72, 0, 47.5, HG, [16.3, [23.5, 5, 4.6]]);
    wallX(M.plaster, 96.5, 0, 47.5, HG, [4.6, [22.75, 6.0, 4.6], 42]);
    wallZ(M.plaster, 36.5, 72, 96.5, HG, [[76.3, 2.6, 3], [84.5, 2.6, 3], [92.5, 2.6, 3]]);
    box(M.ceiling, 72, HG, 0, 96.5, HG + 0.1, 36.5);
    for (let x = 76; x < 96; x += 6) box(M.skylight, x, HG - 0.02, 2, x + 2, HG, 34);
    for (let x = 75; x < 96; x += 7) for (let z = 5; z < 36; z += 8) {
      cyl(M.dark, x, 7.2, z, 0.45, 0.25, 0.4, 14);
      cyl(M.lamp, x, 7.18, z, 0.42, 0.42, 0.02, 14);
    }
    sign(noCameraSign, 0.55, 0.8, 220, 320, 71.87, 1.6, 26.8, -PI / 2);   // video 0:20
    sign(label('CONCEPT LAB'), 3.6, 0.7, 720, 140, 71.87, 5.3, 23.5, -PI / 2);
    // roller door in the north wall
    box(M.slats, 79.5, 0, 0.1, 88.5, 6, 0.25);
    for (const x of [79.3, 88.5]) box(M.yellowPaint, x, 0, 0.1, x + 0.2, 6.2, 0.35, true);
    // yellow lines marking the bays and the walkway
    for (const z of [3.5, 15, 28]) box(M.yellow, 73, 0, z, 96, 0.012, z + 0.12);
    for (const z of [20.6, 25.4]) box(M.yellow, 72.2, 0, z, 96.3, 0.012, z + 0.12);
    for (let x = 80; x < 96; x += 8) box(M.yellow, x, 0, 3.5, x + 0.12, 0.012, 15);

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
    truck(76.5, 5.2, 6.8, M.truck);
    truck(86.5, 10.6, 7, M.white);
    truck(78.5, 29.5, 6.4, M.truck, false);   // cab-less hauler
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
    rack(73, 78.8, 0.2, 1.4);
    rack(89.5, 96.2, 0.2, 1.4);
    rack(95, 96.3, 26.5, 35.5);
    // workbench with a pegboard along the west wall
    box(M.oak, 72.1, 0.9, 2.5, 73.1, 0.95, 13.5);
    box(M.grey, 72.1, 0, 2.5, 73.1, 0.9, 13.5, true);
    box(M.felt, 72.11, 1.2, 3, 72.2, 2.6, 13);
    for (let z = 3.5; z < 12.8; z += 1.1) box(M.steel, 72.2, rr(1.4, 2.3), z, 72.3, rr(2.0, 2.5), z + 0.2);
    for (const [x, z] of [[74, 33], [95.4, 16.5], [83.5, 17]]) { box(M.red, x - 0.5, 0, z - 0.35, x + 0.5, 1.1, z + 0.35, true); box(M.steel, x - 0.5, 1.1, z - 0.35, x + 0.5, 1.13, z + 0.35); }
    for (const [x, z] of [[85, 8], [85.8, 8.6], [76, 15.8], [93, 26.8], [80, 26.8]]) { add(M.orange, new THREE.ConeGeometry(0.18, 0.7, 10).translate(x, 0.35, z)); box(M.orange, x - 0.22, 0, z - 0.22, x + 0.22, 0.03, z + 0.22); }
    // overhead crane
    for (const z of [2, 34.5]) box(M.yellowPaint, 72.2, 7.6, z - 0.2, 96.3, 8.0, z + 0.2);
    box(M.yellowPaint, 84.6, 7.4, 2, 85.4, 7.9, 34.5);
    box(M.dark, 84.7, 6.6, 14, 85.3, 7.4, 14.8);
    cyl(M.steel, 85, 4.2, 14.4, 0.02, 0.02, 2.4, 4);
    ductZ(0.3, 36.2, 8.2, 74.5, 0.5);
    // spawn spots in the garage (behind the trucks and racks)
    spawnAt(74, 2, 78, 4.5); spawnAt(91, 2, 95.5, 4.5); spawnAt(87, 14, 93, 15.8); spawnAt(73.5, 31.5, 77, 35.5);
    // lab rooms south of the garage
    ceiling(72, 36.5, 96.5, 47.5, H1);
    room(72, 36.5, 80.5, 47.5, { h: H1, walls: false, roof: false });
    room(80.5, 36.5, 88.5, 47.5, { h: H1, walls: false, roof: false });
    room(88.5, 36.5, 96.5, 47.5, { h: H1, walls: false, roof: false });
    wallX(M.plaster, 80.5, 36.5, 47.5, H1);
    wallX(M.plaster, 88.5, 36.5, 47.5, H1);
    for (const x of [73, 81.5, 89.5]) { box(M.grey, x, 0, 45.5, x + 6, 0.9, 46.6, true); box(M.steel, x, 0.9, 45.5, x + 6, 0.93, 46.6); }

    // --- East strip: labs and the stair hall ("same feature" on both plans) ---
    wallZ(M.plaster, 9, 96.5, 108, H1, [103]);
    wallZ(M.plaster, 19, 96.5, 108, H1, [99.6]);
    wallZ(M.plaster, 26, 96.5, 108, H1, [99.6]);
    wallZ(M.plaster, 36.5, 96.5, 108, H1, [103]);
    spawnAt(97.5, 1, 107, 8); spawnAt(97.5, 10, 107, 18); spawnAt(97.5, 27, 107, 35.5); spawnAt(97.5, 37.5, 107, 46.5);
    for (const [z0, z1] of [[1, 8], [27, 35.5], [37.5, 46.5]]) { box(M.white, 103, 0, z0 + 1, 107.5, 0.9, z0 + 2.2, true); box(M.screen, 104, 0.9, z0 + 1.3, 105.2, 1.6, z0 + 1.35); }
    for (let i = 0; i < 9; i++) box(M.oak, 102.5 + i * 0.6, 0, 19.1, 107.9, 0.36 * (i + 1), 20.9, true);
    box(M.glass, 102.5, 0.4, 20.88, 107.9, 4.3, 20.95);
    ductX(96.5, 108, 5.5, 23.5, 0.4);

    // =========================================================================================
    // The South building: x 108..212, z 0..47.5, one high hall (7.5 m) with two-storey room pods
    const H2 = 7.5;
    box(M.office, 108, -0.1, 0, 193.4, 0, 47.5);
    box(M.office, 193.4, -0.1, 0, 201, 0, 15.7);
    box(M.tile, 193.4, -0.1, 15.7, 201, 0, 20.9);
    box(M.office, 193.4, -0.1, 20.9, 201, 0, 47.5);
    box(M.tile, 201, -0.1, 0, 212, 0, 47.5);
    box(M.carpet, 108.5, 0, 22.4, 118, 0.01, 24.6);
    box(M.carpet, 118, 0, 22.0, 138.5, 0.01, 23.6);
    box(M.carpet, 138.5, 0, 20.0, 193.4, 0.01, 21.6);
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

    // west end: closed rooms, a passage from the stair hall, service rooms
    wallZ(M.plaster, 21.5, 108, 122.9, 4.5, [110.6, 117.1]);
    wallZ(M.plaster, 10, 108, 122.9, 4.5);
    wallX(M.plaster, 122.9, 0, 21.5, H2);
    box(M.plaster, 108, 4.5, 0, 122.9, 4.7, 21.5);
    spawnAt(110, 11.5, 121.5, 20);
    wallZ(M.plaster, 25.5, 108, 118.2, 4.5);
    wallZ(M.plaster, 34, 108, 118.2, 4.5);
    wallX(M.plaster, 118.2, 25.5, 47.5, 4.5, [29.1, 41.1]);
    box(M.plaster, 108, 4.5, 25.5, 118.2, 4.7, 47.5);
    spawnAt(109.5, 27, 117, 33); spawnAt(109.5, 35.5, 117, 46.5);
    // the lab with six vehicle bays (the rectangles on the plan)
    wallZ(M.plaster, 21.5, 122.9, 137.3, H2, [[130.1, 3.0, 3.4]]);
    wallX(M.plaster, 137.3, 0, 21.5, H2, [[17.1, 2.6, 3.2]]);
    function car(x, z, color) {   // along z
      box(color, x - 0.85, 0.35, z, x + 0.85, 1.05, z + 4.4);
      box(M.navy, x - 0.75, 1.05, z + 1.2, x + 0.75, 1.55, z + 3.4);
      for (const dz of [0.8, 3.6]) for (const s of [-1, 1]) add(M.black, new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12).rotateZ(PI / 2).translate(x + s * 0.82, 0.33, z + dz));
      cyl(M.dark, x, 1.55, z + 2.3, 0.12, 0.12, 0.18, 10);
      collide(x - 0.85, z, x + 0.85, z + 4.4, 1.55);
    }
    for (const x of [125.8, 130.1, 134.4]) for (const z of [2, 11.5]) {
      box(M.grey, x - 1.3, 0, z, x + 1.3, 0.12, z + 7.5);
      if (rnd() < 0.6) car(x, z + 1.5, [M.white, M.red, M.blue, M.dark][(rnd() * 4) | 0]);
    }
    spawnAt(124, 9.6, 136, 11.3); spawnAt(124, 19.6, 136, 21);

    // Room pods: a ground floor of rooms (wood, blue glass for the video studios) under a
    // white upper storey with a blue window band, and a spiral stair (views E, F, M)
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
    const TOP = [[142, 147.5], [156.9, 162.4], [171.6, 177]];
    TOP.forEach(([x0, x1], i) => {
      const cx = (x0 + x1) / 2;
      room(x0, 0.1, x1, 6.6, { h: 3.5, doors: { [i % 2 ? 'e' : 'w']: [3.4] }, glass: [i % 2 ? 'w' : 'e', 1, 6], roofM: M.white });
      room(x0, 6.6, x1, 13.1, { h: 3.5, doors: { s: [cx] }, glass: [i % 2 ? 'e' : 'w', 7.2, 12.5], roofM: M.white });
      upper(x0, 0.1, x1, 13.1);
      spiral(x0 + 0.8, 14.0);
      room(x0, 15.4, x1, 19, { h: 3.0, doors: { n: [cx] }, table: false });   // small rooms by the passage
    });
    const MID = [[127.6, 133.1], [142, 147.5], [156.9, 162.4], [171.6, 176.9], [186.2, 191.3]];
    // doors at both ends: a way round when the passage is blocked
    MID.forEach(([x0, x1]) => room(x0, 24, x1, 28.5, { h: 3.2, doors: { n: [(x0 + x1) / 2], s: [(x0 + x1) / 2] }, table: false }));
    for (let i = 0; i < 10; i++) box(M.oak, 147.8 + i * 0.48, 0, 22, 152.6, 0.35 * (i + 1), 24, true);   // stair up
    box(M.glass, 147.8, 0.4, 21.95, 152.6, 4.4, 22.0);
    const LOW = [[127.6, 132.7], [142, 147.5], [156.9, 161.9], [171.6, 176.9], [186.2, 191.3]];
    LOW.forEach(([x0, x1], i) => {
      room(x0, 32.3, x1, 37.3, { h: 3.5, doors: { n: [x0 + 1.6] }, roofM: M.white });
      room(x0, 37.3, x1, 42.3, { h: 3.5, doors: { [i % 2 ? 'w' : 'e']: [39.8] }, glass: [i % 2 ? 'e' : 'w', 37.8, 41.8], roofM: M.white });
      room(x0, 42.3, x1, 47.4, { h: 3.5, doors: { [i % 2 ? 'e' : 'w']: [44.8] }, glass: [i % 2 ? 'w' : 'e', 42.8, 46.8], roofM: M.white });
      upper(x0, 32.3, x1, 47.4);
      spiral(x1 - 0.8, 31.3);
    });
    // open team areas between the pods
    desks(137.3, 142, 0, 14.6, 'n');
    [[147.5, 156.9], [162.4, 171.6], [177, 186.2]].forEach(([a, b]) => desks(a, b, 0, 14.6, 'n'));
    [[118.2, 127.6], [132.7, 142], [147.5, 156.9], [161.9, 171.6], [176.9, 186.2]].forEach(([a, b]) => desks(a, b, 31.5, 47.5, 's'));
    // white storage units along the passage (video 0:22-0:26)
    for (const [a, b] of [[147.5, 156.9], [162.4, 171.6], [177, 186.2]]) box(M.white, (a + b) / 2 - 1.2, 0, 14.9, (a + b) / 2 + 1.2, 1.25, 15.3, true);
    for (const [a, b] of [[118.2, 127.6], [132.7, 142], [147.5, 156.9], [161.9, 171.6], [176.9, 186.2]]) box(M.white, (a + b) / 2 - 1.2, 0, 30.4, (a + b) / 2 + 1.2, 1.25, 30.9, true);
    for (let x = 135; x < 190; x += 11) plant(x, 29.6, 1.2);
    // round pendant lamps over the passage (video 0:24), ducts, LED rings
    for (let x = 150; x < 166; x += 2.2) { ball(M.lamp, x, 3.8 + (x % 2) * 0.3, 20.5, 0.35); cyl(M.dark, x, 4.1, 20.5, 0.01, 0.01, H2 - 4.1, 3); }
    ductX(108.5, 211, 6.5, 21, 0.55);
    ductX(118, 193, 6.6, 30, 0.35);
    ductZ(0.5, 47, 6.7, 140, 0.35);
    for (const [x, z] of [[152, 7], [167, 7], [181.5, 7], [123, 39.5], [137.5, 39.5], [152, 39.5], [166.5, 39.5], [181.5, 39.5], [123, 28.8]]) ring(x, z, 4.4, 1.6);

    // The studio X210 (views C, F, G): cameras, high tables, a ring light and a big screen
    wallX(M.plaster, 186.2, 0, 15.7, H2);
    wallZ(M.plaster, 15.7, 186.2, 212, H2, [[191, 3.0, 3.2], 206.1]);
    wallX(M.plaster, 201, 0, 15.7, H2, [3.9]);
    wallZ(M.plaster, 7.8, 201, 212, 4);
    box(M.plaster, 201, 4, 0, 212, 4.2, 15.7);
    box(M.dark, 186.3, 0, 0.1, 201, 0.02, 15.6);
    box(M.screen, 192, 1.5, 0.12, 197, 4.2, 0.2);
    ring(193.5, 7.5, 4.6, 2.2); ring(193.5, 7.5, 4.9, 1.4);
    for (const [x, z] of [[191.5, 8.5], [195.5, 7]]) { cyl(M.white, x, 1.08, z, 0.5, 0.5, 0.04, 16); cyl(M.grey, x, 0, z, 0.05, 0.05, 1.08, 6); collide(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 1.12); }
    for (const [x, z] of [[189, 12.5], [198, 12], [193.5, 13.5]]) {
      for (let k = 0; k < 3; k++) add(M.dark, new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4).translate(0, 0.8, 0).rotateZ(0.25).rotateY(k * 2.1).translate(x, 0, z));
      box(M.black, x - 0.2, 1.5, z - 0.35, x + 0.2, 1.85, z + 0.35);
      cyl(M.dark, x, 1.55, z - 0.5, 0.1, 0.12, 0.2, 10);
    }
    spawnAt(188, 1.5, 199.5, 6); spawnAt(202.5, 1.5, 210.5, 6.5); spawnAt(202.5, 9, 210.5, 14.5);
    // kitchen, the video rooms and the rooms behind reception
    room(193.4, 20.9, 201, 34, { h: 3.6, m: M.plaster, doors: { w: [27.1] }, table: false });
    box(M.white, 199.5, 0, 22, 200.8, 0.95, 33, true);
    box(M.oak, 199.4, 0.95, 22, 200.8, 1.0, 33);
    room(193.4, 34, 201, 40.7, { h: 3.6, skip: ['n'], doors: { w: [37.35] }, glass: ['w', 38.6, 40.3] });
    room(193.4, 40.7, 201, 47.5, { h: 3.6, doors: { w: [44.1] }, glass: ['w', 41.1, 42.8] });
    room(201, 30, 212, 47.5, { h: 4, m: M.plaster, skip: ['w'], doors: { n: [206.1] } });
    // the gates into reception (video 0:34-0:36), with the Office X sign above (view I)
    turnstiles(196.5, 15.8, 20.9, 18.4, false);
    box(M.dark, 196.4, 3.0, 15.7, 196.6, 4.3, 20.9);
    sign(officeSign, 3.9, 1.3, 600, 200, 196.38, 3.65, 18.3, -PI / 2);
    // reception (video 0:38-0:40, view D)
    box(M.white, 202.5, 0, 16.4, 205.8, 1.1, 17.5, true);
    box(M.oak, 202.5, 0, 17.48, 205.8, 1.0, 17.52);
    box(M.screen, 210, 1.6, 15.82, 211.6, 2.5, 15.86);
    sign(officeSign, 4.5, 1.5, 600, 200, 206.5, 4.6, 15.83, 0);
    for (const x of [207.5, 209.6]) { box(M.white, x - 0.9, 0, 26.6, x + 0.9, 0.45, 27.5); box(M.white, x - 0.9, 0.45, 27.3, x + 0.9, 0.85, 27.5, true); }
    cyl(M.dark, 202.3, 0, 28.6, 0.04, 0.04, 1.8, 6); ball(M.orange, 202.3, 1.5, 28.6, 0.22);   // coat stand
    plant(210.8, 16.6, 1.3); plant(201.8, 23.4, 1.2);
    box(M.dark, 210.6, 0, 23.8, 211.4, 1.2, 24.4, true);   // bins by the door

    // ---------- Things in the way, different every round ----------
    // Each site is a line across a passage that has a way round it (through rooms, the other
    // gates or the next gap between the pods). `types` lists what fits there: a row of sign
    // stands, or scissor lifts and mail carts with sign stands filling the rest of the line.
    // Every site/type pair is built once, hidden; randomize() picks a few for each round.
    const SITES = [
      { name: 'café gate', line: 17, a0: 49.0, a1: 52.3, alongX: true, deck: 2.0, ceil: 3.4, types: ['signs', 'cart', 'lift'] },
      { name: 'corridor by pod D', line: 59.2, a0: 19.1, a1: 28.9, deck: 3.6, ceil: H1, types: ['signs', 'lift+cart', 'cart+cart+cart', 'lift+lift'] },
      { name: 'garage, way in', line: 72.75, a0: 21.05, a1: 25.95, deck: 5.4, ceil: HG, types: ['signs', 'lift', 'cart+cart', 'lift+cart'] },
      { name: 'garage, way out', line: 96.0, a0: 19.8, a1: 25.7, deck: 5.4, ceil: HG, types: ['signs', 'lift', 'cart+cart+cart', 'lift+cart'] },
      { name: 'after the stair hall', line: 114, a0: 21.6, a1: 25.4, deck: 3.6, ceil: H2, types: ['signs', 'lift', 'cart', 'cart+cart'] },
      { name: 'south, by the lab', line: 132.3, a0: 21.6, a1: 23.9, types: ['signs', 'cart'] },
      { name: 'south, pod 2', line: 146.6, a0: 19.1, a1: 23.9, deck: 4.6, ceil: H2, types: ['signs', 'lift', 'cart+cart', 'lift+cart'] },
      { name: 'south, pod 3', line: 162.1, a0: 19.1, a1: 23.9, deck: 4.6, ceil: H2, types: ['signs', 'lift', 'cart+cart', 'lift+cart'] },
      { name: 'south, pod 4', line: 176.1, a0: 19.1, a1: 23.9, deck: 4.6, ceil: H2, types: ['signs', 'lift', 'cart+cart', 'lift+cart'] },
      { name: 'reception gate', line: 196.5, a0: 18.4, a1: 20.7, types: ['signs', 'cart'] },
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
      if (m === M.glass || m === M.blueGlass) mesh.renderOrder = 1;
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
