// Runs a test command against its own server and its own empty database, so the
// tests never touch the real accounts and bookings. Use it through npm test / npm run test:e2e.
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = process.env.TEST_PORT || '3100';
const db = join(tmpdir(), 'skytrail-test.db'); // outside the project, so OneDrive never syncs it
const clean = () => { for (const suffix of ['', '-shm', '-wal']) rmSync(db + suffix, { force: true }); };

clean();
const server = spawn('php', ['-S', `localhost:${port}`, '-t', 'public', 'router.php'], {
  stdio: 'ignore',
  detached: true, // its own process group, so the workers stop with it
  env: { ...process.env, SKYTRAIL_DB: db, SKYTRAIL_NO_BACKUP: '1', PHP_CLI_SERVER_WORKERS: '4' },
});

async function ready() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/api/config`)).ok) return;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('the test server did not start');
}

const finish = (code) => {
  try { process.kill(-server.pid); } catch { /* already stopped */ }
  clean();
  process.exit(code);
};
try {
  await ready();
} catch (err) {
  console.error(err.message);
  finish(1);
}
const [command, ...args] = process.argv.slice(2);
const child = spawn(command, args, { stdio: 'inherit', env: { ...process.env, TEST_URL: `http://localhost:${port}` } });
child.on('exit', code => finish(code ?? 1));
