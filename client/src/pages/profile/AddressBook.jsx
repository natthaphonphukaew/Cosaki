import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, MapPin, CheckCircle, ChevronLeft } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import ThaiAddressSelector from '@/components/ui/ThaiAddressSelector';
import { getAddresses, addAddress, deleteAddress, setDefaultAddress } from '@/api/addresses';
import toast from 'react-hot-toast';

export default function AddressBook() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [newAddressStr, setNewAddressStr] = useState('');
  const [newAddressObj, setNewAddressObj] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const { data } = await getAddresses();
      setAddresses(data.data.addresses);
    } catch (err) {
      toast.error('ไม่สามารถโหลดที่อยู่ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      load();
      toast.success('ตั้งเป็นที่อยู่หลักแล้ว');
    } catch (err) {
      toast.error('ไม่สามารถตั้งเป็นที่อยู่หลักได้');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบที่อยู่นี้ใช่หรือไม่?')) return;
    try {
      await deleteAddress(id);
      load();
      toast.success('ลบที่อยู่แล้ว');
    } catch (err) {
      toast.error('ไม่สามารถลบที่อยู่ได้');
    }
  };

  const handleAdd = async () => {
    if (!newAddressStr.trim()) return toast.error('กรุณากรอกที่อยู่');
    try {
      setAdding(true);
      await addAddress({
        address: newAddressStr.trim(),
        ...(newAddressObj || {}),
        is_default: addresses.length === 0
      });
      toast.success('เพิ่มที่อยู่แล้ว');
      setShowAdd(false);
      setNewAddressStr('');
      setNewAddressObj(null);
      load();
    } catch (err) {
      toast.error('ไม่สามารถเพิ่มที่อยู่ได้');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="ที่อยู่ของฉัน" />
      <div className="px-4 py-4 space-y-4 pb-24">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
          </div>
        ) : (
          <>
            {addresses.map(addr => (
              <div key={addr.id} className="relative rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-2 items-start">
                    <MapPin size={18} className={addr.is_default ? 'text-brand-purple' : 'text-gray-400'} />
                    <p className="text-sm text-gray-800 leading-relaxed">{addr.address}</p>
                  </div>
                  {!addr.is_default && (
                    <button onClick={() => handleDelete(addr.id)} className="text-red-400 hover:text-red-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {addr.is_default ? (
                  <div className="flex items-center gap-1.5 text-brand-purple text-xs font-semibold mt-1">
                    <CheckCircle size={14} />
                    ที่อยู่หลัก
                  </div>
                ) : (
                  <button onClick={() => handleSetDefault(addr.id)} className="text-left text-xs text-gray-500 underline mt-1 w-fit">
                    ตั้งเป็นที่อยู่หลัก
                  </button>
                )}
              </div>
            ))}
            
            {addresses.length === 0 && !showAdd && (
              <div className="text-center text-sm text-gray-400 py-10">
                ยังไม่มีข้อมูลที่อยู่
              </div>
            )}
          </>
        )}

        {showAdd ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-800">เพิ่มที่อยู่ใหม่</h3>
            <ThaiAddressSelector 
              value={newAddressStr} 
              onChange={(full, obj) => {
                setNewAddressStr(full);
                if (obj) setNewAddressObj(obj);
              }} 
            />
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>ยกเลิก</Button>
              <Button className="flex-1" onClick={handleAdd} loading={adding}>บันทึก</Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus size={18} />
            เพิ่มที่อยู่ใหม่
          </Button>
        )}
      </div>
    </div>
  );
}
