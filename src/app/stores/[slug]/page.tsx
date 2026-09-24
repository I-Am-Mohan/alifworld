import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SellerService } from '@/features/seller/services/seller-service';
import { buildBreadcrumbJsonLd, buildSeoMetadata } from '@/shared/seo/metadata';
import { SeoJsonLd } from '@/shared/seo/json-ld';
import { createTranslator, getServerLocale } from '@/i18n/server';
import { headers } from 'next/headers';

interface StorePageProps { params: { slug: string } }

async function getProfile(slug: string) {
  return new SellerService().getPublicProfileBySlug(slug);
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const headerList = await headers();
  const locale = getServerLocale(headerList as any);
  const t = createTranslator(locale);
  const profile = await getProfile(params.slug);
  if (!profile) return buildSeoMetadata({ path: `/stores/${params.slug}`, locale, title: t('publicStore.notFoundTitle'), description: t('publicStore.notFoundDescription'), noIndex: true });
  return buildSeoMetadata({ path: `/stores/${profile.slug}`, locale, title: `${profile.businessName} | AlifWorld`, description: t('publicStore.metaDescription', { name: profile.businessName }), image: profile.bannerUrl || profile.logoUrl || undefined, type: 'website' });
}

export default async function PublicSellerStorePage({ params }: StorePageProps) {
  const headerList = await headers();
  const locale = getServerLocale(headerList as any);
  const t = createTranslator(locale);
  const profile = await getProfile(params.slug);
  if (!profile) notFound();
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-slate-900">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto h-52 max-w-7xl bg-slate-100 bg-cover bg-center" style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : undefined} />
        <div className="mx-auto -mt-12 flex max-w-7xl flex-col gap-4 px-4 pb-8 sm:flex-row sm:items-end sm:px-6 lg:px-8">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-amber-100 text-3xl font-black text-amber-700 shadow">{profile.logoUrl ? <img src={profile.logoUrl} alt="" className="h-full w-full object-cover" /> : profile.businessName.slice(0, 1)}</div>
          <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{t('publicStore.verifiedSeller')}</p><h1 className="text-3xl font-black">{profile.businessName}</h1><p className="text-sm text-slate-500">@{profile.slug}</p></div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-black">{t('publicStore.storeInformation')}</h2>{profile.vacationMode && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{profile.vacationMessage || t('publicStore.vacationDefault')}</div>}<p className="text-sm text-slate-600">{profile.storeDescription || t('publicStore.explore', { name: profile.businessName })}</p>{profile.shippingPolicy && <section><h3 className="font-bold">{t('publicStore.shippingPolicy')}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{profile.shippingPolicy}</p></section>}{profile.returnPolicy && <section><h3 className="font-bold">{t('publicStore.returnPolicy')}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{profile.returnPolicy}</p></section>}{profile.cancellationPolicy && <section><h3 className="font-bold">{t('publicStore.cancellationPolicy')}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{profile.cancellationPolicy}</p></section>}</div>
        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-black">{t('publicStore.contactStore')}</h2><div className="mt-4 space-y-2 text-sm text-slate-600">{profile.supportEmail && <a className="block text-amber-700 hover:underline" href={`mailto:${profile.supportEmail}`}>{profile.supportEmail}</a>}{profile.supportPhone && <a className="block text-amber-700 hover:underline" href={`tel:${profile.supportPhone}`}>{profile.supportPhone}</a>}{profile.pickupAddress && <p>{profile.pickupAddress.streetAddress}, {profile.pickupAddress.district}</p>}</div><Link href="/products" className="mt-6 inline-flex rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold">{t('publicStore.browseProducts')}</Link></aside>
      </section>
      <SeoJsonLd data={buildBreadcrumbJsonLd([{ name: 'AlifWorld', path: '/' }, { name: profile.businessName, path: `/stores/${profile.slug}` }], getServerLocale(headerList as any))} />
    </main>
  );
}
