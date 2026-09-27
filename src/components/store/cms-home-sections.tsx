'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LocalizedHomepage, LocalizedHomeSection, HeroBanner } from '@/features/cms/types';

interface CmsHomeSectionsProps {
  initialData?: LocalizedHomepage;
  locale?: 'en-BD' | 'bn-BD';
}

export function CmsHomeSections({ initialData, locale = 'en-BD' }: CmsHomeSectionsProps) {
  const [homepage, setHomepage] = useState<LocalizedHomepage | null>(initialData || null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    fetch(`/api/v1/cms/home?locale=${locale}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setHomepage(body.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch CMS homepage data, using cached layout:', err);
      });
  }, [locale]);

  const heroSection = homepage?.sections?.find((s) => s.type === 'HERO_CAROUSEL');
  const banners: HeroBanner[] = heroSection?.data?.banners || [];

  const featureSection = homepage?.sections?.find((s) => s.type === 'FEATURE_HIGHLIGHTS');
  const highlights = featureSection?.data?.highlights || [];

  const isBn = locale === 'bn-BD';

  return (
    <div className="space-y-8">
      {/* 1. Dynamic Hero Banner Carousel */}
      {banners.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden shadow-sm transition-all">
          {banners.map((banner, idx) => (
            <div
              key={banner.id}
              className={`p-8 sm:p-12 transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-6 ${
                idx === activeBannerIndex ? 'block' : 'hidden'
              }`}
              style={{ backgroundColor: banner.bgColor || '#1E293B' }}
            >
              <div className="max-w-xl space-y-4 text-white">
                {banner.badgeText && (
                  <Badge className="bg-[#FF6A00] text-white font-bold text-[11px] uppercase tracking-wider px-2.5 py-0.5 border-none">
                    {banner.badgeText}
                  </Badge>
                )}

                <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                  {banner.title}
                </h2>

                {banner.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {banner.subtitle}
                  </p>
                )}

                <div className="pt-2">
                  <Link
                    href={banner.ctaLink}
                    className="inline-flex items-center px-5 py-2.5 rounded-full bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-bold transition-all shadow-md gap-2"
                  >
                    <span>{banner.ctaText}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Banner Carousel Controls */}
              {banners.length > 1 && (
                <div className="flex space-x-2 pt-4 md:pt-0">
                  {banners.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setActiveBannerIndex(dotIdx)}
                      className={`h-2.5 rounded-full transition-all ${
                        dotIdx === activeBannerIndex ? 'w-8 bg-[#FF6A00]' : 'w-2.5 bg-white/40 hover:bg-white/60'
                      }`}
                      aria-label={`Slide ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 2. Platform Value Proposition Highlights */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {highlights.map((hl: any) => (
            <Card
              key={hl.id}
              className="p-4 border border-slate-200 bg-white hover:border-[#FF6A00]/40 transition-colors shadow-xs"
            >
              <div className="font-black text-xs text-slate-900">{hl.title}</div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">{hl.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
