const db = require('../../config/db');
const s3 = require('../../services/storage/s3.service');
const { success, error } = require('../../utils/response');

// POST /kyc/upload  — upload ID card + selfie, create KYC record
const uploadKYC = async (req, res, next) => {
  try {
    if (!req.files?.id_image || !req.files?.selfie) {
      return error(res, 'Both id_image and selfie are required', 400);
    }

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

    await db.query(
      `UPDATE users SET kyc_status = $1, updated_at = NOW() WHERE id = $2`,
      [userStatus, req.user.id]
    );

    // Auto-advance any bookings waiting on KYC once verified.
    if (demoMode) {
      await db.query(
        `UPDATE bookings SET status = 'pending_payment', updated_at = NOW()
         WHERE renter_id = $1 AND status = 'pending_kyc'`,
        [req.user.id]
      );
    }

    return success(res, { kyc: rows[0], kyc_status: userStatus }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /kyc/status — renter checks own KYC status
const getKYCStatus = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT k.status, k.created_at, u.kyc_status
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

module.exports = { uploadKYC, getKYCStatus, reviewKYC };
