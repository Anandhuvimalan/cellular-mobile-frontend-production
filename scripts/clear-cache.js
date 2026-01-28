#!/usr/bin/env node
/**
 * Clear Next.js cache safely
 * Use this when you encounter cache-related issues in development
 */

const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '../.next');
const nodeModulesCacheDir = path.join(__dirname, '../node_modules/.cache');

console.log('🧹 Clearing Next.js cache...\n');

// Function to safely delete directory
function deleteDirectory(dir, name) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✓ Deleted ${name}`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to delete ${name}:`, error.message);
      return false;
    }
  } else {
    console.log(`ℹ ${name} doesn't exist (already clean)`);
    return true;
  }
}

// Clear .next directory
deleteDirectory(nextDir, '.next directory');

// Clear node_modules cache
deleteDirectory(nodeModulesCacheDir, 'node_modules/.cache');

console.log('\n✅ Cache cleared successfully!');
console.log('\n📝 Next steps:');
console.log('   1. npm run dev   (for development)');
console.log('   2. npm run build (for production build)');
