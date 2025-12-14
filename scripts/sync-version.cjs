/**
 * Syncs version from package.json to other files.
 * Runs automatically via npm version lifecycle hook.
 */

const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');
const version = pkg.version;

const files = [
  {
    path: 'manifest.json',
    pattern: /"version": "[\d.]+"/,
    replacement: `"version": "${version}"`,
  },
  {
    path: 'Dockerfile',
    pattern: /LABEL version="[\d.]+"/,
    replacement: `LABEL version="${version}"`,
  },
  {
    path: 'src/server.ts',
    pattern: /const VERSION = '[\d.]+'/,
    replacement: `const VERSION = '${version}'`,
  },
];

console.log(`Syncing version ${version} to files...`);

for (const file of files) {
  const filePath = path.join(__dirname, '..', file.path);
  const content = fs.readFileSync(filePath, 'utf8');
  const updated = content.replace(file.pattern, file.replacement);

  if (content !== updated) {
    fs.writeFileSync(filePath, updated);
    console.log(`  Updated ${file.path}`);
  } else {
    console.log(`  ${file.path} already up to date`);
  }
}

console.log('Version sync complete.');
