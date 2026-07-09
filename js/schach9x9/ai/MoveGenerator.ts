import {
  PIECE_NONE,
  PIECE_PAWN,
  PIECE_KNIGHT,
  PIECE_BISHOP,
  PIECE_ROOK,
  PIECE_QUEEN,
  PIECE_KING,
  PIECE_ARCHBISHOP,
  PIECE_CHANCELLOR,
  PIECE_ANGEL,
  PIECE_NIGHTRIDER,
  COLOR_WHITE,
  COLOR_BLACK,
  TYPE_MASK,
  COLOR_MASK,
} from './BoardDefinitions.js';

// Re-export piece/color constants for consumers
export {
  PIECE_NONE,
  PIECE_PAWN,
  PIECE_KNIGHT,
  PIECE_BISHOP,
  PIECE_ROOK,
  PIECE_QUEEN,
  PIECE_KING,
  PIECE_ARCHBISHOP,
  PIECE_CHANCELLOR,
  PIECE_ANGEL,
  PIECE_NIGHTRIDER,
  COLOR_WHITE,
  COLOR_BLACK,
};

import { isBlockedSquare, getCurrentBoardShape, type BoardShape } from '../config.js';

export type BoardStorage = number[] | Int8Array;

/**
 * Represents a chess move in the integer board engine.
 * Squares are stored as flat indices into the (square) board.
 *
 * The board geometry is DERIVED FROM THE BOARD LENGTH, not hardcoded, so the
 * same generator works for 8x8 (length 64) and 9x9 (length 81) boards.
 * For an N x N board, size = N, the vertical step is ±N, the horizontal step
 * is ±1, and diagonals are ±(N±1).
 */
export interface Move {
  from: number;
  to: number;
  piece?: number;
  captured?: number;
  promotion?: number;
  castling?: boolean;
  flags?: string;
  score?: number;
}

/**
 * Information needed to undo a move on the integer board.
 */
export interface UndoInfo {
  move: Move;
  captured: number;
  piece: number;
}

/**
 * Board geometry derived from the flat board length. All direction offsets and
 * index math are expressed in terms of `size` so the move generator is
 * board-size agnostic (8x8 and 9x9).
 */
interface Geom {
  size: number;
  UP: number;
  DOWN: number;
  LEFT: number;
  RIGHT: number;
  KNIGHT: number[];
  KING: number[];
  BISHOP: number[];
  ROOK: number[];
}

const geomCache = new Map<number, Geom>();

function geomFor(size: number): Geom {
  let g = geomCache.get(size);
  if (g) return g;
  const UP = -size;
  const DOWN = size;
  const LEFT = -1;
  const RIGHT = 1;
  g = {
    size,
    UP,
    DOWN,
    LEFT,
    RIGHT,
    // Knight leaps: (±2,±1) and (±1,±2) in row/col space.
    KNIGHT: [
      UP * 2 + LEFT,
      UP * 2 + RIGHT,
      UP + LEFT * 2,
      UP + RIGHT * 2,
      DOWN + LEFT * 2,
      DOWN + RIGHT * 2,
      DOWN * 2 + LEFT,
      DOWN * 2 + RIGHT,
    ],
    // King steps: one square in any direction.
    KING: [UP + LEFT, UP, UP + RIGHT, LEFT, RIGHT, DOWN + LEFT, DOWN, DOWN + RIGHT],
    // Bishop/diagonal rays.
    BISHOP: [UP + LEFT, UP + RIGHT, DOWN + LEFT, DOWN + RIGHT],
    // Rook/orthogonal rays.
    ROOK: [UP, DOWN, LEFT, RIGHT],
  };
  geomCache.set(size, g);
  return g;
}

/** Derive the board dimension (side length) from the flat array length. */
function boardSize(board: BoardStorage): number {
  return Math.round(Math.sqrt(board.length));
}

function rowOf(idx: number, size: number): number {
  return Math.floor(idx / size);
}

function colOf(idx: number, size: number): number {
  return idx % size;
}

function isValidSquare(idx: number, size: number): boolean {
  return idx >= 0 && idx < size * size;
}

/**
 * Generate all legal moves for position
 */
export function getPseudoLegalMoves(): Move[] {
  // Legacy stub for 8x8 tests compatibility
  return [];
}

