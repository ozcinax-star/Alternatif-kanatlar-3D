import fs from 'node:fs';
const m = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const D = Math.PI / 180;
const G = {}, parent = {}, cubesOf = {}; const byId = Object.fromEntries(m.elements.map((e) => [e.uuid, e]));
(function walk(list, p) { for (const n of list) if (typeof n === 'object') { G[n.name] = n; parent[n.name] = p; cubesOf[n.name] = n.children.filter((c) => typeof c === 'string').map((c) => byId[c]); walk(n.children, n.name); } })(m.outliner, null);
function rot(p, r) { let [x, y, z] = p; let c = Math.cos(r[0] * D), s = Math.sin(r[0] * D); [y, z] = [y * c - z * s, y * s + z * c]; c = Math.cos(r[1] * D); s = Math.sin(r[1] * D); [x, z] = [x * c + z * s, -x * s + z * c]; c = Math.cos(r[2] * D); s = Math.sin(r[2] * D); [x, y] = [x * c - y * s, x * s + y * c]; return [x, y, z]; }
function pose(anim, t) {
  const st = {};
  for (const n of Object.keys(G)) st[n] = { r: G[n].rotation.slice(), s: [1, 1, 1], p: [0, 0, 0] };
  if (anim) for (const a of Object.values(anim.animators)) {
    const get = (ch, def) => { const k = a.keyframes.filter((q) => q.channel === ch).sort((x, y) => x.time - y.time); if (!k.length) return def; let i = k.findIndex((q) => q.time >= t - 1e-9); if (i < 0) i = k.length - 1; if (i === 0 || Math.abs(k[i].time - t) < 1e-9) return [k[i].data_points[0].x, k[i].data_points[0].y, k[i].data_points[0].z]; const a0 = k[i - 1], b0 = k[i]; const f = (t - a0.time) / (b0.time - a0.time); return ['x', 'y', 'z'].map((q) => a0.data_points[0][q] + (b0.data_points[0][q] - a0.data_points[0][q]) * f); };
    const r = get('rotation', [0, 0, 0]), sc = get('scale', [1, 1, 1]), po = get('position', [0, 0, 0]);
    const s = st[a.name]; s.r = s.r.map((v, i) => v + r[i]); s.s = sc; s.p = po;
  }
  return st;
}
function bounds(st, filter = () => true) {
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const n of Object.keys(G)) for (const c of cubesOf[n]) for (const x of [c.from[0], c.to[0]]) for (const y of [c.from[1], c.to[1]]) for (const z of [c.from[2], c.to[2]]) {
    let cur = [x, y, z]; for (let b = n; b; b = parent[b]) { const g = G[b], s = st[b]; const rel = cur.map((v, i) => (v - g.origin[i]) * s.s[i]); const r = rot(rel, s.r); cur = r.map((v, i) => g.origin[i] + v + s.p[i]); }
    if (!filter(cur)) continue; for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], cur[i]); mx[i] = Math.max(mx[i], cur[i]); }
  }
  return { mn: mn.map((v) => +v.toFixed(2)), mx: mx.map((v) => +v.toFixed(2)) };
}
const A = Object.fromEntries(m.animations.map((a) => [a.name, a]));
const rest = bounds(pose(null, 0)); console.log('REST', JSON.stringify(rest));
const open0 = bounds(pose(A.open, A.open.length)); console.log('open SON == rest ?', JSON.stringify(open0) === JSON.stringify(rest));
const close0 = bounds(pose(A.close, 0)); console.log('close BAŞ == rest ?', JSON.stringify(close0) === JSON.stringify(rest));
// kamera: oyuncu-merkezi (8,_,8) göre; göz y=28 ; fly boyunca max y
let maxY = -1e9; for (let t = 0; t <= 1.6; t += 0.02) { maxY = Math.max(maxY, bounds(pose(A.fly, t)).mx[1]); } console.log('FLY max y (çıplak, göz=28):', maxY.toFixed(2));
// hover/idle: min z (oyuncu merkezi z=8; göz kamerası z=8) 
for (const n of ['idle', 'hover']) { let mz = 1e9, my = -1e9; for (let t = 0; t <= A[n].length; t += 0.05) { const b = bounds(pose(A[n], t)); mz = Math.min(mz, b.mn[2] - 8); my = Math.max(my, b.mx[1]); } console.log(n, 'min z (göz=0):', mz.toFixed(2), 'max y', my.toFixed(2)); }
// kapalı/yok olma
const cl = bounds(pose(A.close, 0.8)); console.log('close@0.8 sınır', JSON.stringify(cl));
const ce = bounds(pose(A.close, A.close.length)); console.log('close SON sınır (ölçek~0)', JSON.stringify(ce));

