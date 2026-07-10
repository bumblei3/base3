/**
 * PWAInstaller — captures the browser's `beforeinstallprompt` event so the
 * app can show a custom install prompt/button instead of the browser default.
 *
 * Usage:
 *   const installer = new PWAInstaller();
 *   installer.onInstallable(() => showInstallButton());
 *   // later, on button click:
 *   const accepted = await installer.showPrompt();
 */

type InstallChoice = 'accepted' | 'dismissed';

interface BeforeInstallPromptEventLike extends Event {
    prompt: () => Promise<{ outcome: InstallChoice }>;
    userChoice?: Promise<{ outcome: InstallChoice }>;
}

type InstallableCallback = () => void;
type InstalledCallback = () => void;

export class PWAInstaller {
    private deferredPrompt: BeforeInstallPromptEventLike | null = null;
    private installableCallbacks = new Set<InstallableCallback>();
    private installedCallbacks = new Set<InstalledCallback>();
    private boundOnBeforeInstallPrompt: (e: Event) => void;
    private boundOnAppInstalled: (e: Event) => void;

    constructor() {
        this.boundOnBeforeInstallPrompt = this.handleBeforeInstallPrompt.bind(this);
        this.boundOnAppInstalled = this.handleAppInstalled.bind(this);
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeinstallprompt', this.boundOnBeforeInstallPrompt);
            window.addEventListener('appinstalled', this.boundOnAppInstalled);
        }
    }

    private handleBeforeInstallPrompt(e: Event): void {
        // Prevent the default browser install prompt so we can show our own.
        e.preventDefault();
        this.deferredPrompt = e as BeforeInstallPromptEventLike;
        this.installableCallbacks.forEach((cb) => cb());
    }

    private handleAppInstalled(_e: Event): void {
        this.installedCallbacks.forEach((cb) => cb());
        // Reset so a fresh prompt is required after reinstall.
        this.deferredPrompt = null;
    }

    /** Whether an install prompt is currently available. */
    isInstallable(): boolean {
        return this.deferredPrompt !== null;
    }

    /**
     * Shows the native install prompt. Resolves to true if the user accepted.
     * Consumes the captured event (subsequent calls require a new one).
     */
    async showPrompt(): Promise<boolean> {
        if (!this.deferredPrompt) return false;
        const prompt = this.deferredPrompt;
        this.deferredPrompt = null;
        try {
            const result = await prompt.prompt();
            return result.outcome === 'accepted';
        } catch {
            return false;
        }
    }

    /** Register a callback fired when an install prompt becomes available. */
    onInstallable(cb: InstallableCallback): void {
        this.installableCallbacks.add(cb);
    }

    /** Register a callback fired after the app is successfully installed. */
    onInstalled(cb: InstalledCallback): void {
        this.installedCallbacks.add(cb);
    }

    /** Unregister an installable callback. */
    offInstallable(cb: InstallableCallback): void {
        this.installableCallbacks.delete(cb);
    }

    /** Unregister an installed callback. */
    offInstalled(cb: InstalledCallback): void {
        this.installedCallbacks.delete(cb);
    }

    /** Remove all listeners (call on teardown). */
    destroy(): void {
        if (typeof window !== 'undefined') {
            window.removeEventListener('beforeinstallprompt', this.boundOnBeforeInstallPrompt);
            window.removeEventListener('appinstalled', this.boundOnAppInstalled);
        }
        this.installableCallbacks.clear();
        this.installedCallbacks.clear();
        this.deferredPrompt = null;
    }
}
