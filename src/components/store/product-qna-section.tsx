'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductQuestionDTO, ProductQnaSummaryDTO } from '@/features/qna/types/qna.types';

interface ProductQnaSectionProps {
  productId: string;
  initialSummary?: ProductQnaSummaryDTO;
  initialQuestions?: ProductQuestionDTO[];
  locale?: 'en-BD' | 'bn-BD';
}

function buildDefaultQuestions(productId: string): ProductQuestionDTO[] {
  return [
    {
      id: 'q_sample_01',
      productId,
      authorDisplayName: 'Naimur R.',
      question: 'এই ফোনটিতে কি অফিশিয়াল ১ বছরের ওয়ারেন্টি পাওয়া যাবে?',
      status: 'APPROVED',
      isAnswered: true,
      upvotesCount: 9,
      createdAt: '2026-09-29T12:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z',
      answers: [
        {
          id: 'ans_sample_01',
          questionId: 'q_sample_01',
          sellerId: 'sel_walton',
          authorDisplayName: 'Walton Official Store',
          answer:
            'হ্যাঁ স্যার, এটি ১০০% অফিশিয়াল পণ্য। বাংলাদেশের য��কোনো ওয়ালটন সার্ভিস সেন্টারে ১ বছরের অফিশিয়াল ওয়ারেন্টি কার্ড সহ সেবা পাবেন।',
          isOfficialSeller: true,
          status: 'APPROVED',
          upvotesCount: 7,
          createdAt: '2026-09-29T18:00:00.000Z',
          updatedAt: '2026-09-29T18:00:00.000Z',
        },
      ],
      answersCount: 1,
    },
    {
      id: 'q_sample_02',
      productId,
      authorDisplayName: 'Shakil A.',
      question: 'Does the box include the fast charging adapter and cable?',
      status: 'APPROVED',
      isAnswered: true,
      upvotesCount: 4,
      createdAt: '2026-09-28T09:00:00.000Z',
      updatedAt: '2026-09-28T09:00:00.000Z',
      answers: [
        {
          id: 'ans_sample_02',
          questionId: 'q_sample_02',
          sellerId: 'sel_walton',
          authorDisplayName: 'Walton Official Store',
          answer: 'Yes! The original retail box includes a 33W fast charger and Type-C cable.',
          isOfficialSeller: true,
          status: 'APPROVED',
          upvotesCount: 3,
          createdAt: '2026-09-29T12:00:00.000Z',
          updatedAt: '2026-09-29T12:00:00.000Z',
        },
      ],
      answersCount: 1,
    },
  ];
}

