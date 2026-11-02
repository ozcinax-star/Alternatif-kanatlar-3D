// Supernatural tarzı melek kanadı üreteci: geometri + FK doğrulama + animasyonlar
import fs from 'node:fs';
const OUT = process.argv[2];
const SH = [8, 0, 8];               // oyuncu merkezi -> blok merkezi
const SIGN_Z = 1;                    // görsel doğrulamada ters çıkarsa -1

// ---------- kanat iskeleti (sağ kanat, oyuncu-yerel koordinat, +x dışarı, +y yukarı, +z sırt arkası)
const S = [2.5, 21, 4.4];
const HUM = 10, FORE = 12;
const E = [S[0] + HUM, S[1], S[2]];
const W = [E[0] + FORE, S[1], S[2]];
const REST = { sweep: -30, H: 62, Fnet: 16, tilt: 0 };       // net açılar
const BASE = -90;                                              // sarkma yönü

const bones = [];     // {name,parent,origin,rest:[rx,ry,rz],cubes:[{n,from,to}],kind,q,restNet}
const add = (b) => { bones.push(b); return b; };

function feather(prefix, i, parent, origin, restNet, parentNetRest, len, wid, zoff, q, kind) {
  const b = add({ name: `${prefix}`, parent, origin, rest: [0, 0, restNet - parentNetRest], cubes: [], kind, q, restNet, parentRef: parentNetRest });
  const l1 = Math.round(len * 0.62 * 2) / 2, l2 = len - l1;
  const z0 = origin[2] - 0.5 + zoff;
  b.cubes.push({ n: `${prefix}_a`, from: [origin[0], origin[1] - wid / 2, z0], to: [origin[0] + l1, origin[1] + wid / 2, z0 + 1] });
  const w2 = Math.max(1, wid - 1);
  b.cubes.push({ n: `${prefix}_b`, from: [origin[0] + l1, origin[1] - w2 / 2, z0], to: [origin[0] + l1 + l2, origin[1] + w2 / 2, z0 + 1] });
  return b;
}

