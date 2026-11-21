<?php
// everything here is for admin accounts only

function package_error($b, $db) {
    if (!text_ok(isset($b['title']) ? $b['title'] : '', 3, 120)) {
        return t('admin.package.title');
    }
    if (!text_ok(isset($b['category']) ? $b['category'] : '', 2, 40)) {
        return t('admin.package.category');
    }
    if (!text_ok(isset($b['description']) ? $b['description'] : '', 10, 600)) {
        return t('admin.package.description');
    }
    $price = isset($b['price']) ? $b['price'] : '';
    if (!is_numeric($price) || (int) $price < 1 || (int) $price > 10000000) {
        return t('admin.package.price');
    }
    $days = isset($b['duration_days']) ? $b['duration_days'] : '';
    if (!is_numeric($days) || (int) $days < 1 || (int) $days > 60) {
        return t('admin.package.duration');
    }
    $stmt = $db->prepare('SELECT id FROM destinations WHERE id = ?');
    $stmt->execute([isset($b['destination_id']) ? $b['destination_id'] : 0]);
    if (!$stmt->fetch()) {
        return t('admin.package.destination');
    }
    return '';
}

// the "featured" box can arrive as 1, "1", true, 0, "0" or be missing
function is_featured($b) {
    return !empty($b['featured']) && $b['featured'] !== '0' ? 1 : 0;
}

function destination_error($b) {
    if (!text_ok(isset($b['name']) ? $b['name'] : '', 2, 80)) {
        return t('admin.destination.name');
    }
    if (!text_ok(isset($b['country']) ? $b['country'] : '', 2, 60)) {
        return t('admin.destination.country');
    }
    if (isset($b['region']) && $b['region'] !== '' && !text_ok($b['region'], 1, 80)) {
        return t('admin.destination.region');
    }
    if (!text_ok(isset($b['description']) ? $b['description'] : '', 10, 400)) {
        return t('admin.destination.description');
    }
    return '';
}

function testimonial_error($b) {
    if (!text_ok(isset($b['name']) ? $b['name'] : '', 2, 60)) {
        return t('admin.testimonial.name');
    }
    if (!text_ok(isset($b['quote']) ? $b['quote'] : '', 10, 300)) {
        return t('admin.testimonial.quote');
    }
    $rating = isset($b['rating']) ? $b['rating'] : '';
    if (!is_numeric($rating) || (int) $rating < 1 || (int) $rating > 5) {
        return t('admin.testimonial.rating');
    }
    return '';
}

function post_error($b) {
    if (!text_ok(isset($b['title']) ? $b['title'] : '', 5, 140)) {
        return t('admin.post.title');
    }
    if (!text_ok(isset($b['body']) ? $b['body'] : '', 10, 800)) {
        return t('admin.post.text');
    }
    return '';
}

function faq_error($b) {
    if (!text_ok(isset($b['question']) ? $b['question'] : '', 5, 160)) {
        return t('admin.faq.question');
    }
    if (!text_ok(isset($b['answer']) ? $b['answer'] : '', 10, 800)) {
        return t('admin.faq.answer');
    }
    return '';
}

