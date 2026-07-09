import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setCurrentBoardShape } from '@schach9x9/config';
import { getTopMoves, getBestMoveDetailed } from '@schach9x9/aiEngine';
import { convertBoardToInt } from '@schach9x9/aiEngine';
import type { Piece } from '@schach9x9/types/game';

function make8x8Start(): (Piece | null)[][] {
  const b: (Piece | null)[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null),
  );
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: back[c], color: 'black' } as Piece;
    b[1][c] = { type: 'p', color: 'black' } as Piece;
    b[6][c] = { type: 'p', color: 'white' } as Piece;
    b[7][c] = { type: back[c], color: 'white' } as Piece;
  }
  return b;
}

describe('aiEngine 8x8', () => {
  beforeAll(() => setCurrentBoardShape('8x8' as any));
  afterAll(() => setCurrentBoardShape('9x9' as any));

  it('getTopMoves on 8x8 returns in-bounds moves', async () => {
    const board = make8x8Start();
    const moves = await getTopMoves(board as any, 'white', 3, 2, 800, 1);
    expect(Array.isArray(moves)).toBe(true);
    for (const m of moves) {
      const mv = m.move!;
      expect(mv.from.r).toBeGreaterThanOrEqual(0);
      expect(mv.from.r).toBeLessThan(8);
      expect(mv.to.r).toBeLessThan(8);
      expect(mv.from.c).toBeLessThan(8);
    }
  });

  it('getBestMoveDetailed on 8x8 returns valid in-bounds move', async () => {
    const board = make8x8Start();
    const result = await getBestMoveDetailed(
      board as any,
      'white',
      2,
      { elo: 1000, personality: 'balanced' } as any,
      1,
    );
    expect(result).toBeTruthy();
    const mv = result!.move!;
    expect(mv.from.r).toBeLessThan(8);
    expect(mv.to.r).toBeLessThan(8);
  });
});
