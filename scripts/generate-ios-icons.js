#!/usr/bin/env node
/**
 * scripts/generate-ios-icons.js
 * ────────────────────────────
 * Generates all required iOS app icon sizes from public/KG_LOGO.png.
 * Removes alpha channel (transparency) as required by Apple.
 * Also writes the required Contents.json.
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

const contents = {
  "images": [
    { "size": "20x20",   "idiom": "iphone", "filename": "icon-40.png",   "scale": "2x" },
    { "size": "20x20",   "idiom": "iphone", "filename": "icon-60.png",   "scale": "3x" },
    { "size": "29x29",   "idiom": "iphone", "filename": "icon-58.png",   "scale": "2x" },
    { "size": "29x29",   "idiom": "iphone", "filename": "icon-87.png",   "scale": "3x" },
    { "size": "40x40",   "idiom": "iphone", "filename": "icon-80.png",   "scale": "2x" },
    { "size": "40x40",   "idiom": "iphone", "filename": "icon-120.png",  "scale": "3x" },
    { "size": "60x60",   "idiom": "iphone", "filename": "icon-120.png",  "scale": "2x" },
    { "size": "60x60",   "idiom": "iphone", "filename": "icon-180.png",  "scale": "3x" },
    { "size": "20x20",   "idiom": "ipad",   "filename": "icon-20.png",   "scale": "1x" },
    { "size": "20x20",   "idiom": "ipad",   "filename": "icon-40.png",   "scale": "2x" },
    { "size": "29x29",   "idiom": "ipad",   "filename": "icon-29.png",   "scale": "1x" },
    { "size": "29x29",   "idiom": "ipad",   "filename": "icon-58.png",   "scale": "2x" },
    { "size": "40x40",   "idiom": "ipad",   "filename": "icon-40.png",   "scale": "1x" },
    { "size": "40x40",   "idiom": "ipad",   "filename": "icon-80.png",   "scale": "2x" },
    { "size": "76x76",   "idiom": "ipad",   "filename": "icon-76.png",   "scale": "1x" },
    { "size": "76x76",   "idiom": "ipad",   "filename": "icon-152.png",  "scale": "2x" },
    { "size": "83.5x83.5","idiom": "ipad",  "filename": "icon-167.png",  "scale": "2x" },
    { "size": "1024x1024","idiom": "ios-marketing","filename": "icon-1024.png","scale": "1x" }
  ],
  "info": { "version": 1, "author": "xcode" }
};

async function generate(outDir) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Write Contents.json
  fs.writeFileSync(path.join(outDir, 'Contents.json'), JSON.stringify(contents, null, 2));

  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}.png`);
    await sharp(SOURCE)
      .flatten({ background: { r: 11, g: 93, b: 59 } }) // #0B5D3B brand green
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

  console.log('Generating iOS icons (flattened) and Contents.json from', SOURCE);
  await generate(OUTDIR);
  console.log('Icons written to', OUTDIR);

  if (fs.existsSync(path.join(__dirname, '../ios'))) {
    await generate(IOS_XCASSET_DIR);
    console.log('Icons also written to Xcode asset catalogue');
  }
})().catch(e => { console.error(e); process.exit(1); });
