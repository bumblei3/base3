import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { ErrorManager } from '@schach9x9/utils/ErrorManager.js';
import { notificationUI } from '@schach9x9/ui/NotificationUI';
import { logger } from '@schach9x9/logger.js';

vi.spyOn(notificationUI, 'show').mockImplementation(function () {});
vi.spyOn(logger, 'error').mockImplementation(function () {});
vi.spyOn(logger, 'warn').mockImplementation(function () {});
vi.spyOn(logger, 'info').mockImplementation(function () {});

describe('ErrorManager local log buffer (Eigenbau-Observability)', () => {
  let em: ErrorManager;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    // init attaches global listeners; release() restores to a clean state.
    em = new ErrorManager();
    em.init();
  });

  afterEach(() => {
    em.release();
  });

  test('records handled errors into the local ring buffer', () => {
    const err = new Error('logged failure');
    em.handleError(err, { context: 'Test' });

    const log = em.getLog();
    expect(log.length).toBe(1);
    expect(log[0].level).toBe('error');
    expect(log[0].context).toBe('Test');
    expect(log[0].message).toContain('logged failure');
    expect(typeof log[0].timestamp).toBe('string');
  });

  test('records non-error warnings into the buffer with level "warn"', () => {
    em.warning('disk getting full', 'System');
    const log = em.getLog();
    expect(log.length).toBe(1);
    expect(log[0].level).toBe('warn');
    expect(log[0].context).toBe('System');
    expect(log[0].message).toBe('disk getting full');
  });

  test('captures uncaught window errors via the global handler', () => {
    const evt = new ErrorEvent('error', {
      message: 'uncaught boom',
      error: new Error('uncaught boom'),
    });
    window.dispatchEvent(evt);

    const log = em.getLog();
    expect(log.some((e) => e.message.includes('uncaught boom'))).toBe(true);
  });

  test('registers an unhandledrejection listener that records the rejection reason', () => {
    // happy-dom does not implement PromiseRejectionEvent, so we verify the
    // listener is wired up and that the handler records the rejection reason
    // the same way the global listener would.
    const listeners = window.addEventListener;
    let sawRejectionListener = false;
    const addSpy = vi
      .spyOn(window, 'addEventListener')
      .mockImplementation(function (this: Window, type: string, ...rest: unknown[]) {
        if (type === 'unhandledrejection') sawRejectionListener = true;
        return listeners.call(window, type as Event['type'], ...(rest as [EventListener]));
      });

    const em2 = new ErrorManager();
    em2.init();
    expect(sawRejectionListener).toBe(true);

    // The global listener simply forwards the reason to handleError.
    em2.handleError(new Error('async boom'), { context: 'Promise' });
    expect(em2.getLog().some((e) => e.message.includes('async boom'))).toBe(true);

    addSpy.mockRestore();
    em2.release();
  });

  test('caps buffer at the configured max size and keeps newest entries', () => {
    const bounded = new ErrorManager(3);
    bounded.init();
    try {
      for (let i = 0; i < 10; i++) {
        bounded.handleError(new Error(`entry-${i}`), { context: 'Flood' });
      }
      const log = bounded.getLog();
      expect(log.length).toBe(3);
      expect(log[0].message).toContain('entry-7');
      expect(log[2].message).toContain('entry-9');
    } finally {
      bounded.release();
    }
  });

  test('clearLog empties the buffer', () => {
    em.handleError(new Error('to be cleared'), { context: 'Test' });
    expect(em.getLog().length).toBe(1);
    em.clearLog();
    expect(em.getLog().length).toBe(0);
  });

  test('exportLog returns a newline-joined plain-text dump including level + context', () => {
    em.handleError(new Error('export me'), { context: 'Export' });
    const dump = em.exportLog();
    expect(dump).toContain('[error]');
    expect(dump).toContain('[Export]');
    expect(dump).toContain('export me');
    expect(dump.split('\n').length).toBeGreaterThanOrEqual(1);
  });
});
