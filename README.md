# Termjobs Leads

A responsive lead and callback workspace with duplicate phone detection, search, eight call statuses (including Busy), editable notes, callback dates, CSV export, and a custom SVG logo/favicon.

## Run

```sh
npm install
npm run dev
```

## Deploy to Vercel

Import this directory as a Vercel project (Vite preset), or run `npx vercel --prod` while signed into Vercel. Build: `npm run build`. Output: `dist`. The `/api/leads` Vercel function ships with the app.

## Durable cloud storage

1. Create a Neon Postgres database (including through Vercel Marketplace).
2. Set `DATABASE_URL` to its pooled connection URL in Vercel environment variables.
3. Redeploy. The database table is created automatically. The app loads and saves cloud data automatically with no sign-in.

Only signed-in team members can view and edit this shared workspace. Database credentials stay on the server. The app requires a working cloud connection to save; it never silently falls back to device-only saves. Previously cached browser lead copies are cleared on startup. Callback dates appear in the dashboard; the app does not send background notifications.

For iPhone, use Safari → Share → Add to Home Screen. Tap a phone number or callback phone button to call. The mobile input fields use 16px text to avoid Safari zoom.

`npm run dev` previews the frontend only; use Vercel deployment or `npx vercel dev` to run API routes.

## Team logins and admin setup

All leads are shared between authenticated team members. The first admin email defaults to `admin@gmail.com` and can be overridden with `ADMIN_EMAIL`.

1. Set `ADMIN_SETUP_TOKEN` in the deployment environment to a long random value (for example, generate one with `openssl rand -hex 32`). Deploy the app.
2. Open the app, enter the setup key and choose an admin password of at least 10 characters. Existing leads are preserved. Only the first admin can be created through setup.
3. In **Admin → Team accounts**, create staff accounts with initial passwords (one character minimum). Share credentials privately. Staff can click their name to change their password.
4. Remove `ADMIN_SETUP_TOKEN` from the deployment environment after setup. Admins can reset staff passwords and disable accounts; these actions immediately revoke existing sessions.

The API uses hashed passwords and revocable, HttpOnly session cookies. All lead and activity endpoints require login; admin endpoints enforce the admin role on the server. Lead data is no longer cached in browser local storage. Existing browser caches are cleared when the new app opens.

Tapping a phone number first records a **call attempt** with the current user and timestamp, then opens the phone dialer. The app cannot detect whether the phone call connected or its duration. After calling, edit the lead, choose the status, add notes and select **Record this save as a call outcome**. Status changes select this option automatically. Call attempts, reported outcomes, ordinary edits and deletions remain separate activity types. Existing leads have no retrospective caller attribution. Each lead displays who last set its status and when; notes-only edits preserve that attribution. Previously logged status changes also supply this label.

The admin dashboard shows current lead statuses, caller totals, today's attempts (India time), staff account controls and the latest 200 activity entries. Each lead shows its latest 100 activity entries. Only admins can delete leads; deleting a lead preserves its activity records.

## Verification

- `npm test` runs unit tests; integration tests run when `TEST_DATABASE_URL` is set to a **local test PostgreSQL database**. They create and remove an isolated schema and cover admin setup races, shared leads, caller attribution, role restrictions, account disabling, password resets, logout and login throttling.
- `npm run build` checks the production build targeting iOS 11 and later.
- For a temporary full-stack UI workspace: `TEST_DATABASE_URL=postgresql://... node tests/helpers/dev-server.mjs`. It uses an isolated schema and a test-only setup key `ui-test-setup-key`; stop it after testing. Set `TEST_PRODUCTION_BUILD=1` to serve the built `dist` app instead of the development client when checking older browser behavior.
- `scripts/verify-db.mjs` now requires `VERIFY_EMAIL` and `VERIFY_PASSWORD` for an admin account. It inserts and removes a temporary lead and leaves audit records.
