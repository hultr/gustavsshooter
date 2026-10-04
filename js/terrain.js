// Detailed stone and ground for the monster valley (the "World: Detailed" setting).
// Everything is made in code: rock, soil and grass textures drawn on canvases, a triplanar
// rock material (the texture is projected from three sides, so it never stretches), boulders
// broken into flat faces, layered cliff walls with ledges, weathered broken columns, stone
// blocks, pebbles, rubble and grass tufts that sway in the wind.
// The valley floor stays flat at y = 0 where you can walk, so nothing about the game changes.
window.GS = window.GS || {};

GS.Terrain = (function () {
  const N = GS.Noise, G = GS.Geo, PI = Math.PI, V3 = THREE.Vector3;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const ridge = (n, w) => clamp(1 - Math.abs(n - 0.5) / w);
  const rng = seed => { let s = (seed % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

  // 3D fractal value noise, roughly -1..1
  function fbm3(x, y, z, oct = 4, seed = 0) {
    let s = 0, a = 0.5, n = 0, f = 1;
    for (let o = 0; o < oct; o++) { s += a * N.n3(x * f, y * f, z * f, seed + o * 31); n += a; a *= 0.5; f *= 2.03; }
    return (s / n) * 2 - 1;
  }
  // Tiling cell noise on the unit square: [nearest, second nearest, id of the nearest cell]
  function cells(u, v, n, seed) {
    const x = u * n, y = v * n, ix = Math.floor(x), iy = Math.floor(y);
    let f1 = 9, f2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = ix + i, cy = iy + j, wx = ((cx % n) + n) % n, wy = ((cy % n) + n) % n;
      const ex = cx + N.hash(wx, wy, 1, seed) - x, ey = cy + N.hash(wx, wy, 2, seed) - y, d = ex * ex + ey * ey;
      if (d < f1) { f2 = f1; f1 = d; id = wx * 7919 + wy; } else if (d < f2) f2 = d;
    }
    return [Math.sqrt(f1), Math.sqrt(f2), N.hash(id, 0, 3, seed)];
  }

  // ---------- Textures ----------
  function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texture(c) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  }
  // Normal map from a tiling height field
  function normalTex(h, size, k) {
    const c = canvas(size), g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
    const at = (x, y) => h[((y + size) % size) * size + (x + size) % size];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * k, dy = (at(x, y + 1) - at(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
      d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (0.5 / l + 0.5) * 255; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return texture(c);
  }
  // A tiling texture drawn per pixel: fn(u, v) -> [r, g, b, height]; gives { map, normal }
  function bake(size, fn, k) {
    const c = canvas(size), g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data, h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const r = fn(x / size, y / size), i = y * size + x;
      d[i * 4] = clamp(r[0]) * 255; d[i * 4 + 1] = clamp(r[1]) * 255; d[i * 4 + 2] = clamp(r[2]) * 255; d[i * 4 + 3] = 255;
      h[i] = r[3];
    }
    g.putImageData(img, 0, 0);
    return { map: texture(c), normal: normalTex(h, size, k) };
  }

  // Rock: broad mottling, grain, plates split by cracks, thin fissures and small pits
  function rockPx(u, v) {
    const m = N.fbm(u, v, 3, 3, 5, 41), d = N.fbm(u, v, 12, 12, 3, 42), grain = N.fbm(u, v, 96, 96, 2, 43);
    const [f1, f2] = cells(u + (d - 0.5) * 0.05, v, 5, 44), crack = clamp(1 - (f2 - f1) / (0.015 + 0.035 * d)) * sstep(0.45, 0.65, N.fbm(u, v, 4, 4, 3, 47));
    const line = ridge(N.fbm(u, v, 4, 4, 4, 45), 0.012) * sstep(0.35, 0.6, m);
    const pit = sstep(0.64, 0.76, N.fbm(u, v, 24, 24, 2, 46));
    const h = 0.45 * m + 0.3 * d + 0.12 * grain - 0.45 * crack - 0.3 * line - 0.2 * pit;
    const k = 0.7 + 0.3 * m + 0.12 * (d - 0.5) + 0.18 * (grain - 0.5) - 0.22 * crack - 0.25 * line - 0.12 * pit;
    return [k * (1.02 + 0.06 * (d - 0.5)), k, k * (0.96 - 0.08 * (m - 0.5)), h];
  }
  // Soil: brown earth with stones, gravel and grit of different greys
  function dirtPx(u, v) {
    const m = N.fbm(u, v, 3, 3, 4, 51), fine = N.fbm(u, v, 48, 48, 2, 52);
    const [a1, , ai] = cells(u, v, 11, 53), [b1, , bi] = cells(u, v, 28, 54), [c1, , ci] = cells(u, v, 70, 55);
    const dome = (f, r) => Math.sqrt(clamp(1 - (f / r) ** 2));
    const pa = ai < 0.2 ? dome(a1, 0.25 + ai * 1.2) : 0, pb = bi < 0.3 ? dome(b1, 0.25 + bi) : 0, pc = ci < 0.45 ? dome(c1, 0.3 + ci * 0.4) : 0;
    const s = 0.78 + 0.35 * m + 0.25 * (fine - 0.5), clod = sstep(0.55, 0.7, N.fbm(u, v, 9, 9, 3, 57));
    let col = [0.44 * s * (1 - 0.18 * clod), 0.37 * s * (1 - 0.15 * clod), 0.28 * s * (1 - 0.1 * clod)];
    const stone = (p, id, k) => {
      if (p <= 0) return;
      const g = (0.42 + 0.36 * id) * (0.72 + 0.38 * p) * k, t = Math.min(1, p * 5), c = [g * (1.04 - id * 0.06), g, g * (0.9 + id * 0.08)];
      col = col.map((x, i) => x + (c[i] - x) * t);
    };
    stone(pc, ci, 0.85); stone(pb, bi, 0.95); stone(pa, ai, 1.05);
    return [...col, 0.35 * m + 0.12 * fine + 0.15 * clod + 0.2 * pc + 0.4 * pb + 0.75 * pa];
  }
  // Grass seen from above: blades in every direction over dark earth
  function grassTex(size) {
    const c = canvas(size), g = c.getContext('2d'), r = rng(77);
    g.fillStyle = '#3a3f25'; g.fillRect(0, 0, size, size);
    g.lineCap = 'round';
    // layers from dark to light, each one path per colour (drawing them one by one is slow)
    for (let layer = 0; layer < 6; layer++) for (let k = 0; k < 4; k++) {
      const hue = 58 + r() * 40;
      g.strokeStyle = `hsl(${hue},${20 + r() * 18}%,${16 + layer * 6 + r() * 8}%)`;
      g.lineWidth = (1 + (k % 2) * 0.9) * Math.max(0.6, size / 512);
      g.beginPath();
      for (let i = 0; i < 380; i++) {
        const x = r() * size, y = r() * size, l = (5 + r() * 12) * size / 512, a = r() * PI * 2, ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
        for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
          if ((ox && Math.min(x, ex) > 20 && Math.max(x, ex) < size - 20) || (oy && Math.min(y, ey) > 20 && Math.max(y, ey) < size - 20)) continue;
          g.moveTo(x + ox, y + oy); g.lineTo(ex + ox, ey + oy);
        }
      }
      g.stroke();
    }
    const d = g.getImageData(0, 0, size, size).data, h = new Float32Array(size * size);
    for (let i = 0; i < h.length; i++) h[i] = (d[i * 4] + d[i * 4 + 1] * 2 + d[i * 4 + 2]) / 1020;
    return { map: texture(c), normal: normalTex(h, size, 2.5) };
  }
  // One tuft of grass, standing (alpha cut-out)
  function tuftTex() {
    const c = canvas(128), g = c.getContext('2d'), r = rng(91);
    for (let i = 0; i < 46; i++) {
      const x = 64 + (r() - 0.5) * 56, h = 50 + r() * 74, w = 1.6 + r() * 2.4, lean = (r() - 0.5) * 70 + (x - 64) * 0.6;
      const hue = 55 + r() * 40, light = 26 + r() * 30;
      const grd = g.createLinearGradient(0, 128, 0, 128 - h);
      grd.addColorStop(0, `hsl(${hue},30%,${light * 0.65}%)`); grd.addColorStop(1, `hsl(${hue},${30 + r() * 25}%,${light}%)`);
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(x - w, 128);
      g.quadraticCurveTo(x - w * 0.5 + lean * 0.3, 128 - h * 0.6, x + lean, 128 - h);
      g.quadraticCurveTo(x + w * 0.5 + lean * 0.3, 128 - h * 0.6, x + w, 128);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  // Made once, when first needed (each takes about half a second)
  const T = {}, MAKE = { rock: () => bake(512, rockPx, 6), dirt: () => bake(512, dirtPx, 5), grass: () => grassTex(256), tuft: tuftTex };
  const tex = k => T[k] || (T[k] = MAKE[k]());

  // ---------- Materials ----------
  // World position and normal for the fragment shader (also for instanced meshes)
  function worldVaryings(sh) {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNormal;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        mat4 triM = modelMatrix;
        #ifdef USE_INSTANCING
          triM = modelMatrix * instanceMatrix;
        #endif
        vTriPos = (triM * vec4(transformed, 1.0)).xyz;
        vTriNormal = normalize(mat3(triM) * objectNormal);`);
  }

  // Triplanar rock: the colour and normal maps are projected along x, y and z and blended by
  // the surface direction. The same texture at a much larger scale varies the brightness so the
  // repeats don't show, and surfaces facing up get moss. Vertex colours tint each shape.
  // o: scale (texture repeats per metre), bump, moss (0..1), mossColor, side
  function rockMaterial(o = {}) {
    const t = tex('rock');
    const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, roughness: 0.93, metalness: 0, vertexColors: true, side: o.side || THREE.FrontSide });
    m.normalScale.setScalar(o.bump || 1);
    const U = { triScale: { value: o.scale || 0.5 }, moss: { value: o.moss ?? 0.6 }, mossColor: { value: new THREE.Color(o.mossColor || 0x4c5628) } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      worldVaryings(sh);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vTriPos;
          varying vec3 vTriNormal;
          uniform float triScale, moss;
          uniform vec3 mossColor;
          vec4 tri(sampler2D t, vec3 p, vec3 w) { return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z; }`)
        .replace('#include <map_fragment>', `
          vec3 n0 = normalize(vTriNormal);
          vec3 tw = pow(abs(n0), vec3(4.0));
          tw /= tw.x + tw.y + tw.z;
          vec3 tp = vTriPos * triScale;
          vec3 rc = tri(map, tp, tw).rgb;
          float macro = tri(map, tp * 0.11 + 0.37, tw).g;
          diffuseColor.rgb *= rc * (0.7 + 0.6 * macro);
          float mossPatch = tri(map, tp * 0.31 + 0.71, tw).r;
          float mossAmt = moss * smoothstep(0.55, 0.85, n0.y * 0.85 + (macro - 0.5) * 1.3 + (mossPatch - 0.6) * 1.2 + (rc.g - 0.6) * 0.8);
          diffuseColor.rgb = mix(diffuseColor.rgb, mossColor * (0.55 + 0.8 * rc.g), mossAmt);`)
        .replace('#include <normal_fragment_maps>', `
          vec3 nx = texture2D(normalMap, tp.zy).xyz * 2.0 - 1.0;
          vec3 ny = texture2D(normalMap, tp.xz).xyz * 2.0 - 1.0;
          vec3 nz = texture2D(normalMap, tp.xy).xyz * 2.0 - 1.0;
          float ns = normalScale.x * (1.0 - 0.6 * mossAmt);
          nx.xy *= ns; ny.xy *= ns; nz.xy *= ns;
          nx = vec3(nx.xy + n0.zy, abs(nx.z) * n0.x);
          ny = vec3(ny.xy + n0.xz, abs(ny.z) * n0.y);
          nz = vec3(nz.xy + n0.xy, abs(nz.z) * n0.z);
          vec3 wn = normalize(nx.zyx * tw.x + ny.xzy * tw.y + nz.xyz * tw.z);
          normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz) * faceDirection;`);
    };
    return m;
  }

  // The valley floor: soil and grass blended by a mask that covers the whole floor once
  // (red = grass, green = large-scale light and dark patches)
  const FLOOR = { x0: -26, z0: -92, w: 52, d: 110 };
  const pathX = z => 1.6 * Math.sin(z * 0.045 + 1) + 0.9 * Math.sin(z * 0.11);
  function grassAt(x, z) {
    const u = (x - FLOOR.x0) / FLOOR.w, v = (z - FLOOR.z0) / FLOOR.d, n = N.fbm(u, v, 6, 12, 4, 61);
    let g = sstep(0.4, 0.6, n);
    g *= sstep(1.6, 4.5, Math.abs(x - pathX(z)));   // the path the monsters have trodden
    g *= sstep(-80, -68, z);                          // bare in front of the cave
    return Math.max(g, sstep(19.5, 22.5, Math.abs(x)) * sstep(0.3, 0.5, n) * 0.9);  // grass at the foot of the cliffs
  }
  function maskTex() {
    const W = 128, H = 256, c = canvas(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / W, v = (j + 0.5) / H, k = (j * W + i) * 4;
      d[k] = grassAt(FLOOR.x0 + u * FLOOR.w, FLOOR.z0 + v * FLOOR.d) * 255;
      d[k + 1] = N.fbm(u, v, 8, 16, 3, 62) * 255;
      d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.flipY = false;
    return t;
  }
  function groundMaterial() {
    const dirt = tex('dirt'), grass = tex('grass');
    const m = new THREE.MeshStandardMaterial({ map: dirt.map, normalMap: dirt.normal, roughness: 0.96, metalness: 0 });
    const U = { grassMap: { value: grass.map }, grassNormal: { value: grass.normal }, maskMap: { value: maskTex() },
      maskBox: { value: new THREE.Vector4(FLOOR.x0, FLOOR.z0, 1 / FLOOR.w, 1 / FLOOR.d) } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      worldVaryings(sh);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vTriPos;
          varying vec3 vTriNormal;
          uniform sampler2D grassMap, grassNormal, maskMap;
          uniform vec4 maskBox;`)
        .replace('#include <map_fragment>', `
          vec2 gp = vTriPos.xz;
          vec2 mk = texture2D(maskMap, (gp - maskBox.xy) * maskBox.zw).rg;
          vec3 dirt = mix(texture2D(map, gp * 0.3).rgb, texture2D(map, gp * 0.071 + 0.31).rgb, 0.4);
          vec3 grass = mix(texture2D(grassMap, gp * 0.45).rgb, texture2D(grassMap, gp * 0.12 + 0.5).rgb, 0.45);
          float gm = smoothstep(0.1, 0.9, mk.r + (0.42 - dirt.g) * 0.8);  // stones poke through thin grass
          diffuseColor.rgb *= mix(dirt, grass, gm) * (0.72 + 0.56 * mk.g);`)
        .replace('#include <normal_fragment_maps>', `
          vec3 tn = mix(texture2D(normalMap, gp * 0.3).xyz, texture2D(grassNormal, gp * 0.45).xyz, gm) * 2.0 - 1.0;
          tn.xy *= normalScale;
          normal = normalize((viewMatrix * vec4(normalize(vec3(tn.x, tn.z, tn.y)), 0.0)).xyz);`);
    };
    return m;
  }

  // ---------- Shapes ----------
  // Indexed copy with shared vertices, so displaced shapes stay closed and smooth
  function weld(geo) {
    const src = geo.index ? geo.toNonIndexed() : geo, p = src.attributes.position, seen = new Map(), pos = [], idx = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
      if (!seen.has(k)) { seen.set(k, pos.length / 3); pos.push(x, y, z); }
      idx.push(seen.get(k));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  }
  function finish(g, col) {
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    G.projectUV(g, 0.5);
    return g;
  }

  // A boulder: a lumpy sphere cut by flat planes (broken faces), sized sx, sy, sz.
  // Darker in hollows and near the ground. o: detail, cuts, color [r, g, b]
  function boulder(seed, sx, sy, sz, o = {}) {
    const r = rng(seed * 7919 + 13), g = weld(new THREE.IcosahedronGeometry(1, o.detail ?? 12));
    const cuts = Array.from({ length: o.cuts ?? 9 }, () => {
      const a = r() * PI * 2, y = r() * 1.5 - 0.5, k = Math.sqrt(1 - y * y);
      return { n: new V3(Math.cos(a) * k, y, Math.sin(a) * k), d: 0.55 + r() * 0.32 };
    });
    const p = g.attributes.position, v = new V3(), q = new V3(), col = [], c = o.color || [1, 1, 1];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      q.copy(v).multiplyScalar(1 + 0.22 * fbm3(v.x * 1.2 + seed, v.y * 1.2, v.z * 1.2, 3, seed));
      for (const cut of cuts) { const s = q.dot(cut.n) - cut.d; if (s > 0) q.addScaledVector(cut.n, -s * 0.9); }
      q.addScaledVector(v, 0.035 * fbm3(v.x * 5, v.y * 5 + seed, v.z * 5, 3, seed + 9));
      const depth = q.length(), tint = fbm3(v.x * 0.8, v.y * 0.8 + seed, v.z * 0.8, 2, seed + 3);
      p.setXYZ(i, q.x * sx, q.y * sy, q.z * sz);
      const k = (0.68 + 0.42 * sstep(0.5, 0.98, depth)) * (0.62 + 0.38 * sstep(-0.55, 0.15, v.y));
      col.push(k * c[0] * (1 + 0.1 * tint), k * c[1], k * c[2] * (1 - 0.1 * tint));
    }
    return finish(g, col);
  }

  // A cliff along a straight line from a to b ([x, z]); inward ([x, z]) points into the valley.
  // The face rises from under the ground (or from o.base) to height(t) (t = 0..1 along it),
  // leans back, steps back at the top of the rock layers, bulges in and out and is split by
  // fissures, then rolls over the top and runs back o.depth metres. It only goes into the rock
  // from the line (at most 15 cm out). o.under: a ceiling that runs back that far under a
  // raised base (a cave mouth). o.taper: [start, end] metres where the face flattens onto the
  // line, so pieces meeting at a corner join exactly.
  function cliff(o) {
    const [ax, az] = o.a, len = Math.hypot(o.b[0] - ax, o.b[1] - az), dx = (o.b[0] - ax) / len, dz = (o.b[1] - az) / len;
    const [ix, iz] = o.inward, seed = o.seed, c = o.color || [1, 1, 1], base = o.base ?? -0.4, [ta, tb] = o.taper || [0, 0];
    const nu = Math.ceil(len / 0.33) + 1, FACE = Math.ceil((o.height(0.5) - base) / 0.28), TOP = 8, UN = o.under ? 10 : 0, nv = UN + FACE + TOP + 1;
    const pos = [], col = [], idx = [];
    for (let i = 0; i < nu; i++) {
      const t = i / (nu - 1), s0 = t * len, H = o.height(t);
      const tp = (ta ? sstep(0, ta, s0) : 1) * (tb ? sstep(0, tb, len - s0) : 1);
      for (let j = 0; j < nv; j++) {
        const under = j < UN, face = !under && j - UN <= FACE, f = under ? j / UN : face ? 0 : (j - UN - FACE) / TOP;
        let y = under ? base + 0.25 * fbm3(s0 * 0.4, f * 4, seed, 2, seed + 9)
          : face ? base + (H - base) * (j - UN) / FACE : H + 0.5 * Math.sin(f * PI / 2) + 0.35 * fbm3(s0 * 0.3, f * 3, seed, 2, seed + 7);
        const n1 = fbm3(s0 * 0.07, y * 0.1, seed * 0.37, 4, seed), n2 = fbm3(s0 * 0.33, y * 0.42, seed * 0.37, 3, seed + 1);
        const layer = y / 1.7 + s0 * 0.03 + 1.3 * fbm3(s0 * 0.03, y * 0.06, seed, 3, seed + 2), fl = layer - Math.floor(layer);
        const ledge = sstep(0.7, 0.93, fl) * 0.38 * sstep(-0.15, 0.25, fbm3(s0 * 0.09, Math.floor(layer), seed, 2, seed + 3));
        const fissure = 1 - sstep(0.0, 0.07, Math.abs(fbm3(s0 * 0.22, y * 0.04, seed, 2, seed + 8)));
        let w = Math.max(-0.15, 0.1 * (y - base) + 1.5 * n1 + 0.32 * n2 + ledge + 0.45 * fissure + 0.3) * tp;
        if (under) w += (1 - f) * o.under;
        else if (!face) w += f * o.depth * tp;
        // the ceiling reaches a little further sideways into the rock on both sides
        let s = s0 + (face ? 0.3 * fbm3(s0 * 0.5, y * 0.5, seed, 2, seed + 4) * tp : under ? (t - 0.5) * 1.6 * sstep(0.35, 0.6, 1 - f) : 0);
        if (face && j > UN && j < UN + FACE) y += 0.12 * fbm3(s0 * 0.6, y * 0.6, seed, 2, seed + 5) * tp;
        pos.push(ax + dx * s - ix * w, y, az + dz * s - iz * w);
        // colour: warm and cool rock layers, dark hollows and under each ledge, damp at the foot,
        // earth and grass on the top
        const band = fbm3(0, layer * 0.9, seed, 2, seed + 6), shadeUnder = sstep(0.0, 0.12, fl) * (1 - sstep(0.12, 0.35, fl));
        let k = (1 - 0.38 * sstep(-0.1, 0.45, n1)) * (1 - 0.15 * shadeUnder * sstep(0.05, 0.2, ledge)) * (1 - 0.35 * fissure) * (0.62 + 0.38 * sstep(-0.3, 1.8, y)) * (o.shade || 1);
        let rgb = [k * (1 + 0.12 * band), k * (1 + 0.02 * band), k * (1 - 0.1 * band)];
        if (under) k *= 0.6;
        if (!face && !under) { const e = sstep(0, 0.4, f); rgb = rgb.map((x, q) => x + ([0.62, 0.56, 0.4][q] * k - x) * e); }
        col.push(rgb[0] * c[0], rgb[1] * c[1], rgb[2] * c[2]);
      }
    }
    for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) {
      const a = i * nv + j, b = a + nv;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    finish(g, col);
    // make sure the face looks into the valley
    const nm = g.attributes.normal, k = Math.floor(nu / 2) * nv + UN + Math.floor(FACE / 2);
    if (nm.getX(k) * ix + nm.getZ(k) * iz < 0) {
      for (let q = 0; q < idx.length; q += 3) { const tmp = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = tmp; }
      g.setIndex(idx);
      g.computeVertexNormals();
    }
    return g;
  }

  // A cut stone block with worn, chipped edges (w x h x d, centred)
  function block(w, h, d, seed, o = {}) {
    const g = weld(G.roundBox(w, h, d, o.r ?? 0.03, o.seg ?? 6));
    g.computeVertexNormals();
    const p = g.attributes.position, nm = g.attributes.normal, col = [], c = o.color || [1, 1, 1], e = 0.09;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const edge = ((Math.abs(x) > w / 2 - e) + (Math.abs(y) > h / 2 - e) + (Math.abs(z) > d / 2 - e)) >= 2 ? 1 : 0.2;
      const chip = Math.max(0, fbm3(x * 2.4 + seed, y * 2.4, z * 2.4, 3, seed) - 0.15) * 0.35 * edge;
      const wear = Math.abs(fbm3(x * 7, y * 7, z * 7 + seed, 2, seed + 1)) * 0.012;
      const off = -(chip + wear) * (o.top === false || nm.getY(i) < 0.9 ? 1 : 0.25);
      p.setXYZ(i, x + nm.getX(i) * off, y + nm.getY(i) * off, z + nm.getZ(i) * off);
      const k = (0.85 + 0.25 * sstep(0.01, 0.06, chip)) * (0.72 + 0.28 * sstep(-h / 2, -h / 2 + 0.4, y)) * (1 + 0.12 * fbm3(x, y, z + seed, 2, seed + 2));
      col.push(k * c[0], k * c[1], k * c[2]);
    }
    return finish(g, col);
  }

  // A broken fluted column of weathered stone on its own (0, 0, 0) base, height h.
  // The top is a jagged slanted break; chunks are bitten out, worst near the break.
  function column(h, seed) {
    const NA = 72, R0 = 0.7, R1 = 0.6, y0 = 0.28, NK = 7, r = rng(seed);
    const tilt = r() * PI * 2;
    const breakY = (x, z) => h - 0.12 - 0.45 * clamp(0.5 + fbm3(x * 1.8 + seed, 0, z * 1.8, 3, seed)) + 0.22 * (x * Math.cos(tilt) + z * Math.sin(tilt)) / R1;
    const NR = Math.ceil((h - y0) / 0.07), rows = NR + NK + 1, pos = [], col = [], idx = [];
    for (let i = 0; i < NA; i++) {
      const a = i / NA * PI * 2, ca = Math.cos(a), sa = Math.sin(a), flute = sstep(0.25, 1, Math.cos(a * 20));
      const top = breakY(ca * R1, sa * R1);
      for (let j = 0; j < rows; j++) {
        let x, y, z, k;
        if (j <= NR) {
          y = y0 + (top - y0) * j / NR;
          const R = R0 + (R1 - R0) * y / h, near = sstep(top - 0.6, top, y);
          const chip = Math.max(0, fbm3(ca * 2.2, y * 1.8, sa * 2.2, 3, seed + 5) - 0.2 + near * 0.15) * (0.45 + near * 0.4);
          const rr = R - 0.032 * flute + 0.01 * fbm3(ca * 6, y * 6, sa * 6, 2, seed + 6) - chip;
          x = ca * rr; z = sa * rr;
          k = (1 - 0.15 * flute) * (0.62 + 0.38 * sstep(0.2, 1.3, y)) * (1 + 0.5 * sstep(0.01, 0.08, chip));
        } else {   // the broken top, ring by ring towards the middle
          const rho = R1 * (1 - (j - NR) / NK);
          x = ca * rho; z = sa * rho; y = breakY(x, z) + 0.05 * fbm3(x * 5, 0, z * 5, 2, seed + 8);
          k = 1.12;
        }
        const lichen = sstep(0.25, 0.45, fbm3(x * 2.5, y * 2.5, z * 2.5, 3, seed + 9));
        pos.push(x, y, z);
        col.push(k * (0.98 - 0.12 * lichen), k * (0.93 - 0.02 * lichen), k * (0.82 - 0.25 * lichen));
      }
    }
    for (let i = 0; i < NA; i++) for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j, b = ((i + 1) % NA) * rows + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    finish(g, col);
    return { geo: g, top: breakY(0, 0) };
  }

  // ---------- Scatter ----------
  function instances(geo, mat, list) {
    const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(), c = new THREE.Color();
    list.forEach((e, i) => {
      o.position.set(e.x, e.y, e.z); o.rotation.set(e.rx || 0, e.ry || 0, e.rz || 0); o.scale.set(e.sx, e.sy, e.sz);
      o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.setRGB(e.c[0], e.c[1], e.c[2]));
    });
    return m;
  }
  // Grass tuft: three crossed upright quads, normals straight up so they light evenly
  function tuftGeo() {
    const parts = [0, 1, 2].map(k => G.place(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), [0, 0, 0], [0, k * PI / 3, 0]));
    const g = G.merge(parts), n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    return g;
  }
  function tuftMaterial(time) {
    const m = new THREE.MeshLambertMaterial({ map: tex('tuft'), alphaTest: 0.45, side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      sh.uniforms.windTime = time;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float windTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float ph = 0.0;
          #ifdef USE_INSTANCING
            ph = instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.35;
          #endif
          float sway = sin(windTime * 1.7 + ph) * 0.6 + sin(windTime * 3.3 + ph * 1.7) * 0.25;
          transformed.x += sway * 0.14 * position.y * position.y;
          transformed.z += sway * 0.05 * position.y;`);
    };
    return m;
  }

  // ---------- The valley ----------
  // layout: { rocks: [[x, z, size]], pillars: [[x, z, h]], colliders, touch }
  // Built in the background a step at a time (textures first), so the game doesn't freeze;
  // calls done({ group, shootables, update(time) }) when ready.
  function valley(layout, done) {
    const steps = ['rock', 'dirt', 'grass', 'tuft'].map(k => () => tex(k)).concat(() => done(build(layout)));
    const next = () => { steps.shift()(); if (steps.length) setTimeout(next, 16); };
    setTimeout(next, 16);
  }
  function build(layout) {
    const group = new THREE.Group(), shootables = [], time = { value: 0 };
    const add = (m, shoot = true, cast = true) => { m.castShadow = cast; m.receiveShadow = true; group.add(m); if (shoot) shootables.push(m); return m; };
    const free = (x, z, r) => !layout.colliders.some(c => x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r);

    // ground
    const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(FLOOR.w, FLOOR.d), groundMaterial()), true, false);
    ground.rotation.x = -PI / 2;
    ground.position.set(FLOOR.x0 + FLOOR.w / 2, 0, FLOOR.z0 + FLOOR.d / 2);

    // cliffs down both sides, behind the player and around the cave
    const cliffMat = rockMaterial({ scale: 0.35, moss: 0.4, side: THREE.DoubleSide });
    const CL = [0.8, 0.72, 0.62];
    const H = (lo, hi, seed) => t => lo + (hi - lo) * clamp(0.5 + 1.4 * fbm3(t * 9, seed, 0, 3, seed));
    add(new THREE.Mesh(cliff({ a: [-23, 18.5], b: [-23, -95], inward: [1, 0], height: H(5, 10, 3), depth: 5, seed: 3, color: CL }), cliffMat));
    add(new THREE.Mesh(cliff({ a: [23, 18.5], b: [23, -95], inward: [-1, 0], height: H(5, 10, 4), depth: 5, seed: 4, color: CL }), cliffMat));
    add(new THREE.Mesh(cliff({ a: [24.5, 16.5], b: [-24.5, 16.5], inward: [0, -1], height: H(3.8, 5.5, 5), depth: 4, seed: 5, color: CL }), cliffMat));
    // the cave: the end wall, the rock over the gate with the tunnel ceiling under it, and the
    // tunnel walls; the pieces flatten where they meet so the corners are closed
    const caveH = H(10, 12, 6);
    add(new THREE.Mesh(cliff({ a: [-24.5, -80], b: [-5, -80], inward: [0, 1], height: caveH, depth: 6, seed: 6, color: CL, taper: [0, 1.5] }), cliffMat));
    add(new THREE.Mesh(cliff({ a: [5, -80], b: [24.5, -80], inward: [0, 1], height: caveH, depth: 6, seed: 7, color: CL, taper: [1.5, 0] }), cliffMat));
    add(new THREE.Mesh(cliff({ a: [-5, -80], b: [5, -80], inward: [0, 1], height: t => caveH(1) * (1 - t) + caveH(0) * t + 0.6 * Math.sin(t * PI), base: 6.3, under: 10, depth: 6, seed: 9, color: CL, taper: [1.5, 1.5] }), cliffMat));
    const caveMat = rockMaterial({ scale: 0.4, moss: 0.15, side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      add(new THREE.Mesh(cliff({ a: [s * 5, -80], b: [s * 5, -91], inward: [-s, 0], height: () => 6.6, depth: 0, seed: 10 + s, color: CL, shade: 0.7, taper: [1.5, 0] }), caveMat));
    }
    const glow = new THREE.PointLight(0x8cff5a, 2.2, 16, 2);   // the green glow lights the tunnel
    glow.position.set(0, 3, -87.5);
    group.add(glow);

    // boulders where the simple map has rocks, the same size as their colliders
    const boulderMat = rockMaterial({ scale: 0.55, moss: 0.5 });
    layout.rocks.forEach(([x, z, s], i) => {
      const m = add(new THREE.Mesh(boulder(31 + i, s * 1.15, s * 0.95, s * 0.95, { color: [0.82, 0.78, 0.71] }), boulderMat));
      m.position.set(x, s * 0.4, z);
      m.rotation.y = i * 1.7;
    });

    // broken columns of pale stone, the fallen capital still lying on top
    const stoneMat = rockMaterial({ scale: 0.9, bump: 0.6, moss: 0.3, mossColor: 0x66703e });
    layout.pillars.forEach(([x, z, h], i) => {
      const c = column(h, 41 + i);
      add(new THREE.Mesh(c.geo, stoneMat)).position.set(x, 0, z);
      add(new THREE.Mesh(block(1.75, 0.32, 1.75, 51 + i), stoneMat)).position.set(x, 0.16, z);
      const cap = add(new THREE.Mesh(block(0.95, 0.32, 0.95, 61 + i), stoneMat));
      cap.position.set(x + 0.1, c.top + 0.08, z);
      cap.rotation.set(0.3, 0.5, 0.2);
    });

    // the platform you shoot from: big stone blocks
    const platMat = rockMaterial({ scale: 0.7, bump: 0.7, moss: 0.25 });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      add(new THREE.Mesh(block(1.97, 1.2, 1.47, 71 + i * 2 + j, { color: [0.78, 0.74, 0.68] }), platMat)).position.set(-3 + i * 2, 0.6, 10.25 + j * 1.5);
    }

    // pebbles everywhere, rubble at the foot of the cliffs and around the stones
    const r = rng(1234), peb = [], rub = [], chunks = [];
    const tone = () => { const k = 0.65 + r() * 0.45, w = (r() - 0.5) * 0.12; return [k * (1 + w), k, k * (1 - w)]; };
    const put = (list, x, z, s, flat = 0.6) => list.push({ x, y: -s * 0.25, z, sx: s * (0.8 + r() * 0.5), sy: s * flat, sz: s, ry: r() * PI * 2, rx: (r() - 0.5) * 0.4, c: tone() });
    for (let n = 0; n < (layout.touch ? 350 : 900); n++) {
      const x = (r() - 0.5) * 45, z = 15 - r() * 94, s = 0.03 + 0.17 * r() ** 3;
      if (free(x, z, s)) put(peb, x, z, s);
    }
    for (let n = 0; n < (layout.touch ? 120 : 300); n++) {
      const sd = r() < 0.5 ? -1 : 1, x = sd * (23.2 - r() ** 2 * 1.6), z = 17 - r() * 96, s = 0.1 + 0.32 * r() ** 2;
      put(rub, x, z, s, 0.7);
    }
    layout.rocks.forEach(([x, z, s]) => { for (let n = 0; n < 10; n++) { const a = r() * PI * 2, d = s * (1.15 + r() * 0.6); put(rub, x + Math.cos(a) * d, z + Math.sin(a) * d * 0.85, 0.08 + r() * 0.2, 0.7); } });
    layout.pillars.forEach(([x, z]) => { for (let n = 0; n < 6; n++) { const a = r() * PI * 2, d = 1.1 + r() * 0.8; put(chunks, x + Math.cos(a) * d, z + Math.sin(a) * d, 0.1 + r() * 0.15, 0.8); } });
    chunks.forEach(e => { e.c = e.c.map(v => v * 1.1); });
    const pebGeos = [0, 1, 2].map(k => boulder(100 + k, 1, 1, 1, { detail: 1, cuts: 5 }));
    [peb, rub].forEach(list => pebGeos.forEach((g, k) => {
      const part = list.filter((_, i) => i % 3 === k);
      if (part.length) add(instances(g, boulderMat, part), false, list === rub);
    }));
    add(instances(pebGeos[0], stoneMat, chunks), false);

    // grass tufts where the ground is grassy, swaying in the wind
    const tufts = [], tufG = tuftGeo();
    for (let n = 0, tries = 0; n < (layout.touch ? 900 : 2600) && tries < 40000; tries++) {
      const x = (r() - 0.5) * 46, z = 16 - r() * 96, g = grassAt(x, z);
      if (r() > g * 1.15 || !free(x, z, 0.2)) continue;
      const s = 0.4 + r() * 0.45 * (0.5 + g), hue = r();
      tufts.push({ x, y: 0, z, sx: s * (0.9 + r() * 0.5), sy: s * (0.7 + r() * 0.6), sz: s, ry: r() * PI, c: [0.85 + hue * 0.3, 0.9 + hue * 0.15, 0.75 + r() * 0.2] });
      n++;
    }
    add(instances(tufG, tuftMaterial(time), tufts), false, false);

    return { group, shootables, update: t => { time.value = t; } };
  }

  return { valley };
})();
