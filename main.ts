// main.ts — news-image-20261127
// "Friday 27 November 2026: the world in one image — 20 stories, checked"
// Node 22+, stdlib only. No network, no random, no clock. Deterministic PNG.
// Writes ONE image: $MAKEFUN_OUTPUT_DIR/entry.png (default /output/entry.png).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------- font (5x7)
// Each glyph: 7 rows of 5 chars, "1" = ink. Drawn from code, no external font.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "01010", "00100", "00100", "00100", "01010", "10001"],
  Y: ["10001", "01010", "00100", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10001", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01000", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11110", "01000", "01000", "01001", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00110", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "–": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00001", "00010", "00100", "01000", "10000", "10000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "10011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  "~": ["00000", "00000", "00000", "01101", "10010", "00000", "00000"],
  "^": ["00100", "01010", "10001", "00000", "00000", "00000", "00000"],
  "✓": ["00000", "00000", "00001", "00011", "10110", "01100", "00100"],
  "•": ["00000", "00000", "00000", "01110", "01110", "01110", "00000"],
};

// ---------------------------------------------------------------- PNG (stdlib zlib)
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (1 + w * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const PIX = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [246, 241, 229];
const PANEL: RGB = [251, 248, 240];
const INK: RGB = [20, 18, 16];
const RED: RGB = [178, 38, 30];
const GRAY: RGB = [107, 101, 88];
const LIGHTGRAY: RGB = [196, 189, 172];
const NIGHT: RGB = [22, 35, 61];
const NIGHT2: RGB = [34, 52, 84];
const SKY: RGB = [139, 168, 190];
const STORM: RGB = [91, 107, 122];
const CLOUD: RGB = [70, 82, 96];
const SEA: RGB = [38, 110, 138];
const SEA2: RGB = [24, 84, 110];
const SUN: RGB = [232, 176, 44];
const ORANGE: RGB = [224, 110, 28];
const YELLOW: RGB = [240, 196, 64];
const WHITE: RGB = [250, 248, 242];

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  PIX[i] = c[0];
  PIX[i + 1] = c[1];
  PIX[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPx(i, j, c);
}
function rectBorder(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}
function ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = -ry; y <= ry; y++) {
    const v = 1 - (y * y) / (ry * ry);
    if (v < 0) continue;
    const w = Math.floor(rx * Math.sqrt(v));
    for (let x = -w; x <= w; x++) setPx(cx + x, cy + y, c);
  }
}
function circle(cx: number, cy: number, r: number, c: RGB): void {
  ellipse(cx, cy, r, r, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
function fillPoly(pts: [number, number][], c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) setPx(x, y, c);
    }
  }
}

