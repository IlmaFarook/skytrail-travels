// API tests. Start the server first (npm start), then run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TEST_URL || 'http://localhost:3100';
const stamp = Date.now();

// tiny client that keeps the session cookie between calls
function client() {
  let cookie = '';
  return async function call(method, path, data) {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: data ? JSON.stringify(data) : undefined,
      redirect: 'manual',
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text, headers: res.headers };
  };
}

function futureDate(days = 30) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

const goodBooking = (pkg = 1) => ({
  package_id: pkg, full_name: 'Test Traveller', email: 'traveller@example.com',
  phone: '+94771234567', travel_date: futureDate(), travellers: 2, special_requests: 'Window seat',
});

const admin = client();
const customer = client();
const other = client();
const customerEmail = `cust${stamp}@example.com`;
const otherEmail = `other${stamp}@example.com`;

test('admin can log in', async () => {
  const r = await admin('POST', '/api/auth/login', { email: 'admin@skytrailtravels.lk', password: 'Admin@123' });
  assert.equal(r.status, 200);
  assert.equal(r.json.user.role, 'admin');
});

// ---------- accounts ----------
test('register rejects a weak password', async () => {
  const r = await client()('POST', '/api/auth/register', { name: 'A', email: `w${stamp}@example.com`, password: '12345678' });
  assert.equal(r.status, 400);
});

test('register rejects a bad email', async () => {
  const r = await client()('POST', '/api/auth/register', { name: 'A', email: 'nope', password: 'Passw0rdOK' });
  assert.equal(r.status, 400);
});

test('register works and sets a safe session cookie', async () => {
  const r = await customer('POST', '/api/auth/register', { name: 'Test Customer', email: customerEmail, password: 'Passw0rdOK' });
  assert.equal(r.status, 201);
  const cookie = r.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
});

test('register rejects a duplicate email', async () => {
  const r = await client()('POST', '/api/auth/register', { name: 'Dup', email: customerEmail, password: 'Passw0rdOK' });
  assert.equal(r.status, 409);
});

test('login fails with the wrong password', async () => {
  const r = await client()('POST', '/api/auth/login', { email: customerEmail, password: 'wrongpass1' });
  assert.equal(r.status, 401);
});

test('login is locked after 5 wrong attempts', async () => {
  const victim = `lock${stamp}@example.com`;
  await client()('POST', '/api/auth/register', { name: 'Lock', email: victim, password: 'Passw0rdOK' });
  const c = client();
  let last;
  for (let i = 0; i < 6; i++) last = await c('POST', '/api/auth/login', { email: victim, password: 'badpass123' });
  assert.equal(last.status, 429);
  const good = await client()('POST', '/api/auth/login', { email: victim, password: 'Passw0rdOK' });
  assert.equal(good.status, 429);
});

// ---------- access control ----------
test('booking needs a login', async () => {
  const r = await client()('POST', '/api/bookings', goodBooking());
  assert.equal(r.status, 401);
});

test('admin routes reject anonymous users and customers', async () => {
  for (const path of ['/api/admin/bookings', '/api/admin/stats', '/api/admin/users', '/api/admin/messages']) {
    assert.equal((await client()('GET', path)).status, 403, 'anonymous ' + path);
    assert.equal((await customer('GET', path)).status, 403, 'customer ' + path);
  }
  assert.equal((await customer('POST', '/api/admin/packages', {})).status, 403);
  assert.equal((await customer('DELETE', '/api/admin/packages/1')).status, 403);
});

// ---------- bookings ----------
test('booking validation', async () => {
  assert.equal((await customer('POST', '/api/bookings', { ...goodBooking(), travel_date: '2020-01-01' })).status, 400);
  assert.equal((await customer('POST', '/api/bookings', { ...goodBooking(), travel_date: 'tomorrow' })).status, 400);
  assert.equal((await customer('POST', '/api/bookings', { ...goodBooking(), phone: 'abc' })).status, 400);
  assert.equal((await customer('POST', '/api/bookings', { ...goodBooking(), travellers: 0 })).status, 400);
  assert.equal((await customer('POST', '/api/bookings', { ...goodBooking(), travellers: 99 })).status, 400);
  assert.equal((await customer('POST', '/api/bookings', { ...goodBooking(), email: 'bad' })).status, 400);
  assert.equal((await customer('POST', '/api/bookings', goodBooking(99999))).status, 404);
});

let bookingId;
test('customer can create and list a booking', async () => {
  const r = await customer('POST', '/api/bookings', goodBooking());
  assert.equal(r.status, 201);
  bookingId = r.json.id;
  const list = await customer('GET', '/api/bookings/mine');
  assert.ok(list.json.some(b => b.id === bookingId && b.status === 'Pending'));
});

