# Deploying Cosaki (test / feedback build)

This bundles the React frontend **and** the Express API into a single web
service, with a managed PostgreSQL database. It is meant for sharing a test link
with cosplayers & shop owners — **not** a hardened production launch.

## What testers get
- Login with **any phone number** + demo code **`123456`** (no SMS needed).
- KYC auto-approves (no S3 / manual review).
- Payments are mocked (no real charge); escrow flow still works end-to-end.

---

## Option A — Render (recommended, free)

1. Push this repo to GitHub (see below).
2. Go to <https://render.com> → sign in with GitHub.
3. **New → Blueprint** → pick your `cosaki` repo → **Apply**.
   - `render.yaml` provisions the web service **and** a free PostgreSQL DB,
     wires `DATABASE_URL`, generates JWT secrets, and sets the demo env vars.
4. Wait for the build (~3–5 min). Migrations run automatically on start.
5. Open the service URL (e.g. `https://cosaki.onrender.com`) — that's your test link. 🎉

> Free Postgres on Render expires after ~30 days and the web service sleeps when
> idle (first request after sleep takes ~30s to wake). Fine for feedback testing.

## Option B — Railway / Fly / any Node host
Set these env vars, point the start command at `npm start`, build with `npm run build`:

| Var | Value |
|---|---|
| `DATABASE_URL` | your Postgres connection string |
| `JWT_SECRET` | any long random string |
| `JWT_REFRESH_SECRET` | another long random string |
| `DEMO_OTP` | `123456` |
| `DISABLE_RATE_LIMIT` | `true` |
| `NODE_ENV` | `production` |
| `DATABASE_SSL` | `true` (if your DB needs SSL) |

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
