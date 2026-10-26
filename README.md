# Termjobs Leads

A responsive lead and callback workspace with duplicate phone detection, search, seven call statuses, editable notes, callback dates, CSV export, and a custom SVG logo/favicon.

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
3. Set `APP_PASSWORD` to a strong private workspace password. Redeploy after setting variables.
4. Sign in with that password once. This browser stays signed in through a secure HttpOnly cookie that renews for a year on every authenticated cloud request. Clearing cookies or using a different browser requires signing in again. The database table is created automatically.

Without these variables, data persists in localStorage on the same browser/device. Clearing browser data removes those records. Export CSV for a backup. Connecting cloud switches to the cloud dataset; export local records first. The app does not silently upload local records. The app loads cloud records automatically on every visit after sign-in. Saving requires a working cloud session; a failed connection never silently saves only to the device. Existing browser records are retained in a local backup when first connecting. This is a single shared private workspace, not a multi-user account system. Callback dates appear in the dashboard; the app does not send background notifications.

For iPhone, use Safari → Share → Add to Home Screen. Tap a phone number or callback phone button to call. The mobile input fields use 16px text to avoid Safari zoom.

`npm run dev` previews the frontend only; use Vercel deployment or `npx vercel dev` to run API routes.