function buildWing() {
  const L = [];
  add({ name: 'wing', parent: null, origin: S, rest: [0, 0, 0], cubes: [], kind: 'root' });
  add({ name: 'sweep', parent: 'wing', origin: S, rest: [0, REST.sweep, 0], cubes: [], kind: 'sweep' });
  add({ name: 'humerus', parent: 'sweep', origin: S, rest: [0, 0, REST.H], kind: 'arm',
    cubes: [{ n: 'humerus_c', from: [S[0] - 1, S[1] - 2, S[2] - 1.4], to: [S[0] + HUM, S[1] + 2, S[2] + 1.4] },
            { n: 'scapula_c', from: [S[0] - 2.5, S[1] - 3.5, S[2] - 2.4], to: [S[0] + 2, S[1] + 3.5, S[2] + 1.4] }] });
  add({ name: 'forearm', parent: 'humerus', origin: E, rest: [0, 0, REST.Fnet - REST.H], kind: 'arm',
    cubes: [{ n: 'forearm_c', from: [E[0], E[1] - 1.6, E[2] - 1.2], to: [E[0] + FORE, E[1] + 1.6, E[2] + 1.2] }] });
  const HN = REST.H, FN = REST.Fnet;
  // alula (başparmak tüyü)
  [[75, 7], [55, 8]].forEach(([net, len], i) =>
    feather(`alula${i}`, i, 'forearm', [W[0] - 3, W[1] + 1.5, W[2]], net, FN, len, 3, 0.1 * i + 0.9, 0.0, 'alula'));
  // birincil (primer) tüyler - elden
  const pNet = [32, 21, 10, -1, -12, -24, -37], pLen = [19, 25, 28, 27, 23, 19, 15], pW = [3, 4, 4, 4, 4, 4, 4];
  pNet.forEach((n, i) => feather(`pri${i}`, i, 'forearm', [W[0], W[1], W[2]], n, FN, pLen[i], pW[i], 0.12 * i, 0.55 + 0.3 * i / 6, 'pri'));
  // ikincil (sekonder) tüyler - ön kol boyunca
  const sNet = [-108, -100, -94, -88, -82, -76], sLen = [13, 13, 13, 12, 12, 11], sF = [0.12, 0.28, 0.44, 0.6, 0.76, 0.92];
  sNet.forEach((n, i) => feather(`sec${i}`, i, 'forearm', [E[0] + FORE * sF[i], E[1] - 0.8, E[2]], n, FN, sLen[i], 4, 0.12 * i + 0.05, 0.25 + 0.3 * i / 5, 'sec'));
  // tertial / skapüler tüyler - kol üstü
  const tNet = [-115, -102, -90, -78], tLen = [11, 11, 10, 9], tF = [0.0, 0.3, 0.62, 0.95];
  tNet.forEach((n, i) => feather(`ter${i}`, i, 'humerus', [S[0] + HUM * tF[i] + 0.5, S[1] - 0.8, S[2]], n, HN, tLen[i], 4, 0.12 * i + 0.02, 0.0 + 0.2 * i / 3, 'ter'));
  // örtü tüyleri (coverts) - dış yüzeyde, daha kısa
  sNet.forEach((n, i) => feather(`csec${i}`, i, 'forearm', [E[0] + FORE * sF[i] + 1, E[1] + 0.8, E[2]], n, FN, 9, 4, 1.1 + 0.05 * i, 0.3 + 0.3 * i / 5, 'cov'));
  pNet.forEach((n, i) => feather(`cpri${i}`, i, 'forearm', [W[0] - 1.5, W[1], W[2]], n, FN, 10, 4, 1.1 + 0.05 * i, 0.6 + 0.3 * i / 6, 'cov'));
  tNet.forEach((n, i) => feather(`cter${i}`, i, 'humerus', [S[0] + HUM * tF[i] + 1.5, S[1] + 0.5, S[2]], n, HN, 9, 4, 1.1 + 0.05 * i, 0.1, 'cov'));
}
buildWing();

// ---------- sol/sağ üretimi
function mirrorBone(b, sfx, mir) {
  const mx = (p) => mir ? [-p[0], p[1], p[2]] : p.slice();
  const nm = (n) => n + sfx;
  return {
    name: nm(b.name), parent: b.parent ? nm(b.parent) : 'wings_root', origin: mx(b.origin),
    rest: mir ? [b.rest[0], -b.rest[1], -b.rest[2]] : b.rest.slice(),
    cubes: b.cubes.map((c) => {
      const f = mx(c.from), t = mx(c.to);
      const from = [Math.min(f[0], t[0]), Math.min(f[1], t[1]), Math.min(f[2], t[2]) + (mir ? 0.05 : 0)];
      const to = [Math.max(f[0], t[0]), Math.max(f[1], t[1]), Math.max(f[2], t[2]) + (mir ? 0.05 : 0)];
      return { n: nm(c.n), from, to };
    }),
    kind: b.kind, q: b.q, restNet: b.restNet, base: b.name,
  };
}
const all = [{ name: 'wings_root', parent: null, origin: [0, 0, 0], rest: [0, 0, 0], cubes: [], kind: 'top' }];
for (const b of bones) all.push(mirrorBone(b, '_r', false));
for (const b of bones) all.push(mirrorBone(b, '_l', true));
const byName = Object.fromEntries(all.map((b) => [b.name, b]));