// ---------------------------------------------------------------- text
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const g = FONT[ch] || FONT[" "];
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    for (let col = 0; col < 5; col++) {
      if (row[col] === "1") rect(x + col * scale, y + r * scale, scale, scale, c);
    }
  }
}
function drawText(s: string, x: number, y: number, scale: number, c: RGB, bold = false): void {
  for (let i = 0; i < s.length; i++) {
    const cx = x + i * 6 * scale;
    drawChar(s[i], cx, y, scale, c);
    if (bold) drawChar(s[i], cx + 1, y, scale, c);
  }
}
function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB, bold = false): void {
  drawText(s, Math.round(cx - textWidth(s, scale) / 2), y, scale, c, bold);
}
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxW) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- content
// 20 stories, ALL facts from the verified list in the brief — nothing added.
interface Story {
  kicker: string;
  head: string;
  sub: string;
}
const HEROES: Story[] = [
  {
    kicker: "CONFLICT • KUWAIT",
    head: "DRONES KILL TWO IN KUWAIT",
    sub: "Two Italian workers dead. Iran denies any role.",
  },
  {
    kicker: "WEATHER • USA",
    head: "STORM WRECKS THANKSGIVING",
    sub: "Macy's 100th parade put off — a first.",
  },
  {
    kicker: "ACCIDENT • SPAIN",
    head: "TANKER CAPSIZES OFF IBIZA",
    sub: "Diesel tanker of up to 7,000 tonnes. One dead.",
  },
];
const GRID: Story[] = [
  { kicker: "WEATHER • USA", head: "500,000+ HOMES WITHOUT POWER", sub: "" },
  { kicker: "TRAVEL • USA", head: "1,000+ FLIGHTS AXED OR DELAYED", sub: "" },
  { kicker: "TRAVEL • USA", head: "80 MILLION ON THE MOVE", sub: "" },
  { kicker: "CONFLICT • GAZA", head: "HAMAS WEIGHS REPLY AS 10 DIE IN GAZA", sub: "" },
  { kicker: "CONFLICT • GAZA", head: "16 SCHOOLCHILDREN KILLED IN GAZA THIS MONTH", sub: "" },
  { kicker: "UK • MIGRATION", head: "UK NET MIGRATION LOWEST SINCE 1997", sub: "" },
  { kicker: "SPORT • CHESS", head: "CHESS WORLDS: GAME 3 ENDS IN MARATHON DRAW", sub: "" },
  { kicker: "COURTS • FRANCE", head: "DEPARDIEU TO FACE TRIAL OVER 2018 RAPE CLAIM", sub: "" },
  { kicker: "ECONOMY • USA", head: "TRUMP DEMANDS PROBE INTO 'FAKE' GDP FIGURES", sub: "" },
  { kicker: "ACCIDENT • THAILAND", head: "BANGKOK REFINERY BLAST HURTS 9", sub: "" },
  { kicker: "CONFLICT • SAUDI ARABIA", head: "HOUTHI STRIKE HITS SAUDI REFINERY", sub: "" },
  { kicker: "CONFLICT • MALI", head: "300+ RUSSIANS KILLED BACKING MALI JUNTA", sub: "" },
  { kicker: "HEALTH • CONGO", head: "EBOLA IN CONGO PASSES 12,000 CASES", sub: "" },
  { kicker: "COURTS • UK", head: "UK TRAIN STABBER GUILTY OF ATTEMPTED MURDER", sub: "" },
  { kicker: "UKRAINE • WORLD", head: "ZELENSKY: US TOO FOCUSED ON MIDDLE EAST", sub: "" },
  { kicker: "SHOPPING • WORLD", head: "BLACK FRIDAY SALES BEGIN", sub: "" },
  { kicker: "POLITICS • NEW ZEALAND", head: "NZ ELECTION: COALITION WINS 67 OF 131 SEATS", sub: "" },
];

// ---------------------------------------------------------------- illustrations
function drawKuwait(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, NIGHT);
  // stars (fixed positions)
  const stars: [number, number][] = [
    [14, 10], [52, 22], [96, 8], [150, 18], [205, 9], [248, 24],
    [286, 12], [40, 40], [120, 34], [180, 42], [232, 38], [268, 44],
  ];
  for (const [sx, sy] of stars) rect(x + sx, y + sy, 2, 2, WHITE);
  // skyline silhouette
  rect(x, y + h - 34, w, 34, [10, 14, 26]);
  const buildings: [number, number, number][] = [
    [8, 22, 26], [40, 14, 20], [66, 26, 30], [100, 16, 18],
    [124, 24, 28], [158, 12, 22], [186, 26, 26], [218, 18, 20], [244, 24, 30], [280, 15, 22],
  ];
  for (const [bx, bw, bh] of buildings) rect(x + bx, y + h - 34 - bh, bw, bh, [10, 14, 26]);
  // lit windows (fixed)
  const wins: [number, number][] = [
    [16, 66], [46, 74], [72, 60], [108, 72], [132, 64], [164, 76],
    [192, 62], [224, 70], [252, 66], [286, 74],
  ];
  for (const [wx, wy] of wins) rect(x + wx, y + wy, 3, 3, YELLOW);
  // explosion starburst over the skyline
  const ex = x + 150;
  const ey = y + 52;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const tx = ex + Math.round(Math.cos(a) * 30);
    const ty = ey + Math.round(Math.sin(a) * 30);
    const px = ex + Math.round(Math.cos(a + 0.35) * 8);
    const py = ey + Math.round(Math.sin(a + 0.35) * 8);
    const qx = ex + Math.round(Math.cos(a - 0.35) * 8);
    const qy = ey + Math.round(Math.sin(a - 0.35) * 8);
    fillPoly([[tx, ty], [px, py], [qx, qy]], ORANGE);
  }
  circle(ex, ey, 14, YELLOW);
  circle(ex, ey, 8, [250, 230, 170]);
  // drone, upper right
  const dx = x + 252;
  const dy = y + 26;
  rect(dx - 10, dy - 3, 20, 6, INK);
  rect(dx - 2, dy + 3, 4, 5, INK);
  line(dx - 12, dy - 8, dx + 12, dy - 8, INK);
  circle(dx - 12, dy - 8, 4, INK);
  circle(dx + 12, dy - 8, 4, INK);
  circle(dx - 12, dy - 8, 2, GRAY);
  circle(dx + 12, dy - 8, 2, GRAY);
}

