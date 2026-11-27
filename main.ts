// news-image-20261127 v2 — "Friday 27 November 2026: 38 stories, 8 regions, a map, a UTC timeline and a date check"
// One-image summary of Friday 27 November 2026 world news. Drawn purely from code.
// Node 22+ stdlib only. No network, no clock, no randomness. Deterministic:
// two runs produce byte-identical PNG output.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import * as crypto from "node:crypto";

const W = 1024;
const H = 1024;

// ---------- PNG encoding (zlib from stdlib) ----------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
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
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 0);
  crc.copy(out, 8 + data.length);
  return out;
}

function pngEncode(w: number, h: number, rgb: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- 5x7 bitmap font (rows are 5-char strings, '1' = pixel) ----------
const FONT: Record<string, string[]> = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  ",": ["00000", "00000", "00000", "00000", "00100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
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
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "\\": ["10000", "01000", "01000", "00100", "00010", "00010", "00001"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  "^": ["00100", "01010", "10001", "00000", "00000", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "`": ["00100", "00100", "00010", "00000", "00000", "00000", "00000"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "00010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["00100", "00100", "11110", "00100", "00100", "00100", "00011"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "{": ["00010", "00100", "00100", "01100", "00100", "00100", "00010"],
  "|": ["00100", "00100", "00100", "00100", "00100", "00100", "00100"],
  "}": ["01000", "00100", "00100", "00110", "00100", "00100", "01000"],
  "~": ["00000", "00000", "01001", "10110", "00000", "00000", "00000"],
  "•": ["00000", "00000", "00100", "01110", "00100", "00000", "00000"],
  "–": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

// ---------- Canvas ----------
type RGB = [number, number, number];
const PAPER: RGB = [251, 247, 238];
const INK: RGB = [17, 24, 39];
const NAVY: RGB = [20, 38, 63];
const NAVY2: RGB = [30, 58, 95];
const RED: RGB = [185, 28, 28];
const RED_D: RGB = [153, 27, 27];
const TEAL: RGB = [15, 118, 110];
const GOLD: RGB = [180, 83, 9];
const GREY: RGB = [100, 116, 139];
const WHITE: RGB = [255, 255, 255];
const CARD: RGB = [255, 255, 255];
const BORDER: RGB = [203, 213, 225];
const OCEAN: RGB = [219, 233, 245];
const LAND: RGB = [216, 200, 160];
const LAND_LINE: RGB = [150, 128, 84];
const TAG_CONFIRMED: RGB = [22, 101, 52];
const TAG_REPORTED: RGB = [30, 64, 175];
const TAG_OFFICIAL: RGB = [146, 64, 14];
const TAG_CLAIM: RGB = [153, 27, 27];
const TAG_FORECAST: RGB = [91, 33, 182];

class Canvas {
  buf: Buffer;
  w: number;
  h: number;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.buf = Buffer.alloc(w * h * 3);
    this.fill(bg);
  }
  fill(c: RGB): void {
    for (let i = 0; i < this.buf.length; i += 3) {
      this.buf[i] = c[0];
      this.buf[i + 1] = c[1];
      this.buf[i + 2] = c[2];
    }
  }
  px(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
  }
  box(x: number, y: number, w: number, h: number, c: RGB): void {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.px(x, y, c);
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
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      for (let xx = cx - dx; xx <= cx + dx; xx++) this.px(xx, cy + dy, c);
    }
  }
  ring(cx: number, cy: number, r: number, c: RGB): void {
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      this.px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
  poly(pts: Array<[number, number]>, c: RGB): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = Math.ceil(minY); y <= maxY; y++) {
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
        const xa = Math.ceil(xs[k]);
        const xb = Math.floor(xs[k + 1]);
        for (let x = xa; x <= xb; x++) this.px(x, y, c);
      }
    }
  }
  measure(s: string, scale: number, spacing: number = scale): number {
    if (s.length === 0) return 0;
    return s.length * (5 * scale + spacing) - spacing;
  }
  text(x: number, y: number, s: string, scale: number, c: RGB, spacing: number = scale): void {
    let cx = x;
    for (const ch of s) {
      const g = FONT[ch] ?? FONT["?"];
      for (let r = 0; r < 7; r++) {
        const row = g[r];
        for (let col = 0; col < 5; col++) {
          if (row[col] === "1") {
            this.rect(cx + col * scale, y + r * scale, scale, scale, c);
          }
        }
      }
      cx += 5 * scale + spacing;
    }
  }
  textC(cx: number, y: number, s: string, scale: number, c: RGB, spacing: number = scale): void {
    this.text(cx - Math.floor(this.measure(s, scale, spacing) / 2), y, s, scale, c, spacing);
  }
  wrap(s: string, maxW: number, scale: number, spacing: number = scale): string[] {
    const words = s.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur === "" ? w : cur + " " + w;
      if (this.measure(test, scale, spacing) <= maxW || cur === "") {
        cur = test;
      } else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur !== "") lines.push(cur);
    return lines;
  }
}

// ---------- Data: 38 verified stories, Friday 27 November 2026 ----------
type Story = {
  n: number;
  place: string;
  region: string;
  field: string;
  head: string;
  body: string;
  src: string;
  tag: "CONFIRMED" | "REPORTED" | "OFFICIAL" | "CLAIM" | "FORECAST";
  pin: [number, number];
};

const HEROES: Story[] = [
  {
    n: 1,
    place: "KUWAIT",
    region: "Middle East",
    field: "WAR",
    head: "Drone strike kills two Italians in Kuwait",
    body: "Iranian drone hits a defence site; two Italian technicians dead; Iran denies any role.",
    src: "NYT / BBC / NDTV",
    tag: "CONFIRMED",
    pin: [857, 702],
  },
  {
    n: 2,
    place: "USA",
    region: "N America",
    field: "ECONOMY",
    head: "Black Friday opens: $12.9bn day ahead",
    body: "Adobe forecasts record $12.9bn US online spending; 126m Americans to shop; NRF sees holiday sales past $1tn (+4.2%).",
    src: "Adobe / NRF",
    tag: "FORECAST",
    pin: [667, 709],
  },
  {
    n: 3,
    place: "GAZA",
    region: "Middle East",
    field: "WAR",
    head: "Hamas weighs reply after 10 die in Gaza",
    body: "Israel kills 10 in Gaza; Hamas weighs its response; 16 schoolchildren killed in Gaza this month.",
    src: "Reuters / Guardian",
    tag: "REPORTED",
    pin: [825, 707],
  },
];

const CARDS: Story[] = [
  {
    n: 4, place: "GENEVA", region: "Europe", field: "CHESS",
    head: "Gukesh-Sindarov Game 3 ends drawn",
    body: "Game 3 drawn 1.5-1.5; Game 4 today.",
    src: "India Today / The Hindu", tag: "REPORTED", pin: [796, 700],
  },
  {
    n: 5, place: "LONDON", region: "Europe", field: "MIGRATION",
    head: "UK net migration lowest since 1997",
    body: "Down to 77,000; Indians still largest.",
    src: "NYT / ONS", tag: "OFFICIAL", pin: [780, 686],
  },
  {
    n: 6, place: "PARIS", region: "Europe", field: "COURTS",
    head: "Depardieu to stand trial for rape",
    body: "Court orders trial over alleged 2018 rape.",
    src: "BBC", tag: "OFFICIAL", pin: [803, 686],
  },
  {
    n: 7, place: "IBIZA", region: "Europe", field: "ENVIRONMENT",
    head: "Tanker capsizes off Ibiza, one dead",
    body: "Tanker with up to 7,000t diesel capsizes.",
    src: "BBC", tag: "REPORTED", pin: [784, 710],
  },
  {
    n: 8, place: "WASHINGTON", region: "N America", field: "POLITICS",
    head: "Trump seeks probe into 'fake' GDP",
    body: "Growth revised up to 4.3%.",
    src: "Mint", tag: "CLAIM", pin: [695, 702],
  },
  {
    n: 9, place: "WELLINGTON", region: "Oceania", field: "POLITICS",
    head: "NZ final count lands today",
    body: "400,000 special votes decide 67 seats.",
    src: "Official", tag: "OFFICIAL", pin: [1008, 752],
  },
  {
    n: 10, place: "BERLIN", region: "Europe", field: "LABOUR",
    head: "Amazon workers strike in 20 countries",
    body: "Walkouts hit warehouses this weekend.",
    src: "Reports", tag: "REPORTED", pin: [819, 694],
  },
  {
    n: 11, place: "NEW DELHI", region: "S Asia", field: "COURTS",
    head: "Court: PMLA bench needs a judge",
    body: "A judicial member must sit to confirm it.",
    src: "TOI", tag: "OFFICIAL", pin: [885, 709],
  },
  {
    n: 12, place: "JAZAN", region: "Middle East", field: "WAR",
    head: "Houthi strike hits Jazan refinery; one worker killed",
    body: "Worker killed; drone near Jeddah stopped.",
    src: "Saudi Gazette / Reuters", tag: "REPORTED", pin: [844, 726],
  },
  {
    n: 13, place: "BANGKOK", region: "E Asia", field: "DISASTER",
    head: "Blast at Bangkok refinery injures nine",
    body: "Nine hurt; all units shut.",
    src: "BBC", tag: "REPORTED", pin: [914, 720],
  },
  {
    n: 14, place: "CHRISTCHURCH", region: "Oceania", field: "SPORT",
    head: "NZ 77-1 at lunch in 2nd Test",
    body: "India field first; Brar debuts.",
    src: "Reuters / TOI", tag: "REPORTED", pin: [997, 768],
  },
  {
    n: 15, place: "WASHINGTON", region: "N America", field: "DIPLOMACY",
    head: "Trump: Putin can come to G20",
    body: "December G20 in Florida, if he wants.",
    src: "Reuters", tag: "REPORTED", pin: [712, 716],
  },
  {
    n: 16, place: "KYIV", region: "Europe", field: "WAR",
    head: "Zelensky: US too focused on Middle East",
    body: "US not pressing Russia enough, he says.",
    src: "BBC", tag: "REPORTED", pin: [836, 689],
  },
  {
    n: 17, place: "DETROIT", region: "N America", field: "SPORT",
    head: "Bears beat Lions 39-35",
    body: "Bears take NFC North lead at 00:07 UTC.",
    src: "Reuters", tag: "REPORTED", pin: [680, 693],
  },
];

// Also-on list (18-38): one line each. Region + field counted for the totals.
const ALSO_ON: Array<{ n: number; region: string; field: string; line: string }> = [
  { n: 18, region: "N America", field: "DISASTER", line: "USA — Thanksgiving storm: 900,000+ without power. (TOI/Reuters)" },
  { n: 19, region: "Africa", field: "WAR", line: "MALI — 300+ Russians killed as Moscow backs junta. (Guardian)" },
  { n: 20, region: "Africa", field: "HEALTH", line: "CONGO — Ebola passes 12,000 cases; responders forced out. (Guardian)" },
  { n: 21, region: "Europe", field: "COURTS", line: "LONDON — Train stabber guilty of trying to murder 14. (UK courts)" },
  { n: 22, region: "Europe", field: "COURTS", line: "THE HAGUE — Duterte ICC trial starts Monday. (Reuters)" },
  { n: 23, region: "E Asia", field: "MARKETS", line: "TOKYO — Japan Tobacco +2% on Imperial Brands talk. (Reuters)" },
  { n: 24, region: "Global", field: "MARKETS", line: "MARKETS — Dollar near 22-month peak at 103.81. (Reuters)" },
  { n: 25, region: "Europe", field: "ECONOMY", line: "LONDON — UK car output +4.8% in Oct; 64,141 vehicles. (SMMT/Reuters)" },
  { n: 26, region: "S Asia", field: "POLITICS", line: "NEW DELHI — Cabinet clears Rs 11,000-crore scheme. (TOI)" },
  { n: 27, region: "S Asia", field: "HEALTH", line: "NEW DELHI — Court orders food warning labels. (TOI)" },
  { n: 28, region: "S Asia", field: "COURTS", line: "PATNA — Court quashes ex-MP Anand Mohan's release. (TOI)" },
  { n: 29, region: "S Asia", field: "ECONOMY", line: "MUMBAI — RBI brings 60 more tonnes of gold home. (TOI)" },
  { n: 30, region: "S Asia", field: "POLITICS", line: "NEW DELHI — Special Parliament sitting from Nov 30. (TOI)" },
  { n: 31, region: "Europe", field: "DEFENCE", line: "BERLIN — Germany offers India tech for $9bn sub deal. (TOI)" },
  { n: 32, region: "S Asia", field: "COURTS", line: "MUMBAI — Lookout circulars over CJP's Dipke, Ranka, Das. (TOI)" },
  { n: 33, region: "S Asia", field: "DIPLOMACY", line: "COLOMBO — Security conclave backs regional peace. (TOI)" },
  { n: 34, region: "S Asia", field: "POLITICS", line: "NEW DELHI — Amit Shah: India leads war on terror. (TOI)" },
  { n: 35, region: "S Asia", field: "DISASTER", line: "HYDERABAD — Cessna crash injures two. (Deccan Chronicle)" },
  { n: 36, region: "Europe", field: "CULTURE", line: "LONDON — Taj Mahal marble slab up for auction. (TOI)" },
  { n: 37, region: "N America", field: "TECH", line: "NEW YORK — Trump: market likes Huang back at Nvidia. (Reuters)" },
  { n: 38, region: "S Asia", field: "MEDIA", line: "NEW DELHI — No Pakistan content on Indian screens. (TOI)" },
];

const KPI: Array<{ num: string; label: string }> = [
  { num: "2", label: "ITALIANS KILLED IN KUWAIT" },
  { num: "$12.9bn", label: "BLACK FRIDAY ONLINE SALES" },
  { num: "126m", label: "AMERICANS TO SHOP TODAY" },
  { num: "10", label: "KILLED IN GAZA" },
  { num: "7,000t", label: "DIESEL ON CAPSIZED TANKER" },
  { num: "900,000+", label: "WITHOUT POWER AFTER STORM" },
];

const TIMELINE: string[] = [
  "00:07 Bears beat Lions 39-35",
  "01:00 NZ final count lands (2pm NZDT)",
  "01:03 Kuwait strike first reported (NYT)",
  "11:00 US stores open for Black Friday (06:00 ET)",
  "14:00 Gukesh-Sindarov Game 4, Geneva (15:00 CET)",
];

const LEFT_OUT: string[] = [
  "Macy's 100th parade postponement — announced 25 Nov",
  "Houthi claim: attack on Saudi Ras Tanura refinery — 25 Nov",
  "26/11 Mumbai attacks anniversary tributes — 26 Nov",
  "FCC clears 1m SpaceX satellites — first reported 26 Nov",
  "Sri Lanka A beat India A, Asia Cup semi — 26 Nov",
  "Sinner's Australian Open absence — reported 26 Nov",
];

const SOURCES_13 =
  "NYT • BBC • NDTV • Reuters • Guardian • India Today • The Hindu • ONS • Mint • TOI • Saudi Gazette • SMMT • Deccan Chronicle";

const REGION_ORDER = ["N America", "Europe", "Middle East", "Africa", "S Asia", "E Asia", "Oceania", "Global"];
const REGION_SHORT: Record<string, string> = {
  "N America": "N AMERICA",
  Europe: "EUROPE",
  "Middle East": "MIDDLE EAST",
  Africa: "AFRICA",
  "S Asia": "S ASIA",
  "E Asia": "E ASIA",
  Oceania: "OCEANIA",
  Global: "GLOBAL",
};

// ---------- World map (lon/lat polygons, equirectangular) ----------
type LonLat = [number, number];
const CONTINENTS: LonLat[][] = [
  // North America
  [[-168, 66], [-150, 70], [-135, 69], [-125, 71], [-115, 68], [-100, 69], [-90, 68], [-85, 66], [-80, 62], [-75, 62], [-68, 58], [-60, 55], [-55, 52], [-60, 47], [-65, 44], [-70, 42], [-75, 37], [-80, 32], [-81, 26], [-85, 30], [-90, 21], [-95, 19], [-97, 16], [-92, 14], [-87, 13], [-83, 9], [-79, 9], [-84, 12], [-90, 14], [-95, 16], [-100, 18], [-105, 20], [-110, 23], [-115, 29], [-120, 34], [-125, 40], [-124, 48], [-130, 54], [-140, 60], [-150, 58], [-160, 55], [-168, 66]],
  // South America
  [[-79, 9], [-75, 11], [-72, 12], [-64, 11], [-60, 9], [-55, 6], [-51, 4], [-50, 0], [-44, -3], [-38, -5], [-35, -8], [-37, -13], [-39, -17], [-41, -22], [-48, -26], [-52, -32], [-57, -38], [-62, -41], [-65, -45], [-68, -50], [-70, -54], [-73, -50], [-73, -44], [-73, -37], [-71, -30], [-70, -23], [-70, -18], [-76, -15], [-80, -6], [-81, -3], [-80, 1], [-79, 9]],
  // Africa
  [[-6, 35], [-10, 31], [-15, 27], [-17, 21], [-17, 15], [-15, 11], [-12, 8], [-8, 5], [-4, 5], [0, 6], [6, 4], [9, 4], [12, -1], [13, -8], [12, -15], [13, -22], [16, -28], [19, -34], [26, -34], [32, -29], [35, -24], [36, -18], [40, -15], [40, -10], [42, -4], [46, 0], [51, 2], [51, 10], [48, 11], [44, 11], [40, 15], [38, 18], [37, 22], [34, 27], [32, 31], [28, 32], [22, 33], [15, 32], [10, 34], [10, 37], [5, 37], [0, 36], [-6, 35]],
  // Europe
  [[-10, 36], [-9, 38], [-9, 43], [-2, 44], [-1, 46], [-4, 48], [-2, 49], [0, 50], [3, 51], [5, 53], [8, 55], [8, 57], [10, 59], [12, 58], [18, 56], [21, 55], [24, 58], [24, 60], [21, 64], [18, 66], [15, 68], [18, 70], [25, 71], [30, 70], [32, 68], [35, 66], [40, 64], [44, 68], [48, 68], [52, 68], [55, 67], [58, 65], [60, 63], [55, 60], [50, 58], [45, 56], [40, 55], [35, 55], [30, 56], [28, 55], [25, 55], [23, 54], [21, 55], [18, 54], [15, 54], [12, 54], [10, 57], [8, 55], [5, 53], [3, 51], [0, 50], [-2, 49], [-4, 48], [-1, 46], [-2, 44], [-9, 43], [-9, 38], [-10, 36]],
  // Asia
  [[30, 70], [45, 68], [60, 69], [75, 72], [90, 75], [105, 76], [120, 73], [135, 72], [150, 70], [165, 68], [178, 65], [170, 60], [162, 56], [158, 52], [150, 59], [142, 55], [140, 48], [135, 43], [130, 42], [127, 39], [122, 38], [120, 33], [118, 28], [112, 22], [108, 18], [105, 12], [102, 8], [99, 10], [96, 15], [92, 21], [89, 22], [86, 20], [83, 17], [80, 13], [78, 8], [76, 11], [73, 17], [70, 21], [66, 25], [61, 25], [57, 27], [52, 28], [48, 29], [44, 29], [40, 31], [36, 36], [33, 36], [30, 38], [30, 45], [30, 52], [30, 60], [30, 70]],
  // Australia
  [[113, -22], [114, -30], [115, -33], [118, -35], [124, -33], [129, -32], [132, -32], [135, -35], [138, -35], [140, -38], [145, -38], [150, -37], [153, -32], [153, -27], [150, -23], [146, -19], [142, -15], [142, -11], [137, -12], [135, -15], [132, -12], [130, -13], [126, -14], [122, -17], [118, -20], [113, -22]],
  // New Zealand (small)
  [[166, -34], [168, -37], [170, -40], [172, -41], [174, -41], [176, -38], [178, -38], [176, -35], [168, -34]],
];

// ---------- Drawing helpers ----------
function tagColor(tag: Story["tag"]): RGB {
  if (tag === "CONFIRMED") return TAG_CONFIRMED;
  if (tag === "REPORTED") return TAG_REPORTED;
  if (tag === "OFFICIAL") return TAG_OFFICIAL;
  if (tag === "CLAIM") return TAG_CLAIM;
  return TAG_FORECAST;
}

function chip(c: Canvas, x: number, y: number, text: string, bg: RGB): number {
  const w = c.measure(text, 1) + 8;
  c.rect(x, y, w, 12, bg);
  c.text(x + 4, y + 2, text, 1, WHITE);
  return w;
}

function burst(c: Canvas, cx: number, cy: number, r: number, c1: RGB, c2: RGB): void {
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const tip: [number, number] = [Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))];
    const b1: [number, number] = [
      Math.round(cx + r * 0.35 * Math.cos(a + Math.PI / 8)),
      Math.round(cy + r * 0.35 * Math.sin(a + Math.PI / 8)),
    ];
    const b2: [number, number] = [
      Math.round(cx + r * 0.35 * Math.cos(a - Math.PI / 8)),
      Math.round(cy + r * 0.35 * Math.sin(a - Math.PI / 8)),
    ];
    c.poly([b1, tip, b2], c1);
  }
  c.circle(cx, cy, Math.round(r * 0.45), c2);
}

