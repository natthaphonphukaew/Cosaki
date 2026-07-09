# Cosaki — Cosplay Costume Rental Marketplace

Cosaki is a B2B2C **escrow marketplace** where cosplayers rent costumes/wigs/props from shops.
The platform holds the renter's payment in escrow and releases it to the shop only after a
"No-Damage" confirmation, funding a central insurance pool from a per-rental fee.

> This README is the **single source of truth** for the product's business logic, data model,
> and API. It's written so a fresh developer (or AI session) can rebuild full context. Pair it
> with `DEPLOY.md` (hosting) and the PRD (`PRD&Business Logic Cosaki.pdf`, Thai).

---

## 1. Status snapshot (read this first)

- **All 8 PRD milestones (A–H) are implemented and pass a 38-check end-to-end regression.**
- This is a **closed-feedback / test build**, not a hardened production launch.
- **Mocked on purpose** (real integration deferred): SMS OTP (use demo code), PromptPay QR
  (decorative), AWS S3 for KYC/evidence images, Omise card charge, courier tracking APIs.
- **Real & working**: the entire booking/escrow/money engine, KYC age-gating logic, coupons,
  split payment, seller strikes/freeze/ban, disputes/auto-refund, penalty bills, campaigns,
  chat, search/filters, shop profiles — all persisted to Postgres.
- **Git**: work is committed on `main` locally (~11 commits ahead) but **not pushed** — the
  owner's GitHub account (`Natthaphon926`) was auto-suspended (false-positive) and is under
  appeal. A `feature/all-features-functional` branch + PR #1 exist from before the suspension.

### Demo conventions (how testers log in without SMS/S3)
- **OTP**: any phone number + code **`123456`** logs in / auto-creates a renter. Controlled by
  `DEMO_OTP` env (defaults to `123456` when `NODE_ENV !== 'production'`). The OTP screen shows
  a "tap to fill" hint.
- **KYC**: in demo mode (no `AWS_S3_BUCKET`, or non-prod) the ID+selfie upload **auto-approves**
  (skips S3 + manual review). It still captures Date-of-Birth to drive age gating.
- **Rate limiting** is off in dev / when `DISABLE_RATE_LIMIT=true`.

---

## 2. Tech stack & layout

Monorepo with npm workspaces.

```
Cosaki/
├── server/                 # Node 20 + Express + PostgreSQL (pg), Passport (JWT + OAuth)
│   ├── db/
│   │   ├── migrate.js      # idempotent runner (tracks applied files in _migrations)
│   │   ├── migrations/     # 001–021 (see §8)
│   │   └── seeds/
│   └── src/
│       ├── app.js          # express app; serves built client from ../../client/dist in prod
│       ├── config/         # db.js (pg Pool, SSL auto-detect), passport.js, logger
│       ├── middlewares/    # auth.js (authenticate/requireRole/requireKYC), validate, errorHandler
│       ├── validators/     # express-validator rule sets
│       ├── services/       # notification, strike, storage(s3), auth(otp)
│       ├── controllers/    # one folder per domain
│       └── routes/v1/      # one file per domain, mounted in routes/v1/index.js
├── client/                 # React 18 + Vite + React Router v6 + Zustand + Tailwind
│   └── src/
│       ├── api/            # thin axios wrappers (client.js sets baseURL '/api/v1' + JWT + refresh)
│       ├── store/authStore.js   # persisted auth (user, tokens, mode 'renter'|'seller', shop)
│       ├── components/     # layout (AppShell, PageHeader, AuthGuard, BottomNav), ui/*
│       ├── pages/          # onboarding, discovery, renter, seller, post-rental, profile, chat, notifications
│       └── utils/          # favorites (localStorage wishlist/follow fallback), image (downscale→dataURL), age
├── render.yaml             # Render blueprint (web service + Postgres), see DEPLOY.md
└── DEPLOY.md
```

**Design system** (Tailwind): brand purple `#7C3AED`, pink `#EC4899`, gradient buttons,
lavender surface `#F4F3FF`, cards `rounded-2xl`, mobile-first `max-w-[390px]` centered.
Images are stored as **data-URLs** (client downscales via canvas) — no object storage in the
test build. Items without images render a deterministic gradient+emoji placeholder
(`components/ui/ProductImage.jsx`).

