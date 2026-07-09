import { describe, it, expect } from 'vitest';
import * as MoveGenerator from '@schach9x9/ai/MoveGenerator';
import {
  PIECE_NONE,
  WHITE_ROOK,
  WHITE_KING,
  BLACK_KING,
} from '@schach9x9/ai/BoardDefinitions';

/**
 * Regression test for 8x8-mode support in MoveGenerator.
 * MoveGenerator was hardcoded for 9x9 (UP/DOWN = ±9, ROOK_OFFSETS = ±9/±1).
 * For an 8x8 board the direction must be ±8, otherwise sliding-piece moves
 * are off-by-one (diagonal instead of straight). This breaks AI move
 * generation for the standard8x8 / upgrade8x8 modes.
 */
describe('MoveGenerator 8x8 mode support', () => {
  it('rook on d4 moves straight up one square (d5) on 8x8', () => {
    const b = new Int8Array(64).fill(PIECE_NONE);
    // d4 = row 3, col 3 -> index 3*8+3 = 27
    b[3 * 8 + 3] = WHITE_ROOK;
    b[7 * 8 + 4] = WHITE_KING;
    b[0 * 8 + 4] = BLACK_KING;
    const moves: any[] = MoveGenerator.getAllLegalMoves(b, 'white');

    const d4 = 3 * 8 + 3;
    const d5 = 4 * 8 + 3; // straight up one rank
    const up = moves.find((m) => m.from === d4 && m.to === d5);
    expect(up).toBeDefined();
  });

  it('rook on d4 does NOT move diagonally (off-by-one) on 8x8', () => {
    const b = new Int8Array(64).fill(PIECE_NONE);
    b[3 * 8 + 3] = WHITE_ROOK;
    b[7 * 8 + 4] = WHITE_KING;
    b[0 * 8 + 4] = BLACK_KING;
    const moves: any[] = MoveGenerator.getAllLegalMoves(b, 'white');

    const d4 = 3 * 8 + 3;
    // With hardcoded ±9: 27 - 9 = 18 = row 2, col 2 (c3) — a diagonal, wrong.
    const c3 = 2 * 8 + 2;
    const bad = moves.find((m) => m.from === d4 && m.to === c3);
    expect(bad).toBeUndefined();
  });

  it('rook on d5 (9x9) still moves straight up on 9x9 (non-regression)', () => {
    const b = new Int8Array(81).fill(PIECE_NONE);
    // d5 in 9x9 = row 4, col 3 -> index 4*9+3 = 39
    b[4 * 9 + 3] = WHITE_ROOK;
    b[8 * 9 + 4] = WHITE_KING;
    b[0 * 9 + 4] = BLACK_KING;
    const moves: any[] = MoveGenerator.getAllLegalMoves(b, 'white');

    const d5 = 4 * 9 + 3;
    const d6 = 5 * 9 + 3; // straight up
    const up = moves.find((m) => m.from === d5 && m.to === d6);
    expect(up).toBeDefined();
  });
});
