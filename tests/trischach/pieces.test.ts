/**
 * TriSchach Piece + movement-generation domain tests.
 *
 * Exercises getValidMoves for every piece type on a real board, plus the
 * initial-piece layout. Movement rules:
 *  - KING: 6 direct neighbors
 *  - QUEEN: slides along 6 directions + 6 diagonals (until blocked)
 *  - ROOK: slides along 6 directions
 *  - BISHOP: slides along 6 diagonals
 *  - KNIGHT: hex-knight jumps (distance 2)
 *  - PAWN: 2 forward directions (faction-specific), attacks same dirs,
 *          double-step on first move
 */
import { describe, test, expect } from 'vitest';
import { Hex } from '@trischach/hex';
import { generateBoard, FACTION } from '@trischach/board';
import {
  Piece,
  PIECE_TYPE,
  PIECE_STRENGTH,
  getValidMoves,
  createInitialPieces,
} from '@trischach/pieces';

// Build an occupied map from a list of pieces (mirrors Game._rebuildOccupiedMap)
function occupiedMap(pieces: Piece[]): Map<string, Piece> {
  const m = new Map<string, Piece>();
  for (const p of pieces) if (p.alive) m.set(p.pos.key, p);
  return m;
}

const board = generateBoard();

describe('TriSchach Piece model', () => {
  test('constructor assigns id, type, faction, symbol and starts alive', () => {
    const p = new Piece(PIECE_TYPE.KING, FACTION.FIRE, new Hex(0, 0));
    expect(p.id).toMatch(/^fire_king_\d+$/);
    expect(p.symbol).toBe('♚');
    expect(p.alive).toBe(true);
    expect(p.hasMoved).toBe(false);
  });

  test('PIECE_STRENGTH ordering: king > queen > rook > bishop = knight > pawn', () => {
    expect(PIECE_STRENGTH.king).toBeGreaterThan(PIECE_STRENGTH.queen);
    expect(PIECE_STRENGTH.queen).toBeGreaterThan(PIECE_STRENGTH.rook);
    expect(PIECE_STRENGTH.rook).toBeGreaterThan(PIECE_STRENGTH.bishop);
    expect(PIECE_STRENGTH.rook).toBeGreaterThan(PIECE_STRENGTH.knight);
    expect(PIECE_STRENGTH.bishop).toBe(PIECE_STRENGTH.knight);
    expect(PIECE_STRENGTH.knight).toBeGreaterThan(PIECE_STRENGTH.pawn);
  });
});

describe('TriSchach initial piece layout', () => {
  test('createInitialPieces yields 45 pieces (3 factions × 15)', () => {
    const pieces = createInitialPieces();
    expect(pieces.length).toBe(45);
    const byFaction: Record<string, number> = {};
    for (const p of pieces) byFaction[p.faction] = (byFaction[p.faction] ?? 0) + 1;
    expect(byFaction.fire).toBe(15);
    expect(byFaction.water).toBe(15);
    expect(byFaction.nature).toBe(15);
  });

  test('each faction has exactly one king', () => {
    const pieces = createInitialPieces();
    for (const fac of ['fire', 'water', 'nature'] as const) {
      const kings = pieces.filter((p) => p.faction === fac && p.type === PIECE_TYPE.KING);
      expect(kings.length).toBe(1);
    }
  });
});

describe('TriSchach getValidMoves per piece type', () => {
  test('KING moves to 6 neighbors (empty board)', () => {
    const king = new Piece(PIECE_TYPE.KING, FACTION.FIRE, new Hex(0, 0));
    const { moves, attacks } = getValidMoves(king, board, occupiedMap([king]));
    expect(moves.length).toBe(6);
    expect(attacks.length).toBe(0);
  });

  test('KNIGHT jumps via hexKnightMoves (distance 2)', () => {
    const knight = new Piece(PIECE_TYPE.KNIGHT, FACTION.FIRE, new Hex(0, 0));
    const { moves } = getValidMoves(knight, board, occupiedMap([knight]));
    // see hex.test.ts note: knight generator yields 6 targets; some may fall
    // off the triangular board, so we assert the on-board subset and that
    // every target is exactly cube-distance 2 from the origin.
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.length).toBeLessThanOrEqual(6);
    expect(moves.every((m) => new Hex(0, 0).distance(m) === 2)).toBe(true);
  });

  test('ROOK slides along 6 directions until edge of board', () => {
    const rook = new Piece(PIECE_TYPE.ROOK, FACTION.FIRE, new Hex(0, 0));
    const { moves } = getValidMoves(rook, board, occupiedMap([rook]));
    // every rook move lies on one of the 6 straight directions
    for (const m of moves) {
      const dq = m.q - 0;
      const dr = m.r - 0;
      const onLine = HEX_DIR_KEYS.some(([kq, kr]) => {
        const g = gcd(Math.abs(dq), Math.abs(dr));
        return g > 0 && dq / g === kq && dr / g === kr;
      });
      expect(onLine).toBe(true);
    }
    expect(moves.length).toBeGreaterThan(0);
  });

  test('BISHOP slides along 6 diagonals only', () => {
    const bishop = new Piece(PIECE_TYPE.BISHOP, FACTION.FIRE, new Hex(0, 0));
    const { moves } = getValidMoves(bishop, board, occupiedMap([bishop]));
    for (const m of moves) {
      const dq = m.q;
      const dr = m.r;
      // diagonal means neither coordinate delta is 0 alone on a straight axis
      expect(dq !== 0 && dr !== 0).toBe(true);
    }
  });

  test('PAWN moves forward and can double-step before moving', () => {
    const pawn = new Piece(PIECE_TYPE.PAWN, FACTION.FIRE, new Hex(0, 5));
    const { moves } = getValidMoves(pawn, board, occupiedMap([pawn]));
    // fire forward dirs are (-1,+1)?(NW/NE per source) — at least 1 forward move
    expect(moves.length).toBeGreaterThanOrEqual(1);
    // double-step allowed while hasMoved === false
    expect(moves.some((m) => new Hex(0, 5).distance(m) === 2)).toBe(true);
  });

  test('friendly piece blocks; enemy piece becomes an attack', () => {
    const mover = new Piece(PIECE_TYPE.ROOK, FACTION.FIRE, new Hex(0, 0));
    const friend = new Piece(PIECE_TYPE.PAWN, FACTION.FIRE, new Hex(1, 0));
    const enemy = new Piece(PIECE_TYPE.PAWN, FACTION.WATER, new Hex(-1, 0));
    const { moves, attacks } = getValidMoves(
      mover,
      board,
      occupiedMap([mover, friend, enemy]),
    );
    // the friendly neighbor is not a move target (blocked)
    expect(moves.some((m) => m.equals(new Hex(1, 0)))).toBe(false);
    // the enemy neighbor is an attack target but not a quiet move
    expect(attacks.some((a) => a.equals(new Hex(-1, 0)))).toBe(true);
    expect(moves.some((m) => m.equals(new Hex(-1, 0)))).toBe(false);
  });
});

// 6 straight hex directions (matches HEX_DIRECTIONS) for the rook assertion
const HEX_DIR_KEYS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
