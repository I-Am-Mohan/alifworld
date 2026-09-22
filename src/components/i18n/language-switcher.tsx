'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { getLanguageSwitchMode } from '@/i18n/config';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale, languages, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const switchMode = getLanguageSwitchMode(locale, languages);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Rule 1: If language list is 1 -> don't show language change option
  if (switchMode.mode === 'hidden') {
    return null;
  }

  const { label, availableLanguages } = switchMode;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('language.switchLanguage')}
        className="group flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full border border-slate-200/90 hover:border-amber-400 bg-white hover:bg-amber-50/70 shadow-xs transition-all duration-200 cursor-pointer text-slate-700 hover:text-slate-950"
      >
        <Globe className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-12 transition-transform duration-300 shrink-0" />
        <span className="text-xs font-bold tracking-tight text-slate-800 group-hover:text-amber-700 leading-none select-none">
          {label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-amber-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200/90 rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
            <span>{t('language.selectLanguage')}</span>
            <span className="text-[9px] text-slate-400 font-medium font-mono">{availableLanguages.length}</span>
          </div>

          <div className="py-0.5">
            {availableLanguages.map((lang) => {
              const isSelected = lang.code === locale;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setLocale(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 text-amber-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{lang.nativeName}</span>
                    {lang.nativeName !== lang.name && (
                      <span className="text-[10px] text-slate-400 font-normal">({lang.name})</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