// ---------- FK
const D = Math.PI / 180;
function rot(p, r) {
  let [x, y, z] = p;
  let c = Math.cos(r[0] * D), s = Math.sin(r[0] * D); [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(r[1] * D); s = Math.sin(r[1] * D); [x, z] = [x * c + z * s, -x * s + z * c];
  const zz = r[2] * D * SIGN_Z; c = Math.cos(zz); s = Math.sin(zz); [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}
// state: {bone: {rot:[..], scale, pos}} mutlak değerler
function world(p, boneName, st) {
  let cur = p;
  for (let b = byName[boneName]; b; b = b.parent ? byName[b.parent] : null) {
    const s = st[b.name] || { rot: b.rest, scale: 1, pos: [0, 0, 0] };
    const sv = s.sv || [s.scale, s.scale, s.scale];
    const rel = [(cur[0] - b.origin[0]) * sv[0], (cur[1] - b.origin[1]) * sv[1], (cur[2] - b.origin[2]) * sv[2]];
    const r = rot(rel, s.rot);
    cur = [b.origin[0] + r[0] + s.pos[0], b.origin[1] + r[1] + s.pos[1], b.origin[2] + r[2] + s.pos[2]];
  }
  return cur;
}
function bounds(st) {
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const b of all) for (const c of b.cubes) for (const x of [c.from[0], c.to[0]]) for (const y of [c.from[1], c.to[1]]) for (const z of [c.from[2], c.to[2]]) {
    const w = world([x, y, z], b.name, st);
    for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], w[i]); mx[i] = Math.max(mx[i], w[i]); }
  }
  return { mn, mx };
}

// ---------- poz parametreleri -> mutlak durum
const ease = { sm: (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); },
  back: (x) => { x = Math.min(1, Math.max(0, x)); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  io3: (x) => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; } };
const lerp = (a, b, t) => a + (b - a) * t;
const OPEN = { tilt: 0, sweep: REST.sweep, H: REST.H, Fnet: REST.Fnet, k: 1, pz: 0 };
const CLOSED = { tilt: -6, sweep: 0, H: -95, Fnet: 80, k: 0.07, pz: 0.8 };
const FOLD = (n, open) => { const bb = bones.find((x) => x.name === n); const f = bb ? (bb.kind === 'pri' ? 0.6 : 0.55) : 1; return lerp(f, 1, Math.min(1, Math.max(0, open))); };
const mixPose = (a, b, t) => Object.fromEntries(Object.keys(a).map((k) => [k, lerp(a[k], b[k], t)]));

// ripple(boneBase, side) -> derece
function stateFrom(P, opt = {}) {
  const st = {};
  const rip = opt.rip || (() => 0);
  const sc = opt.sc || (() => 1);
  for (const side of ['_r', '_l']) {
    const m = side === '_l' ? -1 : 1;
    const ph = side === '_l' ? (opt.lPhase || 0) : 0;
    const g = (n) => n + side;
    const px = P['d' + side] ? P['d' + side] : {};
    st[g('wing')] = { rot: [P.tilt, 0, 0], scale: sc('wing'), sv: [sc('wing'), sc('wing'), sc('wing') * (P.zs || 1)], pos: [0, P.dy || 0, P.pz] };
    st[g('sweep')] = { rot: [0, m * P.sweep, 0], scale: 1, pos: [0, 0, 0] };
    st[g('humerus')] = { rot: [0, 0, m * P.H], scale: 1, pos: [0, 0, 0] };
    st[g('forearm')] = { rot: [0, 0, m * (P.Fnet - P.H)], scale: 1, pos: [0, 0, 0] };
    for (const b of bones) {
      if (!b.parentRef && b.parentRef !== 0) continue;
      const parentNet = b.parent === 'forearm' ? P.Fnet : P.H;
      const net = BASE + P.k * (b.restNet - BASE) + rip(b, ph);
      st[g(b.name)] = { rot: [0, 0, m * (net - parentNet)], scale: sc(b.name, side), pos: [0, 0, 0] };
    }
  }
  return st;
}
// rest durumu
const restState = stateFrom(OPEN);
console.log('REST sınırlar', JSON.stringify(bounds(restState)));
// FK doğrulaması için rest bayrakları: group rest ile birebir aynı mı?
for (const b of all) {
  const s = restState[b.name]; if (!s) continue;
  const d = Math.max(...s.rot.map((v, i) => Math.abs(v - b.rest[i])));
  if (d > 1e-6) console.log('REST UYUMSUZ', b.name, s.rot, b.rest);
}

