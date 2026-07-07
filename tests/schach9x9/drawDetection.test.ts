import { describe, expect, test } from 'vitest';
import { Game } from '@schach9x9/gameEngine.js';
import {
  checkDraw,
  isInsufficientMaterial,
  getBoardHash,
} from '@schach9x9/move/MoveValidator.js';

function setupGame(): Game {
  const game = new Game(15, 'classic');
  // Clear the starting board so we control material exactly.
  for (let r = 0; r < game.boardSize; r++) {
    for (let c = 0; c < game.boardSize; c++) {
      game.board[r][c] = null;
    }
  }
  return game;
}

describe('Draw detection', () => {
  test('getBoardHash reflects board changes', () => {
    const game = setupGame();
    game.board[0][0] = { type: 'k', color: 'white', hasMoved: false } as any;
    game.board[8][8] = { type: 'k', color: 'black', hasMoved: false } as any;
    const h1 = getBoardHash(game);
    game.board[0][1] = { type: 'q', color: 'white', hasMoved: false } as any;
    const h2 = getBoardHash(game);
    expect(h1).not.toBe(h2);
  });

  test('isInsufficientMaterial: K vs K is a draw', () => {
    const game = setupGame();
    game.board[0][0] = { type: 'k', color: 'white', hasMoved: false } as any;
    game.board[8][8] = { type: 'k', color: 'black', hasMoved: false } as any;
    expect(isInsufficientMaterial(game)).toBe(true);
  });

  test('isInsufficientMaterial: K+Q vs K is NOT a draw', () => {
    const game = setupGame();
    game.board[0][0] = { type: 'k', color: 'white', hasMoved: false } as any;
    game.board[0][1] = { type: 'q', color: 'white', hasMoved: false } as any;
    game.board[8][8] = { type: 'k', color: 'black', hasMoved: false } as any;
    expect(isInsufficientMaterial(game)).toBe(false);
  });

  test('checkDraw: threefold repetition triggers draw', () => {
    const game = setupGame();
    game.board[0][0] = { type: 'k', color: 'white', hasMoved: false } as any;
    game.board[8][8] = { type: 'k', color: 'black', hasMoved: false } as any;
    const hash = getBoardHash(game);
    // Seed the position history with two prior occurrences, then land here again.
    game.positionHistory = [hash, hash];
    // finishMove pushes the current hash; simulate that by adding it here.
    game.positionHistory.push(hash);

    const result = checkDraw(game);
    expect(result).toBe(true);
    expect(game.phase).toBe('GAME_OVER' as unknown as typeof game.phase);
  });

  test('checkDraw: 50-move rule (halfMoveClock >= 100) triggers draw', () => {
    const game = setupGame();
    game.board[0][0] = { type: 'k', color: 'white', hasMoved: false } as any;
    game.board[8][8] = { type: 'k', color: 'black', hasMoved: false } as any;
    game.halfMoveClock = 100;
    const result = checkDraw(game);
    expect(result).toBe(true);
  });

  test('checkDraw: normal position is not a draw', () => {
    const game = setupGame();
    game.board[0][0] = { type: 'k', color: 'white', hasMoved: false } as any;
    game.board[0][1] = { type: 'q', color: 'white', hasMoved: false } as any;
    game.board[8][8] = { type: 'k', color: 'black', hasMoved: false } as any;
    expect(checkDraw(game)).toBe(false);
  });
});
