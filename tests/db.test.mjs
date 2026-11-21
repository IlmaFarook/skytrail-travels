// Checks that the database keeps its data. Each test uses its own file in the temp folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const folder = mkdtempSync(join(tmpdir(), 'skytrail-db-test-'));
const file = join(folder, 'live.db');
const env = { ...process.env, SKYTRAIL_DB: file, SKYTRAIL_NO_BACKUP: '1' };

// runs a bit of PHP in a new process, like a new request or a server restart
function php(code) {
  const r = spawnSync('php', ['-r', `chdir('${process.cwd()}'); require 'db.php'; require 'lib/backup.php'; $db = get_db(); ${code}`], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout.trim();
}

test.after(() => rmSync(folder, { recursive: true, force: true }));

test('a new database gets the demo data once', () => {
  assert.ok(Number(php("echo $db->query('SELECT COUNT(*) FROM packages')->fetchColumn();")) >= 21);
  assert.equal(php("echo $db->query(\"SELECT COUNT(*) FROM settings WHERE key = 'seeded'\")->fetchColumn();"), '1');
});

test('data added or deleted by people is still the same after a restart', () => {
  php("$db->exec(\"INSERT INTO users (name, email, password_hash, role) VALUES ('Ilma Farook', 'ilma@example.com', 'x', 'customer')\");");
  php("$db->exec('DELETE FROM bookings'); $db->exec('DELETE FROM packages'); $db->exec('DELETE FROM destinations');");
  // several restarts: nothing is put back and nothing is lost
  for (let i = 0; i < 3; i++) {
    assert.equal(php("echo $db->query('SELECT COUNT(*) FROM destinations')->fetchColumn();"), '0');
    assert.equal(php("echo $db->query('SELECT COUNT(*) FROM packages')->fetchColumn();"), '0');
    assert.equal(php("echo $db->query(\"SELECT COUNT(*) FROM users WHERE email = 'ilma@example.com'\")->fetchColumn();"), '1');
  }
});

test('a changed business setting is not overwritten when the site starts again', () => {
  php("$db->exec(\"UPDATE settings SET value = '+94 81 222 3344' WHERE key = 'business.phone'\");");
  assert.equal(php("echo $db->query(\"SELECT value FROM settings WHERE key = 'business.phone'\")->fetchColumn();"), '+94 81 222 3344');
});

test('a backup can be made and holds the same data', () => {
  const name = php("echo backup_database();");
  const copy = join(folder, 'backups', name);
  assert.ok(existsSync(copy));
  const count = spawnSync('php', ['-r', `echo (new PDO('sqlite:${copy}'))->query("SELECT COUNT(*) FROM users WHERE email = 'ilma@example.com'")->fetchColumn();`], { encoding: 'utf8' }).stdout;
  assert.equal(count, '1');
  assert.ok(readdirSync(join(folder, 'backups')).length >= 1);
});
