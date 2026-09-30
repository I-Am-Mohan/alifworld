'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductReviewDTO, ProductRatingSummaryDTO } from '@/features/reviews/types/review.types';

interface ProductReviewsSectionProps {
  productId: string;
  initialSummary?: ProductRatingSummaryDTO;
  initialReviews?: ProductReviewDTO[];
  locale?: 'en-BD' | 'bn-BD';
}

export function ProductReviewsSection({
  productId,
  initialSummary,
  initialReviews = [],
  locale = 'en-BD',
}: ProductReviewsSectionProps) {
  const isBn = locale === 'bn-BD';

  const [summary, setSummary] = useState<ProductRatingSummaryDTO>(
    initialSummary || {
      productId,
      averageRating: 4.8,
      totalReviews: 24,
      verifiedPurchasesCount: 22,
      distribution: {
        5: 18,
        4: 4,
        3: 1,
        2: 1,
        1: 0,
      },
    }
  );

  const [reviews, setReviews] = useState<ProductReviewDTO[]>(
    initialReviews.length > 0
      ? initialReviews
      : [
          {
            id: 'rev_sample_01',
            productId,
            variantId: null,
            authorDisplayName: 'Rahim A.',
            rating: 5,
            title: 'অসাধারণ কোয়ালিটি এবং দ্রুত ডেলিভারি!',
            comment:
              'প���্যটি হাতে পেয়ে সত্যিই মুগ্ধ হলাম। প্যাকেজিং চমৎকার ছিল এবং আসল ব্রান্ডের পণ্য নিশ্চিত করেছে। ঢাকা শহরে ২ দিনের মধ্যে ডেলিভারি পেয়েছি।',
            isVerifiedPurchase: true,
            status: 'APPROVED',
            helpfulVotesCount: 14,
            unhelpfulVotesCount: 0,
            sellerResponse:
              'ধন্যবাদ স্যার! আপনার সন্তুষ্টিই আমাদের প্রধান লক্ষ্য। সবসময় সেরা পণ্য ও সেবা দিতে আমরা প্রতিশ্রুতিবদ্ধ।',
            sellerRespondedAt: '2026-09-29T12:00:00.000Z',
            sellerStoreName: 'Official Flagship Store',
            createdAt: '2026-09-28T12:00:00.000Z',
            updatedAt: '2026-09-28T12:00:00.000Z',
            media: [
              {
                id: 'm1',
                mediaType: 'IMAGE',
                url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
                altText: 'Unboxing photo',
                displayOrder: 0,
              },
            ],
          },
          {
            id: 'rev_sample_02',
            productId,
            variantId: null,
            authorDisplayName: 'Nusrat J.',
            rating: 4,
            title: 'Great product, verified original',
            comment:
              'The material and finish are top-tier. Exactly as pictured in the storefront catalogue. Points earned on checkout were accurate too.',
            isVerifiedPurchase: true,
            status: 'APPROVED',
            helpfulVotesCount: 6,
            unhelpfulVotesCount: 1,
            sellerResponse: null,
            sellerRespondedAt: null,
            createdAt: '2026-09-26T12:00:00.000Z',
            updatedAt: '2026-09-26T12:00:00.000Z',
            media: [],
          },
        ]
  );

  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyPhotos, setOnlyPhotos] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);

  // Review submission form state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleVote = (reviewId: string, isHelpful: boolean) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === reviewId) {
          if (r.currentUserVote === (isHelpful ? 'HELPFUL' : 'UNHELPFUL')) {
            return r;
          }
          return {
            ...r,
            helpfulVotesCount: isHelpful ? r.helpfulVotesCount + 1 : r.helpfulVotesCount,
            unhelpfulVotesCount: !isHelpful ? r.unhelpfulVotesCount + 1 : r.unhelpfulVotesCount,
            currentUserVote: isHelpful ? 'HELPFUL' : 'UNHELPFUL',
          };
        }
        return r;
      })
    );
    showToast(isBn ? 'আপনার মতামতের জন্য ধন্যবাদ!' : 'Thank you for your feedback!');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim().length < 10) {
      showToast(
        isBn
          ? 'রিভিউ কমপক্ষে ১০ অক্ষরের হতে হবে।'
          : 'Review comment must be at least 10 characters.'
      );
      return;
    }

    const created: ProductReviewDTO = {
      id: `rev_${Date.now()}`,
      productId,
      variantId: null,
      authorDisplayName: 'Customer M.',
      rating: newRating,
      title: newTitle || null,
      comment: newComment,
      isVerifiedPurchase: true,
      status: 'APPROVED',
      helpfulVotesCount: 0,
      unhelpfulVotesCount: 0,
      sellerResponse: null,
      sellerRespondedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      media: newPhotoUrl
        ? [
            {
              id: `m_${Date.now()}`,
              mediaType: 'IMAGE',
              url: newPhotoUrl,
              altText: 'Customer review media',
              displayOrder: 0,
            },
          ]
        : [],
    };

    setReviews([created, ...reviews]);
    setSummary((prev) => {
      const newTotal = prev.totalReviews + 1;
      const newDist = { ...prev.distribution };
      newDist[newRating as keyof typeof newDist] =
        (newDist[newRating as keyof typeof newDist] || 0) + 1;
      return {
        ...prev,
        totalReviews: newTotal,
        verifiedPurchasesCount: prev.verifiedPurchasesCount + 1,
        distribution: newDist,
      };
    });

    setShowReviewModal(false);
    setNewTitle('');
    setNewComment('');
    setNewPhotoUrl('');
    showToast(
      isBn
        ? 'আপনার ভেরিফায়েড রিভিউ সফলভাবে যোগ হয়েছে!'
        : 'Your verified review was submitted successfully!'
    );
  };

  const filteredReviews = reviews.filter((r) => {
    if (selectedRatingFilter && r.rating !== selectedRatingFilter) return false;
    if (onlyVerified && !r.isVerifiedPurchase) return false;
    if (onlyPhotos && r.media.length === 0) return false;
    return true;
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Header & Rating Breakdown */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-100 pb-8">
        {/* Rating Score Card */}
        <div className="flex items-center gap-6">
          <div className="text-center bg-slate-50 p-6 rounded-2xl border border-slate-100 min-w-[140px]">
            <div className="text-4xl font-black text-slate-900">{summary.averageRating}</div>
            <div className="flex justify-center text-amber-400 text-base my-1">
              {'★'.repeat(Math.round(summary.averageRating))}
              {'☆'.repeat(5 - Math.round(summary.averageRating))}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {summary.totalReviews} {isBn ? 'টি রিভিউ' : 'reviews'}
            </div>
            <div className="text-[10px] text-emerald-700 font-bold mt-1">
              ✓ {summary.verifiedPurchasesCount} {isBn ? 'ভেরিফায়েড' : 'verified'}
            </div>
          </div>

          {/* Star Distribution Bars */}
          <div className="space-y-1.5 min-w-[200px] sm:min-w-[260px] text-xs">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = summary.distribution[stars as keyof typeof summary.distribution] || 0;
              const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
              return (
                <button
                  key={stars}
                  onClick={() =>
                    setSelectedRatingFilter(selectedRatingFilter === stars ? null : stars)
                  }
                  className={`w-full flex items-center gap-2 text-left hover:opacity-80 transition-opacity ${
                    selectedRatingFilter === stars ? 'font-bold' : ''
                  }`}
                >
                  <span className="w-12 text-slate-600 text-[11px] flex items-center">
                    {stars} <span className="text-amber-400 ml-0.5">★</span>
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-slate-400 text-[11px] font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Write a Review Button */}
        <div className="flex flex-col items-start lg:items-end justify-center gap-2">
          <Button
            onClick={() => setShowReviewModal(true)}
            className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm"
          >
            ✏️ {isBn ? 'ভেরিফায়েড রিভিউ দিন' : 'Write a Verified Review'}
          </Button>
          <span className="text-[11px] text-slate-400">
            {isBn
              ? 'শুধুমাত্র পণ্যটি ডেলিভারি প্রাপ্ত ক্রেতারা রিভিউ দিতে পারেন।'
              : 'Only customers who have received this product can review.'}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => {
            setSelectedRatingFilter(null);
            setOnlyVerified(false);
            setOnlyPhotos(false);
          }}
          className={`px-3 py-1.5 rounded-lg border transition-colors ${
            !selectedRatingFilter && !onlyVerified && !onlyPhotos
              ? 'bg-slate-900 text-white border-slate-900 font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isBn ? 'সকল রিভিউ' : 'All Reviews'}
        </button>
        <button
          onClick={() => setOnlyPhotos(!onlyPhotos)}
          className={`px-3 py-1.5 rounded-lg border transition-colors ${
            onlyPhotos
              ? 'bg-slate-900 text-white border-slate-900 font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          📷 {isBn ? 'ছবি সহ' : 'With Photos'}
        </button>
        <button
          onClick={() => setOnlyVerified(!onlyVerified)}
          className={`px-3 py-1.5 rounded-lg border transition-colors ${
            onlyVerified
              ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          ✓ {isBn ? 'শুধুমাত্র ভেরিফায়েড ক্রেতা' : 'Verified Purchases Only'}
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {filteredReviews.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {isBn ? 'কোন রিভিউ পাওয়া যায়নি।' : 'No customer reviews match your selected filter.'}
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <Card
              key={rev.id}
              className="p-6 border border-slate-100 bg-slate-50/50 space-y-4 rounded-xl"
            >
              {/* Author & Rating Header */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900">
                      {rev.authorDisplayName}
                    </span>
                    {rev.isVerifiedPurchase && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                        ✓ {isBn ? 'ভেরিফায়েড ক্রেতা' : 'Verified Purchase'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-amber-400 text-xs">
                      {'★'.repeat(rev.rating)}
                      {'☆'.repeat(5 - rev.rating)}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(rev.createdAt).toLocaleDateString('en-BD', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Title & Comment */}
              {rev.title && <div className="font-bold text-xs text-slate-900">{rev.title}</div>}
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {rev.comment}
              </p>

              {/* Media Gallery */}
              {rev.media.length > 0 && (
                <div className="flex items-center gap-2.5 pt-1">
                  {rev.media.map((med) => (
                    <button
                      key={med.id}
                      onClick={() => setSelectedMediaUrl(med.url)}
                      className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 transition-all focus:outline-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={med.url}
                        alt={med.altText || 'Review photo'}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Official Seller Response */}
              {rev.sellerResponse && (
                <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-black text-blue-900">
                      🏢 {rev.sellerStoreName || 'Official Seller'} Response
                    </span>
                    {rev.sellerRespondedAt && (
                      <span className="text-blue-500 font-medium">
                        {new Date(rev.sellerRespondedAt).toLocaleDateString('en-BD', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-blue-950 text-xs leading-relaxed">{rev.sellerResponse}</p>
                </div>
              )}

              {/* Helpful Votes Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="text-[11px] text-slate-400">
                  {isBn ? 'এই রিভিউটি কি আপনার উপকারে এসেছে?' : 'Was this review helpful?'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(rev.id, true)}
                    className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                      rev.currentUserVote === 'HELPFUL'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    👍 {isBn ? 'হ্যাঁ' : 'Yes'} ({rev.helpfulVotesCount})
                  </button>
                  <button
                    onClick={() => handleVote(rev.id, false)}
                    className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                      rev.currentUserVote === 'UNHELPFUL'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    👎 {isBn ? 'না' : 'No'} ({rev.unhelpfulVotesCount})
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <Card className="max-w-lg w-full bg-white p-6 space-y-4 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  {isBn ? 'ভেরিফায়েড রিভিউ প্রদান করুন' : 'Write a Verified Purchase Review'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isBn
                    ? 'আপনার ব্যক্তিগত অভিজ্ঞতা শেয়ার করে অন্যান্য ক্রেতাদের সাহায্য করুন।'
                    : 'Share your genuine experience with this product.'}
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              {/* Star Rating Select */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isBn ? 'রেটিং নির্বাচন করুন' : 'Your Star Rating'}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className={`text-2xl transition-transform hover:scale-110 ${
                        star <= newRating ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs text-slate-500 font-bold ml-2">{newRating} / 5</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isBn ? 'রিভিউ শিরোনাম (ঐচ্ছিক)' : 'Review Title (Optional)'}
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={
                    isBn ? 'যেমন: চমৎকার পণ্য, ১০০% আসল!' : 'e.g. Excellent build quality!'
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isBn
                    ? 'বিস্তারিত অভিজ্ঞতা (কমপ��্ষে ১০ অক্ষর)'
                    : 'Detailed Experience (Minimum 10 characters)'}
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                  placeholder={
                    isBn
                      ? 'পণ্যের মান, প্যাকেজিং, ব্যবহারিক অভিজ্ঞতা সম্পর্কে লিখুন...'
                      : 'Share details about performance, build, and packaging...'
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isBn ? 'ছবি লিংক (ঐচ্ছিক)' : 'Photo URL (Optional Attachment)'}
                </label>
                <input
                  type="url"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="https://example.com/unboxing.jpg"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                  className="text-xs"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs"
                >
                  {isBn ? 'রিভিউ সাবমিট করুন' : 'Submit Review'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Lightbox Modal for Photo inspection */}
      {selectedMediaUrl && (
        <div
          onClick={() => setSelectedMediaUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in"
        >
          <div className="max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-black relative">
            <button
              onClick={() => setSelectedMediaUrl(null)}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 text-xs"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedMediaUrl}
              alt="Review media preview"
              className="w-full h-auto object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}
    </section>
  );
}
