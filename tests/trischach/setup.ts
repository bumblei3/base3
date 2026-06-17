// Global test setup - suppress opening book debug output
import { vi } from 'vitest';

// Mock Web Audio API
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      type: 'sine',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    };
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    };
  }
  resume() {
    return Promise.resolve();
  }
}

global.AudioContext = MockAudioContext as any;
global.webkitAudioContext = MockAudioContext as any;

const originalLog = console.log;
const originalWarn = console.warn;

console.log = (...args) => {
  const msg = args.join(' ');
  // Suppress opening book debug output
  if (
    msg.includes('Opening book built:') ||
    msg.includes('Opening book (') ||
    (msg.includes('Move ') && msg.includes('failed at ply')) ||
    msg.startsWith('Opening book: ')
  ) {
    return;
  }
  originalLog(...args);
};

console.warn = (...args) => {
  const msg = args.join(' ');
  // Suppress opening book warnings
  if (
    (msg.includes('Opening book (') &&
      (msg.includes('Invalid move') ||
        msg.includes('Failed to select piece') ||
        msg.includes('failed at ply'))) ||
    msg.includes('Web Worker not supported')
  ) {
    return;
  }
  originalWarn(...args);
};

// Restore on teardown (optional - vitest isolates globals per test)
