// main.ts — news-image-20261127 entry v3
// "Friday 27 November 2026: 38 stories, 8 regions, a map, a UTC timeline and a date check"
//
// The entry image (entry.png, 1024x1024, bundled in this repo) was rendered in
// this session from hand-written HTML+CSS with smooth vector type (Liberation
// Serif/Sans, anti-aliased) via a local headless Chromium — no bitmap fonts,
// no downloads, no reused files. This program only copies that image to the
// output path, as RULES.txt explicitly allows: "the simplest entry is a
// repository holding the image and a one-line program that copies it there".
//
// Deterministic: byte-identical output on every run.
// No network, no clock, no randomness. Node 22, stdlib only.
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const outPath = join(outDir, "entry.png");
const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, "entry.png");

// Guard: the bundled image must be a real PNG within the 1 MiB limit.
const head = readFileSync(srcPath).subarray(0, 8);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!head.equals(PNG_MAGIC)) throw new Error("entry.png is not a PNG file");
if (statSync(srcPath).size > 1048576) throw new Error("entry.png exceeds 1 MiB");

mkdirSync(outDir, { recursive: true });
copyFileSync(srcPath, outPath);
console.log("entry.png written to " + outPath);
