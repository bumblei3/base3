/**
 * Shared board utilities
 */

import type { Position, Move, Piece } from '../types';

// Algebraic notation conversion
export function posToAlgebraic(pos: Position, boardSize: { rows: number; cols: number } = { rows: 8, cols: 8 }): string {
  const file = String.fromCharCode(97 + pos.col); // a-h
  const rank = boardSize.rows - pos.row; // 1-8
  return `${file}${rank}`;
}

export function algebraicToPos(alg: string, boardSize: { rows: number; cols: number } = { rows: 8, cols: 8 }): Position | null {
  if (alg.length < 2) return null;
  const file = alg.charCodeAt(0) - 97;
  const rank = parseInt(alg[1], 10);
  if (isNaN(file) || isNaN(rank)) return null;
  const row = boardSize.rows - rank;
  const col = file;
  if (row < 0 || row >= boardSize.rows || col < 0 || col >= boardSize.cols) return null;
  return { row, col };
}

// Move to SAN (Standard Algebraic Notation) - simplified
export function moveToSan(move: Move, piece: Piece, isCapture: boolean, isCheck: boolean, isCheckmate: boolean): string {
  const pieceChar = piece.type === 'pawn' ? '' : piece.type.charAt(0).toUpperCase();
  const captureChar = isCapture ? 'x' : '';
  const checkChar = isCheckmate ? '#' : isCheck ? '+' : '';
  const to = `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;
  return `${pieceChar}${captureChar}${to}${checkChar}`;
}

// FEN parsing/generation (simplified)
export interface FENParts {
  piecePlacement: string;
  activeColor: 'w' | 'b';
  castling: string;
  enPassant: string;
  halfmoveClock: number;
  fullmoveNumber: number;
}

export function parseFEN(fen: string): FENParts | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length !== 6) return null;
  return {
    piecePlacement: parts[0],
    activeColor: parts[1] as 'w' | 'b',
    castling: parts[2],
    enPassant: parts[2],
    halfmoveClock: parseInt(parts[4], 10),
    fullmoveNumber: parseInt(parts[5], 10),
  };
}

// Board symmetry
export function mirrorPosition(pos: Position, boardSize: { rows: number; cols: number }): Position {
  return {
    row: boardSize.rows - 1 - pos.row,
    col: boardSize.cols - 1 - pos.col,
  };
}

export function rotatePosition(pos: Position, boardSize: { rows: number; cols: number }): Position {
  return {
    row: pos.col,
    col: boardSize.rows - 1 - pos.row,
  };
}

// Distance metrics
export function squareDistance(a: Position, b: Position): number {
  const dr = a.row - b.row;
  const dc = a.col - b.col;
  return dr * dr + dc * dc;
}

export function kingDistance(a: Position, b: Position): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

// Direction vectors
export const DIRECTIONS = {
  N: { dr: -1, dc: 0 },
  NE: { dr: -1, dc: 1 },
  E: { dr: 0, dc: 1 },
  SE: { dr: 1, dc: 1 },
  S: { dr: 1, dc: 0 },
  SW: { dr: 1, dc: -1 },
  W: { dr: 0, dc: -1 },
  NW: { dr: -1, dc: -1 },
} as const;

export type Direction = keyof typeof DIRECTIONS;

export function step(pos: Position, dir: Direction, steps = 1): Position {
  const { dr, dc } = DIRECTIONS[dir];
  return { row: pos.row + dr * steps, col: pos.col + dc * steps };
}

export function ray(pos: Position, dir: Direction, maxSteps: number, boardSize: { rows: number; cols: number }): Position[] {
  const result: Position[] = [];
  let current = pos;
  for (let i = 0; i < maxSteps; i++) {
    current = step(current, dir);
    if (current.row < 0 || current.row >= boardSize.rows || current.col < 0 || current.col >= boardSize.cols) break;
    result.push(current);
  }
  return result;
}

// Board colors
export function getSquareColor(pos: Position): 'light' | 'dark' {
  return (pos.row + pos.col) % 2 === 0 ? 'light' : 'dark';
}

// Coordinate conversion for different board sizes
export interface BoardBounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export function isOnBoard(pos: Position, bounds: BoardBounds): boolean {
  return pos.row >= bounds.minRow && pos.row <= bounds.maxRow &&
         pos.col >= bounds.minCol && pos.col <= bounds.maxCol;
}

export function createBounds(rows: number, cols: number): BoardBounds {
  return { minRow: 0, maxRow: rows - 1, minCol: 0, maxCol: cols - 1 };
}

// Bitboard utilities (for engines)
export type Bitboard = bigint;

export const BB_RANKS: Bitboard[] = Array.from({ length: 8 }, (_, i) => {
  let bb = 0n;
  for (let f = 0; f < 8; f++) bb |= 1n << BigInt(i * 8 + f);
  return bb;
});

export const BB_FILES: Bitboard[] = Array.from({ length: 8 }, (_, f) => {
  let bb = 0n;
  for (let r = 0; r < 8; r++) bb |= 1n << BigInt(r * 8 + f);
  return bb;
});

export function sq(r: number, f: number): Bitboard {
  return 1n << BigInt(r * 8 + f);
}

export function popcount(bb: Bitboard): number {
  let count = 0;
  while (bb) {
    bb &= bb - 1n;
    count++;
  }
  return count;
}

export function lsbIndex(bb: Bitboard): number {
  // Least significant bit index
  return Number(bb & -bb) ? (bb & -bb).toString(2).length - 1 : -1;
}

export function msbIndex(bb: Bitboard): number {
  // Most significant bit index
  if (bb === 0n) return -1;
  return bb.toString(2).length - 1;
}