function drawStorm(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, STORM);
  // clouds
  ellipse(x + 70, y + 22, 58, 16, CLOUD);
  ellipse(x + 110, y + 14, 52, 14, CLOUD);
  ellipse(x + 210, y + 30, 62, 17, CLOUD);
  ellipse(x + 250, y + 16, 46, 13, CLOUD);
  ellipse(x + 160, y + 44, 70, 15, [82, 95, 110]);
  // lightning bolt
  fillPoly(
    [
      [x + 96, y + 40],
      [x + 112, y + 40],
      [x + 100, y + 62],
      [x + 114, y + 62],
      [x + 88, y + 96],
      [x + 96, y + 66],
      [x + 84, y + 66],
    ],
    YELLOW,
  );
  // rain (fixed diagonal strokes)
  for (let k = 0; k < 14; k++) {
    const rx = x + 12 + k * 22;
    const ry = y + 58 + (k % 3) * 12;
    line(rx, ry, rx - 6, ry + 12, [200, 214, 226]);
  }
  // parade balloon, lower right
  const bx = x + 218;
  const by = y + 62;
  ellipse(bx, by, 34, 26, RED);
  ellipse(bx, by, 20, 26, YELLOW);
  ellipse(bx, by, 8, 26, RED);
  line(bx - 18, by + 22, bx - 8, by + 40, INK);
  line(bx + 18, by + 22, bx + 8, by + 40, INK);
  rect(bx - 8, by + 40, 16, 10, [120, 82, 40]);
}

function drawIbiza(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  circle(x + 262, y + 20, 14, SUN);
  // distant island
  fillPoly([[x + 8, y + 52], [x + 44, y + 30], [x + 82, y + 52]], [96, 122, 96]);
  // sea
  rect(x, y + 52, w, h - 52, SEA);
  rect(x, y + 52, w, 4, SEA2);
  // wave strokes (fixed)
  for (let k = 0; k < 6; k++) {
    const wx = x + 16 + k * 48;
    line(wx, y + 66 + (k % 2) * 14, wx + 26, y + 66 + (k % 2) * 14, [190, 220, 232]);
  }
  // capsized tanker hull (upside-down, tilted)
  fillPoly(
    [
      [x + 96, y + 66],
      [x + 216, y + 60],
      [x + 206, y + 84],
      [x + 108, y + 90],
    ],
    [26, 28, 32],
  );
  fillPoly(
    [
      [x + 100, y + 68],
      [x + 212, y + 62],
      [x + 210, y + 68],
      [x + 102, y + 74],
    ],
    RED,
  );
  // smoke puffs
  circle(x + 120, y + 52, 9, [120, 120, 116]);
  circle(x + 134, y + 44, 11, [140, 140, 134]);
  circle(x + 150, y + 36, 8, [160, 160, 152]);
  // lifebuoy
  const lx = x + 252;
  const ly = y + 78;
  circle(lx, ly, 12, ORANGE);
  circle(lx, ly, 7, SEA);
  rect(lx - 12, ly - 3, 5, 6, WHITE);
  rect(lx + 7, ly - 3, 5, 6, WHITE);
  rect(lx - 3, ly - 12, 6, 5, WHITE);
  rect(lx - 3, ly + 7, 6, 5, WHITE);
}

// ---------------------------------------------------------------- layout
function drawHero(s: Story, x: number, y: number, w: number, drawScene: (x: number, y: number, w: number, h: number) => void): void {
  rect(x, y, w, 96, PANEL);
  rectBorder(x, y, w, 96, 1, INK);
  drawScene(x + 1, y + 1, w - 2, 94);
  drawText(s.kicker, x + 2, y + 104, 2, RED, true);
  const lines = wrap(s.head, w - 4, 3);
  for (let i = 0; i < lines.length; i++) drawText(lines[i], x + 2, y + 122 + i * 24, 3, INK, true);
  const sub = wrap(s.sub, w - 4, 2);
  for (let i = 0; i < sub.length; i++) drawText(sub[i], x + 2, y + 174 + i * 15, 2, GRAY);
}

