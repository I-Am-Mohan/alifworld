'use client';

import React, { useState } from 'react';
import { MessageSquare, CheckCircle, Clock, Send, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SellerQuestionItem {
  id: string;
  productId: string;
  productTitle: string;
  authorDisplayName: string;
  question: string;
  isAnswered: boolean;
  createdAt: string;
  answer?: string | null;
  answeredAt?: string | null;
}

export default function SellerQuestionsPortalPage() {
  const [filterAnswered, setFilterAnswered] = useState<'all' | 'unanswered' | 'answered'>('unanswered');
  const [search, setSearch] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<SellerQuestionItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [questions, setQuestions] = useState<SellerQuestionItem[]>([
    {
      id: 'q_sel_01',
      productId: 'prod_wlt_01',
      productTitle: 'Walton Primo S8 Pro (8GB/128GB)',
      authorDisplayName: 'Tanvir H.',
      question: 'এই ফোনটিতে কি অফিশিয়াল ১ বছরের ওয়ারেন্টি পাওয়া যাবে?',
      isAnswered: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'q_sel_02',
      productId: 'prod_wlt_01',
      productTitle: 'Walton Primo S8 Pro (8GB/128GB)',
      authorDisplayName: 'Nusrat J.',
      question: 'Does the box include the fast charging adapter and cable?',
      isAnswered: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      answer: 'Yes! The original retail box includes a 33W fast charger and Type-C cable.',
      answeredAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: 'q_sel_03',
      productId: 'prod_wlt_02',
      productTitle: 'Walton Fast Charger 33W Ultra',
      authorDisplayName: 'Sabbir A.',
      question: 'Is this compatible with Samsung Galaxy A-series devices?',
      isAnswered: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || replyText.trim().length < 5) {
      showToast('Reply must be at least 5 characters long.');
      return;
    }

    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === selectedQuestion.id) {
          return {
            ...q,
            isAnswered: true,
            answer: replyText,
            answeredAt: new Date().toISOString(),
          };
        }
        return q;
      })
    );

    showToast('Official response submitted! Customer has been notified.');
    setSelectedQuestion(null);
    setReplyText('');
  };

  const filtered = questions.filter((q) => {
    if (filterAnswered === 'unanswered' && q.isAnswered) return false;
    if (filterAnswered === 'answered' && !q.isAnswered) return false;
    if (search.trim()) {
      const qLower = q.question.toLowerCase();
      const pLower = q.productTitle.toLowerCase();
      const sLower = search.toLowerCase();
      if (!qLower.includes(sLower) && !pLower.includes(sLower)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#FF6A00]" />
            Customer Pre-Sale Inquiries (Q&A)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Respond to prospective customer questions about your products to increase conversion and trust.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterAnswered('unanswered')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                filterAnswered === 'unanswered' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Unanswered ({questions.filter((q) => !q.isAnswered).length})
            </button>
            <button
              onClick={() => setFilterAnswered('answered')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                filterAnswered === 'answered' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Answered ({questions.filter((q) => q.isAnswered).length})
            </button>
            <button
              onClick={() => setFilterAnswered('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterAnswered === 'all' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              All ({questions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer question or product title..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20"
        />
      </div>

      {/* Questions Feed */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs bg-white border border-dashed border-slate-200 rounded-2xl">
            No questions found matching your filter.
          </div>
        ) : (
          filtered.map((item) => (
            <Card key={item.id} className="p-5 border border-slate-200 bg-white space-y-3 rounded-xl hover:border-slate-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Product:</span>{' '}
                  <span className="text-xs font-extrabold text-slate-900">{item.productTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-[10px] font-bold ${
                      item.isAnswered
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {item.isAnswered ? 'Answered' : 'Awaiting Reply'}
                  </Badge>
                  <span className="text-[11px] text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString('en-BD', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="font-extrabold text-xs text-[#FF6A00]">Q:</span>
                  <span className="text-xs font-bold text-slate-900">{item.question}</span>
                </div>
                <div className="text-[11px] text-slate-400 pl-4">
                  Asked by <strong className="text-slate-600">{item.authorDisplayName}</strong> (Customer PII Redacted)
                </div>
              </div>

              {/* Existing Answer or Reply CTA */}
              {item.isAnswered ? (
                <div className="pl-4 border-l-2 border-emerald-500 bg-emerald-50/50 p-3 rounded-r-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                    <span>✓ Your Official Store Answer:</span>
                    {item.answeredAt && (
                      <span className="text-slate-400 font-normal">
                        {new Date(item.answeredAt).toLocaleDateString('en-BD', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 leading-relaxed">{item.answer}</p>
                </div>
              ) : (
                <div className="flex justify-end pt-1">
                  <Button
                    onClick={() => {
                      setSelectedQuestion(item);
                      setReplyText('');
                    }}
                    className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    Write Official Answer
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Answer Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <Card className="max-w-lg w-full bg-white p-6 space-y-4 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Official Store Answer</h3>
                <p className="text-[11px] text-slate-500">
                  Responding to: <strong className="text-slate-700">{selectedQuestion.productTitle}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="text-slate-400 hover:text-slate-600 text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-[#FF6A00]">Question:</span>
              <p className="text-slate-900 font-semibold">{selectedQuestion.question}</p>
            </div>

            <form onSubmit={handleSendReply} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Your Official Answer (Minimum 5 characters)
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Provide precise specifications, warranty terms, or compatibility info..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedQuestion(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs"
                >
                  Post Answer
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