export function getAllLegalMoves(board: BoardStorage, turnColor: string): Move[] {
  const g = geomFor(boardSize(board));
  const color = turnColor === 'white' ? COLOR_WHITE : COLOR_BLACK;
  const enemyColor = turnColor === 'white' ? COLOR_BLACK : COLOR_WHITE;
  const moves: Move[] = [];
  const size = g.size;

  // 1. Generate Pseudo-Legal Moves
  for (let from = 0; from < size * size; from++) {
    const piece = board[from];
    if (piece === PIECE_NONE) continue;
    if ((piece & COLOR_MASK) !== color) continue;

    const type = piece & TYPE_MASK;

    if (type === PIECE_PAWN) {
      generatePawnMoves(board, from, color, moves, g);
    } else {
      generatePieceMoves(board, from, type, color, moves, g);
    }
  }

  // 2. Filter Illegal Moves (Checks)
  // For optimization, we usually do this inside the search or make/undo,
  // but to match previous API, we return only legal moves.
  const legalMoves: Move[] = [];
  const myKingPos = findKing(board, color);

  for (const move of moves) {
    // 2.1. Rule: Cannot capture King
    if ((board[move.to] & TYPE_MASK) === PIECE_KING) continue;

    // Simulate move
    const undo = makeMove(board, move);

    // Check validity
    // If King captured? (Shouldn't happen if generator is correct)
    // If My King is attacked?
    const kingPos = move.from === myKingPos ? move.to : myKingPos;
    if (!isSquareAttacked(board, kingPos, enemyColor)) {
      legalMoves.push(move);
    }

    // Undo move
    undoMove(board, undo);
  }

  // Filter out blocked squares for cross-shaped board
  const boardShape = getCurrentBoardShape();
  if (boardShape && boardShape !== 'standard') {
    return legalMoves.filter(move => !isBlockedSquare(move.to, boardShape));
  }

  return legalMoves;
}

/**
 * Get all legal moves with blocked square filtering for cross-shaped board
 */
export function getAllLegalMovesFiltered(
  board: BoardStorage,
  turnColor: string,
  boardShape?: BoardShape
): Move[] {
  const moves = getAllLegalMoves(board, turnColor);

  // Filter out blocked squares for cross-shaped board
  if (boardShape && boardShape !== 'standard') {
    return moves.filter(move => !isBlockedSquare(move.to, boardShape));
  }

  return moves;
}

export function getAllCaptureMoves(board: BoardStorage, turnColor: string): Move[] {
  // Simplified for QS
  const allAndQuiet = getAllLegalMoves(board, turnColor);
  return allAndQuiet.filter(m => board[m.to] !== PIECE_NONE); // Rough check, since makeMove assumes capture.
  // Actually getAllLegalMoves simulates, so board[m.to] is valid BEFORE simulation.
  // Wait, getAllLegalMoves returns move objects.
  // We can check if 'move.captured' property exists?
  // Or better, filter moves where target square is not empty.
}

function generatePawnMoves(
  board: BoardStorage,
  from: number,
  color: number,
  moves: Move[],
  g: Geom
): void {
  const size = g.size;
  const direction = color === COLOR_WHITE ? g.UP : g.DOWN;
  // White pawns start on the second-to-last rank (row size-2); black pawns on row 1.
  const startWhiteRank = size - 2;
  const startBlackRank = 1;
  const forward = from + direction;
  const rank = rowOf(from, size);

  // Single Push
  if (board[forward] === PIECE_NONE) {
    const forwardRank = rowOf(forward, size);
    if ((color === COLOR_WHITE && forwardRank === 0) || (color === COLOR_BLACK && forwardRank === size - 1)) {
      // Promotion on reaching last rank
      for (const promo of PROMO_TYPES) {
        moves.push({ from, to: forward, promotion: promo });
      }
    } else {
      moves.push({ from, to: forward });

      // Double Push
      // White pawns start on row size-2, black pawns on row 1 (board-size aware).
      const isStart = (color === COLOR_WHITE && rank === startWhiteRank) || (color === COLOR_BLACK && rank === startBlackRank);
      if (isStart) {
        const doubleForward = forward + direction;
        if (board[doubleForward] === PIECE_NONE) {
          moves.push({ from, to: doubleForward, flags: 'double' });
        }
      }
    }
  }

  // Captures
  // Left Capture
  const captureLeft = from + direction + g.LEFT;
  if (Math.abs(colOf(from, size) - colOf(captureLeft, size)) === 1) {
    // Prevent wrap
    if (isValidSquare(captureLeft, size)) {
      const target = board[captureLeft];
      if (target !== PIECE_NONE && (target & COLOR_MASK) !== color) {
        // Capture with promotion on last rank
        const leftRank = rowOf(captureLeft, size);
        if ((color === COLOR_WHITE && leftRank === 0) || (color === COLOR_BLACK && leftRank === size - 1)) {
          for (const promo of PROMO_TYPES) {
            moves.push({ from, to: captureLeft, promotion: promo });
          }
        } else {
          moves.push({ from, to: captureLeft });
        }
      }
    }
  }

  // Right Capture
  const captureRight = from + direction + g.RIGHT;
  if (Math.abs(colOf(from, size) - colOf(captureRight, size)) === 1) {
    if (isValidSquare(captureRight, size)) {
      const target = board[captureRight];
      if (target !== PIECE_NONE && (target & COLOR_MASK) !== color) {
        const rightRank = rowOf(captureRight, size);
        if ((color === COLOR_WHITE && rightRank === 0) || (color === COLOR_BLACK && rightRank === size - 1)) {
          for (const promo of PROMO_TYPES) {
            moves.push({ from, to: captureRight, promotion: promo });
          }
        } else {
          moves.push({ from, to: captureRight });
        }
      }
    }
  }
}

