// Browser tests. Start the server first (npm start), then run: npm run test:e2e
// Pick a browser with BROWSER=firefox or BROWSER=webkit (default is chromium).
import test from 'node:test';
import assert from 'node:assert/strict';
import playwright from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.TEST_URL || 'http://localhost:3100';
const engine = process.env.BROWSER || 'chromium';
const stamp = Date.now();
const email = `e2e${stamp}@example.com`;
const password = 'Passw0rdOK';

// opens the calendar on a date field and clicks a day, moving to the right month first
async function pickDate(page, id, iso) {
  await page.click(`#${id}`);
  await page.waitForSelector('.date-popover');
  for (let i = 0; i < 30; i++) {
    const day = page.locator(`td[data-day="${iso}"]:not([data-outside]) button`);
    if (await day.count()) {
      await day.click();
      await page.waitForSelector('.date-popover', { state: 'detached' });
      return;
    }
    await page.getByRole('button', { name: /next month/i }).click();
  }
  throw new Error(`${iso} is not in the calendar`);
}

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

let browser;
const consoleErrors = [];
let expectedStatus = null; // set while a test deliberately triggers an error response, e.g. '409'

function watch(page) {
  page.on('console', m => {
    // axe-core downloads the Google Fonts stylesheet itself, and the CSP blocks that
    // test-only request; it is not something the site does
    const text = m.text();
    if (m.type() !== 'error' || text.includes('fonts.googleapis.com')) return;
    if (expectedStatus && text.includes(expectedStatus)) return;
    consoleErrors.push(text);
  });
  page.on('pageerror', e => consoleErrors.push(e.message));
}

async function newPage(options = {}, watched = true) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  const page = await context.newPage();
  if (watched) watch(page);
  return page;
}

// waits for the network to go quiet, but not for ever: the About page embeds an
// OpenStreetMap iframe, and when that outside site is slow the network never settles
async function quiet_network(page) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

async function login(page, who, pass) {
  await page.goto(BASE + '/login');
  // WebKit now and then lost a value typed within milliseconds of the form appearing,
  // so let the page settle first and check the field kept its value
  await page.waitForSelector('#email');
  await quiet_network(page);
  await page.fill('#email', who);
  await page.fill('#password', pass);
  if ((await page.inputValue('#email')) !== who) await page.fill('#email', who);
  await page.click('button[type="submit"]');
  await page.waitForSelector('#nav-auth-area .logout-link');
}

test.before(async () => { browser = await playwright[engine].launch(); });
test.after(async () => { await browser.close(); });

test('home page shows the new content and the right title', async () => {
  const page = await newPage();
  await page.goto(BASE + '/');
  assert.match(await page.title(), /^Discover Sri Lanka & Beyond \| SkyTrail Travels$/);
  await page.waitForSelector('.card');
  assert.equal(await page.locator('.hero-stats dd').nth(1).innerText(), '14');
  assert.equal(await page.locator('.featured .card, section .card').count() >= 3, true);
  await page.context().close();
});

test('destination filters work without a page reload', async () => {
  const page = await newPage();
  await page.goto(BASE + '/destinations');
  await page.waitForSelector('.card');
  assert.ok(await page.locator('.card').count() >= 20);
  await page.selectOption('#f-category', 'Honeymoon');
  await page.click('button:has-text("Apply Filters")');
  await page.waitForFunction(() => document.querySelectorAll('.card').length === 2);
  assert.match(page.url(), /category=Honeymoon/);
  await page.context().close();
});

test('real photos load on the cards and the detail page', async () => {
  const page = await newPage();
  await page.goto(BASE + '/destinations');
  await page.waitForSelector('.card');
  // images are lazy, so scroll to the bottom to load them all
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
  });
  await quiet_network(page);
  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img.place-photo')];
    return { total: imgs.length, broken: imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src) };
  });
  assert.ok(info.total >= 20, `only ${info.total} photos on the page`);
  assert.deepEqual(info.broken, []);
  await page.goto(BASE + '/packages/10');
  await page.waitForSelector('.detail-art img');
  assert.match(await page.locator('.detail-art img').getAttribute('alt'), /Sigiriya/);
  assert.match(await page.locator('.photo-credit').innerText(), /Chamixth.*CC BY-SA 4\.0/);
  await page.context().close();
});

