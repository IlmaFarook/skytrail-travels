<?php
// Fetches today's exchange rates. Run from cron to keep them current, e.g.:
//   0 7 * * * php /path/to/skytrail-travels/bin/refresh-rates.php

require __DIR__ . '/../db.php';
require __DIR__ . '/../lib/currency.php';

$db = get_db();
save_setting($db, 'rates_last_try', time());
if (refresh_rates($db)) {
    save_setting($db, 'rates_last_ok', time());
    $info = currency_info($db);
    echo 'Rates updated (' . $info['updated'] . "), next update " . $info['nextUpdate'] . "\n";
} else {
    echo "Could not reach the exchange-rate service.\n";
    exit(1);
}
