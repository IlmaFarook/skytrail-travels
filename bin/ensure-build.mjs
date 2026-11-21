// public/ is build output and is not kept in git, so build it the first time.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export function ensureBuild() {
  if (existsSync('public/index.html')) return;
  console.log('The site has not been built yet, so it is being built now (about a minute the first time).');
  const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('The build failed, so the site cannot start.');
    process.exit(1);
  }
}
