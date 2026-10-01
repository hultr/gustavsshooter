// Geometry helpers for the detailed graphics: noise, organic shapes (muscled limbs,
// lumpy blobs, curved horns and claws), beveled side profiles and merged parts.
window.GS = window.GS || {};

GS.Noise = (function () {
  // Integer hash -> [0, 1)
  function hash(x, y, z, seed) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483587) ^ Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const fade = t => t * t * (3 - 2 * t);
  const mix = (a, b, t) => a + (b - a) * t;

  // 2D value noise that repeats every px by py lattice cells (for tiling textures)
  function tile2(x, y, px, py, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = fade(x - ix), fy = fade(y - iy);
    const w = (i, p) => ((i % p) + p) % p;
    const x0 = w(ix, px), x1 = w(ix + 1, px), y0 = w(iy, py), y1 = w(iy + 1, py);
    return mix(mix(hash(x0, y0, 0, seed), hash(x1, y0, 0, seed), fx), mix(hash(x0, y1, 0, seed), hash(x1, y1, 0, seed), fx), fy);
  }
  // Fractal tiling noise on the unit square: u, v in [0, 1), fx/fy cells across
  function fbm(u, v, fx, fy, oct = 4, seed = 0) {
    let s = 0, a = 0.5, n = 0;
    for (let o = 0; o < oct; o++) {
      const k = 1 << o;
      s += a * tile2(u * fx * k, v * fy * k, fx * k, fy * k, seed + o * 17);
      n += a; a *= 0.5;
    }
    return s / n;
  }
  // 3D value noise (for displacing shapes)
  function n3(x, y, z, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
    const h = (a, b, c) => hash(ix + a, iy + b, iz + c, seed);
    return mix(
      mix(mix(h(0, 0, 0), h(1, 0, 0), fx), mix(h(0, 1, 0), h(1, 1, 0), fx), fy),
      mix(mix(h(0, 0, 1), h(1, 0, 1), fx), mix(h(0, 1, 1), h(1, 1, 1), fx), fy), fz);
  }
  return { hash, tile2, fbm, n3 };
})();

