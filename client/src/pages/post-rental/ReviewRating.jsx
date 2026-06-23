import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function ReviewRating() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating]   = useState(0);
  const [hover, setHover]     = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const TAGS = ['Great condition','Fast shipping','Accurate description','Beautiful quality','Would rent again'];
  const [tags, setTags] = useState([]);

  const toggleTag = (t) => setTags((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);

  const handleSubmit = async () => {
    if (!rating) return toast.error('Please select a rating');
    try {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 800)); // TODO: hook up real review API
      toast.success('Review submitted!');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <PageHeader title="Review & Rating" />
      <div className="px-4 pb-32 space-y-5">

        {/* Stars */}
        <div className="flex flex-col items-center py-6">
          <p className="text-base font-semibold text-gray-700 mb-4">How was your experience?</p>
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
              {['','Poor','Fair','Good','Great','Excellent!'][rating]}
            </p>
          )}
        </div>

        {/* Quick tags */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">Quick Tags</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  tags.includes(t)
                    ? 'bg-brand-purple text-white'
                    : 'border border-gray-200 bg-white text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">Write a Review</p>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this costume and shop..."
            className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-800 outline-none resize-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <Button className="w-full" onClick={handleSubmit} loading={loading}>
          Submit Review
        </Button>
      </div>
    </div>
  );
}
