# SkyTrail Travels

Website for the SkyTrail Travels scenario (NovaEdge Digital Solutions), Pearson BTEC HND in Computing, Unit 13: Web Design and Development.

Customers can browse and search destinations and packages, compare up to three, switch the currency, register, send booking enquiries and edit or cancel them. Staff can manage bookings, packages, destinations, customers, website content, contact details and currencies in the admin area.

## Stack

- **Front-end:** React 19, React Router, Vite, `react-i18next`. It only displays things; the rules, data and calculations come from the API.
- **Back-end:** plain PHP 8 (no framework). `router.php` is the entry point, with route files in `routes/` and helpers in `lib/`.
- **Database:** SQLite through PDO. It is created from `db/schema.sql` and `db/seed.php` on first run.
- **Text:** every sentence is in a language file: `client/src/i18n/en.json` for React and `lang/en.php` for PHP.


## Running it

You need PHP 8 (with the `pdo_sqlite` extension, which most installs include) and Node.js.

```bash
npm run build     # installs the client packages and builds the React app into ./public
npm start         # serves everything on http://localhost:3000
```

The built app is already in `public/`, so `npm start` alone is enough to look at the site. The database is created on the first request.

`npm start` serves the files that were built, so a change shows only after `npm run build` and a refresh. For front-end work with live updates run `npm run dev` and open http://localhost:5173. It starts the PHP site on port 3000 too (or uses the one already running), and Vite sends `/api` requests to it.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Customer | customer@example.com | Customer@123 |
| Admin | admin@skytrailtravels.lk | Admin@123 |

## Tests

```bash
npm install            # once, installs Playwright and axe-core for the browser tests
npx playwright install # once, downloads the browsers

npm test               # API tests
npm run test:e2e       # browser tests (BROWSER=firefox or BROWSER=webkit for the other engines)
npm run test:i18n      # checks that no text is typed into the React code
node --test tests/i18n-server.test.mjs   # same check for the PHP code
```

The API and browser tests start their own server (port 3100) with their own empty database, `db/test.db`, and remove it afterwards. They never touch the real accounts and bookings in `db/skytrail.db`, so nothing needs resetting.

## Your data

Accounts, bookings, packages, messages and settings live in one SQLite file, `db/skytrail.db` by default, and are kept between runs. The demo data is added once when the file is new and is never put back, so whatever staff delete or change stays that way.

- **Backups:** `npm start` saves a copy in a `backups` folder next to the database, the first request each day saves another, and `npm run backup` makes one on demand. The newest ten are kept, and a backup is refused if the database fails its integrity check. To restore, stop the site and copy a backup over the database file.
- **Somewhere else:** to keep the file outside a synced folder such as OneDrive, put `SKYTRAIL_DB=/full/path/skytrail.db` in a `.env` file in this folder (it is not in git).
- **Wiping it on purpose:** `npm run db:reset -- --yes` (a backup is saved first).
- **Check:** `npm run test:db` proves data survives restarts and backups work.

## Exchange rates

Prices are stored in Sri Lankan rupees. The server converts them with daily rates from the free [Exchange Rate API](https://www.exchangerate-api.com) and saves them in the database. A request that converts a price fetches new rates if the provider has published them. To keep rates current even when nobody visits, run `bin/refresh-rates.php` every morning from cron:

```text
0 7 * * * php /path/to/skytrail-travels/bin/refresh-rates.php
```

## Notes

- Photographs are from Wikimedia Commons and are credited on the site's Photo credits page. Their details are stored with each destination.
- PHP's built-in server does not compress files or cache them. On a real server (Apache or Nginx with PHP, behind HTTPS) turn on compression and long caching for the files in `public/assets`, `public/fonts` and `public/images`.
- If this folder is synced by OneDrive, give it a moment after `npm run build`. A sync conflict can rename `public/assets` to `assets 2` and leave the page blank; delete the renamed folder and build again.
- SkyTrail is a fictional client, so prices, durations and testimonials are illustrative. Destination facts were checked against sources.