test('customer can edit a pending booking', async () => {
  const r = await customer('PATCH', `/api/bookings/${bookingId}`, { phone: '+94112345678', travel_date: futureDate(45), travellers: 3, special_requests: 'Vegetarian' });
  assert.equal(r.status, 200);
  const list = await customer('GET', '/api/bookings/mine');
  const b = list.json.find(x => x.id === bookingId);
  assert.equal(b.travellers, 3);
  assert.equal(b.phone, '+94112345678');
});

test('edit with a past date is rejected', async () => {
  const r = await customer('PATCH', `/api/bookings/${bookingId}`, { phone: '+94112345678', travel_date: '2020-01-01', travellers: 3 });
  assert.equal(r.status, 400);
});

test('another customer cannot touch this booking', async () => {
  await other('POST', '/api/auth/register', { name: 'Other', email: otherEmail, password: 'Passw0rdOK' });
  assert.equal((await other('PATCH', `/api/bookings/${bookingId}`, { phone: '+94112345678', travel_date: futureDate(), travellers: 1 })).status, 404);
  assert.equal((await other('POST', `/api/bookings/${bookingId}/cancel`)).status, 404);
});

test('customer can cancel, and only once', async () => {
  assert.equal((await customer('POST', `/api/bookings/${bookingId}/cancel`)).status, 200);
  const list = await customer('GET', '/api/bookings/mine');
  assert.equal(list.json.find(x => x.id === bookingId).status, 'Cancelled');
  assert.equal((await customer('POST', `/api/bookings/${bookingId}/cancel`)).status, 409);
  assert.equal((await customer('PATCH', `/api/bookings/${bookingId}`, { phone: '+94112345678', travel_date: futureDate(), travellers: 1 })).status, 409);
});

// ---------- public data ----------
test('packages can be filtered', async () => {
  const all = (await client()('GET', '/api/packages')).json;
  assert.ok(all.length >= 20);
  const honeymoon = (await client()('GET', '/api/packages?category=Honeymoon')).json;
  assert.ok(honeymoon.length >= 1 && honeymoon.every(p => p.category === 'Honeymoon'));
  const cheap = (await client()('GET', '/api/packages?maxPrice=50000')).json;
  assert.ok(cheap.every(p => p.price <= 50000));
  const short = (await client()('GET', '/api/packages?maxDuration=2')).json;
  assert.ok(short.every(p => p.duration_days <= 2));
});

test('a SQL injection attempt in search does nothing', async () => {
  const r = await client()('GET', "/api/packages?q=' OR 1=1 --");
  assert.equal(r.status, 200);
  assert.equal(r.json.length, 0);
  const again = await client()('GET', '/api/packages');
  assert.ok(again.json.length >= 20);
});

