import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlifLogo } from '@/components/brand/logo';
import { ProductReviewsSection } from '@/components/store/product-reviews-section';
import { productReviewService } from '@/features/reviews';
import { prisma } from '@/shared/database/prisma';

export const dynamic = 'force-dynamic';

interface ProductReviewsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ locale?: string }>;
}

export default async function ProductReviewsPage({
  params,
  searchParams,
}: ProductReviewsPageProps) {
  const { slug } = await params;
  const { locale: localeParam } = await searchParams;
  const locale = localeParam === 'bn-BD' ? 'bn-BD' : 'en-BD';
  const isBn = locale === 'bn-BD';

  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: slug }, { slug }],
      deletedAt: null,
    },
    include: {
      seller: { select: { id: true, businessName: true } },
    },
  });

  if (!product) {
    notFound();
  }

  const summary = await productReviewService.getProductRatingSummary(product.id);
  const reviewsData = await productReviewService.getProductReviews(product.id, {
    page: 1,
    limit: 20,
    sortBy: 'recent',
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <AlifLogo className="h-8 w-auto text-[#FF6A00]" />
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href={`/products/${product.slug || product.id}`}
              className="text-xs font-bold text-slate-700 hover:text-[#FF6A00] transition-colors truncate max-w-[240px] sm:max-w-md"
            >
              {product.title}
            </Link>
          </div>

          <Link
            href={`/products/${product.slug || product.id}`}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            ← {isBn ? 'পণ্যে ফিরে যান' : 'Back to Product'}
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">
            {isBn ? 'গ্রাহক মতামত ও ভেরিফায়েড রিভিউ' : 'Customer Reviews & Ratings'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {product.title} • {isBn ? 'বিক্রেতা:' : 'Seller:'} \
            <strong className="text-slate-800">{product.seller.businessName}</strong>
          </p>
        </div>

        <ProductReviewsSection
          productId={product.id}
          initialSummary={summary}
          initialReviews={reviewsData.reviews}
          locale={locale}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500 font-medium">
        AlifWorld Reviews • Verified Purchases, Star Ratings & Protected Privacy
      </footer>
    </div>
  );
}