// ---------- animasyon örnekleyici
function ripple(amp, T, t, lagPerQ) {
  return (b, ph) => {
    if (b.kind === 'ter' || b.kind === 'sec' || b.kind === 'pri' || b.kind === 'cov' || b.kind === 'alula') {
      const q = b.q || 0;
      return amp * (0.4 + q) * Math.sin(2 * Math.PI * t / T - lagPerQ * q + ph);
    }
    return 0;
  };
}
const sin = (t, T, ph = 0) => Math.sin(2 * Math.PI * t / T + ph);

const anims = {};
const names = all.filter((b) => b.name !== 'wings_root').map((b) => b.name);

function sampleAnim(name, length, loop, step, poseFn, extra = {}) {
  const n = Math.round(length / step);
  const bonesOut = {};
  const frames = [];
  for (let i = 0; i <= n; i++) {
    const t = Math.min(length, i * step);
    const { P, opt } = poseFn(t);
    const st = stateFrom(P, opt);
    frames.push({ t, st, P });
    for (const nm of names) {
      const b = byName[nm];
      const cur = st[nm]; if (!cur) continue;
      const o = (bonesOut[nm] ||= { rotation: [], position: [], scale: [] });
      const dr = cur.rot.map((v, k) => +(v - b.rest[k]).toFixed(3));
      o.rotation.push({ time: +t.toFixed(3), value: dr, interpolation: 'catmullrom' });
      if (b.kind === 'root') o.position.push({ time: +t.toFixed(3), value: [0, +cur.pos[1].toFixed(3), +cur.pos[2].toFixed(3)], interpolation: 'catmullrom' });
      { const v = cur.sv || [cur.scale, cur.scale, cur.scale]; if (v.some((q) => q !== 1)) o.scale.push({ time: +t.toFixed(3), value: v.map((q) => +q.toFixed(4)), interpolation: 'linear' }); }
    }
  }
  // temizlik: kullanılmayan kanallar
  for (const nm of Object.keys(bonesOut)) {
    const o = bonesOut[nm];
    if (!o.position.length || o.position.every((k) => k.value.every((v) => v === 0))) delete o.position;
    if (!o.scale.length || (o.scale.every((k) => k.value.every((q) => q === 1)))) delete o.scale;
    else {                       // bir kanalda anahtar varsa tüm zaman çizelgesini doldur
      const full = frames.map((f) => { const q = f.st[nm]; const v = q.sv || [q.scale, q.scale, q.scale]; return { time: +f.t.toFixed(3), value: v.map((w) => +w.toFixed(4)), interpolation: 'linear' }; });
      o.scale = full;
    }
  }
  anims[name] = { name, length, loop, bones: bonesOut, replace: true };
  return frames;
}

// 1) idle: yerde yaşayan, nefes alan kanatlar
sampleAnim('idle', 5, 'loop', 0.25, (t) => ({
  P: { tilt: 0.8 * sin(t, 5), sweep: REST.sweep + 2.2 * sin(t, 5, 0.4) + 0.8 * sin(t, 2.5), H: REST.H + 2.6 * sin(t, 5), Fnet: REST.Fnet + 2.2 * sin(t, 5, -0.9),
    k: 1 + 0.025 * sin(t, 5, -0.5), pz: 0 },
  opt: { rip: (b, ph) => ripple(1.8, 5, t, 1.4)(b, ph) + (b.kind === 'pri' ? 3.2 * Math.max(0, sin(t, 5, -3.6)) ** 6 * (b.q + 0.2) : 0), lPhase: 0.5 },
}));

// 2) hover: dikey/dik duruşta pasif çırpış
sampleAnim('hover', 3.2, 'loop', 0.2, (t) => {
  const u = sin(t, 3.2);
  return { P: { tilt: 2 * u, sweep: REST.sweep + 5 * u, H: 52 + 11 * u, Fnet: 10 + 4 * u + 9 * sin(t, 3.2, -1.1), k: 1 - 0.07 * u, pz: 0 },
    opt: { rip: ripple(3.2, 3.2, t, 1.9), lPhase: 0.18 } };
});

