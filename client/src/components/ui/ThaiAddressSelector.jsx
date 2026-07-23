import { useState, useEffect, useMemo } from 'react';
import * as addressDataModule from '@bilions/thailand-address';

// Safely extract from either named exports or default export (depending on Vite's CJS interop)
const addressData = addressDataModule.default || addressDataModule;
const { provinces = [], districts = [], subDistricts = [] } = addressData || {};

export default function ThaiAddressSelector({ value, initialAddressObj, onChange }) {
  const [houseNo, setHouseNo] = useState('');
  const [provId, setProvId] = useState('');
  const [distId, setDistId] = useState('');
  const [subId, setSubId] = useState('');
  
  // Try to parse existing value only on first mount if possible, 
  // but since it's free text, we will just assign the whole thing to houseNo if we can't parse it.
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    if (!isInit && (value || initialAddressObj)) {
      if (initialAddressObj) {
        setHouseNo(initialAddressObj.address_line1 || '');
        if (initialAddressObj.province) {
          const p = provinces.find(x => x.name_in_thai === initialAddressObj.province);
          if (p) setProvId(p.id.toString());
        }
        if (initialAddressObj.district) {
          const d = districts.find(x => x.name_in_thai === initialAddressObj.district);
          if (d) setDistId(d.id.toString());
        }
        if (initialAddressObj.sub_district) {
          const s = subDistricts.find(x => x.name_in_thai === initialAddressObj.sub_district);
          if (s) setSubId(s.id.toString());
        }
      } else {
        // Basic heuristic: just dump everything to houseNo for them to manually fix
        setHouseNo(value);
      }
      setIsInit(true);
    }
  }, [value, initialAddressObj, isInit]);

  const availableDistricts = useMemo(() => {
    if (!provId) return [];
    return districts.filter(d => d.province_id === Number(provId));
  }, [provId]);

  const availableSubDistricts = useMemo(() => {
    if (!distId) return [];
    return subDistricts.filter(s => s.district_id === Number(distId));
  }, [distId]);

  // Handle cascading resets
  const handleProvChange = (e) => {
    setProvId(e.target.value);
    setDistId('');
    setSubId('');
  };

  const handleDistChange = (e) => {
    setDistId(e.target.value);
    setSubId('');
  };

  const handleSubChange = (e) => {
    setSubId(e.target.value);
  };

  // Compile full address
  useEffect(() => {
    if (!isInit) return; // Don't trigger on initial mount before user interacts

    let fullAddress = houseNo.trim();
    
    if (subId) {
      const sub = subDistricts.find(s => s.id === Number(subId));
      const dist = districts.find(d => d.id === Number(distId));
      const prov = provinces.find(p => p.id === Number(provId));
      
      if (sub && dist && prov) {
        const isBKK = prov.name_in_thai.includes('กรุงเทพ');
        const subPrefix = isBKK ? 'แขวง' : 'ต.';
        const distPrefix = isBKK ? 'เขต' : 'อ.';
        const provPrefix = isBKK ? '' : 'จ.';
        
        fullAddress = `${houseNo.trim()} ${subPrefix}${sub.name_in_thai} ${distPrefix}${dist.name_in_thai} ${provPrefix}${prov.name_in_thai} ${sub.zip_code}`.trim();
        
        onChange(fullAddress, {
          address_line1: houseNo.trim(),
          province: prov.name_in_thai,
          district: dist.name_in_thai,
          sub_district: sub.name_in_thai,
          zip_code: sub.zip_code.toString()
        });
        return; // Handled
      }
    }
    
    // Only fire onChange if it differs from the incoming value to prevent loops
    if (fullAddress !== value) {
      onChange(fullAddress, { address_line1: fullAddress, province: '', district: '', sub_district: '', zip_code: '' });
    }
  }, [houseNo, provId, distId, subId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          บ้านเลขที่ / ซอย / ถนน
        </label>
        <textarea
          rows={2}
          value={houseNo}
          onChange={(e) => {
            setHouseNo(e.target.value);
            if (!isInit) setIsInit(true);
          }}
          placeholder="เช่น 123/45 ซอยสุขุมวิท 1..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-800 focus:border-brand-purple focus:bg-white focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            จังหวัด
          </label>
          <select
            value={provId}
            onChange={(e) => {
              handleProvChange(e);
              if (!isInit) setIsInit(true);
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-800 focus:border-brand-purple focus:bg-white focus:outline-none"
          >
            <option value="">เลือกจังหวัด</option>
            {provinces.map(p => (
              <option key={p.id} value={p.id}>{p.name_in_thai}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            เขต / อำเภอ
          </label>
          <select
            value={distId}
            onChange={handleDistChange}
            disabled={!provId}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-800 focus:border-brand-purple focus:bg-white focus:outline-none disabled:opacity-50"
          >
            <option value="">เลือกอำเภอ</option>
            {availableDistricts.map(d => (
              <option key={d.id} value={d.id}>{d.name_in_thai}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            แขวง / ตำบล
          </label>
          <select
            value={subId}
            onChange={handleSubChange}
            disabled={!distId}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-800 focus:border-brand-purple focus:bg-white focus:outline-none disabled:opacity-50"
          >
            <option value="">เลือกตำบล</option>
            {availableSubDistricts.map(s => (
              <option key={s.id} value={s.id}>{s.name_in_thai}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            รหัสไปรษณีย์
          </label>
          <input
            type="text"
            readOnly
            value={subId ? availableSubDistricts.find(s => s.id === Number(subId))?.zip_code || '' : ''}
            className="w-full rounded-xl border border-gray-200 bg-gray-100 p-3 text-sm text-gray-500 focus:outline-none cursor-not-allowed"
            placeholder="รหัสไปรษณีย์"
          />
        </div>
      </div>
    </div>
  );
}
