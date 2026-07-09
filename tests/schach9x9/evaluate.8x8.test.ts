import { describe, it, expect, beforeAll } from 'vitest';
import { setCurrentBoardShape } from '@schach9x9/config';
import { evaluate } from '@schach9x9/evaluate';
import { convertBoardToInt } from '@schach9x9/aiEngine';
import type { Piece } from '@schach9x9/types/game';

// Build a standard 8x8 starting position as a UiBoard (8x8 array of Piece|null).
function make8x8Start(): (Piece | null)[][] {
  const empty = (): (Piece | null)[][] =>
    Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
  const b = empty();
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: back[c], color: 'black' } as Piece;
    b[1][c] = { type: 'p', color: 'black' } as Piece;
    b[6][c] = { type: 'p', color: 'white' } as Piece;
    b[7][c] = { type: back[c], color: 'white' } as Piece;
  }
  return b;
}

describe('evaluate 8x8', () => {
  beforeAll(() => {
    setCurrentBoardShape('8x8' as any);
  });
  afterAll(() => {
    setCurrentBoardShape('9x9' as any);
  });

  it('evaluates an 8x8 board without out-of-bounds', () => {
    const board = make8x8Start();
    const intBoard = convertBoardToInt(board as any);
    expect(intBoard.length).toBe(64);
    // must not throw / read undefined
    const score = evaluate(intBoard as any, 'white');
    expect(typeof score).toBe('number');
  });
});