// ---------- bookings ----------
if ($method === 'GET' && $path === '/api/admin/bookings') {
    require_admin();
    $rows = $db->query('SELECT b.*, p.title AS package_title, d.name AS destination_name
        FROM bookings b JOIN packages p ON b.package_id = p.id JOIN destinations d ON p.destination_id = d.id
        ORDER BY b.created_at DESC, b.id DESC')->fetchAll();
    json_response($rows);
}

if ($method === 'PATCH' && preg_match('#^/api/admin/bookings/([0-9]+)$#', $path, $m)) {
    require_admin();
    $b = body();
    $status = isset($b['status']) ? $b['status'] : '';
    if (!in_array($status, rule('bookingStatuses'), true)) {
        json_response(['error' => t('admin.invalid_status')], 400);
    }
    $db->prepare('UPDATE bookings SET status = ? WHERE id = ?')->execute([$status, $m[1]]);
    json_response(['ok' => true]);
}

if ($method === 'GET' && $path === '/api/admin/stats') {
    require_admin();
    json_response([
        'totalBookings' => (int) $db->query('SELECT COUNT(*) FROM bookings')->fetchColumn(),
        'totalUsers' => (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn(),
        'totalPackages' => (int) $db->query('SELECT COUNT(*) FROM packages')->fetchColumn(),
        'pendingBookings' => (int) $db->query("SELECT COUNT(*) FROM bookings WHERE status = 'Pending'")->fetchColumn(),
    ]);
}

// ---------- packages ----------
if ($method === 'POST' && $path === '/api/admin/packages') {
    require_admin();
    $b = body();
    $error = package_error($b, $db);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    $stmt = $db->prepare('INSERT INTO packages (title, destination_id, category, price, duration_days, description, featured) VALUES (?,?,?,?,?,?,?)');
    $stmt->execute([trim($b['title']), $b['destination_id'], trim($b['category']), (int) $b['price'], (int) $b['duration_days'], trim($b['description']), is_featured($b)]);
    json_response(['id' => (int) $db->lastInsertId()], 201);
}

if ($method === 'PUT' && preg_match('#^/api/admin/packages/([0-9]+)$#', $path, $m)) {
    require_admin();
    $b = body();
    $error = package_error($b, $db);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    $stmt = $db->prepare('UPDATE packages SET title = ?, destination_id = ?, category = ?, price = ?, duration_days = ?, description = ?, featured = ? WHERE id = ?');
    $stmt->execute([trim($b['title']), $b['destination_id'], trim($b['category']), (int) $b['price'], (int) $b['duration_days'], trim($b['description']), is_featured($b), $m[1]]);
    if ($stmt->rowCount() === 0) {
        json_response(['error' => t('package.not_found')], 404);
    }
    json_response(['ok' => true]);
}

if ($method === 'DELETE' && preg_match('#^/api/admin/packages/([0-9]+)$#', $path, $m)) {
    require_admin();
    $stmt = $db->prepare('SELECT COUNT(*) FROM bookings WHERE package_id = ?');
    $stmt->execute([$m[1]]);
    if ($stmt->fetchColumn() > 0) {
        json_response(['error' => t('admin.package.has_bookings')], 409);
    }
    $db->prepare('DELETE FROM packages WHERE id = ?')->execute([$m[1]]);
    json_response(['ok' => true]);
}

// ---------- destinations ----------
if ($method === 'POST' && $path === '/api/admin/destinations') {
    require_admin();
    $b = body();
    $error = destination_error($b);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    $region = isset($b['region']) ? trim($b['region']) : '';
    $stmt = $db->prepare('INSERT INTO destinations (name, country, region, description) VALUES (?,?,?,?)');
    $stmt->execute([trim($b['name']), trim($b['country']), $region, trim($b['description'])]);
    json_response(['id' => (int) $db->lastInsertId()], 201);
}

if ($method === 'PUT' && preg_match('#^/api/admin/destinations/([0-9]+)$#', $path, $m)) {
    require_admin();
    $b = body();
    $error = destination_error($b);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    $region = isset($b['region']) ? trim($b['region']) : '';
    $stmt = $db->prepare('UPDATE destinations SET name = ?, country = ?, region = ?, description = ? WHERE id = ?');
    $stmt->execute([trim($b['name']), trim($b['country']), $region, trim($b['description']), $m[1]]);
    if ($stmt->rowCount() === 0) {
        json_response(['error' => t('admin.destination.not_found')], 404);
    }
    json_response(['ok' => true]);
}

if ($method === 'DELETE' && preg_match('#^/api/admin/destinations/([0-9]+)$#', $path, $m)) {
    require_admin();
    $stmt = $db->prepare('SELECT COUNT(*) FROM packages WHERE destination_id = ?');
    $stmt->execute([$m[1]]);
    if ($stmt->fetchColumn() > 0) {
        json_response(['error' => t('admin.destination.has_packages')], 409);
    }
    $db->prepare('DELETE FROM destinations WHERE id = ?')->execute([$m[1]]);
    json_response(['ok' => true]);
}

// ---------- customer accounts ----------
if ($method === 'GET' && $path === '/api/admin/users') {
    require_admin();
    $rows = $db->query('SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) AS booking_count
        FROM users u ORDER BY u.id')->fetchAll();
    json_response($rows);
}

if ($method === 'PATCH' && preg_match('#^/api/admin/users/([0-9]+)$#', $path, $m)) {
    $admin = require_admin();
    $b = body();
    if (!isset($b['is_active'])) {
        json_response(['error' => t('admin.active_required')], 400);
    }
    $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$m[1]]);
    $target = $stmt->fetch();
    if (!$target) {
        json_response(['error' => t('admin.user_not_found')], 404);
    }
    if ($target['role'] === 'admin' || (int) $target['id'] === (int) $admin['id']) {
        json_response(['error' => t('admin.cannot_disable_admin')], 400);
    }
    $db->prepare('UPDATE users SET is_active = ? WHERE id = ?')->execute([$b['is_active'] ? 1 : 0, $target['id']]);
    json_response(['ok' => true]);
}

// ---------- testimonials ----------
if ($method === 'POST' && $path === '/api/admin/testimonials') {
    require_admin();
    $b = body();
    $error = testimonial_error($b);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    $stmt = $db->prepare('INSERT INTO testimonials (name, quote, rating) VALUES (?,?,?)');
    $stmt->execute([trim($b['name']), trim($b['quote']), (int) $b['rating']]);
    json_response(['id' => (int) $db->lastInsertId()], 201);
}

if ($method === 'PUT' && preg_match('#^/api/admin/testimonials/([0-9]+)$#', $path, $m)) {
    require_admin();
    $b = body();
    $error = testimonial_error($b);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    $stmt = $db->prepare('UPDATE testimonials SET name = ?, quote = ?, rating = ? WHERE id = ?');
    $stmt->execute([trim($b['name']), trim($b['quote']), (int) $b['rating'], $m[1]]);
    if ($stmt->rowCount() === 0) {
        json_response(['error' => t('admin.testimonial.not_found')], 404);
    }
    json_response(['ok' => true]);
}

if ($method === 'DELETE' && preg_match('#^/api/admin/testimonials/([0-9]+)$#', $path, $m)) {
    require_admin();
    $db->prepare('DELETE FROM testimonials WHERE id = ?')->execute([$m[1]]);
    json_response(['ok' => true]);
}

// ---------- journal posts ----------
if ($method === 'POST' && $path === '/api/admin/blog') {
    require_admin();
    $b = body();
    $error = post_error($b);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    $stmt = $db->prepare('INSERT INTO blog_posts (title, body) VALUES (?,?)');
    $stmt->execute([trim($b['title']), trim($b['body'])]);
    json_response(['id' => (int) $db->lastInsertId()], 201);
}

if ($method === 'PUT' && preg_match('#^/api/admin/blog/([0-9]+)$#', $path, $m)) {
    require_admin();
    $b = body();
    $error = post_error($b);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    $stmt = $db->prepare('UPDATE blog_posts SET title = ?, body = ? WHERE id = ?');
    $stmt->execute([trim($b['title']), trim($b['body']), $m[1]]);
    if ($stmt->rowCount() === 0) {
        json_response(['error' => t('admin.post.not_found')], 404);
    }
    json_response(['ok' => true]);
}

if ($method === 'DELETE' && preg_match('#^/api/admin/blog/([0-9]+)$#', $path, $m)) {
    require_admin();
    $db->prepare('DELETE FROM blog_posts WHERE id = ?')->execute([$m[1]]);
    json_response(['ok' => true]);
}

// ---------- FAQs ----------
if ($method === 'POST' && $path === '/api/admin/faqs') {
    require_admin();
    $b = body();
    $error = faq_error($b);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    $next = (int) $db->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM faqs')->fetchColumn();
    $stmt = $db->prepare('INSERT INTO faqs (question, answer, sort_order) VALUES (?,?,?)');
    $stmt->execute([trim($b['question']), trim($b['answer']), $next]);
    json_response(['id' => (int) $db->lastInsertId()], 201);
}

if ($method === 'PUT' && preg_match('#^/api/admin/faqs/([0-9]+)$#', $path, $m)) {
    require_admin();
    $b = body();
    $error = faq_error($b);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    $stmt = $db->prepare('UPDATE faqs SET question = ?, answer = ? WHERE id = ?');
    $stmt->execute([trim($b['question']), trim($b['answer']), $m[1]]);
    if ($stmt->rowCount() === 0) {
        json_response(['error' => t('admin.faq.not_found')], 404);
    }
    json_response(['ok' => true]);
}

if ($method === 'DELETE' && preg_match('#^/api/admin/faqs/([0-9]+)$#', $path, $m)) {
    require_admin();
    $db->prepare('DELETE FROM faqs WHERE id = ?')->execute([$m[1]]);
    json_response(['ok' => true]);
}

// ---------- contact messages ----------
if ($method === 'GET' && $path === '/api/admin/messages') {
    require_admin();
    json_response($db->query('SELECT * FROM contact_messages ORDER BY created_at DESC, id DESC')->fetchAll());
}

// ---------- currencies ----------
if ($method === 'GET' && $path === '/api/admin/currencies') {
    require_admin();
    ensure_fresh_rates($db);
    $info = currency_info($db);
    $info['currencies'] = currency_list($db, true);
    json_response($info);
}

if ($method === 'POST' && $path === '/api/admin/currencies/refresh') {
    require_admin();
    save_setting($db, 'rates_last_try', time());
    if (!refresh_rates($db)) {
        json_response(['error' => t('currency.rates_down')], 502);
    }
    save_setting($db, 'rates_last_ok', time());
    $info = currency_info($db);
    $info['currencies'] = currency_list($db, true);
    json_response($info);
}

if ($method === 'POST' && $path === '/api/admin/currencies') {
    require_admin();
    $b = body();
    $code = strtoupper(trim(isset($b['code']) && is_string($b['code']) ? $b['code'] : ''));
    if (!preg_match('/^[A-Z]{3}$/', $code)) {
        json_response(['error' => t('currency.code')], 400);
    }
    if (!text_ok(isset($b['name']) ? $b['name'] : '', 2, 40)) {
        json_response(['error' => t('currency.name')], 400);
    }
    $locale = isset($b['locale']) && is_string($b['locale']) ? trim($b['locale']) : '';
    if (!preg_match('/^[a-z]{2,3}(-[A-Z]{2})?$/', $locale)) {
        json_response(['error' => t('currency.locale')], 400);
    }
    if (find_currency($db, $code, false)) {
        json_response(['error' => t('currency.exists')], 409);
    }
    $live = fetch_live_rates();
    if (!$live) {
        json_response(['error' => t('currency.rates_down')], 502);
    }
    if (!isset($live['rates'][$code]) || !is_numeric($live['rates'][$code]) || $live['rates'][$code] <= 0) {
        json_response(['error' => t('currency.unknown_code')], 400);
    }
    $next = (int) $db->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM currencies')->fetchColumn();
    $stmt = $db->prepare('INSERT INTO currencies (code, name, locale, rate, rate_date, sort_order) VALUES (?,?,?,?,?,?)');
    $stmt->execute([$code, trim($b['name']), $locale, (float) $live['rates'][$code], $live['date'], $next]);
    json_response(['code' => $code], 201);
}

if ($method === 'PATCH' && preg_match('#^/api/admin/currencies/([A-Za-z]{3})$#', $path, $m)) {
    require_admin();
    $row = find_currency($db, $m[1], false);
    if (!$row) {
        json_response(['error' => t('currency.not_found')], 404);
    }
    if ($row['code'] === 'LKR') {
        json_response(['error' => t('currency.lkr_locked')], 400);
    }
    $b = body();
    if (!isset($b['enabled'])) {
        json_response(['error' => t('admin.active_required')], 400);
    }
    $db->prepare('UPDATE currencies SET enabled = ? WHERE code = ?')->execute([$b['enabled'] ? 1 : 0, $row['code']]);
    json_response(['ok' => true]);
}

if ($method === 'DELETE' && preg_match('#^/api/admin/currencies/([A-Za-z]{3})$#', $path, $m)) {
    require_admin();
    $row = find_currency($db, $m[1], false);
    if (!$row) {
        json_response(['error' => t('currency.not_found')], 404);
    }
    if ($row['code'] === 'LKR') {
        json_response(['error' => t('currency.lkr_locked')], 400);
    }
    $db->prepare('DELETE FROM currencies WHERE code = ?')->execute([$row['code']]);
    json_response(['ok' => true]);
}

// ---------- site settings (contact details and links) ----------
if ($method === 'GET' && $path === '/api/admin/site') {
    require_admin();
    json_response(business($db));
}

if ($method === 'PUT' && $path === '/api/admin/site') {
    require_admin();
    $b = body();
    $error = site_error($b);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }
    global $business_keys;
    foreach ($business_keys as $key) {
        if ($key === 'country_code') {
            continue;
        }
        save_setting($db, 'business.' . $key, trim((string) $b[$key]));
    }
    json_response(['ok' => true]);
}
