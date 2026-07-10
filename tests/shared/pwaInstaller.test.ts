import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PWAInstaller } from '../../js/shared/utils/PWAInstaller.js';

/**
 * Tests for js/shared/utils/PWAInstaller.ts
 * Covers the beforeinstallprompt capture, installable state, prompt flow
 * and the appinstalled callback. happy-dom provides window/document.
 */

function createBeforeInstallPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
    const event: any = new Event('beforeinstallprompt');
    event.preventDefault = vi.fn();
    event.prompt = vi.fn().mockResolvedValue({ outcome });
    event.userChoice = Promise.resolve({ outcome });
    return event;
}

describe('PWAInstaller', () => {
    let installer: PWAInstaller;

    beforeEach(() => {
        // start fresh: no pending event
        installer = new PWAInstaller();
    });

    afterEach(() => {
        installer.destroy();
        // clear any global listeners
        vi.restoreAllMocks();
    });

    it('is not installable before beforeinstallprompt fires', () => {
        expect(installer.isInstallable()).toBe(false);
    });

    it('captures beforeinstallprompt and becomes installable', () => {
        const event = createBeforeInstallPromptEvent();
        window.dispatchEvent(event);
        expect(installer.isInstallable()).toBe(true);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('showPrompt resolves true when user accepts', async () => {
        const event = createBeforeInstallPromptEvent('accepted');
        window.dispatchEvent(event);
        const accepted = await installer.showPrompt();
        expect(accepted).toBe(true);
        expect(event.prompt).toHaveBeenCalled();
        // event consumed -> no longer installable
        expect(installer.isInstallable()).toBe(false);
    });

    it('showPrompt resolves false when user dismisses', async () => {
        const event = createBeforeInstallPromptEvent('dismissed');
        window.dispatchEvent(event);
        const accepted = await installer.showPrompt();
        expect(accepted).toBe(false);
        expect(installer.isInstallable()).toBe(false);
    });

    it('showPrompt resolves false when not installable', async () => {
        const accepted = await installer.showPrompt();
        expect(accepted).toBe(false);
    });

    it('onInstallable callback fires when prompt becomes available', () => {
        const cb = vi.fn();
        installer.onInstallable(cb);
        window.dispatchEvent(createBeforeInstallPromptEvent());
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('fires onInstallable only once per event', () => {
        const cb = vi.fn();
        installer.onInstallable(cb);
        window.dispatchEvent(createBeforeInstallPromptEvent());
        window.dispatchEvent(createBeforeInstallPromptEvent());
        // second event replaces the first; callback still fires for each new event
        expect(cb).toHaveBeenCalledTimes(2);
    });

    it('onInstalled callback fires on appinstalled', () => {
        const cb = vi.fn();
        installer.onInstalled(cb);
        window.dispatchEvent(new Event('appinstalled'));
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it('does not fire onInstallable after destroy', () => {
        const cb = vi.fn();
        installer.onInstallable(cb);
        installer.destroy();
        window.dispatchEvent(createBeforeInstallPromptEvent());
        expect(cb).not.toHaveBeenCalled();
    });

    it('removes beforeinstallprompt listener on destroy', () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const inst = new PWAInstaller();
        expect(addSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
        inst.destroy();
        expect(removeSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    });
});
