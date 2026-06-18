import { describe, test, expect, beforeEach, vi } from 'vitest';
import { setupJSDOM } from './test-utils.js';
import { PHASES } from '@schach9x9/config.js';

// Mock dependencies (we want to test UI logic so we use the real UI but mock sounds/controllers if needed)
vi.mock('@schach9x9/sounds', () => ({
  soundManager: {
    init: vi.fn(),
    playMove: vi.fn(),
    playGameOver: vi.fn(),
    playGameStart: vi.fn(),
  },
}));

// Import UI and game
const UI = await import('@schach9x9/ui.js');
const { Game } = await import('@schach9x9/gameEngine.js');

describe('Visual DOM Snapshot Tests', () => {
  let game: any;

  beforeEach(() => {
    setupJSDOM();
    game = new Game(15, 'setup');
    vi.clearAllMocks();
  });

  test('Initial setup phase snapshot', () => {
    UI.initBoardUI(game);
    UI.updateStatus(game);
    UI.updateShopUI(game);

    const container = document.body;
    // Clean up some dynamic things like timestamps if necessary, but here it's fine
    expect(container.innerHTML).toMatchSnapshot();
  });

  test('Play phase board snapshot', () => {
    game.phase = PHASES.PLAY;
    game.board[4][4] = { type: 'q', color: 'white' };
    game.board[0][4] = { type: 'k', color: 'black' };

    UI.initBoardUI(game);
    UI.renderBoard(game);
    UI.updateStatus(game);

    expect(document.getElementById('board')!.innerHTML).toMatchSnapshot();
  });

  test('Game over overlay snapshot', () => {
    // The HTML doesn't include winner-text by default, add it
    document.body.innerHTML += `
      <div id="game-over-overlay" class="hidden">
        <div id="winner-text"></div>
      </div>
    `;
    game.phase = PHASES.GAME_OVER;
    UI.initBoardUI(game);
    UI.updateStatus(game);

    const overlay = document.getElementById('game-over-overlay')!;
    const winnerText = document.getElementById('winner-text')!;
    winnerText.textContent = 'Weiß gewinnt!';
    overlay.classList.remove('hidden');

    expect(overlay.innerHTML).toMatchSnapshot();
  });

  test('Shop panel snapshot', () => {
    UI.initBoardUI(game);
    UI.updateShopUI(game);
    UI.showShop(game, true);

    const shop = document.getElementById('shop-panel')!;
    expect(shop.innerHTML).toMatchSnapshot();
  });
});
