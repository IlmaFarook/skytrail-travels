<?php

function seed(PDO $db): void
{
    $destCount = (int) $db->query('SELECT COUNT(*) AS c FROM destinations')->fetch()['c'];
    if ($destCount > 0) {
        return; // already seeded
    }

    $insertDest = $db->prepare(
        'INSERT INTO destinations (name, country, region, description, icon, color, image) VALUES (?,?,?,?,?,?,?)'
    );
    $destinations = [
        ['Kandy', 'Sri Lanka', 'Central Province', 'The hill capital, home to the Temple of the Sacred Tooth Relic and misty tea country.', '⛰️', '#2f9e44', 'kandy'],
        ['Mirissa', 'Sri Lanka', 'Southern Province', 'A laid-back beach town famous for whale watching and golden sunsets.', '🏖️', '#1c7ed6', 'mirissa'],
        ['Ella', 'Sri Lanka', 'Uva Province', 'Mountain village known for hiking trails, waterfalls and the iconic Nine Arches Bridge.', '🚂', '#2b8a3e', 'ella'],
        ['Yala National Park', 'Sri Lanka', 'Southern Province', "Sri Lanka's premier wildlife reserve, famed for leopard sightings.", '🐆', '#e8590c', 'yala'],
        ['Maldives', 'Maldives', 'Indian Ocean', 'Overwater villas and coral reefs, the archipelago getaway for honeymooners.', '🏝️', '#1098ad', 'maldives'],
        ['Bali', 'Indonesia', 'Southeast Asia', 'Temples, rice terraces and surf beaches across the Island of the Gods.', '🌋', '#9c36b5', 'bali'],
        ['Sigiriya', 'Sri Lanka', 'Central Province', 'Home to the 5th-century Lion Rock fortress, a UNESCO World Heritage Site rising about 200 metres above the surrounding jungle.', '🪨', '#9a6b4d', 'sigiriya'],
        ['Galle', 'Sri Lanka', 'Southern Province', 'A living Dutch-era fort town on the south-west coast, a UNESCO World Heritage Site of ramparts, a lighthouse, museums and boutique cafés.', '🏰', '#c9a26a', 'galle'],
        ['Nuwara Eliya', 'Sri Lanka', 'Central Province', "Sri Lanka's cool hill-country tea capital, around 1,870 metres above sea level and nicknamed 'Little England' for its colonial-era architecture.", '🍵', '#5f9a62', 'nuwaraeliya'],
        ['Trincomalee', 'Sri Lanka', 'Eastern Province', 'A natural deep-water harbour on the east coast, with white-sand beaches at Nilaveli and Uppuveli and snorkelling around Pigeon Island National Park.', '🐢', '#2e8aa5', 'trincomalee'],
        ['Arugam Bay', 'Sri Lanka', 'Eastern Province', "Sri Lanka's best-known surf town, with point breaks that work best from roughly April to October.", '🏄', '#e2582f', 'arugambay'],
        ['Colombo', 'Sri Lanka', 'Western Province', "Sri Lanka's commercial capital: Buddhist temples, colonial buildings, street food and the Galle Face seafront.", '🌆', '#df6a3a', 'colombo'],
        ['Dubai', 'United Arab Emirates', 'Arabian Peninsula', 'A futuristic Gulf city of record-breaking towers, souks and desert dunes, home to the 828-metre Burj Khalifa.', '🏙️', '#d9a56a', 'dubai'],
        ['Kerala', 'India', 'South India', "India's southern coastal state, known for palm-fringed backwaters, houseboats, spices and the tea hills around Munnar.", '🛶', '#4aa6a0', 'kerala'],
    ];
    $destIds = [];
    foreach ($destinations as $d) {
        $insertDest->execute($d);
        $destIds[] = (int) $db->lastInsertId();
    }

    $insertPkg = $db->prepare(
        'INSERT INTO packages (title, destination_id, category, price, duration_days, description, icon, color) VALUES (?,?,?,?,?,?,?,?)'
    );
    $packages = [
        ['Kandy Cultural Discovery', $destIds[0], 'Cultural', 45000, 3, 'Explore the Temple of the Tooth, botanical gardens and a traditional cultural dance show.', '🛕', '#2f9e44'],
        ['Hill Country Tea Trail', $destIds[0], 'Nature', 62000, 4, "Scenic train rides, tea factory visits and guided walks through Kandy's highlands.", '🍃', '#2f9e44'],
        ['Mirissa Whale & Beach Escape', $destIds[1], 'Beach', 55000, 4, "Morning whale-watching boat trips followed by relaxed afternoons on Mirissa's best beaches.", '🐋', '#1c7ed6'],
        ['Mirissa Honeymoon Package', $destIds[1], 'Honeymoon', 98000, 5, 'A romantic beachfront stay with private dinners and a sunset catamaran cruise.', '💑', '#1c7ed6'],
        ['Ella Hiking Adventure', $destIds[2], 'Adventure', 50000, 3, "Guided hikes to Little Adam's Peak, Ella Rock and the Nine Arches Bridge.", '🥾', '#2b8a3e'],
        ['Yala Safari Experience', $destIds[3], 'Wildlife', 70000, 2, 'Two guided jeep safaris with experienced trackers, chasing leopard and elephant sightings.', '🚙', '#e8590c'],
        ['Maldives Overwater Villa Retreat', $destIds[4], 'Honeymoon', 320000, 6, 'All-inclusive overwater villa stay with snorkelling, spa treatments and private dining.', '🛶', '#1098ad'],
        ['Bali Temples & Rice Terraces', $destIds[5], 'Cultural', 150000, 7, "Visit ancient temples, Ubud's rice terraces and the beaches of Seminyak.", '🏯', '#9c36b5'],
        ['Corporate Retreat, Kandy', $destIds[0], 'Corporate', 85000, 2, 'Meeting facilities, team-building activities and cultural excursions for business groups.', '💼', '#2f9e44'],
        ['Sigiriya Lion Rock & Dambulla Caves', $destIds[6], 'Cultural', 58000, 3, "Climb the 5th-century Lion Rock fortress at opening time, see the mirror wall and frescoes, then visit the painted Buddha statues of the Golden Temple of Dambulla.", '🪨', '#9a6b4d'],
        ['Minneriya Elephant Gathering Safari', $destIds[6], 'Wildlife', 52000, 2, "A jeep safari in Minneriya National Park, famed for the seasonal elephant 'Gathering' (best from July to October, peaking in August and September), with a village lunch near Sigiriya.", '🐘', '#9a6b4d'],
        ['Galle Fort Heritage Weekend', $destIds[7], 'Cultural', 42000, 2, 'Walk the ramparts of the Dutch-era Galle Fort, climb to the lighthouse, browse the museums and lanes, and watch the sunset from the walls.', '🏰', '#c9a26a'],
        ['Southern Coast Family Beach Break', $destIds[7], 'Family', 78000, 4, 'A relaxed family trip combining Unawatuna beach days, an afternoon in Galle Fort and a visit to a sea turtle conservation hatchery on the southern coast.', '🏖️', '#c9a26a'],
        ['Nuwara Eliya Tea Country Escape', $destIds[8], 'Nature', 68000, 3, "Ride the scenic hill-country train to Nanu Oya, tour a working tea estate and factory, and stroll Gregory Lake and Victoria Park in Sri Lanka's coolest town.", '🍵', '#5f9a62'],
        ['Horton Plains & World\'s End Trek', $destIds[8], 'Adventure', 54000, 2, "An early-morning guided trek across Horton Plains National Park to World's End, a sheer cliff dropping around 870 metres, returning past Baker's Falls.", '🥾', '#5f9a62'],
        ['Trincomalee Beach & Pigeon Island Snorkelling', $destIds[9], 'Beach', 64000, 4, "Beach days at Nilaveli, snorkelling over the coral reefs of Pigeon Island National Park where blacktip reef sharks and turtles are regularly seen, and a visit to Koneswaram Temple.", '🐢', '#2e8aa5'],
        ['Arugam Bay Surf Camp', $destIds[10], 'Adventure', 72000, 5, 'Five days of coached surf sessions at the beginner-friendly Baby Point and the famous Main Point, with a day trip to Kumana National Park (the main surf season runs roughly April to October, peaking July to September).', '🏄', '#e2582f'],
        ['Colombo City Discovery', $destIds[11], 'City Break', 32000, 2, "A city break through Gangaramaya Temple, the National Museum, the Pettah markets and a sunset stroll on the Galle Face seafront, with Sri Lankan street food along the way.", '🌆', '#df6a3a'],
        ['Corporate Team Offsite, Galle', $destIds[7], 'Corporate', 120000, 3, 'A three-day team offsite on the south coast with meeting space, a guided Galle Fort walk, beach team-building and group dinners.', '💼', '#c9a26a'],
        ['Dubai City & Desert Escape', $destIds[12], 'City Break', 235000, 5, 'See Dubai from the 828-metre Burj Khalifa, explore Old Dubai by abra across the Creek and through the Gold Souk, then enjoy a desert dune safari at sunset.', '🏙️', '#d9a56a'],
        ['Kerala Backwaters & Munnar', $destIds[13], 'Nature', 185000, 7, "An overnight houseboat on the Alleppey backwaters, the tea plantations of Munnar's hills and Ayurvedic spa treatments, a seven-day journey through southern India.", '🛶', '#4aa6a0'],
    ];
    foreach ($packages as $p) {
        $insertPkg->execute($p);
    }

    $photos = [
        'kandy' => ['The Temple of the Sacred Tooth Relic beside Kandy Lake', 'Philip Nalangan', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/', 'https://commons.wikimedia.org/wiki/File:Sacred_Tooth_Relic_Temple.jpg'],
        'mirissa' => ['Aerial view of Mirissa\'s turquoise bay and palm-fringed beach', 'Abishek Palraj', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:Aerial_view_of_Mirissa_beach,_Srilanka.jpg'],
        'ella' => ['A train crossing the Nine Arches Bridge in Ella, surrounded by forest', 'Dilshan255', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:Nine_Arch_Bridge_in_Ella.jpg'],
        'yala' => ['A leopard resting on a rock in Yala National Park', 'Byrdyak', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:Leopard_on_stone_in_Yala_National_Park.jpg'],
        'maldives' => ['Aerial view of coral atolls in the Maldives', 'Frédéric Ducarme', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:Baa_atoll_islands.JPG'],
        'bali' => ['Green rice terraces among palm trees at Tegalalang, Bali', 'Pinterpandai', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'https://commons.wikimedia.org/wiki/File:Beautiful_rice_terraces_in_Tagallalang.jpg'],
        'sigiriya' => ['Sigiriya Lion Rock rising above the jungle', 'Chamixth', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:Sigiriya_Rock_fortress.jpg'],
        'galle' => ['Galle Fort ramparts, mosque and lighthouse on the coast', 'Grayswoodsurrey', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:Galle_Fort,_Sri_Lanka.JPG'],
        'nuwaraeliya' => ['Tea plantations on the hills around Nuwara Eliya', 'Dinkum', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'https://commons.wikimedia.org/wiki/File:Plantations_de_th%C3%A9_dans_la_r%C3%A9gion_de_Nuwara_Eliya.jpg'],
        'trincomalee' => ['A diver over the coral reef at Pigeon Island, Trincomalee', 'Kalana Weeramuni', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:Dive_in_pigeon_island.jpg'],
        'arugambay' => ['Aerial view of the beach at Arugam Bay with fishing boats on the sand', 'Dennis Sylvester Hurd', 'CC0', 'https://creativecommons.org/publicdomain/zero/1.0/', 'https://commons.wikimedia.org/wiki/File:Beach_of_Arugam_Bay.jpg'],
        'colombo' => ['Buddha statues beside Beira Lake with the Colombo skyline behind', 'IamHawkeye', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:Colombo-Skyline-photograph.jpg'],
        'dubai' => ['Dubai Marina skyscrapers at sunset', 'Norlando Pobre', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0/', 'https://commons.wikimedia.org/wiki/File:Dubai_Marina_Skyline.jpg'],
        'kerala' => ['A traditional houseboat on the Alleppey backwaters in Kerala', 'Dumphasizer', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0/', 'https://commons.wikimedia.org/wiki/File:Alleppey_Backwaters_(15865677189).jpg'],
    ];
    $setPhoto = $db->prepare('UPDATE destinations SET photo_alt = ?, photo_author = ?, photo_license = ?, photo_license_url = ?, photo_source = ? WHERE image = ?');
    foreach ($photos as $slug => $p) {
        $setPhoto->execute([$p[0], $p[1], $p[2], $p[3], $p[4], $slug]);
    }

    $db->exec("UPDATE packages SET featured = 1 WHERE title IN ('Maldives Overwater Villa Retreat', 'Mirissa Honeymoon Package', 'Southern Coast Family Beach Break')");

    $insertTest = $db->prepare('INSERT INTO testimonials (name, quote, rating) VALUES (?,?,?)');
    foreach ([
        ['Priyanka J.', 'SkyTrail planned our Ella hiking trip perfectly. Every detail was taken care of. Highly recommend!', 5],
        ['Dinesh & Anusha', 'Our Maldives honeymoon through SkyTrail was unforgettable. The booking process was so simple.', 5],
        ['Michael R.', 'The Yala safari exceeded expectations. Saw two leopards! Great communication throughout.', 5],
        ['Fathima N.', 'Booked a last-minute Mirissa weekend and SkyTrail sorted everything within a day.', 4],
        ['Ruwan & Shalini', 'Climbing Sigiriya at opening time was the highlight of our family trip, and our driver-guide knew every shortcut.', 5],
        ['Hannah L.', 'The Arugam Bay surf camp was exactly what I wanted: patient instructors and a great beachfront stay.', 5],
        ['Imran S.', 'Dubai in five days with nothing missed. Transfers, tickets and the desert evening were all seamless.', 4],
        ['Kavindi P.', 'The Nuwara Eliya tea trail was peaceful and beautifully planned. The factory visit was a favourite.', 5],
    ] as $t) {
        $insertTest->execute($t);
    }

    $insertPost = $db->prepare('INSERT INTO blog_posts (title, body) VALUES (?,?)');
    foreach ([
        ['5 Reasons to Visit Ella This Season', "From sunrise hikes to the Nine Arches Bridge, Ella offers some of Sri Lanka's most rewarding short hikes for travellers of any fitness level."],
        ["A First-Timer's Guide to Yala Safaris", 'What to pack, the best time of day for sightings, and how our guides maximise your chances of spotting a leopard.'],
        ['Planning the Perfect Maldives Honeymoon', 'Overwater villas, private dining and the small details that make a honeymoon unforgettable.'],
        ['Climbing Sigiriya: When to Go and What to Know', 'Arrive at opening time to beat both the heat and the crowds. The climb is over a thousand steps, with the mirror wall and frescoes along the way.'],
        ["Arugam Bay's Surf Season, Explained", 'The main season runs roughly April to October, with the cleanest swell from July to September; Baby Point suits beginners and Main Point rewards experienced surfers.'],
        ['Exploring Galle Fort on Foot', 'Start near the lighthouse, walk the ramparts toward sunset, and leave half a day for the lanes, museums and cafés inside the walls.'],
    ] as $post) {
        $insertPost->execute($post);
    }

    $insertFaq = $db->prepare('INSERT INTO faqs (question, answer, sort_order) VALUES (?,?,?)');
    foreach ([
        ['How do I book a package?', 'Browse Destinations, choose a package, and click "Book / Enquire Now." You\'ll need to create a free account first so we can track your booking.'],
        ['Can I customise a package?', 'Yes. Use the Special Requests field on the booking form, or mention your requirements in the contact form below, and a travel consultant will follow up.'],
        ['Can I change or cancel a booking?', 'Yes. Open My Bookings while logged in: you can edit a pending enquiry or cancel a pending or confirmed one yourself, and our team is notified automatically.'],
        ['What payment methods do you accept?', 'Bank transfer, major credit/debit cards, and instalment plans for packages over LKR 100,000.'],
        ['Is travel insurance included?', 'Travel insurance is not included by default but can be added to any package. Ask your consultant when they contact you.'],
        ['When is the best time to visit Sri Lanka?', 'It depends on the coast. The south and west coasts and the hill country are generally best from December to March, while the east coast (Trincomalee, Arugam Bay) is best from roughly April to October, which is why SkyTrail packages are planned around the season for each region.'],
        ['Do I need a visa for Sri Lanka?', 'Most visitors need an Electronic Travel Authorisation (ETA) before arrival. Requirements change, so always confirm on the official Sri Lankan government immigration site before you travel.'],
    ] as $i => $faq) {
        $insertFaq->execute([$faq[0], $faq[1], $i + 1]);
    }

    $insertUser = $db->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)');
    $insertUser->execute(['SkyTrail Admin', 'admin@skytrailtravels.lk', password_hash('Admin@123', PASSWORD_BCRYPT, ['cost' => 10]), 'admin']);
    $insertUser->execute(['Test Customer', 'customer@example.com', password_hash('Customer@123', PASSWORD_BCRYPT, ['cost' => 10]), 'customer']);
}

// the first call to /api/currencies replaces these starting rates with live ones
function seed_currencies(PDO $db): void
{
    if ((int) $db->query('SELECT COUNT(*) FROM currencies')->fetchColumn() > 0) {
        return;
    }
    $insert = $db->prepare('INSERT INTO currencies (code, name, locale, rate, rate_date, sort_order) VALUES (?,?,?,?,?,?)');
    foreach ([
        ['LKR', 'Sri Lankan rupee', 'en-LK', 1, null],
        ['USD', 'US dollar', 'en-US', 0.0030, '2026-11-20'],
        ['EUR', 'Euro', 'en-IE', 0.0027, '2026-11-20'],
        ['GBP', 'Pound sterling', 'en-GB', 0.0023, '2026-11-20'],
        ['INR', 'Indian rupee', 'en-IN', 0.28, '2026-11-20'],
    ] as $i => $c) {
        $insert->execute([$c[0], $c[1], $c[2], $c[3], $c[4], $i + 1]);
    }
}

// contact details and links shown across the site; staff change them in the admin area
function seed_site_settings(PDO $db): void
{
    $insert = $db->prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    foreach ([
        'business.address' => '178, Old Gampola Road, Peradeniya, Kandy, Sri Lanka',
        'business.street' => '178, Old Gampola Road',
        'business.locality' => 'Peradeniya',
        'business.region' => 'Central Province',
        'business.country_code' => 'LK',
        'business.phone' => '+94 77 165 4746',
        'business.email' => 'enquiries@skytrailtravels.lk',
        'business.founded' => '2020',
        'business.facebook' => 'https://www.facebook.com/profile.php?id=61596638079170',
        'business.instagram' => 'https://www.instagram.com/skytrail.travels.lk/',
        'business.map_lat' => '7.2610',
        'business.map_lon' => '80.5930',
    ] as $key => $value) {
        $insert->execute([$key, $value]);
    }
}
