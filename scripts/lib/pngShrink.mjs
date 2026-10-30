/* Shrinks a screenshot PNG with no dependency: decode (8-bit RGBA/RGB, non-interlaced), and when it is over budget
 * reduce it to a palette (median cut on the colours the picture really uses, no dither — the pictures are flat UI),
 * write an indexed PNG with the best filter per row at zlib level 9. Lossless when it is already small enough. */
import { inflateSync, deflateSync } from 'node:zlib';

const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };

export function decode(png) {
  let p = 8, w = 0, h = 0, depth = 0, ctype = 0; const idat = [];
  while (p < png.length) {
    const len = png.readUInt32BE(p), type = png.toString('latin1', p + 4, p + 8), data = png.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; if (data[12]) throw new Error('interlaced'); }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  if (depth !== 8 || (ctype !== 6 && ctype !== 2)) throw new Error(`unsupported png ${depth}/${ctype}`);
  const bpp = ctype === 6 ? 4 : 3, stride = w * bpp, raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = v & 255;
    }
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; out[o] = line[x * bpp]; out[o + 1] = line[x * bpp + 1]; out[o + 2] = line[x * bpp + 2]; out[o + 3] = bpp === 4 ? line[x * bpp + 3] : 255; }
    prev = line;
  }
  return { w, h, rgba: out };
}

function palette(rgba, n, maxColours) {
  const hist = new Map();
  for (let i = 0; i < n; i++) { const k = (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2]; hist.set(k, (hist.get(k) ?? 0) + 1); }
  let boxes = [{ cols: [...hist.entries()].map(([k, c]) => ({ r: k >> 16, g: (k >> 8) & 255, b: k & 255, c })) }];
  const range = bx => { let lo = [255, 255, 255], hi = [0, 0, 0]; for (const x of bx.cols) { [x.r, x.g, x.b].forEach((v, i) => { if (v < lo[i]) lo[i] = v; if (v > hi[i]) hi[i] = v; }); } return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]; };
  while (boxes.length < maxColours) {
    let best = -1, bs = -1, bc = 0;
    boxes.forEach((bx, i) => { if (bx.cols.length < 2) return; const r = range(bx), ch = r.indexOf(Math.max(...r)); const s = Math.max(...r) * Math.log2(1 + bx.cols.reduce((a, x) => a + x.c, 0)); if (s > bs) { bs = s; best = i; bc = ch; } });
    if (best < 0) break;
    const bx = boxes[best], key = ['r', 'g', 'b'][bc]; bx.cols.sort((a, b) => a[key] - b[key]);
    const total = bx.cols.reduce((a, x) => a + x.c, 0); let acc = 0, cut = 1;
    for (let i = 0; i < bx.cols.length - 1; i++) { acc += bx.cols[i].c; if (acc >= total / 2) { cut = i + 1; break; } }
    boxes.splice(best, 1, { cols: bx.cols.slice(0, cut) }, { cols: bx.cols.slice(cut) });
  }
  return boxes.map(bx => { const t = bx.cols.reduce((a, x) => a + x.c, 0); return [Math.round(bx.cols.reduce((a, x) => a + x.r * x.c, 0) / t), Math.round(bx.cols.reduce((a, x) => a + x.g * x.c, 0) / t), Math.round(bx.cols.reduce((a, x) => a + x.b * x.c, 0) / t)]; });
}

/** Indexed PNG from RGBA. */
function encodeIndexed({ w, h, rgba }, maxColours) {
  const pal = palette(rgba, w * h, maxColours), cache = new Map(), idx = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const k = (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2]; let v = cache.get(k);
    if (v === undefined) { let bd = 1e9; pal.forEach((c, j) => { const d = (c[0] - (k >> 16)) ** 2 + (c[1] - ((k >> 8) & 255)) ** 2 + (c[2] - (k & 255)) ** 2; if (d < bd) { bd = d; v = j; } }); cache.set(k, v); }
    idx[i] = v;
  }
  const rows = [];
  let prev = Buffer.alloc(w);
  for (let y = 0; y < h; y++) {
    const line = Buffer.from(idx.subarray(y * w, (y + 1) * w)); let best = null, bs = Infinity;
    for (let f = 0; f < 5; f++) {
      const o = Buffer.alloc(w + 1); o[0] = f; let s = 0;
      for (let i = 0; i < w; i++) {
        const a = i ? line[i - 1] : 0, b = prev[i], c = i ? prev[i - 1] : 0; let pr = 0;
        if (f === 1) pr = a; else if (f === 2) pr = b; else if (f === 3) pr = (a + b) >> 1; else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        const v = (line[i] - pr) & 255; o[i + 1] = v; s += v < 128 ? v : 256 - v;
      }
      if (s < bs) { bs = s; best = o; }
    }
    rows.push(best); prev = line;
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 3;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', Buffer.from(pal.flat())), chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** The screenshot, as small as it can be under `budget` bytes: lossless re-pack first, then palettes of 256, 192, 128, 96, 64. */
export function shrink(png, budget = 120_000) {
  const img = decode(png);
  const tries = [256, 192, 128, 96, 64, 48, 32];
  let best = png;
  for (const n of tries) { const out = encodeIndexed(img, n); if (out.length < best.length) best = out; if (out.length <= budget) return { png: out, colours: n, bytes: out.length }; }
  return { png: best, colours: tries.at(-1), bytes: best.length };
}
