const s3 = require('../../services/storage/s3.service');
const { success, error } = require('../../utils/response');

// Public-asset folders the client may upload into.
const FOLDERS = new Set(['products', 'avatars', 'shops', 'uploads']);

// POST /uploads — accepts one image (field "image") and stores it on object
// storage (R2/S3), returning its public URL. If no storage is configured
// (dev/demo), it echoes the image back as an inline data URL so the upload flow
// still works with zero setup and downstream behavior is unchanged.
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No image uploaded', 400);
    const requested = String(req.body.folder || 'uploads');
    const folder = FOLDERS.has(requested) ? requested : 'uploads';

    if (!s3.hasStorage()) {
      const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      return success(res, { url: dataUrl, stored: false });
    }

    const key = await s3.upload(req.file.buffer, req.file.mimetype, folder);
    return success(res, { url: s3.publicUrl(key), key, stored: true }, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadImage };
