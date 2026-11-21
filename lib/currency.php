<?php
// Prices are stored in LKR. "rate" is what one LKR is worth in that currency.
// Rates come from the Exchange Rate API, which updates once a day. A request
// that converts a price fetches new rates first if there are any.

function setting($db, $key, $default = '0') {
    $stmt = $db->prepare('SELECT value FROM settings WHERE key = ?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value === false ? $default : $value;
}

function save_setting($db, $key, $value) {
    $db->prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')->execute([$key, (string) $value]);
}

// returns ['rates' => [code => rate], 'date' => 'YYYY-MM-DD'] or null
function fetch_live_rates() {
    // the http timeout below covers reading only, so cap the connection wait as well
    ini_set('default_socket_timeout', '4');
    $context = stream_context_create(['http' => ['timeout' => 4, 'header' => "User-Agent: SkyTrailTravels\r\n"]]);
    $raw = @file_get_contents('https://open.er-api.com/v6/latest/LKR', false, $context);
    if ($raw === false) {
        return null;
    }
    $data = json_decode($raw, true);
    if (!is_array($data) || ($data['result'] ?? '') !== 'success' || empty($data['rates'])) {
        return null;
    }
    $next = strtotime($data['time_next_update_utc'] ?? '');
    return [
        'rates' => $data['rates'],
        'date' => date('Y-m-d', strtotime($data['time_last_update_utc'] ?? 'now')),
        'next' => $next ? $next : time() + 6 * 3600,
    ];
}

// returns true if new rates were saved
function refresh_rates($db) {
    $live = fetch_live_rates();
    if (!$live) {
        return false;
    }
    // the provider is sometimes a little late, so never check again sooner than an hour from now
    save_setting($db, 'rates_next_update', max($live['next'], time() + 3600));
    $update = $db->prepare('UPDATE currencies SET rate = ?, rate_date = ? WHERE code = ?');
    foreach ($db->query("SELECT code FROM currencies WHERE code != 'LKR'")->fetchAll(PDO::FETCH_COLUMN) as $code) {
        if (isset($live['rates'][$code]) && is_numeric($live['rates'][$code]) && $live['rates'][$code] > 0) {
            $update->execute([(float) $live['rates'][$code], $live['date'], $code]);
        }
    }
    return true;
}

// fetch new rates once the provider has published them; after a failed try wait 15 minutes
function ensure_fresh_rates($db) {
    $last_try = (int) setting($db, 'rates_last_try');
    $last_ok = (int) setting($db, 'rates_last_ok');
    $next_update = (int) setting($db, 'rates_next_update');

    if ($last_ok > 0 && time() < $next_update) {
        return;
    }
    if ($last_try > $last_ok && time() - $last_try < 15 * 60) {
        return;
    }
    save_setting($db, 'rates_last_try', time());
    if (refresh_rates($db)) {
        save_setting($db, 'rates_last_ok', time());
    }
}

function currency_list($db, $include_disabled = false) {
    $sql = 'SELECT code, name, locale, rate, rate_date, enabled FROM currencies';
    if (!$include_disabled) {
        $sql .= ' WHERE enabled = 1';
    }
    $rows = $db->query($sql . ' ORDER BY sort_order, code')->fetchAll();
    foreach ($rows as &$row) {
        $row['rate'] = (float) $row['rate'];
        $row['enabled'] = (int) $row['enabled'];
    }
    return $rows;
}

function currency_info($db) {
    $dates = array_filter(array_column(currency_list($db, true), 'rate_date'));
    return [
        'base' => 'LKR',
        'updated' => $dates ? max($dates) : null,
        'source' => (int) setting($db, 'rates_last_ok') > 0 ? 'live' : 'fallback',
        'nextUpdate' => (int) setting($db, 'rates_next_update') > 0 ? date('c', (int) setting($db, 'rates_next_update')) : null,
    ];
}

function find_currency($db, $code, $only_enabled = true) {
    $sql = 'SELECT * FROM currencies WHERE code = ?' . ($only_enabled ? ' AND enabled = 1' : '');
    $stmt = $db->prepare($sql);
    $stmt->execute([strtoupper((string) $code)]);
    return $stmt->fetch();
}

// ?currency=USD wins, then the visitor's saved choice, then LKR
function selected_currency($db) {
    ensure_fresh_rates($db);
    $code = $_GET['currency'] ?? ($_SESSION['currency'] ?? 'LKR');
    $row = find_currency($db, $code);
    return $row ? $row : find_currency($db, 'LKR', false);
}

// on login the account's saved currency wins; if it has none, keep what the visitor already chose
function sync_currency_on_login($db, $user_id, $preferred) {
    if ($preferred && find_currency($db, $preferred)) {
        $_SESSION['currency'] = $preferred;
    } elseif (!empty($_SESSION['currency'])) {
        $db->prepare('UPDATE users SET preferred_currency = ? WHERE id = ?')->execute([$_SESSION['currency'], $user_id]);
    }
}

function convert_lkr($amount, $currency) {
    return (int) round($amount * $currency['rate']);
}

// adds the converted prices to a package row
function add_package_prices(&$package, $currency) {
    $per_day = $package['price'] / $package['duration_days'];
    $package['currency'] = $currency['code'];
    $package['price_converted'] = convert_lkr($package['price'], $currency);
    $package['price_per_day'] = (int) round($per_day);
    $package['price_per_day_converted'] = convert_lkr($per_day, $currency);
}
