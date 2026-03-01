const { execSync } = require('child_process');
const fs = require('fs');

let hash = 'unknown';
try {
  hash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {}

fs.writeFileSync(
  './src/git-hash.ts',
  `export const GIT_HASH = '${hash}';\n`
);