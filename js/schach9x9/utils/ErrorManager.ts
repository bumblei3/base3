/**
 * ErrorManager.ts
 * Centralized error handling and self-contained observability.
 *
 * No third-party error tracker (Sentry was removed — the user prefers a
 * self-contained, no-account setup). Errors are surfaced to the user (toast /
 * critical overlay) AND recorded in an in-memory ring buffer so they can be
 * inspected and exported (copy / download) from the Settings panel for manual
 * bug reports.
 */
import { logger } from '../logger.js';
import { notificationUI } from '../ui/NotificationUI.js';

export type LogLevelName = 'error' | 'warn';

export interface LogEntry {
  timestamp: string;
  level: LogLevelName;
  context: string;
  message: string;
  /** Full stack trace when available (errors only). */
  stack?: string;
}

const DEFAULT_BUFFER_SIZE = 200;

export class ErrorManager {
  private initialized: boolean = false;
  private buffer: LogEntry[] = [];
  private readonly maxSize: number;
  /** Bound handlers so removeEventListener (clean teardown) keeps working. */
  private readonly boundOnError = (event: ErrorEvent) => this.onWindowError(event);
  private readonly boundOnRejection = (event: PromiseRejectionEvent) =>
    this.handleError(event.reason, { context: 'Promise', meta: { type: 'unhandledRejection' } });

  constructor(maxSize: number = DEFAULT_BUFFER_SIZE) {
    this.maxSize = maxSize;
  }

  init(): void {
    if (this.initialized) return;

    // Attach global listeners synchronously so errors are caught immediately,
    // even before any async setup has finished.
    window.addEventListener('error', this.boundOnError as EventListener);
    window.addEventListener('unhandledrejection', this.boundOnRejection as EventListener);
    this.initialized = true;

    logger.info('ErrorManager initialized');
  }

  /** Detach global listeners and clear the buffer. Used by tests for isolation. */
  release(): void {
    if (!this.initialized) return;
    window.removeEventListener('error', this.boundOnError as EventListener);
    window.removeEventListener('unhandledrejection', this.boundOnRejection as EventListener);
    this.initialized = false;
    this.buffer = [];
  }

  private onWindowError(event: ErrorEvent): void {
    this.handleError(event.error ?? new Error(event.message), {
      context: 'Global',
      meta: { source: event.filename, lineno: event.lineno, colno: event.colno },
    });
  }

  /**
   * Handle an error: record it, log it, optionally show UI.
   */
  handleError(
    error: unknown,
    options: { context?: string; critical?: boolean; meta?: Record<string, unknown> } = {},
  ): void {
    const context = options.context || 'App';
    const isCritical = options.critical || false;

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    this.record('error', context, message, stack);

    // Log to internal logger
    logger.error(`[${context}]`, error);

    if (isCritical) {
      this.showCriticalError(error);
    } else {
      // Show toast for non-critical errors
      notificationUI.show(message, 'error', `Fehler (${context})`);
    }
  }

  /**
   * Report a warning (non-blocking issue)
   */
  warning(message: string, context: string = 'App'): void {
    this.record('warn', context, message);
    logger.warn(`[${context}]`, message);
    notificationUI.show(message, 'warning', `Warnung (${context})`);
  }

  /** Push an entry into the ring buffer, dropping the oldest when over capacity. */
  private record(level: LogLevelName, context: string, message: string, stack?: string): void {
    this.buffer.push({
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...(stack ? { stack } : {}),
    });
    if (this.buffer.length > this.maxSize) {
      this.buffer.splice(0, this.buffer.length - this.maxSize);
    }
  }

  /** Snapshot of the recorded log entries (oldest first). */
  getLog(): readonly LogEntry[] {
    return this.buffer;
  }

  /** Clear the in-memory log buffer. */
  clearLog(): void {
    this.buffer = [];
  }

  /** Plain-text representation of the buffer for manual bug reports. */
  exportLog(): string {
    if (this.buffer.length === 0) return '(keine Einträge)';
    return this.buffer
      .map((e) => {
        const head = `${e.timestamp} [${e.level}] [${e.context}] ${e.message}`;
        return e.stack ? `${head}\n${e.stack}` : head;
      })
      .join('\n');
  }

  /**
   * Show Critical Error Modal (Game Over state)
   */
  showCriticalError(error: unknown): void {
    const errorOverlay = document.getElementById('error-overlay');

    // Fallback if overlay doesn't exist
    if (!errorOverlay) {
      window.alert(`KRITISCHER FEHLER:\n${error instanceof Error ? error.message : String(error)}`);
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
