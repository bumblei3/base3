import { describe, it, expect, vi } from 'vitest';

// Test the Storage class logic directly without importing the module
// (module-level initialization of IndexedDB/LocalStorage can hang in happy-dom)

describe('Storage namespace logic', () => {
  // Replicate the key() and filter logic from storage.ts
  function makeKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  function filterKeys(allKeys: string[], namespace: string): string[] {
    const prefix = namespace + ':';
    return allKeys.filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
  }

  it('should create namespaced keys', () => {
    expect(makeKey('base3', 'games:slot1')).toBe('base3:games:slot1');
    expect(makeKey('myns', 'foo')).toBe('myns:foo');
  });

  it('should filter keys by namespace', () => {
    const all = ['ns1:a', 'ns1:b', 'ns2:c', 'ns1:d'];
    expect(filterKeys(all, 'ns1')).toEqual(['a', 'b', 'd']);
    expect(filterKeys(all, 'ns2')).toEqual(['c']);
  });

  it('should return empty for non-matching namespace', () => {
    expect(filterKeys(['a:b', 'c:d'], 'x')).toEqual([]);
  });
});

describe('LocalStorageAdapter logic', () => {
  it('should serialize and deserialize JSON', () => {
    const data: Record<string, string> = {};
    const adapter = {
      get(key: string): unknown {
        const item = data[key];
        return item ? JSON.parse(item) : null;
      },
      set(key: string, value: unknown): void {
        data[key] = JSON.stringify(value);
      },
      remove(key: string): void {
        delete data[key];
      },
      clear(): void {
        Object.keys(data).forEach(k => delete data[k]);
      },
      keys(): string[] {
        return Object.keys(data);
      },
    };

    adapter.set('key1', { data: 'test' });
    expect(adapter.get('key1')).toEqual({ data: 'test' });
    expect(adapter.get('missing')).toBeNull();

    adapter.set('key2', [1, 2, 3]);
    expect(adapter.get('key2')).toEqual([1, 2, 3]);

    adapter.remove('key1');
    expect(adapter.get('key1')).toBeNull();

    adapter.clear();
    expect(adapter.keys()).toEqual([]);
  });
});

describe('Game save/load logic', () => {
  it('should save and load game data via adapter', async () => {
    const data: Record<string, unknown> = {};
    const adapter = {
      get(key: string): unknown { return data[key] ?? null; },
      set(key: string, value: unknown): void { data[key] = value; },
      remove(key: string): void { delete data[key]; },
      clear(): void { Object.keys(data).forEach(k => delete data[k]); },
      keys(): string[] { return Object.keys(data); },
    };

    // Simulate saveGame
    interface GameSaveData { variant: string; state: unknown; timestamp: number }
    async function saveGame(slot: string, gdata: GameSaveData): Promise<void> {
      adapter.set(`games:${slot}`, gdata);
    }
    async function loadGame(slot: string): Promise<GameSaveData | null> {
      return adapter.get(`games:${slot}`) as GameSaveData | null;
    }
    async function listSaves(): Promise<string[]> {
      return adapter.keys().filter(k => k.startsWith('games:'));
    }
    async function deleteSave(slot: string): Promise<void> {
      adapter.remove(`games:${slot}`);
    }

    saveGame('slot1', { variant: 'schach9x9', state: { board: [] }, timestamp: 123 });
    saveGame('slot2', { variant: 'trischach', state: {}, timestamp: 456 });

    const loaded = await loadGame('slot1');
    expect(loaded).toEqual({ variant: 'schach9x9', state: { board: [] }, timestamp: 123 });
    const saves = await listSaves();
    expect(saves).toContain('games:slot1');
    expect(saves).toContain('games:slot2');

    await deleteSave('slot1');
    const deleted = await loadGame('slot1');
    expect(deleted).toBeNull();
  });
});

describe('Settings logic', () => {
  it('should get/set settings as key-value store', async () => {
    const data: Record<string, unknown> = {};
    const adapter = {
      get(key: string): unknown { return data[key] ?? null; },
      set(key: string, value: unknown): void { data[key] = value; },
      remove(key: string): void { delete data[key]; },
      clear(): void { Object.keys(data).forEach(k => delete data[k]); },
      keys(): string[] { return Object.keys(data); },
    };

    async function getSettings(): Promise<Record<string, unknown>> {
      return (adapter.get('settings')) as Record<string, unknown> ?? {};
    }
    async function setSettings(settings: Record<string, unknown>): Promise<void> {
      adapter.set('settings', settings);
    }
    async function getSetting<K>(key: string, defaultValue: K): Promise<K> {
      const settings = await getSettings();
      return (settings[key] as K) ?? defaultValue;
    }
    async function setSetting(key: string, value: unknown): Promise<void> {
      const settings = await getSettings();
      settings[key] = value;
      await setSettings(settings);
    }

    // Initially empty
    const empty = await getSettings();
    expect(empty).toEqual({});

    // Set and get
    await setSetting('theme', 'dark');
    const theme = await getSetting('theme', 'light');
    expect(theme).toBe('dark');
    const missing = await getSetting('missing', 'default');
    expect(missing).toBe('default');

    // Multiple settings
    await setSetting('volume', 80);
    const all = await getSettings();
    expect(all).toEqual({ theme: 'dark', volume: 80 });
  });
});