export function ProductQnaSection({
  productId,
  initialSummary,
  initialQuestions = [],
  locale = 'en-BD',
}: ProductQnaSectionProps) {
  const isBn = locale === 'bn-BD';

  const [summary, setSummary] = useState<ProductQnaSummaryDTO>(
    initialSummary || {
      productId,
      totalQuestions: 14,
      answeredQuestions: 12,
      unansweredQuestions: 2,
    }
  );

  const [questions, setQuestions] = useState<ProductQuestionDTO[]>(() =>
    initialQuestions.length > 0 ? initialQuestions : buildDefaultQuestions(productId)
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnswered, setFilterAnswered] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [showAskModal, setShowAskModal] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpvoteQuestion = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          const toggled = !q.currentUserVoted;
          return {
            ...q,
            upvotesCount: toggled ? q.upvotesCount + 1 : Math.max(0, q.upvotesCount - 1),
            currentUserVoted: toggled,
          };
        }
        return q;
      })
    );
    showToast(isBn ? 'আপনার ভোট গৃহীত হয়েছে!' : 'Vote recorded!');
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (newQuestionText.trim().length < 10) {
      showToast(
        isBn ? 'প্রশ্নটি কমপক্ষে ১০ অক্ষরের হতে হবে।' : 'Question must be at least 10 characters.'
      );
      return;
    }

    const newQ: ProductQuestionDTO = {
      id: `q_${Date.now()}`,
      productId,
      authorDisplayName: 'Customer H.',
      question: newQuestionText,
      status: 'APPROVED',
      isAnswered: false,
      upvotesCount: 0,
      answers: [],
      answersCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setQuestions([newQ, ...questions]);
    setSummary((prev) => ({
      ...prev,
      totalQuestions: prev.totalQuestions + 1,
      unansweredQuestions: prev.unansweredQuestions + 1,
    }));

    setShowAskModal(false);
    setNewQuestionText('');
    showToast(
      isBn
        ? 'আপনার প্রশ্নটি জমা হয়েছে! বিক্রেতা উত্তর দিলে আপনাকে জানানো হবে।'
        : 'Your question was submitted! The seller will be notified.'
    );
  };

  const filteredQuestions = questions.filter((q) => {
    if (filterAnswered === 'answered' && !q.isAnswered) return false;
    if (filterAnswered === 'unanswered' && q.isAnswered) return false;
    if (searchQuery.trim()) {
      const qLower = q.question.toLowerCase();
      const sLower = searchQuery.toLowerCase();
      const matchQ = qLower.includes(sLower);
      const matchAns = q.answers.some((a) => a.answer.toLowerCase().includes(sLower));
      if (!matchQ && !matchAns) return false;
    }
    return true;
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            💬 {isBn ? 'পণ্য সম্পর্কিত প্রশ্নোত্তর (Q&A)' : 'Questions & Answers'}
            <Badge className="bg-slate-100 text-slate-700 text-[10px] font-bold">
              {summary.totalQuestions} {isBn ? 'টি প্রশ্ন' : 'questions'}
            </Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBn
              ? 'পণ্য কেনার আগে সাইজ, ওয়ারেন্টি বা ব্যবহার সম্পর্কে সরাসরি প্রশ্ন করুন।'
              : 'Have a question about sizing, warranty, or compatibility? Ask the official seller.'}
          </p>
        </div>

        <Button
          onClick={() => setShowAskModal(true)}
          className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs px-4 py-2 rounded-xl"
        >
          + {isBn ? 'প্রশ্ন করুন' : 'Ask a Question'}
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isBn
                ? 'প্রশ্ন বা উত্তর খুঁজুন (যেমন: ওয়ারেন্টি, চার্জার)...'
                : 'Search questions or answers...'
            }
            className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setFilterAnswered('all')}
            className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
              filterAnswered === 'all'
                ? 'bg-slate-900 text-white border-slate-900 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isBn ? 'সকল' : 'All'}
          </button>
          <button
            onClick={() => setFilterAnswered('answered')}
            className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
              filterAnswered === 'answered'
                ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isBn ? 'উত্তর দেওয়া হয়েছে' : 'Answered'} ({summary.answeredQuestions})
          </button>
          <button
            onClick={() => setFilterAnswered('unanswered')}
            className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
              filterAnswered === 'unanswered'
                ? 'bg-amber-600 text-white border-amber-600 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isBn ? 'অপেক্ষমাণ' : 'Pending'} ({summary.unansweredQuestions})
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {isBn ? 'কোন প্রশ্ন খুঁজে পাওয়া যায়নি।' : 'No questions found matching your search.'}
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <Card
              key={q.id}
              className="p-5 border border-slate-100 bg-slate-50/40 rounded-xl space-y-3"
            >
              {/* Question Row */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-[#FF6A00]">Q:</span>
                    <h3 className="font-bold text-xs text-slate-900">{q.question}</h3>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 pl-4">
                    <span>By {q.authorDisplayName}</span>
                    <span>•</span>
                    <span>
                      {new Date(q.createdAt).toLocaleDateString('en-BD', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Question Upvote */}
                <button
                  onClick={() => handleUpvoteQuestion(q.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                    q.currentUserVoted
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ▲ {isBn ? 'সহায়ক' : 'Upvote'} ({q.upvotesCount})
                </button>
              </div>

              {/* Answers */}
              {q.answers.length > 0 ? (
                <div className="pl-4 border-l-2 border-slate-200 space-y-2 mt-2">
                  {q.answers.map((ans) => (
                    <div
                      key={ans.id}
                      className="p-3 bg-white border border-slate-100 rounded-lg space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-emerald-700">A:</span>
                          <span className="font-black text-slate-900">{ans.authorDisplayName}</span>
                          {ans.isOfficialSeller && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold py-0">
                              ✓ {isBn ? 'অফিশিয়াল বিক্রেতা' : 'Official Seller'}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ans.createdAt).toLocaleDateString('en-BD', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed pl-4">{ans.answer}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pl-4 text-[11px] text-amber-700 font-medium">
                  ⏳{' '}
                  {isBn
                    ? 'বিক্রেতার উত্তরের জন্য অপেক্ষমাণ...'
                    : 'Awaiting official seller response...'}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Ask Question Modal */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <Card className="max-w-lg w-full bg-white p-6 space-y-4 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  {isBn ? 'পণ্য সম্পর্কিত প্রশ্ন করুন' : 'Ask a Question'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isBn
                    ? 'আপনার প্রশ্নটি সরাসরি বিক্রেতার ড্যাশবোর্ডে পাঠানো হবে।'
                    : 'The seller will receive your inquiry and respond with official details.'}
                </p>
              </div>
              <button
                onClick={() => setShowAskModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAskQuestion} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isBn
                    ? 'আপনার প্রশ্ন (কমপক্ষে ১০ অক্ষর)'
                    : 'Your Question (Minimum 10 characters)'}
                </label>
                <textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  rows={4}
                  placeholder={
                    isBn
                      ? 'যেমন: এই পণ্যের সাথে কি অরিজিনাল ক্যাবল পাওয়া যাবে? সাইজ কেমন?'
                      : 'e.g. Is this compatible with fast charging? What is the warranty policy?'
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAskModal(false)}
                  className="text-xs"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs"
                >
                  {isBn ? 'প্রশ্ন জমা দিন' : 'Submit Question'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </section>
  );
}
