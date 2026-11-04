// Small previews of container files: images are decoded by the shared PNG, GIF and
// JPEG decoder and shrunk to fit a square; PDFs and other
// formats use a converter the machine has (pdftoppm from Poppler, or sips on
// macOS), when there is one. Thumbnails are PNG.
//
// JPEGs are read at an eighth of their size straight from each 8x8 block's
// average (its DC coefficient), skipping the rest of the picture data: a
// 12-megapixel photo becomes 500x375 pixels without a full decode, which is
// plenty for a thumbnail.

import { deflateSync } from 'node:zlib';

import { decodeImage, type Picture } from '../../calc/src/image-decode.ts';
export { decodeImage, decodePng, decodeGif, decodeJpeg, orient } from '../../calc/src/image-decode.ts';
export type { Picture } from '../../calc/src/image-decode.ts';

/** A PNG, GIF or JPEG's width and height, from its header, without decoding it. */
export function imageSize(d: Uint8Array): { width: number; height: number } | undefined {
  if (d[0] === 0x89 && d[1] === 0x50 && d.length >= 24) return { width: ((d[16] << 24) | (d[17] << 16) | (d[18] << 8) | d[19]) >>> 0, height: ((d[20] << 24) | (d[21] << 16) | (d[22] << 8) | d[23]) >>> 0 };
  if (d[0] === 0x47 && d[1] === 0x49 && d.length >= 10) return { width: d[6] | (d[7] << 8), height: d[8] | (d[9] << 8) };
  if (d[0] !== 0xff || d[1] !== 0xd8) return undefined;
  for (let pos = 2; pos + 9 < d.length;) {
    if (d[pos] !== 0xff) return undefined;
    const marker = d[pos + 1];
    if (marker === 0xff) { pos++; continue; }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: (d[pos + 7] << 8) | d[pos + 8], height: (d[pos + 5] << 8) | d[pos + 6] };
    }
    pos += 2 + ((d[pos + 2] << 8) | d[pos + 3]);
  }
  return undefined;
}

/** A PNG thumbnail fitting `size` x `size`, or undefined when the format can't be read here. */
export function thumbnailOf(data: Uint8Array, size: number): Uint8Array | undefined {
  const pic = decodeImage(data);
  return pic && encodePng(fit(pic, size));
}

// --- resizing ----------------------------------------------------------------

/** Shrinks a picture to fit `size` x `size` (never enlarging it), averaging the pixels each new one covers. */
export function fit(pic: Picture, size: number): Picture {
  const scale = Math.min(1, size / pic.width, size / pic.height);
  const w = Math.max(1, Math.round(pic.width * scale));
  const h = Math.max(1, Math.round(pic.height * scale));
  if (w === pic.width && h === pic.height) return pic;
  const out = new Uint8Array(w * h * 4);
  const sx = pic.width / w;
  const sy = pic.height / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let r = 0, g = 0, b = 0, a = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * pic.width + xx) * 4;
          const alpha = pic.rgba[i + 3];
          r += pic.rgba[i] * alpha;
          g += pic.rgba[i + 1] * alpha;
          b += pic.rgba[i + 2] * alpha;
          a += alpha;
        }
      }
      const o = (y * w + x) * 4;
      const n = (y1 - y0) * (x1 - x0);
      if (a) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
      }
      out[o + 3] = Math.round(a / n);
    }
  }
  return { width: w, height: h, rgba: out };
}

// --- PNG -------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(parts: Uint8Array[]): number {
  let c = 0xffffffff;
  for (const p of parts) for (let i = 0; i < p.length; i++) c = CRC_TABLE[(c ^ p[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** RGBA as PNG; fully opaque pictures are saved without the alpha channel. */
export function encodePng(pic: Picture): Uint8Array {
  const { width: w, height: h, rgba } = pic;
  let opaque = true;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) { opaque = false; break; }
  const bpp = opaque ? 3 : 4;
  const stride = w * bpp;
  const raw = Buffer.alloc((stride + 1) * h);
  const row = new Uint8Array(stride);
  const prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < bpp; c++) row[x * bpp + c] = rgba[(y * w + x) * 4 + c];
    }
    // Paeth filter on every row: good for photos, fine for the rest.
    const o = y * (stride + 1);
    raw[o] = 4;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      raw[o + 1 + i] = (row[i] - paeth(a, b, c)) & 0xff;
    }
    prev.set(row);
  }
  const chunk = (type: string, body: Uint8Array) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32([head.subarray(4), body]), 0);
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = opaque ? 2 : 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array(0)),
  ]);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