// ---------- Hero illustrations (328 x 100) ----------
function heroKuwait(c: Canvas, x: number, y: number): void {
  c.rect(x, y, 328, 100, NAVY);
  c.rect(x, y + 55, 328, 45, [35, 55, 85]);
  const stars: Array<[number, number]> = [[20, 10], [60, 18], [100, 8], [150, 16], [200, 10], [250, 20], [300, 8], [40, 30], [180, 30], [280, 32], [120, 26], [230, 28]];
  for (const [sx, sy] of stars) c.rect(x + sx, y + sy, 2, 2, WHITE);
  // building silhouettes
  c.rect(x + 8, y + 62, 34, 38, [10, 18, 32]);
  c.rect(x + 48, y + 52, 26, 48, [10, 18, 32]);
  c.rect(x + 80, y + 70, 40, 30, [10, 18, 32]);
  c.rect(x + 250, y + 58, 30, 42, [10, 18, 32]);
  c.rect(x + 286, y + 68, 34, 32, [10, 18, 32]);
  const wins: Array<[number, number]> = [[16, 70], [28, 70], [16, 82], [56, 60], [56, 72], [90, 78], [258, 66], [268, 66], [294, 76]];
  for (const [wx, wy] of wins) c.rect(x + wx, y + wy, 3, 4, GOLD);
  // explosion + smoke
  burst(c, x + 205, y + 48, 24, [234, 88, 12], [250, 204, 21]);
  c.circle(x + 190, y + 22, 7, [100, 116, 139]);
  c.circle(x + 205, y + 14, 9, [100, 116, 139]);
  c.circle(x + 220, y + 22, 6, [100, 116, 139]);
  // drone
  c.rect(x + 128, y + 26, 14, 5, INK);
  c.line(x + 122, y + 24, x + 148, y + 24, INK);
  c.line(x + 122, y + 32, x + 148, y + 32, INK);
  c.circle(x + 122, y + 24, 2, INK);
  c.circle(x + 148, y + 24, 2, INK);
  c.circle(x + 122, y + 32, 2, INK);
  c.circle(x + 148, y + 32, 2, INK);
}

