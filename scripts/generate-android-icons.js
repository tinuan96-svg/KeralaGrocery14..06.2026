const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '../public/KG_LOGO.png');
const RES_DIR = path.join(__dirname, '../android/app/src/main/res');

const iconConfigs = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
];

const adaptiveConfigs = [
    { dir: 'mipmap-mdpi', size: 108 },
    { dir: 'mipmap-hdpi', size: 162 },
    { dir: 'mipmap-xhdpi', size: 216 },
    { dir: 'mipmap-xxhdpi', size: 324 },
    { dir: 'mipmap-xxxhdpi', size: 432 },
];

async function generate() {
    if (!fs.existsSync(SOURCE)) {
        console.error('Source file not found:', SOURCE);
        return;
    }

    console.log('Generating Android icons from', SOURCE);

    // Legacy Icons
    for (const config of iconConfigs) {
        const dir = path.join(RES_DIR, config.dir);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        await sharp(SOURCE)
            .resize(config.size, config.size)
            .toFile(path.join(dir, 'ic_launcher.png'));

        await sharp(SOURCE)
            .resize(config.size, config.size)
            .composite([{
                input: Buffer.from(`<svg><circle cx="${config.size / 2}" cy="${config.size / 2}" r="${config.size / 2}" fill="white"/></svg>`),
                blend: 'dest-in'
            }])
            .toFile(path.join(dir, 'ic_launcher_round.png'));
    }

    // Adaptive Icons (Foreground)
    for (const config of adaptiveConfigs) {
        const dir = path.join(RES_DIR, config.dir);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        await sharp(SOURCE)
            .resize(config.size, config.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toFile(path.join(dir, 'ic_launcher_foreground.png'));
    }

    console.log('Android icons generated successfully!');
}

generate().catch(console.error);