GS.Geo = (function () {
  const V2 = THREE.Vector2, V3 = THREE.Vector3, N = GS.Noise, PI = Math.PI;

  // Merge geometries into one non-indexed geometry (one draw call)
  function merge(geos) {
    const parts = geos.map(g => (g.index ? g.toNonIndexed() : g));
    let n = 0;
    parts.forEach(g => (n += g.attributes.position.count));
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of parts) {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += c;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  }

  // A transformed copy: p position, r euler rotation, s scale (arrays)
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
  function place(geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
    _q.setFromEuler(_e.set(r[0], r[1], r[2]));
    return geo.clone().applyMatrix4(_m.compose(new V3(...p), _q, new V3(...s)));
  }

  // Box-projected UVs from positions, so every part gets the same texture density.
  // Wood grain (texture u) runs along z, the length of a gun.
  function projectUV(geo, scale) {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      let u, v;
      if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); }
      else if (ay >= az) { u = p.getZ(i); v = p.getX(i); }
      else { u = p.getX(i); v = p.getY(i); }
      uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  }

  // Muscled limb hanging down from the origin (length h), rounded at both ends
  function limb(rt, rb, h, seg = 12) {
    const pts = [new V2(0, -h - rb * 0.55), new V2(rb * 0.75, -h - rb * 0.4)];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const r = (rb + (rt - rb) * t) * (1 + 0.2 * Math.exp(-(((t - 0.66) / 0.2) ** 2)) + 0.14 * Math.exp(-(((t - 0.04) / 0.07) ** 2)));
      pts.push(new V2(r, -h + h * t));
    }
    pts.push(new V2(rt * 0.75, rt * 0.4), new V2(0, rt * 0.55));
    return lumpy(new THREE.LatheGeometry(pts, seg), (rt + rb) * 0.09, 1 / (rt + rb));
  }
  // Torso growing up from the origin: belly low, chest high, rounded shoulders
  function trunk(rt, rb, h, seg = 14) {
    const pts = [new V2(0, -rb * 0.3), new V2(rb * 0.8, -rb * 0.15)];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      // stays close to the straight taper so parts placed on the surface stay visible
      const r = (rb + (rt - rb) * t) * (1 + 0.05 * Math.exp(-(((t - 0.75) / 0.15) ** 2)) - 0.07 * Math.exp(-(((t - 0.42) / 0.14) ** 2)));
      pts.push(new V2(r, h * t));
    }
    pts.push(new V2(rt * 0.75, h + rt * 0.2), new V2(0, h + rt * 0.28));
    return lumpy(new THREE.LatheGeometry(pts, seg), (rt + rb) * 0.05, 1.5 / (rt + rb));
  }

  // Push vertices in and out along the surface (sinew, knots, swellings). Depends on the
  // position only, so the seam of a lathe stays closed.
  function lumpy(g, amp, freq, seed = 5) {
    g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal, v = new V3(), nn = new V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i);
      const k = (N.n3(v.x * freq + 3, v.y * freq * 0.6, v.z * freq, seed) - 0.5) * 2 + 0.5 * (N.n3(v.x * freq * 3, v.y * freq * 2, v.z * freq * 3 + 7, seed + 1) - 0.5);
      if (Math.abs(nn.y) < 0.95) v.addScaledVector(nn, k * amp);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }

  // Sphere with lumps (amp = lump size as a share of r)
  function blob(r, amp = 0.07, seed = 3) {
    const g = new THREE.SphereGeometry(r, 22, 16), p = g.attributes.position, v = new V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const k = 1 + amp * (2 * N.n3(v.x * 2.5 + 9, v.y * 2.5, v.z * 2.5, seed) - 1 + 0.5 * (2 * N.n3(v.x * 6, v.y * 6, v.z * 6 + 4, seed + 1) - 1));
      p.setXYZ(i, v.x * r * k, v.y * r * k, v.z * r * k);
    }
    g.computeVertexNormals();
    return g;
  }

  // Tapered horn/claw/fang from the origin to about (0, h, 0), bending its tip towards -z
  // (or +x with axis 'x') by bend*h. Sharp point, smooth normals, u around, v along.
  function horn(r, h, bend = 0.25, axis = 'z', seg = 8, rings = 10) {
    const pos = [], nor = [], uv = [], idx = [];
    const P = t => [axis === 'x' ? bend * h * t * t : 0, h * t, axis === 'x' ? 0 : -bend * h * t * t];
    for (let j = 0; j <= rings; j++) {
      const t = j / rings, c = P(t);
      // tangent and the two axes of the ring
      const d = axis === 'x' ? [2 * bend * h * t, h, 0] : [0, h, -2 * bend * h * t];
      const l = Math.hypot(...d), T = d.map(x => x / l);
      const A = axis === 'x' ? [0, 0, 1] : [1, 0, 0];
      const B = [T[1] * A[2] - T[2] * A[1], T[2] * A[0] - T[0] * A[2], T[0] * A[1] - T[1] * A[0]];
      const rr = r * Math.pow(1 - t, 0.85) * (1 + 0.15 * Math.exp(-t * 12));
      for (let i = 0; i <= seg; i++) {
        const a = i / seg * PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const n = [A[0] * ca + B[0] * sa, A[1] * ca + B[1] * sa, A[2] * ca + B[2] * sa];
        pos.push(c[0] + n[0] * rr, c[1] + n[1] * rr, c[2] + n[2] * rr);
        nor.push(n[0] * 0.95 + T[0] * 0.3, n[1] * 0.95 + T[1] * 0.3, n[2] * 0.95 + T[2] * 0.3);
        uv.push(i / seg, t);
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i, b = a + seg + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    // base cap
    const base = pos.length / 3;
    pos.push(0, 0, 0); nor.push(0, -1, 0); uv.push(0.5, 0);
    for (let i = 0; i < seg; i++) idx.push(base, i + 1, i);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    normalizeNormals(g);
    return g;
  }
  function normalizeNormals(g) {
    const n = g.attributes.normal, v = new V3();
    for (let i = 0; i < n.count; i++) { v.fromBufferAttribute(n, i).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  }

  // Box with rounded edges and corners
  function roundBox(w, h, d, r, seg = 3) {
    const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2), p = g.attributes.position;
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, v = new V3(), c = new V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
      v.sub(c);
      if (v.lengthSq() > 0) v.setLength(r);
      p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
    }
    g.computeVertexNormals();
    return g;
  }

  // Tube along points (array of [x,y,z]) with optional per-point radius scale
  function tube(points, r, seg = 8, rad = 7, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new V3(...p)), closed);
    return new THREE.TubeGeometry(curve, seg, r, rad, closed);
  }

  // 2D shape from points [x, y, cornerRadius?] with rounded corners
  function shape(pts, holes = []) {
    const s = new THREE.Shape();
    trace(s, pts);
    holes.forEach(h => { const p = new THREE.Path(); trace(p, h); s.holes.push(p); });
    return s;
  }
  function trace(path, pts) {
    const n = pts.length;
    const at = i => pts[(i + n) % n];
    for (let i = 0; i < n; i++) {
      const [x, y, r = 0] = at(i);
      if (!r) { i === 0 ? path.moveTo(x, y) : path.lineTo(x, y); continue; }
      const [px, py] = at(i - 1), [nx, ny] = at(i + 1);
      const l1 = Math.hypot(px - x, py - y), l2 = Math.hypot(nx - x, ny - y);
      const k1 = Math.min(r, l1 / 2) / l1, k2 = Math.min(r, l2 / 2) / l2;
      const ax = x + (px - x) * k1, ay = y + (py - y) * k1;
      i === 0 ? path.moveTo(ax, ay) : path.lineTo(ax, ay);
      path.quadraticCurveTo(x, y, x + (nx - x) * k2, y + (ny - y) * k2);
    }
    path.closePath();
  }

  // Side profile in gun space: points are [z, y, r?]; extruded `width` along x, centred,
  // with a small bevel so edges catch the light.
  function side(pts, width, bevel = 0.0025, holes = []) {
    const b = Math.min(bevel, width / 3);
    const g = new THREE.ExtrudeGeometry(shape(pts, holes), {
      depth: Math.max(0.0005, width - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * 0.8,
      bevelSegments: 2, curveSegments: 6,
    });
    g.translate(0, 0, -(width - 2 * b) / 2);
    g.rotateY(-PI / 2);
    return g;
  }

  // Revolved profile along the gun's z axis: pts are [z, r]
  function lathe(pts, seg = 16) {
    return new THREE.LatheGeometry(pts.map(([z, r]) => new V2(r, -z)), seg).rotateX(-PI / 2);
  }

  return { merge, place, projectUV, limb, trunk, blob, horn, roundBox, tube, shape, side, lathe };
})();
