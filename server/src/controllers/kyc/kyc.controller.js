const crypto = require('crypto');
const db = require('../../config/db');
const s3 = require('../../services/storage/s3.service');
const { success, error } = require('../../utils/response');
const { ageFromDob } = require('../../utils/age');

// POST /kyc/upload  — upload ID card + selfie, create KYC record
const uploadKYC = async (req, res, next) => {
  try {
    if (!req.files?.id_image || !req.files?.selfie) {
      return error(res, 'Both id_image and selfie are required', 400);
    }

    // DOB + real name come from the OCR step (§1.1). Age gates the account.
    const { date_of_birth, real_name } = req.body;
    const age = ageFromDob(date_of_birth);
    if (age !== null && age < 15) {
      return error(res, 'ผู้ใช้ต้องมีอายุ 15 ปีขึ้นไปจึงจะใช้งานได้', 422);
    }
    const isMinor = age !== null && age < 18;

    // Demo mode: no S3 bucket configured, or non-production. Skip the real
    // upload and auto-approve so testers can complete a booking without an
    // SMS/S3/admin-review pipeline. Real prod uploads to S3 and waits for review.
    const demoMode = !process.env.AWS_S3_BUCKET || process.env.NODE_ENV !== 'production';

    let idKey = 'demo/id', selfieKey = 'demo/selfie';
    if (!demoMode) {
      [idKey, selfieKey] = await Promise.all([
        s3.upload(req.files.id_image[0].buffer, req.files.id_image[0].mimetype, `kyc/${req.user.id}/id`),
        s3.upload(req.files.selfie[0].buffer,   req.files.selfie[0].mimetype,   `kyc/${req.user.id}/selfie`),
      ]);
    }

    const kycStatus  = demoMode ? 'approved' : 'pending';
    const userStatus = demoMode ? 'verified' : 'pending';

    const { rows } = await db.query(
      `INSERT INTO kyc_verifications (user_id, id_image_key, selfie_key, status, verified_at)
       VALUES ($1, $2, $3, $4, ${demoMode ? 'NOW()' : 'NULL'})
       RETURNING *`,
      [req.user.id, idKey, selfieKey, kycStatus]
    );

    // Minors must get parental approval before the account is fully active.
    const accountStatus = isMinor ? 'pending_parent' : 'normal';

    await db.query(
      `UPDATE users SET
         kyc_status     = $1,
         date_of_birth  = COALESCE($2, date_of_birth),
         real_name      = COALESCE($3, real_name),
         is_minor       = $4,
         account_status = $5,
         updated_at     = NOW()
       WHERE id = $6`,
      [userStatus, date_of_birth || null, real_name || null, isMinor, accountStatus, req.user.id]
    );

    // Auto-advance bookings waiting on KYC once verified — but not for minors
    // still pending parental approval.
    if (demoMode && !isMinor) {
      await db.query(
        `UPDATE bookings SET status = 'pending_payment', updated_at = NOW()
         WHERE renter_id = $1 AND status = 'pending_kyc'`,
        [req.user.id]
      );
    }

    return success(res, {
      kyc: rows[0], kyc_status: userStatus,
      is_minor: isMinor, account_status: accountStatus, age,
    }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /kyc/status — renter checks own KYC + account status
const getKYCStatus = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT k.status, k.created_at,
              u.kyc_status, u.account_status, u.is_minor, u.parent_approved, u.date_of_birth
       FROM users u
       LEFT JOIN kyc_verifications k ON k.user_id = u.id
       WHERE u.id = $1
       ORDER BY k.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    return success(res, { kyc: rows[0] || { kyc_status: 'none' } });
  } catch (err) {
    next(err);
  }
};

// POST /kyc/parent-consent — a minor requests account-level parental approval.
const requestParentConsent = async (req, res, next) => {
  try {
    const { parent_phone } = req.body;
    const { rows: [user] } = await db.query(
      'SELECT is_minor, account_status FROM users WHERE id = $1', [req.user.id]
    );
    if (!user?.is_minor) return error(res, 'บัญชีนี้ไม่ต้องขอความยินยอมจากผู้ปกครอง', 422);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    // Account-level consent → booking_id is NULL.
    const { rows } = await db.query(
      `INSERT INTO parent_consents (booking_id, minor_user_id, parent_phone, consent_token, expires_at)
       VALUES (NULL, $1, $2, $3, $4) RETURNING *`,
      [req.user.id, parent_phone, token, expiresAt]
    );

    // Mock SMS (real provider deferred). Surface the link so the demo works.
    const link = `/consent/${token}`;
    if (process.env.NODE_ENV !== 'production') console.log(`[DEV] Parent consent link: ${link}`);

    return success(res, { consent: rows[0], link }, 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /kyc/:kycId/review — admin approves or rejects KYC
const reviewKYC = async (req, res, next) => {
  try {
    const { status, ocr_result } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return error(res, 'status must be approved or rejected', 422);
    }

    const { rows: kyc } = await db.query(
      `UPDATE kyc_verifications
       SET status = $1, ocr_result = $2, verified_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END
       WHERE id = $3 RETURNING *`,
      [status, ocr_result ? JSON.stringify(ocr_result) : null, req.params.kycId]
    );
    if (!kyc.length) return error(res, 'KYC record not found', 404);

    const userKYCStatus = status === 'approved' ? 'verified' : 'none';
    await db.query(
      `UPDATE users SET kyc_status = $1, updated_at = NOW() WHERE id = $2`,
      [userKYCStatus, kyc[0].user_id]
    );

    // If approved, check if any pending_kyc booking can advance to pending_payment
    if (status === 'approved') {
      await db.query(
        `UPDATE bookings SET status = 'pending_payment', updated_at = NOW()
         WHERE renter_id = $1 AND status = 'pending_kyc'`,
        [kyc[0].user_id]
      );
    }

    return success(res, { kyc: kyc[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadKYC, getKYCStatus, reviewKYC, requestParentConsent };
