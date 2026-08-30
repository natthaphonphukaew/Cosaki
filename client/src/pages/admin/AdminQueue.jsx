import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Loader, AlertTriangle, X, FileText, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { getAdminQueue, confirmSlip, rejectSlip, releasePayout } from '@/api/admin';
import toast from 'react-hot-toast';

const baht = (n) => `฿${Number(n || 0).toFixed(2)}`;

export default function AdminQueue() {
  const [data, setData]     = useState({ awaiting_slip: [], awaiting_payout: [] });
  const [loading, setLoad]  = useState(true);
  const [busy, setBusy]     = useState(false);
  const [lightbox, setBox]  = useState(null);   // slip image url
  const [modal, setModal]   = useState(null);   // { kind, title, body, run }

  const load = useCallback(async () => {
    try {
      setLoad(true);
      const { data } = await getAdminQueue();
      setData(data.data);
    } catch {
      toast.error('โหลดคิวงานไม่สำเร็จ');
    } finally {
      setLoad(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async () => {
    if (!modal) return;
    try {
      setBusy(true);
      await modal.run();
      toast.success(modal.done);
      setModal(null);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'ทำรายการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const askConfirmSlip = (b) => setModal({
    title: 'ยืนยันได้รับเงิน?',
    body: `ยืนยันว่าเงิน ${baht(b.total_amount)} จาก ${b.renter_name || 'ลูกค้า'} เข้าบัญชี Cosaki จริงแล้ว หลังยืนยัน ร้านจะเริ่มจัดส่งได้`,
    done: 'ยืนยันรับเงินแล้ว',
    run: () => confirmSlip(b.id),
  });

  const askRejectSlip = (b) => setModal({
    danger: true,
    title: 'ปฏิเสธสลิป?',
    body: `สลิปของ ${b.renter_name || 'ลูกค้า'} (${baht(b.total_amount)}) จะถูกปฏิเสธ ลูกค้าจะได้รับแจ้งให้โอนใหม่และแนบสลิปอีกครั้ง`,
    done: 'ปฏิเสธสลิปแล้ว',
    run: () => rejectSlip(b.id),
  });

  const askPayout = (p) => setModal({
    title: 'ยืนยันจ่ายร้าน?',
    body: `ยืนยันว่าโอน ${baht(p.seller_payout)} ให้ ${p.shop_name} ในแอปธนาคารเรียบร้อยแล้ว`,
    done: 'บันทึกการจ่ายร้านแล้ว',
    run: () => releasePayout(p.payment_id),
  });

  const empty = !loading && data.awaiting_slip.length === 0 && data.awaiting_payout.length === 0;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="คิวงาน admin" />
      <div className="px-4 pt-4 pb-24 space-y-5">
        <button onClick={load} className="flex items-center gap-1.5 text-xs font-medium text-brand-purple">
          <RefreshCw size={13} /> รีเฟรช
        </button>

        {loading && (
          <div className="flex justify-center py-16"><Loader size={26} className="animate-spin text-brand-purple" /></div>
        )}

        {empty && (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-gray-400 shadow-sm">
            <CheckCircle size={30} className="mx-auto mb-2 text-green-400" />
            ไม่มีงานค้าง
          </div>
        )}

        {/* Awaiting slip */}
        {data.awaiting_slip.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">รอยืนยันสลิป</h2>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">{data.awaiting_slip.length} รายการ</span>
            </div>
            <div className="space-y-3">
              {data.awaiting_slip.map((b) => (
                <div key={b.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{b.renter_name || 'ลูกค้า'}</span>
                    <span>{b.shop_name}</span>
                  </div>
                  <div className="mb-3 mt-0.5 text-[13px] text-gray-800">{b.item_name}</div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => b.slip_url && setBox(b.slip_url)}
                      className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
                    >
                      {b.slip_url
                        ? <img src={b.slip_url} alt="สลิป" className="h-full w-full rounded-lg object-cover" />
                        : <><FileText size={20} /><span className="text-[11px]">ไม่มีสลิป</span></>}
                    </button>
                    <div className="flex flex-1 flex-col justify-center">
                      <span className="text-[11px] text-gray-400">ยอดที่ต้องได้รับ</span>
                      <span className="text-xl font-bold text-gray-900">{baht(b.total_amount)}</span>
                      <span className="text-[11px] text-gray-400">เทียบกับแอปธนาคารก่อนยืนยัน</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button className="flex-1" onClick={() => askConfirmSlip(b)}>ยืนยันได้รับเงิน</Button>
                    <button
                      onClick={() => askRejectSlip(b)}
                      className="rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600"
                    >ปฏิเสธ</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Awaiting payout */}
        {data.awaiting_payout.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">รอจ่ายร้าน</h2>
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-purple ring-1 ring-brand-purple/20">{data.awaiting_payout.length} รายการ</span>
            </div>
            <div className="space-y-3">
              {data.awaiting_payout.map((p) => (
                <div key={p.payment_id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{p.shop_name}</span>
                    <span>คืนแล้ว</span>
                  </div>
                  <div className="mb-3 mt-0.5 text-[13px] text-gray-800">{p.item_name}</div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="text-[11px] text-gray-400">โอนเข้าบัญชีร้าน</div>
                    <div className="text-[13px] font-medium text-gray-800">
                      {p.bank_account?.account_number || '— ร้านยังไม่ผูกบัญชี —'}
                      {p.bank_account?.bank ? ` · ${p.bank_account.bank}` : ''}
                    </div>
                    {p.bank_account?.account_name && (
                      <div className="text-[11px] text-gray-400">{p.bank_account.account_name}</div>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-[11px] text-gray-400">ยอดจ่ายร้าน</span>
                    <span className="text-xl font-bold text-gray-900">{baht(p.seller_payout)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-700">
                    <AlertTriangle size={13} /> โอนในแอปธนาคารก่อน แล้วค่อยกดยืนยัน
                  </div>
                  <Button className="mt-3 w-full" onClick={() => askPayout(p)}>โอนแล้ว — ยืนยันจ่ายร้าน {baht(p.seller_payout)}</Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Slip lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setBox(null)}>
          <button className="absolute right-4 top-4 text-white"><X size={26} /></button>
          <img src={lightbox} alt="สลิป" className="max-h-[80vh] max-w-full rounded-lg" />
        </div>
      )}

      {/* Confirm modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-[320px] rounded-2xl bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">{modal.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{modal.body}</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setModal(null)}
                disabled={busy}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700"
              >ยกเลิก</button>
              <button
                onClick={run}
                disabled={busy}
                className={`flex-1 rounded-lg py-2 text-sm font-medium text-white ${modal.danger ? 'bg-red-500' : 'bg-brand-purple'}`}
              >{busy ? '...' : 'ยืนยัน'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
