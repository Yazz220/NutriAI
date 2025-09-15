const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.error('Usage: node scripts/install_sample_to_app.js <source_sample_mapped_recipes.json>');
  process.exit(1);
}

const src = process.argv[2];
const destDir = path.join(__dirname, '..', 'data');
const dest = path.join(destDir, 'sampleRecipes.json');

if (!fs.existsSync(src)) {
  console.error('Source file not found:', src);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('Copied', src, '->', dest);
console.log('\nNext steps:');
console.log('- Rebuild/restart the app so the JavaScript bundle can pick up the new file.');
console.log('- If the app already has stored meals in AsyncStorage, clear the app storage or uninstall/reinstall the app to let the new seed be used on first run.');
console.log('- Alternatively, call the `resetMeals()` helper from the Meals context in-app (dev-only) to reload defaults.');