### Run locally
```bash
# backend  (migrations auto-apply is NOT automatic locally — run migrate first)
cd server && node db/migrate.js
NODE_ENV=development DEMO_OTP=123456 node src/app.js      # :5000
# client
npm run dev:client                                        # :3000 (Vite proxy /api → :5000)
```
Production single-service: `npm run build` (installs + builds client) then `npm start`
(runs `server/db/migrate.js` then `server/src/app.js`; Express serves `client/dist`).

---

## 3. Roles, auth & account model

- **users.role**: `renter | shop_admin | admin`. Everyone starts `renter`; opening a shop
  (`POST /shops`) promotes to `shop_admin` and returns a **fresh access token** with the new role.
- **Dual mode**: one account can both rent and sell. The client tracks a `mode` (`renter`/`seller`)
  in the auth store; the bottom nav + guards switch on it. Booking APIs disambiguate perspective
  with `?as=renter|shop`.
- **JWT**: access token (`JWT_SECRET`, 7d) carries `{sub, role}`; refresh token
  (`JWT_REFRESH_SECRET`, 30d). Google/Facebook OAuth strategies register **only if** their
  client-id/secret envs exist (missing creds no longer crash boot).
- **users.kyc_status**: `none | pending | verified | frozen`.
- **users.account_status**: `normal | pending_parent | watchlist | banned`.

---

## 4. THE MONEY MODEL (PRD §4.1) — memorize this

For a booking of `rental = chosen_rate × days`:

| Party | Amount |
|---|---|
| **Renter pays (total)** | `rental` + **Cosaki protection fee (10% of rental)** + `shipping_fee` + **booking fee ฿100** − `discount` |
| **Seller receives** | `rental` − **commission (10% of rental)** = `seller_payout` |
| **Cosaki keeps** | commission (10%) → **platform revenue** + protection fee (10%) → **central insurance fund** |

- **No security deposit** anymore. `deposit_amount` is kept as a column but set to 0.
- **Two rates per item**: `test_rate` (เทสที่บ้าน / test-at-home) vs `private_rate` (ไพรเวท/ออกงาน / event).
  `daily_rate` is mirrored from `test_rate` for backward-compat.
- **Booking fee ฿100** (`booking_fee`, PRD §5.2) is a **non-refundable first installment inside**
  the total — NOT an extra charge. It enables split payment.
- `bookings.total_amount` is a **GENERATED column** = `rental_fee + cosaki_fee + shipping_fee + booking_fee - discount`.
- On completion, `commission → platform_ledger.revenue_amount` and `cosaki_fee → platform_ledger.insurance_amount`.

**Worked example** (rate 500, 1 day, ฿40 shipping): renter pays `500 + 50 + 40 + 100 = ฿690`;
seller gets `500 − 50 = ฿450`; ledger gets 50 revenue + 50 insurance.

---

## 5. Booking lifecycle & payment states

`booking_status` enum: `draft → pending_kyc → pending_payment → escrowed → shipped → returned → completed`,
plus `disputed` and `cancelled`. Transitions are enforced by `VALID_TRANSITIONS` in
`booking.controller.js`.

Key gates & extra state (not new enum values — tracked via columns):
- **KYC gate**: `createBooking` sets initial status `pending_kyc` if renter not verified, else
  `pending_payment`. KYC completion (or account-level parental approval) advances pending_kyc → pending_payment.
- **Age/account gate** (`utils/age.js` `canRentAge`): age ≥ 15 required; item `min_age`
  0/15/18/20 — 18+ items allow **parent-approved minors**, 20+ require actual age; `banned`/`watchlist`
  and **frozen shop** are blocked at `createBooking`.
- **Split payment** (`pay_mode` + `amount_paid` + `balance_due`): `full` → escrowed;
  `deposit` charges only the ฿100 → stays `pending_payment` with a balance ("reserved"); paying the
  balance (`POST /payments/:bookingId/balance`) → escrowed.
- **Shop acceptance** (`accepted_at`): after payment (escrowed) the shop must **accept**
  (`POST /bookings/:id/accept`) before it can `ship`; **reject** (`/reject`) refunds + cancels.
  This is the PRD "รอยืนยันรับคิว" step.
- **No-Damage release**: `returned → completed` (shop marks "ตรวจผ่าน") sets the payment
  `escrow_status='released_to_shop'` and writes the platform_ledger row.
