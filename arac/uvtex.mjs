import fs from 'node:fs';
const OUT = process.argv[2];
const cubes = JSON.parse(fs.readFileSync(OUT + '/cubes.json', 'utf8'));
const byN = Object.fromEntries(cubes.map((c) => [c.n, c]));
const dims = (c) => [c.to[0] - c.from[0], c.to[1] - c.from[1], c.to[2] - c.from[2]];
const rowsFor = (w) => (w >= 4 ? [0, 4] : w >= 3 ? [4, 7] : [7, 9]);
const entries = [];
for (const c of cubes) {
  const [L, dy, dz] = dims(c);
  const left = c.n.endsWith('_l');
  const arm = /^(humerus|forearm|scapula)_c_/.test(c.n);
  let u0 = 0;
  if (!arm && /_b_[rl]$/.test(c.n)) { const a = byN[c.n.replace('_b_', '_a_')]; u0 = dims(a)[0]; }
  const u1 = u0 + L;
  const [ya] = arm ? [16] : rowsFor(dy);
  const yb = arm ? 32 : (ya + Math.round(dy / 2) - 0);     // up/down satırı: merkez
  const yc = arm ? 40 : ya;
  const S = left ? [u1, u0] : [u0, u1];                    // south: sağ kanatta normal, solda ters
  const N = left ? [u0, u1] : [u1, u0];                    // north: tersi
  const UD = left ? [u1, u0] : [u0, u1];
  entries.push({ cube: c.n, face: 'south', uv: [S[0], ya, S[1], ya + dy] });
  entries.push({ cube: c.n, face: 'north', uv: [N[0], ya, N[1], ya + dy] });
  entries.push({ cube: c.n, face: 'up', uv: [UD[0], yb, UD[1], yb + dz] });
  entries.push({ cube: c.n, face: 'down', uv: [UD[0], yb, UD[1], yb + dz] });
  entries.push({ cube: c.n, face: 'east', uv: [u1 - dz, yc, u1, yc + dy] });
  entries.push({ cube: c.n, face: 'west', uv: [u1 - dz, yc, u1, yc + dy] });
}
fs.writeFileSync(OUT + '/uv.json', JSON.stringify({ entries }));

// ---- atlas boyama (64x64)
const px = [];
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const rnd = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const set = (x, y, c) => px.push({ x, y, color: c });
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) set(x, y, null);
// tüy dokusu: satır grupları (merkez satırları = şaft)
const bands = [[0, 4], [4, 7], [7, 9]];
for (const [ya, yb] of bands) {
  const h = yb - ya, mid = (ya + yb - 1) / 2;
  for (let x = 0; x < 32; x++) for (let y = ya; y < yb; y++) {
    const t = x / 31, d = Math.abs(y - mid);
    let r = 20 + 26 * t, g = 22 + 30 * t, b = 36 + 48 * t;               // taban koyu -> uç parlak mavi-siyah
    const barb = ((x * 2 + Math.round(d * 2)) % 5 === 0);
    if (barb) { r += 9; g += 11; b += 18; }
    if (d < 0.75) { r += 30; g += 34; b += 52; }                           // şaft
    const n = (rnd(x, y) - 0.5) * 6; r += n; g += n; b += n * 1.3;
    if (x > 27) { r += 8 * (x - 27) / 4; g += 10 * (x - 27) / 4; b += 14 * (x - 27) / 4; }  // uç parıltısı
    px[y * 64 + x] = { x, y, color: hex(r, g, b) };
  }
}
// kol/deri dokusu
for (let y = 16; y < 48; y++) for (let x = 0; x < 32; x++) {
  const n = rnd(x * 1.7, y * 2.3); const lump = ((x + (y % 4) * 2) % 6 === 0) ? 7 : 0;
  px[y * 64 + x] = { x, y, color: hex(16 + n * 8 + lump, 17 + n * 8 + lump, 26 + n * 10 + lump * 1.4) };
}
fs.writeFileSync(OUT + '/pixels.json', JSON.stringify({ texture: 'angel_wings', pixels: px.filter((p) => p.color) }));
console.log('uv', entries.length, 'pixels', px.filter((p) => p.color).length);
