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

    if (!text_ok($name, 1, 80) || !text_ok($email, 1, 120) || !text_ok($message, 1, 1000)) {
        json_response(['error' => t('error.required_all')], 400);
    }
    if (!is_valid_email($email)) {
        json_response(['error' => t('error.invalid_email')], 400);
    }
    $stmt = $db->prepare('INSERT INTO contact_messages (name, email, message) VALUES (?,?,?)');
    $stmt->execute([trim($name), trim($email), trim($message)]);
    json_response(['message' => t('contact.thanks')], 201);
}