test('currency switcher converts prices and remembers the choice', async () => {
  const page = await newPage();
  await page.goto(BASE + '/destinations');
  await page.waitForSelector('.card');
  const options = await page.locator('#currency option').allInnerTexts();
  assert.deepEqual(options, ['LKR', 'USD', 'EUR', 'GBP', 'INR']);
  assert.match(await page.locator('.price-value').first().innerText(), /^LKR /);

  await page.selectOption('#currency', 'USD');
  await page.waitForFunction(() => /^≈ \$/.test(document.querySelector('.price-value').innerText));
  await page.waitForSelector('.currency-note');
  assert.match(await page.locator('.currency-note').innerText(), /converted from LKR/);

  await page.reload();
  await page.waitForSelector('.card');
  assert.equal(await page.locator('#currency').inputValue(), 'USD');
  await page.waitForFunction(() => /^≈ \$/.test(document.querySelector('.price-value').innerText));

  await page.goto(BASE + '/packages/1');
  await page.waitForSelector('.summary-price');
  assert.match(await page.locator('.summary-price').innerText(), /^≈ \$/);

  await page.selectOption('#currency', 'LKR');
  await page.waitForFunction(() => /^LKR 45,000/.test(document.querySelector('.summary-price').innerText));
  await page.context().close();
});

test('credits page lists every photo with its licence', async () => {
  const page = await newPage();
  await page.goto(BASE + '/credits');
  await page.waitForSelector('table tbody tr');
  assert.equal(await page.locator('table tbody tr').count(), 14);
  assert.ok(await page.locator('table a[href^="https://creativecommons.org/"]').count() >= 14);
  assert.match(await page.locator('main').innerText(), /OpenStreetMap contributors/);
  await page.context().close();
});

test('compare: pick three, fourth is blocked, table shows best values', async () => {
  const page = await newPage();
  await page.goto(BASE + '/destinations');
  await page.waitForSelector('.card');
  const boxes = page.locator('.compare-toggle input');
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.waitForSelector('.compare-bar');
  await boxes.nth(2).check();
  assert.equal(await boxes.nth(3).isDisabled(), true);
  await page.click('.compare-bar a:has-text("Compare now")');
  await page.waitForSelector('.compare-table');
  assert.equal(await page.locator('.compare-table thead th').count(), 3);
  assert.ok(await page.locator('.best-tag').count() >= 3);
  await page.click('.compare-table button:has-text("Remove") >> nth=0');
  await page.waitForFunction(() => document.querySelectorAll('.compare-table thead th').length === 2);
  await page.context().close();
});

