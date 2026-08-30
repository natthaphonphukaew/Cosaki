// PromptPay QR (Phase 0, no gateway). Builds a standard Thai EMVCo QR payload for
// a fixed amount using the platform's own PromptPay id (mobile or national id) from
// PROMPTPAY_ID, then renders it to a data-URL image. The amount is authoritative —
// it always comes from the booking total on the server, never from the client.
const generatePayload = require('promptpay-qr');
const QRCode = require('qrcode');

const PROMPTPAY_ID = (process.env.PROMPTPAY_ID || '').trim();

const hasPromptPay = () => !!PROMPTPAY_ID;

// Returns { payload, qr } — payload is the raw EMVCo string, qr is a PNG data URL.
const buildQr = async (amount) => {
  const payload = generatePayload(PROMPTPAY_ID, { amount: Number(amount) });
  const qr = await QRCode.toDataURL(payload, { margin: 1, width: 320 });
  return { payload, qr };
};

module.exports = { hasPromptPay, buildQr, PROMPTPAY_ID };
