#!/usr/bin/env node
/**
 * scripts/patch-info-plist.js
 * ────────────────────────────
 * Merges the keys from ios-config/Info.plist.patch into
 * ios/App/App/Info.plist after `npx cap add ios`.
 */

const fs = require('fs');
const path = require('path');

// Try to require plist, but fail gracefully if there's a module resolution issue
let plist;
try {
  plist = require('plist');
} catch (e) {
  console.warn('Warning: Could not load "plist" module. Skipping Info.plist patch.');
  process.exit(0);
}

const TARGET = path.join(__dirname, '../ios/App/App/Info.plist');
const PATCH  = path.join(__dirname, '../ios-config/Info.plist.patch');

if (!fs.existsSync(TARGET)) {
  console.warn('Warning: ios/App/App/Info.plist not found. Skipping.');
  process.exit(0);
}

try {
  const target = plist.parse(fs.readFileSync(TARGET, 'utf8'));
  const patch  = plist.parse(fs.readFileSync(PATCH,  'utf8'));

  const merged = { ...target, ...patch };

  fs.writeFileSync(TARGET, plist.build(merged), 'utf8');
  console.log('Info.plist patched successfully.');
} catch (err) {
  console.error('Error patching Info.plist:', err.message);
}
