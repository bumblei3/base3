import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SceneManager3D } from '../../../../js/schach9x9/ui/3d/SceneManager3D.js';

/**
 * Regression test for the window resize listener leak in SceneManager3D.
 *
 * Bug history: init() did `window.addEventListener('resize', this.onWindowResize.bind(this))`
 * while dispose() did `window.removeEventListener('resize', this.onWindowResize.bind(this))`.
 * Because `.bind()` produces a NEW function on every call, removeEventListener never matched
 * the registered listener, so repeated 3D toggles leaked resize handlers that kept firing on a
 * disposed scene/renderer (potential null-ref crashes).
 *
 * The fix stores a single bound reference (`boundOnWindowResize`) and uses it for both add and
 * remove. This test proves add and remove operate on the SAME function reference.
 */
describe('SceneManager3D resize listener lifecycle', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;
  const added: Array<{ type: string; fn: unknown }> = [];
  const removed: Array<{ type: string; fn: unknown }> = [];

  beforeEach(() => {
    added.length = 0;
    removed.length = 0;
    addSpy = vi
      .spyOn(window, 'addEventListener')
      .mockImplementation((type: string, fn: EventListenerOrEventListenerObject) => {
        added.push({ type, fn });
      });
    removeSpy = vi
      .spyOn(window, 'removeEventListener')
      .mockImplementation((type: string, fn: EventListenerOrEventListenerObject) => {
        removed.push({ type, fn });
      });
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('removes the exact same resize listener reference that was added', () => {
    const sm = new SceneManager3D(document.createElement('div'));

    // Mirror what init() does for the resize handler (without the WebGL setup).
    sm.boundOnWindowResize = sm.onWindowResize.bind(sm);
    window.addEventListener('resize', sm.boundOnWindowResize);

    sm.dispose();

    expect(added).toHaveLength(1);
    expect(added[0].type).toBe('resize');
    expect(removed).toHaveLength(1);
    expect(removed[0].type).toBe('resize');
    // Critical: the removed reference MUST equal the added reference, otherwise the listener leaks.
    expect(removed[0].fn).toBe(added[0].fn);
  });

  it('does not leak when dispose is called multiple times', () => {
    const sm = new SceneManager3D(document.createElement('div'));
    sm.boundOnWindowResize = sm.onWindowResize.bind(sm);
    window.addEventListener('resize', sm.boundOnWindowResize);

    sm.dispose();
    sm.dispose();

    // Only one add, but remove is idempotent — still must target the same reference.
    expect(added).toHaveLength(1);
    expect(removed).toHaveLength(2);
    expect(removed[0].fn).toBe(added[0].fn);
    expect(removed[1].fn).toBe(added[0].fn);
  });
});