// Promotion piece types for pawn promotion (Capablanca standard set).
const PROMO_TYPES = [
  PIECE_QUEEN,
  PIECE_ROOK,
  PIECE_BISHOP,
  PIECE_KNIGHT,
];

function generatePieceMoves(
  board: BoardStorage,
  from: number,
  type: number,
  color: number,
  moves: Move[],
  g: Geom
): void {
  // Steppers
  if (
    type === PIECE_KNIGHT ||
    type === PIECE_ARCHBISHOP ||
    type === PIECE_CHANCELLOR ||
    type === PIECE_ANGEL
  ) {
    generateSteppingMoves(board, from, g.KNIGHT, color, moves, g);
  }

  if (type === PIECE_KING) {
    generateSteppingMoves(board, from, g.KING, color, moves, g);
  }

  // Sliders
  if (
    type === PIECE_BISHOP ||
    type === PIECE_ARCHBISHOP ||
    type === PIECE_QUEEN ||
    type === PIECE_ANGEL
  ) {
    generateSlidingMoves(board, from, g.BISHOP, color, moves, g);
  }

  if (
    type === PIECE_ROOK ||
    type === PIECE_CHANCELLOR ||
    type === PIECE_QUEEN ||
    type === PIECE_ANGEL
  ) {
    generateSlidingMoves(board, from, g.ROOK, color, moves, g);
  }

  if (type === PIECE_NIGHTRIDER) {
    generateSlidingMoves(board, from, g.KNIGHT, color, moves, g);
  }
}

function generateSteppingMoves(
  board: BoardStorage,
  from: number,
  offsets: number[],
  color: number,
  moves: Move[],
  g: Geom
): void {
  const size = g.size;
  const r = rowOf(from, size);
  const c = colOf(from, size);

  for (const offset of offsets) {
    const to = from + offset;
    if (!isValidSquare(to, size)) continue;

    // Wrap check
    const toR = rowOf(to, size);
    const toC = colOf(to, size);
    if (Math.abs(toR - r) > 2 || Math.abs(toC - c) > 2) continue; // Knights jump max 2

    const target = board[to];

    // Check if target square is blocked for current board shape
    const shape = getCurrentBoardShape();
    if (shape !== 'standard' && isBlockedSquare(to, shape)) continue;

    if (target === PIECE_NONE || (target & COLOR_MASK) !== color) {
      moves.push({ from, to });
    }
  }
}

function generateSlidingMoves(
  board: BoardStorage,
  from: number,
  offsets: number[],
  color: number,
  moves: Move[],
  g: Geom
): void {
  const size = g.size;
  const r = rowOf(from, size);
  const c = colOf(from, size);

  for (const offset of offsets) {
    let to = from;
    for (;;) {
      to += offset;

      if (!isValidSquare(to, size)) break;

      // Wrap/continuity check: a sliding ray must progress by exactly one
      // row or one column per step (or a knight leap for nightriders).
      const toR = rowOf(to, size);
      const toC = colOf(to, size);

      if (offset === g.RIGHT || offset === g.LEFT) {
        // HORIZONTAL: row must not change.
        if (toR !== r) break;
      } else if (Math.abs(offset) === size) {
        // VERTICAL: column must not change.
        if (toC !== c) break;
      } else if (Math.abs(offset) === size + 1 || Math.abs(offset) === size - 1) {
        // DIAGONAL: row and column must both change by exactly 1.
        const prev = to - offset;
        const prevR = rowOf(prev, size);
        const prevC = colOf(prev, size);
        if (Math.abs(toR - prevR) !== 1 || Math.abs(toC - prevC) !== 1) break;
      } else if (g.KNIGHT.includes(offset)) {
        // NIGHTRIDER: each step is a knight leap (2/1 or 1/2).
        const prev = to - offset;
        const prevR = rowOf(prev, size);
        const prevC = colOf(prev, size);
        const dr = Math.abs(toR - prevR);
        const dc = Math.abs(toC - prevC);
        if (!((dr === 2 && dc === 1) || (dr === 1 && dc === 2))) break;
      }

      const target = board[to];

      // Check if square is blocked for current board shape
      const shape = getCurrentBoardShape();
      if (shape !== 'standard' && isBlockedSquare(to, shape)) {
        break; // Ray is blocked by a blocked square
      }

      if (target === PIECE_NONE) {
        moves.push({ from: from, to: to });
      } else {
        if ((target & COLOR_MASK) !== color) {
          moves.push({ from: from, to: to }); // Capture
        }
        break; // Blocked by a piece
      }
    }
  }
}

export function makeMove(board: BoardStorage, move: Move): UndoInfo {
  const piece = board[move.from];
  const captured = board[move.to];

  // We assume move is simplified to simple object logic here.
  // Deep state (like hasMoved) is lost in this simple integer array.
  // For a real engine, we use a separate state stack.
  // For now, we just swap.

  if (move.promotion !== undefined) {
    // Pawn promotion: place the promoted piece (keeping color) at destination.
    const color = piece & COLOR_MASK;
    board[move.to] = move.promotion | color;
  } else {
    board[move.to] = piece;
  }
  board[move.from] = PIECE_NONE;

  return { move, captured, piece };
}

