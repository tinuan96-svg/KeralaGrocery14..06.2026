#!/usr/bin/env node
/**
 * Generates all required iOS app icon sizes from public/KG_LOGO.png.
 * Requires: npm install -D sharp
 * Run:      node scripts/generate-ios-icons.js
 * Output:   ios-assets/AppIcon.appiconset/icon-*.png
 *           ios/App/App/Assets.xcassets/AppIcon.appiconset/   (after cap add ios)
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

// Using KG_LOGO.png which is likely the solid version
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
  fs.mkdirSync(outDir, { recursive: true });

  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}.png`);
    await sharp(SOURCE)
      .trim() // Remove any transparent or white border in the source
      .resize(size, size, {
        fit: 'cover', // Fill the entire square, cropping if necessary
        background: { r: 11, g: 93, b: 59, alpha: 1 }, // #0B5D3B brand green
      })
      .png()
      .toFile(outPath);
    console.log(`  icon-${size}.png`);
  }
}

(async () => {
  if (!fs.existsSync(SOURCE)) {
    console.error('Source file not found:', SOURCE);
    process.exit(1);
  }

  console.log('Generating iOS icons from', SOURCE);
  await generate(OUTDIR);
  console.log('Icons written to', OUTDIR);

  if (fs.existsSync(path.join(__dirname, '../ios'))) {
    await generate(IOS_XCASSET_DIR);
    console.log('Icons also written to Xcode asset catalogue');
  }
})().catch(e => { console.error(e); process.exit(1); });
