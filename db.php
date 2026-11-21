<?php

require_once __DIR__ . '/lib/rules.php';

// The database file. Set SKYTRAIL_DB to keep it somewhere else (the tests use their own file).
function db_path(): string
{
    $path = getenv('SKYTRAIL_DB') ?: 'db/skytrail.db';
    return $path[0] === '/' ? $path : __DIR__ . '/' . $path;
}

// A booking reference like ST2611-K7M4QX: prefix, year and month, then six letters and
// digits that are easy to read out on the phone (no 0, O, 1 or I).
function new_booking_reference(PDO $db, string $when = 'now'): string
{
    $letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    $exists = $db->prepare('SELECT 1 FROM bookings WHERE reference = ?');
    do {
        $code = '';
        for ($i = 0; $i < 6; $i++) {
            $code .= $letters[random_int(0, strlen($letters) - 1)];
        }
        $reference = rule('bookingRefPrefix') . date('ym', strtotime($when)) . '-' . $code;
        $exists->execute([$reference]);
    } while ($exists->fetch());
    return $reference;
}

function get_db(): PDO
{
    static $db = null;
    if ($db !== null) {
        return $db;
    }

    $db = new PDO('sqlite:' . db_path());
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('PRAGMA journal_mode = WAL');
    $db->exec('PRAGMA synchronous = FULL'); // a saved booking survives a crash or power cut
    $db->exec('PRAGMA busy_timeout = 5000');
    $db->exec('PRAGMA foreign_keys = ON');
    $db->exec(file_get_contents(__DIR__ . '/db/schema.sql'));

    // CREATE TABLE IF NOT EXISTS skips old tables, so add new columns here.
    $cols = array_column($db->query('PRAGMA table_info(users)')->fetchAll(), 'name');
    if (!in_array('is_active', $cols, true)) {
        $db->exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
    }

    if (!in_array('preferred_currency', $cols, true)) {
        $db->exec('ALTER TABLE users ADD COLUMN preferred_currency TEXT');
    }

    $destCols = array_column($db->query('PRAGMA table_info(destinations)')->fetchAll(), 'name');
    foreach (['image', 'photo_alt', 'photo_author', 'photo_license', 'photo_license_url', 'photo_source'] as $col) {
        if (!in_array($col, $destCols, true)) {
            $db->exec('ALTER TABLE destinations ADD COLUMN ' . $col . ' TEXT');
        }
    }
    $bookingCols = array_column($db->query('PRAGMA table_info(bookings)')->fetchAll(), 'name');
    if (!in_array('reference', $bookingCols, true)) {
        $db->exec('ALTER TABLE bookings ADD COLUMN reference TEXT');
    }
    // bookings made before references existed get one too
    $missing = $db->query('SELECT id, created_at FROM bookings WHERE reference IS NULL')->fetchAll();
    $setReference = $db->prepare('UPDATE bookings SET reference = ? WHERE id = ?');
    foreach ($missing as $old) {
        $setReference->execute([new_booking_reference($db, $old['created_at']), $old['id']]);
    }
    $db->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference)');

    $pkgCols = array_column($db->query('PRAGMA table_info(packages)')->fetchAll(), 'name');
    if (!in_array('featured', $pkgCols, true)) {
        $db->exec('ALTER TABLE packages ADD COLUMN featured INTEGER NOT NULL DEFAULT 0');
    }

    // The demo data goes in once, when the database is new. After that nothing is ever
    // put back, so whatever staff delete or change stays that way.
    require_once __DIR__ . '/db/seed.php';
    $seeded = $db->query("SELECT value FROM settings WHERE key = 'seeded'")->fetchColumn();
    if (!$seeded) {
        // a database from before this flag existed already has its data
        if ((int) $db->query('SELECT COUNT(*) FROM destinations')->fetchColumn() === 0) {
            seed($db);
            seed_currencies($db);
        }
        $db->prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('seeded', ?)")->execute([date('c')]);
    }
    seed_site_settings($db); // only adds missing keys, never changes a saved value

    return $db;
}
