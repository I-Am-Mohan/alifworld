'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from 'react';
import { LanguageDefinition, I18nConfig } from './types';
import {
  DEFAULT_LOCALE,
  INITIAL_LANGUAGES,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  isSupportedLocale,
  normalizeToCanonicalLocale,
} from './config';
import { getDictionary, TranslationSchema } from './translations';
import { formatPluralMessage } from './fallback';
import { formatLocalizedText } from '@/shared/utils/localization';

interface I18nContextType {
  locale: string;
  setLocale: (code: string) => void;
  languages: LanguageDefinition[];
  activeLanguages: LanguageDefinition[];
  defaultLocale: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  refreshLanguages: () => Promise<void>;
  isLoadingConfig: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function normalizeClientLocale(code?: string | null): string {
  const candidate = code?.trim();
  if (!candidate) return DEFAULT_LOCALE;
  return isSupportedLocale(candidate) ? normalizeToCanonicalLocale(candidate) : candidate;
}

function applyDocumentLocale(code: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizeClientLocale(code);
  }
}

function subscribeLocale(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener('alifworld:locale-change', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('alifworld:locale-change', onChange);
  };
}

function readStoredLocale(): string | null {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const cookie = document.cookie.match(new RegExp(`(^| )${LOCALE_COOKIE_NAME}=([^;]+)`))?.[2];
    return stored || cookie ? normalizeClientLocale(stored || cookie) : null;
  } catch {
    return null;
  }
}

function serverLocaleSnapshot() {
  return null;
}

export function I18nProvider({
  children,
  initialLocale,
  initialLanguages,
}: {
  children: React.ReactNode;
  initialLocale?: string;
  initialLanguages?: LanguageDefinition[];
}) {
  const storedLocale = useSyncExternalStore(
    subscribeLocale,
    readStoredLocale,
    serverLocaleSnapshot
  );
  const [selectedLocale, setLocaleState] = useState<string | null>(null);
  const locale = selectedLocale || storedLocale || normalizeClientLocale(initialLocale);
  const [languages, setLanguages] = useState<LanguageDefinition[]>(
    initialLanguages || INITIAL_LANGUAGES
  );
  const [defaultLocale, setDefaultLocale] = useState<string>(DEFAULT_LOCALE);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);

  // Sync with cookie and localStorage
  const applyLocale = useCallback((newCode: string) => {
    const normalizedCode = normalizeClientLocale(newCode);
    setLocaleState(normalizedCode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, normalizedCode);
        document.cookie = `${LOCALE_COOKIE_NAME}=${normalizedCode};path=/;max-age=31536000;SameSite=Lax`;
        applyDocumentLocale(normalizedCode);
        window.dispatchEvent(new Event('alifworld:locale-change'));
      } catch {}
    }
  }, []);

  const setLocale = (code: string) => {
    applyLocale(code);
  };

  // Fetch dynamic language configuration from backend API
  const loadLanguages = useCallback(
    () =>
      fetch('/api/v1/system/languages')
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              const config: I18nConfig = data.data;
              if (config.languages && config.languages.length > 0) {
                setLanguages(config.languages);
              }
              if (config.defaultLocale) {
                setDefaultLocale(config.defaultLocale);
              }
            }
          }
        })
        .catch(() => undefined)
        .finally(() => setIsLoadingConfig(false)),
    []
  );

  const refreshLanguages = useCallback(() => {
    setIsLoadingConfig(true);
    return loadLanguages();
  }, [loadLanguages]);

  // Initial load
  useEffect(() => {
    void loadLanguages();
  }, [loadLanguages]);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  // Translation lookup helper supporting dot-notation & parameter interpolation
  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const dict = getDictionary(locale);
      const fallbackDict = getDictionary(defaultLocale);

      const resolveKey = (obj: any, keys: string[]) => {
        let current = obj;
        for (const k of keys) {
          if (current === undefined || current === null) return undefined;
          current = current[k];
        }
        return typeof current === 'string' ? current : undefined;
      };

      const keys = path.split('.');
      let result = resolveKey(dict, keys);

      // Fallback to default dictionary if missing
      if (result === undefined && dict !== fallbackDict) {
        result = resolveKey(fallbackDict, keys);
      }

      // Fallback to English dictionary if still missing
      if (result === undefined) {
        result = resolveKey(getDictionary('en'), keys);
      }

      if (result === undefined) {
        return path; // Return raw key as last resort
      }

      if (params) {
        result = result.includes('{count, plural,')
          ? formatPluralMessage(result, {
              count: typeof params.count === 'number' ? params.count : Number(params.count ?? 0),
              params,
            })
          : formatLocalizedText(result as string, params);
      }

      return result;
    },
    [locale, defaultLocale]
  );

  const activeLanguages = languages.filter((l) => l.isActive);

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        languages,
        activeLanguages,
        defaultLocale,
        t,
        refreshLanguages,
        isLoadingConfig,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, locale, setLocale, activeLanguages } = useI18n();
  return { t, locale, setLocale, activeLanguages };
}
