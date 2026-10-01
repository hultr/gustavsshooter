// Flesh: turns a monster's body parts into one continuous, skinned creature mesh.
// Every limb, torso and head is a soft distance field; they are melted together with
// smooth unions (so joints flow into each other like muscle and skin), mouths and eye
// sockets are carved out, and the surface is extracted with surface nets. Each vertex is
// weighted to the bones of the parts near it, so the skin bends with the existing rig,
// and painted with blended part colours, crease shadows and a darker back. A detail
// texture is projected from three sides in the shader (the mesh has no UVs).
window.GS = window.GS || {};

GS.Flesh = (function () {
  const N = GS.Noise;
  const FAR = 1;
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const smax = (a, b, k) => -smin(-a, -b, k);
  const g1 = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

  // Radius along a limb or torso (t = 0..1 from a to b): limbs swell with muscle near the
  // top and have a knob at the joint, torsos have a chest and a waist.
  const PROFILE = {
    limb: t => 1 + 0.22 * g1(t, 0.3, 0.2) + 0.1 * g1(t, 1, 0.08) + 0.3 * g1(t, 0, 0.1),  // shoulder/hip, muscle, joint
    trunk: t => 1 + 0.1 * g1(t, 0.78, 0.15) - 0.07 * g1(t, 0.42, 0.14),
    plain: () => 1,
  };

  // ---------- primitives ----------
  // Made from a part description (sdf) and its bind-pose world matrix. Scale is folded
  // into the shape sizes so the inverse matrix is a pure rotation + translation.
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
  function prim(sdf, world, extra) {
    world.decompose(_p, _q, _s);
    const inv = _m.compose(_p, _q, new THREE.Vector3(1, 1, 1)).clone().invert();
    const pr = Object.assign({ type: sdf.type, m: inv.elements.slice(), fwd: world.clone() }, extra);
    let lo, hi;
    if (sdf.type === 'cone') {
      const a = sdf.a.map((v, i) => v * _s.getComponent(i)), b = sdf.b.map((v, i) => v * _s.getComponent(i));
      const rs = (_s.x + _s.z) / 2;
      Object.assign(pr, { a, ba: [b[0] - a[0], b[1] - a[1], b[2] - a[2]], r0: sdf.r0 * rs, r1: sdf.r1 * rs, prof: PROFILE[sdf.prof || 'plain'] });
      pr.l2 = pr.ba[0] ** 2 + pr.ba[1] ** 2 + pr.ba[2] ** 2 || 1e-9;
      // flat: a cylinder with rounded edges (torsos, discs); otherwise round ends (limbs)
      if (sdf.flat) { pr.len = Math.sqrt(pr.l2); pr.rr = Math.min(0.6 * Math.min(pr.r0, pr.r1), 0.5 * pr.len); }
      const r = Math.max(pr.r0, pr.r1) * 1.35;
      lo = [0, 1, 2].map(i => Math.min(a[i], b[i]) - r); hi = [0, 1, 2].map(i => Math.max(a[i], b[i]) + r);
      pr.size = Math.min(pr.r0, pr.r1);
    } else if (sdf.type === 'ellip') {
      pr.r = [sdf.r[0] * _s.x, sdf.r[1] * _s.y, sdf.r[2] * _s.z];
      lo = pr.r.map(v => -v); hi = pr.r.slice();
      pr.size = Math.min(...pr.r);
    } else {
      pr.h = [sdf.h[0] * _s.x, sdf.h[1] * _s.y, sdf.h[2] * _s.z];
      pr.rr = Math.min(...pr.h) * 0.6;
      lo = pr.h.map(v => -v); hi = pr.h.slice();
      pr.size = Math.min(...pr.h);
    }
    // world-space bounding box of the local box
    const box = new THREE.Box3();
    for (let c = 0; c < 8; c++) box.expandByPoint(_p.set(c & 1 ? hi[0] : lo[0], c & 2 ? hi[1] : lo[1], c & 4 ? hi[2] : lo[2]).applyMatrix4(world));
    pr.box = box;
    return pr;
  }

  function dist(pr, x, y, z, minR = 0) {
    const e = pr.m;
    const lx = e[0] * x + e[4] * y + e[8] * z + e[12], ly = e[1] * x + e[5] * y + e[9] * z + e[13], lz = e[2] * x + e[6] * y + e[10] * z + e[14];
    if (pr.type === 'cone') {
      const a = pr.a, ba = pr.ba;
      const tr = ((lx - a[0]) * ba[0] + (ly - a[1]) * ba[1] + (lz - a[2]) * ba[2]) / pr.l2;
      const t = tr < 0 ? 0 : tr > 1 ? 1 : tr;
      const r = Math.max(minR, (pr.r0 + (pr.r1 - pr.r0) * t) * pr.prof(t));
      if (pr.rr === undefined) return Math.hypot(lx - a[0] - ba[0] * t, ly - a[1] - ba[1] * t, lz - a[2] - ba[2] * t) - r;
      const radial = Math.hypot(lx - a[0] - ba[0] * tr, ly - a[1] - ba[1] * tr, lz - a[2] - ba[2] * tr) - r + pr.rr;
      const axial = Math.abs(tr - 0.5) * pr.len - pr.len / 2 + pr.rr;
      return Math.hypot(Math.max(radial, 0), Math.max(axial, 0)) + Math.min(Math.max(radial, axial), 0) - pr.rr;
    }
    if (pr.type === 'ellip') {
      const r = pr.r, rx = Math.max(r[0], minR), ry = Math.max(r[1], minR), rz = Math.max(r[2], minR);
      const k0 = Math.hypot(lx / rx, ly / ry, lz / rz), k1 = Math.hypot(lx / (rx * rx), ly / (ry * ry), lz / (rz * rz));
      return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
    }
    const h = pr.h, rr = pr.rr;
    const qx = Math.abs(lx) - h[0] + rr, qy = Math.abs(ly) - h[1] + rr, qz = Math.abs(lz) - h[2] + rr;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - rr;
  }

  // ---------- bake ----------
  // prims: [{ sdf, world, bone, color (THREE.Color or null), k }]
  // carves: [{ sdf, world, k, mouth }]
  // o: { voxel, noise: { amp, fx, fy } }
  // Returns a BufferGeometry with position, normal, color, skinIndex, skinWeight.
  function bake(primsIn, carvesIn, o) {
    const v = o.voxel, minR = v * 1.2;
    const prims = primsIn.map(p => prim(p.sdf, p.world, { bone: p.bone, color: p.color, k: p.k }));
    // blend radius: thick parts melt together more than thin ones
    prims.forEach(p => { if (!p.k) p.k = Math.max(0.04, Math.min(0.12, p.size * 0.9)); });
    const carves = carvesIn.map(c => prim(c.sdf, c.world, { k: c.k, mouth: c.mouth }));
    const all = new THREE.Box3();
    prims.forEach(p => all.union(p.box));
    all.expandByScalar(0.12);
    const x0 = all.min.x, y0 = all.min.y, z0 = all.min.z;
    const nx = Math.ceil((all.max.x - x0) / v) + 1, ny = Math.ceil((all.max.y - y0) / v) + 1, nz = Math.ceil((all.max.z - z0) / v) + 1;
    const F = new Float32Array(nx * ny * nz).fill(FAR);
    const at = (i, j, k) => i + nx * (j + ny * k);

    function each(box, pad, fn) {
      const i0 = Math.max(0, Math.floor((box.min.x - pad - x0) / v)), i1 = Math.min(nx - 1, Math.ceil((box.max.x + pad - x0) / v));
      const j0 = Math.max(0, Math.floor((box.min.y - pad - y0) / v)), j1 = Math.min(ny - 1, Math.ceil((box.max.y + pad - y0) / v));
      const k0 = Math.max(0, Math.floor((box.min.z - pad - z0) / v)), k1 = Math.min(nz - 1, Math.ceil((box.max.z + pad - z0) / v));
      for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(at(i, j, k), x0 + i * v, y0 + j * v, z0 + k * v);
    }
    for (const p of prims) each(p.box, p.k + 2 * v, (n, x, y, z) => { F[n] = smin(F[n], dist(p, x, y, z, minR), p.k); });
    for (const c of carves) each(c.box, c.k + 2 * v, (n, x, y, z) => { F[n] = smax(F[n], -dist(c, x, y, z), c.k); });
    // fine lumps and grain near the surface
    const nz_ = o.noise || { amp: 0.006, fx: 9, fy: 9 };
    for (let n = 0; n < F.length; n++) {
      if (Math.abs(F[n]) > 0.06) continue;
      const i = n % nx, j = ((n / nx) | 0) % ny, k = (n / (nx * ny)) | 0;
      const x = x0 + i * v, y = y0 + j * v, z = z0 + k * v;
      F[n] += nz_.amp * (2 * N.n3(x * nz_.fx, y * nz_.fy, z * nz_.fx, 11) - 1 + 0.4 * (2 * N.n3(x * nz_.fx * 2.7, y * nz_.fy * 2.7, z * nz_.fx * 2.7, 12) - 1));
    }

    // trilinear sample and gradient of the field
    function sample(x, y, z) {
      let gx = (x - x0) / v, gy = (y - y0) / v, gz = (z - z0) / v;
      gx = Math.max(0, Math.min(nx - 1.001, gx)); gy = Math.max(0, Math.min(ny - 1.001, gy)); gz = Math.max(0, Math.min(nz - 1.001, gz));
      const i = gx | 0, j = gy | 0, k = gz | 0, fx = gx - i, fy = gy - j, fz = gz - k;
      const c = (a, b, cc) => F[at(i + a, j + b, k + cc)];
      const l = (a, b, t) => a + (b - a) * t;
      return l(l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy), l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
    }
    const grad = (x, y, z, out) => {
      const h = v * 0.6;
      out[0] = sample(x + h, y, z) - sample(x - h, y, z); out[1] = sample(x, y + h, z) - sample(x, y - h, z); out[2] = sample(x, y, z + h) - sample(x, y, z - h);
      return out;
    };

    // ---------- surface nets ----------
    const cx = nx - 1, cy = ny - 1, cz = nz - 1;
    const cellV = new Int32Array(cx * cy * cz).fill(-1);
    const pos = [];
    const EDGES = [];
    for (let a = 0; a < 8; a++) for (const bit of [1, 2, 4]) if (!(a & bit)) EDGES.push([a, a | bit]);
    const cv = new Float32Array(8);
    for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
      let inside = 0;
      for (let b = 0; b < 8; b++) { cv[b] = F[at(i + (b & 1), j + ((b >> 1) & 1), k + ((b >> 2) & 1))]; if (cv[b] < 0) inside++; }
      if (inside === 0 || inside === 8) continue;
      let sx = 0, sy = 0, sz = 0, cnt = 0;
      for (const [a, b] of EDGES) {
        if ((cv[a] < 0) === (cv[b] < 0)) continue;
        const t = cv[a] / (cv[a] - cv[b]);
        sx += (a & 1) + (((b & 1) - (a & 1)) * t); sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * t); sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * t);
        cnt++;
      }
      cellV[i + cx * (j + cy * k)] = pos.length / 3;
      pos.push(x0 + (i + sx / cnt) * v, y0 + (j + sy / cnt) * v, z0 + (k + sz / cnt) * v);
    }
    const cell = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= cx || j >= cy || k >= cz ? -1 : cellV[i + cx * (j + cy * k)]);
    const idx = [];
    const D = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const f0 = F[at(i, j, k)];
      for (let a = 0; a < 3; a++) {
        const d = D[a], i1 = i + d[0], j1 = j + d[1], k1 = k + d[2];
        if (i1 >= nx || j1 >= ny || k1 >= nz) continue;
        const f1 = F[at(i1, j1, k1)];
        if ((f0 < 0) === (f1 < 0)) continue;
        const u = D[(a + 1) % 3], w = D[(a + 2) % 3];
        const c0 = cell(i - u[0] - w[0], j - u[1] - w[1], k - u[2] - w[2]), c1 = cell(i - w[0], j - w[1], k - w[2]);
        const c2 = cell(i, j, k), c3 = cell(i - u[0], j - u[1], k - u[2]);
        if (c0 < 0 || c1 < 0 || c2 < 0 || c3 < 0) continue;
        // wind the quad so it faces out (towards the positive side of the field)
        const out = f0 < 0 ? 1 : -1;
        const e1 = [pos[c1 * 3] - pos[c0 * 3], pos[c1 * 3 + 1] - pos[c0 * 3 + 1], pos[c1 * 3 + 2] - pos[c0 * 3 + 2]];
        const e2 = [pos[c2 * 3] - pos[c0 * 3], pos[c2 * 3 + 1] - pos[c0 * 3 + 1], pos[c2 * 3 + 2] - pos[c0 * 3 + 2]];
        const nrm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        if ((nrm[0] * d[0] + nrm[1] * d[1] + nrm[2] * d[2]) * out > 0) idx.push(c0, c1, c2, c0, c2, c3);
        else idx.push(c0, c2, c1, c0, c3, c2);
      }
    }

    // pull vertices onto the surface, then normals from the field
    const nv = pos.length / 3, P = new Float32Array(pos), NR = new Float32Array(nv * 3), gr = [0, 0, 0];
    for (let n = 0; n < nv; n++) {
      let x = P[n * 3], y = P[n * 3 + 1], z = P[n * 3 + 2];
      for (let it = 0; it < 2; it++) {
        const f = sample(x, y, z); grad(x, y, z, gr);
        const g2 = (gr[0] ** 2 + gr[1] ** 2 + gr[2] ** 2) / (1.2 * v) ** 2;
        if (g2 < 1e-8) break;
        const s = f / g2 / (1.2 * v);
        x -= gr[0] * s; y -= gr[1] * s; z -= gr[2] * s;
      }
      P[n * 3] = x; P[n * 3 + 1] = y; P[n * 3 + 2] = z;
      grad(x, y, z, gr);
      const l = Math.hypot(...gr) || 1;
      NR[n * 3] = gr[0] / l; NR[n * 3 + 1] = gr[1] / l; NR[n * 3 + 2] = gr[2] / l;
    }

    // ---------- skin weights and paint ----------
    const SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4), COL = new Float32Array(nv * 3);
    const nb = Math.max(...prims.map(p => p.bone)) + 1, bw = new Float32Array(nb);
    const gum = new THREE.Color(0x3a0d12), c = new THREE.Color();
    const ds = new Float32Array(prims.length);
    for (let n = 0; n < nv; n++) {
      const x = P[n * 3], y = P[n * 3 + 1], z = P[n * 3 + 2];
      let dmin = Infinity, dminC = Infinity;
      for (let i = 0; i < prims.length; i++) {
        ds[i] = dist(prims[i], x, y, z, minR); dmin = Math.min(dmin, ds[i]);
        if (prims[i].color) dminC = Math.min(dminC, ds[i]);
      }
      bw.fill(0);
      let cr = 0, cg = 0, cb = 0, cw = 0;
      for (let i = 0; i < prims.length; i++) {
        const p = prims[i], e = ds[i] - dmin;
        if (e > 0.25 && ds[i] - dminC > 0.1) continue;
        bw[p.bone] += Math.exp(-e / 0.035);
        if (p.color) { const w = Math.exp(-(ds[i] - dminC) / 0.012); cr += p.color.r * w; cg += p.color.g * w; cb += p.color.b * w; cw += w; }
      }
      // four strongest bones
      let tot = 0;
      for (let s = 0; s < 4; s++) {
        let best = -1, bv = 0;
        for (let b = 0; b < nb; b++) if (bw[b] > bv) { bv = bw[b]; best = b; }
        if (best < 0) break;
        SI[n * 4 + s] = best; SW[n * 4 + s] = bv; tot += bv; bw[best] = 0;
      }
      for (let s = 0; s < 4; s++) SW[n * 4 + s] /= tot || 1;
      c.setRGB(cr / (cw || 1), cg / (cw || 1), cb / (cw || 1));
      // mottling, darker back and top, shadows in creases, gums in mouths
      const ny_ = NR[n * 3 + 1];
      let k = (0.84 + 0.32 * N.n3(x * 3.1, y * 3.1, z * 3.1, 21)) * (1 - 0.14 * Math.max(0, ny_) + 0.05 * Math.max(0, -ny_));
      let occ = 0;
      for (const [s, wgt] of [[0.03, 1], [0.08, 0.5], [0.18, 0.25]]) occ += wgt * Math.max(0, s - sample(x + NR[n * 3] * s, y + ny_ * s, z + NR[n * 3 + 2] * s)) / s;
      k *= Math.max(0.3, 1 - occ * 0.45);
      for (const cv of carves) {
        if (!cv.mouth) continue;
        const m = Math.max(0, 1 - Math.abs(dist(cv, x, y, z)) / 0.03);
        if (m > 0) c.lerp(gum, m);
      }
      COL[n * 3] = c.r * k; COL[n * 3 + 1] = c.g * k; COL[n * 3 + 2] = c.b * k;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(NR, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(COL, 3));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(nv * 2), 2));
    geo.setIndex(new THREE.BufferAttribute(nv > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
    geo.computeBoundingSphere();
    geo.boundingSphere.radius *= 1.3;
    return geo;
  }

  // ---------- material: vertex colours + a detail texture projected from three sides ----------
  const TRI = `
uniform float uTexScale;
varying vec3 vObjPos;
varying vec3 vObjNrm;
vec3 triW() { vec3 w = pow(abs(normalize(vObjNrm)), vec3(4.0)); return w / (w.x + w.y + w.z); }
vec4 triSample(sampler2D t, vec3 p) { vec3 w = triW(); return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z; }
`;
  const TRI_MAP = `
#ifdef USE_MAP
  diffuseColor *= triSample(map, vObjPos * uTexScale);
#endif
`;
  const TRI_BUMP = `
#ifdef USE_BUMPMAP
  uniform sampler2D bumpMap;
  uniform float bumpScale;
  float triH(vec3 p) { return triSample(bumpMap, p * uTexScale).x; }
  vec2 dHdxy_fwd() {
    vec3 dx = dFdx(vObjPos), dy = dFdy(vObjPos);
    float h = triH(vObjPos);
    return bumpScale * vec2(triH(vObjPos + dx) - h, triH(vObjPos + dy) - h);
  }
  vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
    vec3 vSigmaX = dFdx( surf_pos.xyz );
    vec3 vSigmaY = dFdy( surf_pos.xyz );
    vec3 vN = surf_norm;
    vec3 R1 = cross( vSigmaY, vN );
    vec3 R2 = cross( vN, vSigmaX );
    float fDet = dot( vSigmaX, R1 ) * faceDirection;
    vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
    return normalize( abs( fDet ) * surf_norm - vGrad );
  }
#endif
`;
  // o: { map, bump, bumpScale, shininess, specular, tile (metres per texture repeat) }
  function material(o) {
    const m = new THREE.MeshPhongMaterial({ vertexColors: true, map: o.map, bumpMap: o.bump, bumpScale: o.bumpScale, shininess: o.shininess, specular: o.specular });
    m.onBeforeCompile = sh => {
      sh.uniforms.uTexScale = { value: 1 / (o.tile || 0.3) };
      sh.vertexShader = 'varying vec3 vObjPos;\nvarying vec3 vObjNrm;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vObjPos = position;\n  vObjNrm = normal;');
      sh.fragmentShader = TRI + sh.fragmentShader
        .replace('#include <map_fragment>', TRI_MAP)
        .replace('#include <bumpmap_pars_fragment>', TRI_BUMP)
        // light leaking round the edges, like through thin skin
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0) * 0.45;');
    };
    m.customProgramCacheKey = () => 'flesh';
    return m;
  }

  return { bake, material };
})();