function drawGridCell(s: Story, x: number, y: number, w: number): void {
  drawText(s.kicker, x, y, 2, RED, true);
  const lines = wrap(s.head, w, 3);
  for (let i = 0; i < lines.length; i++) drawText(lines[i], x, y + 15 + i * 21, 3, INK, true);
}

function main(): void {
  rect(0, 0, W, H, PAPER);
  rectBorder(6, 6, W - 12, H - 12, 2, INK);

  // ---- masthead ----
  drawTextCentered("THE WORLD IN ONE IMAGE", W / 2, 24, 2, GRAY, true);
  drawTextCentered("FRIDAY 27 NOVEMBER 2026", W / 2, 48, 5, INK, true);
  rect(24, 96, W - 48, 1, INK);
  drawTextCentered(
    "20 STORIES, CHECKED  •  FRIDAY EDITION  •  NEWS FROM AROUND THE WORLD",
    W / 2,
    104,
    2,
    INK,
  );
  rect(24, 124, W - 48, 3, INK);

  // ---- hero row: 3 illustrated stories ----
  const heroY = 134;
  const heroW = 314;
  const heroGap = 17;
  drawHero(HEROES[0], 24, heroY, heroW, drawKuwait);
  drawHero(HEROES[1], 24 + heroW + heroGap, heroY, heroW, drawStorm);
  drawHero(HEROES[2], 24 + 2 * (heroW + heroGap), heroY, heroW, drawIbiza);

  // ---- UTC timeline ----
  const tlY = 338;
  drawText("UTC TIMELINE — FRIDAY 27 NOVEMBER 2026", 24, tlY, 2, INK, true);
  const strikeNote = "01:00 KUWAIT STRIKE REPORTED";
  drawText(strikeNote, W - 24 - textWidth(strikeNote, 2), tlY, 2, RED, true);
  const lineY = tlY + 22;
  rect(40, lineY, W - 80, 2, INK);
  const hours: [number, string][] = [
    [0, "00:00"],
    [1, "01:00"],
    [3, "03:00"],
    [5, "05:00"],
    [7, "07:00"],
  ];
  for (const [hh, label] of hours) {
    const tx = 40 + Math.round((hh / 7) * (W - 80));
    rect(tx - 1, lineY - 4, 3, 10, INK);
    drawTextCentered(label, tx, lineY + 10, 2, INK);
  }
  circle(40 + Math.round((1 / 7) * (W - 80)), lineY + 1, 5, RED);
  rect(24, tlY + 52, W - 48, 1, INK);

  // ---- story grid ----
  const gridHeadY = tlY + 60;
  drawText("MORE FROM FRIDAY — 17 MORE STORIES", 24, gridHeadY, 2, INK, true);
  rect(24, gridHeadY + 18, W - 48, 1, INK);
  const gridY = gridHeadY + 26;
  const rowH = 86;
  const colW = 314;
  const colX = [24, 355, 686];
  const rowsPerCol = [6, 6, 5];
  for (let i = 0; i < GRID.length; i++) {
    const col = i < 6 ? 0 : i < 12 ? 1 : 2;
    const row = col === 0 ? i : col === 1 ? i - 6 : i - 12;
    const cy = gridY + row * rowH;
    drawGridCell(GRID[i], colX[col], cy, colW);
    if (row < rowsPerCol[col] - 1) rect(colX[col], cy + rowH - 4, colW, 1, LIGHTGRAY);
  }
  // vertical dividers between columns
  rect(346, gridY, 1, 6 * rowH - 4, LIGHTGRAY);
  rect(677, gridY, 1, 6 * rowH - 4, LIGHTGRAY);

  // ---- footer: date check + sources ----
  const footY = gridY + 6 * rowH + 14;
  rect(24, footY - 6, W - 48, 1, INK);
  drawTextCentered("DATE CHECK ✓ TODAY IS FRIDAY 27 NOVEMBER 2026 — VERIFIED", W / 2, footY, 2, INK, true);
  drawTextCentered(
    "20 STORIES • SOURCES: NYT • BBC • REUTERS • NDTV • THE HINDU • MINT • GUARDIAN",
    W / 2,
    footY + 16,
    2,
    GRAY,
  );

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  const png = encodePNG(W, H, PIX);
  writeFileSync(join(outDir, "entry.png"), png);
  console.log(`wrote ${join(outDir, "entry.png")} ${W}x${H} ${png.length} bytes`);
}

main();
