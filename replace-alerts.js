/**
 * Script to replace all remaining alert() calls with showToast
 * Run with: node replace-alerts.js
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/dashboard/products/page.tsx',
  'src/app/dashboard/stock-batches/page.tsx',
  'src/app/dashboard/sales/page.tsx',
  'src/app/dashboard/stock-requests/page.tsx',
  'src/app/dashboard/pos/page.tsx',
];

const replacements = [
  // Add import if not present
  {
    search: /^(import.*react-icons\/fi';)\n/m,
    replace: "$1\nimport { showToast } from '@/lib/toast';\n",
    condition: (content) => !content.includes("import { showToast }"),
  },

  // Success messages
  { search: /alert\('([^']*(?:created|updated|deleted|approved|success)[^']*)'\)/gi, replace: "showToast.success('$1')" },
  { search: /alert\("([^"]*(?:created|updated|deleted|approved|success)[^"]*)"\)/gi, replace: 'showToast.success("$1")' },
  { search: /alert\(`([^`]*(?:created|updated|deleted|approved|success)[^`]*)`\)/gi, replace: 'showToast.success(`$1`)' },

  // Error messages - explicit errors
  { search: /alert\('(?:Failed|Error|Permission denied|Invalid|Cannot)[^']*'\)/gi, replace: (match) => match.replace('alert(', 'showToast.error(') },
  { search: /alert\("(?:Failed|Error|Permission denied|Invalid|Cannot)[^"]*"\)/gi, replace: (match) => match.replace('alert(', 'showToast.error(') },
  { search: /alert\(`(?:Failed|Error|Permission denied|Invalid|Cannot)[^`]*`\)/gi, replace: (match) => match.replace('alert(', 'showToast.error(') },

  // Error with variables
  { search: /alert\(error\.response[^)]+\)/g, replace: (match) => match.replace('alert(', 'showToast.error(') },
  { search: /alert\(`Failed[^`]*\$\{[^}]+\}[^`]*`\)/g, replace: (match) => match.replace('alert(', 'showToast.error(') },

  // Remaining alerts (assume they're informational)
  { search: /alert\(/g, replace: 'showToast.info(' },
];

function updateFile(filePath) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;

  // Apply replacements
  replacements.forEach(({ search, replace, condition }) => {
    if (condition && !condition(content)) return;
    content = content.replace(search, replace);
  });

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`ℹ️  No changes: ${filePath}`);
  }
}

console.log('🚀 Starting alert replacement...\n');

filesToUpdate.forEach(updateFile);

console.log('\n✨ Done! All alerts replaced with toast notifications.');
console.log('\n📝 Next steps:');
console.log('1. Review the changes in each file');
console.log('2. Test the application');
console.log('3. Commit the changes');