function heroFriday(c: Canvas, x: number, y: number): void {
  c.rect(x, y, 328, 100, [254, 243, 199]);
  c.rect(x, y + 62, 328, 38, [253, 230, 180]);
  // awning stripes
  for (let i = 0; i < 8; i++) {
    c.rect(x + i * 41, y + 6, 21, 20, i % 2 === 0 ? RED : WHITE);
  }
  c.rect(x, y + 26, 328, 4, RED_D);
  // shop front
  c.rect(x + 20, y + 30, 288, 32, [245, 245, 244]);
  c.box(x + 20, y + 30, 288, 32, INK);
  c.rect(x + 150, y + 38, 28, 24, NAVY);
  c.rect(x + 34, y + 38, 60, 24, [186, 230, 253]);
  c.rect(x + 234, y + 38, 60, 24, [186, 230, 253]);
  // shopping bags
  const bags: Array<[number, RGB]> = [[60, RED], [130, TEAL], [210, GOLD]];
  for (const [bx, bc] of bags) {
    c.rect(x + bx, y + 66, 34, 28, bc);
    c.line(x + bx + 8, y + 66, x + bx + 8, y + 58, INK);
    c.line(x + bx + 26, y + 66, x + bx + 26, y + 58, INK);
    c.line(x + bx + 8, y + 58, x + bx + 26, y + 58, INK);
  }
  // price tag
  c.poly([[x + 268, y + 70], [x + 300, y + 70], [x + 312, y + 82], [x + 300, y + 94], [x + 268, y + 94]], GOLD);
  c.circle(x + 274, y + 82, 2, WHITE);
  c.text(x + 282, y + 78, "SALE", 1, WHITE);
  // confetti dots (fixed positions)
  const conf: Array<[number, number, RGB]> = [[15, 60, RED], [40, 86, TEAL], [90, 56, GOLD], [180, 58, RED], [250, 56, TEAL], [310, 60, RED], [105, 92, TEAL], [175, 92, GOLD], [250, 92, RED]];
  for (const [dx, dy, dc] of conf) c.rect(x + dx, y + dy, 3, 3, dc);
}

