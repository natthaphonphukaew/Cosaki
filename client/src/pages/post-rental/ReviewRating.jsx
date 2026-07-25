import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { createReview } from '@/api/reviews';
import toast from 'react-hot-toast';

export default function ReviewRating() {
  const { t } = useTranslation();
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating]   = useState(0);
  const [hover, setHover]     = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const TAGS = [t('review.tagCondition'), t('review.tagFast'), t('review.tagAccurate'), t('review.tagQuality'), t('review.tagAgain')];
  const [tags, setTags] = useState([]);

  const toggleTag = (tag) => setTags((p) => p.includes(tag) ? p.filter((x) => x !== tag) : [...p, tag]);

  const handleSubmit = async () => {
    if (!rating) return toast.error(t('review.selectRating'));
    try {
      setLoading(true);
      await createReview(bookingId, { rating, comment, tags });
      toast.success(t('review.submitted'));
      navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.message || t('review.submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title={t('review.title')} />
      <div className="px-4 pb-32 space-y-5">

        {/* Stars */}
        <div className="flex flex-col items-center py-6">
          <p className="text-base font-semibold text-gray-700 mb-4">{t('review.howWas')}</p>
          <div className="flex gap-3">
            {[1,2,3,4,5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(s)}
              >
                <Star
                  size={40}
                  className="transition-colors"
                  fill={(hover || rating) >= s ? '#F59E0B' : 'transparent'}
                  stroke={(hover || rating) >= s ? '#F59E0B' : '#D1D5DB'}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-3 text-sm font-medium text-brand-purple">
              {['', t('review.poor'), t('review.fair'), t('review.good'), t('review.great'), t('review.excellent')][rating]}
            </p>
          )}
        </div>

        {/* Quick tags */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">{t('review.quickTags')}</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  tags.includes(tag)
                    ? 'bg-brand-purple text-white'
                    : 'border border-gray-200 bg-white text-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">{t('review.writeReview')}</p>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('review.placeholder')}
            className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-800 outline-none resize-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" onClick={handleSubmit} loading={loading}>
          {t('review.submit')}
        </Button>
      </div>
    </div>
  );
}