test('register shows an error for a weak password, then works', async () => {
  const page = await newPage();
  await page.goto(BASE + '/register');
  await page.fill('#name', 'E2E Traveller');
  await page.fill('#email', email);
  await page.fill('#password', 'abcdefgh');
  await page.fill('#confirm', 'abcdefgh');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.has-error');
  await page.fill('#password', password);
  await page.fill('#confirm', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('#nav-auth-area .logout-link');
  await page.context().close();
});

test('customer can book, edit and cancel', async () => {
  const page = await newPage();
  await login(page, email, password);
  await page.goto(BASE + '/booking?package=1');
  await page.waitForSelector('#full_name');
  await page.fill('#full_name', 'E2E Traveller');
  await page.fill('#phone', '0771234567');
  await pickDate(page, 'travel_date', futureDate(20));
  await page.fill('#travellers', '2');
  await page.click('button[type="submit"]');

  // a confirmation page with the reference, not a message on the form
  await page.waitForURL(/\/booking\/confirmation\/ST\d{4}-[A-Z0-9]{6}$/);
  const reference = (await page.locator('#booking-reference').innerText()).trim();
  assert.match(reference, /^ST\d{4}-[A-HJ-NP-Z2-9]{6}$/);
  assert.match(await page.locator('.confirm-card').innerText(), /E2E|Pending|Kandy/i);
  await page.reload(); // the page works after a refresh too
  await page.waitForSelector('#booking-reference');
  assert.equal((await page.locator('#booking-reference').innerText()).trim(), reference);

  await page.click('a:has-text("View my bookings")');
  await page.waitForSelector('tbody tr .status-pill');
  assert.match(await page.locator('tbody tr').first().innerText(), new RegExp(`${reference}[\\s\\S]*pending`, 'i'));
  await page.click('button:has-text("Edit")');
  await page.fill('#e-travellers', '4');
  await page.click('button:has-text("Save changes")');
  await page.waitForSelector('.alert-success:has-text("updated")');
  assert.match(await page.locator('tbody tr').first().innerText(), /\b4\b/);

  // a proper dialog, not the browser's pop-up: Escape and "Go back" keep the booking
  await page.click('button:has-text("Cancel") >> nth=0');
  await page.waitForSelector('dialog[open] h2:has-text("Cancel this booking?")');
  await page.keyboard.press('Escape');
  await page.waitForSelector('dialog', { state: 'detached' });
  assert.match(await page.locator('tbody tr').first().innerText(), /pending/i);
  await page.click('button:has-text("Cancel") >> nth=0');
  await page.click('dialog[open] button:has-text("Go back")');
  assert.match(await page.locator('tbody tr').first().innerText(), /pending/i);
  await page.click('button:has-text("Cancel") >> nth=0');
  await page.click('dialog[open] .modal-confirm');
  await page.waitForSelector('.alert-success:has-text("cancelled")');
  assert.match(await page.locator('tbody tr').first().innerText(), /cancelled/i);
  await page.context().close();
});

test('admin can manage packages, customers, content and read messages', async () => {
  // a visitor leaves a message first
  const visitor = await newPage();
  await visitor.goto(BASE + '/about');
  await visitor.fill('#c-name', 'E2E Visitor');
  await visitor.fill('#c-email', 'visitor@example.com');
  await visitor.fill('#c-message', 'Message from the browser test ' + stamp);
  await visitor.click('form button[type="submit"]');
  await visitor.waitForSelector('.alert-success');
  await visitor.context().close();

  const page = await newPage();
  await login(page, 'admin@skytrailtravels.lk', 'Admin@123');
  await page.goto(BASE + '/admin');
  await page.waitForSelector('[role="tab"]');
  assert.equal(await page.locator('[role="tab"]').count(), 8);

  // bookings tab shows the cancelled booking
  await page.waitForSelector('tbody tr');
  await page.selectOption('#status-filter', 'Cancelled');
  assert.ok(await page.locator('tbody tr .status-pill').count() >= 1);
  // every booking shows its reference, and the reference can be searched
  const adminRef = (await page.locator('tbody tr .booking-ref').first().innerText()).trim();
  assert.match(adminRef, /^ST\d{4}-/);
  await page.selectOption('#status-filter', '');
  await page.fill('#booking-search', adminRef.toLowerCase());
  assert.equal(await page.locator('tbody tr .booking-ref').count(), 1);
  await page.fill('#booking-search', '');

  // add, edit and delete a package
  await page.click('[role="tab"]:has-text("Packages")');
  await page.click('button:has-text("Add package")');
  await page.fill('#Package-title', 'Browser Test Package ' + stamp);
  await page.selectOption('#Package-destination_id', { label: 'Galle, Sri Lanka' });
  await page.fill('#Package-category', 'Cultural');
  await page.fill('#Package-price', '23456');
  await page.fill('#Package-duration_days', '2');
  await page.fill('#Package-description', 'A package added by the browser tests.');
  await page.click('form button:has-text("Save")');
  await page.waitForSelector(`tr:has-text("Browser Test Package ${stamp}")`);
  await page.click(`tr:has-text("Browser Test Package ${stamp}") button:has-text("Edit")`);
  await page.fill('#Package-price', '34567');
  await page.click('form button:has-text("Save")');
  await page.waitForSelector(`tr:has-text("Browser Test Package ${stamp}"):has-text("34,567")`);
  await page.click(`tr:has-text("Browser Test Package ${stamp}") button:has-text("Delete")`);
  await page.click('dialog[open] .modal-confirm');
  await page.waitForSelector(`tr:has-text("Browser Test Package ${stamp}")`, { state: 'detached' });

  // a package with bookings cannot be deleted
  expectedStatus = '409';
  await page.click('tr:has-text("Kandy Cultural Discovery") button:has-text("Delete")');
  await page.click('dialog[open] .modal-confirm');
  await page.waitForSelector('.alert-error:has-text("has bookings")');
  expectedStatus = null;

  // disable and enable the customer
  await page.click('[role="tab"]:has-text("Customers")');
  await page.waitForSelector(`tr:has-text("${email}")`);
  await page.click(`tr:has-text("${email}") button:has-text("Disable")`);
  await page.waitForSelector(`tr:has-text("${email}") .status-Cancelled`);
  await page.click(`tr:has-text("${email}") button:has-text("Enable")`);
  await page.waitForSelector(`tr:has-text("${email}") .status-Confirmed`);

  // add a FAQ, check it shows on the About page
  await page.click('[role="tab"]:has-text("Website content")');
  await page.waitForSelector('h2:has-text("Frequently asked questions")');
  const faqBlock = page.locator('.manage', { hasText: 'Frequently asked questions' });
  await faqBlock.locator('button:has-text("Add faq")').click();
  await page.fill('#FAQ-question', 'Does the browser test work ' + stamp + '?');
  await page.fill('#FAQ-answer', 'Yes, this answer was added through the admin page.');
  await page.click('form button:has-text("Save")');
  await page.waitForSelector(`tr:has-text("browser test work ${stamp}")`);
  await page.goto(BASE + '/about');
  await page.waitForSelector(`.faq-item:has-text("browser test work ${stamp}")`);

  // messages tab
  await page.goto(BASE + '/admin?tab=messages');
  await page.waitForSelector(`tr:has-text("browser test ${stamp}")`);
  await page.context().close();
});

test('admin can switch a currency off and the public switcher follows', async () => {
  const admin = await newPage();
  await login(admin, 'admin@skytrailtravels.lk', 'Admin@123');
  await admin.goto(BASE + '/admin?tab=currencies');
  await admin.waitForSelector('tr:has(td:text-is("EUR"))');
  try {
    await admin.click('tr:has(td:text-is("EUR")) button:has-text("Disable")');
    await admin.waitForSelector('tr:has(td:text-is("EUR")) .status-Cancelled');
    const visitor = await newPage();
    await visitor.goto(BASE + '/destinations');
    await visitor.waitForSelector('.card');
    assert.deepEqual(await visitor.locator('#currency option').allInnerTexts(), ['LKR', 'USD', 'GBP', 'INR']);
    await visitor.context().close();

    await admin.click('tr:has(td:text-is("EUR")) button:has-text("Enable")');
    await admin.waitForSelector('tr:has(td:text-is("EUR")) .status-Confirmed');
  } finally {
    await admin.request.patch(BASE + '/api/admin/currencies/EUR', { data: { enabled: true } });
  }
  // the base currency cannot be switched off or deleted from the screen
  assert.equal(await admin.locator('tr:has(td:text-is("LKR")) button').count(), 0);
  // refreshing asks the live service, so either a success or an error message comes back
  await admin.click('button:has-text("Refresh rates now")');
  await admin.waitForSelector('.alert-success, .alert-error');
  await admin.context().close();
});

test('admin can change the phone number and the footer follows', async () => {
  const admin = await newPage();
  await login(admin, 'admin@skytrailtravels.lk', 'Admin@123');
  const original = await (await admin.request.get(BASE + '/api/admin/site')).json();
  try {
    await admin.goto(BASE + '/admin?tab=site');
    await admin.waitForSelector('#site-phone');
    assert.equal(await admin.inputValue('#site-phone'), original.phone);
    await admin.fill('#site-phone', '+94 81 222 3344');
    await admin.click('form button:has-text("Save")');
    await admin.waitForSelector('.alert-success:has-text("saved")');
    await admin.waitForSelector('footer a[href="tel:+94812223344"]');
    assert.match(await admin.locator('footer').innerText(), /\+94 81 222 3344/);

    // a wrong value is refused by the API and the message is shown
    expectedStatus = '400';
    await admin.fill('#site-phone', 'abc');
    await admin.click('form button:has-text("Save")');
    await admin.waitForSelector('.alert-error');
    expectedStatus = null;
  } finally {
    await admin.request.put(BASE + '/api/admin/site', { data: original });
  }
  await admin.reload();
  await admin.waitForSelector('footer a[href^="tel:"]');
  assert.match(await admin.locator('footer').innerText(), /\+94 77 165 4746/);
  await admin.context().close();
});

test('admin can feature a package and the home page follows', async () => {
  const admin = await newPage();
  await login(admin, 'admin@skytrailtravels.lk', 'Admin@123');
  const title = 'Kandy Cultural Discovery';
  const original = await (await admin.request.get(BASE + '/api/packages/1')).json();
  assert.equal(original.title, title);
  const visitor = await newPage();
  try {
    await admin.goto(BASE + '/admin?tab=packages');
    await admin.waitForSelector(`tr:has-text("${title}")`);
    await admin.click(`tr:has-text("${title}") button:has-text("Edit")`);
    await admin.selectOption('#Package-featured', { label: 'Yes' });
    await admin.click('form button:has-text("Save")');
    await admin.waitForSelector('.alert-success');

    await visitor.goto(BASE + '/');
    await visitor.waitForSelector('.card');
    assert.match(await visitor.locator('.card h3').allInnerTexts().then(list => list.join('|')), new RegExp(title));
  } finally {
    const { title: t, destination_id, category, price, duration_days, description } = original;
    await admin.request.put(BASE + '/api/admin/packages/1', { data: { title: t, destination_id, category, price, duration_days, description, featured: 0 } });
  }
  await visitor.goto(BASE + '/');
  await visitor.waitForSelector('.card');
  assert.doesNotMatch(await visitor.locator('.card h3').allInnerTexts().then(list => list.join('|')), new RegExp(title));
  await visitor.context().close();
  await admin.context().close();
});

test('the booking form takes its limits from the API', async () => {
  const page = await newPage();
  await login(page, email, password);
  await page.goto(BASE + '/booking?package=1');
  const cfg = await (await page.request.get(BASE + '/api/config')).json();
  await page.waitForFunction(max => document.querySelector('#special_requests')?.maxLength === max, cfg.specialRequestsMax);
  assert.equal(await page.getAttribute('#travellers', 'max'), String(cfg.maxTravellers));
  assert.equal(await page.getAttribute('#full_name', 'maxlength'), String(cfg.nameMax));

  // the calendar starts at the earliest allowed day: the day before is disabled
  await page.click('#travel_date');
  await page.waitForSelector('.date-popover');
  const dayBefore = new Date(Date.parse(cfg.minTravelDate) - 86400000).toISOString().slice(0, 10);
  const blocked = page.locator(`td[data-day="${dayBefore}"]:not([data-outside])`);
  if (await blocked.count()) assert.equal(await blocked.getAttribute('data-disabled'), 'true');
  assert.equal(await page.locator(`td[data-day="${cfg.minTravelDate}"]:not([data-outside]) button`).isEnabled(), true);
  await page.keyboard.press('Escape');
  await page.context().close();
});

test('booking form: names, phone numbers and message length are handled like a production form', async () => {
  const page = await newPage();
  await login(page, email, password);
  await page.goto(BASE + '/booking?package=1');
  await page.waitForSelector('#full_name');

  // digits and symbols never get into a name
  await page.fill('#full_name', "Ilma 123 <b>Fa'rook</b>");
  assert.equal(await page.inputValue('#full_name'), "Ilma bFa'rookb");

  // the phone box formats as you type and knows the country
  assert.match(await page.locator('.phone-country span').innerText(), /\+94/);
  await page.fill('#phone', '0771234567');
  assert.equal(await page.inputValue('#phone'), '077 123 4567');
  await page.fill('#phone', '+971501234567');
  assert.match(await page.locator('.phone-country span').innerText(), /\+971/);
  await page.selectOption('.phone-country select', 'GB');
  assert.match(await page.locator('.phone-country span').innerText(), /\+44/);

  // a number that is too short for the country is refused before anything is sent
  await page.fill('#phone', '12');
  await page.fill('#travellers', '2');
  await pickDate(page, 'travel_date', futureDate(10));
  await page.click('button[type="submit"]');
  await page.waitForSelector('.has-error #phone');

  // the message counter follows what is typed
  await page.fill('#special_requests', 'Window seat');
  assert.match(await page.locator('#special_requests-count').innerText(), /^11 \/ \d+ characters$/);
  await page.context().close();
});

test('compare shows the best tags and follows a currency change', async () => {
  const page = await newPage();
  await page.goto(BASE + '/destinations');
  await page.waitForSelector('.card');
  const boxes = page.locator('.compare-toggle input');
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.click('.compare-bar a:has-text("Compare now")');
  await page.waitForSelector('.compare-table');
  assert.ok(await page.locator('.best-tag').count() >= 3);
  const priceCell = page.locator('.compare-table tbody tr:nth-child(3) td').first();
  assert.match(await priceCell.innerText(), /^LKR /);

  await page.selectOption('#currency', 'GBP');
  await page.waitForFunction(() => document.querySelector('.compare-table tbody tr:nth-child(3) td').innerText.startsWith('≈ £'));
  assert.ok(await page.locator('.best-tag').count() >= 3);
  assert.match(await page.locator('.currency-note').innerText(), /converted from LKR/);
  await page.context().close();
});

test('unknown address shows the 404 page with a 404 status', async () => {
  const page = await newPage({}, false);
  const res = await page.goto(BASE + '/no-such-page');
  assert.equal(res.status(), 404);
  await page.waitForSelector('h1:has-text("find that page")');
  const direct = await page.goto(BASE + '/admin');
  assert.equal(direct.status(), 200);
  await page.context().close();
});

test('mobile: menu opens and pages do not scroll sideways', async () => {
  const page = await newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '/');
  await page.waitForSelector('.card');
  await page.click('.nav-toggle');
  assert.equal(await page.locator('nav.main-nav.open').count(), 1);
  assert.equal(await page.locator('#nav-auth-area-mobile a:visible').count() >= 2, true);
  for (const path of ['/', '/destinations', '/gallery', '/about', '/login', '/privacy', '/credits', '/packages/1']) {
    await page.goto(BASE + path);
    await quiet_network(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${path} overflows by ${overflow}px`);
  }
  await page.context().close();
});

test('without JavaScript the public pages still show real content', async () => {
  const page = await newPage({ javaScriptEnabled: false }, false);
  await page.goto(BASE + '/packages/1');
  assert.match(await page.locator('h1').innerText(), /Kandy Cultural Discovery/);
  assert.match(await page.locator('main').innerText(), /LKR 45,000/);
  await page.goto(BASE + '/destinations');
  assert.ok(await page.locator('main li a').count() >= 20);
  await page.goto(BASE + '/about');
  assert.match(await page.locator('main').innerText(), /178, Old Gampola Road/);
  await page.context().close();
});

test('footer shows the business phone and address', async () => {
  const page = await newPage();
  await page.goto(BASE + '/');
  // the details come from /api/site, so wait for them instead of for the footer
  await page.waitForSelector('footer a[href^="tel:"]');
  const footer = await page.locator('footer').innerText();
  assert.match(footer, /\+94 77 165 4746/);
  assert.match(footer, /178, Old Gampola Road, Peradeniya, Kandy/);
  assert.equal(await page.locator('footer a[href="tel:+94771654746"]').count(), 1);
  await page.context().close();
});

test('keyboard: skip link is the first thing you can tab to', async () => {
  const page = await newPage();
  await page.goto(BASE + '/');
  // Safari only moves focus to links with Alt held
  await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
  const text = await page.evaluate(() => document.activeElement.textContent);
  assert.match(text, /Skip to main content/);
  await page.context().close();
});

test('accessibility: no serious or critical axe violations', async () => {
  const page = await newPage();
  await login(page, email, password);
  const paths = ['/', '/destinations', '/packages/1', '/compare', '/gallery', '/about', '/privacy', '/credits', '/login', '/register', '/booking?package=1', '/my-bookings'];
  const bad = [];
  for (const path of paths) {
    await page.goto(BASE + path);
    await quiet_network(page);
    await page.waitForTimeout(400);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
    const serious = result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`  axe ${path}: ${result.violations.length} violations, ${serious.length} serious/critical`);
    serious.forEach(v => bad.push(`${path}: ${v.id} (${v.nodes.length} nodes) ${v.help}`));
  }
  await page.context().close();

  const quiet = await newPage({}, false);
  await quiet.goto(BASE + '/no-such-page');
  await quiet_network(quiet);
  const notFound = await new AxeBuilder({ page: quiet }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  notFound.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    .forEach(v => bad.push(`404 page: ${v.id} ${v.help}`));
  await quiet.context().close();

  const admin = await newPage();
  await login(admin, 'admin@skytrailtravels.lk', 'Admin@123');
  for (const tab of ['bookings', 'packages', 'destinations', 'customers', 'content', 'messages', 'currencies', 'site']) {
    await admin.goto(BASE + '/admin?tab=' + tab);
    await quiet_network(admin);
    await admin.waitForTimeout(400);
    const result = await new AxeBuilder({ page: admin }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
    const serious = result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`  axe /admin?tab=${tab}: ${result.violations.length} violations, ${serious.length} serious/critical`);
    serious.forEach(v => bad.push(`admin ${tab}: ${v.id} (${v.nodes.length} nodes) ${v.help}`));
  }
  await admin.context().close();
  assert.deepEqual(bad, []);
});

test('a page whose script file is out of date reloads itself instead of going blank', async () => {
  const page = await newPage({}, false);
  await login(page, email, password);
  const pages = [
    ['MyBookingsPage', '/my-bookings', 'My bookings'],
    ['BookingPage', '/booking?package=1', 'Enquire'],
    ['ComparePage', '/compare', 'Compare'],
    ['PrivacyPage', '/privacy', 'Privacy'],
    ['CreditsPage', '/credits', 'Photo credits'],
  ];
  for (const [chunk, path, heading] of pages) {
    // the first request for this page's file fails, like it does after a new build
    let blocked = false;
    await page.evaluate(() => sessionStorage.clear());
    await page.route(`**/assets/${chunk}-*.js`, route => {
      if (blocked) return route.continue();
      blocked = true;
      return route.fulfill({ status: 404, contentType: 'text/html', body: 'not found' });
    });
    await page.evaluate(p => {
      history.pushState({}, '', p);
      dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await page.waitForSelector('h1');
    await page.waitForFunction(h => document.querySelector('h1')?.innerText.includes(h), heading);
    assert.ok(blocked, `${chunk} was requested`);
  }
});

test('search box suggests matches and popular destinations, and works from the keyboard', async () => {
  const page = await newPage();
  await page.goto(BASE + '/');
  await page.click('.search-bar input');
  // before typing: a hint on the left and the popular destinations on the right
  await page.waitForSelector('.suggest-popular a');
  assert.equal(await page.locator('.suggest-popular a').count(), 5);
  assert.match(await page.locator('.suggest-note').innerText(), /at least 2 letters/);

  await page.fill('.search-bar input', 'mir');
  await page.waitForSelector('[role="option"]');
  const first = page.locator('[role="option"]').first();
  assert.ok((await first.locator('.suggest-title').innerText()).length > 0);
  assert.match(await first.locator('.suggest-sub').innerText(), /journey/);
  assert.equal(await page.getAttribute('.search-bar input', 'aria-expanded'), 'true');

  // the hero text fades in for about a second, and axe reads half-faded colours
  await page.waitForTimeout(1500);
  const accessibility = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(accessibility.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id), []);

  await page.keyboard.press('ArrowDown');
  assert.equal(await page.getAttribute('[role="option"]:first-child', 'aria-selected'), 'true');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/destinations\?destination=\d+/);

  await page.goto(BASE + '/');
  await page.click('.search-bar input');
  await page.waitForSelector('.suggest-panel');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.suggest-panel').count(), 0);

  // a popular destination opens that destination's journeys
  await page.click('.search-bar input');
  await page.click('.suggest-popular a');
  await page.waitForURL(/\/destinations\?destination=\d+/);
});

test('featured journeys open the package when any part of the card is clicked', async () => {
  const page = await newPage();
  await page.goto(BASE + '/');
  await page.waitForSelector('.card .desc');
  // force: the card's own link covers it, so playwright would otherwise wait for the cover to go away
  await page.locator('.card .desc').first().click({ force: true });
  await page.waitForURL(/\/packages\/\d+/);
  await page.goto(BASE + '/');
  await page.getByRole('link', { name: 'Featured journeys' }).click();
  await page.waitForURL(/\/destinations$/);
});

test('login and private pages: no login form for people already in, and a way back after logging in', async () => {
  // a signed-in customer who opens the login or register page is sent home
  const page = await newPage();
  await login(page, email, password);
  await page.goto(BASE + '/login');
  await page.waitForURL(BASE + '/');
  await page.goto(BASE + '/register');
  await page.waitForURL(BASE + '/');

  // the login runs out in the background: the next private page sends them to log in again
  expectedStatus = '401'; // the browser logs the refused request, that is the point of this step
  await page.context().clearCookies();
  await page.click('#nav-auth-area a:has-text("My bookings")');
  await page.waitForURL(/\/login$/);
  expectedStatus = null;
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + '/my-bookings'); // back where they were going
  await page.context().close();

  // a visitor who opens a private page is sent to log in, then returned to it
  const visitor = await newPage();
  await visitor.goto(BASE + '/my-bookings');
  await visitor.waitForURL(/\/login$/);
  await visitor.fill('#email', email);
  await visitor.fill('#password', password);
  await visitor.click('button[type="submit"]');
  await visitor.waitForURL(BASE + '/my-bookings');
  await visitor.context().close();

  // staff go straight to the admin area, and never see the customer bookings page
  const staff = await newPage();
  await staff.goto(BASE + '/login');
  await staff.fill('#email', 'admin@skytrailtravels.lk');
  await staff.fill('#password', 'Admin@123');
  await staff.click('button[type="submit"]');
  await staff.waitForURL(/\/admin$/);
  await staff.goto(BASE + '/login');
  await staff.waitForURL(/\/admin$/);
  await staff.goto(BASE + '/my-bookings');
  await staff.waitForURL(/\/admin$/);
  await staff.context().close();

  // a customer who opens the admin area is told it is not for them, with a way home
  const customer = await newPage();
  await login(customer, email, password);
  await customer.goto(BASE + '/admin');
  await customer.waitForSelector('.alert-error');
  assert.equal(await customer.locator('.form-card a:has-text("Home")').count(), 1);
  await customer.context().close();
});

test('no console errors during the whole run', () => {
  assert.deepEqual(consoleErrors, []);
});
