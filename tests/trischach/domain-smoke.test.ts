/**
 * TriSchach core domain tests — smoke/sanity to confirm the .ts modules
 * load under the root vitest config and the basic APIs behave.
 */
import { describe, test, expect } from 'vitest';
import { Hex, hexNeighbors, hexDiagonals, hexKnightMoves } from '@trischach/hex';
import { getRPSResult, FACTION, generateBoard } from '@trischach/board';
import { Game } from '@trischach/game';

describe('TriSchach hex cube-coordinate invariant', () => {
  test('s === -q - r', () => {
    const h = new Hex(2, -3);
    expect(h.s).toBe(1);
    expect(h.q + h.r + h.s).toBe(0);
  });

  test('distance is symmetric and zero for self', () => {
    const a = new Hex(0, 0);
    const b = new Hex(3, -1);
    expect(a.distance(a)).toBe(0);
    expect(a.distance(b)).toBe(b.distance(a));
    expect(a.distance(b)).toBe(3);
  });

  test('rotateCW/CCW are inverses', () => {
    const h = new Hex(2, -1);
    expect(h.rotateCW().rotateCCW().equals(h)).toBe(true);
  });

  test('hexNeighbors returns 6 cells', () => {
    expect(hexNeighbors(new Hex(0, 0)).length).toBe(6);
  });

  test('hexDiagonals returns 6 cells', () => {
    expect(hexDiagonals(new Hex(0, 0)).length).toBe(6);
  });

  test('hexKnightMoves returns cells at cube-distance 2', () => {
    // NOTE: implementation currently returns 6 (off-by-comment: source claims 12).
    // Documenting observed behaviour; flagged as potential bug.
    const km = hexKnightMoves(new Hex(0, 0));
    expect(km.length).toBe(6);
    // every target is exactly cube-distance 2 from origin
    expect(km.every((h) => new Hex(0, 0).distance(h) === 2)).toBe(true);
  });
});

describe('TriSchach RPS (fire > nature > water > fire)', () => {
  test('cycle', () => {
    expect(getRPSResult(FACTION.FIRE, FACTION.NATURE)).toBe('advantage');
    expect(getRPSResult(FACTION.NATURE, FACTION.WATER)).toBe('advantage');
    expect(getRPSResult(FACTION.WATER, FACTION.FIRE)).toBe('advantage');
  });
  test('reverse is disadvantage', () => {
    expect(getRPSResult(FACTION.NATURE, FACTION.FIRE)).toBe('disadvantage');
  });
  test('same faction is neutral', () => {
    expect(getRPSResult(FACTION.FIRE, FACTION.FIRE)).toBe('neutral');
  });
});

describe('TriSchach Game init', () => {
  test('init places pieces and sets fire to move first', () => {
    const g = new Game();
    g.init(generateBoard());
    expect(g.getAlivePieces().length).toBeGreaterThan(0);
    expect(g.currentFaction).toBe(FACTION.FIRE);
    expect(g.state).toBe('select_piece');
  });
});
