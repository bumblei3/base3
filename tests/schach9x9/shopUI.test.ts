// Mock config
import { describe, expect, test, beforeEach, vi } from 'vitest';

vi.mock('@schach9x9/config', () => ({
  PIECE_VALUES: { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0, a: 800, c: 800, e: 1000 },
  SHOP_PIECES: ['p', 'n', 'b', 'r', 'q', 'a', 'c', 'e'] as string[],
}));

vi.mock('@schach9x9/chess-pieces', () => ({
  PIECE_SVGS: { white: {} as Record<string, string>, black: {} as Record<string, string> },
}));

// Mock BoardRenderer
vi.mock('@schach9x9/ui/BoardRenderer', () => ({
  getPieceText: (piece: any) => `${piece.type === 'p' ? '♙' : piece.type} (${piece.color})`,
}));

import * as ShopUI from '@schach9x9/ui/ShopUI';

describe('ShopUI', () => {
  let game: any;
  let updateTutorRecommendationsSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="shop-panel" class="hidden">
        <div class="shop-header"><h2>Truppen anheuern</h2></div>
      </div>
      <div id="shop-buttons"></div>
      <div id="tutor-recommendations-section"></div>
      <div id="points-display"></div>
      <div id="tutor-points-display"></div>
      <div id="selected-piece-display"></div>
      <button id="finish-setup-btn"></button>
      <div class="shop-item" data-cost="100"></div>
      <div class="shop-item" data-cost="500"></div>
    `;

    game = {
      points: 200,
      tutorPoints: 50,
      turn: 'white',
      selectedShopPiece: null,
      phase: 'SETUP_WHITE_PIECES', // Default phase
    };

    updateTutorRecommendationsSpy = vi.fn();
    (window as any).updateTutorRecommendations = updateTutorRecommendationsSpy;

    vi.clearAllMocks();
  });

  test('showShop toggles panel and body class', () => {
    ShopUI.showShop(game, true);
    expect(document.getElementById('shop-panel')?.classList.contains('hidden')).toBe(false);
    expect(document.body.classList.contains('setup-mode')).toBe(true);

    ShopUI.showShop(game, false);
    expect(document.getElementById('shop-panel')?.classList.contains('hidden')).toBe(true);
    expect(document.body.classList.contains('setup-mode')).toBe(false);
  });

  test('updateShopUI updates displays and item states', () => {
    ShopUI.updateShopUI(game);

    expect(document.getElementById('points-display')?.textContent).toBe('200');
    expect(document.getElementById('tutor-points-display')?.textContent).toBe('50');

    const items = document.querySelectorAll('.shop-item');
    expect(items[0].classList.contains('disabled')).toBe(false); // cost 100 < 200
    expect(items[1].classList.contains('disabled')).toBe(true); // cost 500 > 200

    expect(updateTutorRecommendationsSpy).toHaveBeenCalledWith(game);
  });

  test('updateShopUI reflects selected piece', () => {
    game.selectedShopPiece = 'p';
    ShopUI.updateShopUI(game);
    expect(document.getElementById('selected-piece-display')?.textContent).toContain('♙');

    game.selectedShopPiece = null;
    ShopUI.updateShopUI(game);
    expect(document.getElementById('selected-piece-display')!.textContent).toBe(
      'Wähle eine Figur zum Kaufen'
    );
  });

  test('updateShopUI handles UPGRADE phase', () => {
    game.phase = 'SETUP_WHITE_UPGRADES';
    ShopUI.updateShopUI(game);

    const header = document.querySelector('#shop-panel .shop-header h2');
    const shopBtn = document.getElementById('shop-buttons');
    const tutor = document.getElementById('tutor-recommendations-section');
    const status = document.getElementById('selected-piece-display');

    expect(header?.textContent).toBe('Truppen verbessern');
    expect(shopBtn?.classList.contains('hidden')).toBe(true);
    expect(tutor?.classList.contains('hidden')).toBe(true);
    expect(status?.textContent).toContain('Klicke auf Figuren');

    // Revert to normal
    game.phase = 'SETUP_WHITE_PIECES';
    ShopUI.updateShopUI(game);
    expect(header?.textContent).toBe('Truppen anheuern');
    expect(shopBtn?.classList.contains('hidden')).toBe(false);
  });
});
