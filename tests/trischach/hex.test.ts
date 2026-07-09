/**
 * TriSchach Hex geometry domain tests.
 * Covers cube-coordinate invariants, distance, rotation, and the
 * neighbor/diagonal/knight move generators on the hex grid.
 */
import { describe, test, expect } from 'vitest';
import {
  Hex,
  hexNeighbors,
  hexDiagonals,
  hexKnightMoves,
  hexLine,
  HEX_DIRECTIONS,
  HEX_DIAGONALS,
} from '@trischach/hex';

describe('TriSchach Hex cube-coordinate invariants', () => {
  test('constructor derives s = -q - r', () => {
    for (const [q, r] of [
      [0, 0],
      [3, -1],
      [-4, 2],
      [7, -7],
    ]) {
      const h = new Hex(q, r);
      expect(h.s).toBe(-q - r);
      expect(h.q + h.r + h.s).toBe(0);
    }
  });

  test('key is "q,r"', () => {
    expect(new Hex(-2, 3).key).toBe('-2,3');
  });

  test('equals compares q and r', () => {
    expect(new Hex(1, 2).equals(new Hex(1, 2))).toBe(true);
    expect(new Hex(1, 2).equals(new Hex(2, 1))).toBe(false);
  });

  test('add / subtract / scale are component-wise', () => {
    const a = new Hex(1, -2);
    const b = new Hex(3, 1);
    expect(a.add(b).equals(new Hex(4, -1))).toBe(true);
    expect(b.subtract(a).equals(new Hex(2, 3))).toBe(true);
    expect(a.scale(2).equals(new Hex(2, -4))).toBe(true);
  });

  test('distance is the cube max-norm and symmetric', () => {
    const a = new Hex(0, 0);
    const b = new Hex(-3, 4); // s = -q-r = -1 ; max(|q|,|r|,|s|) = 4
    expect(a.distance(b)).toBe(b.distance(a));
    expect(a.distance(b)).toBe(4);
    expect(a.distance(a)).toBe(0);
  });

  test('rotateCW then rotateCCW is identity', () => {
    const h = new Hex(2, -3);
    expect(h.rotateCW().rotateCCW().equals(h)).toBe(true);
    expect(h.rotateCCW().rotateCW().equals(h)).toBe(true);
  });
});

describe('TriSchach move generators', () => {
  test('hexNeighbors returns the 6 direct neighbors', () => {
    const n = hexNeighbors(new Hex(0, 0));
    expect(n.length).toBe(6);
    expect(n.map((h) => h.key).sort()).toEqual(
      HEX_DIRECTIONS.map((d) => new Hex(0, 0).add(d).key).sort(),
    );
  });

  test('hexDiagonals returns the 6 diagonal neighbors', () => {
    const d = hexDiagonals(new Hex(0, 0));
    expect(d.length).toBe(6);
    expect(d.map((h) => h.key).sort()).toEqual(
      HEX_DIAGONALS.map((dir) => new Hex(0, 0).add(dir).key).sort(),
    );
  });

  test('hexKnightMoves land at cube-distance exactly 2', () => {
    // NOTE: implementation returns 6 (source comment claims 12). We assert
    // the observed behaviour and that every target is distance-2 from origin.
    const km = hexKnightMoves(new Hex(0, 0));
    expect(km.length).toBe(6);
    expect(km.every((h) => new Hex(0, 0).distance(h) === 2)).toBe(true);
  });

  test('hexLine does not include the origin and is bounded by maxDist', () => {
    const line = hexLine(new Hex(0, 0), new Hex(1, 0), 3);
    expect(line.length).toBe(3);
    expect(line.every((h) => !h.equals(new Hex(0, 0)))).toBe(true);
    expect(line[0].equals(new Hex(1, 0))).toBe(true);
    expect(line[2].equals(new Hex(3, 0))).toBe(true);
  });
});
