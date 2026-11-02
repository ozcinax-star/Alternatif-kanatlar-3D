import fs from 'node:fs'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
const IN = process.argv[2], OUT = process.argv[3];
const geo = JSON.parse(fs.readFileSync(IN + '/geometry.json', 'utf8'));
const uv = JSON.parse(fs.readFileSync(IN + '/uv.json', 'utf8')).entries;
const pix = JSON.parse(fs.readFileSync(IN + '/pixels.json', 'utf8')).pixels;
const uid = () => crypto.randomUUID();
// --- PNG
const W = 64, H = 64, raw = Buffer.alloc((W * 4 + 1) * H);
const bg = [0x12, 0x14, 0x1c, 255];
for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; for (let x = 0; x < W; x++) bg.forEach((v, i) => raw[y * (W * 4 + 1) + 1 + x * 4 + i] = v); }
for (const p of pix) { const c = p.color; const o = p.y * (W * 4 + 1) + 1 + p.x * 4; raw[o] = parseInt(c.slice(1, 3), 16); raw[o + 1] = parseInt(c.slice(3, 5), 16); raw[o + 2] = parseInt(c.slice(5, 7), 16); raw[o + 3] = 255; }
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(OUT + '/angel_wings.png', png);
// --- elements / outliner
const uvBy = {}; for (const e of uv) (uvBy[e.cube] ||= {})[e.face] = e.uv;
const groupUuid = {}, cubeUuid = {};
const elements = geo.create_cubes.map((c, i) => {
  const id = uid(); cubeUuid[c.name] = id;
  const faces = {}; for (const f of ['north', 'east', 'south', 'west', 'up', 'down']) faces[f] = { uv: uvBy[c.name][f], texture: 0 };
  return { name: c.name, box_uv: false, rescale: false, locked: false, render_order: 'default', allow_mirror_modeling: true, from: c.from, to: c.to, autouv: 0, color: i % 8,
    origin: [(c.from[0] + c.to[0]) / 2, (c.from[1] + c.to[1]) / 2, (c.from[2] + c.to[2]) / 2], faces, type: 'cube', uuid: id };
});
const gnode = {};
for (const g of geo.create_groups) { groupUuid[g.name] = uid(); gnode[g.name] = { name: g.name, origin: g.origin, rotation: g.rotation, color: 0, uuid: groupUuid[g.name], export: true, isOpen: false, locked: false, visibility: true, autouv: 0, children: [] }; }
const outliner = [];
for (const g of geo.create_groups) (g.parent ? gnode[g.parent].children : outliner).push(gnode[g.name]);
for (const c of geo.create_cubes) gnode[c.parent].children.push(cubeUuid[c.name]);
// --- animasyonlar
const animations = ['idle', 'hover', 'fly', 'open', 'close'].map((n) => {
  const a = JSON.parse(fs.readFileSync(`${IN}/anim_${n}.json`, 'utf8'));
  const animators = {};
  for (const [bone, ch] of Object.entries(a.bones)) {
    const kfs = [];
    for (const [chan, list] of Object.entries(ch)) for (const k of list) kfs.push({ channel: chan, data_points: [{ x: k.value[0], y: k.value[1], z: k.value[2] }], uuid: uid(), time: k.time, color: -1, interpolation: k.interpolation || 'linear' });
    animators[groupUuid[bone]] = { name: bone, type: 'bone', keyframes: kfs };
  }
  return { uuid: uid(), name: n, loop: a.loop, override: false, length: a.length, snapping: 20, selected: false, anim_time_update: '', blend_weight: '', start_delay: '', loop_delay: '', animators };
});
const model = { meta: { format_version: '4.10', creation_time: Math.floor(Date.now() / 1000), model_format: 'free', box_uv: false }, name: 'supernatural_angel_wings', model_identifier: 'supernatural_angel_wings',
  visible_box: [1, 1, 0], variable_placeholders: '', variable_placeholder_buttons: [], timeline_setups: [], unhandled_root_fields: {}, resolution: { width: W, height: H },
  elements, outliner, textures: [{ path: '', name: 'angel_wings.png', folder: '', namespace: '', id: '0', width: W, height: H, uv_width: W, uv_height: H, particle: false, use_as_default: false, layers_enabled: false, sync_to_project: '', render_mode: 'default', render_sides: 'auto', frame_time: 1, frame_order_type: 'loop', frame_order: '', frame_interpolate: false, visible: true, internal: true, saved: true, uuid: uid(), source: 'data:image/png;base64,' + png.toString('base64') }], animations };
fs.writeFileSync(OUT + '/supernatural_angel_wings.bbmodel', JSON.stringify(model));
console.log('yazıldı', elements.length, 'eleman', Object.keys(groupUuid).length, 'bone', animations.map((a) => a.name + ':' + Object.keys(a.animators).length).join(' '), 'png', png.length);
