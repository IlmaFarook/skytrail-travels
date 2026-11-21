<?php
// routes anyone can call without logging in

// ids of the packages that share the lowest value of a field (a tie gives several)
function lowest_ids($packages, $field) {
    $min = min(array_column($packages, $field));
    $ids = [];
    foreach ($packages as $p) {
        if ($p[$field] == $min) {
            $ids[] = $p['id'];
        }
    }
    return $ids;
}

if ($method === 'GET' && $path === '/api/config') {
    json_response(rules_for_client());
}

if ($method === 'GET' && $path === '/api/site') {
    json_response([
        'business' => business_for_client($db),
        'stats' => [
            'destinations' => (int) $db->query('SELECT COUNT(*) FROM destinations')->fetchColumn(),
            'packages' => (int) $db->query('SELECT COUNT(*) FROM packages')->fetchColumn(),
        ],
    ]);
}

// search suggestions: matches for what the visitor typed, plus the most popular destinations
if ($method === 'GET' && $path === '/api/suggest') {
    $text = trim(mb_substr(isset($_GET['q']) ? (string) $_GET['q'] : '', 0, 60));
    $matches = [];

    if (mb_strlen($text) >= rule('suggestMinChars')) {
        $like = like_pattern($text);
        $start = addcslashes($text, '%_\\') . '%';
        $limit = rule('suggestMax');

        $stmt = $db->prepare("SELECT d.id, d.name, d.country, COUNT(p.id) AS journeys
            FROM destinations d LEFT JOIN packages p ON p.destination_id = d.id
            WHERE d.name LIKE :like ESCAPE '\\' OR d.country LIKE :like ESCAPE '\\' OR d.region LIKE :like ESCAPE '\\'
            GROUP BY d.id ORDER BY d.name LIKE :start ESCAPE '\\' DESC, d.name LIMIT $limit");
        $stmt->execute(['like' => $like, 'start' => $start]);
        foreach ($stmt->fetchAll() as $row) {
            $matches[] = [
                'type' => 'destination',
                'id' => (int) $row['id'],
                'title' => $row['name'],
                'subtitle' => t('suggest.destination', ['country' => $row['country'], 'count' => $row['journeys']]),
            ];
        }

        $stmt = $db->prepare("SELECT p.id, p.title, p.duration_days, d.name AS destination, d.country
            FROM packages p JOIN destinations d ON p.destination_id = d.id
            WHERE p.title LIKE :like ESCAPE '\\' OR p.category LIKE :like ESCAPE '\\'
            ORDER BY p.title LIKE :start ESCAPE '\\' DESC, p.title LIMIT $limit");
        $stmt->execute(['like' => $like, 'start' => $start]);
        foreach ($stmt->fetchAll() as $row) {
            $matches[] = [
                'type' => 'package',
                'id' => (int) $row['id'],
                'title' => $row['title'],
                'subtitle' => t('suggest.package', [
                    'place' => $row['destination'] . ', ' . $row['country'],
                    'length' => t('page.days', ['count' => $row['duration_days'], 'days' => $row['duration_days']]),
                ]),
            ];
        }
        $matches = array_slice($matches, 0, $limit);
    }

    // popular = most bookings (cancelled ones do not count), then most journeys
    $stmt = $db->query("SELECT d.id, d.name, d.country, COUNT(DISTINCT p.id) AS journeys, COUNT(DISTINCT b.id) AS bookings
        FROM destinations d JOIN packages p ON p.destination_id = d.id
        LEFT JOIN bookings b ON b.package_id = p.id AND b.status != 'Cancelled'
        GROUP BY d.id ORDER BY bookings DESC, journeys DESC, d.name LIMIT " . (int) rule('popularMax'));
    $popular = [];
    foreach ($stmt->fetchAll() as $row) {
        $popular[] = [
            'id' => (int) $row['id'],
            'title' => $row['name'],
            'subtitle' => t('suggest.destination', ['country' => $row['country'], 'count' => $row['journeys']]),
        ];
    }

    json_response(['matches' => $matches, 'popular' => $popular]);
}

if ($method === 'GET' && $path === '/api/destinations') {
    $rows = $db->query('SELECT * FROM destinations ORDER BY name')->fetchAll();
    foreach ($rows as &$row) {
        attach_photo($row, 'image');
    }
    json_response($rows);
}

if ($method === 'GET' && $path === '/api/packages') {
    $sql = 'SELECT p.*, d.name AS destination_name, d.country AS destination_country, d.image AS photo_image, d.photo_alt, d.photo_author, d.photo_license, d.photo_license_url, d.photo_source
            FROM packages p JOIN destinations d ON p.destination_id = d.id WHERE 1=1';
    $params = [];
    if (!empty($_GET['featured'])) {
        $sql .= ' AND p.featured = 1';
    }
    if (!empty($_GET['destination'])) {
        $sql .= ' AND d.id = ?';
        $params[] = $_GET['destination'];
    }
    if (!empty($_GET['category'])) {
        $sql .= ' AND p.category = ?';
        $params[] = $_GET['category'];
    }
    if (!empty($_GET['minPrice'])) {
        $sql .= ' AND p.price >= ?';
        $params[] = (int) $_GET['minPrice'];
    }
    if (!empty($_GET['maxPrice'])) {
        $sql .= ' AND p.price <= ?';
        $params[] = (int) $_GET['maxPrice'];
    }
    if (!empty($_GET['maxDuration'])) {
        $sql .= ' AND p.duration_days <= ?';
        $params[] = (int) $_GET['maxDuration'];
    }
    if (!empty($_GET['q'])) {
        $sql .= ' AND (p.title LIKE ? OR d.name LIKE ?)';
        $params[] = '%' . $_GET['q'] . '%';
        $params[] = '%' . $_GET['q'] . '%';
    }
    $sql .= ' ORDER BY p.title';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $currency = selected_currency($db);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        add_package_prices($row, $currency);
        attach_photo($row);
    }
    json_response($rows);
}

if ($method === 'GET' && preg_match('#^/api/packages/([0-9]+)$#', $path, $m)) {
    $stmt = $db->prepare('SELECT p.*, d.name AS destination_name, d.country AS destination_country,
            d.description AS destination_description, d.image AS photo_image, d.photo_alt, d.photo_author, d.photo_license, d.photo_license_url, d.photo_source
        FROM packages p JOIN destinations d ON p.destination_id = d.id WHERE p.id = ?');
    $stmt->execute([$m[1]]);
    $row = $stmt->fetch();
    if (!$row) {
        json_response(['error' => t('package.not_found')], 404);
    }
    add_package_prices($row, selected_currency($db));
    attach_photo($row);
    json_response($row);
}

// up to compareMax packages side by side, with the best one in each row worked out here
if ($method === 'GET' && $path === '/api/compare') {
    $ids = [];
    foreach (explode(',', isset($_GET['ids']) ? (string) $_GET['ids'] : '') as $id) {
        if ((int) $id > 0 && !in_array((int) $id, $ids, true)) {
            $ids[] = (int) $id;
        }
    }
    if (count($ids) === 0) {
        json_response(['error' => t('compare.none')], 400);
    }
    if (count($ids) > rule('compareMax')) {
        json_response(['error' => t('compare.too_many', ['max' => rule('compareMax')])], 400);
    }
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $db->prepare('SELECT p.*, d.name AS destination_name, d.country AS destination_country, d.image AS photo_image, d.photo_alt, d.photo_author, d.photo_license, d.photo_license_url, d.photo_source
        FROM packages p JOIN destinations d ON p.destination_id = d.id WHERE p.id IN (' . $marks . ')');
    $stmt->execute($ids);
    $found = [];
    foreach ($stmt->fetchAll() as $row) {
        $found[$row['id']] = $row;
    }
    $currency = selected_currency($db);
    $packages = [];
    foreach ($ids as $id) {
        if (isset($found[$id])) {
            $row = $found[$id];
            add_package_prices($row, $currency);
            attach_photo($row);
            $packages[] = $row;
        }
    }
    $best = null;
    if (count($packages) > 1) {
        $best = [
            'price' => lowest_ids($packages, 'price'),
            'duration' => lowest_ids($packages, 'duration_days'),
            'value' => lowest_ids($packages, 'price_per_day'),
        ];
    }
    json_response(['currency' => $currency['code'], 'packages' => $packages, 'best' => $best]);
}

if ($method === 'GET' && $path === '/api/categories') {
    $rows = $db->query('SELECT DISTINCT category FROM packages ORDER BY category')->fetchAll();
    json_response(array_column($rows, 'category'));
}

if ($method === 'GET' && $path === '/api/testimonials') {
    json_response($db->query('SELECT * FROM testimonials ORDER BY id DESC')->fetchAll());
}

if ($method === 'GET' && $path === '/api/currencies') {
    ensure_fresh_rates($db);
    $info = currency_info($db);
    $info['selected'] = selected_currency($db)['code'];
    $info['currencies'] = currency_list($db);
    json_response($info);
}

// remember the visitor's choice (and keep it on the account when logged in)
if ($method === 'PUT' && $path === '/api/currency') {
    $b = body();
    $row = find_currency($db, isset($b['code']) ? $b['code'] : '');
    if (!$row) {
        json_response(['error' => t('currency.invalid')], 400);
    }
    $_SESSION['currency'] = $row['code'];
    if (!empty($_SESSION['user'])) {
        $db->prepare('UPDATE users SET preferred_currency = ? WHERE id = ?')->execute([$row['code'], $_SESSION['user']['id']]);
    }
    json_response(['selected' => $row['code']]);
}

if ($method === 'GET' && $path === '/api/blog') {
    json_response($db->query('SELECT * FROM blog_posts ORDER BY id')->fetchAll());
}

if ($method === 'GET' && $path === '/api/faqs') {
    json_response($db->query('SELECT * FROM faqs ORDER BY sort_order, id')->fetchAll());
}

if ($method === 'POST' && $path === '/api/contact') {
    $b = body();
    $name = isset($b['name']) ? $b['name'] : '';
    $email = isset($b['email']) ? $b['email'] : '';
    $message = isset($b['message']) ? $b['message'] : '';

    if (!is_string($name) || trim($name) === '' || !is_string($email) || trim($email) === '' || !is_string($message) || trim($message) === '') {
        json_response(['error' => t('error.required_all')], 400);
    }
    if (!is_valid_name($name)) {
        json_response(['error' => t('error.invalid_name', ['min' => rule('nameMin'), 'max' => rule('nameMax')])], 400);
    }
    if (!text_ok($message, 1, rule('messageMax'))) {
        json_response(['error' => t('contact.too_long', ['max' => rule('messageMax')])], 400);
    }
    if (!is_valid_email($email)) {
        json_response(['error' => t('error.invalid_email')], 400);
    }
    $stmt = $db->prepare('INSERT INTO contact_messages (name, email, message) VALUES (?,?,?)');
    $stmt->execute([trim($name), trim($email), trim($message)]);
    json_response(['message' => t('contact.thanks')], 201);
}
