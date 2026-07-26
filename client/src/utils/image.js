// Read a File into a raw data URL (no resize) — used as the source image for the
// cropper so react-easy-crop can display it at full quality before cropping.
export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Crop `src` to the pixel rectangle react-easy-crop reports (natural-image
// coordinates), then downscale to fit `maxDim` and export a small JPEG data URL —
// same persistence strategy as fileToDataUrl (no S3 needed for the MVP).
export const getCroppedImg = (src, cropPixels, maxDim = 900) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { x, y, width, height } = cropPixels;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      canvas.getContext('2d').drawImage(
        img,
        x, y, width, height,                 // source crop rect
        0, 0, canvas.width, canvas.height,   // destination (downscaled)
      );
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = src;
  });

// Convert a cropped data URL back into a File, for the multipart upload paths
// (KYC, return evidence) that send Blobs via FormData rather than storing data URLs.
export const dataUrlToFile = async (dataUrl, filename = 'photo.jpg') => {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
};

// Read a File and downscale it to a small JPEG data URL so it persists in the
// DB without bloating the payload (no S3 needed for the MVP).
export const fileToDataUrl = (file, maxDim = 900) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
