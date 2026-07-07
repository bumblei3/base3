import { describe, expect, test, vi, beforeEach } from 'vitest';
import { MoveController } from '@schach9x9/moveController.js';

// Minimal Game-like shape needed by setTheme (read: currentTheme, write: currentTheme)
class FakeGame {
  currentTheme = 'default';
}

describe('MoveController.setTheme robustness', () => {
  let mc: any;
  beforeEach(() => {
    localStorage.clear();
    mc = new MoveController(new FakeGame() as any);
  });

  test('should set theme on game and persist it', () => {
    mc.setTheme('blue');
    expect(mc.game.currentTheme).toBe('blue');
    expect(localStorage.getItem('chess_theme')).toBe('blue');
  });

  test('should not throw when localStorage.setItem fails (private mode/quota)', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

    // Must NOT throw
    expect(() => mc.setTheme('blue')).not.toThrow();
    // In-memory state still updates
    expect(mc.game.currentTheme).toBe('blue');

    setItemSpy.mockRestore();
  });
});
