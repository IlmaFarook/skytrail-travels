import './env.mjs';
import { spawnSync } from 'node:child_process';

const result = spawnSync('php', ['bin/backup-db.php'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