- **Escrow** lives in `payments.escrow_status`: `held | released_to_shop | refunded | compensated`.
- **Cancel** (`/cancel`): refunds paid amount **minus the ฿100 booking fee**. **Reschedule**
  (`/reschedule`): one free date change (`reschedule_used`), conflict-checked.

---

## 6. Business rules by domain (the hard-won details)

### KYC, age & parental consent (Milestone B, PRD §1.1/§1.2/§5.1)
- KYC upload captures `date_of_birth` + `real_name`. Age < 15 → rejected. Age < 18 → `is_minor`,
  `account_status='pending_parent'` (KYC can be verified but account is gated).
- **Account-level parental consent**: minor `POST /kyc/parent-consent {parent_phone}` →
  mock SMS link `/consent/:token`. `parent_consents.booking_id` is nullable (account-level).
  Parent opens the public `/consent/:token` page → approve sets `account_status='normal'`,
  `parent_approved=true` ("Verified (Parental Approved)") and advances pending_kyc bookings.
- Renter profile also stores default `address` + body measurements `bust/waist/hip/height`
  (shown under their reviews; used for size matching).

### Listing & PDP (Milestone C, PRD §2.2/§3.2) — watermark intentionally SKIPPED
- Items add: measurements (`bust/waist/hip`, `height_recommended`), SLA (`ship_lead_days`,
  `return_days`), badges (`allow_event`, `express_delivery`), `return_couriers[]`, up to **9 images**.
- PDP shows real measurements, SLA text, badges, couriers, **"rented X times"** (`rented_count` =
  completed bookings), reviewer measurements under reviews, an availability note, and a
  **Clickwrap agreement (2 mandatory checkboxes)** that gates the Book Now button (frontend).
- `GET /items/:id/availability` returns active booked date ranges; `SelectDates` disables them.

### Checkout (Milestone D, PRD §2.4/§5.2)
- Coupons (`coupons` table, scope `cosaki|shop`): applied to an existing booking via
  `POST /bookings/:id/coupon {code}` (validates min-spend, expiry, scope; percent or fixed;
  discount capped at subtotal). Seeded: `COSAKI10` (10%), `WELCOME50` (฿50 off, min ฿200).
- Payment screen is a **mock PromptPay QR** (`pages/renter/PaymentQR.jsx`) with a real-time
  "webhook" status stepper (รอชำระ → สำเร็จ → ร้านยืนยัน) → calls charge → success.

### Seller lifecycle & strikes (Milestone E, PRD §3.3/§4.2)
- **Action Center** (`OrderManagement`) buckets orders: รอรับคิว (escrowed & !accepted) /
  เตรียมส่ง / กำลังเช่า / เสร็จ. Shows the renter's **Trust Score** before accept.
- **Strike tiers** (`services/strike/strike.service.js`, `shop_strikes` ledger):
  **3 strikes / 30 days** → dropped from "recommended" (`is_recommended=false`);
  **5 strikes / 30 days** → **freeze shop 2 weeks** (`is_frozen`, `frozen_until`, `freeze_count++`);
  **3 lifetime freezes** → **ban** the owner (`account_status='banned'`). `ensureShopActive` lazily
  lifts an expired freeze. Frozen shops can't list items or be booked.
- **Dispute auto-refund** (§4.2.2): a renter dispute on a booking where the shop uploaded **no
  `pre_ship` evidence** → instant 100% refund + a shop strike, no manual review. With pre-ship
  evidence → manual resolution via the seller's Resolution Center.
- Resolving a dispute **for the renter** → shop strike; **for the shop** → renter Trust Score −0.5.
- Trust score is per-user (`users.trust_score`, starts 5.0). Shop rating is `shops.rating`
  (recomputed from `reviews`).

### Finance & marketing (Milestone F, PRD §3.4)
- **Penalty bills** (`penalty_bills`): shop `POST /bookings/:id/bill {amount, reason}` → renter
  sees it on the tracking page and pays (mock) → amount added to the shop's wallet balance.
- **Payout cycle**: `GET /wallet` returns `next_payout_date` = next Monday, plus `balance`
  (= `SUM(seller_payout of completed)` + paid bills − payouts), `billEarnings`.
- **Campaign Builder** (`pages/seller/Campaigns.jsx`): shops create/toggle their own coupons
  (`POST/GET/PATCH /shops/me/coupons`, `used_count` tracked).

