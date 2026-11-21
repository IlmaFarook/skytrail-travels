// Starts PHP's built-in server with a few workers. With one worker, an idle browser
// connection can hold up every other request.
import './env.mjs';
import { spawnSync, spawn } from 'node:child_process';
import { ensureBuild } from './ensure-build.mjs';

ensureBuild();

// keep a copy of the data every time the site starts
spawnSync('php', ['bin/backup-db.php'], { stdio: 'inherit' });

const port = process.env.PORT || '3000';
const php = spawn('php', ['-S', `localhost:${port}`, '-t', 'public', 'router.php'], {
  stdio: 'inherit',
  env: { ...process.env, PHP_CLI_SERVER_WORKERS: process.env.PHP_CLI_SERVER_WORKERS || '4' },
});
php.on('exit', code => process.exit(code ?? 0));
