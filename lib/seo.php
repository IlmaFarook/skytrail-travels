<?php
// Page titles, descriptions and structured data, set on the server.

function site_url() {
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    if (!preg_match('/^[A-Za-z0-9.\-]+(:[0-9]+)?$/', $host)) {
        $host = 'localhost';
    }
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    return ($https ? 'https' : 'http') . '://' . $host;
}

function cut($text, $max) {
    if (mb_strlen($text) <= $max) {
        return $text;
    }
    return rtrim(mb_substr($text, 0, $max - 1)) . '…';
}

// returns null if the route doesn't exist
function get_page_meta($path, $db) {
    // route => [language key, noindex]
    $pages = [
        '/' => ['home', false],
        '/destinations' => ['destinations', false],
        '/gallery' => ['gallery', false],
        '/about' => ['about', false],
        '/privacy' => ['privacy', false],
        '/credits' => ['credits', false],
        '/compare' => ['compare', true],
        '/login' => ['login', true],
        '/register' => ['register', true],
        '/booking' => ['booking', true],
        '/my-bookings' => ['my_bookings', true],
        '/admin' => ['admin', true],
    ];

    if (isset($pages[$path])) {
        $name = $pages[$path][0];
        $meta = [
            'title' => t('meta.' . $name . '.title'),
            'description' => t('meta.' . $name . '.description'),
            'noindex' => $pages[$path][1],
            'jsonld' => null,
            'image' => $path === '/' ? 'ella' : null,
            'image_sizes' => '(max-width: 900px) 100vw, 520px',
        ];
        if ($path === '/about') {
            $questions = [];
            foreach ($db->query('SELECT question, answer FROM faqs ORDER BY sort_order, id')->fetchAll() as $f) {
                $questions[] = [
                    '@type' => 'Question',
                    'name' => $f['question'],
                    'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f['answer']],
                ];
            }
            $meta['jsonld'] = ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $questions];
        }
        if ($path === '/') {
            $meta['jsonld'] = [
                '@context' => 'https://schema.org',
                '@type' => 'TravelAgency',
                'name' => t('brand'),
                'url' => site_url() . '/',
                'telephone' => phone_link(business($db)['phone']),
                'email' => business($db)['email'],
                'foundingDate' => business($db)['founded'],
                'address' => [
                    '@type' => 'PostalAddress',
                    'streetAddress' => business($db)['street'],
                    'addressLocality' => business($db)['locality'],
                    'addressRegion' => business($db)['region'],
                    'addressCountry' => business($db)['country_code'],
                ],
            ];
        }
        return $meta;
    }

    if (preg_match('#^/packages/([0-9]+)$#', $path, $m)) {
        $stmt = $db->prepare('SELECT p.*, d.name AS destination_name, d.country AS destination_country, d.image AS photo_image
            FROM packages p JOIN destinations d ON p.destination_id = d.id WHERE p.id = ?');
        $stmt->execute([$m[1]]);
        $p = $stmt->fetch();
        if (!$p) {
            return null;
        }
        $desc = t('meta.package.description', [
            'description' => $p['description'],
            'price' => number_format($p['price']),
            'days' => $p['duration_days'],
        ]);
        return [
            'title' => t('meta.package.title', ['title' => $p['title'], 'destination' => $p['destination_name']]),
            'description' => cut($desc, 155),
            'noindex' => false,
            'image' => $p['photo_image'],
            'image_sizes' => '(max-width: 900px) 100vw, 700px',
            'jsonld' => [
                '@context' => 'https://schema.org',
                '@type' => 'TouristTrip',
                'name' => $p['title'],
                'description' => $p['description'],
                'touristType' => $p['category'],
                'itinerary' => ['@type' => 'Place', 'name' => $p['destination_name'] . ', ' . $p['destination_country']],
                'offers' => [
                    '@type' => 'Offer',
                    'price' => (int) $p['price'],
                    'priceCurrency' => 'LKR',
                    'url' => site_url() . '/packages/' . $p['id'],
                ],
            ],
        ];
    }

    return null;
}

