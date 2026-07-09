/**
 * Minimal i18n system for Schach 9x9.
 *
 * Usage:
 *   import { t, setLocale, getLocale } from './i18n';
 *   t('menu.newGame')                 // => "Neues Spiel"
 *   t('game.moveCount', { n: 5 })     // => "5 Züge" (de) / "5 moves" (en)
 *
 * Locales are loaded lazily from ./locales/<code>.json and merged with the
 * German default so partial translations never crash (missing keys fall back
 * to German, then to the raw key). This keeps incremental migration safe:
 * untranslated strings keep showing the German text instead of "[missing]".
 */

export type LocaleCode = 'de' | 'en';

export interface LocaleMessages {
  [key: string]: string | LocaleMessages;
}

const DEFAULT_LOCALE: LocaleCode = 'de';
const STORAGE_KEY = 'schach9x9.locale';

let currentLocale: LocaleCode = loadInitialLocale();
const loadedMessages: Partial<Record<LocaleCode, LocaleMessages>> = {};

// German is the source of truth and always available without async loading.
import deMessages from './locales/de.json' with { type: 'json' };
loadedMessages.de = deMessages as LocaleMessages;

function loadInitialLocale(): LocaleCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    if (stored === 'de' || stored === 'en') return stored;
  } catch {
    /* localStorage unavailable (SSR/test) — fall back to default */
  }
  return DEFAULT_LOCALE;
}

/** Set the active locale. Persists to localStorage when available. */
export function setLocale(locale: LocaleCode): void {
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  } catch {
    /* ignore persistence failures */
  }
  // Notify the UI so panels can re-render their locale-dependent text live
  // (the app does not restart on language change).
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('localechange', { detail: { locale } }));
  }
}

/** Get the active locale. */
export function getLocale(): LocaleCode {
  return currentLocale;
}

/**
 * Translate a dotted key (e.g. "menu.newGame").
 * Supports `{placeholder}` interpolation from `params`.
 * Falls back to German, then to the raw key if neither locale has it.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const value: string = resolve(key, currentLocale) ?? resolve(key, 'de') ?? key;
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, name: string) =>
      params[name] !== undefined ? String(params[name]) : `{${name}}`
    );
  }
  return value;
}

function resolve(key: string, locale: LocaleCode): string | undefined {
  const dict = loadedMessages[locale];
  if (!dict) return undefined;
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict) as string | undefined;
}

/** Lazily ensure a non-German locale's messages are loaded. */
export async function ensureLocale(locale: LocaleCode): Promise<void> {
  if (locale === 'de' || loadedMessages[locale]) return;
  // Dynamic import keeps the English bundle out of the initial payload.
  const mod = await import(`./locales/${locale}.json`, { with: { type: 'json' } });
  loadedMessages[locale] = mod.default as LocaleMessages;
}

/** List of locales offered in the UI switcher. */
export const AVAILABLE_LOCALES: { code: LocaleCode; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
];
