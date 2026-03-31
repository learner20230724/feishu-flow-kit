#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

function printUsage() {
  console.error('Usage: node ./scripts/export-svg-png.mjs <input.svg> [--out output.png] [--width px] [--height px]');
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(args.length === 0 ? 1 : 0);
}

const positional = [];
let outPath;
let width;
let height;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--out') {
    outPath = args[++i];
    continue;
  }
  if (arg === '--width') {
    width = Number(args[++i]);
    continue;
  }
  if (arg === '--height') {
    height = Number(args[++i]);
    continue;
  }
  positional.push(arg);
}

const inputArg = positional[0];
if (!inputArg) {
  printUsage();
  process.exit(1);
}

const inputPath = resolve(process.cwd(), inputArg);
const outputPath = resolve(
  process.cwd(),
  outPath ?? inputArg.replace(/\.svg$/i, '.png')
);

if (extname(inputPath).toLowerCase() !== '.svg') {
  console.error(`Expected an .svg input, got: ${inputArg}`);
  process.exit(1);
}

const svg = readFileSync(inputPath, 'utf8');
const fitTo = width
  ? { mode: 'width', value: width }
  : height
    ? { mode: 'height', value: height }
    : undefined;

const resvg = new Resvg(svg, {
  fitTo,
  background: 'rgba(0,0,0,0)'
});
const pngData = resvg.render();
const pngBuffer = pngData.asPng();
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, pngBuffer);
console.log(`Exported ${inputArg} -> ${outputPath}`);
