import { describe, expect, test, beforeEach, vi } from 'vitest';
import { Game } from '@schach9x9/gameEngine.js';
import * as UI from '@schach9x9/ui.js';
import * as MoveExecutor from '@schach9x9/move/MoveExecutor';

vi.mock('@schach9x9/aiEngine', () => ({
  evaluatePosition: vi.fn(() => Promise.resolve(0)),
}));

vi.mock('@schach9x9/ui', () => ({
  renderBoard: vi.fn(),
  animateMove: vi.fn(() => Promise.resolve()),
  updateCapturedUI: vi.fn(),
  updateMoveHistoryUI: vi.fn(),
  updatePuzzleStatus: vi.fn(),
  updateStatus: vi.fn(),
  updateStatistics: vi.fn(),
  updateClockDisplay: vi.fn(),
  updateClockUI: vi.fn(),
  renderEvalGraph: vi.fn(),
  animateCheckmate: vi.fn(),
  animateCheck: vi.fn(),
  showToast: vi.fn(),
  showShop: vi.fn(),
  showTutorSuggestions: vi.fn(),
  showPromotionUI: vi.fn((g, r, c, _col, _mr, cb) => {
    if (g.board[r][c]) g.board[r][c].type = 'e';
    if (cb) cb();
  }),
}));

vi.mock('@schach9x9/puzzleManager', () => ({
  puzzleManager: {
    checkMove: vi.fn(),
    getPuzzle: vi.fn(() => ({ solution: [] })),
  },
}));

vi.mock('@schach9x9/sounds', () => ({
  soundManager: {
    playMove: vi.fn(),
    playCapture: vi.fn(),
    playError: vi.fn(),
    playSuccess: vi.fn(),
    playGameOver: vi.fn(),
    playCheck: vi.fn(),
  },
}));

vi.mock('@schach9x9/effects', () => ({
  confettiSystem: { spawn: vi.fn() },
  shakeScreen: vi.fn(),
  triggerVibration: vi.fn(),
  particleSystem: { spawn: vi.fn() },
  floatingTextManager: { show: vi.fn() },
}));

if (typeof window !== 'undefined') {
  (window as any).battleChess3D = undefined;
}

describe('MoveExecutor Promotion execution', () => {
  let game: Game;
  let moveController: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mockElement = {
      textContent: '',
      classList: { remove: vi.fn(), add: vi.fn(), contains: vi.fn() },
      appendChild: vi.fn(),
      scrollTop: 0,
      scrollHeight: 100,
      style: {},
    };
    document.getElementById = vi.fn(() => mockElement as any);

    game = new Game(15, 'classic');
    game.board = Array(9).fill(null).map(() => Array(9).fill(null)) as any;
    game.board[0][4] = { type: 'k', color: 'black', hasMoved: false };
    game.board[8][4] = { type: 'k', color: 'white', hasMoved: false };

    moveController = {
      redoStack: [],
      updateUndoRedoButtons: vi.fn(),
      undoMove: vi.fn(),
    };
  });

  test('White pawn promotes to Queen when promotionType is provided', async () => {
    game.board[1][0] = { type: 'p', color: 'white', hasMoved: true };
    await MoveExecutor.executeMove(game, moveController, { r: 1, c: 0 }, { r: 0, c: 0 }, false, 'q');

    expect(game.board[0][0]!.type).toBe('q');
    expect(game.stats.promotions).toBe(1);
  });

  test('Black pawn promotes to Angel (e) when promotionType is provided', async () => {
    game.board[7][8] = { type: 'p', color: 'black', hasMoved: true };
    // Black promotes on boardSize-1 = 8
    game.board[8][4] = { type: 'k', color: 'white', hasMoved: false }; // keep white king
    game.board[0][4] = { type: 'k', color: 'black', hasMoved: false };
    await MoveExecutor.executeMove(game, moveController, { r: 7, c: 8 }, { r: 8, c: 8 }, false, 'e');

    expect(game.board[8][8]!.type).toBe('e');
    expect(game.stats.promotions).toBe(1);
  });

  test('Human promotion without promotionType triggers promotion UI', async () => {
    game.isAI = false;
    game.board[1][0] = { type: 'p', color: 'white', hasMoved: true };
    await MoveExecutor.executeMove(game, moveController, { r: 1, c: 0 }, { r: 0, c: 0 });

    expect(UI.showPromotionUI).toHaveBeenCalled();
    expect(game.board[0][0]!.type).toBe('e'); // mock promotes to Angel
    expect(game.stats.promotions).toBe(1);
  });

  test('AI promotion without promotionType auto-promotes to Angel', async () => {
    game.isAI = true;
    game.board[7][8] = { type: 'p', color: 'black', hasMoved: true };
    game.board[8][4] = { type: 'k', color: 'white', hasMoved: false };
    game.board[0][4] = { type: 'k', color: 'black', hasMoved: false };
    // Black is the AI side (not human) -> should auto-promote to Angel
    await MoveExecutor.executeMove(game, moveController, { r: 7, c: 8 }, { r: 8, c: 8 }, false, undefined);

    expect(game.board[8][8]!.type).toBe('e');
    expect(game.stats.promotions).toBe(1);
  });

  test('Promotion records specialMove metadata', async () => {
    game.board[1][0] = { type: 'p', color: 'white', hasMoved: true };
    await MoveExecutor.executeMove(game, moveController, { r: 1, c: 0 }, { r: 0, c: 0 }, false, 'q');

    const lastMove = game.moveHistory[game.moveHistory.length - 1];
    expect(lastMove.specialMove).toMatchObject({ type: 'promotion', promotedTo: 'q' });
    expect(lastMove.promotion).toBe('q');
  });
});
