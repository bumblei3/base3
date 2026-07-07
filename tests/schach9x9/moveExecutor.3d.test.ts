import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Game } from '@schach9x9/gameEngine';
import { MoveController } from '@schach9x9/moveController';
import { executeMove } from '@schach9x9/move/MoveExecutor';

// Mock the heavy UI + side-effect deps so we only exercise MoveExecutor's
// 3D-board error handling
vi.mock('@schach9x9/ui', () => ({
  renderBoard: vi.fn(),
  animateMove: vi.fn().mockResolvedValue(undefined),
  updateCapturedUI: vi.fn(),
  updateStatus: vi.fn(),
  updateStatistics: vi.fn(),
  renderEvalGraph: vi.fn(),
  updateClockDisplay: vi.fn(),
  updateClockUI: vi.fn(),
  updateMoveHistoryUI: vi.fn(),
  flashSquare: vi.fn(),
  showPromotionUI: vi.fn(),
}));
vi.mock('@schach9x9/sounds', () => ({
  soundManager: { playMove: vi.fn(), playCapture: vi.fn(), playGameOver: vi.fn() },
}));
vi.mock('@schach9x9/aiEngine', () => ({ evaluatePosition: vi.fn().mockReturnValue(0) }));
vi.mock('@schach9x9/campaign/CampaignManager', () => ({
  campaignManager: { isTalentUnlocked: vi.fn(), addGold: vi.fn(), getUnitXp: vi.fn(), addUnitXp: vi.fn() },
}));
vi.mock('@schach9x9/ui/NotificationUI', () => ({ notificationUI: { show: vi.fn() } }));
vi.mock('@schach9x9/effects', () => ({ confettiSystem: { trigger: vi.fn() } }));
vi.mock('@schach9x9/puzzleManager', () => ({ puzzleManager: { checkPuzzleMove: vi.fn() } }));

function freshGame(): any {
  const g = new Game();
  const rows = g.board.length;
  const cols = g.board[0].length;
  g.board = Array.from({ length: rows }, () => Array(cols).fill(null));
  g.board[1][4] = { type: 'pawn', color: 'white', hasMoved: false };
  g.board[2][3] = { type: 'pawn', color: 'black', hasMoved: false }; // capturable
  g.board[0][4] = { type: 'king', color: 'white', hasMoved: true };
  g.board[rows - 1][4] = { type: 'king', color: 'black', hasMoved: true };
  g.turn = 'white';
  // Prime moveHistory so the 3D-update branch (game.moveHistory.length > 0) is taken,
  // and include a `captured` entry so the battle-sequence branch is exercised.
  g.moveHistory = [
    { piece: g.board[1][4], from: { r: 0, c: 0 }, to: { r: 1, c: 4 }, captured: null },
  ];
  return g;
}

// Named handler so we can remove it cleanly
const unhandled: Array<unknown> = [];
function onUnhandled(r: unknown) {
  unhandled.push(r);
}

describe('MoveExecutor 3D-board error handling', () => {
  beforeEach(() => {
    unhandled.length = 0;
    process.on('unhandledRejection', onUnhandled);
  });
  afterEach(() => {
    process.off('unhandledRejection', onUnhandled);
    (window as any).battleChess3D = undefined;
  });

  it('does not leave unhandled rejection when playBattleSequence rejects', async () => {
    const removePiece = vi.fn();
    const animateMove = vi.fn();
    const playBattleSequence = vi.fn().mockImplementation(() => Promise.reject(new Error('3D boom')));
    (window as any).battleChess3D = { enabled: true, playBattleSequence, removePiece, animateMove };

    const game = freshGame();
    const mc = new MoveController(game);

    // Capture move (enemy present) -> triggers battle sequence
    await executeMove(game, mc, { r: 1, c: 4 }, { r: 2, c: 3 });
    await new Promise((r) => setTimeout(r, 0)); // let microtasks flush

    expect(unhandled).toHaveLength(0);
    expect(removePiece).not.toHaveBeenCalled();
    expect(animateMove).not.toHaveBeenCalled();
  });

  it('skips follow-up 3D calls when battleChess3D becomes disabled mid-animation', async () => {
    let resolveSeq!: () => void;
    const playBattleSequence = vi.fn().mockReturnValue(
      new Promise<void>((res) => {
        resolveSeq = res;
      })
    );
    const removePiece = vi.fn();
    const animateMove = vi.fn();
    (window as any).battleChess3D = { enabled: true, playBattleSequence, removePiece, animateMove };

    const game = freshGame();
    const mc = new MoveController(game);

    const p = executeMove(game, mc, { r: 1, c: 4 }, { r: 2, c: 3 });
    (window as any).battleChess3D.enabled = false; // torn down mid-animation
    resolveSeq();
    await p;
    await new Promise((r) => setTimeout(r, 0));

    expect(unhandled).toHaveLength(0);
    expect(removePiece).not.toHaveBeenCalled();
    expect(animateMove).not.toHaveBeenCalled();
  });
});
