import api from './client';

// Upload one image to object storage; resolves to { url } (a public R2 URL, or
// an inline data URL when the server has no storage configured — dev/demo).
export const uploadImage = (file, folder = 'uploads') => {
  const fd = new FormData();
  fd.append('image', file);
  fd.append('folder', folder);
  return api.post('/uploads', fd);
};
