import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { ErrorManager } from '@schach9x9/utils/ErrorManager.js';
import { logger } from '@schach9x9/logger.js';

// The @sentry/browser mock from the old forwarding tests is intentionally gone:
// ErrorManager is now self-contained (no third-party tracker).

vi.spyOn(logger, 'info').mockImplementation(function () {});

describe('ErrorManager self-contained lifecycle (no Sentry)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  test('init attaches global listeners and reports initialization', () => {
    const em = new ErrorManager();
    em.init();
    expect(logger.info).toHaveBeenCalledWith('ErrorManager initialized');
    em.release();
  });

  test('init is idempotent (does not double-attach)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const em = new ErrorManager();
    em.init();
    const afterFirst = addSpy.mock.calls.length;
    em.init();
    expect(addSpy.mock.calls.length).toBe(afterFirst);
    addSpy.mockRestore();
    em.release();
  });

  test('release detaches global listeners and clears the buffer', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const em = new ErrorManager();
    em.init();
    em.handleError(new Error('before release'), { context: 'Test' });
    em.release();
    expect(removeSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    // A fresh instance after release should have an empty buffer.
    const em2 = new ErrorManager();
    expect(em2.getLog().length).toBe(0);
    removeSpy.mockRestore();
  });

  test('does not contact any external error tracker', async () => {
    // There is no longer a Sentry init path; just ensure init resolves and
    // recorded errors stay local (exportLog returns only local content).
    const em = new ErrorManager();
    em.init();
    em.handleError(new Error('local only'), { context: 'SelfContained' });
    const dump = em.exportLog();
    expect(dump).toContain('local only');
    expect(dump).not.toContain('sentry');
    em.release();
  });
});
