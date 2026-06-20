import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  uid,
  debounce,
  throttle,
  clamp,
  lerp,
  randomInt,
  randomChoice,
  shuffle,
  clone,
  merge,
  formatTime,
  parseTime,
  hexToRgb,
  rgbToHex,
  lightenColor,
  darkenColor,
  manhattanDistance,
  chebyshevDistance,
  chunk,
  unique,
  groupBy,
  sleep,
  retry,
  timeout,
  pick,
  omit,
  capitalize,
  slugify,
  truncate,
  formatDate,
  formatDateTime,
  timeAgo,
} from '@shared/utils';

describe('uid', () => {
  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });

  it('should use prefix when provided', () => {
    expect(uid('test_')).toMatch(/^test_/);
  });
});

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('should delay execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    debounced('b');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
  });

  it('should cancel pending execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('throttle', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('should execute immediately and then throttle', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    expect(fn).toHaveBeenCalledTimes(1);
    throttled('b');
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should cancel pending execution', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    throttled('b');
    throttled.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('clamp', () => {
  it('should return value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('should clamp to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('should clamp to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('should interpolate between values', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('should clamp t to [0, 1]', () => {
    expect(lerp(0, 10, -1)).toBe(0);
    expect(lerp(0, 10, 2)).toBe(10);
  });
});

describe('randomInt', () => {
  it('should return integer within range', () => {
    for (let i = 0; i < 50; i++) {
      const v = randomInt(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe('randomChoice', () => {
  it('should return an element from the array', () => {
    const arr = [1, 2, 3, 4, 5];
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(randomChoice(arr));
    }
  });
});

describe('shuffle', () => {
  it('should return array with same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  it('should not mutate original', () => {
    const arr = [1, 2, 3];
    shuffle(arr);
    expect(arr).toEqual([1, 2, 3]);
  });
});

describe('clone', () => {
  it('should deep clone an object', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = clone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });
});

describe('merge', () => {
  it('should deep merge objects', () => {
    const target = { a: 1, b: { c: 2, d: 3 } };
    const source = { b: { c: 99 } };
    const result = merge(target, source);
    expect(result).toEqual({ a: 1, b: { c: 99, d: 3 } });
  });

  it('should not mutate original', () => {
    const target = { a: { b: 1 } };
    merge(target, { a: { c: 2 } });
    expect(target).toEqual({ a: { b: 1 } });
  });
});

describe('formatTime', () => {
  it('should format MM:SS', () => {
    expect(formatTime(65000)).toBe('1:05');
    expect(formatTime(30000)).toBe('0:30');
  });

  it('should format HH:MM:SS', () => {
    expect(formatTime(3661000)).toBe('1:01:01');
  });

  it('should handle zero', () => {
    expect(formatTime(0)).toBe('0:00');
  });
});

describe('parseTime', () => {
  it('should parse MM:SS', () => {
    expect(parseTime('1:30')).toBe(90000);
  });

  it('should parse HH:MM:SS', () => {
    expect(parseTime('1:01:01')).toBe(3661000);
  });

  it('should return 0 for invalid', () => {
    expect(parseTime('abc')).toBe(0);
  });
});

describe('hexToRgb', () => {
  it('should convert hex to RGB', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('should return null for shorthand (not supported)', () => {
    expect(hexToRgb('#f00')).toBeNull();
  });

  it('should return null for invalid', () => {
    expect(hexToRgb('invalid')).toBeNull();
  });
});

describe('rgbToHex', () => {
  it('should convert RGB to hex', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
  });
});

describe('lightenColor / darkenColor', () => {
  it('should lighten a color', () => {
    const result = lightenColor('#808080', 0.5);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('should darken a color', () => {
    const result = darkenColor('#808080', 0.5);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('should return original for invalid hex', () => {
    expect(lightenColor('invalid', 0.5)).toBe('invalid');
  });
});

describe('manhattanDistance', () => {
  it('should calculate Manhattan distance', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
  });
});

describe('chebyshevDistance', () => {
  it('should calculate Chebyshev distance', () => {
    expect(chebyshevDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(4);
  });
});

describe('chunk', () => {
  it('should split array into chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('unique', () => {
  it('should remove duplicates', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  });
});

describe('groupBy', () => {
  it('should group items by key function', () => {
    const items = [
      { type: 'a', val: 1 },
      { type: 'b', val: 2 },
      { type: 'a', val: 3 },
    ];
    const grouped = groupBy(items, (item) => item.type);
    expect(grouped.a).toHaveLength(2);
    expect(grouped.b).toHaveLength(1);
  });
});

describe('sleep', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('should resolve after delay', async () => {
    const promise = sleep(100);
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe('retry', () => {
  it('should succeed on first try', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retry(fn, 3, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');
    const result = await retry(fn, 3, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(retry(fn, 2, 10)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('timeout', () => {
  it('should resolve before timeout', async () => {
    const result = await timeout(Promise.resolve('ok'), 1000);
    expect(result).toBe('ok');
  });

  it('should reject on timeout', async () => {
    const slow = new Promise<void>((resolve) => setTimeout(resolve, 2000));
    await expect(timeout(slow, 50)).rejects.toThrow('Timeout');
  });
});

describe('pick', () => {
  it('should pick specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('should ignore missing keys', () => {
    const obj = { a: 1 };
    expect(pick(obj, ['a', 'b' as keyof typeof obj])).toEqual({ a: 1 });
  });
});

describe('omit', () => {
  it('should omit specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('')).toBe('');
  });
});

describe('slugify', () => {
  it('should create URL-friendly slug', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(slugify('  Test  ')).toBe('test');
  });
});

describe('truncate', () => {
  it('should truncate long strings', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('should not truncate short strings', () => {
    expect(truncate('Hi', 8)).toBe('Hi');
  });
});

describe('formatDate', () => {
  it('should format a date', () => {
    const d = new Date(2024, 0, 15);
    const result = formatDate(d, 'de-DE');
    expect(result).toContain('15');
    expect(result).toContain('01');
    expect(result).toContain('2024');
  });

  it('should accept timestamp', () => {
    const ts = new Date(2024, 0, 15).getTime();
    expect(formatDate(ts)).toContain('2024');
  });
});

describe('formatDateTime', () => {
  it('should format date and time', () => {
    const d = new Date(2024, 0, 15, 14, 30);
    const result = formatDateTime(d, 'de-DE');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

describe('timeAgo', () => {
  it('should return "gerade eben" for seconds', () => {
    const d = new Date(Date.now() - 30000);
    expect(timeAgo(d)).toBe('gerade eben');
  });

  it('should return minutes', () => {
    const d = new Date(Date.now() - 120000);
    expect(timeAgo(d)).toContain('Min.');
  });

  it('should return hours', () => {
    const d = new Date(Date.now() - 7200000);
    expect(timeAgo(d)).toContain('Std.');
  });

  it('should return days', () => {
    const d = new Date(Date.now() - 172800000);
    expect(timeAgo(d)).toContain('Tagen');
  });
});
