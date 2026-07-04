#!/usr/bin/env node
/**
 * Generates iOS launch screen / splash images from public/KG_LOGO.png.
 * Requires: npm install -D sharp
 * Run:      node scripts/generate-splash-screens.js
 * Output:   ios-assets/LaunchImage.launchimage/
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SOURCE = path.join(__dirname, '../public/logo_KG_Trans.png');
const OUTDIR = path.join(__dirname, '../ios-assets/LaunchImage.launchimage');

// All required iOS splash screen sizes (width x height)
const screens = [
  { w: 828,  h: 1792, name: 'Default@2x~iphone~anyany' },
  { w: 1170, h: 2532, name: 'Default@3x~iphone~anyany' },
  { w: 1179, h: 2556, name: 'Default@3x~iphone~anyany~2' },
  { w: 1284, h: 2778, name: 'Default@3x~iphone~anyany~3' },
  { w: 1290, h: 2796, name: 'Default@3x~iphone~anyany~4' },
  { w: 1488, h: 2266, name: 'Default@2x~ipad~anyany' },
  { w: 2048, h: 2732, name: 'Default@2x~ipad~anyany~2' },
];

// Logo occupies 30 % of the shorter canvas dimension, centred on brand green.
async function generate() {
  fs.mkdirSync(OUTDIR, { recursive: true });

  for (const { w, h, name } of screens) {
    const logoSize = Math.round(Math.min(w, h) * 0.3);
    const logoBuffer = await sharp(SOURCE)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const outPath = path.join(OUTDIR, `${name}.png`);
    await sharp({
      create: { width: w, height: h, channels: 4, background: { r: 11, g: 93, b: 59, alpha: 255 } },
    })
      .composite([{
        input:   logoBuffer,
        gravity: 'center',
      }])
      .png()
      .toFile(outPath);

    console.log(`  ${name}.png  ${w}x${h}`);
  }
}

(async () => {
  console.log('Generating splash screens…');
  await generate();
  console.log('Done →', OUTDIR);
})().catch(e => { console.error(e); process.exit(1); });
