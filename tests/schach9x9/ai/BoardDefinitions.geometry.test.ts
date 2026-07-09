import { describe, it, expect, afterEach } from 'vitest';
import {
  SQUARE_COUNT,
  BOARD_SIZE,
  setBoardSize,
  indexToRow,
  indexToCol,
  coordsToIndex,
} from '../../../js/schach9x9/ai/BoardDefinitions.js';

describe('BoardDefinitions geometry', () => {
  afterEach(() => setBoardSize(9)); // restore default

  it('defaults to 9x9', () => {
    expect(BOARD_SIZE).toBe(9);
    expect(SQUARE_COUNT).toBe(81);
  });

  it('updates to 8x8 via setBoardSize', () => {
    setBoardSize(8);
    expect(BOARD_SIZE).toBe(8);
    expect(SQUARE_COUNT).toBe(64);
  });

  it('indexToRow/Col use current BOARD_SIZE', () => {
    setBoardSize(8);
    // index 63 == a8 -> row 7, col 7
    expect(indexToRow(63)).toBe(7);
    expect(indexToCol(63)).toBe(7);
    expect(coordsToIndex(7, 7)).toBe(63);
    setBoardSize(9);
    // index 80 == row 8, col 8
    expect(indexToRow(80)).toBe(8);
    expect(indexToCol(80)).toBe(8);
  });
});
