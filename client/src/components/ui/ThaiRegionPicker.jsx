import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Shopee-style region picker: a single read-only field that opens a bottom-sheet
// with a search box + 4 tabs (จังหวัด → เขต/อำเภอ → แขวง/ตำบล → รหัสไปรษณีย์).
// Picking a level auto-advances to the next. Emits a STRUCTURED object so a saved
// address can re-populate the tabs:
//   value / onChange = { province, district, subdistrict, postal_code, latitude, longitude }
// Region names are Thai (name_in_thai). Built on the @bilions/thailand-address dataset.
const TABS = [
  { key: 'province',    label: 'address.provinceTab' },
  { key: 'district',    label: 'address.districtTab' },
  { key: 'subdistrict', label: 'address.subdistrictTab' },
  { key: 'postal',      label: 'address.postalTab' },
];

export default function ThaiRegionPicker({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState('province');
  const [q, setQ]       = useState('');
  const [{ provinces, districts, subDistricts }, setData] = useState({ provinces: [], districts: [], subDistricts: [] });
  const [provId, setProvId] = useState('');
  const [distId, setDistId] = useState('');
  const [subId, setSubId]   = useState('');

  // Lazy-load the ~2MB dataset once the picker is mounted.
  useEffect(() => {
    let alive = true;
    import('@bilions/thailand-address').then((mod) => {
      if (!alive) return;
      const d = mod.default || mod;
      setData({ provinces: d?.provinces || [], districts: d?.districts || [], subDistricts: d?.subDistricts || [] });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // On open, resolve saved names → ids so the tabs reflect the current value.
  useEffect(() => {
    if (!open || !provinces.length) return;
    if (provId) return; // already primed
    if (value?.province) {
      const p = provinces.find((x) => x.name_in_thai === value.province);
      if (p) {
        setProvId(String(p.id));
        const dst = value.district && districts.find((x) => x.province_id === p.id && x.name_in_thai === value.district);
        if (dst) {
          setDistId(String(dst.id));
          const sd = value.subdistrict && subDistricts.find((x) => x.district_id === dst.id && x.name_in_thai === value.subdistrict);
          if (sd) { setSubId(String(sd.id)); setTab('postal'); return; }
          setTab('subdistrict'); return;
        }
        setTab('district'); return;
      }
    }
    setTab('province');
  }, [open, provinces, districts, subDistricts]); // eslint-disable-line react-hooks/exhaustive-deps

  const availableDistricts   = useMemo(() => provId ? districts.filter((d) => d.province_id === Number(provId)) : [], [provId, districts]);
  const availableSubDistricts = useMemo(() => distId ? subDistricts.filter((s) => s.district_id === Number(distId)) : [], [distId, subDistricts]);
  const selectedSub = subId ? subDistricts.find((s) => s.id === Number(subId)) : null;

  const filtered = (list) => {
    const t = q.trim();
    if (!t) return list;
    return list.filter((x) => String(x.name_in_thai).includes(t) || String(x.zip_code || '').includes(t));
  };

  const pickProvince = (p) => { setProvId(String(p.id)); setDistId(''); setSubId(''); setQ(''); setTab('district'); };
  const pickDistrict = (d) => { setDistId(String(d.id)); setSubId(''); setQ(''); setTab('subdistrict'); };
  const pickSub = (s) => { setSubId(String(s.id)); setQ(''); setTab('postal'); };

  const confirm = () => {
    if (!selectedSub) return;
    const prov = provinces.find((p) => p.id === Number(provId));
    const dist = districts.find((d) => d.id === Number(distId));
    onChange({
      province: prov?.name_in_thai || '',
      district: dist?.name_in_thai || '',
      subdistrict: selectedSub.name_in_thai,
      postal_code: String(selectedSub.zip_code || ''),
      latitude: selectedSub.latitude ?? null,
      longitude: selectedSub.longitude ?? null,
    });
    setOpen(false);
  };

  const display = value?.province
    ? [value.subdistrict, value.district, value.province, value.postal_code].filter(Boolean).join(', ')
    : '';

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
        {t('address.region')}
      </label>
      <button type="button" onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-3 text-left text-sm outline-none focus:border-brand-purple">
        <span className={display ? 'text-gray-800' : 'text-gray-400'}>{display || t('address.regionPlaceholder')}</span>
        <ChevronRight size={16} className="text-gray-400" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30"
          onClick={() => setOpen(false)} onWheel={(e) => e.stopPropagation()}>
          <div className="flex max-h-[85vh] w-full max-w-[390px] flex-col rounded-t-3xl bg-white" onClick={(e) => e.stopPropagation()}>
            {/* header + search */}
            <div className="px-4 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">{t('address.selectRegion')}</h3>
                <button onClick={() => setOpen(false)} className="text-gray-400"><X size={20} /></button>
              </div>
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('address.regionSearch')}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-purple focus:bg-white" />
              </div>
              {/* tabs */}
              <div className="flex gap-3 overflow-x-auto border-b border-gray-100 text-sm">
                {TABS.map((tb) => {
                  const done = { province: !!provId, district: !!distId, subdistrict: !!subId, postal: !!selectedSub }[tb.key];
                  const enabled = tb.key === 'province'
                    || (tb.key === 'district' && provId)
                    || (tb.key === 'subdistrict' && distId)
                    || (tb.key === 'postal' && subId);
                  return (
                    <button key={tb.key} disabled={!enabled} onClick={() => enabled && setTab(tb.key)}
                      className={`flex-shrink-0 border-b-2 pb-2 font-medium ${tab === tb.key ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-400'} disabled:opacity-40`}>
                      {tb.key === 'province' && value?.province && done ? value.province
                        : tb.key === 'district' && done ? (districts.find((d) => d.id === Number(distId))?.name_in_thai || t(tb.label))
                        : t(tb.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* list body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-1">
              {tab === 'province' && filtered(provinces).map((p) => (
                <Row key={p.id} label={p.name_in_thai} active={Number(provId) === p.id} onClick={() => pickProvince(p)} />
              ))}
              {tab === 'district' && filtered(availableDistricts).map((d) => (
                <Row key={d.id} label={d.name_in_thai} active={Number(distId) === d.id} onClick={() => pickDistrict(d)} />
              ))}
              {tab === 'subdistrict' && filtered(availableSubDistricts).map((s) => (
                <Row key={s.id} label={`${s.name_in_thai}`} sub={`${s.zip_code}`} active={Number(subId) === s.id} onClick={() => pickSub(s)} />
              ))}
              {tab === 'postal' && selectedSub && (
                <Row label={`${selectedSub.zip_code}`} sub={selectedSub.name_in_thai} active onClick={confirm} />
              )}
              {((tab === 'district' && !provId) || (tab === 'subdistrict' && !distId)) && (
                <p className="px-3 py-6 text-center text-sm text-gray-400">{t('address.selectPrev')}</p>
              )}
            </div>

            {/* footer */}
            <div className="border-t border-gray-100 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button onClick={confirm} disabled={!selectedSub}
                className="w-full rounded-full bg-brand-gradient py-3.5 text-sm font-semibold text-white disabled:opacity-40">
                {t('address.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Row = ({ label, sub, active, onClick }) => (
  <button onClick={onClick}
    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm ${active ? 'bg-brand-light text-brand-purple' : 'text-gray-700 active:bg-gray-50'}`}>
    <span className="font-medium">{label}{sub && <span className="ml-2 text-xs text-gray-400">{sub}</span>}</span>
    {active && <span className="text-brand-purple">✓</span>}
  </button>
);