export function undoMove(board: BoardStorage, undoInfo: UndoInfo): void {
  const { move, captured, piece } = undoInfo;
  board[move.from] = piece;
  board[move.to] = captured;
}

export function isSquareAttacked(
  board: BoardStorage,
  square: number,
  attackerColor: number
): boolean {
  const g = geomFor(boardSize(board));
  const size = g.size;

  // 1. Pawn Attacks
  // Pawns attack diagonally. From 'attackerColor' perspective.
  const forward = attackerColor === COLOR_WHITE ? g.UP : g.DOWN;
  // Attack sources are behind the target relative to pawn movement.
  const pawnStartOffsets = [-(forward + g.LEFT), -(forward + g.RIGHT)];

  for (const offset of pawnStartOffsets) {
    const from = square + offset;
    if (isValidSquare(from, size)) {
      // Check if square is blocked for current board shape
      const shape = getCurrentBoardShape();
      if (shape !== 'standard' && isBlockedSquare(from, shape)) continue;

      // Check wrap: attack comes from adjacent column
      if (Math.abs(colOf(square, size) - colOf(from, size)) === 1) {
        const piece = board[from];
        if ((piece & COLOR_MASK) === attackerColor && (piece & TYPE_MASK) === PIECE_PAWN)
          return true;
      }
    }
  }

  // 2. Knight/Stepping Attacks
  for (const offset of g.KNIGHT) {
    const from = square - offset; // Jump back
    if (isValidSquare(from, size)) {
      // Check wrap (Manhattan distance approx or row/col diff)
      const r = rowOf(square, size);
      const c = colOf(square, size);
      const fr = rowOf(from, size);
      const fc = colOf(from, size);
      if (Math.abs(r - fr) > 2 || Math.abs(c - fc) > 2) continue;

      // Check if square is blocked for current board shape
      const shape = getCurrentBoardShape();
      if (shape !== 'standard' && isBlockedSquare(from, shape)) continue;

      const piece = board[from];
      if (piece !== PIECE_NONE && (piece & COLOR_MASK) === attackerColor) {
        const type = piece & TYPE_MASK;
        // Check if piece has Knight movement
        if (
          type === PIECE_KNIGHT ||
          type === PIECE_ARCHBISHOP ||
          type === PIECE_CHANCELLOR ||
          type === PIECE_ANGEL
        )
          return true;
      }
    }
  }

  // 3. King Attacks (distance 1)
  for (const offset of g.KING) {
    const from = square - offset;
    if (isValidSquare(from, size)) {
      // Check wrap (distance 1)
      if (Math.abs(colOf(square, size) - colOf(from, size)) > 1) continue;

      // Check if square is blocked for current board shape
      const shape = getCurrentBoardShape();
      if (shape !== 'standard' && isBlockedSquare(from, shape)) continue;

      const piece = board[from];
      if (
        piece !== PIECE_NONE &&
        (piece & COLOR_MASK) === attackerColor &&
        (piece & TYPE_MASK) === PIECE_KING
      )
        return true;
    }
  }

  // 4. Sliding Attacks (Rays)
  // Diagonals (Bishop, Queen, Archbishop, Angel)
  if (
    checkRayAttacks(board, square, g.BISHOP, attackerColor, [
      PIECE_BISHOP,
      PIECE_QUEEN,
      PIECE_ARCHBISHOP,
      PIECE_ANGEL,
    ], g)
  )
    return true;

  // Orthogonals (Rook, Queen, Chancellor, Angel)
  if (
    checkRayAttacks(board, square, g.ROOK, attackerColor, [
      PIECE_ROOK,
      PIECE_QUEEN,
      PIECE_CHANCELLOR,
      PIECE_ANGEL,
    ], g)
  )
    return true;

  // 5. Nightrider Sliding Knight Attacks
  if (checkRayAttacks(board, square, g.KNIGHT, attackerColor, [PIECE_NIGHTRIDER], g))
    return true;

  return false;
}

function checkRayAttacks(
  board: BoardStorage,
  square: number,
  ranges: number[],
  attackerColor: number,
  validTypes: number[],
  g: Geom
): boolean {
  const size = g.size;

  for (const offset of ranges) {
    let curr = square;
    for (;;) {
      curr += offset;
      if (!isValidSquare(curr, size)) break;

      // Wrap checks
      const cr = rowOf(curr, size);
      const cc = colOf(curr, size);
      const pr = rowOf(curr - offset, size);
      const pc = colOf(curr - offset, size);

      // Should be continuous (dist 1) for non-knight offsets
      if (g.KNIGHT.includes(offset)) {
        const dr = Math.abs(cr - pr);
        const dc = Math.abs(cc - pc);
        if (!((dr === 2 && dc === 1) || (dr === 1 && dc === 2))) break;
      } else {
        if (Math.abs(cr - pr) > 1 || Math.abs(cc - pc) > 1) break;
      }

      const piece = board[curr];

      // Check if square is blocked for current board shape
      const shape = getCurrentBoardShape();
      if (shape !== 'standard' && isBlockedSquare(curr, shape)) {
        break; // Attack is blocked by a blocked square
      }

      if (piece !== PIECE_NONE) {
        if ((piece & COLOR_MASK) === attackerColor) {
          const type = piece & TYPE_MASK;
          if (validTypes.includes(type)) return true;
        }
        break; // Blocked by any piece (friend or foe)
      }
    }
  }
  return false;
}

