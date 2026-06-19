import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  LocalStorageAdapter,
  getSettings,
  setSettings,
  getSetting,
  setSetting,
  saveGame,
  loadGame,
  listSaves,
  deleteSave,
} from '@shared/storage/index';

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get keys() { return Object.keys(store); },
  };
})();

describe('Shared Storage', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  describe('LocalStorageAdapter', () => {
    test('get returns parsed JSON', async () => {
      mockLocalStorage.setItem('test-key', JSON.stringify({ foo: 'bar' }));
      const adapter = new LocalStorageAdapter();
      const result = await adapter.get('test-key');
      expect(result).toEqual({ foo: 'bar' });
    });

    test('get returns null for missing key', async () => {
      const adapter = new LocalStorageAdapter();
      const result = await adapter.get('nonexistent');
      expect(result).toBeNull();
    });

    test('set stores JSON string', async () => {
      const adapter = new LocalStorageAdapter();
      await adapter.set('test-key', { value: 42 });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', '{"value":42}');
    });

    test('remove deletes key', async () => {
      const adapter = new LocalStorageAdapter();
      await adapter.remove('test-key');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    test('clear removes all', async () => {
      const adapter = new LocalStorageAdapter();
      await adapter.clear();
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });

    test('keys returns all keys', async () => {
      mockLocalStorage.setItem('a', '1');
      mockLocalStorage.setItem('b', '2');
      const adapter = new LocalStorageAdapter();
      const result = await adapter.keys();
      expect(result).toContain('a');
      expect(result).toContain('b');
    });
  });

  describe('Settings functions', () => {
    test('getSettings returns empty object by default', async () => {
      const result = await getSettings();
      expect(result).toEqual({});
    });

    test('setSettings and getSettings roundtrip', async () => {
      await setSettings({ theme: 'dark', sound: true });
      const result = await getSettings();
      expect(result).toEqual({ theme: 'dark', sound: true });
    });

    test('getSetting returns default for missing key', async () => {
      const result = await getSetting('nonexistent', 'default');
      expect(result).toBe('default');
    });

    test('setSetting and getSetting roundtrip', async () => {
      await setSetting('difficulty', 3);
      const result = await getSetting('difficulty', 1);
      expect(result).toBe(3);
    });
  });

  describe('Game save functions', () => {
    test('saveGame and loadGame roundtrip', async () => {
      const saveData = { board: 'test', turn: 'white' };
      await saveGame('slot1', saveData as any);
      const result = await loadGame('slot1');
      expect(result).toEqual(saveData);
    });

    test('listSaves returns game slots', async () => {
      await saveGame('slot1', {} as any);
      await saveGame('slot2', {} as any);
      const result = await listSaves();
      expect(result).toContain('games:slot1');
      expect(result).toContain('games:slot2');
    });

    test('deleteSave removes slot', async () => {
      await saveGame('slot1', { data: 'test' } as any);
      await deleteSave('slot1');
      const result = await loadGame('slot1');
      expect(result).toBeNull();
    });
  });
});