// ===== Ekran kaplama analizi (süzülme kamerası): kamera = ayak merkezi + 0.4 blok yukarı (z +6.4 px), ileri = +y, yukarı = +z, sağ = +x
function worldCubes(st) {
  const out = [];
  for (const n of Object.keys(G)) for (const c of cubesOf[n]) {
    const pts = [];
    for (const x of [c.from[0], c.to[0]]) for (const y of [c.from[1], c.to[1]]) for (const z of [c.from[2], c.to[2]]) {
      let cur = [x, y, z]; for (let b = n; b; b = parent[b]) { const g = G[b], s = st[b]; const rel = cur.map((v, i) => (v - g.origin[i]) * s.s[i]); const r = rot(rel, s.r); cur = r.map((v, i) => g.origin[i] + v + s.p[i]); }
      pts.push(cur);
    } out.push(pts);
  } return out;
}
const FACES = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
function clipNear(poly, near) { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const ia = a[1] >= near, ib = b[1] >= near; if (ia) out.push(a); if (ia !== ib) { const t = (near - a[1]) / (b[1] - a[1]); out.push(a.map((v, k) => v + (b[k] - v) * t)); } } return out; }
function coverage(st, vfovDeg, camZ = 6.4, GW = 192, GH = 108) {
  const tv = Math.tan(vfovDeg * D / 2), th = tv * GW / GH; const mask = new Uint8Array(GW * GH);
  for (const pts of worldCubes(st)) for (const f of FACES) {
    let poly = clipNear(f.map((i) => pts[i]), 0.3); if (poly.length < 3) continue;
    const sp = poly.map((q) => [(q[0] - 8) / (q[1] * th), (q[2] - (8 + camZ)) / (q[1] * tv)]);   // -1..1
    const xs = sp.map((p) => p[0]), ys = sp.map((p) => p[1]);
    const ix0 = Math.max(0, Math.floor((Math.min(...xs) * 0.5 + 0.5) * GW)), ix1 = Math.min(GW - 1, Math.ceil((Math.max(...xs) * 0.5 + 0.5) * GW));
    const iy0 = Math.max(0, Math.floor((0.5 - Math.max(...ys) * 0.5) * GH)), iy1 = Math.min(GH - 1, Math.ceil((0.5 - Math.min(...ys) * 0.5) * GH));
    for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) {
      const px = ((ix + 0.5) / GW - 0.5) * 2, py = (0.5 - (iy + 0.5) / GH) * 2; let inside = false;
      for (let i = 0, j = sp.length - 1; i < sp.length; j = i++) { const [xi, yi] = sp[i], [xj, yj] = sp[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; }
      if (inside) mask[iy * GW + ix] = 1;
    }
  }
  let n = 0; for (const v of mask) n += v; return { pct: 100 * n / mask.length, mask, GW, GH };
}
for (const fov of [70, 90, 110]) {
  let mx = 0, at = 0; for (let t = 0; t < A.fly.length; t += 0.1) { const c = coverage(pose(A.fly, t), fov).pct; if (c > mx) { mx = c; at = t; } }
  console.log(`FLY ekran kaplama FOV${fov}: max %${mx.toFixed(2)} @${at.toFixed(1)}s`);
}
console.log('REST(poz) süzülürken kaplama FOV70: %' + coverage(pose(null, 0), 70).pct.toFixed(2));

// ===== ayakta/dikey duruşta kamera (göz y=25.9, z=8 merkez), farklı bakış eğimleri
function coverage2(st, vfovDeg, cam, f, u, GW = 192, GH = 108) {
  const r = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const tv = Math.tan(vfovDeg * D / 2), th = tv * GW / GH; const mask = new Uint8Array(GW * GH);
  for (const pts of worldCubes(st)) for (const face of FACES) {
    const vs = face.map((i) => { const rel = pts[i].map((v, k) => v - cam[k]); return [dot(rel, r), dot(rel, u), dot(rel, f)]; });   // [sağ, yukarı, derinlik]
    const poly = []; for (let i = 0; i < 4; i++) { const a = vs[i], b = vs[(i + 1) % 4]; const ia = a[2] >= 0.3, ib = b[2] >= 0.3; if (ia) poly.push(a); if (ia !== ib) { const t = (0.3 - a[2]) / (b[2] - a[2]); poly.push(a.map((v, k) => v + (b[k] - v) * t)); } }
    if (poly.length < 3) continue;
    const sp = poly.map((q) => [q[0] / (q[2] * th), q[1] / (q[2] * tv)]);
    const xs = sp.map((p) => p[0]), ys = sp.map((p) => p[1]);
    const ix0 = Math.max(0, Math.floor((Math.min(...xs) * 0.5 + 0.5) * GW)), ix1 = Math.min(GW - 1, Math.ceil((Math.max(...xs) * 0.5 + 0.5) * GW));
    const iy0 = Math.max(0, Math.floor((0.5 - Math.max(...ys) * 0.5) * GH)), iy1 = Math.min(GH - 1, Math.ceil((0.5 - Math.min(...ys) * 0.5) * GH));
    for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) {
      const px = ((ix + 0.5) / GW - 0.5) * 2, py = (0.5 - (iy + 0.5) / GH) * 2; let inside = false;
      for (let i = 0, j = sp.length - 1; i < sp.length; j = i++) { const [xi, yi] = sp[i], [xj, yj] = sp[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; }
      if (inside) mask[iy * GW + ix] = 1;
    }
  }
  let n = 0; for (const v of mask) n += v; return 100 * n / mask.length;
}
const cam0 = [8, 25.9, 8];
for (const [label, pit] of [['0°', 0], ['45° aşağı', 45], ['75° aşağı', 75], ['90° aşağı', 90], ['90° yukarı', -90], ['60° yukarı', -60]]) {
  const p = pit * D; const f = [0, -Math.sin(p), -Math.cos(p)], u = [0, Math.cos(p), -Math.sin(p)];
  const res = {}; for (const an of ['idle', 'hover']) { let mx = 0; for (let t = 0; t < A[an].length; t += 0.4) mx = Math.max(mx, coverage2(pose(A[an], t), 70, cam0, f, u)); res[an] = mx.toFixed(2); }
  console.log(`AYAKTA bakış ${label}: idle %${res.idle}  hover %${res.hover}`);
}
