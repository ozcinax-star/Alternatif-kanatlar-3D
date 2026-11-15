// Blockbench (.bbmodel) -> three.js görüntüleyici. Model dosyası doğrudan okunur; GLB dönüşümü yok.
import * as THREE from './vendor/three.module.min.js';

const FACES = {
  north: (f, t) => [[t[0], t[1], f[2]], [f[0], t[1], f[2]], [f[0], f[1], f[2]], [t[0], f[1], f[2]]],
  south: (f, t) => [[f[0], t[1], t[2]], [t[0], t[1], t[2]], [t[0], f[1], t[2]], [f[0], f[1], t[2]]],
  east: (f, t) => [[t[0], t[1], t[2]], [t[0], t[1], f[2]], [t[0], f[1], f[2]], [t[0], f[1], t[2]]],
  west: (f, t) => [[f[0], t[1], f[2]], [f[0], t[1], t[2]], [f[0], f[1], t[2]], [f[0], f[1], f[2]]],
  up: (f, t) => [[f[0], t[1], f[2]], [t[0], t[1], f[2]], [t[0], t[1], t[2]], [f[0], t[1], t[2]]],
  down: (f, t) => [[f[0], f[1], t[2]], [t[0], f[1], t[2]], [t[0], f[1], f[2]], [f[0], f[1], f[2]]],
};

export async function loadModel(url) {
  const bb = await (await fetch(url)).json();
  const tex = await new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img); img.onerror = rej;
    img.src = bb.textures[0].source;
  });
  return { bb, tex };
}

