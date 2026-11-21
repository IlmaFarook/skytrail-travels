<?php
// Saves a copy of the live database next to it in a backups folder and keeps the newest ten.
require __DIR__ . '/../db.php';
require __DIR__ . '/../lib/backup.php';

try {
    $file = backup_database();
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
echo $file ? 'Backup saved: ' . backup_folder() . '/' . $file . "\n" : "No database yet, nothing to back up.\n";