export function findKing(board: BoardStorage, color: number): number {
  const size = boardSize(board);
  for (let i = 0; i < size * size; i++) {
    if ((board[i] & TYPE_MASK) === PIECE_KING && (board[i] & COLOR_MASK) === color) return i;
  }
  return -1;
}

export function isInCheck(board: BoardStorage, color: number): boolean {
  const kingPos = findKing(board, color);
  const enemyColor = color === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
  return isSquareAttacked(board, kingPos, enemyColor);
}

// Static Exchange Evaluation (SEE) - Full Swap Algorithm
// Determines if a capture chain is profitable.
export function see(board: BoardStorage, move: Move): number {
  const g = geomFor(boardSize(board));
  const PIECE_VALUES: Record<number, number> = {
    [PIECE_PAWN]: 100,
    [PIECE_KNIGHT]: 320,
    [PIECE_BISHOP]: 330,
    [PIECE_ROOK]: 500,
    [PIECE_QUEEN]: 900,
    [PIECE_KING]: 20000,
    [PIECE_ARCHBISHOP]: 600,
    [PIECE_CHANCELLOR]: 700,
    [PIECE_ANGEL]: 1000,
    [PIECE_NIGHTRIDER]: 600,
  };

  const target = board[move.to];
  if (target === PIECE_NONE) return 0; // Not a capture

  const piece = board[move.from];
  if (piece === PIECE_NONE) return 0;

  const gain: number[] = [];
  let d = 0;
  let color = piece & COLOR_MASK;
  const to = move.to;

  // Track squares whose pieces have been "removed" (captured/moved away)
  const usedSquares = new Set<number>();
  usedSquares.add(move.from);

  // Initial gain: value of captured piece
  gain[d] = PIECE_VALUES[target & TYPE_MASK] || 0;

  // The first "attacker on square" is the moving piece
  let attackerPiece: number | null = piece;
  let attackerType = piece & TYPE_MASK;

  // Swap loop
  while (attackerPiece !== null) {
    d++;
    // Gain[d] = value of piece just captured (previous attacker) - gain[d-1]
    gain[d] = (PIECE_VALUES[attackerType] || 0) - gain[d - 1];

    // Pruning: if the side to move cannot improve, stop
    if (Math.max(-gain[d - 1], gain[d]) < 0) break;

    // Swap side
    color = color === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;

    // Find Least Valuable Attacker (LVA) of 'color' attacking 'to'
    const lva = getLVA(board, to, color, usedSquares, g); // g passed

    if (lva === null) break; // No more attackers

    usedSquares.add(lva.square);
    attackerPiece = lva.piece;
    attackerType = lva.piece & TYPE_MASK;
  }

  // Minimax the gain array
  while (--d) {
    gain[d - 1] = -Math.max(-gain[d - 1], gain[d]);
  }

  return gain[0];
}

// Find the Least Valuable Attacker of a square, ignoring pieces in usedSquares
function getLVA(
  board: BoardStorage,
  square: number,
  attackerColor: number,
  usedSquares: Set<number>,
  g: Geom
): { square: number; piece: number } | null {
  const size = g.size;

  // Pawns first (LVA)
  const forward = attackerColor === COLOR_WHITE ? g.UP : g.DOWN;
  const pawnOrigins = [square - forward - g.LEFT, square - forward + g.RIGHT]; // Diagonal backwards from target
  for (const pSq of pawnOrigins) {
    if (!isValidSquare(pSq, size) || usedSquares.has(pSq)) continue;
    if (Math.abs(colOf(square, size) - colOf(pSq, size)) !== 1) continue; // Wrap check
    const p = board[pSq];
    if (p !== PIECE_NONE && (p & COLOR_MASK) === attackerColor && (p & TYPE_MASK) === PIECE_PAWN) {
      return { square: pSq, piece: p };
    }
  }

  // Knights (and pieces with Knight movement)
  for (const offset of g.KNIGHT) {
    const from = square + offset;
    if (!isValidSquare(from, size) || usedSquares.has(from)) continue;
    if (Math.abs(rowOf(square, size) - rowOf(from, size)) > 2) continue;
    if (Math.abs(colOf(square, size) - colOf(from, size)) > 2) continue;
    const p = board[from];
    if (p !== PIECE_NONE && (p & COLOR_MASK) === attackerColor) {
      const t = p & TYPE_MASK;
      if (
        t === PIECE_KNIGHT ||
        t === PIECE_ARCHBISHOP ||
        t === PIECE_CHANCELLOR ||
        t === PIECE_ANGEL
      ) {
        return { square: from, piece: p };
      }
    }
  }

  // Bishops/Diagonals (and Archbishop, Queen, Angel)
  const diagResult = findRayLVA(board, square, g.BISHOP, attackerColor, usedSquares, [
    PIECE_BISHOP,
    PIECE_ARCHBISHOP,
    PIECE_QUEEN,
    PIECE_ANGEL,
  ], g);
  if (diagResult) return diagResult;

  // Rooks/Orthogonals (and Chancellor, Queen, Angel)
  const orthResult = findRayLVA(board, square, g.ROOK, attackerColor, usedSquares, [
    PIECE_ROOK,
    PIECE_CHANCELLOR,
    PIECE_QUEEN,
    PIECE_ANGEL,
  ], g);
  if (orthResult) return orthResult;

  // King (always last, highest value among simple attackers)
  for (const offset of g.KING) {
    const from = square + offset;
    if (!isValidSquare(from, size) || usedSquares.has(from)) continue;
    if (Math.abs(colOf(square, size) - colOf(from, size)) > 1) continue;
    const p = board[from];
    if (p !== PIECE_NONE && (p & COLOR_MASK) === attackerColor && (p & TYPE_MASK) === PIECE_KING) {
      return { square: from, piece: p };
    }
  }

  return null;
}