// 3) fly: elytra süzülme - kamera güvenli (y <= sınır), kuvvetli çırpış
const GLIDE = (t) => {
  const u = sin(t, 1.6);
  const E_ = (k, d) => (process.env[k] !== undefined ? +process.env[k] : d);
  return { P: { tilt: E_('TILT', -2), sweep: E_('SWEEP', -46) + 7 * u, H: -9 + 17 * u, Fnet: -24 + 7 * u + 8 * sin(t, 1.6, -1.0), k: 0.55 + 0.1 * u, pz: E_('PZ', 0), dy: -E_('DY', 0), zs: E_('ZS', 1) },
    opt: { rip: ripple(3.6, 1.6, t, 1.7), lPhase: 0.12 } };
};
const glideFrames = sampleAnim('fly', 1.6, 'loop', 0.1, GLIDE);

// 4) open: ölçekle belirip kanatlar açılır
const orderQ = (b, side) => {
  // iç -> dış sıralama: kol, tertial, sekonder, primer, örtüler
  const k = { arm: 0, ter: 0.1, sec: 0.25, pri: 0.55, cov: 0.4, alula: 0.8 }[b.kind] ?? 0;
  return k + 0.18 * (b.q || 0);
};
sampleAnim('open', 1.3, 'hold', 0.05, (t) => {
  const u = ease.back((t - 0.1) / 1.1);
  const P = mixPose(CLOSED, OPEN, u); P.pz = lerp(CLOSED.pz, 0, ease.sm((t - 0.1) / 1.1));
  const sc = (n) => {
    const b = byName[n + '_r'] || bones.find((x) => x.name === n);
    if (n === 'wing') return Math.max(0.001, ease.sm(t / 0.35));
    const bb = bones.find((x) => x.name === n);
    const q = bb ? orderQ(bb) : 0;
    return Math.max(0.001, ease.sm((t - 0.05 - 0.38 * q) / 0.32)) * FOLD(n, u);
  };
  return { P, opt: { sc: (n) => sc(n), rip: (b) => 0 } };
});

// 5) close: sırta kapan, tüyler dağılır, kanat sırta çekilip yok olur
sampleAnim('close', 1.3, 'hold', 0.05, (t) => {
  const u = ease.io3(t / 0.8);
  const P = mixPose(OPEN, CLOSED, u); P.pz = lerp(0, CLOSED.pz, u);
  const sc = (n) => {
    if (n === 'wing') return Math.max(0.001, 1 - ease.sm((t - 0.85) / 0.4));
    const bb = bones.find((x) => x.name === n);
    const q = 1 - (bb ? Math.min(1, orderQ(bb)) : 0);
    return Math.max(0.001, 1 - ease.sm((t - 0.45 - 0.3 * (1 - q)) / 0.35)) * FOLD(n, 1 - u);
  };
  return { P, opt: { sc: (n) => sc(n) } };
});

// ---------- kamera güvenliği: fly animasyonu boyunca azami y / minimum "ileri" kontrolü
let worst = -1e9, wFrame = 0;
glideFrames.forEach((f) => { const b = bounds(f.st); if (b.mx[1] > worst) { worst = b.mx[1]; wFrame = f.t; } });
console.log('FLY max y (göz=28):', worst.toFixed(2), '@', wFrame);
const hoverB = []; for (let t = 0; t <= 3.2; t += 0.2) { const { P, opt } = anims && { P: { tilt: 2 * sin(t, 3.2), sweep: REST.sweep + 5 * sin(t, 3.2), H: 52 + 11 * sin(t, 3.2), Fnet: 10 + 4 * sin(t, 3.2) + 9 * sin(t, 3.2, -1.1), k: 1 - 0.07 * sin(t, 3.2), pz: 0 }, opt: {} }; hoverB.push(bounds(stateFrom(P, opt))); }
console.log('HOVER: max y', Math.max(...hoverB.map((b) => b.mx[1])).toFixed(2), ' min z', Math.min(...hoverB.map((b) => b.mn[2])).toFixed(2));
const cb = bounds(stateFrom(CLOSED, { sc: (n) => (n === 'wing' ? 1 : FOLD(n, 0)) })); console.log('KAPALI sınır', JSON.stringify(cb));
console.log('AÇIK sınır', JSON.stringify(bounds(restState)));