function heroGaza(c: Canvas, x: number, y: number): void {
  c.rect(x, y, 328, 40, [251, 146, 60]);
  c.rect(x, y + 40, 328, 30, [234, 88, 12]);
  c.rect(x, y + 70, 328, 30, [124, 45, 18]);
  // skyline
  const b: Array<[number, number, number]> = [[8, 66, 30], [44, 56, 26], [76, 70, 34], [116, 60, 28], [150, 72, 30], [186, 58, 26], [218, 68, 32], [256, 62, 28], [290, 70, 30]];
  for (const [bx, by, bw] of b) c.rect(x + bx, y + by, bw, 100 - by, [31, 41, 55]);
  // minaret
  c.rect(x + 130, y + 44, 6, 56, [31, 41, 55]);
  c.poly([[x + 128, y + 44], [x + 138, y + 44], [x + 133, y + 34]], [31, 41, 55]);
  // smoke columns
  const smoke: Array<[number, number, number]> = [[60, 46, 6], [62, 36, 8], [64, 26, 9], [200, 48, 6], [202, 38, 8], [204, 28, 9], [270, 52, 5], [272, 42, 7]];
  for (const [sx, sy, sr] of smoke) c.circle(x + sx, y + sy, sr, [148, 163, 184]);
  // lit windows
  const wins: Array<[number, number]> = [[16, 74], [50, 64], [84, 78], [124, 68], [158, 80], [194, 66], [226, 76], [264, 70], [298, 78]];
  for (const [wx, wy] of wins) c.rect(x + wx, y + wy, 3, 4, GOLD);
}

