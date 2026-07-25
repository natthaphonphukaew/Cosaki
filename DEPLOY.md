# Deploying Cosaki (test / feedback build)

This bundles the React frontend **and** the Express API into a single web
service, with a managed PostgreSQL database. It is meant for sharing a test link
with cosplayers & shop owners — **not** a hardened production launch.

## What testers get
- Login with **any phone number** + demo code **`123456`** (no SMS needed).
- KYC auto-approves (no S3 / manual review).
- Payments are mocked (no real charge); escrow flow still works end-to-end.

---

## Option A — Railway (recommended: always-on 24/7)

Railway keeps both the web service **and** Postgres running around the clock (no
idle sleep, no cold starts), and its dashboard has a built-in table viewer.
Roughly ~$5/mo on the Hobby plan. The repo ships a `railway.json` (build/start/
healthcheck) and a `.nvmrc` pinning Node 20 — Railway reads both automatically.

1. Push this repo to GitHub (see **Push to GitHub** below).
2. Go to <https://railway.com> → sign in with GitHub → **New Project**.
3. **Deploy from GitHub repo** → pick your `cosaki` repo. Railway detects
   `railway.json` and starts the first build.
4. In the same project: **New → Database → Add PostgreSQL**. Railway creates a
   `Postgres` service with a private `DATABASE_URL`.
5. Open your **web service → Variables** and add:

   | Var | Value |
   |---|---|
   | `DATABASE_URL` | reference: `${{Postgres.DATABASE_URL}}` (the **private** URL — no SSL, free egress) |
   | `JWT_SECRET` | any long random string |
   | `JWT_REFRESH_SECRET` | another long random string |
   | `DEMO_OTP` | `123456` |
   | `DISABLE_RATE_LIMIT` | `true` |
   | `NODE_ENV` | `production` |

   > Use the private `${{Postgres.DATABASE_URL}}` reference (host ends in
   > `.railway.internal`). Only set `DATABASE_SSL=true` if you deliberately use the
   > **public** proxy URL instead.
6. **Settings → Networking → Generate Domain** to get a public URL. The app reads
   Railway's injected `PORT` automatically.
7. Redeploy. Migrations run on start (`npm start`), and `/health` gates the
   healthcheck. Open the domain — that's your live 24/7 link. 🎉

**Keep it always-on:** in the service **Settings**, make sure **App Sleeping /
Serverless is OFF** (it's off by default on Hobby). That's what guarantees it runs
even when nobody visits.

**View your data:** open the **Postgres** service → **Data** tab to browse tables
in the dashboard. Or connect any client (TablePlus / DBeaver / pgAdmin) using the
**public** connection string from the Postgres service's **Connect** tab.

## Option B — Render (free, but sleeps)

1. Push this repo to GitHub. 2. <https://render.com> → **New → Blueprint** → pick
the repo → **Apply** (`render.yaml` provisions everything).

> Free Render web services sleep after ~15 min idle (~30–50s cold start) and the
> free Postgres is deleted after ~30 days — fine for short feedback rounds, **not**
> for a 24/7 link.

## Option C — any other Node host
Build with `npm run build`, start with `npm start`, and set: `DATABASE_URL`,
`JWT_SECRET`, `JWT_REFRESH_SECRET`, `DEMO_OTP=123456`, `DISABLE_RATE_LIMIT=true`,
`NODE_ENV=production`, and `DATABASE_SSL=true` if your DB requires SSL.

---

## Push to GitHub

```bash
git init
git add .
git commit -m "Cosaki MVP — test build"
git branch -M main
git remote add origin https://github.com/<your-username>/cosaki.git
git push -u origin main
```

(Create the empty `cosaki` repo first at <https://github.com/new>.)

---

## Going to real production later
- Connect a real SMS provider and set `DEMO_OTP=""`.
- Connect AWS S3 (`AWS_S3_BUCKET`, keys) — KYC then uploads & waits for review.
- Connect Omise for real payments.
- Remove `DISABLE_RATE_LIMIT`.
