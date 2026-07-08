import { describe, it, expect } from 'vitest';
import * as MoveGenerator from '@schach9x9/ai/MoveGenerator';
import {
  PIECE_PAWN,
  COLOR_BLACK,
  COLOR_WHITE,
  WHITE_PAWN,
  WHITE_ROOK,
  WHITE_KING,
  BLACK_PAWN,
  BLACK_ROOK,
  BLACK_KING,
  PIECE_NONE,
  SQUARE_COUNT,
} from '@schach9x9/ai/BoardDefinitions';

/**
 * Regression test for black-pawn double-push bug in MoveGenerator.
 * Black pawns start on row 1 (0-indexed) in the 9x9 classic layout, so a
 * double push from row 1 -> row 3 must be generated. The bug was that
 * isStart checked rank === 2 for black, so no double push was ever produced.
 */
describe('MoveGenerator black pawn double push', () => {
  const SIZE = 9;

  function buildStartBoard(): Int8Array {
    const b = new Int8Array(SQUARE_COUNT).fill(PIECE_NONE);
    b.fill(BLACK_PAWN, 0 * SIZE + 0, 0 * SIZE + SIZE); // black back row unused
    // black back rank + pawns (row 0 + row 1)
    const blackBack = [BLACK_ROOK, 0, 0, 0, BLACK_KING, 0, 0, 0, BLACK_ROOK];
    blackBack.forEach((p, c) => { if (p) b[0 * SIZE + c] = p; });
    for (let c = 0; c < SIZE; c++) b[1 * SIZE + c] = BLACK_PAWN;
    // white pawns (row 7) + back rank (row 8)
    for (let c = 0; c < SIZE; c++) b[7 * SIZE + c] = WHITE_PAWN;
    const whiteBack = [WHITE_ROOK, 0, 0, 0, WHITE_KING, 0, 0, 0, WHITE_ROOK];
    whiteBack.forEach((p, c) => { if (p) b[8 * SIZE + c] = p; });
    return b;
  }

  it('generates double push for black pawn on starting rank', () => {
    const board = buildStartBoard();
    const blackMoves: any[] = MoveGenerator.getAllLegalMoves(board, 'black');

    // black pawn e7 = row 1, col 4 -> from index 1*9+4 = 13
    // double push target = row 3, col 4 -> index 3*9+4 = 31
    const e7 = 1 * SIZE + 4;
    const e5 = 3 * SIZE + 4;
    const doublePush = blackMoves.find((m) => m.from === e7 && m.to === e5);
    expect(doublePush).toBeDefined();
    expect(doublePush?.flags).toBe('double');
  });

  it('generates single push for black pawn on starting rank', () => {
    const board = buildStartBoard();
    const blackMoves: any[] = MoveGenerator.getAllLegalMoves(board, 'black');

    const e7 = 1 * SIZE + 4;
    const e6 = 2 * SIZE + 4;
    const singlePush = blackMoves.find((m) => m.from === e7 && m.to === e6);
    expect(singlePush).toBeDefined();
  });

  it('white pawn double push still works (non-regression)', () => {
    const board = buildStartBoard();
    const whiteMoves: any[] = MoveGenerator.getAllLegalMoves(board, 'white');

    // white pawn e2 = row 7, col 4 -> from index 7*9+4 = 67
    // double push target = row 5, col 4 -> index 5*9+4 = 49
    const e2 = 7 * SIZE + 4;
    const e4 = 5 * SIZE + 4;
    const doublePush = whiteMoves.find((m) => m.from === e2 && m.to === e4);
    expect(doublePush).toBeDefined();
    expect(doublePush?.flags).toBe('double');
  });
});