// ---------- Card mini illustrations (140 x 28) ----------
const FIELD_TINT: Record<string, RGB> = {
  WAR: [254, 226, 226], ECONOMY: [254, 243, 199], CHESS: [224, 242, 254],
  MIGRATION: [224, 242, 254], COURTS: [237, 233, 254], ENVIRONMENT: [204, 251, 241],
  POLITICS: [219, 234, 254], LABOUR: [255, 237, 213], DIPLOMACY: [224, 242, 254],
  DISASTER: [254, 226, 226], SPORT: [220, 252, 231],
};

function cardArt(c: Canvas, x: number, y: number, field: string): void {
  const tint = FIELD_TINT[field] ?? [226, 232, 240];
  c.rect(x, y, 140, 28, tint);
  const cx = x + 70;
  const cy = y + 14;
  if (field === "CHESS") {
    for (let r = 0; r < 4; r++)
      for (let q = 0; q < 4; q++)
        c.rect(cx - 10 + q * 5, cy - 10 + r * 5, 5, 5, (r + q) % 2 === 0 ? INK : WHITE);
    c.box(cx - 10, cy - 10, 20, 20, INK);
  } else if (field === "MIGRATION") {
    c.line(cx - 16, cy - 6, cx - 5, cy + 2, RED);
    c.line(cx - 5, cy + 2, cx + 4, cy - 2, RED);
    c.line(cx + 4, cy - 2, cx + 16, cy + 8, RED);
    c.poly([[cx + 16, cy + 8], [cx + 8, cy + 8], [cx + 16, cy + 1]], RED);
  } else if (field === "COURTS") {
    c.rect(cx - 12, cy - 8, 20, 6, GOLD);
    c.line(cx - 2, cy - 2, cx + 8, cy + 8, GOLD);
    c.rect(cx + 2, cy + 8, 14, 3, GOLD);
  } else if (field === "ENVIRONMENT") {
    c.line(cx - 18, cy - 2, cx - 10, cy + 2, TEAL);
    c.line(cx - 10, cy + 2, cx - 2, cy - 2, TEAL);
    c.line(cx - 2, cy - 2, cx + 6, cy + 2, TEAL);
    c.line(cx + 6, cy + 2, cx + 14, cy - 2, TEAL);
    c.rect(cx - 12, cy + 6, 24, 5, INK);
  } else if (field === "POLITICS") {
    c.poly([[cx - 14, cy - 4], [cx, cy - 12], [cx + 14, cy - 4]], NAVY);
    c.rect(cx - 12, cy - 4, 3, 12, NAVY);
    c.rect(cx - 2, cy - 4, 3, 12, NAVY);
    c.rect(cx + 9, cy - 4, 3, 12, NAVY);
    c.rect(cx - 14, cy + 8, 28, 3, NAVY);
  } else if (field === "LABOUR") {
    c.rect(cx - 16, cy - 2, 32, 12, GREY);
    c.rect(cx - 14, cy - 12, 5, 10, GREY);
    c.rect(cx - 6, cy - 12, 5, 10, GREY);
    c.rect(cx + 8, cy - 8, 8, 18, RED);
  } else if (field === "DIPLOMACY") {
    c.line(cx - 8, cy - 10, cx - 8, cy + 10, INK);
    c.line(cx + 8, cy - 10, cx + 8, cy + 10, INK);
    c.rect(cx - 8, cy - 10, 12, 7, RED);
    c.rect(cx - 4, cy - 10, 12, 7, TEAL);
  } else if (field === "DISASTER") {
    c.poly([[cx, cy - 12], [cx + 9, cy + 8], [cx - 9, cy + 8]], GOLD);
    c.poly([[cx, cy - 4], [cx + 5, cy + 8], [cx - 5, cy + 8]], RED);
  } else if (field === "SPORT") {
    c.circle(cx, cy, 10, WHITE);
    c.ring(cx, cy, 10, INK);
    c.circle(cx, cy, 3, INK);
  } else if (field === "ECONOMY") {
    c.rect(cx - 14, cy + 2, 6, 8, TEAL);
    c.rect(cx - 5, cy - 2, 6, 12, TEAL);
    c.rect(cx + 4, cy - 7, 6, 17, TEAL);
    c.rect(cx + 13, cy - 11, 6, 21, GOLD);
  } else {
    burst(c, cx, cy, 9, [234, 88, 12], [250, 204, 21]);
  }
}