// ---------- çıktı: geometri
const groups = [], cubes = [];
for (const b of all) {
  groups.push({ name: b.name, origin: [b.origin[0] + SH[0], b.origin[1] + SH[1], b.origin[2] + SH[2]], rotation: b.rest, ...(b.parent ? { parent: b.parent } : {}) });
  for (const c of b.cubes) cubes.push({ name: c.n, from: [c.from[0] + SH[0], c.from[1], c.from[2] + SH[2]], to: [c.to[0] + SH[0], c.to[1], c.to[2] + SH[2]], parent: b.name });
}
fs.writeFileSync(OUT + '/geometry.json', JSON.stringify({ create_groups: groups, create_cubes: cubes, undo_label: 'Melek kanatlari' }));
fs.writeFileSync(OUT + '/cubes.json', JSON.stringify(cubes.map((c) => ({ n: c.name, from: c.from, to: c.to }))));
for (const [k, v] of Object.entries(anims)) fs.writeFileSync(`${OUT}/anim_${k}.json`, JSON.stringify(v));
console.log('grup', groups.length, 'küp', cubes.length, 'anim', Object.keys(anims).join(','));

// yukarı bakış güvenliği: göz (y=28, z=0) üstündeki noktalarda arka/yükseklik oranı (>=1.2 olmalı)
function lookUpRatio(st) {
  let m = 1e9;
  for (const b of all) for (const c of b.cubes) for (const x of [c.from[0], c.to[0]]) for (const y of [c.from[1], c.to[1]]) for (const z of [c.from[2], c.to[2]]) {
    const w = world([x, y, z], b.name, st); if (w[1] > 28.3) m = Math.min(m, w[2] / (w[1] - 28));
  } return m;
}
let mr = 1e9; for (let t = 0; t <= 3.2; t += 0.2) { const u = sin(t, 3.2); mr = Math.min(mr, lookUpRatio(stateFrom({ tilt: 2 * u, sweep: REST.sweep + 5 * u, H: 52 + 11 * u, Fnet: 10 + 4 * u + 9 * sin(t, 3.2, -1.1), k: 1 - 0.07 * u, pz: 0 }))); }
console.log('YUKARI BAKIŞ min arka/yükseklik oranı (hover):', mr.toFixed(2), ' rest:', lookUpRatio(restState).toFixed(2));

// ---------- önizleme dökümü
function dump(st) {
  const out = [];
  for (const b of all) for (const c of b.cubes) {
    const pts = [];
    for (const x of [c.from[0], c.to[0]]) for (const y of [c.from[1], c.to[1]]) for (const z of [c.from[2], c.to[2]]) pts.push(world([x, y, z], b.name, st));
    out.push({ n: c.n, k: b.kind, p: pts });
  }
  return out;
}
const gf = glideFrames.find((f) => Math.abs(f.t - 0.4) < 1e-6).st, gf2 = glideFrames.find((f) => Math.abs(f.t - 1.2) < 1e-6).st;
fs.writeFileSync(OUT + '/poses.json', JSON.stringify({ open: dump(restState), closed: dump(stateFrom(CLOSED, { sc: (n) => (n === 'wing' ? 1 : FOLD(n, 0)) })), glide_up: dump(gf), glide_down: dump(gf2),
  hover_up: dump(stateFrom({ tilt: 2, sweep: REST.sweep + 5, H: 63, Fnet: 10 + 4 + 9 * sin(0.8, 3.2, -1.1) * 0, k: 0.93, pz: 0 })) }));
