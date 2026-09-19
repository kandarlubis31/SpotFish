'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Review } from '@/lib/types';
import StarRating from '@/components/reviews/StarRating';
import { sanitizeInput } from '@/lib/utils';

interface ReviewSectionProps {
  spotId: string;
  reviews: Review[];
  onReviewSubmitted: () => void;
  requireAuth: () => void;
}

export default function ReviewSection({ spotId, reviews, onReviewSubmitted, requireAuth }: ReviewSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spot_id: spotId,
          rating,
          comment: sanitizeInput(comment, 1000) || undefined,
        }),
      });

      if (res.status === 401) {
        requireAuth();
        return;
      }

      if (res.ok) {
        onReviewSubmitted();
        setShowForm(false);
        setRating(0);
        setComment('');
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">Ulasan ({reviews.length})</h2>
        <button
          onClick={() => {
            fetch('/api/auth/me')
              .then(r => r.json())
              .then(d => {
                if (!d.user) requireAuth();
                else setShowForm(true);
              })
              .catch(() => requireAuth());
          }}
          className="press-scale bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Tulis Ulasan
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Rating</label>
            <StarRating rating={rating} onRate={setRating} size="lg" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Komentar (opsional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.substring(0, 1000))}
              placeholder="Ceritakan pengalaman mancing di sini..."
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              rows={3}
            />
            <div className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">{comment.length}/1000</div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={rating === 0 || submitting}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-3xl mb-2 opacity-30">&#8226;</div>
          <p>Belum ada ulasan</p>
          <p className="text-sm">Jadilah yang pertama memberi ulasan!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                  {review.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Link href={`/users/${review.username}`} className="font-medium text-sm hover:text-blue-600">{review.username}</Link>
                  <div className="flex items-center gap-1">
                    <StarRating rating={review.rating} readonly size="sm" />
                  </div>
                </div>
              </div>
              {review.comment && (
                <p className="text-gray-600 dark:text-gray-300 text-sm ml-11">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