const num = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function createViewer(canvas, data, opts = {}) {
  const { bb, tex } = data;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  const texture = new THREE.CanvasTexture(tex);
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = false;
  const mat = new THREE.MeshLambertMaterial({ map: texture });

  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x3a3550, 1.9));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(-3, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9db4ff, 1.4); rim.position.set(4, 2, -5); scene.add(rim);

  // --- model
  const elByUuid = new Map(bb.elements.map((e) => [e.uuid, e]));
  const groups = []; // { name, node, rest, origin, anim }
  const byUuid = new Map();
  const root = new THREE.Group();
  root.scale.setScalar(1 / 16);
  const SIZE_CENTER = new THREE.Vector3(8, 21, 12);
  root.position.copy(SIZE_CENTER).multiplyScalar(-1 / 16);
  const holder = new THREE.Group(); holder.add(root); scene.add(holder);

  function cubeMesh(el, origin) {
    const pos = [], uv = [], idx = []; let n = 0;
    for (const [name, fn] of Object.entries(FACES)) {
      const face = el.faces[name]; if (!face || face.uv == null) continue;
      const corners = fn(el.from, el.to);
      const [u1, v1, u2, v2] = face.uv;
      const uvs = [[u1, v1], [u2, v1], [u2, v2], [u1, v2]];
      corners.forEach((c, i) => { pos.push(c[0] - origin[0], c[1] - origin[1], c[2] - origin[2]); uv.push(uvs[i][0] / 64, 1 - uvs[i][1] / 64); });
      idx.push(n, n + 3, n + 2, n, n + 2, n + 1); n += 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  }

  function build(nodes, parent, parentOrigin) {
    for (const n of nodes) {
      if (typeof n === 'string') { const el = elByUuid.get(n); if (el) parent.add(cubeMesh(el, parentOrigin)); continue; }
      const o = new THREE.Object3D();
      o.rotation.order = 'ZYX';
      const org = n.origin || [0, 0, 0];
      const rest = n.rotation || [0, 0, 0];
      o.position.set(org[0] - parentOrigin[0], org[1] - parentOrigin[1], org[2] - parentOrigin[2]);
      parent.add(o);
      const g = { name: n.name, node: o, rest, base: o.position.clone() };
      groups.push(g); byUuid.set(n.uuid, g);
      build(n.children || [], o, org);
    }
  }
  build(bb.outliner, root, [0, 0, 0]);

  // --- animasyon
  const anims = {};
  for (const a of bb.animations) {
    const per = [];
    for (const [uuid, an] of Object.entries(a.animators)) {
      const g = byUuid.get(uuid); if (!g) continue;
      const ch = {};
      for (const k of an.keyframes) {
        const dp = k.data_points[0];
        (ch[k.channel] ||= []).push({ t: k.time, v: [num(dp.x), num(dp.y), num(dp.z)], lin: k.interpolation === 'linear' });
      }
      for (const c of Object.values(ch)) c.sort((x, y) => x.t - y.t);
      per.push({ g, ch });
    }
    anims[a.name] = { len: a.length, loop: a.loop, per };
  }
  function sample(frames, t, def) {
    if (!frames) return def;
    const n = frames.length;
    if (t <= frames[0].t) return frames[0].v;
    if (t >= frames[n - 1].t) return frames[n - 1].v;
    let i = 0; while (i < n - 2 && frames[i + 1].t <= t) i++;
    const a = frames[i], b = frames[i + 1];
    const f = (t - a.t) / (b.t - a.t || 1);
    if (a.lin || b.lin) return a.v.map((v, k) => v + (b.v[k] - v) * f);
    const p0 = frames[Math.max(0, i - 1)], p3 = frames[Math.min(n - 1, i + 2)];
    return a.v.map((v, k) => catmull(p0.v[k], v, b.v[k], p3.v[k], f));
  }
  const D = Math.PI / 180;
  function pose(name, t) {
    const an = anims[name]; if (!an) return;
    const tt = an.loop === 'loop' ? ((t % an.len) + an.len) % an.len : Math.min(Math.max(t, 0), an.len);
    for (const { g, ch } of an.per) {
      const r = sample(ch.rotation, tt, [0, 0, 0]);
      const p = sample(ch.position, tt, [0, 0, 0]);
      const s = sample(ch.scale, tt, [1, 1, 1]);
      g.node.rotation.set((g.rest[0] + r[0]) * D, (g.rest[1] + r[1]) * D, (g.rest[2] + r[2]) * D);
      g.node.position.set(g.base.x + p[0], g.base.y + p[1], g.base.z + p[2]);
      g.node.scale.set(s[0], s[1], s[2]);
    }
  }

  // --- durum
  const st = { anim: opts.anim || 'idle', t: 0, playing: true, next: null, speed: 1, yaw: opts.yaw ?? 0.55, pitch: opts.pitch ?? 0.12, dist: opts.dist ?? 5.4, auto: opts.auto ?? true, scrub: null, visible: true };
  let dragging = false, lx = 0, ly = 0, lastInteract = -1e9;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!opts.noInteract) {
    canvas.style.touchAction = 'pan-y';
    canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); lastInteract = performance.now(); });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      st.yaw -= (e.clientX - lx) * 0.008; st.pitch = Math.max(-1.1, Math.min(1.1, st.pitch + (e.clientY - ly) * 0.006));
      lx = e.clientX; ly = e.clientY; lastInteract = performance.now();
    });
    const up = () => { dragging = false; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { if (!e.ctrlKey && !opts.zoom) return; e.preventDefault(); st.dist = Math.max(3.5, Math.min(9, st.dist + e.deltaY * 0.004)); }, { passive: false });
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') st.yaw += 0.15; else if (e.key === 'ArrowRight') st.yaw -= 0.15;
      else if (e.key === 'ArrowUp') st.pitch = Math.min(1.1, st.pitch + 0.1); else if (e.key === 'ArrowDown') st.pitch = Math.max(-1.1, st.pitch - 0.1);
      else if (e.key === '+' || e.key === '=') st.dist = Math.max(3.5, st.dist - 0.4); else if (e.key === '-') st.dist = Math.min(9, st.dist + 0.4);
      lastInteract = performance.now();
    });
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // dar ekranda uzaklaş: kanat açıklığı (~5 blok) sığsın
    camera.userData.fitW = 6.6 / (2 * Math.tan(15 * Math.PI / 180) * camera.aspect);
    holder.position.x = camera.aspect > 1.3 ? (opts.shiftX || 0) : 0; holder.position.y = camera.aspect > 1.3 ? (opts.shiftY || 0) : (opts.shiftYm || 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver((e) => { st.visible = e[0].isIntersecting; }, { threshold: 0 }).observe(canvas);

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!st.visible || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (st.scrub != null) { pose(st.anim, st.scrub); }
    else if (st.playing && !reduce) {
      st.t += dt * st.speed;
      const an = anims[st.anim];
      if (an.loop !== 'loop' && st.t >= an.len && st.next) { st.anim = st.next; st.next = null; st.t = 0; opts.onAnim && opts.onAnim(st.anim); }
      pose(st.anim, st.t);
    }
    if (st.auto && !reduce && !dragging && now - lastInteract > 2500) st.yaw += dt * 0.12;
    const d = Math.max(st.dist, camera.userData.fitW || 0);
    camera.position.set(Math.sin(st.yaw) * Math.cos(st.pitch) * d, Math.sin(st.pitch) * d + 0.1, Math.cos(st.yaw) * Math.cos(st.pitch) * d);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  pose(st.anim, opts.t0 ?? 0);
  resize(); requestAnimationFrame(frame);

  return {
    state: st, anims,
    play(name, next) { st.anim = name; st.t = 0; st.next = next || null; st.playing = true; st.scrub = null; opts.onAnim && opts.onAnim(name); },
    scrub(name, t) { st.anim = name; st.scrub = t; },
    setView(y, p, dist) { if (y != null) st.yaw = y; if (p != null) st.pitch = p; if (dist != null) st.dist = dist; },
    toggle() { st.playing = !st.playing; return st.playing; },
    set auto(v) { st.auto = v; },
    pose, dispose() { renderer.dispose(); },
  };
}
