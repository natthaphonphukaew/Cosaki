import { useState, useRef, useCallback } from 'react';
import { readFileAsDataUrl, getCroppedImg } from '@/utils/image';
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

  const open = useCallback(async (file, { aspect = 1, round = false, maxDim = 900 } = {}) => {
    const src = await readFileAsDataUrl(file);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ src, aspect, round, maxDim });
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
    try {
      finish(await getCroppedImg(state.src, areaPixels, state.maxDim));
    } catch {
      finish(null);
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