// ---------- Sections ----------
function drawTopStrip(c: Canvas, fields: number): void {
  c.rect(0, 0, W, 28, NAVY);
  const s = `38 STORIES • 8 REGIONS • 13 SOURCES • ${fields} FIELDS • EVERY ONE DATED FRIDAY 27 NOVEMBER 2026`;
  c.textC(512, 7, s, 2, WHITE, 1);
}

function drawMasthead(c: Canvas): void {
  c.textC(512, 36, "FRIDAY 27 NOVEMBER 2026", 6, NAVY);
  c.rect(8, 82, 1008, 2, RED);
  c.textC(
    512,
    88,
    "Kuwait strike kills two Italians — Black Friday eyes record $12.9bn — 10 die in Gaza",
    2,
    INK,
    1
  );
}

function drawKpi(c: Canvas): void {
  for (let i = 0; i < KPI.length; i++) {
    const x = 8 + i * 168;
    c.rect(x, 108, 164, 44, CARD);
    c.box(x, 108, 164, 44, BORDER);
    c.rect(x, 108, 164, 3, RED);
    c.textC(x + 82, 114, KPI[i].num, 3, RED_D);
    c.textC(x + 82, 138, KPI[i].label, 1, GREY);
  }
}

function drawRegionBar(c: Canvas, counts: Record<string, number>): void {
  c.rect(0, 152, W, 22, NAVY);
  const parts = REGION_ORDER.map((r) => `${REGION_SHORT[r]} ${counts[r] ?? 0}`);
  c.textC(512, 159, parts.join("  •  "), 1, WHITE);
}

