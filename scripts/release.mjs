import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;
const distDir = join(rootDir, 'dist');
const releaseDir = join(rootDir, 'release');
const outputPath = join(releaseDir, `chatgpt-conversation-tree-v${version}.zip`);

mkdirSync(releaseDir, { recursive: true });

try {
  rmSync(outputPath, { force: true });
} catch {
  // The file may not exist yet; that is fine.
}

execFileSync(
  'zip',
  ['-r', '-X', outputPath, '.'],
  {
    cwd: distDir,
    stdio: 'inherit',
  },
);

console.log(`Release package written to ${outputPath}`);
