<?php
// Plain HTML for the public pages so search engines and visitors without
// JavaScript get real content. React replaces it in the browser.
// Private pages (login, admin) are not built here.

function h($text) {
    return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
}

function price_text($price) {
    return t('price.lkr', ['amount' => number_format($price)]);
}

function days_text($days) {
    return t('page.days', ['count' => $days, 'days' => $days]);
}

function package_list_html($packages) {
    $html = '<ul>';
    foreach ($packages as $p) {
        $details = t('page.list.details', [
            'destination' => h($p['destination_name']),
            'country' => h($p['destination_country']),
            'category' => h($p['category']),
            'duration' => days_text($p['duration_days']),
            'price' => h(price_text($p['price'])),
        ]);
        $html .= '<li><a href="/packages/' . (int) $p['id'] . '">' . h($p['title']) . '</a> ' . $details
            . '<br>' . h($p['description']) . '</li>';
    }
    return $html . '</ul>';
}

function all_packages($db, $limit = 100) {
    $stmt = $db->prepare('SELECT p.*, d.name AS destination_name, d.country AS destination_country
        FROM packages p JOIN destinations d ON p.destination_id = d.id ORDER BY p.id LIMIT ?');
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function featured_packages($db) {
    $stmt = $db->query('SELECT p.*, d.name AS destination_name, d.country AS destination_country
        FROM packages p JOIN destinations d ON p.destination_id = d.id WHERE p.featured = 1 ORDER BY p.id');
    return $stmt->fetchAll();
}

function site_nav_html() {
    $links = [
        '/' => 'page.nav.home',
        '/destinations' => 'page.nav.destinations',
        '/gallery' => 'page.nav.gallery',
        '/about' => 'page.nav.about',
        '/privacy' => 'page.nav.privacy',
    ];
    $items = [];
    foreach ($links as $url => $key) {
        $items[] = '<a href="' . $url . '">' . h(t($key)) . '</a>';
    }
    return '<nav aria-label="' . h(t('page.nav.label')) . '">' . implode(' · ', $items) . '</nav>';
}

function prerender_page($path, $db) {
    $body = '';

    if ($path === '/') {
        $body = '<h1>' . h(t('page.home.title')) . '</h1>'
            . '<p>' . h(t('page.home.lede')) . '</p>'
            . '<h2>' . h(t('page.home.featured')) . '</h2>' . package_list_html(featured_packages($db))
            . '<p><a href="/destinations">' . h(t('page.home.see_all')) . '</a></p>'
            . '<h2>' . h(t('page.home.notes')) . '</h2>';
        foreach ($db->query('SELECT * FROM testimonials ORDER BY id DESC LIMIT 4')->fetchAll() as $row) {
            $body .= '<blockquote>' . h($row['quote']) . '<br>'
                . h(t('page.home.rating', ['name' => $row['name'], 'rating' => $row['rating']])) . '</blockquote>';
        }
    } elseif ($path === '/destinations') {
        $body = '<h1>' . h(t('page.destinations.title')) . '</h1>'
            . '<p>' . h(t('page.destinations.intro')) . '</p>'
            . package_list_html(all_packages($db));
    } elseif (preg_match('#^/packages/([0-9]+)$#', $path, $m)) {
        $stmt = $db->prepare('SELECT p.*, d.name AS destination_name, d.country AS destination_country,
                d.description AS destination_description, d.image AS photo_image, d.photo_alt
            FROM packages p JOIN destinations d ON p.destination_id = d.id WHERE p.id = ?');
        $stmt->execute([$m[1]]);
        $p = $stmt->fetch();
        if ($p) {
            $line = t('page.package.line', [
                'category' => h($p['category']),
                'destination' => h($p['destination_name']),
                'country' => h($p['destination_country']),
                'duration' => days_text($p['duration_days']),
            ]);
            $photo = '';
            if ($p['photo_image']) {
                $photo = '<img src="/images/destinations/' . h($p['photo_image']) . '-1280.jpg" width="1280" height="853" '
                    . 'alt="' . h($p['photo_alt']) . '">';
            }
            $body = '<h1>' . h($p['title']) . '</h1>'
                . $photo
                . '<p>' . $line . '</p>'
                . '<p>' . h($p['description']) . '</p>'
                . '<p>' . h(t('page.package.price', ['price' => price_text($p['price'])])) . '</p>'
                . '<h2>' . h(t('page.package.about', ['name' => $p['destination_name']])) . '</h2>'
                . '<p>' . h($p['destination_description']) . '</p>'
                . '<p><a href="/booking?package=' . (int) $p['id'] . '">' . h(t('page.package.book')) . '</a> · '
                . '<a href="/destinations">' . h(t('page.package.all')) . '</a></p>';
        }
    } elseif ($path === '/gallery') {
        $body = '<h1>' . h(t('page.gallery.title')) . '</h1><ul>';
        foreach ($db->query('SELECT * FROM destinations ORDER BY name')->fetchAll() as $d) {
            $body .= '<li><strong>' . h($d['name']) . '</strong> (' . h($d['country']) . '): ' . h($d['description']) . '</li>';
        }
        $body .= '</ul><h2>' . h(t('page.gallery.journal')) . '</h2>';
        foreach ($db->query('SELECT * FROM blog_posts ORDER BY id')->fetchAll() as $post) {
            $body .= '<article><h3>' . h($post['title']) . '</h3><p>' . h($post['body']) . '</p></article>';
        }
    } elseif ($path === '/about') {
        $body = '<h1>' . h(t('page.about.title')) . '</h1>'
            . '<p>' . h(t('page.about.intro')) . '</p>'
            . '<p>' . h(business($db)['address']) . '<br>'
            . h(t('page.about.phone')) . ' <a href="tel:' . h(phone_link(business($db)['phone'])) . '">' . h(business($db)['phone']) . '</a><br>'
            . h(t('page.about.email')) . ' ' . h(business($db)['email']) . '</p>'
            . '<h2>' . h(t('page.about.faq')) . '</h2>';
        foreach ($db->query('SELECT * FROM faqs ORDER BY sort_order, id')->fetchAll() as $f) {
            $body .= '<h3>' . h($f['question']) . '</h3><p>' . h($f['answer']) . '</p>';
        }
    }

    if ($body === '') {
        return '';
    }
    return '<div class="ssr-page">' . site_nav_html() . '<main>' . $body . '</main></div>';
}
