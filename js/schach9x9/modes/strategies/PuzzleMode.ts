import type { GameModeStrategy } from '../GameModeStrategy.js';
import type { GameExtended, GameController } from '../../gameController.js';
import * as UI from '../../ui.js';
import { logger } from '../../logger.js';

/**
 * Puzzle mode strategy.
 *
 * Puzzles are solved by clicking the board. Each click is forwarded to
 * game.handlePlayClick, which validates the move against the current puzzle
 * solution. Previously puzzle mode had currentModeStrategy = null, so board
 * clicks did nothing (only the handlePlayClick API worked). This strategy
 * restores normal click-to-move behaviour for puzzles.
 */
export class PuzzleModeStrategy implements GameModeStrategy {
  init(game: GameExtended, controller: GameController): void {
    game.mode = 'puzzle';
    // Show the puzzle selection menu (keeps legacy puzzle entry flow).
    controller.puzzleMenu.show();
    UI.renderBoard(game);
    logger.info('PuzzleModeStrategy initialized');
  }

  async handleInteraction(
    game: GameExtended,
    _controller: GameController,
    r: number,
    c: number
  ): Promise<boolean> {
    // Puzzles accept clicks during any interactive phase. Forward to the
    // shared play-click handler, which validates the move against the puzzle.
    if (game.handlePlayClick) {
      await game.handlePlayClick(r, c);
      return true;
    }
    return false;
  }

  onPhaseEnd(_game: GameExtended, _controller: GameController): void {
    // No special handling needed for puzzle phase ends.
  }
}
