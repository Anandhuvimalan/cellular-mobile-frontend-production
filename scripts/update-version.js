#!/usr/bin/env node
/**
 * Update version.json with current build information
 * Run this script before each deployment
 */

const fs = require('fs');
const path = require('path');

const versionPath = path.join(__dirname, '../public/version.json');
const packagePath = path.join(__dirname, '../package.json');

// Read package.json for version
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Create version object
const versionData = {
  version: packageJson.version,
  buildTime: new Date().toISOString(),
  buildId: `build-${Date.now()}`
};

// Write to version.json
fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));

console.log('✓ Version updated:', versionData);
console.log(`  Version: ${versionData.version}`);
console.log(`  Build Time: ${versionData.buildTime}`);
console.log(`  Build ID: ${versionData.buildId}`);