// Find least valuable slider along rays
function findRayLVA(
  board: BoardStorage,
  square: number,
  offsets: number[],
  attackerColor: number,
  usedSquares: Set<number>,
  validTypes: number[],
  g: Geom
): { square: number; piece: number } | null {
  const size = g.size;
  let bestLVA: { square: number; piece: number } | null = null;
  let bestValue = Infinity;

  const PIECE_VALUES_SIMPLE: Record<number, number> = {
    [PIECE_PAWN]: 100,
    [PIECE_KNIGHT]: 320,
    [PIECE_BISHOP]: 330,
    [PIECE_ROOK]: 500,
    [PIECE_QUEEN]: 900,
    [PIECE_KING]: 20000,
    [PIECE_ARCHBISHOP]: 600,
    [PIECE_CHANCELLOR]: 700,
    [PIECE_ANGEL]: 1000,
  };

  for (const offset of offsets) {
    let curr = square;
    for (;;) {
      curr += offset;
      if (!isValidSquare(curr, size)) break;

      // Wrap check
      const prev = curr - offset;
      if (Math.abs(rowOf(curr, size) - rowOf(prev, size)) > 1) break;
      if (Math.abs(colOf(curr, size) - colOf(prev, size)) > 1) break;

      if (usedSquares.has(curr)) continue; // Skip used pieces (X-ray through)

      const p = board[curr];
      if (p !== PIECE_NONE) {
        if ((p & COLOR_MASK) === attackerColor) {
          const t = p & TYPE_MASK;
          if (validTypes.includes(t)) {
            const val = PIECE_VALUES_SIMPLE[t] || 9999;
            if (val < bestValue) {
              bestValue = val;
              bestLVA = { square: curr, piece: p };
            }
          }
        }
        break; // Blocked by any non-used piece
      }
    }
  }
  return bestLVA;
}

/**
 * Threat information for enhanced threat detection
 */
export interface ThreatInfo {
  /** Square being attacked */
  targetSquare: number;
  /** Square the attacker is on */
  attackerSquare: number;
  /** Type of attacker piece */
  attackerType: number;
  /** Color of attacker */
  attackerColor: number;
  /** Type of target piece (if any) */
  targetType: number;
  /** Color of target piece (if any) */
  targetColor: number;
  /** Whether this is a direct attack (true) or X-ray/hidden attack (false) */
  isDirect: boolean;
  /** For X-ray: the piece that was in the way (if any) */
  blockerSquare?: number;
  /** For X-ray: the valuable piece behind the blocker */
  xrayTargetSquare?: number;
  /** For X-ray: the type of the x-ray target */
  xrayTargetType?: number;
}

/**
 * Get ALL threats for a given color, including X-ray/hidden attacks.
 */
