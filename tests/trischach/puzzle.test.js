/**
 * puzzle.test.js - Tests for TriSchach Puzzle generation (mate detection)
 */
import { expect, test, describe } from "vitest";
import { Game, GAME_STATE } from "@trischach/game";
import { Hex } from "@trischach/hex";
import { FACTION, generateBoard } from "@trischach/board";
import { PIECE_TYPE, Piece } from "@trischach/pieces";
import { findImmediateMate } from "@trischach/puzzle";

describe("Puzzle: findImmediateMate", () => {
  test("detects mate when a king capture eliminates an enemy faction (not just next-in-turn)", () => {
    // Fire king adjacent to Nature king. Fire is to move and can attack
    // Nature's king. RPS: fire beats nature -> Nature eliminated (= mate in
    // TriSchach). The faction that gets mated is NOT the next one in turn
    // order (Water is), so the old code missed it.
    const game = new Game();
    game.init(generateBoard());
    game.pieces = [
      new Piece(PIECE_TYPE.KING, FACTION.FIRE, new Hex(0, 7)),
      new Piece(PIECE_TYPE.KING, FACTION.NATURE, new Hex(0, 6)),
      new Piece(PIECE_TYPE.KING, FACTION.WATER, new Hex(1, 0)),
    ];
    game._rebuildOccupiedMap();
    game.currentFaction = FACTION.FIRE;
    game.currentFactionIdx = 0;
    game.state = GAME_STATE.SELECT_PIECE;
    game.eliminatedFactions = new Set();

    const mate = findImmediateMate(game);
    expect(mate).not.toBeNull();
    expect(mate.isMate).toBe(true);
    // The mating piece must be the Fire king moving onto Nature's king.
    expect(mate.faction).toBe(FACTION.FIRE);
    expect(mate.to).toEqual({ q: 0, r: 6 });
  });

  test("returns null when no enemy can be mated", () => {
    // Isolated kings, no attacks possible between Fire and the others.
    const game = new Game();
    game.init(generateBoard());
    game.pieces = [
      new Piece(PIECE_TYPE.KING, FACTION.FIRE, new Hex(0, 7)),
      new Piece(PIECE_TYPE.KING, FACTION.WATER, new Hex(0, 0)),
      new Piece(PIECE_TYPE.KING, FACTION.NATURE, new Hex(-2, 2)),
    ];
    game._rebuildOccupiedMap();
    game.currentFaction = FACTION.FIRE;
    game.currentFactionIdx = 0;
    game.state = GAME_STATE.SELECT_PIECE;
    game.eliminatedFactions = new Set();

    const mate = findImmediateMate(game);
    expect(mate).toBeNull();
  });
});
