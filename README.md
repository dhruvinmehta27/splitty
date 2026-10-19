# Splitty

Split expenses with friends. One codebase for iPhone, Android and the web, built with
[Expo](https://expo.dev) (React Native + TypeScript).

- Groups, four ways to split (equally, exact amounts, percentages, shares), balances per group and per friend
- Everything is saved on your device first, so the app responds instantly and works offline
- Optional sharing: send a group's secret link to friends and it stays in sync for everyone
- Backup export and import in Settings

## Run it

```bash
npm install
npx expo start        # press i for the iOS simulator, w for the browser
npm test              # split, backup and sync logic
```

Without any configuration the app keeps data on the device only and hides sharing.

## Sharing: bring your own database

Shared groups live in a database you control. This repository contains no database and no keys.

1. Create a free database at [SQLite Cloud](https://sqlitecloud.io) and copy its connection string
   (it contains an API key, so keep it secret).
2. Import this repository into [Vercel](https://vercel.com). `vercel.json` already configures the
   build, and `api/sync.ts` becomes the sync server. Tables are created on first use.
3. In Vercel, under Project → Settings → Environment Variables, add:
   - `SQLITECLOUD_URL`: your connection string (server only, never shipped to the app)
   - `EXPO_PUBLIC_API_URL`: your Vercel address, e.g. `https://my-splitty.vercel.app`
4. Redeploy. The Share button appears in each group.

For the iPhone or Android app, put `EXPO_PUBLIC_API_URL` in `.env.local` before building.

To try sharing locally, copy `.env.example` to `.env.local`, fill it in, then run `npm run dev:api`
next to `npx expo start`.

### How sharing stays private

- The database key exists only on the server. The app talks to `api/sync.ts`, never to the database.
- Each shared group has a random 256-bit key that is part of its link, after the `#`, so browsers
  don't send it in page requests. The server stores only its SHA-256 hash.
- Anyone with a group's link can read and edit that group, so share it only with its members.
- When the same expense is edited in two places, the most recent edit wins.
