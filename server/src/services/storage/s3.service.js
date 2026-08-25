const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

// S3-compatible object storage. Works with AWS S3 or Cloudflare R2 — set
// S3_ENDPOINT to the R2 endpoint (https://<account>.r2.cloudflarestorage.com)
// and S3_PUBLIC_URL to the bucket's public r2.dev URL (for public assets).
const BUCKET = process.env.AWS_S3_BUCKET;
const PUBLIC_BASE = (process.env.S3_PUBLIC_URL || '').replace(/\/+$/, '');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.S3_ENDPOINT, // R2/custom endpoints prefer path-style
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// True when a real bucket + endpoint are configured (vs demo mode with no storage).
const hasStorage = () => !!(BUCKET && (process.env.S3_ENDPOINT || process.env.AWS_ACCESS_KEY_ID));

const upload = async (buffer, mimetype, folder = 'uploads') => {
  const ext = (mimetype && mimetype.split('/')[1]) || 'bin';
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );
  return key;
};

// Public URL for an object (only for buckets exposed via S3_PUBLIC_URL / r2.dev).
const publicUrl = (key) => `${PUBLIC_BASE}/${key}`;

const getPresignedUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
};

module.exports = { upload, publicUrl, getPresignedUrl, hasStorage };
