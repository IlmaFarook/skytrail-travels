<?php
// Contact details and links, kept in the settings table so staff can edit them.

$business_keys = [
    'address', 'street', 'locality', 'region', 'country_code',
    'phone', 'email', 'founded', 'facebook', 'instagram', 'tiktok', 'map_lat', 'map_lon',
];

function business($db) {
    global $business_keys;
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $cache = [];
    foreach ($business_keys as $key) {
        $cache[$key] = setting($db, 'business.' . $key, '');
    }
    return $cache;
}

function phone_link($phone) {
    return preg_replace('/[^0-9+]/', '', $phone);
}

function business_for_client($db) {
    $b = business($db);
    return [
        'address' => $b['address'],
        'street' => $b['street'],
        'locality' => $b['locality'],
        'region' => $b['region'],
        'countryCode' => $b['country_code'],
        'phone' => $b['phone'],
        'phoneLink' => phone_link($b['phone']),
        'email' => $b['email'],
        'founded' => $b['founded'],
        'social' => ['facebook' => $b['facebook'], 'instagram' => $b['instagram'], 'tiktok' => $b['tiktok']],
        'map' => ['lat' => (float) $b['map_lat'], 'lon' => (float) $b['map_lon']],
    ];
}

// returns an error message, or '' when the settings are fine
function site_error($b) {
    foreach (['address' => [5, 160], 'street' => [2, 100], 'locality' => [2, 60], 'region' => [2, 60]] as $field => $limits) {
        if (!text_ok(isset($b[$field]) ? $b[$field] : '', $limits[0], $limits[1])) {
            return t('site.' . $field, ['min' => $limits[0], 'max' => $limits[1]]);
        }
    }
    if (!is_valid_phone(trim(isset($b['phone']) && is_string($b['phone']) ? $b['phone'] : ''))) {
        return t('booking.invalid_phone');
    }
    if (!is_valid_email(trim(isset($b['email']) && is_string($b['email']) ? $b['email'] : ''))) {
        return t('error.invalid_email');
    }
    $founded = isset($b['founded']) ? $b['founded'] : '';
    if (!is_numeric($founded) || (int) $founded < 1900 || (int) $founded > (int) date('Y')) {
        return t('site.founded');
    }
    foreach (['facebook', 'instagram', 'tiktok'] as $network) {
        $url = isset($b[$network]) && is_string($b[$network]) ? trim($b[$network]) : '';
        if (!preg_match('#^https://[^\s]+$#', $url) || strlen($url) > 200) {
            return t('site.url');
        }
    }
    $lat = isset($b['map_lat']) ? $b['map_lat'] : '';
    $lon = isset($b['map_lon']) ? $b['map_lon'] : '';
    if (!is_numeric($lat) || !is_numeric($lon) || abs($lat) > 90 || abs($lon) > 180) {
        return t('site.map');
    }
    return '';
}