export function getAllThreats(board: BoardStorage, color: number): ThreatInfo[] {
  const g = geomFor(boardSize(board));
  const size = g.size;
  const threats: ThreatInfo[] = [];
  const enemyColor = color === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;

  // Iterate all pieces of the given color
  for (let from = 0; from < size * size; from++) {
    const piece = board[from];
    if (piece === PIECE_NONE) continue;
    if ((piece & COLOR_MASK) !== color) continue;

    const type = piece & TYPE_MASK;

    // Pawn threats
    if (type === PIECE_PAWN) {
      // Pawn attacks (no X-ray for pawns)
      const forward = color === COLOR_WHITE ? g.UP : g.DOWN;
      const captureOffsets = [forward + g.LEFT, forward + g.RIGHT];
      for (const offset of captureOffsets) {
        const to = from + offset;
        if (!isValidSquare(to, size)) continue;
        if (Math.abs(colOf(from, size) - colOf(to, size)) !== 1) continue; // Wrap check

        const target = board[to];
        if (target !== PIECE_NONE && (target & COLOR_MASK) === enemyColor) {
          threats.push({
            targetSquare: to,
            attackerSquare: from,
            attackerType: type,
            attackerColor: color,
            targetType: target & TYPE_MASK,
            targetColor: enemyColor,
            isDirect: true,
          });
        }
      }
      continue;
    }

    // Knight/King/Stepping pieces - no X-ray
    const steppingOffsets =
      type === PIECE_KNIGHT ||
        type === PIECE_ARCHBISHOP ||
        type === PIECE_CHANCELLOR ||
        type === PIECE_ANGEL
        ? g.KNIGHT
        : type === PIECE_KING
          ? g.KING
          : null;

    if (steppingOffsets) {
      const r = rowOf(from, size);
      const c = colOf(from, size);
      for (const offset of steppingOffsets) {
        const to = from + offset;
        if (!isValidSquare(to, size)) continue;
        const toR = rowOf(to, size);
        const toC = colOf(to, size);
        if (Math.abs(toR - r) > 2 || Math.abs(toC - c) > 2) continue; // Knights max 2

        const shape = getCurrentBoardShape();
        if (shape !== 'standard' && isBlockedSquare(to, shape)) continue;

        const target = board[to];
        if (target !== PIECE_NONE && (target & COLOR_MASK) === enemyColor) {
          threats.push({
            targetSquare: to,
            attackerSquare: from,
            attackerType: type,
            attackerColor: color,
            targetType: target & TYPE_MASK,
            targetColor: enemyColor,
            isDirect: true,
          });
        }
      }
    }

    // Sliding pieces - BISHOP, ROOK, QUEEN, ARCHBISHOP, CHANCELLOR, ANGEL, NIGHTRIDER
    // These can have X-ray attacks!
    const slidingTypes = [
      PIECE_BISHOP,
      PIECE_ROOK,
      PIECE_QUEEN,
      PIECE_ARCHBISHOP,
      PIECE_CHANCELLOR,
      PIECE_ANGEL,
      PIECE_NIGHTRIDER,
    ];
    if (!slidingTypes.includes(type)) continue;

    // Determine which offsets this piece uses
    const offsets: number[] = [];
    if (
      type === PIECE_BISHOP ||
      type === PIECE_ARCHBISHOP ||
      type === PIECE_QUEEN ||
      type === PIECE_ANGEL
    ) {
      offsets.push(...g.BISHOP);
    }
    if (
      type === PIECE_ROOK ||
      type === PIECE_CHANCELLOR ||
      type === PIECE_QUEEN ||
      type === PIECE_ANGEL
    ) {
      offsets.push(...g.ROOK);
    }
    if (type === PIECE_NIGHTRIDER) {
      offsets.push(...g.KNIGHT);
    }

    // Scan each ray
    for (const offset of offsets) {
      let curr = from;

      for (;;) {
        curr += offset;
        if (!isValidSquare(curr, size)) break;

        // Wrap/continuity check (same as generateSlidingMoves)
        const cr = rowOf(curr, size);
        const cc = colOf(curr, size);
        const prev = curr - offset;
        const pr = rowOf(prev, size);
        const pc = colOf(prev, size);

        if (g.KNIGHT.includes(offset)) {
          const dr = Math.abs(cr - pr);
          const dc = Math.abs(cc - pc);
          if (!((dr === 2 && dc === 1) || (dr === 1 && dc === 2))) break;
        } else {
          if (Math.abs(cr - pr) > 1 || Math.abs(cc - pc) > 1) break;
        }

        const shape = getCurrentBoardShape();
        if (shape !== 'standard' && isBlockedSquare(curr, shape)) {
          break;
        }

        const target = board[curr];
        if (target === PIECE_NONE) {
          // Empty square - continue ray
          continue;
        }

        const targetColor = target & COLOR_MASK;
        const targetType = target & TYPE_MASK;

        if (targetColor === enemyColor) {
          // Direct attack on enemy piece
          threats.push({
            targetSquare: curr,
            attackerSquare: from,
            attackerType: type,
            attackerColor: color,
            targetType: targetType,
            targetColor: enemyColor,
            isDirect: true,
          });

          // Check for X-RAY: if there's a blocker behind this target, keep scanning
          // (Enemy piece doesn't block X-ray to piece behind it? No, enemy pieces DO block.
          // X-ray means: our piece -> our piece -> enemy piece)
          // So we continue scanning PAST the first enemy piece ONLY if it's not the king?
          // Actually standard X-ray: own piece blocks line to enemy piece behind.
          // So we break here for direct, but we already recorded it.
          break;
        } else {
          // Our own piece blocking the ray - potential X-RAY target behind it!
          // We don't need to track it here; the SECOND PASS handles X-ray detection properly
          continue;
        }
      }
    }

    // SECOND PASS: X-Ray detection for this piece
    for (const offset of offsets) {
      let curr = from;
      let ourBlockerSquare: number | null = null;

      for (;;) {
        curr += offset;
        if (!isValidSquare(curr, size)) break;

        const cr = rowOf(curr, size);
        const cc = colOf(curr, size);
        const prev = curr - offset;
        const pr = rowOf(prev, size);
        const pc = colOf(prev, size);

        if (g.KNIGHT.includes(offset)) {
          const dr = Math.abs(cr - pr);
          const dc = Math.abs(cc - pc);
          if (!((dr === 2 && dc === 1) || (dr === 1 && dc === 2))) break;
        } else {
          if (Math.abs(cr - pr) > 1 || Math.abs(cc - pc) > 1) break;
        }

        const shape = getCurrentBoardShape();
        if (shape !== 'standard' && isBlockedSquare(curr, shape)) {
          break;
        }

        const target = board[curr];
        if (target === PIECE_NONE) {
          continue;
        }

        const targetColor = target & COLOR_MASK;
        const targetType = target & TYPE_MASK;

        if (targetColor === color) {
          // Our own piece - potential blocker for X-ray
          if (ourBlockerSquare === null) {
            ourBlockerSquare = curr;
          }
          // If we already have a blocker, this is a second own piece - no X-ray through two own pieces
          continue;
        } else {
          // Enemy piece
          if (ourBlockerSquare !== null) {
            // X-RAY ATTACK! Our piece at ourBlockerSquare is blocking line to this enemy piece
            // This is a THREAT if the blocker moves (discovered attack)
            threats.push({
              targetSquare: curr,
              attackerSquare: from,
              attackerType: type,
              attackerColor: color,
              targetType: targetType,
              targetColor: enemyColor,
              isDirect: false,
              blockerSquare: ourBlockerSquare,
              xrayTargetSquare: curr,
              xrayTargetType: targetType,
            });

            // Also check if the blocker itself is pinned to something valuable behind it
            // (i.e., moving blocker exposes king or queen behind it)
            // We scan BEYOND the enemy piece to see if there's a king/queen
            let beyond = curr + offset;
            while (isValidSquare(beyond, size)) {
              const br = rowOf(beyond, size);
              const bc = colOf(beyond, size);
              const bprev = beyond - offset;
              const bpr = rowOf(bprev, size);
              const bpc = colOf(bprev, size);

              if (g.KNIGHT.includes(offset)) {
                const dr = Math.abs(br - bpr);
                const dc = Math.abs(bc - bpc);
                if (!((dr === 2 && dc === 1) || (dr === 1 && dc === 2))) break;
              } else {
                if (Math.abs(br - bpr) > 1 || Math.abs(bc - bpc) > 1) break;
              }

              const shape = getCurrentBoardShape();
              if (shape !== 'standard' && isBlockedSquare(beyond, shape)) break;

              const beyondPiece = board[beyond];
              if (beyondPiece !== PIECE_NONE) {
                const beyondColor = beyondPiece & COLOR_MASK;
                const beyondType = beyondPiece & TYPE_MASK;
                if (beyondColor === enemyColor && (beyondType === PIECE_KING || beyondType === PIECE_QUEEN)) {
                  // PIN THREAT: Our blocker is PINNED to the enemy king/queen behind!
                  const blockerPiece = board[ourBlockerSquare];
                  const blockerType = blockerPiece !== PIECE_NONE ? blockerPiece & TYPE_MASK : 0;
                  threats.push({
                    targetSquare: beyond,
                    attackerSquare: ourBlockerSquare,
                    attackerType: blockerType,
                    attackerColor: color,
                    targetType: beyondType,
                    targetColor: enemyColor,
                    isDirect: false,
                    blockerSquare: ourBlockerSquare,
                    xrayTargetSquare: beyond,
                    xrayTargetType: beyondType,
                  });
                }
                break;
              }
              beyond += offset;
            }
          }
          // Enemy piece blocks the ray regardless
          break;
        }
      }
    }
  }

  return threats;
}