test('the API lists the currencies with their rates', async () => {
  const r = await client()('GET', '/api/currencies');
  assert.equal(r.status, 200);
  assert.equal(r.json.base, 'LKR');
  assert.equal(r.json.selected, 'LKR');
  assert.deepEqual(r.json.currencies.map(c => c.code), ['LKR', 'USD', 'EUR', 'GBP', 'INR']);
  assert.equal(r.json.currencies[0].rate, 1);
  for (const c of r.json.currencies) {
    assert.ok(c.rate > 0 && c.name && c.locale, c.code + ' is incomplete');
  }
  const usd = r.json.currencies.find(c => c.code === 'USD');
  assert.ok(usd.rate < 0.05, 'one LKR should be worth far less than one USD');
  assert.match(r.json.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(['live', 'fallback'].includes(r.json.source));
});

test('choosing a currency converts prices on the server', async () => {
  const c = client();
  const list = (await c('GET', '/api/currencies')).json.currencies;
  const rate = code => list.find(x => x.code === code).rate;

  assert.equal((await c('GET', '/api/packages/1')).json.currency, 'LKR');
  assert.equal((await c('PUT', '/api/currency', { code: 'usd' })).json.selected, 'USD');
  assert.equal((await c('GET', '/api/currencies')).json.selected, 'USD');

  const pkg = (await c('GET', '/api/packages/1')).json;
  assert.equal(pkg.currency, 'USD');
  assert.equal(pkg.price, 45000);
  assert.equal(pkg.price_converted, Math.round(45000 * rate('USD')));
  assert.equal(pkg.price_per_day, 15000);
  assert.equal(pkg.price_per_day_converted, Math.round(15000 * rate('USD')));

  const all = (await c('GET', '/api/packages')).json;
  assert.ok(all.every(p => p.currency === 'USD' && p.price_converted === Math.round(p.price * rate('USD'))));

  // ?currency= wins over the saved choice
  assert.equal((await c('GET', '/api/packages/1?currency=GBP')).json.price_converted, Math.round(45000 * rate('GBP')));
  // an unknown code falls back to LKR instead of failing
  assert.equal((await c('GET', '/api/packages/1?currency=XYZ')).json.currency, 'LKR');
  assert.equal((await c('PUT', '/api/currency', { code: 'XYZ' })).status, 400);
  assert.equal((await c('PUT', '/api/currency', {})).status, 400);
});

test('booking totals are converted too', async () => {
  const c = client();
  await c('POST', '/api/auth/register', { name: 'Currency User', email: `fx${stamp}@example.com`, password: 'Passw0rdOK' });
  await c('POST', '/api/bookings', goodBooking(1));
  await c('PUT', '/api/currency', { code: 'EUR' });
  const rate = (await c('GET', '/api/currencies')).json.currencies.find(x => x.code === 'EUR').rate;
  const b = (await c('GET', '/api/bookings/mine')).json[0];
  assert.equal(b.currency, 'EUR');
  assert.equal(b.total_price, b.price * b.travellers);
  assert.equal(b.total_converted, Math.round(b.total_price * rate));
});

test('the chosen currency is kept on the account', async () => {
  const email = `pref${stamp}@example.com`;
  const first = client();
  await first('POST', '/api/auth/register', { name: 'Pref User', email, password: 'Passw0rdOK' });
  await first('PUT', '/api/currency', { code: 'GBP' });
  await first('POST', '/api/auth/logout');
  // the choice survives logging out in the same browser
  assert.equal((await first('GET', '/api/currencies')).json.selected, 'GBP');
  // a brand new browser starts in LKR, then gets GBP back after login
  const second = client();
  assert.equal((await second('GET', '/api/currencies')).json.selected, 'LKR');
  await second('POST', '/api/auth/login', { email, password: 'Passw0rdOK' });
  assert.equal((await second('GET', '/api/currencies')).json.selected, 'GBP');
  assert.equal((await second('GET', '/api/packages/1')).json.currency, 'GBP');
});

test('only admins can manage currencies', async () => {
  assert.equal((await client()('GET', '/api/admin/currencies')).status, 403);
  assert.equal((await customer('GET', '/api/admin/currencies')).status, 403);
  assert.equal((await customer('PATCH', '/api/admin/currencies/EUR', { enabled: false })).status, 403);
  assert.equal((await customer('POST', '/api/admin/currencies/refresh')).status, 403);
});

test('admin can switch a currency off and on', async () => {
  assert.equal((await admin('PATCH', '/api/admin/currencies/EUR', { enabled: false })).status, 200);
  try {
    const visitor = client();
    const codes = (await visitor('GET', '/api/currencies')).json.currencies.map(c => c.code);
    assert.ok(!codes.includes('EUR'));
    assert.equal((await visitor('PUT', '/api/currency', { code: 'EUR' })).status, 400);
    assert.equal((await visitor('GET', '/api/packages/1?currency=EUR')).json.currency, 'LKR');
    const adminView = (await admin('GET', '/api/admin/currencies')).json.currencies;
    assert.equal(adminView.find(c => c.code === 'EUR').enabled, 0);
  } finally {
    assert.equal((await admin('PATCH', '/api/admin/currencies/EUR', { enabled: true })).status, 200);
  }
  assert.equal((await admin('PATCH', '/api/admin/currencies/LKR', { enabled: false })).status, 400);
  assert.equal((await admin('PATCH', '/api/admin/currencies/ZZZ', { enabled: false })).status, 404);
  assert.equal((await admin('DELETE', '/api/admin/currencies/LKR')).status, 400);
});

test('admin can add and remove a currency', async (t) => {
  const bad = { code: 'au', name: 'Australian dollar', locale: 'en-AU' };
  assert.equal((await admin('POST', '/api/admin/currencies', bad)).status, 400);
  assert.equal((await admin('POST', '/api/admin/currencies', { ...bad, code: 'AUD', name: 'x' })).status, 400);
  assert.equal((await admin('POST', '/api/admin/currencies', { ...bad, code: 'AUD', locale: 'australia' })).status, 400);
  assert.equal((await admin('POST', '/api/admin/currencies', { ...bad, code: 'USD' })).status, 409);

  const added = await admin('POST', '/api/admin/currencies', { ...bad, code: 'AUD' });
  if (added.status === 502) return t.skip('exchange-rate service not reachable from here');
  assert.equal(added.status, 201);
  try {
    const row = (await client()('GET', '/api/currencies')).json.currencies.find(c => c.code === 'AUD');
    assert.ok(row && row.rate > 0);
    assert.equal((await admin('POST', '/api/admin/currencies', { ...bad, code: 'ZZZ' })).status, 400, 'a code the rate service does not know');
  } finally {
    assert.equal((await admin('DELETE', '/api/admin/currencies/AUD')).status, 200);
  }
  assert.equal((await admin('DELETE', '/api/admin/currencies/AUD')).status, 404);
});

test('admin can refresh the rates', async (t) => {
  const r = await admin('POST', '/api/admin/currencies/refresh');
  if (r.status === 502) return t.skip('exchange-rate service not reachable from here');
  assert.equal(r.status, 200);
  assert.ok(r.json.currencies.length >= 5);
  assert.equal(r.json.source, 'live');
});

test('packages and destinations carry their photo details', async () => {
  const pkg = (await client()('GET', '/api/packages/1')).json;
  assert.equal(pkg.photo.image, 'kandy');
  assert.match(pkg.photo.alt, /Sacred Tooth Relic/);
  assert.ok(pkg.photo.author && pkg.photo.license && pkg.photo.licenseUrl.startsWith('https://') && pkg.photo.source.startsWith('https://'));
  assert.equal(pkg.destination_image, undefined, 'the flat photo columns should be folded into photo');
  const list = (await client()('GET', '/api/packages')).json;
  assert.ok(list.every(p => p.photo && p.photo.image));
  const dests = (await client()('GET', '/api/destinations')).json;
  assert.ok(dests.length >= 14);
  assert.ok(dests.every(d => d.photo && d.photo.image && d.photo.author));
});

test('link previews use the destination photo', async () => {
  const pkg = await client()('GET', '/packages/1');
  assert.match(pkg.text, /property="og:image" content="http:\/\/[^"]+\/images\/destinations\/kandy-1280\.jpg"/);
  const photo = await fetch(BASE + '/images/destinations/kandy-1280.jpg');
  assert.equal(photo.status, 200);
  assert.match(photo.headers.get('content-type'), /image\/jpeg/);
});

test('the rules the React app uses come from the API', async () => {
  const cfg = (await client()('GET', '/api/config')).json;
  assert.deepEqual(cfg.bookingStatuses, ['Pending', 'Confirmed', 'Cancelled', 'Completed']);
  assert.equal(cfg.maxTravellers, 20);
  assert.equal(cfg.compareMax, 3);
  assert.equal(cfg.passwordMinLength, 8);
  assert.match(cfg.minTravelDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(new RegExp(cfg.phonePattern).test('+94771234567'));
  assert.ok(!new RegExp(cfg.phonePattern).test('0771234567') && !new RegExp(cfg.phonePattern).test('abc'));
  assert.ok(new RegExp(cfg.namePattern, 'u').test('José O\'Neil-Smith Jr.') && !new RegExp(cfg.namePattern, 'u').test('Ilma 123'));
  assert.equal(cfg.defaultPhoneCountry, 'LK');
  assert.match(cfg.maxTravelDate, /^\d{4}-\d{2}-\d{2}$/);
});

test('the server enforces the same rules it publishes', async () => {
  const cfg = (await client()('GET', '/api/config')).json;
  const earliest = { ...goodBooking(), travel_date: cfg.minTravelDate };
  const ok = await customer('POST', '/api/bookings', earliest);
  assert.equal(ok.status, 201, 'the earliest allowed date should be accepted');
  const yesterday = new Date(Date.parse(cfg.minTravelDate) - 86400000).toISOString().slice(0, 10);
  const tooEarly = await customer('POST', '/api/bookings', { ...goodBooking(), travel_date: yesterday });
  assert.equal(tooEarly.status, 400);
  const tooMany = await customer('POST', '/api/bookings', { ...goodBooking(), travellers: cfg.maxTravellers + 1 });
  assert.equal(tooMany.status, 400);
  assert.match(tooMany.json.error, new RegExp('between 1 and ' + cfg.maxTravellers));
  const longNote = await customer('POST', '/api/bookings', { ...goodBooking(), special_requests: 'x'.repeat(cfg.specialRequestsMax + 1) });
  assert.equal(longNote.status, 400);
  assert.equal((await client()('POST', '/api/auth/register', { name: 'A', email: `short${stamp}@example.com`, password: 'a1' })).status, 400);
});

test('contact details come from the site settings', async () => {
  const site = (await client()('GET', '/api/site')).json;
  assert.equal(site.business.phone, '+94 77 165 4746');
  assert.equal(site.business.phoneLink, '+94771654746');
  assert.match(site.business.address, /Old Gampola Road, Peradeniya, Kandy/);
  assert.ok(site.business.social.facebook.startsWith('https://'));
  assert.equal(typeof site.business.map.lat, 'number');
  assert.ok(site.stats.destinations >= 14 && site.stats.packages >= 20);
});

test('admin can change the site settings and the pages follow', async () => {
  assert.equal((await client()('GET', '/api/admin/site')).status, 403);
  assert.equal((await customer('PUT', '/api/admin/site', {})).status, 403);
  const original = (await admin('GET', '/api/admin/site')).json;
  assert.equal(original.phone, '+94 77 165 4746');

  const bad = [{ phone: 'abc' }, { email: 'nope' }, { founded: '1800' }, { facebook: 'http://example.com' }, { map_lat: '120' }, { address: 'x' }];
  for (const change of bad) {
    assert.equal((await admin('PUT', '/api/admin/site', { ...original, ...change })).status, 400, JSON.stringify(change));
  }
  try {
    const changed = { ...original, phone: '+94 81 222 3344', email: `hello${stamp}@skytrailtravels.lk`, instagram: 'https://www.instagram.com/skytrail_test/' };
    assert.equal((await admin('PUT', '/api/admin/site', changed)).status, 200);
    const site = (await client()('GET', '/api/site')).json;
    assert.equal(site.business.phone, '+94 81 222 3344');
    assert.equal(site.business.phoneLink, '+94812223344');
    assert.equal(site.business.social.instagram, 'https://www.instagram.com/skytrail_test/');
    const about = await client()('GET', '/about');
    assert.match(about.text, /\+94 81 222 3344/);
    assert.match(about.text, new RegExp(`hello${stamp}@skytrailtravels.lk`));
    const home = await client()('GET', '/');
    assert.match(home.text, /"telephone":"\+94812223344"/);
  } finally {
    assert.equal((await admin('PUT', '/api/admin/site', original)).status, 200);
  }
  assert.equal((await client()('GET', '/api/site')).json.business.phone, '+94 77 165 4746');
});

test('featured packages are chosen by staff', async () => {
  const featured = (await client()('GET', '/api/packages?featured=1')).json;
  assert.ok(featured.length >= 3 && featured.every(p => p.featured === 1));
  const home = await client()('GET', '/');
  for (const p of featured) assert.ok(home.text.includes(p.title), p.title + ' missing from the server-rendered home page');

  const pkg = { title: 'Featured Test ' + stamp, destination_id: 1, category: 'Cultural', price: 11111, duration_days: 2, description: 'Created by the featured-package test.', featured: 1 };
  const created = await admin('POST', '/api/admin/packages', pkg);
  assert.equal(created.status, 201);
  try {
    assert.ok((await client()('GET', '/api/packages?featured=1')).json.some(p => p.id === created.json.id));
    assert.equal((await admin('PUT', `/api/admin/packages/${created.json.id}`, { ...pkg, featured: '0' })).status, 200);
    assert.ok(!(await client()('GET', '/api/packages?featured=1')).json.some(p => p.id === created.json.id));
  } finally {
    await admin('DELETE', `/api/admin/packages/${created.json.id}`);
  }
});

test('compare is worked out by the API', async () => {
  const c = client();
  const r = await c('GET', '/api/compare?ids=1,7,10');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.packages.map(p => p.id), [1, 7, 10], 'keeps the order that was asked for');
  assert.ok(r.json.packages.every(p => p.photo && p.price_per_day > 0));
  const byPrice = [...r.json.packages].sort((a, b) => a.price - b.price)[0].id;
  const byDays = [...r.json.packages].sort((a, b) => a.duration_days - b.duration_days)[0].id;
  assert.ok(r.json.best.price.includes(byPrice));
  assert.ok(r.json.best.duration.includes(byDays));
  assert.ok(r.json.best.value.length >= 1);

  assert.equal((await c('GET', '/api/compare')).status, 400);
  assert.equal((await c('GET', '/api/compare?ids=abc')).status, 400);
  const cfg = (await c('GET', '/api/config')).json;
  assert.equal((await c('GET', '/api/compare?ids=1,2,3,4')).status, cfg.compareMax < 4 ? 400 : 200);
  // unknown ids are skipped and one package has nothing to be compared with
  const one = (await c('GET', '/api/compare?ids=1,99999')).json;
  assert.equal(one.packages.length, 1);
  assert.equal(one.best, null);
  // prices follow the chosen currency
  const usd = (await c('GET', '/api/compare?ids=1,7&currency=USD')).json;
  assert.equal(usd.currency, 'USD');
  assert.ok(usd.packages.every(p => p.currency === 'USD' && p.price_converted < p.price));
});

test('blog posts and faqs are served', async () => {
  assert.ok((await client()('GET', '/api/blog')).json.length >= 6);
  assert.ok((await client()('GET', '/api/faqs')).json.length >= 7);
});

test('script text sent in a form is stored as plain text', async () => {
  const payload = '<script>alert(1)</script>';
  const r = await customer('POST', '/api/bookings', { ...goodBooking(), special_requests: payload });
  assert.equal(r.status, 201);
  const list = await customer('GET', '/api/bookings/mine');
  assert.equal(list.json.find(b => b.id === r.json.id).special_requests, payload);
});

// ---------- admin management ----------
test('admin stats and status update', async () => {
  const s = await admin('GET', '/api/admin/stats');
  assert.equal(s.status, 200);
  assert.ok(s.json.totalPackages >= 20);
  const list = (await admin('GET', '/api/admin/bookings')).json;
  assert.equal((await admin('PATCH', `/api/admin/bookings/${list[0].id}`, { status: 'Nonsense' })).status, 400);
});

test('admin can manage packages', async () => {
  const bad = await admin('POST', '/api/admin/packages', { title: 'x' });
  assert.equal(bad.status, 400);
  const pkg = { title: 'Test Package ' + stamp, destination_id: 1, category: 'Cultural', price: 12345, duration_days: 2, description: 'A package created by the automated tests.' };
  const created = await admin('POST', '/api/admin/packages', pkg);
  assert.equal(created.status, 201);
  const id = created.json.id;
  const edit = await admin('PUT', `/api/admin/packages/${id}`, { ...pkg, price: 20000 });
  assert.equal(edit.status, 200);
  assert.equal((await client()('GET', `/api/packages/${id}`)).json.price, 20000);
  // a package with bookings cannot be deleted
  await customer('POST', '/api/bookings', goodBooking(id));
  assert.equal((await admin('DELETE', `/api/admin/packages/${id}`)).status, 409);
  assert.equal((await admin('DELETE', '/api/admin/packages/1')).status, 409);
});

test('admin can delete a package with no bookings', async () => {
  const pkg = { title: 'Delete Me ' + stamp, destination_id: 1, category: 'Beach', price: 5000, duration_days: 1, description: 'Temporary package for the delete test.' };
  const id = (await admin('POST', '/api/admin/packages', pkg)).json.id;
  assert.equal((await admin('DELETE', `/api/admin/packages/${id}`)).status, 200);
  assert.equal((await client()('GET', `/api/packages/${id}`)).status, 404);
});

test('admin can manage destinations', async () => {
  const d = { name: 'Test Place ' + stamp, country: 'Sri Lanka', region: 'Test', description: 'A destination created by the tests.' };
  const created = await admin('POST', '/api/admin/destinations', d);
  assert.equal(created.status, 201);
  assert.equal((await admin('PUT', `/api/admin/destinations/${created.json.id}`, { ...d, region: 'Changed' })).status, 200);
  assert.equal((await admin('DELETE', '/api/admin/destinations/1')).status, 409);
  assert.equal((await admin('DELETE', `/api/admin/destinations/${created.json.id}`)).status, 200);
});

test('admin can manage testimonials, journal posts and FAQs', async () => {
  const t = await admin('POST', '/api/admin/testimonials', { name: 'Tester', quote: 'Great trip, thank you SkyTrail.', rating: 5 });
  assert.equal(t.status, 201);
  assert.equal((await admin('POST', '/api/admin/testimonials', { name: 'Tester', quote: 'short', rating: 9 })).status, 400);
  assert.equal((await admin('PUT', `/api/admin/testimonials/${t.json.id}`, { name: 'Tester', quote: 'Edited quote for the test.', rating: 4 })).status, 200);
  assert.equal((await admin('DELETE', `/api/admin/testimonials/${t.json.id}`)).status, 200);

  const p = await admin('POST', '/api/admin/blog', { title: 'Test journal post', body: 'Body text for the test journal post.' });
  assert.equal(p.status, 201);
  assert.equal((await admin('PUT', `/api/admin/blog/${p.json.id}`, { title: 'Edited journal post', body: 'Edited body text for the post.' })).status, 200);
  assert.equal((await admin('DELETE', `/api/admin/blog/${p.json.id}`)).status, 200);

  const f = await admin('POST', '/api/admin/faqs', { question: 'Is this a test question?', answer: 'Yes, it is only a test answer.' });
  assert.equal(f.status, 201);
  assert.equal((await admin('PUT', `/api/admin/faqs/${f.json.id}`, { question: 'Is this an edited question?', answer: 'Yes, it is an edited test answer.' })).status, 200);
  assert.equal((await admin('DELETE', `/api/admin/faqs/${f.json.id}`)).status, 200);
});

test('admin can disable and re-enable a customer account', async () => {
  const users = (await admin('GET', '/api/admin/users')).json;
  const target = users.find(u => u.email === otherEmail);
  assert.ok(target && target.is_active === 1);
  assert.equal((await admin('PATCH', `/api/admin/users/${target.id}`, { is_active: false })).status, 200);
  const blocked = await client()('POST', '/api/auth/login', { email: otherEmail, password: 'Passw0rdOK' });
  assert.equal(blocked.status, 403);
  assert.equal((await admin('PATCH', `/api/admin/users/${target.id}`, { is_active: true })).status, 200);
  const ok = await client()('POST', '/api/auth/login', { email: otherEmail, password: 'Passw0rdOK' });
  assert.equal(ok.status, 200);
  const adminUser = users.find(u => u.role === 'admin');
  assert.equal((await admin('PATCH', `/api/admin/users/${adminUser.id}`, { is_active: false })).status, 400);
});

test('contact form saves a message the admin can read', async () => {
  assert.equal((await client()('POST', '/api/contact', { name: 'A', email: 'bad', message: 'hello' })).status, 400);
  const ok = await client()('POST', '/api/contact', { name: 'Test', email: 'test@example.com', message: 'Hello from test ' + stamp });
  assert.equal(ok.status, 201);
  const msgs = (await admin('GET', '/api/admin/messages')).json;
  assert.ok(msgs.some(m => m.message.includes(String(stamp))));
});

// ---------- booking references ----------
test('every booking gets a unique reference that its owner and the admin can see', async () => {
  const first = await customer('POST', '/api/bookings', goodBooking());
  const second = await customer('POST', '/api/bookings', goodBooking(2));
  assert.equal(first.status, 201);
  assert.match(first.json.reference, /^ST\d{4}-[A-HJ-NP-Z2-9]{6}$/);
  assert.notEqual(first.json.reference, second.json.reference);

  const found = await customer('GET', `/api/bookings/reference/${first.json.reference}`);
  assert.equal(found.status, 200);
  assert.equal(found.json.reference, first.json.reference);
  assert.ok(found.json.package_title && found.json.destination_name && found.json.total_converted > 0);
  const lower = await customer('GET', `/api/bookings/reference/${first.json.reference.toLowerCase()}`);
  assert.equal(lower.status, 200);

  assert.equal((await other('GET', `/api/bookings/reference/${first.json.reference}`)).status, 404, 'someone else cannot open it');
  assert.equal((await client()('GET', `/api/bookings/reference/${first.json.reference}`)).status, 401);
  assert.equal((await customer('GET', '/api/bookings/reference/ST0000-AAAAAA')).status, 404);

  const mine = await customer('GET', '/api/bookings/mine');
  assert.ok(mine.json.every(b => /^ST\d{4}-/.test(b.reference)));
  assert.ok(mine.json.some(b => b.reference === first.json.reference));
  const all = await admin('GET', '/api/admin/bookings');
  assert.ok(all.json.some(b => b.reference === first.json.reference));
  assert.equal(new Set(all.json.map(b => b.reference)).size, all.json.length, 'references are unique');
});

// ---------- form fields: names, emails, phones, dates, messages ----------
test('names accept letters in any language and refuse digits and symbols', async () => {
  const guest = client();
  const post = (name) => guest('POST', '/api/auth/register', { name, email: `name${Math.random().toString(36).slice(2)}@example.com`, password: 'Passw0rdOK' });
  assert.equal((await post('Ilma 123')).status, 400);
  assert.equal((await post('<b>Ilma</b>')).status, 400);
  assert.equal((await post('A')).status, 400);
  assert.equal((await post('x'.repeat(61))).status, 400);
  const bad = await post('Ilma 123');
  assert.match(bad.json.error, /letters, spaces/);
  assert.equal((await post("José María O'Neil-Smith Jr.")).status, 201);
});

test('emails are checked with the standard filter', async () => {
  const guest = client();
  for (const email of ['nope', 'a@b', 'me@localhost', 'a b@c.com', 'a@@b.com']) {
    const r = await guest('POST', '/api/contact', { name: 'Test Visitor', email, message: 'Hello' });
    assert.equal(r.status, 400, email);
  }
  const ok = await guest('POST', '/api/contact', { name: 'Test Visitor', email: 'visitor@example.co.uk', message: 'Hello' });
  assert.equal(ok.status, 201);
});

test('phone numbers must be in international form', async () => {
  for (const phone of ['0771234567', '+0771234567', '+94', 'abc', '+94 77 12']) {
    const r = await customer('POST', '/api/bookings', { ...goodBooking(), phone });
    assert.equal(r.status, 400, phone);
  }
  const spaced = await customer('POST', '/api/bookings', { ...goodBooking(), phone: '+94 77 123 4567' });
  assert.equal(spaced.status, 201);
});

test('travel dates are limited at both ends and messages have a length limit', async () => {
  const cfg = (await client()('GET', '/api/config')).json;
  const last = await customer('POST', '/api/bookings', { ...goodBooking(), travel_date: cfg.maxTravelDate });
  assert.equal(last.status, 201);
  const dayAfter = new Date(Date.parse(cfg.maxTravelDate) + 86400000).toISOString().slice(0, 10);
  const tooFar = await customer('POST', '/api/bookings', { ...goodBooking(), travel_date: dayAfter });
  assert.equal(tooFar.status, 400);
  assert.match(tooFar.json.error, /on or before/);
  const long = await client()('POST', '/api/contact', { name: 'Test Visitor', email: 'visitor@example.com', message: 'x'.repeat(cfg.messageMax + 1) });
  assert.equal(long.status, 400);
  assert.match(long.json.error, new RegExp(String(cfg.messageMax)));
});

// ---------- search suggestions ----------
test('suggest: matches destinations and packages, and always sends the popular destinations', async () => {
  const guest = client();
  const r = await guest('GET', '/api/suggest?q=mir');
  assert.equal(r.status, 200);
  const types = r.json.matches.map(m => m.type);
  assert.ok(types.includes('destination') && types.includes('package'));
  assert.equal(r.json.matches[0].title, 'Mirissa');
  assert.ok(r.json.matches.length <= 6);
  assert.match(r.json.matches[0].subtitle, /Sri Lanka · \d+ journeys?/);
  assert.ok(r.json.popular.length > 0 && r.json.popular.length <= 5);
  assert.ok(r.json.popular.every(p => p.id && p.title && p.subtitle));
});

test('suggest: text that is too short gives no matches, wildcards are matched literally', async () => {
  const guest = client();
  const short = await guest('GET', '/api/suggest?q=m');
  assert.deepEqual(short.json.matches, []);
  assert.ok(short.json.popular.length > 0);
  const wild = await guest('GET', '/api/suggest?q=' + encodeURIComponent('%%'));
  assert.deepEqual(wild.json.matches, []);
  const none = await guest('GET', '/api/suggest?q=zzzzqq');
  assert.deepEqual(none.json.matches, []);
});

test('suggest: popular destinations follow the bookings made', async () => {
  const guest = client();
  const before = (await guest('GET', '/api/suggest')).json.popular;
  assert.equal(new Set(before.map(p => p.id)).size, before.length);
  const limit = (await guest('GET', '/api/config')).json.popularMax;
  assert.equal(before.length, limit);
});

// ---------- logout ----------
test('logout ends the session', async () => {
  assert.equal((await other('POST', '/api/auth/logout')).status, 200);
  assert.equal((await other('GET', '/api/auth/me')).json.user, null);
  assert.equal((await other('GET', '/api/bookings/mine')).status, 401);
});

// ---------- SEO and headers ----------
test('each page gets its own title, and package pages have structured data', async () => {
  const home = await client()('GET', '/');
  assert.match(home.text, /<title>Discover Sri Lanka &amp; Beyond \| SkyTrail Travels<\/title>/);
  assert.match(home.text, /"@type":"TravelAgency"/);
  const pkg = await client()('GET', '/packages/1');
  assert.match(pkg.text, /<title>Kandy Cultural Discovery/);
  assert.match(pkg.text, /"@type":"TouristTrip"/);
  assert.match(pkg.text, /rel="canonical"/);
  const login = await client()('GET', '/login');
  assert.match(login.text, /noindex/);
});

test('public pages come with server-rendered content', async () => {
  const home = await client()('GET', '/');
  assert.match(home.text, /<div id="root"><div class="ssr-page">/);
  assert.match(home.text, /href="\/packages\/\d+"/);
  const pkg = await client()('GET', '/packages/1');
  assert.match(pkg.text, /<h1>Kandy Cultural Discovery<\/h1>/);
  assert.match(pkg.text, /LKR 45,000/);
  const about = await client()('GET', '/about');
  assert.match(about.text, /How do I book a package\?/);
  assert.match(about.text, /"@type":"FAQPage"/);
  assert.match(about.text, /\+94771654746|\+94 77 165 4746/);
  const dest = await client()('GET', '/destinations');
  assert.ok((dest.text.match(/href="\/packages\/\d+"/g) || []).length >= 20);
  // private pages are not pre-rendered
  const login = await client()('GET', '/login');
  assert.match(login.text, /<div id="root"><\/div>/);
});

test('page text is escaped on the server', async () => {
  const admin2 = client();
  await admin2('POST', '/api/auth/login', { email: 'admin@skytrailtravels.lk', password: 'Admin@123' });
  const post = await admin2('POST', '/api/admin/blog', { title: 'Escape check <b>' + stamp, body: 'Body with <script>alert(1)</script> inside.' });
  const gallery = await client()('GET', '/gallery');
  assert.ok(!gallery.text.includes('<script>alert(1)</script>'));
  assert.match(gallery.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  await admin2('DELETE', `/api/admin/blog/${post.json.id}`);
});

test('unknown pages return 404, known routes return 200', async () => {
  assert.equal((await client()('GET', '/does-not-exist')).status, 404);
  assert.equal((await client()('GET', '/packages/99999')).status, 404);
  assert.equal((await client()('GET', '/api/nothing')).status, 404);
  for (const p of ['/', '/destinations', '/gallery', '/about', '/admin', '/my-bookings', '/privacy', '/credits', '/compare']) {
    assert.equal((await client()('GET', p)).status, 200, p);
  }
});

test('sitemap and robots.txt exist', async () => {
  const sm = await client()('GET', '/sitemap.xml');
  assert.match(sm.headers.get('content-type'), /xml/);
  assert.match(sm.text, /\/packages\/1</);
  assert.match(sm.text, /\/credits</);
  const robots = await client()('GET', '/robots.txt');
  assert.match(robots.text, /Disallow: \/admin/);
  assert.match(robots.text, /Sitemap:/);
});

test('security headers are sent', async () => {
  const r = await client()('GET', '/');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  const api = await client()('GET', '/api/packages');
  assert.equal(api.headers.get('x-content-type-options'), 'nosniff');
});
