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

Anyone with the app URL can view and edit this shared workspace. Database credentials stay on the server. The app requires a working cloud connection to save; it never silently falls back to device-only saves. Previously cached browser leads remain in a local backup. Callback dates appear in the dashboard; the app does not send background notifications.

For iPhone, use Safari → Share → Add to Home Screen. Tap a phone number or callback phone button to call. The mobile input fields use 16px text to avoid Safari zoom.

`npm run dev` previews the frontend only; use Vercel deployment or `npx vercel dev` to run API routes.
