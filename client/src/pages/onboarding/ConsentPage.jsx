import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { getConsent, respondConsent } from '@/api/kyc';
import toast from 'react-hot-toast';

// Public page a parent opens from the SMS/demo link to approve a minor's account.
export default function ConsentPage() {
  const { token } = useParams();
  const [consent, setConsent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [result, setResult]   = useState(null); // 'approved' | 'rejected'
  const [error, setError]     = useState('');

  useEffect(() => {
    getConsent(token)
      .then(({ data }) => setConsent(data.data.consent))
      .catch((err) => setError(err.response?.data?.message || 'ลิงก์ไม่ถูกต้องหรือหมดอายุ'))
      .finally(() => setLoading(false));
  }, [token]);

  const respond = async (action) => {
    try {
      setBusy(true);
      await respondConsent(token, action);
      setResult(action);
    } catch (err) {
      toast.error(err.response?.data?.message || 'ทำรายการไม่สำเร็จ');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-surface-base"><Spinner /></div>;

  if (error) return (
    <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center bg-surface-base px-6 text-center">
      <XCircle size={64} className="mb-4 text-red-400" />
      <h2 className="text-xl font-bold text-gray-900">ลิงก์ใช้ไม่ได้</h2>
      <p className="mt-2 text-sm text-gray-500">{error}</p>
    </div>
  );

  if (result) return (
    <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center bg-surface-base px-6 text-center">
      {result === 'approved'
        ? <CheckCircle size={64} className="mb-4 text-green-500" />
        : <XCircle size={64} className="mb-4 text-red-400" />}
      <h2 className="text-xl font-bold text-gray-900">
        {result === 'approved' ? 'อนุมัติเรียบร้อย' : 'ปฏิเสธแล้ว'}
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        {result === 'approved'
          ? 'บัญชีของบุตรหลานได้รับการยืนยันโดยผู้ปกครองแล้ว'
          : 'บัญชีนี้จะยังไม่สามารถเช่าชุดประเภท 18+ ได้'}
      </p>
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <div className="bg-brand-gradient px-6 pt-16 pb-10 text-center text-white">
        <Shield size={48} className="mx-auto mb-3" />
        <h1 className="text-2xl font-bold">Cosaki — ความยินยอมผู้ปกครอง</h1>
      </div>
      <div className="px-6 -mt-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">คำขอยืนยันตัวตนของผู้เยาว์</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{consent?.minor_real_name || consent?.minor_name}</p>
          {consent?.item_name && (
            <p className="mt-2 text-sm text-gray-500">ชุดที่ต้องการเช่า: <span className="font-medium text-gray-800">{consent.item_name}</span></p>
          )}
          <div className="mt-4 rounded-xl bg-purple-50 p-3 text-xs text-gray-600">
            การกดยืนยันหมายความว่าคุณเป็นผู้ปกครองและอนุญาตให้ผู้เยาว์รายนี้ใช้บริการเช่าชุดคอสเพลย์บน Cosaki รวมถึงชุดประเภท 18+
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Button className="w-full" loading={busy} onClick={() => respond('approved')}>ยืนยันการอนุญาต</Button>
          <Button variant="secondary" className="w-full" onClick={() => respond('rejected')}>ปฏิเสธ</Button>
        </div>
      </div>
    </div>
  );
}
