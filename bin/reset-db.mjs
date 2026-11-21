// Deletes the live database so it is rebuilt from db/seed.php. Every account and
// booking is lost, so it only runs with --yes, and a backup is saved first.
import './env.mjs';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

if (!process.argv.includes('--yes')) {
  console.log('This deletes all accounts and bookings. A backup is saved next to the database first.');
  console.log('Run it again as: npm run db:reset -- --yes');
  process.exit(1);
}
spawnSync('php', ['bin/backup-db.php'], { stdio: 'inherit' });
const live = process.env.SKYTRAIL_DB || 'db/skytrail.db';
for (const suffix of ['', '-shm', '-wal']) rmSync(live + suffix, { force: true });
console.log('Database removed. It is rebuilt from the seed data on the next request.');
