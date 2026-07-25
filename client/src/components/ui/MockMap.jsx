import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Decorative mock map (no external SDK). Shows a pin over a grid; if the picked
// sub-district carries lat/lng we surface it as the caption.
export default function MockMap({ latitude, longitude, className = '' }) {
  const { t } = useTranslation();
  const hasCoords = latitude != null && longitude != null;
  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-200 ${className}`}>
      <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        <span>📍</span>
        <span>{t('address.pinLocation')}</span>
      </div>
      <div
        className="relative h-40 w-full bg-[#eef2f7]"
        style={{
          backgroundImage:
            'linear-gradient(#dbe3ee 1px, transparent 1px), linear-gradient(90deg, #dbe3ee 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        {/* fake roads */}
        <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 bg-white/70" />
        <div className="absolute left-1/3 top-0 h-full w-2 bg-white/70" />
        {/* pin */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <MapPin size={34} className="text-brand-pink drop-shadow" fill="#EC4899" />
        </div>
        <span className="absolute bottom-2 right-2 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-gray-500">Mock Map</span>
      </div>
      {hasCoords && (
        <p className="bg-white px-3 py-1.5 text-[11px] text-gray-400">
          {t('address.approxCoord')} {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
        </p>
      )}
    </div>
  );
}
