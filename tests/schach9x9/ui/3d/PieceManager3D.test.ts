import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';

// --- Hoisted mocks (must be at top level) ---
const { BattleAnimatorMock, triggerVibrationMock, shakeScreenMock, loggerMock } = vi.hoisted(() => {
  return {
    BattleAnimatorMock: vi.fn().mockImplementation(function () {
      return {
        playBattle: vi.fn().mockResolvedValue(undefined),
      };
    }),
    triggerVibrationMock: vi.fn(),
    shakeScreenMock: vi.fn(),
    loggerMock: {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock modules using hoisted mocks
// createPiece3D is NOT mocked - use real implementation with global THREE mock
// vi.mock('../../../../js/schach9x9/ui/pieces3D.ts', () => ({
//   createPiece3D: createPiece3DMock,
// }));

vi.mock('../../../../js/schach9x9/battleAnimations.ts', () => ({
  BattleAnimator: BattleAnimatorMock,
}));

vi.mock('../../../../js/schach9x9/effects.ts', () => ({
  triggerVibration: triggerVibrationMock,
  shakeScreen: shakeScreenMock,
}));

vi.mock('../../../../js/schach9x9/logger.ts', () => ({
  logger: loggerMock,
}));

import { PieceManager3D } from '../../../../js/schach9x9/ui/3d/PieceManager3D.ts';

describe('PieceManager3D', () => {
  let pieceManager: PieceManager3D;
  let mockSceneManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock SceneManager3D
    mockSceneManager = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      boardToWorld: vi.fn().mockReturnValue({ x: 10, z: 20 }),
    };

    pieceManager = new PieceManager3D(mockSceneManager);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('constructor should initialize correctly', () => {
    expect(pieceManager.pieces).toEqual({});
    expect(pieceManager.highlights).toEqual([]);
    expect(pieceManager.animating).toBe(false);
  });

  test('init should create battleAnimator', async () => {
    pieceManager.init();
    expect(pieceManager.battleAnimator).toBeDefined();
    expect(BattleAnimatorMock).toHaveBeenCalled();
  });

  test('addPiece should add piece to scene and pieces map', () => {
    const spy = vi.spyOn(mockSceneManager.scene, 'add');
    pieceManager.addPiece('p', 'white', 6, 4);

    expect(spy).toHaveBeenCalled();
    expect(Object.keys(pieceManager.pieces)).toContain('6,4');
    expect(pieceManager.pieces['6,4'].userData).toMatchObject({
      type: 'p',
      color: 'white',
      row: 6,
      col: 4,
    });
  });

  test('removePiece should remove piece from scene and map', () => {
    pieceManager.addPiece('p', 'white', 6, 4);
    const spy = vi.spyOn(mockSceneManager.scene, 'remove');

    pieceManager.removePiece(6, 4);

    expect(spy).toHaveBeenCalled();
    expect(pieceManager.pieces['6,4']).toBeUndefined();
  });

  test('updateFromGameState should populate pieces from board', () => {
    // Create a 9x9 board (BOARD_SIZE = 9) with a piece at (6,4)
    const board = Array.from({ length: 9 }, () => Array(9).fill(null));
    board[6][4] = { type: 'p', color: 'white', pos: { q: 6, r: 4 }, symbol: '♙', alive: true, id: 1 };
    const mockGame = { board };

    pieceManager.updateFromGameState(mockGame);

    expect(pieceManager.pieces['6,4']).toBeDefined();
  });

  test('animateMove should update piece position', async () => {
    const raSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
      setTimeout(cb, 0);
      return 0;
    });

    pieceManager.addPiece('p', 'white', 6, 4);
    const initialPiece = pieceManager.pieces['6,4'];

    const promise = pieceManager.animateMove(6, 4, 4, 4);

    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(100);
    }

    await promise;

    expect(initialPiece.userData.row).toBe(4);
    expect(initialPiece.userData.col).toBe(4);
    expect(pieceManager.pieces['4,4']).toBeDefined();
    raSpy.mockRestore();
  });

  test('playBattleSequence should invoke battleAnimator', async () => {
    pieceManager.init();
    const spy = vi.spyOn(pieceManager.battleAnimator!, 'playBattle');

    const attacker = { type: 'q', color: 'white' };
    const defender = { type: 'p', color: 'black' };

    await pieceManager.playBattleSequence(
      attacker as any,
      defender as any,
      { r: 6, c: 4 } as any,
      { r: 4, c: 4 } as any
    );

    expect(spy).toHaveBeenCalled();
    expect(pieceManager.animating).toBe(false);
  });

  test('playBattleSequence should handle heavy and medium effects', async () => {
    pieceManager.init();

    await pieceManager.playBattleSequence(
      { type: 'q', color: 'white' } as any,
      { type: 'p' } as any,
      { r: 6, c: 4 },
      { r: 4, c: 4 }
    );
    expect(triggerVibrationMock).toHaveBeenCalledWith('heavy');
    expect(shakeScreenMock).toHaveBeenCalledWith(8, 400);

    vi.clearAllMocks(); // Reset mocks for second call

    await pieceManager.playBattleSequence(
      { type: 'p', color: 'white' } as any, // 'p' (pawn) is not in ['q', 'a', 'c', 'e'] → medium
      { type: 'p' } as any,
      { r: 6, c: 4 },
      { r: 4, c: 4 }
    );
    expect(triggerVibrationMock).toHaveBeenCalledWith('medium');
    expect(shakeScreenMock).toHaveBeenCalledWith(3, 200);
  });

  test('playBattleSequence should log error on failure', async () => {
    pieceManager.init();
    // Directly mock the playBattle method on the existing instance to throw
    pieceManager.battleAnimator!.playBattle = vi.fn().mockRejectedValue(new Error('Mock Error'));

    await pieceManager.playBattleSequence(
      { type: 'p' } as any,
      { type: 'p' } as any,
      { r: 6, c: 4 },
      { r: 4, c: 4 }
    );

    expect(loggerMock.error).toHaveBeenCalledWith('Battle animation failed:', expect.any(Error));
    expect(pieceManager.animating).toBe(false);
  });
});
