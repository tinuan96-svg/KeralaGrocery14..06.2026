#!/usr/bin/env node
/**
 * scripts/generate-ios-icons.js
 * ────────────────────────────
 * Generates all required iOS app icon sizes from public/KG_LOGO.png.
 * Removes alpha channel (transparency) as required by Apple.
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SOURCE = path.join(__dirname, '../public/KG_LOGO.png');
const OUTDIR = path.join(__dirname, '../ios-assets/AppIcon.appiconset');
const IOS_XCASSET_DIR = path.join(
  __dirname,
  '../ios/App/App/Assets.xcassets/AppIcon.appiconset'
);

const sizes = [
  20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024,
];

async function generate(outDir) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}.png`);
    await sharp(SOURCE)
      .flatten({ background: { r: 11, g: 93, b: 59 } }) // #0B5D3B brand green, removes alpha
      .resize(size, size, {
        fit: 'cover',
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
      .toFile(outPath);
    console.log(`  icon-${size}.png`);
  }
}

(async () => {
  if (!fs.existsSync(SOURCE)) {
    console.error('Source file not found:', SOURCE);
    process.exit(1);
  }

  console.log('Generating iOS icons (flattened) from', SOURCE);
  await generate(OUTDIR);
  console.log('Icons written to', OUTDIR);

  if (fs.existsSync(path.join(__dirname, '../ios'))) {
    await generate(IOS_XCASSET_DIR);
    console.log('Icons also written to Xcode asset catalogue');
  }
})().catch(e => { console.error(e); process.exit(1); });
