import { useState, useRef, useCallback } from 'react';
import { readFileAsDataUrl, getCroppedImg, dataUrlToFile } from '@/utils/image';
import { uploadImage } from '@/api/uploads';
import ImageCropper from '@/components/ui/ImageCropper';

// Promise-based image cropper. Call `open(file, { aspect, round, maxDim })` after a
// file is picked — it opens the crop sheet and resolves to a cropped+downscaled
// JPEG data URL, or `null` if the user cancels. Render `element` once in the page.
//
//   const { open, element } = useImageCropper();
//   const url = await open(file, { aspect: 1 });   // null if cancelled
//   ...
//   return (<>{element}{/* page */}</>);
export default function useImageCropper() {
  const [state, setState] = useState(null); // { src, aspect, round, maxDim }
  const resolverRef = useRef(null);

  const open = useCallback(async (file, { aspect = 1, round = false, maxDim = 900, folder = 'uploads' } = {}) => {
    const src = await readFileAsDataUrl(file);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ src, aspect, round, maxDim, folder });
    });
  }, []);

  const finish = useCallback((dataUrl) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setState(null);
    resolve?.(dataUrl);
  }, []);

  const handleApply = useCallback(async (areaPixels) => {
    if (!state || !areaPixels) return finish(null);
    let dataUrl;
    try {
      dataUrl = await getCroppedImg(state.src, areaPixels, state.maxDim);
    } catch {
      return finish(null);
    }
    // Upload to object storage → store a short URL. If the upload fails (or the
    // server has no storage), fall back to the inline data URL so the user is
    // never blocked.
    try {
      const file = await dataUrlToFile(dataUrl, 'photo.jpg');
      const { data } = await uploadImage(file, state.folder);
      finish(data?.data?.url || dataUrl);
    } catch {
      finish(dataUrl);
    }
  }, [state, finish]);

  const element = state ? (
    <ImageCropper
      src={state.src}
      defaultAspect={state.aspect}
      round={state.round}
      onCancel={() => finish(null)}
      onApply={handleApply}
    />
  ) : null;

  return { open, element };
}
