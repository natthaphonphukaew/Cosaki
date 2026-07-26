import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useImageCropper from '@/hooks/useImageCropper';
import { dataUrlToFile } from '@/utils/image';
import toast from 'react-hot-toast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { uploadKYC, requestParentConsent } from '@/api/kyc';
import useAuthStore from '@/store/authStore';
import Input from '@/components/ui/Input';
import { Upload, Shield, CheckCircle } from 'lucide-react';

export default function KYCPage() {
  const { t } = useTranslation();
  const { open, element } = useImageCropper();
  const [idFile, setIdFile]       = useState(null);
  const [selfieFile, setSelfie]   = useState(null);
  const [step, setStep]           = useState('id'); // 'id' | 'selfie' | 'done'
  const [verified, setVerified]   = useState(false);
  const [dob, setDob]             = useState('');
  const [realName, setRealName]   = useState('');
  const [isMinor, setIsMinor]     = useState(false);
  const [parentPhone, setParentPhone] = useState('');
  const [consentLink, setConsentLink] = useState('');
  const [loading, setLoading]     = useState(false);
  const navigate                  = useNavigate();
  const { state }                 = useLocation();
  const { updateUser }            = useAuthStore();
  const next = state?.next || '/home';

  const handleSubmit = async () => {
    if (!idFile || !selfieFile) return toast.error(t('kyc.bothPhotosReq'));
    if (!dob) return toast.error(t('kyc.enterDob'));
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('id_image', idFile);
      fd.append('selfie', selfieFile);
      fd.append('date_of_birth', dob);
      if (realName.trim()) fd.append('real_name', realName.trim());
      const { data } = await uploadKYC(fd);
      const d = data?.data || {};
      updateUser({ kyc_status: d.kyc_status || 'pending', is_minor: d.is_minor, account_status: d.account_status });
      setIsMinor(!!d.is_minor);
      setVerified(d.kyc_status === 'verified' && !d.is_minor);
      setStep('done');
    } catch (err) {
      toast.error(err.response?.data?.message || t('kyc.uploadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestConsent = async () => {
    if (!parentPhone.trim()) return toast.error(t('kyc.enterParentPhone'));
    try {
      setLoading(true);
      const { data } = await requestParentConsent(parentPhone.trim());
      setConsentLink(data.data.link);
      toast.success(t('kyc.consentSentToParent'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('kyc.couldNotSend'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    // Minor → must get parental approval before renting 18+ items.
    if (isMinor) {
      return (
        <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
          <PageHeader title={t('header.parentalConsent')} />
          <div className="px-6 pt-6 text-center">
            <Shield size={56} className="mx-auto mb-3 text-amber-500" />
            <h2 className="text-xl font-bold text-gray-900">{t('kyc.minorTitle')}</h2>
            <p className="mt-2 text-sm text-gray-500">
              {t('kyc.minorDesc')}
            </p>

            {!consentLink ? (
              <div className="mt-6 space-y-3 text-left">
                <Input label={t('kyc.parentPhone')} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="08x-xxx-xxxx" />
                <Button className="w-full" loading={loading} onClick={handleRequestConsent}>{t('kyc.sendToParent')}</Button>
                <button onClick={() => navigate('/home')} className="w-full py-2 text-sm font-medium text-gray-400">{t('kyc.skipForNow')}</button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-left">
                  <p className="text-xs font-semibold text-amber-800">{t('kyc.parentLinkDemo')}</p>
                  <button onClick={() => { navigator.clipboard?.writeText(window.location.origin + consentLink); toast.success(t('kyc.linkCopied')); }}
                    className="mt-1 break-all text-left text-xs text-brand-purple underline">
                    {window.location.origin + consentLink}
                  </button>
                  <p className="mt-2 text-xs text-amber-700">{t('kyc.openAsParent')}</p>
                </div>
                <Button variant="secondary" className="w-full" onClick={() => navigate(consentLink)}>{t('kyc.openApprovalPage')}</Button>
                <Button className="w-full" onClick={() => navigate('/home')}>{t('kyc.goHome')}</Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center bg-surface-base px-6 text-center">
        <CheckCircle size={72} className="mb-4 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900">{verified ? t('kyc.verifiedTitle') : t('kyc.submittedTitle')}</h2>
        <p className="mt-2 text-sm text-gray-500">
          {verified ? t('kyc.verifiedDesc') : t('kyc.submittedDesc')}
        </p>
        <Button className="mt-8 w-full" onClick={() => navigate(verified ? next : '/home')}>
          {verified && next !== '/home' ? t('kyc.continueCheckout') : t('kyc.goToHome')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      {element}
      <PageHeader title={t('header.identity')} />
      <div className="px-6 pt-4">
        <h2 className="text-center text-2xl font-bold text-brand-purple">{t('kyc.verifyTitle')}</h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          {step === 'id' ? t('kyc.idHint') : t('kyc.selfieHint')}
        </p>

        {/* ID details — name (must match ID) + DOB for age verification */}
        {step === 'id' && (
          <div className="mt-5 space-y-3 text-left">
            <Input label={t('kyc.realNameLabel')} value={realName} onChange={(e) => setRealName(e.target.value)} placeholder={t('kyc.realNamePlaceholder')} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('kyc.dobLabel')}</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-purple" />
              <p className="mt-1 text-xs text-gray-400">{t('kyc.minorHint')}</p>
            </div>
          </div>
        )}

        {/* Upload frame */}
        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-purple/40 bg-brand-light/30 p-8">
          {step === 'id' ? (
            idFile
              ? <img src={URL.createObjectURL(idFile)} className="max-h-44 rounded-xl object-cover" alt="ID" />
              : <>
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <Shield size={36} className="text-brand-purple" />
                  </div>
                  <span className="text-sm font-medium text-brand-purple">{t('kyc.tapUploadId')}</span>
                </>
          ) : (
            selfieFile
              ? <img src={URL.createObjectURL(selfieFile)} className="max-h-44 rounded-xl object-cover" alt="Selfie" />
              : <>
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <Upload size={36} className="text-brand-purple" />
                  </div>
                  <span className="text-sm font-medium text-brand-purple">{t('kyc.tapSelfie')}</span>
                </>
          )}
          <input
            id="kyc-file-input"
            type="file" accept="image/*" capture={step === 'selfie' ? 'user' : 'environment'} className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const url = await open(file, { aspect: null });   // free crop — keep full document
              if (!url) return;
              const cropped = await dataUrlToFile(url, file.name);
              step === 'id' ? setIdFile(cropped) : setSelfie(cropped);
            }}
          />
        </label>

        {/* Scanning indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-xs text-white w-fit mx-auto">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          {step === 'id' ? t('kyc.scanFront') : t('kyc.livenessCheck')}
        </div>

        <button onClick={() => document.getElementById('kyc-file-input')?.click()} className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-purple mx-auto">
          <Upload size={16} />
          {t('kyc.uploadGallery')}
        </button>

        {/* Trust badges */}
        <div className="mt-6 flex justify-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1"><Shield size={12} /> {t('kyc.secureSsl')}</div>
          <div className="flex items-center gap-1"><CheckCircle size={12} /> {t('kyc.gdpr')}</div>
          <div className="flex items-center gap-1"><CheckCircle size={12} /> {t('kyc.idVerified')}</div>
        </div>

        {/* Photo requirements */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-light">
              <Shield size={16} className="text-brand-purple" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{t('kyc.photoReqTitle')}</p>
              <p className="mt-1 text-xs text-gray-500">{t('kyc.photoReqDesc')}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3 pb-8">
          {step === 'selfie' && (
            <Button variant="secondary" className="flex-1" onClick={() => setStep('id')}>{t('common.back')}</Button>
          )}
          {step === 'id' ? (
            <Button className="flex-1" onClick={() => idFile && setStep('selfie')} disabled={!idFile}>
              {t('common.next')}
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} loading={loading} disabled={!selfieFile}>
              {t('kyc.submitBtn')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
