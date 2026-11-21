<?php
// Copies of the live database. VACUUM INTO makes a consistent copy even while the site is running.

function backup_folder(): string
{
    return dirname(db_path()) . '/backups';
}

// returns the backup's file name, or null when there is nothing to copy
function backup_database(): ?string
{
    $source = db_path();
    if (!is_file($source)) {
        return null;
    }
    $folder = backup_folder();
    if (!is_dir($folder)) {
        mkdir($folder, 0755, true);
    }
    $name = basename($source, '.db');
    $target = $folder . '/' . $name . '-' . date('Ymd-His') . '.db';

    $db = new PDO('sqlite:' . $source);
    // never replace good copies with a copy of a damaged file
    if ($db->query('PRAGMA quick_check')->fetchColumn() !== 'ok') {
        throw new RuntimeException('The database failed its integrity check, so no backup was made.');
    }
    $db->exec("VACUUM INTO '" . str_replace("'", "''", $target) . "'");

    $all = glob($folder . '/' . $name . '-*.db');
    sort($all);
    foreach (array_slice($all, 0, max(0, count($all) - 10)) as $old) {
        unlink($old);
    }
    return basename($target);
}

// one backup a day, taken by the first request of the day
function daily_backup(): void
{
    if (getenv('SKYTRAIL_NO_BACKUP') || !is_file(db_path())) {
        return;
    }
    $today = glob(backup_folder() . '/' . basename(db_path(), '.db') . '-' . date('Ymd') . '-*.db');
    if ($today) {
        return;
    }
    try {
        backup_database();
    } catch (Throwable $e) {
        error_log('SkyTrail backup: ' . $e->getMessage());
    }
}