function drawHero(c: Canvas, x: number, s: Story): void {
  c.rect(x, 174, 328, 222, CARD);
  c.box(x, 174, 328, 222, BORDER);
  if (s.n === 1) heroKuwait(c, x, 174);
  else if (s.n === 2) heroFriday(c, x, 174);
  else heroGaza(c, x, 174);
  // number chip on illustration
  c.rect(x + 6, 180, 16, 14, NAVY);
  c.text(x + 6 + Math.floor((16 - c.measure(String(s.n), 1)) / 2), 182, String(s.n), 1, WHITE);
  c.rect(x, 274, 328, 3, s.field === "ECONOMY" ? GOLD : RED);
  const headLines = c.wrap(s.head, 312, 2);
  let hy = 282;
  for (const ln of headLines) {
    c.text(x + 8, hy, ln, 2, INK);
    hy += 16;
  }
  const bodyLines = c.wrap(s.body, 312, 1);
  let by = 318;
  for (const ln of bodyLines.slice(0, 3)) {
    c.text(x + 8, by, ln, 1, INK);
    by += 10;
  }
  c.text(x + 8, 354, s.src, 1, GREY);
  const tw = c.measure(s.tag, 1) + 8;
  chip(c, x + 328 - 8 - tw, 372, s.tag, tagColor(s.tag));
  c.text(x + 8, 374, `${s.place} • ${s.field}`, 1, NAVY2);
}

function drawCard(c: Canvas, x: number, y: number, s: Story): void {
  c.rect(x, y, 140, 120, CARD);
  c.box(x, y, 140, 120, BORDER);
  cardArt(c, x, y, s.field);
  c.rect(x + 4, y + 4, 16, 14, NAVY);
  c.text(x + 4 + Math.floor((16 - c.measure(String(s.n), 1)) / 2), y + 6, String(s.n), 1, WHITE);
  c.text(x + 6, y + 32, `${s.place} • ${s.field}`, 1, NAVY2);
  const headLines = c.wrap(s.head, 128, 1).slice(0, 3);
  let hy = y + 42;
  for (const ln of headLines) {
    c.text(x + 6, hy, ln, 1, INK);
    hy += 9;
  }
  const bodyLines = c.wrap(s.body, 128, 1);
  let by = hy + 1;
  for (const ln of bodyLines.slice(0, 2)) {
    if (by + 9 > y + 92) break;
    c.text(x + 6, by, ln, 1, GREY);
    by += 9;
  }
  let src = s.src;
  if (c.measure(src, 1) > 128) src = src.split(" / ")[0];
  c.text(x + 6, y + 94, src, 1, GREY);
  chip(c, x + 6, y + 104, s.tag, tagColor(s.tag));
}

