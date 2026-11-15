import { loadModel, createViewer } from './viewer.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// reveal
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
$$('.facts>*, .design>*, .alist li, .gallery figure, .cam>*, .get-grid>*, .status .two>*, .anims>h2, .gallery>h2').forEach((el) => { el.classList.add('rv'); io.observe(el); });

function glOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

async function main() {
  const hero = $('.hero');
  if (!glOk()) { fail(); return; }
  let data;
  try { data = await loadModel('model/wings.bbmodel'); } catch (e) { console.error(e); fail(); return; }
  function fail() { $('.fallback').hidden = false; $('#heroGL').hidden = true; $('.ctrl').hidden = true; $('#sceneGL').closest('.scene').style.height = 'auto'; }

  const btns = $$('.ctrl button');
  const mark = (name) => btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.anim === name)));
  const v = createViewer($('#heroGL'), data, { anim: 'open', yaw: 0.5, pitch: 0.1, dist: 9, shiftX: 0.4, shiftY: 0.35, shiftYm: 0.2, onAnim: mark });
  v.play('open', 'idle'); window.wingViewer = v;
  btns.forEach((b) => b.addEventListener('click', () => {
    const n = b.dataset.anim;
    v.play(n, n === 'open' ? 'idle' : null);
  }));
  $$('[data-play]').forEach((b) => b.addEventListener('click', () => {
    const n = b.dataset.play;
    v.play(n, n === 'open' ? 'idle' : null);
    hero.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));

  // kaydırmayla açılış
  const scene = $('.scene');
  const sv = createViewer($('#sceneGL'), data, { anim: 'open', yaw: 1.5, pitch: 0.15, dist: 9, noInteract: true, auto: false, t0: 0 });
  const len = sv.anims.open.len;
  const steps = $$('.step', scene), bar = $('.bar i', scene);
  function onScroll() {
    const r = scene.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    const q = Math.min(1, p / 0.8);
    sv.scrub('open', q * len);
    sv.setView(1.5 - q * 1.5 + p * 0.0, 0.15, null);
    bar.style.width = (p * 100) + '%';
    let cur = 0; steps.forEach((s, i) => { if (q >= parseFloat(s.dataset.at)) cur = i; });
    steps.forEach((s, i) => s.classList.toggle('on', i === cur));
  }
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();
}
main();
