// Draws the app icon (a hand-drawn red ✕ on a dark tile) as PNGs, with no image tools needed.
// Run once after changing the design: node scripts/make-icons.mjs

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [11, 18, 14];
const INK = [255, 81, 72];

function crc32(buf) {
  let c, crc = ~0;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) raw.set(pixel(x + 0.5, y + 0.5), y * (size * 4 + 1) + 1 + x * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const segDist = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/** inset: how far the ✕ sits from the edge (bigger for maskable icons); rounded: corner radius share. */
function icon(size, { inset = 0.24, rounded = 0.22 } = {}) {
  const s = size, r = rounded * s, w = 0.11 * s;
  const a = inset * s, b = s - inset * s;
  const strokes = [
    [[a, a + 0.02 * s], [b, b - 0.01 * s]],
    [[b - 0.01 * s, a], [a + 0.01 * s, b]],
  ];
  return png(size, (x, y) => {
    // Rounded square mask (anti-aliased)
    const qx = Math.max(Math.abs(x - s / 2) - (s / 2 - r), 0);
    const qy = Math.max(Math.abs(y - s / 2) - (s / 2 - r), 0);
    const edge = rounded ? Math.min(1, Math.max(0, r - Math.hypot(qx, qy) + 0.5)) : 1;
    const d = Math.min(...strokes.map(([p, q]) => segDist(x, y, p, q)));
    const ink = Math.min(1, Math.max(0, w / 2 - d + 0.5));
    const c = BG.map((v, i) => Math.round(v + (INK[i] - v) * ink));
    return [...c, Math.round(edge * 255)];
  });
}

const out = new URL("../public/", import.meta.url);
writeFileSync(new URL("icon-192.png", out), icon(192));
writeFileSync(new URL("icon-512.png", out), icon(512));
writeFileSync(new URL("icon-maskable-512.png", out), icon(512, { inset: 0.32, rounded: 0 }));
writeFileSync(new URL("apple-touch-icon.png", out), icon(180, { rounded: 0 })); // iOS rounds it itself
writeFileSync(new URL("../src/app/icon.png", import.meta.url), icon(64));
console.log("icons written");
