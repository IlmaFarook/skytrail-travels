<?php

function body() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (is_array($data)) {
        return $data;
    }
    return [];
}

function json_response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function is_valid_email($email) {
    if (strlen($email) > 120) {
        return false;
    }
    return preg_match('#' . rule('emailPattern') . '#', $email) === 1;
}

function is_valid_phone($phone) {
    return preg_match('#' . rule('phonePattern') . '#', $phone) === 1;
}

// long enough, with a letter and a number
function is_strong_password($password) {
    if (strlen($password) < rule('passwordMinLength') || strlen($password) > 72) {
        return false;
    }
    return preg_match('/[A-Za-z]/', $password) && preg_match('/[0-9]/', $password);
}

// true if $value is a string whose trimmed length is between $min and $max
function text_ok($value, $min, $max) {
    if (!is_string($value)) {
        return false;
    }
    $len = mb_strlen(trim($value));
    return $len >= $min && $len <= $max;
}

function require_auth() {
    if (empty($_SESSION['user'])) {
        json_response(['error' => t('auth.login_required')], 401);
    }
    return $_SESSION['user'];
}

function require_admin() {
    if (empty($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
        json_response(['error' => t('auth.admin_required')], 403);
    }
    return $_SESSION['user'];
}

function security_headers() {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
}

function csp_header() {
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; "
        . "style-src 'self'; font-src 'self'; "
        . "img-src 'self' data:; frame-src https://www.openstreetmap.org; connect-src 'self'; "
        . "base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
}

// Turns the photo columns of a destination (or of the destination joined to a
// package) into one "photo" object, or null when it has no photo.
function attach_photo(&$row, $image_key = 'photo_image') {
    $photo = null;
    if (!empty($row[$image_key])) {
        $photo = [
            'image' => $row[$image_key],
            'alt' => $row['photo_alt'],
            'author' => $row['photo_author'],
            'license' => $row['photo_license'],
            'licenseUrl' => $row['photo_license_url'],
            'source' => $row['photo_source'],
        ];
    }
    foreach ([$image_key, 'photo_alt', 'photo_author', 'photo_license', 'photo_license_url', 'photo_source'] as $key) {
        unset($row[$key]);
    }
    $row['photo'] = $photo;
}
