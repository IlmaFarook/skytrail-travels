<?php

function get_db(): PDO
{
    static $db = null;
    if ($db !== null) {
        return $db;
    }

    $dbPath = __DIR__ . '/db/skytrail.db';
    $db = new PDO('sqlite:' . $dbPath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('PRAGMA journal_mode = WAL');
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
    $pkgCols = array_column($db->query('PRAGMA table_info(packages)')->fetchAll(), 'name');
    if (!in_array('featured', $pkgCols, true)) {
        $db->exec('ALTER TABLE packages ADD COLUMN featured INTEGER NOT NULL DEFAULT 0');
    }

    require_once __DIR__ . '/db/seed.php';
    seed($db);
    seed_currencies($db);
    seed_site_settings($db);

    return $db;
}
