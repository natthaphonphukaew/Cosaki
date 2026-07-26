import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Bottom-sheet image cropper. Shows the target aspect frame over the picked photo
// so the user can zoom/pan and pick the framing before it's saved. `defaultAspect`
// is pre-selected among the ratio chips; `null` (or the "Free" chip) crops freely.
// When `round`, the crop is circular (avatars) and the ratio chips are hidden.
export default function ImageCropper({ src, defaultAspect = 1, round = false, onCancel, onApply }) {
  const { t } = useTranslation();
  const [crop, setCrop]   = useState({ x: 0, y: 0 });
  const [zoom, setZoom]   = useState(1);
  const [aspect, setAspect] = useState(round ? 1 : (defaultAspect ?? null));
  const [naturalAspect, setNaturalAspect] = useState(null);
  const [areaPixels, setAreaPixels] = useState(null);

  const onComplete = useCallback((_area, pixels) => setAreaPixels(pixels), []);

  // react-easy-crop always needs a fixed aspect. "Free" (aspect === null) means
  // "don't force a ratio" — so we use the image's own aspect: the whole photo fits
  // in the frame and nothing is clipped, while zoom/pan can still crop in if wanted.
  const effectiveAspect = round ? 1 : (aspect ?? naturalAspect ?? 1);

  const RATIOS = [
    { key: 'sq',   label: '1:1',  value: 1 },
    { key: 'p45',  label: '4:5',  value: 4 / 5 },
    { key: 'w169', label: '16:9', value: 16 / 9 },
    { key: 'free', label: t('cropper.free'), value: null },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50" onClick={onCancel}>
      <div className="flex w-full max-w-[390px] flex-col rounded-t-3xl bg-white" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-base font-bold text-gray-900">{t('cropper.title')}</h3>
          <button onClick={onCancel} className="text-gray-400"><X size={20} /></button>
        </div>

        {/* Crop surface */}
        <div className="relative h-72 w-full bg-gray-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={effectiveAspect}
            cropShape={round ? 'round' : 'rect'}
            showGrid={!round}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
            onMediaLoaded={(m) => setNaturalAspect(m.naturalWidth / m.naturalHeight)}
            objectFit="contain"
          />
        </div>

        {/* Controls */}
        <div className="px-4 pt-3">
          {!round && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {RATIOS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setAspect(r.value)}
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    (aspect ?? null) === (r.value ?? null)
                      ? 'bg-brand-purple text-white'
                      : 'border border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 py-2">
            <span className="text-xs text-gray-400">{t('cropper.zoom')}</span>
            <input
              type="range" min={1} max={3} step={0.01} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-brand-purple"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-1">
          <button onClick={onCancel} className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-600">
            {t('common.cancel')}
          </button>
          <button onClick={() => onApply(areaPixels)} className="flex-1 rounded-full bg-brand-gradient py-3 text-sm font-semibold text-white">
            {t('cropper.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
