import { describe, expect, test, beforeEach, vi } from 'vitest';
import { errorManager } from '@schach9x9/utils/ErrorManager';
import { notificationUI } from '@schach9x9/ui/NotificationUI';
import { logger } from '@schach9x9/logger.js';

// Use spyOn for notificationUI
vi.spyOn(notificationUI, 'show').mockImplementation(function () {});

// Spy on logger instead of mocking entire module to avoid ESM issues
vi.spyOn(logger, 'error').mockImplementation(function () {});
vi.spyOn(logger, 'warn').mockImplementation(function () {});
vi.spyOn(logger, 'info').mockImplementation(function () {});

describe('ErrorManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="error-overlay">
        <div class="content"></div>
      </div>
    `;
    // Reset initialized state if possible or assume singleton per test
  });

  test('should handle critical errors by showing overlay', () => {
    const error = new Error('Critical Failure');
    errorManager.handleError(error, { critical: true });

    expect(logger.error).toHaveBeenCalled();
    const overlay = document.getElementById('error-overlay');
    expect(overlay!.classList.contains('hidden')).toBe(false);
    const details = document.getElementById('error-details-content');
    expect(details!.textContent).toContain('Critical Failure');
  });

  test('should handle non-critical errors by showing toast', () => {
    const error = new Error('Minor Glitch');
    errorManager.handleError(error, { critical: false });

    expect(logger.error).toHaveBeenCalled();
    expect(notificationUI.show).toHaveBeenCalledWith(
      'Minor Glitch',
      'error',
      expect.stringContaining('Fehler')
    );
  });

  test('should handle warnings by showing toast', () => {
    errorManager.warning('Disk Full');

    expect(logger.warn).toHaveBeenCalled();
    expect(notificationUI.show).toHaveBeenCalledWith(
      'Disk Full',
      'warning',
      expect.stringContaining('Warnung')
    );
  });

  test('should default to "App" context if not provided', () => {
    const error = new Error('Generic Error');
    errorManager.handleError(error);

    expect(logger.error).toHaveBeenCalledWith('[App]', error);
  });

  test('should use provided context', () => {
    const error = new Error('Network Error');
    errorManager.handleError(error, { context: 'Network' });

    expect(logger.error).toHaveBeenCalledWith('[Network]', error);
  });

  test('should use alert fallback if overlay is missing', () => {
    // Remove overlay
    document.body.innerHTML = '';
    
    // Ensure window.alert exists and is a mock
    window.alert = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert');

    const error = new Error('Critical No UI');
    errorManager.handleError(error, { critical: true });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('KRITISCHER FEHLER'));
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Critical No UI'));

    alertSpy.mockRestore();
  });

  test('should initialize global handlers', () => {
    // ErrorManager attaches listeners via addEventListener (not window.onerror).
    const addSpy = vi.spyOn(window, 'addEventListener');
    errorManager.init();
    expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith('ErrorManager initialized');
    addSpy.mockRestore();
  });
});


