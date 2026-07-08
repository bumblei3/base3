import { describe, it, expect, beforeEach } from 'vitest';
/**
 * @jest-environment jsdom
 */

import { PGNImportReplay } from '@schach9x9/PGNImportReplay';

const STARTER_PGN = `[Event "Unit Test"]
[Site "Local"]
[White "A"]
[Black "B"]
[Result "*"]

1. e3 e6 2. d3 d6 3. c3 c6 *`;

describe('PGNImportReplay (real engine adapter)', () => {
  let importer: PGNImportReplay;

  beforeEach(() => {
    importer = new PGNImportReplay();
  });

  it('parses headers and move count', () => {
    const result = importer.importPGN(STARTER_PGN);
    expect(result.success).toBe(true);
    expect(result.game).not.toBeNull();
    expect(result.game!.moves.length).toBe(6); // e3 e6 Nc3 Nf6 d4 d5
    expect(result.game!.headers.White).toBe('A');
  });

  it('replays SAN moves onto a real board (history non-empty)', () => {
    const result = importer.importPGN(STARTER_PGN);
    expect(result.success).toBe(true);
    // With a real engine adapter, all 6 moves should replay.
    expect(result.history.length).toBe(6);
    // Each history entry must carry from/to coordinates.
    for (const h of result.history) {
      expect(h.from).toHaveProperty('r');
      expect(h.from).toHaveProperty('c');
      expect(h.to).toHaveProperty('r');
      expect(h.to).toHaveProperty('c');
    }
  });

  it('produces a replayable move list', () => {
    const result = importer.importPGN(STARTER_PGN);
    expect(result.success).toBe(true);
    const list = importer.getMoveListWithAnnotations();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].white).toBe('e3');
  });

  it('replays a longer pawn-only game (10 moves)', () => {
    const PGN = `[Event "PawnChain"]
[Result "*"]

1. e3 e6 2. d3 d6 3. c3 c6 4. b3 b6 5. a3 a6 *`;
    const result = importer.importPGN(PGN);
    expect(result.success).toBe(true);
    expect(result.history.length).toBe(10);
  });

  it('returns failure for empty input', () => {
    const result = importer.importPGN('');
    expect(result.success).toBe(false);
  });
});
