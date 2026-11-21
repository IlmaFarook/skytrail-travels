<?php
// customer booking routes (all need a login)

function valid_future_date($date) {
    if (!is_string($date)) {
        return false;
    }
    $d = DateTime::createFromFormat('Y-m-d', $date);
    if (!$d || $d->format('Y-m-d') !== $date) {
        return false;
    }
    return $date >= min_travel_date() && $date <= max_travel_date();
}

// the total price of a booking row, in the visitor's currency
function add_booking_prices(&$row, $currency) {
    $row['currency'] = $currency['code'];
    $row['total_price'] = $row['price'] * $row['travellers'];
    $row['total_converted'] = convert_lkr($row['total_price'], $currency);
}

// returns an error message, or '' if the booking details are fine
function booking_error($b, $check_name = true) {
    $name = isset($b['full_name']) ? $b['full_name'] : '';
    $email = isset($b['email']) ? $b['email'] : '';
    $phone = isset($b['phone']) ? $b['phone'] : '';
    $travellers = isset($b['travellers']) ? $b['travellers'] : '';

    if (!is_string($name) || trim($name) === '' || !is_string($email) || trim($email) === '' || !is_string($phone) || trim($phone) === '' || $travellers === '') {
        return t('booking.required');
    }
    if ($check_name && !is_valid_name($name)) {
        return t('error.invalid_name', ['min' => rule('nameMin'), 'max' => rule('nameMax')]);
    }
    if (!is_valid_email(trim($email))) {
        return t('error.invalid_email');
    }
    if (!is_valid_phone(trim($phone))) {
        return t('booking.invalid_phone');
    }
    $date = isset($b['travel_date']) ? $b['travel_date'] : '';
    if (!valid_future_date($date)) {
        return is_string($date) && $date > max_travel_date()
            ? t('booking.far_date', ['date' => max_travel_date()])
            : t('booking.past_date');
    }
    if (!is_numeric($travellers) || (int) $travellers < rule('minTravellers') || (int) $travellers > rule('maxTravellers')) {
        return t('booking.travellers_range', ['min' => rule('minTravellers'), 'max' => rule('maxTravellers')]);
    }
    $requests = isset($b['special_requests']) ? $b['special_requests'] : '';
    if (!is_string($requests) || mb_strlen($requests) > rule('specialRequestsMax')) {
        return t('booking.requests_long', ['max' => rule('specialRequestsMax')]);
    }
    return '';
}

if ($method === 'POST' && $path === '/api/bookings') {
    $user = require_auth();
    $b = body();

    if (empty($b['package_id'])) {
        json_response(['error' => t('booking.required')], 400);
    }
    $error = booking_error($b);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }

    $stmt = $db->prepare('SELECT id FROM packages WHERE id = ?');
    $stmt->execute([$b['package_id']]);
    if (!$stmt->fetch()) {
        json_response(['error' => t('booking.package_missing')], 404);
    }

    $special = isset($b['special_requests']) ? trim($b['special_requests']) : '';
    $reference = new_booking_reference($db);
    $stmt = $db->prepare('INSERT INTO bookings (user_id, package_id, full_name, email, phone, travel_date, travellers, special_requests, reference)
        VALUES (?,?,?,?,?,?,?,?,?)');
    $stmt->execute([$user['id'], $b['package_id'], trim($b['full_name']), trim($b['email']), trim($b['phone']),
        $b['travel_date'], (int) $b['travellers'], $special, $reference]);

    json_response(['id' => (int) $db->lastInsertId(), 'reference' => $reference, 'message' => t('booking.submitted')], 201);
}

if ($method === 'GET' && $path === '/api/bookings/mine') {
    $user = require_auth();
    $stmt = $db->prepare('SELECT b.*, p.title AS package_title, p.price FROM bookings b
        JOIN packages p ON b.package_id = p.id WHERE b.user_id = ? ORDER BY b.created_at DESC, b.id DESC');
    $stmt->execute([$user['id']]);
    $currency = selected_currency($db);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        add_booking_prices($row, $currency);
    }
    json_response($rows);
}

// one of your own bookings by its reference (used by the confirmation page)
if ($method === 'GET' && preg_match('#^/api/bookings/reference/([A-Za-z0-9-]{6,20})$#', $path, $m)) {
    $user = require_auth();
    $stmt = $db->prepare('SELECT b.*, p.title AS package_title, p.price, d.name AS destination_name, d.country AS destination_country
        FROM bookings b JOIN packages p ON b.package_id = p.id JOIN destinations d ON p.destination_id = d.id
        WHERE b.reference = ? AND b.user_id = ?');
    $stmt->execute([strtoupper($m[1]), $user['id']]);
    $row = $stmt->fetch();
    if (!$row) {
        json_response(['error' => t('booking.not_found')], 404);
    }
    add_booking_prices($row, selected_currency($db));
    json_response($row);
}

// edit one of your own bookings (only while it is still Pending)
if ($method === 'PATCH' && preg_match('#^/api/bookings/([0-9]+)$#', $path, $m)) {
    $user = require_auth();
    $stmt = $db->prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?');
    $stmt->execute([$m[1], $user['id']]);
    $booking = $stmt->fetch();
    if (!$booking) {
        json_response(['error' => t('booking.not_found')], 404);
    }
    if ($booking['status'] !== 'Pending') {
        json_response(['error' => t('booking.edit_locked')], 409);
    }

    $b = body();
    $b['full_name'] = $booking['full_name'];
    $b['email'] = $booking['email'];
    $error = booking_error($b, false);
    if ($error !== '') {
        json_response(['error' => $error], 400);
    }

    $special = isset($b['special_requests']) ? trim($b['special_requests']) : '';
    $stmt = $db->prepare('UPDATE bookings SET phone = ?, travel_date = ?, travellers = ?, special_requests = ? WHERE id = ?');
    $stmt->execute([trim($b['phone']), $b['travel_date'], (int) $b['travellers'], $special, $booking['id']]);
    json_response(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/api/bookings/([0-9]+)/cancel$#', $path, $m)) {
    $user = require_auth();
    $stmt = $db->prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?');
    $stmt->execute([$m[1], $user['id']]);
    $booking = $stmt->fetch();
    if (!$booking) {
        json_response(['error' => t('booking.not_found')], 404);
    }
    if ($booking['status'] !== 'Pending' && $booking['status'] !== 'Confirmed') {
        json_response(['error' => t('booking.cancel_locked')], 409);
    }
    $db->prepare("UPDATE bookings SET status = 'Cancelled' WHERE id = ?")->execute([$booking['id']]);
    json_response(['ok' => true]);
}
