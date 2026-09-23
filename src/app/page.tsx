'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Search,
  Clipboard,
  Phone,
  Mail,
  ShoppingCart,
  ShoppingBag,
  Heart,
  Share2,
  Star,
  ArrowUp,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Home,
  LayoutGrid,
  Video,
  User,
  Sparkles,
  Laptop,
  Smartphone,
  Headphones,
  Shirt,
  Luggage,
  HeartPulse,
  X,
} from 'lucide-react';
import { AlifLogo } from '@/components/brand/logo';
import { useAuthModal } from '@/components/auth/auth-context';
import { useI18n } from '@/i18n/context';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';

// Custom Vector SVG Icons
function BasketIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 11 4-7" />
      <path d="m19 11-4-7" />
      <path d="M2 11h20" />
      <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.6-7.4" />
      <path d="M4.5 15.5h15" />
    </svg>
  );
}

function ArmchairIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
      <path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0z" />
      <path d="M5 18v2" />
      <path d="M19 18v2" />
    </svg>
  );
}

function CosmeticsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 13v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8" />
      <path d="M9 13h6" />
      <path d="M10 13V8h4v5" />
      <path d="M10 8c0-3 2-6 3-6s1 3 1 6" />
    </svg>
  );
}

function SneakerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 13h4l2.5-4h4.5l2 4h4a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H3.5A1.5 1.5 0 0 1 2 17.5v-3A1.5 1.5 0 0 1 3.5 13z" />
      <path d="M6 13l2-4" />
      <path d="M10 9l1.5 4" />
      <circle cx="6" cy="18" r="1" fill="currentColor" />
      <circle cx="18" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function WhatsAppIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 2C6.496 2 2 6.502 2 12.043c0 1.769.462 3.498 1.34 5.023L2 22l5.093-1.336a10.024 10.024 0 0 0 4.938 1.287h.004c5.535 0 10.031-4.502 10.031-10.044.001-2.68-1.04-5.199-2.933-7.094A9.972 9.972 0 0 0 12.031 2zm5.864 14.204c-.244.688-1.42 1.32-1.968 1.385-.515.061-1.189.088-3.41-.832-2.842-1.176-4.67-4.062-4.81-4.252-.142-.189-1.154-1.536-1.154-2.93 0-1.393.73-2.079.988-2.366.258-.287.562-.358.749-.358.187 0 .375.002.538.01.174.009.406-.066.634.481.244.587.834 2.037.907 2.185.073.149.122.324.024.519-.098.195-.147.316-.293.488-.146.172-.307.385-.439.517-.146.147-.298.307-.129.598.17.291.754 1.242 1.62 2.013 1.115.992 2.055 1.3 2.348 1.446.292.146.463.122.634-.073.17-.195.731-.852.926-1.144.195-.292.39-.244.658-.146.268.098 1.705.805 1.998.951.293.146.488.219.56.341.073.122.073.707-.171 1.395z"/>
    </svg>
  );
}

function FacebookIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  comparePrice: number;
  discountPercent: string;
  description: string;
  tags: string[];
  rating: number;
  reviews: number;
  inStock: boolean;
  imageUrl: string;
}

