// Browser tests. Start the server first (npm start), then run: npm run test:e2e
// Pick a browser with BROWSER=firefox or BROWSER=webkit (default is chromium).
import test from 'node:test';
import assert from 'node:assert/strict';
import playwright from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.TEST_URL || 'http://localhost:3000';
const engine = process.env.BROWSER || 'chromium';
const stamp = Date.now();
const email = `e2e${stamp}@example.com`;
const password = 'Passw0rdOK';

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

async function login(page, who, pass) {
  await page.goto(BASE + '/login');
  // WebKit now and then lost a value typed within milliseconds of the form appearing,
  // so let the page settle first and check the field kept its value
  await page.waitForSelector('#email');
  await page.waitForLoadState('networkidle');
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
  await page.waitForLoadState('networkidle');
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
  await page.fill('#travel_date', futureDate(20));
  await page.fill('#travellers', '2');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.alert-success');

  await page.goto(BASE + '/my-bookings');
  await page.waitForSelector('tbody tr .status-pill');
  assert.match(await page.locator('tbody tr').first().innerText(), /pending/i);
  await page.click('button:has-text("Edit")');
  await page.fill('#e-travellers', '4');
  await page.click('button:has-text("Save changes")');
  await page.waitForSelector('.alert-success:has-text("updated")');
  assert.match(await page.locator('tbody tr').first().innerText(), /\b4\b/);

  page.once('dialog', d => d.accept());
  await page.click('button:has-text("Cancel") >> nth=0');
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
  page.once('dialog', d => d.accept());
  await page.click(`tr:has-text("Browser Test Package ${stamp}") button:has-text("Delete")`);
  await page.waitForSelector(`tr:has-text("Browser Test Package ${stamp}")`, { state: 'detached' });

  // a package with bookings cannot be deleted
  expectedStatus = '409';
  page.once('dialog', d => d.accept());
  await page.click('tr:has-text("Kandy Cultural Discovery") button:has-text("Delete")');
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
  await page.waitForFunction(() => document.querySelector('#travel_date') && document.querySelector('#travel_date').min);
  const cfg = await (await page.request.get(BASE + '/api/config')).json();
  assert.equal(await page.getAttribute('#travel_date', 'min'), cfg.minTravelDate);
  assert.equal(await page.getAttribute('#travellers', 'max'), String(cfg.maxTravellers));
  assert.equal(await page.getAttribute('#special_requests', 'maxlength'), String(cfg.specialRequestsMax));
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
    await page.waitForLoadState('networkidle');
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
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
    const serious = result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`  axe ${path}: ${result.violations.length} violations, ${serious.length} serious/critical`);
    serious.forEach(v => bad.push(`${path}: ${v.id} (${v.nodes.length} nodes) ${v.help}`));
  }
  await page.context().close();

  const quiet = await newPage({}, false);
  await quiet.goto(BASE + '/no-such-page');
  await quiet.waitForLoadState('networkidle');
  const notFound = await new AxeBuilder({ page: quiet }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  notFound.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    .forEach(v => bad.push(`404 page: ${v.id} ${v.help}`));
  await quiet.context().close();

  const admin = await newPage();
  await login(admin, 'admin@skytrailtravels.lk', 'Admin@123');
  for (const tab of ['bookings', 'packages', 'destinations', 'customers', 'content', 'messages', 'currencies', 'site']) {
    await admin.goto(BASE + '/admin?tab=' + tab);
    await admin.waitForLoadState('networkidle');
    await admin.waitForTimeout(400);
    const result = await new AxeBuilder({ page: admin }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
    const serious = result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`  axe /admin?tab=${tab}: ${result.violations.length} violations, ${serious.length} serious/critical`);
    serious.forEach(v => bad.push(`admin ${tab}: ${v.id} (${v.nodes.length} nodes) ${v.help}`));
  }
  await admin.context().close();
  assert.deepEqual(bad, []);
});

test('no console errors during the whole run', () => {
  assert.deepEqual(consoleErrors, []);
});
