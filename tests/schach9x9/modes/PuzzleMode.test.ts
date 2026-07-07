import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PuzzleModeStrategy } from '@schach9x9/modes/strategies/PuzzleMode';
import * as UI from '@schach9x9/ui';

vi.mock('@schach9x9/ui', () => ({
  initBoardUI: vi.fn(),
  updateStatus: vi.fn(),
  updateShopUI: vi.fn(),
  renderBoard: vi.fn(),
  updateStatistics: vi.fn(),
  updateClockUI: vi.fn(),
  updateClockDisplay: vi.fn(),
}));

vi.mock('@schach9x9/logger', () => ({
  logger: { info: vi.fn() },
}));

describe('PuzzleModeStrategy', () => {
  let strategy: PuzzleModeStrategy;
  let game: any;
  let controller: any;

  beforeEach(() => {
    strategy = new PuzzleModeStrategy();

    game = {
      phase: null,
      mode: null,
      handlePlayClick: vi.fn(),
    };

    controller = {
      puzzleMenu: { show: vi.fn(), hide: vi.fn() },
    };

    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('init shows the puzzle menu and sets mode', () => {
    strategy.init(game, controller);
    expect(game.mode).toBe('puzzle');
    expect(controller.puzzleMenu.show).toHaveBeenCalled();
    expect(UI.renderBoard).toHaveBeenCalledWith(game);
  });

  it('handleInteraction forwards clicks to handlePlayClick (fixes null-strategy bug)', async () => {
    const result = await strategy.handleInteraction(game, controller, 1, 7);
    expect(result).toBe(true);
    expect(game.handlePlayClick).toHaveBeenCalledWith(1, 7);
  });

  it('handleInteraction returns false when handlePlayClick is absent', async () => {
    delete game.handlePlayClick;
    const result = await strategy.handleInteraction(game, controller, 1, 7);
    expect(result).toBe(false);
  });
});
