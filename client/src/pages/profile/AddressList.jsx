import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import { listAddresses, deleteAddress, setDefaultAddress } from '@/api/addresses';
import toast from 'react-hot-toast';

export default function AddressList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listAddresses().then(({ data }) => setAddresses(data.data.addresses))
      .catch(() => toast.error(t('address.loadFailed'))).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    try { await deleteAddress(id); toast.success(t('address.deleted')); load(); }
    catch (err) { toast.error(err.response?.data?.message || t('address.deleteFailed')); }
  };
  const onSetDefault = async (id) => {
    try { await setDefaultAddress(id); load(); }
    catch (err) { toast.error(err.response?.data?.message || t('address.actionFailed')); }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('address.myAddresses')} />
      <div className="px-4 pt-2 pb-28">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <MapPin size={40} className="mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">{t('address.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((a) => (
              <div key={a.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{a.recipient_name}</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-sm text-gray-500">{a.phone}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{a.detail_line}</p>
                    <p className="text-sm text-gray-600">
                      {[a.subdistrict, a.district, a.province, a.postal_code].filter(Boolean).join(' ')}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {a.is_default && (
                        <span className="rounded border border-brand-pink px-1.5 py-0.5 text-[11px] font-semibold text-brand-pink">{t('address.default')}</span>
                      )}
                      {a.label && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">{a.label}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => navigate(`/addresses/${a.id}/edit`)} className="flex-shrink-0 text-sm font-medium text-brand-purple">{t('address.edit')}</button>
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-3 text-sm">
                  {a.is_default ? (
                    <span className="text-gray-300">{t('address.default')}</span>
                  ) : (
                    <button onClick={() => onSetDefault(a.id)} className="text-gray-500">{t('address.setDefault')}</button>
                  )}
                  <button onClick={() => onDelete(a.id)} className="ml-auto text-red-500">{t('address.delete')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <button onClick={() => navigate('/addresses/new')}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-3.5 text-sm font-semibold text-white">
          <Plus size={18} /> เพิ่มที่อยู่ใหม่
        </button>
      </div>
    </div>
  );
}
