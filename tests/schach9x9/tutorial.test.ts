import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tutorial } from '../../js/schach9x9/tutorial.js';

/**
 * Regression test for the global keydown listener leak in Tutorial.
 *
 * Bug history: each time the tutorial was opened (the app does `new Tutorial()` on
 * every tutor-button click — see DOMHandler.ts), initUI() attached a *new* inline
 * arrow `document.addEventListener('keydown', e => {...})`. The listener was never
 * removed, so repeated opens leaked handlers that kept navigating a hidden tutorial.
 *
 * The fix stores a single bound reference (boundHandleKeydown) and removes it in close().
 * This test proves close() removes exactly the listener that was added, and that the
 * listener count stays balanced across open/close cycles.
 */
describe('Tutorial keydown listener lifecycle', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;
  const added: Array<{ type: string; fn: unknown }> = [];
  const removed: Array<{ type: string; fn: unknown }> = [];

  function seedDom(): void {
    document.body.innerHTML = '';
    for (const id of [
      'tutorial-overlay',
      'tutorial-steps',
      'tutorial-prev',
      'tutorial-next',
      'tutorial-close',
      'tutorial-current-step',
      'tutorial-total-steps',
    ]) {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
  }

  beforeEach(() => {
    seedDom();
    added.length = 0;
    removed.length = 0;
    addSpy = vi
      .spyOn(document, 'addEventListener')
      .mockImplementation((type: string, fn: EventListenerOrEventListenerObject) => {
        added.push({ type, fn });
      });
    removeSpy = vi
      .spyOn(document, 'removeEventListener')
      .mockImplementation((type: string, fn: EventListenerOrEventListenerObject) => {
        removed.push({ type, fn });
      });
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
    document.body.innerHTML = '';
  });

  it('attaches exactly one keydown listener on init', () => {
    new Tutorial();
    const keydownAdds = added.filter(a => a.type === 'keydown');
    expect(keydownAdds).toHaveLength(1);
  });

  it('removes the same keydown listener reference on close', () => {
    const t = new Tutorial();
    const keydownAdds = added.filter(a => a.type === 'keydown');
    expect(keydownAdds).toHaveLength(1);

    t.close();

    const keydownRemovals = removed.filter(r => r.type === 'keydown');
    expect(keydownRemovals).toHaveLength(1);
    expect(keydownRemovals[0].fn).toBe(keydownAdds[0].fn);
  });

  it('does not leak across repeated open/close cycles', () => {
    const t = new Tutorial(); // open
    t.close(); // close -> removes listener
    // simulate the app doing `new Tutorial()` again on next button click
    const t2 = new Tutorial(); // open again
    t2.close(); // close again

    const keydownAdds = added.filter(a => a.type === 'keydown');
    const keydownRemovals = removed.filter(r => r.type === 'keydown');
    expect(keydownAdds).toHaveLength(2);
    expect(keydownRemovals).toHaveLength(2);
    // Every added listener must have a matching removal (same reference).
    keydownAdds.forEach((a, i) => {
      expect(keydownRemovals[i].fn).toBe(a.fn);
    });
  });
});
