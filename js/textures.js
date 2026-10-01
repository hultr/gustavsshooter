// Procedural textures for the detailed graphics, drawn on canvases at start-up
// (image files can't be loaded as WebGL textures from file://).
// Monster skins: flesh, wrinkles, bark, slime, leather, fur, chitin, gums, enamel.
// Gun materials: steel, polymer, wood, brass, painted metal, rubber, fabric.
window.GS = window.GS || {};

GS.Tex = (function () {
  const N = GS.Noise;
  const cache = {};
  const once = (k, make) => cache[k] || (cache[k] = make());
  const clamp = x => Math.max(0, Math.min(1, x));
  const S = 256;

  // Fill a canvas pixel by pixel: fn(u, v) returns [r, g, b] in 0..1
  function pixels(fn, size = S) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const v = fn(x / size, y / size), i = (y * size + x) * 4;
      d[i] = clamp(v[0]) * 255; d[i + 1] = clamp(v[1]) * 255; d[i + 2] = clamp(v[2]) * 255; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function tex(canvas, rx = 1, ry = 1) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    return t;
  }
  const grey = v => [v, v, v];

  // Tiling cell noise: distance to the nearest and second-nearest point (cells x cells grid)
  function worley(u, v, cells, seed) {
    const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y);
    let f1 = 9, f2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = ix + i, cy = iy + j, wx = ((cx % cells) + cells) % cells, wy = ((cy % cells) + cells) % cells;
      const px = cx + N.hash(wx, wy, 1, seed), py = cy + N.hash(wx, wy, 2, seed);
      const d = Math.hypot(px - x, py - y);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    return [f1, f2];
  }
  // Thin winding lines (veins, cracks): 1 on the line, 0 away from it
  const ridge = (n, w) => clamp(1 - Math.abs(n - 0.5) / w);

  // ---------- Monster skins: a colour map (multiplied by the material colour) + bump ----------
  // Each pattern returns [r, g, b, height]
  const SKIN = {
    flesh(u, v) {
      const m = N.fbm(u, v, 4, 4, 4, 1), veins = ridge(N.fbm(u, v, 6, 6, 3, 2), 0.02) * m * m * 0.9;
      const pores = N.fbm(u, v, 48, 48, 1, 3);
      const k = 0.72 + 0.32 * m - 0.08 * pores;
      return [k - veins * 0.15, k - veins * 0.3, k - veins * 0.12, m * 0.5 + veins * 0.25 + pores * 0.2];
    },
    wrinkle(u, v) {
      const m = N.fbm(u, v, 3, 3, 4, 4), w = ridge(N.fbm(u, v, 5, 8, 3, 5), 0.025) * m, pores = N.fbm(u, v, 40, 40, 1, 6);
      const k = 0.76 + 0.28 * m - w * 0.1 - pores * 0.06;
      return [k, k - 0.03, k - 0.05, m * 0.5 + (1 - w) * 0.25 + pores * 0.25];
    },
    bark(u, v) {
      const g = N.fbm(u, v, 14, 2, 4, 6), crack = ridge(N.fbm(u, v, 10, 2, 3, 7), 0.05);
      const k = 0.55 + 0.45 * g - crack * 0.4;
      return [k, k * 0.92, k * 0.8, g * 0.7 - crack * 0.5 + 0.4];
    },
    slime(u, v) {
      const [f1] = worley(u, v, 8, 8), spot = f1 < 0.28 ? 1 - f1 / 0.28 : 0, m = N.fbm(u, v, 4, 4, 3, 9);
      const k = 0.85 + 0.15 * m - spot * 0.45;
      return [k - spot * 0.1, k, k - spot * 0.2, m * 0.3 + spot * 0.5];
    },
    leather(u, v) {
      const [f1, f2] = worley(u, v, 10, 10), crack = clamp(1 - (f2 - f1) / 0.12), m = N.fbm(u, v, 5, 5, 3, 11);
      const k = 0.7 + 0.3 * m - crack * 0.35;
      return [k, k, k * 0.98, 0.8 - crack * 0.7 + m * 0.2];
    },
    chitin(u, v) {
      const m = N.fbm(u, v, 3, 3, 3, 12), bands = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 6 + m * 4);
      const k = 0.75 + 0.2 * m + 0.1 * bands;
      return [k, k * 0.95, k * 0.9, bands * 0.4 + m * 0.3];
    },
    gum(u, v) {
      const m = N.fbm(u, v, 6, 6, 4, 13), veins = ridge(N.fbm(u, v, 4, 4, 3, 14), 0.04);
      return [0.8 + 0.2 * m, 0.7 + 0.2 * m - veins * 0.3, 0.75 + 0.2 * m, m * 0.6];
    },
    enamel(u, v) {
      const m = N.fbm(u, v, 3, 6, 3, 15), stain = clamp(v * 1.4 - 0.4) * 0.25;
      return [0.97 - stain * 0.3, 0.95 - stain * 0.5, 0.88 - stain, m * 0.2];
    },
    eyeball(u, v) {
      const veins = ridge(N.fbm(u, v, 4, 4, 4, 16), 0.03) * clamp(Math.abs(v - 0.5) * 2.5);
      return [1, 1 - veins * 0.6, 1 - veins * 0.55, 0.5];
    },
  };
  // Fur is drawn with strokes instead of per pixel
  function furCanvas() {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, S, S);
    let seed = 5;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.lineCap = 'round';
    for (let i = 0; i < 4500; i++) {
      const x = rnd() * S, y = rnd() * S, l = 6 + rnd() * 12, a = Math.PI / 2 + (rnd() - 0.5) * 0.7, s = 90 + rnd() * 165 | 0;
      g.strokeStyle = `rgb(${s},${s},${s})`;
      g.lineWidth = 1 + rnd() * 1.5;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke();
      }
    }
    return c;
  }

  // { map, bump } for a skin pattern; repeat = tiles around x along
  function skin(kind, rx = 2, ry = 1) {
    return once(`skin-${kind}-${rx}-${ry}`, () => {
      const base = once('skinCanvas-' + kind, () => {
        if (kind === 'fur') { const c = furCanvas(); return { map: c, bump: c }; }
        const f = SKIN[kind], h = [];
        const map = pixels((u, v) => { const r = f(u, v); h.push(r[3]); return r; });
        let i = 0;
        const bump = pixels(() => grey(h[i++]));
        return { map, bump };
      });
      return { map: tex(base.map, rx, ry), bump: tex(base.bump, rx, ry) };
    });
  }

  // Iris disc for a detailed eye: coloured ring, dark rim, slit pupil
  function iris(color) {
    return once('iris' + color, () => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), col = new THREE.Color(color);
      const css = k => `rgb(${col.r * 255 * k | 0},${col.g * 255 * k | 0},${col.b * 255 * k | 0})`;
      const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
      grd.addColorStop(0, css(1.6)); grd.addColorStop(0.55, css(1)); grd.addColorStop(0.85, css(0.5)); grd.addColorStop(1, '#000');
      g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5;
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2;
        g.beginPath(); g.moveTo(64 + Math.cos(a) * 14, 64 + Math.sin(a) * 14); g.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); g.stroke();
      }
      g.fillStyle = '#050505';
      g.beginPath(); g.ellipse(64, 64, 9, 44, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.85)';
      g.beginPath(); g.arc(50, 46, 7, 0, Math.PI * 2); g.fill();
      return new THREE.CanvasTexture(c);
    });
  }

  // ---------- Gun materials ----------
  const GUN = {
    // brushed streaks along u plus fine scratches; colour, roughness and bump share it
    brushed(u, v) {
      const s = N.fbm(u, v, 2, 96, 3, 21), sc = ridge(N.fbm(u, v, 6, 6, 2, 22), 0.012), m = N.fbm(u, v, 3, 3, 3, 23);
      return [0.82 + 0.18 * s + sc * 0.3, 0.45 + 0.25 * s + 0.3 * m - sc * 0.3, 0.5 + s * 0.3];
    },
    stipple(u, v) {
      const n = N.fbm(u, v, 64, 64, 2, 24), m = N.fbm(u, v, 3, 3, 3, 25);
      return [0.88 + 0.12 * m, 0.65 + 0.2 * m + n * 0.15, n];
    },
    wood(u, v) {
      const w = N.fbm(u, v, 1, 3, 4, 26), grain = 0.5 + 0.5 * Math.sin((v * 22 + w * 6) * Math.PI);
      const fine = N.fbm(u, v, 3, 90, 2, 27), knot = N.fbm(u, v, 2, 2, 3, 28);
      const k = 0.62 + 0.25 * grain * grain + 0.15 * fine - 0.12 * knot;
      return [k, k * 0.74, k * 0.52];
    },
    paint(u, v) {
      const m = N.fbm(u, v, 4, 4, 4, 29), chip = N.fbm(u, v, 8, 8, 3, 30) > 0.72 ? 1 : 0;
      return [0.85 + 0.15 * m - chip * 0.12, 0.55 + 0.25 * m - chip * 0.3, chip];
    },
    checker(u, v) {
      const a = Math.abs(((u + v) * 40) % 1 - 0.5), b = Math.abs(((u - v + 4) * 40) % 1 - 0.5);
      const d = Math.min(a, b) * 2;
      return [0.9, 0.7 + 0.15 * d, d];
    },
    knit(u, v) {
      const k = 0.5 + 0.25 * Math.sin(u * Math.PI * 2 * 48) * Math.sin(v * Math.PI * 2 * 48 + Math.sin(u * Math.PI * 2 * 96)), m = N.fbm(u, v, 4, 4, 3, 31);
      return [0.8 + 0.2 * m, 0.85, k];
    },
  };
  // Returns { map (colour), rough (G = roughness), bump }
  function gunTex(kind) {
    return once('gun-' + kind, () => {
      const f = GUN[kind], cells = [];
      const map = pixels((u, v) => { const r = f(u, v); cells.push(r); return kind === 'wood' ? r : grey(r[0]); });
      let i = 0;
      const rough = pixels(() => { const r = cells[i++]; return [0, r[1], 0]; });
      i = 0;
      const bump = pixels(() => grey(cells[i++][2]));
      return { map: tex(map), rough: tex(rough), bump: tex(bump) };
    });
  }

  // Studio-like reflections so metal looks like metal: sky gradient, warm ground and
  // a couple of soft boxes, pre-filtered with PMREM.
  function env(renderer) {
    return once('env', () => {
      const scene = new THREE.Scene();
      const geo = new THREE.SphereGeometry(10, 32, 16), col = [], p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) / 10, c = new THREE.Color();
        if (y > 0) c.setRGB(0.55 + 0.35 * y, 0.58 + 0.35 * y, 0.65 + 0.3 * y);
        else c.setRGB(0.32 + 0.1 * y, 0.28 + 0.08 * y, 0.24 + 0.06 * y);
        col.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
      const box = (x, y, z, w, h, k) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 0.95) }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0);
        scene.add(m);
      };
      box(-4, 6, 3, 5, 3, 3);
      box(6, 3, -2, 3, 6, 1.8);
      box(0, 2, 8, 8, 1.2, 1.4);
      const pm = new THREE.PMREMGenerator(renderer);
      const rt = pm.fromScene(scene, 0.02);
      pm.dispose();
      return rt.texture;
    });
  }

  return { skin, iris, gunTex, env };
})();
