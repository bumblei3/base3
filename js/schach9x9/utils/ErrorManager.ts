/**
 * ErrorManager.ts
 * Centralized error handling and reporting.
 *
 * Forwards errors to Sentry when a DSN is configured (VITE_SENTRY_DSN in
 * production). Without a DSN the manager is a no-op sink so the game never
 * breaks for lack of an error-tracking account.
 */
import { logger } from '../logger.js';
import { notificationUI } from '../ui/NotificationUI.js';

type SentryCapture = (_error: unknown, _context?: Record<string, unknown>) => void;

export class ErrorManager {
  private initialized: boolean = false;
  /** Sentry capture fn, resolved lazily on init() when a DSN is present. */
  private sentryCapture: SentryCapture | null = null;
  /** Release/version tag forwarded to Sentry for grouping. */
  private release: string | undefined = undefined;
  /** Bound handlers so removeEventListener (clean teardown) keeps working. */
  private readonly boundOnError = (event: ErrorEvent) => this.onWindowError(event);
  private readonly boundOnRejection = (event: PromiseRejectionEvent) =>
    this.handleError(event.reason, { context: 'Promise', meta: { type: 'unhandledRejection' } });

  constructor() {
    this.initialized = false;
  }

  async init(dsnOverride?: string): Promise<void> {
    if (this.initialized) return;

    // Attach global listeners synchronously so errors are caught immediately,
    // even before the (async) Sentry SDK has finished loading.
    window.addEventListener('error', this.boundOnError as EventListener);
    window.addEventListener('unhandledrejection', this.boundOnRejection as EventListener);
    this.initialized = true;

    const dsn = dsnOverride ?? import.meta.env.VITE_SENTRY_DSN;
    this.release = import.meta.env.VITE_APP_VERSION;

    if (dsn) {
      try {
        const Sentry = await import('@sentry/browser');
        Sentry.init({
          dsn,
          environment: import.meta.env.MODE,
          release: this.release,
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
          ],
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        });
        // Use addEventListener-style capture so we always have a live fn.
        this.sentryCapture = (error, context) => Sentry.captureException(error, context as never);
        logger.info('ErrorManager: Sentry forwarding enabled');
      } catch (e) {
        // Never let observability setup break the game.
        logger.warn('ErrorManager: Sentry init failed, continuing without it', e);
        this.sentryCapture = null;
      }
    }

    logger.info('ErrorManager initialized');
  }

  private onWindowError(event: ErrorEvent): void {
    this.handleError(event.error ?? new Error(event.message), {
      context: 'Global',
      meta: { source: event.filename, lineno: event.lineno, colno: event.colno },
    });
  }

  /**
   * Handle an error: log it, optionally show UI, and forward to Sentry when enabled.
   */
  handleError(
    error: unknown,
    options: { context?: string; critical?: boolean; meta?: Record<string, unknown> } = {},
  ): void {
    const context = options.context || 'App';
    const isCritical = options.critical || false;

    // Forward to Sentry before any UI side effects.
    if (this.sentryCapture) {
      this.sentryCapture(error, {
        context,
        critical: isCritical,
        release: this.release,
        ...(options.meta ?? {}),
      });
    }

    // Log to internal logger
    logger.error(`[${context}]`, error);

    if (isCritical) {
      this.showCriticalError(error);
    } else {
      // Show toast for non-critical errors
      const msg = error instanceof Error ? error.message : String(error);
      notificationUI.show(msg, 'error', `Fehler (${context})`);
    }
  }

  /**
   * Report a warning (non-blocking issue)
   */
  warning(message: string, context: string = 'App'): void {
    logger.warn(`[${context}]`, message);
    notificationUI.show(message, 'warning', `Warnung (${context})`);
  }

  /**
   * Show Critical Error Modal (Game Over state)
   */
  showCriticalError(error: unknown): void {
    const errorOverlay = document.getElementById('error-overlay');

    // Fallback if overlay doesn't exist
    if (!errorOverlay) {
      alert(`KRITISCHER FEHLER:\n${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    // Enhance error message
    const displayMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
    if (error instanceof Error && error.stack) {
      logger.context('ErrorManager').error('Full Stack:', error.stack);
    }

    const contentContainer = errorOverlay.querySelector('div');
    if (!contentContainer) return;

    // Inject premium error HTML if not present
    if (!contentContainer.classList.contains('critical-error-content')) {
      contentContainer.innerHTML = `
        <div class="critical-error-content" style="background: var(--bg-panel); padding: 2rem; border-radius: 16px; max-width: 500px; text-align: center;">
             <div class="error-icon-large">💥</div>
             <h2 class="error-title">Kritischer Fehler</h2>
             <p class="error-description">
               Ein unerwartetes Problem ist aufgetreten und das Spiel wurde gestoppt.
             </p>
             <div class="error-details-box" id="error-details-content"></div>
             <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1rem;">
               <button class="btn-primary" onclick="location.reload()">Neustarten</button>
               <button class="btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('error-details-content').innerText); alert('Kopiert!')">Kopieren</button>
             </div>
        </div>
      `;
    }

    const detailsBox = document.getElementById('error-details-content');
    if (detailsBox) {
      detailsBox.textContent = `${displayMsg}\n\n${error instanceof Error && error.stack ? error.stack : ''}`;
    }

    errorOverlay.classList.remove('hidden');
  }
}

export const errorManager = new ErrorManager();
