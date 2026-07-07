import { describe, expect, test, vi, beforeEach } from 'vitest';
import { localStorageInstance } from '@shared/storage/index.js';

describe('localStorageInstance.set robustness', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should write and read back a value', async () => {
    await localStorageInstance.set('key', { a: 1 });
    expect(await localStorageInstance.get('key')).toEqual({ a: 1 });
  });

  test('should not throw when localStorage.setItem fails (private mode/quota)', async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

    // Must NOT throw — failure is swallowed so callers stay robust
    await expect(localStorageInstance.set('key', { a: 1 })).resolves.toBeUndefined();

    setItemSpy.mockRestore();
  });

  test('get should return null when localStorage.getItem throws', async () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('SecurityError', 'SecurityError');
      });

    expect(await localStorageInstance.get('key')).toBeNull();

    getItemSpy.mockRestore();
  });
});