### Chat (Milestone G, PRD §4.2 update)
- `conversations` (unique renter↔shop pair) + `messages` (optional `booking_id` to attach an
  **order card**). `GET /chats/:id/messages` marks read, enriches attached bookings
  (item/status/dates), and returns the renter's **active orders with that shop** as attachable
  context chips. **Chat button sits next to the notification bell** on Home / Seller Dashboard /
  Profile top bars, with an unread badge. Room polls every 5s.

### Search, fandom, shop profile (Milestone H, PRD §1.3/§2.1/§2.3)
- **Fandom onboarding**: first renter login forces `/onboarding/fandoms` (≥1 fandom, saved to
  `users.fandoms[]`; GuestGuard + OTP redirect enforce it). Home **boosts the user's fandoms**
  (`?fandoms=...` → `COALESCE(fandom = ANY(...), FALSE) DESC`).
- **Advanced filter** (`SearchPage`): keyword, `price_min/max` (on test_rate), body-measurement
  match (`bust/waist/hip` within ±6cm or item unspecified), `date_from/date_to` availability
  (excludes overlapping active bookings), size, fandom, `allow_event`. Plus **Save Filter** +
  recent-search **history** (localStorage). Frozen shops excluded from search.
- **Shop profile** (`/shops/:id`): rating + review count, **real follower count** (`shop_follows`),
  item count, follow/unfollow, chat, items/reviews tabs, and **search-in-shop**.
- Wishlist ❤️ and (as a lightweight fallback) some follow UI use localStorage
  (`utils/favorites.js`); the canonical shop-follow is the `shop_follows` table via
  `POST /shops/:id/follow`.

---

## 7. API reference (all under `/api/v1`)

**Auth** `POST /auth/send-otp` · `POST /auth/verify-otp` · `POST /auth/refresh` · `GET /auth/me` ·
`GET /auth/google|facebook(+/callback)`
**Users** `GET/PATCH /users/me` (profile, address, measurements, fandoms) · `GET /users/:id/trust`
**KYC** `POST /kyc/upload` (DOB+name, auto-approve demo) · `GET /kyc/status` ·
`POST /kyc/parent-consent` · `PATCH /kyc/:id/review` (admin)
**Consent (public)** `GET /consent/:token` · `POST /consent/:token/approve` ·
`POST /bookings/:id/parent-consent` (legacy per-booking)
**Shops** `POST /shops` · `GET/PATCH /shops/me` · `GET /shops/:id` (+counts) ·
`GET /shops/:id/items` (search-in-shop) · `GET /shops/:id/reviews` ·
`POST/GET /shops/:id/follow` · `POST/GET/PATCH /shops/me/coupons` (campaigns)
**Items** `GET /items` (search + all filters) · `GET /items/:id` · `GET /items/:id/availability` ·
`POST/GET/PATCH/DELETE /shops/me/items(/:id)`
**Bookings** `POST /bookings` · `GET /bookings?as=renter|shop&status=` · `GET /bookings/:id` ·
`PATCH /bookings/:id/status` · `POST /bookings/:id/reviews` · `POST /bookings/:id/coupon` ·
`POST /bookings/:id/cancel` · `PATCH /bookings/:id/reschedule` · `POST /bookings/:id/accept` ·
`POST /bookings/:id/reject` · `POST /bookings/:id/bill`
**Payments** `POST /payments/charge {pay_mode}` · `POST /payments/:bookingId/balance` ·
`POST /payments/webhook` · `PATCH /payments/:id/release` (admin)
**Wallet** `GET /wallet` · `POST /wallet/withdraw`
**Bills** `GET /bills(?as=shop)` · `POST /bills/:id/pay`
**Disputes** `POST /disputes` (auto-refund logic) · `POST /disputes/evidence` (pre_ship/unboxing) ·
`GET /disputes/by-booking/:bookingId` · `PATCH /disputes/:id/resolve` (admin or owning shop) ·
`GET /disputes` (admin)
**Notifications** `GET /notifications` · `GET /notifications/unread-count` ·
`PATCH /notifications/:id/read` · `POST /notifications/read-all`
**Chat** `POST /chats` · `GET /chats` · `GET /chats/unread-count` · `GET /chats/:id/messages` ·
`POST /chats/:id/messages`