function show_page($meta, $path, $content = '') {
    $html = file_get_contents(__DIR__ . '/../public/index.html');
    $url = site_url() . $path;
    $title = htmlspecialchars($meta['title'], ENT_QUOTES, 'UTF-8');
    $desc = htmlspecialchars($meta['description'], ENT_QUOTES, 'UTF-8');
    $safe_url = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');

    $html = preg_replace('#<title>.*?</title>#s', '<title>' . $title . '</title>', $html, 1);
    $html = preg_replace('#<meta name="description"[^>]*>#', '<meta name="description" content="' . $desc . '" />', $html, 1);

    $tags = '<link rel="canonical" href="' . $safe_url . '" />' . "\n";
    $tags .= '<meta property="og:site_name" content="' . htmlspecialchars(t('brand'), ENT_QUOTES, 'UTF-8') . '" />' . "\n";
    $tags .= '<meta property="og:type" content="website" />' . "\n";
    $tags .= '<meta property="og:title" content="' . $title . '" />' . "\n";
    $tags .= '<meta property="og:description" content="' . $desc . '" />' . "\n";
    $tags .= '<meta property="og:url" content="' . $safe_url . '" />' . "\n";
    if (!empty($meta['image'])) {
        $image_url = htmlspecialchars(site_url() . '/images/destinations/' . $meta['image'] . '-1280.jpg', ENT_QUOTES, 'UTF-8');
        $tags .= '<meta property="og:image" content="' . $image_url . '" />' . "\n";
        $tags .= '<meta name="twitter:card" content="summary_large_image" />' . "\n";
        // the main photo is the biggest thing on the page, so start loading it straight away
        $base = '/images/destinations/' . htmlspecialchars($meta['image'], ENT_QUOTES, 'UTF-8');
        $tags .= '<link rel="preload" as="image" type="image/webp" fetchpriority="high" href="' . $base . '-800.webp"'
            . ' imagesrcset="' . $base . '-480.webp 480w, ' . $base . '-800.webp 800w, ' . $base . '-1280.webp 1280w"'
            . ' imagesizes="' . htmlspecialchars($meta['image_sizes'], ENT_QUOTES, 'UTF-8') . '" />' . "\n";
    }
    if ($meta['noindex']) {
        $tags .= '<meta name="robots" content="noindex, nofollow" />' . "\n";
    }
    if ($meta['jsonld']) {
        $json = json_encode($meta['jsonld'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP);
        $tags .= '<script type="application/ld+json">' . $json . "</script>\n";
    }
    $html = str_replace('</head>', $tags . '</head>', $html);
    $html = str_replace('<div id="root"></div>', '<div id="root">' . $content . '</div>', $html);

    header('Content-Type: text/html; charset=UTF-8');
    csp_header();
    echo $html;
}

function show_sitemap($db) {
    $base = site_url();
    $paths = ['/', '/destinations', '/gallery', '/about', '/privacy', '/credits'];
    foreach ($db->query('SELECT id FROM packages ORDER BY id')->fetchAll() as $row) {
        $paths[] = '/packages/' . $row['id'];
    }
    header('Content-Type: application/xml; charset=UTF-8');
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($paths as $p) {
        echo '  <url><loc>' . htmlspecialchars($base . $p, ENT_XML1) . '</loc></url>' . "\n";
    }
    echo '</urlset>' . "\n";
}

function show_robots() {
    header('Content-Type: text/plain; charset=UTF-8');
    echo "User-agent: *\n";
    echo "Allow: /\n";
    echo "Disallow: /admin\n";
    echo "Disallow: /my-bookings\n";
    echo "Disallow: /api/\n\n";
    echo 'Sitemap: ' . site_url() . "/sitemap.xml\n";
}
