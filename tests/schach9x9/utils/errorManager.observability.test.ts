import { describe, expect, test, vi, beforeEach } from 'vitest';

// Mock @sentry/browser so we can assert captureException is (or isn't) called
// without a real DSN / network.
const captureException = vi.fn();
const initSentry = vi.fn();
vi.mock('@sentry/browser', () => ({
  init: (...args: unknown[]) => initSentry(...args),
  captureException: (...args: unknown[]) => captureException(...args),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

import { ErrorManager } from '@schach9x9/utils/ErrorManager.js';

describe('ErrorManager Sentry forwarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('forwards handled errors to Sentry after init when DSN configured', async () => {
    const em = new ErrorManager();
    await em.init('https://example@sentry.io/123');

    const err = new Error('boom');
    em.handleError(err, { context: 'Test' });

    expect(captureException).toHaveBeenCalledWith(err, expect.objectContaining({ context: 'Test' }));
    expect(initSentry).toHaveBeenCalled();
  });

  test('does NOT forward to Sentry when no DSN configured', async () => {
    const em = new ErrorManager();
    await em.init();

    const err = new Error('silent');
    em.handleError(err, { context: 'Test' });

    expect(captureException).not.toHaveBeenCalled();
    expect(initSentry).not.toHaveBeenCalled();
  });

  test('global error handler forwards to Sentry when configured', async () => {
    const em = new ErrorManager();
    await em.init('https://example@sentry.io/123');

    // Our init uses addEventListener, so dispatch a real error event.
    const evt = new ErrorEvent('error', { message: 'global boom', error: new Error('global boom') });
    window.dispatchEvent(evt);

    expect(captureException).toHaveBeenCalled();
  });
});