> **Route-order gotcha**: in `shop.routes.js`, all `/me/*` routes MUST be registered **before**
> `/:id/*` or `:id` will capture `me`. This bit us once — keep it that way.

---

## 8. Data model — migrations 001–021

| # | Adds |
|---|---|
| 001 | `users` (role, kyc_status, trust_score, is_minor) + pgcrypto |
| 002 | `otp_codes` |
| 003 | `shops` (owner_id, rating, bank_account JSONB, total_rentals) |
| 004 | `items` (daily_rate, deposit_amount, sizes[], image_urls[], fandom, character) |
| 005 | `bookings` (state machine, rental_fee, generated total_amount, payment_link_token) |
| 006 | `payments` (escrow_status) |
| 007 | `kyc_verifications`, `parent_consents` |
| 008 | `evidence_uploads` (stage pre_ship/unboxing), `disputes` |
| 009 | updated_at triggers |
| 010 | shop cover_url/location/categories |
| 011 | `reviews` + `shops.review_count` |
| 012 | `notifications` |
| 013 | `payouts` |
| 014 | **money model**: items `test_rate/private_rate/shipping_fee`; bookings `rate_type/cosaki_fee/commission/seller_payout`; regen `total_amount`; `platform_ledger` |
| 015 | **KYC/age**: users `date_of_birth/real_name/account_status/parent_approved/address/bust/waist/hip/height`; items `min_age`; parent_consents.booking_id nullable |
| 016 | **listing details**: items bust/waist/hip/height_recommended/ship_lead_days/return_days/allow_event/express_delivery/return_couriers[] |
| 017 | **checkout**: bookings booking_fee/discount/coupon_code/pay_mode/amount_paid/balance_due/reschedule_used; regen total; `coupons` (+ seed COSAKI10/WELCOME50) |
| 018 | **seller lifecycle**: shops is_recommended/is_frozen/frozen_until/freeze_count; bookings accepted_at; `shop_strikes` |
| 019 | **finance**: `penalty_bills` |
| 020 | **chat**: `conversations`, `messages` |
| 021 | **discovery**: users `fandoms[]`; `shop_follows` |

---

## 9. Frontend routes (client/src/App.jsx)

Public: `/` splash · `/login` · `/otp` · `/auth/callback` · `/consent/:token`
Onboarding: `/kyc` · `/onboarding/fandoms` · `/seller/onboarding`
Renter: `/home` · `/search` · `/calendar` · `/rentals` · `/items/:id` · `/shops/:id` ·
`/items/:id/dates` · `/bookings/:id/checkout|pay|success|tracking|return-upload|review`
Profile: `/profile(/edit)` · `/settings` · `/payments` · `/support` · `/saved` · `/notifications` · `/chats(/:id)`
Seller: `/seller/dashboard|orders(/:id)|calendar|wallet|items(/new,/:id/edit)|campaigns|disputes/:bookingId`

Design is unchanged from the original Figma system across all milestones — only fields, copy,
and money math changed.

---

## 10. Testing

No formal jest suite for the new features; verification was done with **throwaway Node scripts**
hitting the live API (create fresh seller+renter, run each flow, assert exact numbers), plus
**Preview MCP** UI smoke tests. A full **38-check regression** covering every milestone + security
(auth, money math, filters, strikes→freeze, disputes/auto-refund, bills, trust deduction, chat,
follow, double-booking, no-token/404) passes 100%. Reproduce by writing a script like the ones
used during development: log in with demo OTP `123456`, KYC with a DOB, and walk a booking through
`accept → ship → returned → completed`. `server/tests/integration/auth.test.js` is the only
committed test.

---

## 11. Path to production (what to un-mock)

1. SMS provider for real OTP + parental-consent links; set `DEMO_OTP=''`.
2. AWS S3 for KYC ID/selfie + dispute evidence (`AWS_S3_BUCKET` + keys) → KYC then uploads and
   waits for `PATCH /kyc/:id/review` instead of auto-approving.
3. Omise for real card/PromptPay charges + wire the existing `/payments/webhook`.
4. Courier tracking API for return shipments.
5. Real image storage (replace data-URL images), object CDN, and image watermarking (deferred in C).
6. Remove `DISABLE_RATE_LIMIT`; review the strike "3 lifetime freezes → ban" vs the PRD's
   "3 freezes within 1 year" (currently simplified to lifetime).