/**
 * Get threats specifically targeting the opponent's king (checks and discovered checks)
 */
export function getKingThreats(board: BoardStorage, color: number): ThreatInfo[] {
  // Find enemy king
  let enemyKingSquare = -1;
  const size = boardSize(board);
  const enemyColor = color === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
  for (let i = 0; i < size * size; i++) {
    const p = board[i];
    if (p !== PIECE_NONE && (p & COLOR_MASK) === enemyColor && (p & TYPE_MASK) === PIECE_KING) {
      enemyKingSquare = i;
      break;
    }
  }
  if (enemyKingSquare === -1) return [];

  const allThreats = getAllThreats(board, color);
  return allThreats.filter(t => t.targetSquare === enemyKingSquare || t.xrayTargetSquare === enemyKingSquare);
}

/**
 * Get X-ray threats (hidden attacks through own pieces)
 */
export function getXRayThreats(board: BoardStorage, color: number): ThreatInfo[] {
  const allThreats = getAllThreats(board, color);
  return allThreats.filter(t => !t.isDirect);
}

/**
 * Get discovered attack potential: moving blocker would reveal attack
 */
export function getDiscoveredAttackPotential(board: BoardStorage, color: number): ThreatInfo[] {
  const allThreats = getAllThreats(board, color);
  return allThreats.filter(t => !t.isDirect && t.blockerSquare !== undefined);
}
