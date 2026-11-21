<?php

date_default_timezone_set('Asia/Colombo');

require __DIR__ . '/db.php';
require __DIR__ . '/lib/lang.php';
require __DIR__ . '/lib/rules.php';
require __DIR__ . '/lib/helpers.php';
require __DIR__ . '/lib/currency.php';
require __DIR__ . '/lib/site.php';
require __DIR__ . '/lib/seo.php';
require __DIR__ . '/lib/prerender.php';

// if the file exists inside public/ (JS, CSS, images) let PHP serve it as it is
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (is_file(__DIR__ . '/public' . $uri)) {
    return false;
}

security_headers();

session_set_cookie_params([
    'lifetime' => 60 * 60 * 4,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

$path = rtrim($uri, '/');
if ($path === '') {
    $path = '/';
}
$method = $_SERVER['REQUEST_METHOD'];
$db = get_db();

if ($path === '/robots.txt') {
    show_robots();
    exit;
}
if ($path === '/sitemap.xml') {
    show_sitemap($db);
    exit;
}

// every non-API page gets the React shell, with the title and meta tags
// for that page filled in here
if (strpos($path, '/api/') !== 0) {
    $meta = get_page_meta($path, $db);
    if ($meta === null) {
        http_response_code(404);
        $meta = [
            'title' => t('meta.not_found.title'),
            'description' => t('meta.not_found.description'),
            'noindex' => true,
            'jsonld' => null,
        ];
    }
    show_page($meta, $path, prerender_page($path, $db));
    exit;
}

require __DIR__ . '/routes/public.php';
require __DIR__ . '/routes/auth.php';
require __DIR__ . '/routes/bookings.php';
require __DIR__ . '/routes/admin.php';

json_response(['error' => t('error.not_found')], 404);
