/**
 * TriSchach Game lifecycle + move-flow domain tests.
 *
 * Covers:
 *  - init / turn order (fire -> water -> nature)
 *  - handleCellClick select -> move (quiet + combat w/ RPS)
 *  - king elimination eliminates the whole faction
 *  - pawn promotion flow
 *  - getPieceAt / getAlivePieces
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { Hex } from '@trischach/hex';
import { generateBoard, FACTION } from '@trischach/board';
import { Piece, PIECE_TYPE } from '@trischach/pieces';
import { Game, GAME_STATE } from '@trischach/game';

function freshGame(): Game {
  const g = new Game();
  g.init(generateBoard());
  return g;
}

describe('TriSchach Game init + turn order', () => {
  test('init sets fire to move first in SELECT_PIECE state', () => {
    const g = freshGame();
    expect(g.currentFaction).toBe(FACTION.FIRE);
    expect(g.state).toBe(GAME_STATE.SELECT_PIECE);
    expect(g.getAlivePieces().length).toBe(45);
  });

  test('turn rotates fire -> water -> nature -> fire', () => {
    const g = freshGame();
    expect(g.currentFaction).toBe(FACTION.FIRE);
    g['_nextTurn']();
    expect(g.currentFaction).toBe(FACTION.WATER);
    g['_nextTurn']();
    expect(g.currentFaction).toBe(FACTION.NATURE);
    g['_nextTurn']();
    expect(g.currentFaction).toBe(FACTION.FIRE);
  });
});

describe('TriSchach piece selection', () => {
  test('selecting own piece enters SELECT_TARGET with legal moves', () => {
    const g = freshGame();
    const myPawn = g.getAlivePieces().find(
      (p) => p.faction === FACTION.FIRE && p.type === PIECE_TYPE.PAWN,
    )!;
    const res = g.handleCellClick(myPawn.pos);
    expect(res?.action).toBe('select');
    expect(g.state).toBe(GAME_STATE.SELECT_TARGET);
    expect(g.selectedPiece?.id).toBe(myPawn.id);
    expect(g.validMoves.length + g.validAttacks.length).toBeGreaterThan(0);
  });

  test('selecting an enemy or empty cell deselects', () => {
    const g = freshGame();
    const enemy = g
      .getAlivePieces()
      .find((p) => p.faction === FACTION.WATER)!;
    const res = g.handleCellClick(enemy.pos);
    expect(res?.action).toBe('deselect');
    expect(g.selectedPiece).toBeNull();
    expect(g.state).toBe(GAME_STATE.SELECT_PIECE);
  });
});

describe('TriSchach move + combat (RPS)', () => {
  test('a quiet move relocates the piece and advances the turn', () => {
    const g = freshGame();
    const pawn = g
      .getAlivePieces()
      .find((p) => p.faction === FACTION.FIRE && p.type === PIECE_TYPE.PAWN)!;
    const before = pawn.pos.key;
    g.handleCellClick(pawn.pos); // select
    const target = g.validMoves[0];
    const res = g.handleCellClick(target); // move
    expect(res?.action).toBe('move');
    expect(pawn.pos.key).toBe(target.key);
    expect(pawn.pos.key).not.toBe(before);
    expect(g.currentFaction).toBe(FACTION.WATER);
    expect(g.state).toBe(GAME_STATE.SELECT_PIECE);
  });

  test('combat with advantage captures the defender (attacker wins)', () => {
    const g = freshGame();
    // A=Hex(-2,2), B=Hex(-1,2) are adjacent and on-board.
    // water attacker vs fire defender => water>fire => advantage
    const A = new Hex(-2, 2);
    const B = new Hex(-1, 2);
    const attacker = new Piece(PIECE_TYPE.ROOK, FACTION.WATER, A);
    const defender = new Piece(PIECE_TYPE.PAWN, FACTION.FIRE, B);
    g.pieces = [attacker, defender];
    g['_rebuildOccupiedMap']();
    g.currentFactionIdx = 1; // WATER
    g.currentFaction = FACTION.WATER;
    g.handleCellClick(attacker.pos);
    const res = g.handleCellClick(defender.pos);
    expect(res?.action).toBe('combat');
    expect(res?.rpsResult).toBe('advantage');
    expect(defender.alive).toBe(false);
    expect(attacker.pos.key).toBe(defender.pos.key);
    expect(g.capturedPieces[FACTION.WATER].some((p) => p.id === defender.id)).toBe(
      true,
    );
  });

  test('combat with disadvantage: attacker dies, defender survives', () => {
    const g = freshGame();
    // A=Hex(-2,2), B=Hex(-1,2) adjacent on-board.
    // fire attacker vs water defender => fire<water => disadvantage
    const A = new Hex(-2, 2);
    const B = new Hex(-1, 2);
    const attacker = new Piece(PIECE_TYPE.ROOK, FACTION.FIRE, A);
    const defender = new Piece(PIECE_TYPE.PAWN, FACTION.WATER, B);
    g.pieces = [attacker, defender];
    g['_rebuildOccupiedMap']();
    g.currentFactionIdx = 0; // FIRE
    g.currentFaction = FACTION.FIRE;
    g.handleCellClick(attacker.pos);
    const res = g.handleCellClick(defender.pos);
    expect(res?.action).toBe('combat');
    expect(res?.rpsResult).toBe('disadvantage');
    expect(attacker.alive).toBe(false);
    expect(defender.alive).toBe(true);
    expect(defender.pos.key).toBe(B.key);
  });
});

describe('TriSchach king elimination', () => {
  test('capturing a king eliminates the entire faction', () => {
    const g = freshGame();
    // A=Hex(-2,2) attacker, B=Hex(-1,2) enemy king, C=Hex(-3,3) enemy pawn
    const A = new Hex(-2, 2);
    const B = new Hex(-1, 2);
    const C = new Hex(-3, 3);
    const attacker = new Piece(PIECE_TYPE.ROOK, FACTION.WATER, A);
    const enemyKing = new Piece(PIECE_TYPE.KING, FACTION.FIRE, B);
    const enemyPawn = new Piece(PIECE_TYPE.PAWN, FACTION.FIRE, C);
    g.pieces = [attacker, enemyKing, enemyPawn];
    g['_rebuildOccupiedMap']();
    g.currentFactionIdx = 1; // WATER
    g.currentFaction = FACTION.WATER;
    g.handleCellClick(attacker.pos);
    const res = g.handleCellClick(enemyKing.pos);
    expect(res?.elimination).toBe(FACTION.FIRE);
    expect(g.eliminatedFactions.has(FACTION.FIRE)).toBe(true);
    expect(enemyKing.alive).toBe(false);
    expect(enemyPawn.alive).toBe(false); // whole faction wiped
  });
});

describe('TriSchach pawn promotion', () => {
  test('a pawn reaching the promotion rank triggers PROMOTION state', () => {
    const g = freshGame();
    // fire promotes at r <= 0; place a fire pawn one step from promotion.
    // Hex(-1,1) is on-board; a forward step (1,-1) lands on Hex(0,0) (r=0).
    const pawn = new Piece(PIECE_TYPE.PAWN, FACTION.FIRE, new Hex(-1, 1));
    g.pieces = [pawn];
    g['_rebuildOccupiedMap']();
    g.currentFaction = FACTION.FIRE;
    g.handleCellClick(pawn.pos);
    const promoTarget = g.validMoves.find((m) => m.r <= 0);
    expect(promoTarget).toBeDefined();
    const res = g.handleCellClick(promoTarget!);
    expect(res?.promotion).toBe(true);
    expect(g.state).toBe(GAME_STATE.PROMOTION);
    expect(g.pendingPromotion?.id).toBe(pawn.id);
  });

  test('completePromotion transforms the pawn and resumes play', () => {
    const g = freshGame();
    const pawn = new Piece(PIECE_TYPE.PAWN, FACTION.FIRE, new Hex(-1, 1));
    g.pieces = [pawn];
    g['_rebuildOccupiedMap']();
    g.currentFaction = FACTION.FIRE;
    g.handleCellClick(pawn.pos);
    const promoTarget = g.validMoves.find((m) => m.r <= 0)!;
    g.handleCellClick(promoTarget);
    const res = g.completePromotion(PIECE_TYPE.QUEEN);
    expect(res?.action).toBe('promotion');
    expect(pawn.type).toBe(PIECE_TYPE.QUEEN);
    expect(pawn.symbol).toBe('♛');
    expect(g.state).toBe(GAME_STATE.SELECT_PIECE);
    expect(g.currentFaction).toBe(FACTION.WATER); // turn advanced
  });
});

describe('TriSchach board queries', () => {
  test('getPieceAt returns the piece occupying a hex or null', () => {
    const g = freshGame();
    const p = g.getAlivePieces()[0];
    expect(g.getPieceAt(p.pos)?.id).toBe(p.id);
    expect(g.getPieceAt(new Hex(999, 999))).toBeNull();
  });
});
