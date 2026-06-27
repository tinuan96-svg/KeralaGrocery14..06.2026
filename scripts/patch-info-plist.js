#!/usr/bin/env node
/**
 * scripts/patch-info-plist.js
 * ────────────────────────────
 * Merges the keys from ios-config/Info.plist.patch into
 * ios/App/App/Info.plist after `npx cap add ios`.
 *
 * Usage:  node scripts/patch-info-plist.js
 * Prereq: npm install -D plist
 */

const fs   = require('fs');
const path = require('path');
const plist = require('plist');

const TARGET = path.join(__dirname, '../ios/App/App/Info.plist');
const PATCH  = path.join(__dirname, '../ios-config/Info.plist.patch');

if (!fs.existsSync(TARGET)) {
  console.error('ios/App/App/Info.plist not found. Run `npx cap add ios` first.');
  process.exit(1);
}

const target = plist.parse(fs.readFileSync(TARGET, 'utf8'));
const patch  = plist.parse(fs.readFileSync(PATCH,  'utf8'));

const merged = { ...target, ...patch };

fs.writeFileSync(TARGET, plist.build(merged), 'utf8');
console.log('Info.plist patched successfully.');