export default function CustomerStorePage() {
  const { openAuthModal, openAccountModal, user } = useAuthModal();
  const { t, locale } = useI18n();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedDivisionKey, setSelectedDivisionKey] = useState<string>('dhaka');
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cartCount, setCartCount] = useState<number>(2);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const nextState = !prev[productId];
      showToast(nextState ? t('store.product.addedWishlist') : t('store.product.removedWishlist'));
      return { ...prev, [productId]: nextState };
    });
  };

  const handleAddToCart = (productTitle: string) => {
    setCartCount((prev) => prev + 1);
    showToast(`${t('store.product.addedToCart')}: "${productTitle}"`);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const divisions = [
    { key: 'dhaka', name: t('store.divisions.dhaka') },
    { key: 'chittagong', name: t('store.divisions.chittagong') },
    { key: 'sylhet', name: t('store.divisions.sylhet') },
    { key: 'rajshahi', name: t('store.divisions.rajshahi') },
    { key: 'khulna', name: t('store.divisions.khulna') },
    { key: 'barisal', name: t('store.divisions.barisal') },
    { key: 'rangpur', name: t('store.divisions.rangpur') },
    { key: 'mymensingh', name: t('store.divisions.mymensingh') },
  ];
  const currentDivisionName = t(`store.divisions.${selectedDivisionKey}`);

  const categoryNav = [
    { id: 'All', label: t('store.categories.all'), icon: <BasketIcon className="w-5 h-5 text-amber-600" /> },
    { id: 'Furniture', label: t('store.categories.furniture'), icon: <ArmchairIcon className="w-5 h-5 text-slate-700" /> },
    { id: 'Electronics', label: t('store.categories.electronics'), icon: <Headphones className="w-5 h-5 text-indigo-600" /> },
    { id: 'Clothing', label: t('store.categories.clothing'), icon: <Shirt className="w-5 h-5 text-orange-600" /> },
    { id: 'Cosmetics', label: t('store.categories.cosmetics'), icon: <CosmeticsIcon className="w-5 h-5 text-rose-500" /> },
    { id: 'Shoes', label: t('store.categories.shoes'), icon: <SneakerIcon className="w-5 h-5 text-sky-600" /> },
  ];

  const topBrands = [
    {
      name: 'Puma',
      renderMark: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-black">
          <path d="M19.7 5.3c-.6-.6-1.5-.7-2.3-.4-1.2.5-2.2 1.3-3.1 2.3-1.4 1.5-2.6 3.2-4.1 4.6-.9.8-1.9 1.4-3 1.7-.8.2-1.6.1-2.3-.3-.4-.2-.8-.6-1.1-1-.1-.2-.4-.2-.5 0-.2.3-.3.7-.3 1.1 0 1.2.6 2.3 1.6 3 1 .7 2.2.9 3.4.6 1.3-.3 2.5-1 3.5-1.9 1.5-1.4 2.8-3 4.2-4.5.8-.9 1.7-1.6 2.7-2 .5-.2 1-.3 1.5-.1.3.1.5.3.6.6.1.3 0 .6-.2.9-.3.4-.7.7-1.1 1-.2.2-.2.5 0 .7.3.3.7.6 1.1.7.4.1.8 0 1.1-.3.4-.4.6-.9.6-1.5 0-1.4-.7-2.7-1.9-3.2z"/>
        </svg>
      ),
    },
    {
      name: 'Nike',
      renderMark: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-black">
          <path d="M21.7 8.3c-2.3 2.5-5.6 5.3-9.7 7.2-2.6 1.2-5.3 1.8-7.7 1.8-1.7 0-3-.4-3.8-1.1-.9-.8-1.1-1.9-.7-3.1.5-1.4 1.7-2.6 3.3-3.3 1.4-.6 2.9-.8 4.3-.6-1.8.6-3.1 1.7-3.5 2.8-.4 1.1.1 2 .9 2.5.8.5 2.1.8 3.8.8 2.2 0 4.8-.6 7.4-1.8 3.7-1.8 6.7-4.4 8.7-6.8.2-.3.6-.1.4.3z"/>
        </svg>
      ),
    },
    {
      name: 'Fastrack',
      renderMark: (
        <div className="flex items-center space-x-1 font-black italic text-sm tracking-tighter text-[#EA580C]">
          <span>fastrack</span>
        </div>
      ),
    },
    {
      name: 'Ray-Ban',
      renderMark: (
        <div className="font-serif italic font-black text-sm tracking-wide text-red-600">
          Ray•Ban
        </div>
      ),
    },
    {
      name: 'Wildcraft',
      renderMark: (
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 24 16" fill="currentColor" className="w-7 h-5 text-[#EA580C]">
            <path d="M2 2l4 12 3-8 3 8 4-12h3L15 14l-3-8-3 8-4-12H2z" />
          </svg>
        </div>
      ),
    },
    {
      name: "Levi's",
      renderMark: (
        <div className="bg-[#C41230] text-white px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase">
          LEVI&apos;S
        </div>
      ),
    },
    {
      name: 'Zara',
      renderMark: (
        <div className="font-serif font-black text-sm tracking-widest text-black">
          ZARA
        </div>
      ),
    },
    {
      name: 'Gap',
      renderMark: (
        <div className="bg-[#002B49] text-white px-2.5 py-1 rounded text-[11px] font-serif font-black tracking-wider uppercase">
          GAP
        </div>
      ),
    },
    {
      name: 'Under Armour',
      renderMark: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-black">
          <path d="M12 2C9.2 2 7 4.2 7 7c0 2 1.2 3.8 3 4.6-.2.4-.3.9-.3 1.4 0 .5.1 1 .3 1.4-1.8.8-3 2.6-3 4.6 0 2.8 2.2 5 5 5s5-2.2 5-5c0-2-1.2-3.8-3-4.6.2-.4.3-.9.3-1.4 0-.5-.1-1-.3-1.4 1.8-.8 3-2.6 3-4.6 0-2.8-2.2-5-5-5zm0 3c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3zm0 14c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" />
        </svg>
      ),
    },
  ];

  const promoFeatures = [
    {
      title: t('store.promo.luggageTitle'),
      subtitle: t('store.promo.luggageSubtitle'),
      discount: t('store.deals.minOff', { percent: '40' }),
      category: 'luggage',
      buttonBg: 'bg-[#EA580C] hover:bg-[#C2410C]',
      iconComponent: <Luggage className="w-4 h-4 text-orange-600" />,
      bgColor: 'bg-gradient-to-r from-orange-50/70 to-amber-50/90',
      imageUrl: 'https://images.unsplash.com/photo-1581553680321-4fffae59fccd?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: t('store.promo.healthTitle'),
      subtitle: t('store.promo.healthSubtitle'),
      discount: t('store.deals.minOff', { percent: '35' }),
      category: 'health',
      buttonBg: 'bg-[#0D9488] hover:bg-[#0F766E]',
      iconComponent: <HeartPulse className="w-4 h-4 text-teal-600" />,
      bgColor: 'bg-gradient-to-r from-teal-50/70 to-emerald-50/90',
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: t('store.promo.electronicsTitle'),
      subtitle: t('store.promo.electronicsSubtitle'),
      discount: t('store.deals.minOff', { percent: '30' }),
      category: 'electronics',
      buttonBg: 'bg-[#7C3AED] hover:bg-[#6D28D9]',
      iconComponent: <Laptop className="w-4 h-4 text-purple-600" />,
      bgColor: 'bg-gradient-to-r from-purple-50/70 to-indigo-50/90',
      imageUrl: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: t('store.promo.clothingTitle'),
      subtitle: t('store.promo.clothingSubtitle'),
      discount: t('store.deals.minOff', { percent: '25' }),
      category: 'clothing',
      buttonBg: 'bg-[#EA580C] hover:bg-[#C2410C]',
      iconComponent: <Shirt className="w-4 h-4 text-orange-600" />,
      bgColor: 'bg-gradient-to-r from-amber-50/70 to-orange-50/90',
      imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: t('store.categories.shoes'),
      subtitle: t('store.promo.shoesSubtitle'),
      discount: t('store.deals.minOff', { percent: '30' }),
      category: 'shoes',
      buttonBg: 'bg-[#0284C7] hover:bg-[#0369A1]',
      iconComponent: <SneakerIcon className="w-4 h-4 text-sky-600" />,
      bgColor: 'bg-gradient-to-r from-sky-50/70 to-blue-50/90',
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: t('store.categories.skinCare'),
      subtitle: t('store.promo.skinCareSubtitle'),
      discount: t('store.deals.minOff', { percent: '20' }),
      category: 'skincare',
      buttonBg: 'bg-[#E11D48] hover:bg-[#BE123C]',
      iconComponent: <Sparkles className="w-4 h-4 text-rose-500" />,
      bgColor: 'bg-gradient-to-r from-rose-50/70 to-pink-50/90',
      imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const trendingCategories = [
    {
      name: t('store.promo.luggageTitle'),
      count: `7 ${t('store.categories.itemsCount')}`,
      bgClass: 'bg-[#FFEDD5] border-[#FED7AA]',
      icon: <Luggage className="w-5 h-5 text-orange-600" />,
    },
    {
      name: t('store.promo.healthTitle'),
      count: `46 ${t('store.categories.itemsCount')}`,
      bgClass: 'bg-[#EEF2FF] border-[#E0E7FF]',
      icon: <HeartPulse className="w-5 h-5 text-indigo-600" />,
    },
    {
      name: t('store.categories.electronics'),
      count: `41 ${t('store.categories.itemsCount')}`,
      bgClass: 'bg-[#FEF3C7] border-[#FDE68A]',
      icon: <Smartphone className="w-5 h-5 text-amber-600" />,
    },
    {
      name: t('store.categories.clothing'),
      count: `54 ${t('store.categories.itemsCount')}`,
      bgClass: 'bg-[#FCE7F3] border-[#FBCFE8]',
      icon: <Shirt className="w-5 h-5 text-pink-600" />,
    },
    {
      name: t('store.categories.shoes'),
      count: `42 ${t('store.categories.itemsCount')}`,
      bgClass: 'bg-[#CCFBF1] border-[#99F6E4]',
      icon: <SneakerIcon className="w-5 h-5 text-teal-600" />,
    },
    {
      name: t('store.categories.skinCare'),
      count: `7 ${t('store.categories.itemsCount')}`,
      bgClass: 'bg-[#DCFCE7] border-[#BBF7D0]',
      icon: <Sparkles className="w-5 h-5 text-emerald-600" />,
    },
  ];

  const fashionProducts: Product[] = [
    {
      id: 'prd_hm_yoga_01',
      title: t('store.items.hmYogaTitle'),
      brand: 'H&M',
      category: 'Clothing',
      price: 2499,
      comparePrice: 2999,
      discountPercent: t('store.product.discountOff', { percent: '14.29' }),
      description: t('store.items.hmYogaDesc'),
      tags: ['S', 'leggings', 'yoga'],
      rating: 5.0,
      reviews: 1,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_tnf_hoodie_02',
      title: t('store.items.tnfHoodieTitle'),
      brand: 'THE NORTH FACE',
      category: 'Clothing',
      price: 3399,
      comparePrice: 3799,
      discountPercent: t('store.product.discountOff', { percent: '11.11' }),
      description: t('store.items.tnfHoodieDesc'),
      tags: ['M', 'hoodie', 'cotton'],
      rating: 4.8,
      reviews: 24,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_zara_dress_03',
      title: t('store.items.zaraDressTitle'),
      brand: 'ZARA',
      category: 'Clothing',
      price: 3399,
      comparePrice: 3899,
      discountPercent: t('store.product.discountOff', { percent: '13.05' }),
      description: t('store.items.zaraDressDesc'),
      tags: ['S', 'dress', 'floral'],
      rating: 4.9,
      reviews: 18,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_levis_jeans_04',
      title: t('store.items.levisJeansTitle'),
      brand: "LEVI'S",
      category: 'Clothing',
      price: 4199,
      comparePrice: 4999,
      discountPercent: t('store.product.discountOff', { percent: '16.67' }),
      description: t('store.items.levisJeansDesc'),
      tags: ['Blue', '32', 'jeans'],
      rating: 4.7,
      reviews: 42,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const footwearProducts: Product[] = [
    {
      id: 'prd_bata_sandals_05',
      title: t('store.items.bataSandalsTitle'),
      brand: 'BATA',
      category: 'Shoes',
      price: 1450,
      comparePrice: 1700,
      discountPercent: t('store.product.discountOff', { percent: '15.01' }),
      description: t('store.items.bataSandalsDesc'),
      tags: ['11', 'sandals', 'kids'],
      rating: 3.0,
      reviews: 1,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_woodland_shoes_06',
      title: t('store.items.woodlandShoesTitle'),
      brand: 'WOODLAND',
      category: 'Shoes',
      price: 6800,
      comparePrice: 7600,
      discountPercent: t('store.product.discountOff', { percent: '11.11' }),
      description: t('store.items.woodlandShoesDesc'),
      tags: ['8', 'formal shoes', 'leather'],
      rating: 4.9,
      reviews: 35,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_nike_air_07',
      title: t('store.items.nikeAirTitle'),
      brand: 'NIKE',
      category: 'Shoes',
      price: 7200,
      comparePrice: 8200,
      discountPercent: t('store.product.discountOff', { percent: '12.20' }),
      description: t('store.items.nikeAirDesc'),
      tags: ['10', 'running', 'sneakers'],
      rating: 4.8,
      reviews: 64,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_puma_casual_08',
      title: t('store.items.pumaCasualTitle'),
      brand: 'PUMA',
      category: 'Shoes',
      price: 2850,
      comparePrice: 3500,
      discountPercent: t('store.product.discountOff', { percent: '18.57' }),
      description: t('store.items.pumaCasualDesc'),
      tags: ['9', 'casual', 'canvas'],
      rating: 4.6,
      reviews: 19,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between selection:bg-[#F59E0B] selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#18181B] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-sm font-semibold border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP UTILITY BAR */}
      <div className="bg-[#DBEAFE]/80 backdrop-blur-sm border-b border-sky-200/60 text-slate-700 text-xs py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="flex items-center space-x-1.5 text-slate-700 hover:text-slate-950">
              <Phone className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-semibold">{t('nav.hotline')}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-slate-500 font-medium hidden sm:inline">{t('nav.followUs')}</span>
            <div className="flex items-center space-x-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-110 transition-transform"
              >
                <FacebookIcon className="w-2.5 h-2.5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center hover:scale-110 transition-transform"
              >
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:scale-110 transition-transform"
              >
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X"
                className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center hover:scale-110 transition-transform"
              >
                <XIcon className="w-2.5 h-2.5 text-white" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Logo & Location */}
          <div className="flex items-center space-x-4 sm:space-x-6 shrink-0">
            <AlifLogo size="md" href="/" />

            {/* Deliver To Selector */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                className="flex items-center space-x-2 text-left hover:bg-slate-50 py-1.5 px-3 rounded-xl transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {t('nav.deliverTo')}
                  </span>
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                    {currentDivisionName}
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </span>
                </div>
              </button>

              {isLocationMenuOpen && (
                <div className="absolute left-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    {t('nav.selectDivision')}
                  </div>
                  {divisions.map((div) => (
                    <button
                      key={div.key}
                      type="button"
                      onClick={() => {
                        setSelectedDivisionKey(div.key);
                        setIsLocationMenuOpen(false);
                        showToast(t('store.divisions.locationSet', { location: div.name }));
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-amber-50 hover:text-[#D97706] transition-colors ${
                        selectedDivisionKey === div.key ? 'bg-amber-50 text-[#F59E0B] font-bold' : 'text-slate-700'
                      }`}
                    >
                      {div.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-2 sm:mx-4">
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                className="w-full bg-[#F8FAFC] border border-slate-200/90 rounded-full py-2.5 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 shadow-sm transition-all"
              />
              <button
                type="button"
                aria-label={t('common.pasteClipboard')}
                onClick={() => {
                  navigator.clipboard
                    ?.readText?.()
                    .then((text) => setSearchQuery(text))
                    .catch(() => showToast(t('common.clipboardReady')));
                }}
                className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 transition-colors"
                title={t('common.pasteClipboard')}
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Actions & Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Account Button (Desktop only: hidden on mobile because available in bottom navigation bar) */}
            <button
              type="button"
              onClick={() => {
                if (user) {
                  openAccountModal();
                } else {
                  openAuthModal('login');
                }
              }}
              className="hidden md:flex flex-col items-center group text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
              title={user ? `${t('nav.account')}: ${user.name || t('nav.account')}` : `${t('nav.signIn')} / ${t('nav.register')}`}
            >
              <div className="relative">
                <User className="w-5 h-5 text-slate-700 group-hover:text-[#F59E0B] transition-colors" />
                {user && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 mt-1 truncate max-w-[65px]">
                {user ? user.name?.split(' ')[0] || t('nav.account') : t('nav.account')}
              </span>
            </button>

            {/* Cart Button (Desktop only: hidden on mobile because available in bottom navigation bar) */}
            <button
              type="button"
              onClick={() => showToast(t('auth.cartCountToast', { count: cartCount }))}
              className="hidden md:flex flex-col items-center group text-slate-700 hover:text-slate-950 transition-colors relative cursor-pointer"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-slate-700 group-hover:text-[#F59E0B] transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#F59E0B] text-black font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 mt-1">{t('nav.cart')}</span>
            </button>

            {/* Language Switcher: Positioned after cart button on desktop, and at the end on mobile! */}
            <div className="hidden md:block w-px h-6 bg-slate-200 ml-1 mr-0.5" />
            <LanguageSwitcher />
          </div>
        </div>

        {/* Mobile Deliver To Bar */}
        <div className="lg:hidden relative px-4 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-bold text-[11px] text-slate-800">{currentDivisionName}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
            className="text-[10px] font-bold text-[#F59E0B] hover:underline"
          >
            {t('common.change')}
          </button>

          {isLocationMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-xl py-2 z-50">
              <div className="px-4 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex justify-between items-center">
                <span>{t('nav.selectDivision')}</span>
                <button
                  type="button"
                  onClick={() => setIsLocationMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 p-2">
                {divisions.map((div) => (
                  <button
                    key={div.key}
                    type="button"
                    onClick={() => {
                      setSelectedDivisionKey(div.key);
                      setIsLocationMenuOpen(false);
                      showToast(t('store.divisions.locationSet', { location: div.name }));
                    }}
                    className={`text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      selectedDivisionKey === div.key ? 'bg-amber-50 text-[#F59E0B] font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {div.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* CATEGORY ICON NAVIGATION STRIP */}
      <nav aria-label={t('nav.categories')} className="bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-start sm:justify-center space-x-6 sm:space-x-10 py-3 overflow-x-auto no-scrollbar">
            {categoryNav.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    showToast(t('store.promo.filteredBy', { name: cat.label }));
                  }}
                  className="flex flex-col items-center group shrink-0 relative pb-1 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </div>
                  <span
                    className={`text-xs mt-1 transition-colors ${
                      isActive ? 'font-black text-slate-950' : 'font-semibold text-slate-600 group-hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#F59E0B] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E0F2FE] via-[#F0F9FF] to-[#FAF9F6]">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&auto=format&fit=crop&q=80"
            alt={t('store.hero.title')}
            className="w-full h-full object-cover object-center opacity-75 sm:opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-100/90 via-sky-50/70 to-transparent sm:from-sky-100/95 sm:via-sky-50/60" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="max-w-xl">
            {/* Pill Tag with Sparkles Icon */}
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sky-900/10 border border-sky-800/20 text-[#0A4B8C] text-xs font-black tracking-wide uppercase mb-6 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#0A4B8C]" />
              <span>{t('store.hero.collectionBadge')}</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-[#0A2540] tracking-tight leading-[1.05]">
              {t('store.hero.title')}
            </h1>

            <p className="mt-4 text-sm sm:text-base text-slate-700 max-w-md leading-relaxed font-medium">
              {t('store.hero.subtitle')}
            </p>

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('deals-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center space-x-2 px-7 py-3.5 rounded-full bg-[#0A4B8C] hover:bg-[#083A6D] text-white font-bold text-sm shadow-lg shadow-sky-950/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>{t('store.hero.shopNow')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TOP BRANDS SECTION */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight">{t('store.brands.title')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('store.brands.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => showToast(t('store.promo.viewingBrands'))}
            className="text-xs font-bold text-[#F59E0B] hover:text-[#D97706] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('common.viewAll')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3 sm:gap-4">
          {topBrands.map((brand) => (
            <div
              key={brand.name}
              className="flex flex-col items-center group cursor-pointer"
              onClick={() => showToast(t('store.promo.filteredBy', { name: brand.name }))}
            >
              <div className="w-full aspect-square rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex items-center justify-center p-3 text-center group-hover:scale-105">
                {brand.renderMark}
              </div>
              <span className="text-[11px] font-semibold text-slate-600 mt-1.5 group-hover:text-slate-950 transition-colors">
                {brand.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* PROMOTIONAL SPLIT-CARD GRID */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promoFeatures.map((promo) => (
            <div
              key={promo.title}
              className={`rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-row items-center justify-between p-5 sm:p-6 transition-all hover:shadow-md ${promo.bgColor}`}
            >
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shrink-0 shadow-sm bg-white">
                <img
                  src={promo.imageUrl}
                  alt={promo.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="ml-4 sm:ml-6 flex-1 flex flex-col items-start">
                <div className="w-8 h-8 rounded-xl bg-white/90 shadow-xs flex items-center justify-center mb-2">
                  {promo.iconComponent}
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                  {promo.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  {promo.subtitle}
                </p>
                <div className="text-xs font-black text-slate-900 mt-2">
                  {promo.discount}
                </div>
                <button
                  type="button"
                  onClick={() => showToast(t('store.promo.shoppingToast', { title: promo.title }))}
                  className={`mt-3 inline-flex items-center space-x-1 px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-sm transition-all cursor-pointer ${promo.buttonBg}`}
                >
                  <span>{t('store.hero.shopNow')}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TRENDING CATEGORIES PASTEL PILLS */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">{t('store.categories.all')}</h2>
          <button
            type="button"
            onClick={() => showToast(t('store.promo.browsingCategories'))}
            className="text-xs font-bold text-[#F59E0B] hover:text-[#D97706] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('common.viewAll')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {trendingCategories.map((cat) => (
            <div
              key={cat.name}
              onClick={() => showToast(t('store.promo.openedCategory', { name: cat.name }))}
              className={`rounded-2xl border p-4 shadow-xs hover:shadow-md cursor-pointer transition-all flex items-center justify-between group ${cat.bgClass}`}
            >
              <div className="flex-1 pr-2">
                <div className="font-bold text-xs text-slate-900 leading-snug line-clamp-1 group-hover:text-black">
                  {cat.name}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {cat.count}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/95 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                {cat.icon}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED SHOE COLLECTION SHOWCASE BANNER */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="relative rounded-3xl overflow-hidden bg-[#F6F1EA] border border-amber-200/50 shadow-sm p-6 sm:p-10 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-md z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-none">
              {t('store.shoeCollection.title')}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-700 font-medium">
              {t('store.shoeCollection.subtitle')}
            </p>
            <div className="w-14 h-1 bg-[#D97706] rounded-full mt-4 mb-6" />
            <button
              type="button"
              onClick={() => showToast(t('store.shoeCollection.steppingToast'))}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-full bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
            >
              <span>{t('store.shoeCollection.cta')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative w-full max-w-xl flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&auto=format&fit=crop&q=80"
              alt={t('store.shoeCollection.title')}
              className="w-full max-h-72 object-contain drop-shadow-xl"
            />

            {/* Price Tag Pin 1 */}
            <div className="absolute top-4 left-4 sm:left-12 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg px-3 py-1.5 flex items-center space-x-2">
              <SneakerIcon className="w-4 h-4 text-amber-600" />
              <div className="text-left">
                <div className="text-[10px] font-bold text-slate-500">{t('store.shoeCollection.trackSpikes')}</div>
                <div className="text-xs font-black text-slate-900">৳4,599</div>
              </div>
            </div>

            {/* Price Tag Pin 2 */}
            <div className="absolute bottom-4 right-4 sm:right-10 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg px-3 py-1.5 flex items-center space-x-2">
              <SneakerIcon className="w-4 h-4 text-slate-700" />
              <div className="text-left">
                <div className="text-[10px] font-bold text-slate-500">{t('store.shoeCollection.platformSneakers')}</div>
                <div className="text-xs font-black text-slate-900">৳4,199</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOP DEALS IN FASHION PRODUCT GRID */}
      <section id="deals-section" className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight">{t('store.trending.fashionTitle')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('store.trending.fashionSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => showToast(t('store.promo.browsingFashionDeals'))}
            className="text-xs font-bold text-[#F59E0B] hover:text-[#D97706] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('common.viewAll')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {fashionProducts.map((product) => {
            const isFav = !!favorites[product.id];
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-800" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex flex-col space-y-2">
                      <button
                        type="button"
                        aria-label={t('common.addToWishlist')}
                        onClick={() => toggleFavorite(product.id)}
                        className={`w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xs flex items-center justify-center transition-all cursor-pointer ${
                          isFav ? 'text-red-500 scale-110' : 'text-slate-500 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-current text-red-500' : ''}`} />
                      </button>
                      <button
                        type="button"
                        aria-label={t('common.shareProduct')}
                        onClick={() => showToast(t('store.promo.linkCopied'))}
                        className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-500 uppercase tracking-wider font-mono">
                        {product.brand}
                      </span>
                      <span className="font-bold text-[#16A34A] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                        {t('store.product.inStock')}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#D97706] transition-colors leading-snug line-clamp-1">
                      {product.title}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {product.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-baseline space-x-2">
                      <span className="text-base sm:text-lg font-black text-slate-950">
                        ৳{product.price}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ৳{product.comparePrice}
                      </span>
                      <span className="text-xs font-bold text-[#16A34A]">
                        {product.discountPercent}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-500 flex items-center space-x-1">
                      <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                      <span className="font-bold text-slate-800">{product.rating}</span>
                      <span>({product.reviews})</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product.title)}
                    className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{t('store.product.addToCart')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTWEAR PREMIUM COLLECTION */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">{t('store.trending.footwearTitle')}</h2>
          <button
            type="button"
            onClick={() => showToast(t('store.promo.browsingFootwear'))}
            className="text-xs font-bold text-[#F59E0B] hover:text-[#D97706] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('store.product.seeAll')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {footwearProducts.map((product) => {
            const isFav = !!favorites[product.id];
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute top-2.5 right-2.5 flex flex-col space-y-2">
                      <button
                        type="button"
                        aria-label={t('common.addToWishlist')}
                        onClick={() => toggleFavorite(product.id)}
                        className={`w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xs flex items-center justify-center transition-all cursor-pointer ${
                          isFav ? 'text-red-500 scale-110' : 'text-slate-500 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-current text-red-500' : ''}`} />
                      </button>
                      <button
                        type="button"
                        aria-label={t('common.shareProduct')}
                        onClick={() => showToast(t('store.promo.linkCopied'))}
                        className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-500 uppercase tracking-wider font-mono">
                        {product.brand}
                      </span>
                      <span className="font-bold text-[#16A34A] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                        {t('store.product.inStock')}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#D97706] transition-colors leading-snug line-clamp-1">
                      {product.title}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {product.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-baseline space-x-2">
                      <span className="text-base sm:text-lg font-black text-slate-950">
                        ৳{product.price}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ৳{product.comparePrice}
                      </span>
                      <span className="text-xs font-bold text-[#16A34A]">
                        {product.discountPercent}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-500 flex items-center space-x-1">
                      <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                      <span className="font-bold text-slate-800">{product.rating}</span>
                      <span>({product.reviews})</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product.title)}
                    className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{t('store.product.addToCart')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-20 sm:bottom-8 left-4 z-40 flex flex-col space-y-3">
        {/* Floating Cart Button */}
        <button
          type="button"
          aria-label={t('common.viewCart')}
          onClick={() => showToast(t('store.promo.openingCart', { count: cartCount }))}
          className="w-12 h-12 rounded-full bg-[#18181B] text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center relative border border-slate-700 cursor-pointer"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#F59E0B] text-black font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
              {cartCount}
            </span>
          )}
        </button>

        {/* Floating WhatsApp Support Button */}
        <a
          href="https://wa.me/8801997469249"
          target="_blank"
          rel="noreferrer"
          aria-label={t('common.chatWhatsApp')}
          className="w-12 h-12 rounded-full bg-[#25D366] text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <WhatsAppIcon className="w-6 h-6" />
        </a>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          type="button"
          aria-label={t('common.scrollToTop')}
          onClick={scrollToTop}
          className="fixed bottom-20 sm:bottom-8 right-4 z-40 w-12 h-12 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-black shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* STICKY MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2 px-6 shadow-2xl flex justify-between items-center">
        <button
          type="button"
          onClick={() => {
            scrollToTop();
            showToast(t('nav.home'));
          }}
          className="flex flex-col items-center text-slate-950 font-bold cursor-pointer"
        >
          <Home className="w-5 h-5 text-slate-950" />
          <span className="text-[10px] mt-1 font-black">{t('nav.home')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('deals-section');
            el?.scrollIntoView({ behavior: 'smooth' });
            showToast(t('nav.categories'));
          }}
          className="flex flex-col items-center text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-semibold">{t('nav.categories')}</span>
        </button>

        <button
          type="button"
          onClick={() => showToast(t('auth.cartCountToast', { count: cartCount }))}
          className="flex flex-col items-center text-slate-500 hover:text-slate-900 relative cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#F59E0B] text-black font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-semibold">{t('nav.bag')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (user) {
              openAccountModal();
            } else {
              openAuthModal('login');
            }
          }}
          className="flex flex-col items-center text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-semibold">{t('nav.account')}</span>
        </button>
      </div>

      {/* LUXURY DARK FOOTER */}
      <footer className="bg-[#161614] text-white pt-16 pb-24 md:pb-12 border-t border-neutral-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12 pb-12 border-b border-neutral-800">
            {/* Brand & Slogan */}
            <div className="space-y-4">
              <AlifLogo size="md" href="/" inverted />
              <p className="text-xs text-[#9CA3AF] leading-relaxed max-w-sm">
                {t('store.footer.slogan')}
              </p>

              <div className="pt-2 space-y-2 text-xs text-[#D1D5DB]">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold">{t('nav.hotline')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold">info@alifworld.com</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4">
                {t('store.footer.quickLinks')}
              </h4>
              <ul className="space-y-2.5 text-xs text-[#9CA3AF]">
                <li>
                  <button type="button" onClick={() => showToast(t('store.promo.aboutToast'))} className="hover:text-white transition-colors cursor-pointer">
                    {t('store.footer.aboutUs')}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => showToast(t('store.promo.faqsToast'))} className="hover:text-white transition-colors cursor-pointer">
                    {t('store.footer.faqs')}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => showToast(t('store.promo.storesToast'))} className="hover:text-white transition-colors cursor-pointer">
                    {t('store.footer.stores')}
                  </button>
                </li>
                <a href="/seller/apply">
                  <li className="pt-2">
                  <span className="text-amber-500 font-bold block mb-1.5">{t('store.footer.becomeSeller')}</span>
                </li>
                </a>
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4">
                {t('store.footer.policies')}
              </h4>
              <ul className="space-y-2.5 text-xs text-[#9CA3AF]">
                <li>
                  <button type="button" onClick={() => showToast(t('store.promo.privacyToast'))} className="hover:text-white transition-colors cursor-pointer">
                    {t('store.footer.privacyPolicy')}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => showToast(t('store.promo.termsToast'))} className="hover:text-white transition-colors cursor-pointer">
                    {t('store.footer.termsConditions')}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => showToast(t('store.promo.shippingToast'))} className="hover:text-white transition-colors cursor-pointer">
                    {t('store.footer.shippingPolicy')}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => showToast(t('store.promo.returnToast'))} className="hover:text-white transition-colors cursor-pointer">
                    {t('store.footer.returnPolicy')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Follow Us & Trust Badges */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4">
                {t('store.footer.followUs')}
              </h4>
              <div className="flex items-center space-x-3 mb-6">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="w-8 h-8 rounded-full bg-[#262624] text-white flex items-center justify-center hover:bg-[#F59E0B] hover:text-black transition-colors"
                >
                  <FacebookIcon className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-8 h-8 rounded-full bg-[#262624] text-white flex items-center justify-center hover:bg-[#F59E0B] hover:text-black transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="w-8 h-8 rounded-full bg-[#262624] text-white flex items-center justify-center hover:bg-[#F59E0B] hover:text-black transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X"
                  className="w-8 h-8 rounded-full bg-[#262624] text-white flex items-center justify-center hover:bg-[#F59E0B] hover:text-black transition-colors"
                >
                  <XIcon className="w-3.5 h-3.5 text-white" />
                </a>
              </div>

              {/* Trust Badges */}
              <div className="space-y-2 text-xs text-[#D1D5DB] font-medium">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>{t('store.footer.qualityAssured')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>{t('store.footer.secureCheckout')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>{t('store.footer.trustedDelivery')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#9CA3AF] gap-4">
            <div>
              {t('store.footer.copyright')}
            </div>
            <div className="px-3 py-1 rounded-full bg-[#262624] text-slate-400 border border-neutral-800 font-mono text-[11px]">
              {t('store.footer.version')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
