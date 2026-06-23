# Cosaki — Architecture Overview

## Monorepo Structure
```
cosaki/
├── package.json            ← root workspace config
├── .gitignore
├── client/                 ← React frontend (Phase 1)
└── server/
    ├── package.json
    ├── .env.example
    ├── jest.config.js
    ├── src/
    │   ├── app.js          ← Express entry point
    │   ├── config/
    │   │   ├── db.js       ← PostgreSQL pool
    │   │   ├── passport.js ← JWT + Google + Facebook strategies
    │   │   └── logger.js   ← Winston logger
    │   ├── controllers/
    │   │   └── auth/       ← sendOTP, verifyOTP, refresh, me, oauthCallback
    │   ├── middlewares/
    │   │   ├── auth.js     ← authenticate, requireRole, requireKYC
    │   │   ├── errorHandler.js
    │   │   └── validate.js
    │   ├── routes/v1/
    │   │   ├── index.js
    │   │   └── auth.routes.js
    │   ├── services/
    │   │   └── auth/
    │   │       └── otp.service.js
    │   ├── utils/
    │   │   ├── jwt.js      ← sign/verify tokens
    │   │   └── response.js ← success/error helpers
    │   └── validators/
    │       └── auth.validator.js
    ├── db/
    │   ├── migrate.js      ← run with: npm run migrate
    │   ├── migrations/
    │   │   ├── 001_create_users.sql
    │   │   ├── 002_create_otp_codes.sql
    │   │   ├── 003_create_shops.sql
    │   │   ├── 004_create_items.sql
    │   │   ├── 005_create_bookings.sql
    │   │   ├── 006_create_payments.sql
    │   │   ├── 007_create_kyc_and_consent.sql
    │   │   └── 008_create_evidence_and_disputes.sql
    │   └── seeds/
    │       └── index.js
    └── tests/
        ├── setup.js
        └── integration/
            └── auth.test.js
```

## Auth Flow
```
Phone OTP  →  POST /auth/send-otp  →  POST /auth/verify-otp  →  { accessToken, refreshToken }
Google     →  GET /auth/google  →  GET /auth/google/callback  →  redirect with tokens
Facebook   →  GET /auth/facebook  →  GET /auth/facebook/callback  →  redirect with tokens
Token refresh  →  POST /auth/refresh
```

## Booking State Machine
```
draft → pending_kyc → pending_payment → escrowed → shipped → returned → completed
                                                           ↘ disputed
any state → cancelled
```

## Next Modules (in order)
1. Shop & Item CRUD  (shop_admin role)
2. Booking creation + payment link generation
3. KYC upload + webhook
4. Omise payment + escrow webhook
5. Evidence upload to S3
6. Dispute resolution
