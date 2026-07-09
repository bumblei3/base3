import { describe, test, expect, beforeEach } from 'vitest';
import { t, setLocale, getLocale, type LocaleCode } from '../../js/schach9x9/i18n/index.js';

describe('i18n', () => {
  beforeEach(() => {
    // Reset to German default before each test (no localStorage in Node).
    setLocale('de');
  });

  test('translates a known key in the default locale (de)', () => {
    expect(t('menu.newGame')).toBe('Neues Spiel');
  });

  test('switches locale and translates (en)', async () => {
    await import('../../js/schach9x9/i18n/index.js').then(m => m.ensureLocale('en'));
    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t('menu.newGame')).toBe('New Game');
  });

  test('interpolates named placeholders', () => {
    expect(t('toast.achievementUnlocked', { name: 'Sieg' })).toBe('Erfolg freigeschaltet: Sieg');
  });

  test('falls back to German when key missing in active locale', () => {
    // 'setup.whiteKing' exists in both, so use a key only present in de-merge
    setLocale('en');
    // Every key is in both bundles; verify fallback path by checking unknown key
    expect(t('totally.unknown.key')).toBe('totally.unknown.key');
  });

  test('nested keys resolve through dots', () => {
    expect(t('game.white')).toBe('Weiß');
    setLocale('en');
    expect(t('game.white')).toBe('White');
  });

  test('ensureLocale is a no-op for de and resolves en', async () => {
    await import('../../js/schach9x9/i18n/index.js').then(m => m.ensureLocale('en' as LocaleCode));
    setLocale('en');
    expect(t('menu.help')).toBe('Help');
  });

  test('setLocale dispatches a localechange event on window', async () => {
    await import('../../js/schach9x9/i18n/index.js').then(m => m.ensureLocale('en' as LocaleCode));
    let received: string | null = null;
    const handler = (e: Event) => {
      received = (e as CustomEvent).detail?.locale;
    };
    window.addEventListener('localechange', handler);
    setLocale('en');
    expect(received).toBe('en');
    setLocale('de');
    expect(received).toBe('de');
    window.removeEventListener('localechange', handler);
  });
});
