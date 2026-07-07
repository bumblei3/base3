import { describe, expect, test, beforeEach, vi, type Mock } from 'vitest';
import { Game } from '@schach9x9/gameEngine.js';
import * as MoveExecutor from '@schach9x9/move/MoveExecutor';

// Mocks (mirrors moveExecutor.unit.test.ts setup)
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

describe('MoveExecutor En Passant', () => {
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
    // Basic kings required for check/end logic
    game.board[0][4] = { type: 'k', color: 'black', hasMoved: false };
    game.board[8][4] = { type: 'k', color: 'white', hasMoved: false };

    moveController = {
      redoStack: [],
      updateUndoRedoButtons: vi.fn(),
      undoMove: vi.fn(),
    };
  });

  test('En Passant: captures pawn after a genuine double pawn push', async () => {
    // White just double-pushed e-pawn: 6,4 -> 4,4
    game.board[4][4] = { type: 'p', color: 'white', hasMoved: true };
    game.lastMove = {
      from: { r: 6, c: 4 },
      to: { r: 4, c: 4 },
      piece: { type: 'p', color: 'white' },
      isDoublePawnPush: true,
    };
    // Black pawn adjacent, can capture en passant
    game.board[4][3] = { type: 'p', color: 'black', hasMoved: true };
    game.turn = 'black';

    await MoveExecutor.executeMove(game, moveController, { r: 4, c: 3 }, { r: 5, c: 4 });

    // Black pawn lands on 5,4
    expect(game.board[5][4]!.color).toBe('black');
    // Captured white pawn (at 4,4) is removed
    expect(game.board[4][4]).toBeNull();
    // Capture registered
    expect(game.capturedPieces.black).toHaveLength(1);
  });

  test('En Passant: does NOT capture when last move was not a double push', async () => {
    // White pawn sits on 4,4 but the last move was a single push (no double-push flag)
    game.board[4][4] = { type: 'p', color: 'white', hasMoved: true };
    game.lastMove = {
      from: { r: 5, c: 4 },
      to: { r: 4, c: 4 },
      piece: { type: 'p', color: 'white' },
      isDoublePawnPush: false,
    };
    // Black pawn adjacent, attempts diagonal move to empty square 5,4
    game.board[4][5] = { type: 'p', color: 'black', hasMoved: true };
    game.turn = 'black';

    await MoveExecutor.executeMove(game, moveController, { r: 4, c: 5 }, { r: 5, c: 4 });

    // Black pawn moves to 5,4 (normal diagonal move onto empty square)
    expect(game.board[5][4]!.color).toBe('black');
    // White pawn at 4,4 must remain on the board — no illegal en passant capture
    expect(game.board[4][4]!.color).toBe('white');
    // No capture should have been registered
    expect(game.capturedPieces.black).toHaveLength(0);
  });

  test('En Passant: does NOT capture when there is no last move at all', async () => {
    game.board[4][4] = { type: 'p', color: 'white', hasMoved: true };
    game.lastMove = null as any;
    game.board[4][5] = { type: 'p', color: 'black', hasMoved: true };
    game.turn = 'black';

    await MoveExecutor.executeMove(game, moveController, { r: 4, c: 5 }, { r: 5, c: 4 });

    expect(game.board[5][4]!.color).toBe('black');
    expect(game.board[4][4]!.color).toBe('white');
    expect(game.capturedPieces.black).toHaveLength(0);
  });
});
