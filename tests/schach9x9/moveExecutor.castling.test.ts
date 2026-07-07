import { describe, expect, test, beforeEach, vi } from 'vitest';
import { Game } from '@schach9x9/gameEngine.js';
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

describe('MoveExecutor Castling execution guards', () => {
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

  test('Castling kingside: moves king and rook correctly', async () => {
    game.board[8][8] = { type: 'r', color: 'white', hasMoved: false };
    await MoveExecutor.executeMove(game, moveController, { r: 8, c: 4 }, { r: 8, c: 6 });

    expect(game.board[8][6]!.type).toBe('k');
    expect(game.board[8][5]!.type).toBe('r');
    expect(game.board[8][8]).toBeNull();
  });

  test('Castling queenside: moves king and rook correctly', async () => {
    game.board[8][0] = { type: 'r', color: 'white', hasMoved: false };
    await MoveExecutor.executeMove(game, moveController, { r: 8, c: 4 }, { r: 8, c: 2 });

    expect(game.board[8][2]!.type).toBe('k');
    expect(game.board[8][3]!.type).toBe('r');
    expect(game.board[8][0]).toBeNull();
  });

  test('Castling does NOT move rook if the rook has already moved', async () => {
    // Rook already moved -> castling is illegal, rook must stay put
    game.board[8][0] = { type: 'r', color: 'white', hasMoved: true };
    await MoveExecutor.executeMove(game, moveController, { r: 8, c: 4 }, { r: 8, c: 2 });

    // Rook must remain on its original square (no castling performed)
    expect(game.board[8][0]!.type).toBe('r');
    expect(game.board[8][0]!.hasMoved).toBe(true);
    // Rook must NOT have been relocated to c:3
    expect(game.board[8][3]).toBeNull();
  });

  test('Castling does NOT move rook if the king has already moved', async () => {
    game.board[8][0] = { type: 'r', color: 'white', hasMoved: false };
    game.board[8][4] = { type: 'k', color: 'white', hasMoved: true }; // king already moved
    await MoveExecutor.executeMove(game, moveController, { r: 8, c: 4 }, { r: 8, c: 2 });

    expect(game.board[8][0]!.type).toBe('r');
    expect(game.board[8][0]!.hasMoved).toBe(false);
    expect(game.board[8][3]).toBeNull();
  });
});
