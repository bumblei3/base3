import { expect, test, describe, beforeEach } from "vitest";
import { Game } from "@trischach/game";
import { FACTION, generateBoard } from "@trischach/board";
import { Piece, PIECE_TYPE } from "@trischach/pieces";
import { Hex } from "@trischach/hex";

describe("simulateMove / undoMove", () => {
  let game;

  beforeEach(() => {
    game = new Game();
    game.init(generateBoard());
    game.pieces = [];
    game._rebuildOccupiedMap();
    game.rpsEnabled = true;
  });

  test("simulateMove: normal move can be undone", () => {
    const p = new Piece(PIECE_TYPE.KNIGHT, FACTION.FIRE, new Hex(0, 0));
    game.pieces = [p];
    game._rebuildOccupiedMap();

    const undo = game.simulateMove(p, new Hex(1, 0));
    expect(p.pos.equals(new Hex(1, 0))).toBe(true);
    expect(p.hasMoved).toBe(true);

    game.undoMove(undo);
    expect(p.pos.equals(new Hex(0, 0))).toBe(true);
    expect(p.hasMoved).toBe(false);
  });

  test("simulateMove: attack (advantage) can be undone", () => {
    const attacker = new Piece(PIECE_TYPE.PAWN, FACTION.FIRE, new Hex(0, 1));
    const defender = new Piece(PIECE_TYPE.PAWN, FACTION.NATURE, new Hex(0, 0));
    game.pieces = [attacker, defender];
    game._rebuildOccupiedMap();

    const undo = game.simulateMove(attacker, new Hex(0, 0));
    expect(defender.alive).toBe(false);
    expect(attacker.pos.equals(new Hex(0, 0))).toBe(true);

    game.undoMove(undo);
    expect(defender.alive).toBe(true);
    expect(attacker.pos.equals(new Hex(0, 1))).toBe(true);
  });

  test("simulateMove: attack (disadvantage) can be undone", () => {
    const attacker = new Piece(PIECE_TYPE.PAWN, FACTION.FIRE, new Hex(0, 1));
    const defender = new Piece(PIECE_TYPE.PAWN, FACTION.WATER, new Hex(0, 0));
    game.pieces = [attacker, defender];
    game._rebuildOccupiedMap();

    const undo = game.simulateMove(attacker, new Hex(0, 0));
    expect(attacker.alive).toBe(false);
    expect(defender.alive).toBe(true);

    game.undoMove(undo);
    expect(attacker.alive).toBe(true);
    expect(attacker.pos.equals(new Hex(0, 1))).toBe(true);
  });

  test("simulateMove: king elimination can be undone", () => {
    const attacker = new Piece(PIECE_TYPE.QUEEN, FACTION.FIRE, new Hex(0, 1));
    const enemyKing = new Piece(PIECE_TYPE.KING, FACTION.NATURE, new Hex(0, 0));
    const extraPiece = new Piece(
      PIECE_TYPE.PAWN,
      FACTION.NATURE,
      new Hex(1, 0),
    );
    game.pieces = [attacker, enemyKing, extraPiece];
    game._rebuildOccupiedMap();

    const undo = game.simulateMove(attacker, new Hex(0, 0));
    expect(enemyKing.alive).toBe(false);
    expect(extraPiece.alive).toBe(false);
    expect(game.eliminatedFactions.has(FACTION.NATURE)).toBe(true);

    game.undoMove(undo);
    expect(enemyKing.alive).toBe(true);
    expect(extraPiece.alive).toBe(true);
    expect(game.eliminatedFactions.has(FACTION.NATURE)).toBe(false);
  });

  test("simulateMove: does not change turn (side-effect free) and undoMove restores exact state", () => {
    const p = new Piece(PIECE_TYPE.KNIGHT, FACTION.FIRE, new Hex(0, 0));
    game.pieces = [p];
    game._rebuildOccupiedMap();
    expect(game.currentFaction).toBe(FACTION.FIRE);

    const undo = game.simulateMove(p, new Hex(1, 0));
    // simulateMove must NOT advance the turn — it is a side-effect-free
    // simulation used for AI lookahead and legality checks, and advancing the
    // turn here previously corrupted the real game state.
    expect(game.currentFaction).toBe(FACTION.FIRE);
    expect(game.currentFactionIdx).toBe(0);

    game.undoMove(undo);
    expect(game.currentFaction).toBe(FACTION.FIRE);
  });

  test("multiple simulate/undo cycles are stable", () => {
    const p = new Piece(PIECE_TYPE.KNIGHT, FACTION.FIRE, new Hex(0, 0));
    game.pieces = [p];
    game._rebuildOccupiedMap();

    for (let i = 0; i < 5; i++) {
      const undo = game.simulateMove(p, new Hex(1, 0));
      game.undoMove(undo);
    }

    expect(p.pos.equals(new Hex(0, 0))).toBe(true);
    expect(p.hasMoved).toBe(false);
  });

  test("capturedPieces restored after undo", () => {
    const attacker = new Piece(PIECE_TYPE.PAWN, FACTION.FIRE, new Hex(0, 1));
    const defender = new Piece(PIECE_TYPE.PAWN, FACTION.NATURE, new Hex(0, 0));
    game.pieces = [attacker, defender];
    game._rebuildOccupiedMap();

    const undo = game.simulateMove(attacker, new Hex(0, 0));
    expect(game.capturedPieces[FACTION.FIRE].length).toBe(1);

    game.undoMove(undo);
    expect(game.capturedPieces[FACTION.FIRE].length).toBe(0);
  });

  test("simulateMove: king elimination does not resurrect already-dead pieces on undo", () => {
    const attacker = new Piece(PIECE_TYPE.QUEEN, FACTION.FIRE, new Hex(0, 1));
    const enemyKing = new Piece(PIECE_TYPE.KING, FACTION.NATURE, new Hex(0, 0));
    // A Nature pawn that was already captured in a previous move (dead before
    // the king elimination).
    const alreadyDeadPawn = new Piece(
      PIECE_TYPE.PAWN,
      FACTION.NATURE,
      new Hex(1, 0),
    );
    alreadyDeadPawn.alive = false;
    game.pieces = [attacker, enemyKing, alreadyDeadPawn];
    game._rebuildOccupiedMap();

    const undo = game.simulateMove(attacker, new Hex(0, 0));
    // Both king and the (already dead) pawn are marked dead by elimination.
    expect(enemyKing.alive).toBe(false);
    expect(alreadyDeadPawn.alive).toBe(false);
    expect(game.eliminatedFactions.has(FACTION.NATURE)).toBe(true);

    game.undoMove(undo);
    // King comes back, but the pawn that was dead BEFORE the elimination must
    // stay dead (previously it was wrongly resurrected).
    expect(enemyKing.alive).toBe(true);
    expect(alreadyDeadPawn.alive).toBe(false);
    expect(game.eliminatedFactions.has(FACTION.NATURE)).toBe(false);
  });
});