function drawAlsoOn(c: Canvas): void {
  c.rect(8, 640, 548, 376, CARD);
  c.box(8, 640, 548, 376, BORDER);
  c.rect(8, 640, 548, 3, NAVY);
  c.text(16, 648, "ALSO ON FRIDAY 27 NOVEMBER — 21 MORE STORIES", 1, NAVY);
  let y = 664;
  for (const a of ALSO_ON) {
    c.text(16, y, `${a.n}.`, 1, RED);
    c.text(40, y, a.line, 1, INK);
    y += 12;
  }
  // note box
  c.rect(16, 924, 532, 84, [238, 242, 247]);
  c.text(24, 932, "WHY THESE 38", 1, NAVY);
  c.text(24, 946, "Every story is dated Friday 27 November 2026.", 1, INK);
  c.text(24, 958, "Older news was checked and left out — see DATE CHECK.", 1, INK);
  c.text(24, 970, "Tags show how sure we are; sources are listed on the right.", 1, INK);
  c.text(24, 984, "Nothing here is speculation presented as fact.", 1, INK);
}

function drawMap(c: Canvas, pins: Story[]): void {
  c.rect(564, 640, 452, 158, CARD);
  c.box(564, 640, 452, 158, BORDER);
  c.rect(564, 640, 452, 3, NAVY);
  c.text(572, 648, "THE WORLD ON FRIDAY 27 NOVEMBER — PINS MATCH STORY NUMBERS", 1, NAVY);
  const mx0 = 568;
  const my0 = 662;
  const mw = 444;
  const mh = 132;
  c.rect(mx0, my0, mw, mh, OCEAN);
  const proj = (lon: number, lat: number): [number, number] => [
    Math.round(mx0 + ((lon + 180) / 360) * mw),
    Math.round(my0 + ((90 - lat) / 180) * mh),
  ];
  for (const cont of CONTINENTS) {
    const pts = cont.map(([lo, la]) => proj(lo, la));
    c.poly(pts, LAND);
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      c.line(x0, y0, x1, y1, LAND_LINE);
    }
  }
  for (const s of pins) {
    const [px, py] = s.pin;
    c.circle(px, py, 8, RED);
    c.ring(px, py, 8, WHITE);
    const num = String(s.n);
    c.text(px - Math.floor(c.measure(num, 1) / 2), py - 3, num, 1, WHITE);
  }
}

function drawTimeline(c: Canvas): void {
  c.rect(564, 798, 452, 68, CARD);
  c.box(564, 798, 452, 68, BORDER);
  c.rect(564, 798, 452, 3, TEAL);
  c.text(572, 804, "THE DAY IN UTC", 1, NAVY);
  let y = 818;
  for (const t of TIMELINE) {
    c.text(572, y, t, 1, INK);
    y += 10;
  }
}

function drawDateCheck(c: Canvas): void {
  c.rect(564, 866, 452, 150, CARD);
  c.box(564, 866, 452, 150, BORDER);
  c.rect(564, 866, 452, 3, RED);
  c.text(572, 872, "DATE CHECK — WHAT COUNTS AS 27 NOVEMBER", 1, NAVY);
  const aLines = c.wrap(
    "Kuwait strike first reported 01:03 UTC Fri 27 Nov (NYT) — counted as today's news.",
    436,
    1
  );
  let y = 884;
  for (const ln of aLines) {
    c.text(572, y, ln, 1, INK);
    y += 9;
  }
  y += 2;
  c.text(572, y, "LEFT OUT — NOT 27 NOVEMBER NEWS:", 1, RED_D);
  y += 11;
  for (const item of LEFT_OUT) {
    c.text(572, y, "x  " + item, 1, INK);
    y += 9;
  }
  y += 2;
  const leg = c.wrap(
    "HOW WE CHECKED — CONFIRMED = 2+ outlets • OFFICIAL = on the record • REPORTED = one outlet • CLAIM = one side's account • FORECAST = scheduled for today",
    436,
    1
  );
  for (const ln of leg) {
    c.text(572, y, ln, 1, GREY);
    y += 9;
  }
  y += 1;
  const srcLines = c.wrap("SOURCES: " + SOURCES_13, 436, 1);
  for (const ln of srcLines) {
    c.text(572, y, ln, 1, GREY);
    y += 9;
  }
}

// ---------- Build ----------
function build(): Buffer {
  const all: Array<{ region: string; field: string }> = [
    ...HEROES,
    ...CARDS,
    ...ALSO_ON,
  ];
  const counts: Record<string, number> = {};
  for (const r of REGION_ORDER) counts[r] = 0;
  const fields = new Set<string>();
  for (const s of all) {
    counts[s.region] = (counts[s.region] ?? 0) + 1;
    fields.add(s.field);
  }
  const c = new Canvas(W, H, PAPER);
  drawTopStrip(c, fields.size);
  drawMasthead(c);
  drawKpi(c);
  drawRegionBar(c, counts);
  for (let i = 0; i < HEROES.length; i++) drawHero(c, 8 + i * 340, HEROES[i]);
  for (let i = 0; i < CARDS.length; i++) {
    const col = i % 7;
    const row = Math.floor(i / 7);
    drawCard(c, 8 + col * 144, 396 + row * 124, CARDS[i]);
  }
  drawAlsoOn(c);
  drawMap(c, [...HEROES, ...CARDS]);
  drawTimeline(c);
  drawDateCheck(c);
  return pngEncode(W, H, c.buf);
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const png = build();
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, png);
  const sha = crypto.createHash("sha256").update(png).digest("hex");
  console.log(`wrote ${outPath}`);
  console.log(`bytes=${png.length} sha256=${sha} size=1024x1024 stories=38`);
}

main();
