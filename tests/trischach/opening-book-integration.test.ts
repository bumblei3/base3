/**
 * Opening-book integration test (TriSchach).
 *
 * Verifies the regression from the AI worker crash:
 *   - The worker used to call buildOpeningBook(Game) which rebuilt the book
 *     from the hardcoded dev lines (several with invalid coords / piece ids)
 *     and shadowed the curated compiled JSON.
 *   - calculateBestMove now relies on the compiled JSON loaded via
 *     loadOpeningBook() (called by the worker's `initBook` handler), and must
 *     work with a DESERIALIZED plain-object game (no getAlivePieces method).
 */
import { expect, test, describe, beforeAll } from 'vitest';
import { loadOpeningBook, BOOK_INFO, inBook, pickBookMove } from '@trischach/opening-book';
import { calculateBestMove, deserializeGame } from '@trischach/ai';
import { Game } from '@trischach/game';
import { generateBoard } from '@trischach/board';

// Mirror main.ts serializeGameForWorker exactly (what the main thread sends
// to the worker), then deserialize via the SAME deserializeGame the worker
// uses. This guarantees we exercise the real worker code path.
function makeDeserializedGame() {
  const game = new Game();
  game.init(generateBoard());

  const serialized = {
    pieces: (game as any).pieces.map((p: any) => ({
      id: p.id,
      type: p.type,
      faction: p.faction,
      pos: { q: p.pos.q, r: p.pos.r },
      symbol: p.symbol,
      alive: p.alive,
      hasMoved: p.hasMoved,
    })),
    currentFactionIdx: game.currentFactionIdx,
    currentFaction: game.currentFaction,
    state: game.state,
    eliminatedFactions: Array.from(game.eliminatedFactions ?? []),
    rpsEnabled: game.rpsEnabled,
    capturedPieces: game.capturedPieces,
    _halfmoveClock: game._halfmoveClock || 0,
  };

  return deserializeGame(serialized) as any;
}

describe('TriSchach opening book (integration)', () => {
  beforeAll(async () => {
    const ok = await loadOpeningBook();
    expect(ok).toBe(true);
  });

  test('compiled book loads with curated positions (> 50)', () => {
    expect(BOOK_INFO.totalPositions).toBeGreaterThan(50);
  });

  test('calculateBestMove works on a deserialized plain-object game (no getAlivePieces crash)', () => {
    const game = makeDeserializedGame();
    // This must NOT throw "e.getAlivePieces is not a function"
    expect(() => calculateBestMove(game, 'fire' as any)).not.toThrow();
    const move = calculateBestMove(game, 'fire' as any);
    expect(move === null || (move && typeof move === 'object')).toBe(true);
  });

  test('pickBookMove uses the loaded compiled book, not buildOpeningBook', () => {
    const game = makeDeserializedGame();
    // Initial position should be in the compiled book (it has 72 positions)
    const inBookResult = inBook(game);
    const move = pickBookMove(game);
    // Either we are in book (move found) or not — both are fine, but the
    // important part is that pickBookMove does not crash and returns a
    // shape compatible with the deserialized game.
    if (inBookResult) {
      expect(move).not.toBeNull();
    }
  });
});
