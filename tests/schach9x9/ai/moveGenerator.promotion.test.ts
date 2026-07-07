/**
 * MoveGenerator (Int8Array AI engine) — pawn promotion tests.
 *
 * Verifies that pawn moves reaching the last rank generate promotion
 * variations and that makeMove actually promotes the pawn.
 */

import { describe, test, expect } from 'vitest';
import {
  getAllLegalMoves,
  makeMove,
  type Move,
} from '@schach9x9/ai/MoveGenerator';
import {
  SQUARE_COUNT,
  PIECE_NONE,
  PIECE_PAWN,
  PIECE_QUEEN,
  PIECE_ROOK,
  PIECE_BISHOP,
  PIECE_KNIGHT,
  COLOR_WHITE,
  COLOR_BLACK,
} from '@schach9x9/ai/BoardDefinitions';

// 9x9 layout: index = row * 9 + col, row 0 = top (black back rank),
// row 8 = bottom (white back rank). White pawns move UP (decreasing index)
// and promote on row 0; black pawns move DOWN and promote on row 8.

function emptyBoard(): Int8Array {
  return new Int8Array(SQUARE_COUNT).fill(PIECE_NONE);
}

describe('MoveGenerator pawn promotion', () => {
  test('white pawn one step from last rank generates 4 promotions', () => {
    const board = emptyBoard();
    // White pawn at row 1, col 4 (index 1*9 + 4 = 13) — one push from row 0.
    board[13] = PIECE_PAWN | COLOR_WHITE;
    const moves = getAllLegalMoves(board, 'white') as Move[];
    const promos = moves.filter((m) => m.from === 13 && m.to === 4 && m.promotion !== undefined);
    expect(promos.length).toBe(4);
    const types = promos.map((m) => m.promotion).sort();
    expect(types).toEqual(
      [PIECE_BISHOP, PIECE_KNIGHT, PIECE_QUEEN, PIECE_ROOK].sort(),
    );
  });

  test('black pawn one step from last rank generates 4 promotions', () => {
    const board = emptyBoard();
    // Black pawn at row 7, col 4 (index 7*9 + 4 = 67) — one push from row 8.
    board[67] = PIECE_PAWN | COLOR_BLACK;
    const moves = getAllLegalMoves(board, 'black') as Move[];
    const promos = moves.filter((m) => m.from === 67 && m.to === 76 && m.promotion !== undefined);
    expect(promos.length).toBe(4);
  });

  test('white pawn promoting capture generates promotions on diagonal', () => {
    const board = emptyBoard();
    // White pawn at row 1, col 4 (index 13). Enemy at row 0, col 3 (index 3)
    // and row 0, col 5 (index 5) — capturable with promotion.
    board[13] = PIECE_PAWN | COLOR_WHITE;
    board[3] = PIECE_PAWN | COLOR_BLACK;
    board[5] = PIECE_PAWN | COLOR_BLACK;
    const moves = getAllLegalMoves(board, 'white') as Move[];
    const promoCaptures = moves.filter(
      (m) => m.from === 13 && m.promotion !== undefined && (m.to === 3 || m.to === 5),
    );
    // 2 capture targets x 4 promotion types = 8
    expect(promoCaptures.length).toBe(8);
  });

  test('makeMove applies promotion (pawn becomes queen on last rank)', () => {
    const board = emptyBoard();
    board[13] = PIECE_PAWN | COLOR_WHITE; // white pawn at row 1
    const move: Move = { from: 13, to: 4, promotion: PIECE_QUEEN };
    makeMove(board, move);
    // Destination should now hold a white queen, source empty.
    expect(board[4]).toBe(PIECE_QUEEN | COLOR_WHITE);
    expect(board[13]).toBe(PIECE_NONE);
  });

  test('makeMove does NOT promote when promotion is undefined', () => {
    const board = emptyBoard();
    board[13] = PIECE_PAWN | COLOR_WHITE;
    const move: Move = { from: 13, to: 4 }; // no promotion field
    makeMove(board, move);
    // Should remain a pawn (this path only happens off the last rank).
    expect(board[4]).toBe(PIECE_PAWN | COLOR_WHITE);
  });
});
