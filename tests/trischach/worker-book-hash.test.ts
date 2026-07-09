/**
 * Worker opening-book regression test (TriSchach).
 *
 * The production AI worker runs against the compiled *.js modules
 * (js/ai-core.js, js/opening-book.js), NOT the *.ts migration sources.
 * calculateBestMove -> pickBookMove -> boardHash receives the DESERIALIZED
 * plain-object game (no getAlivePieces method). A plain `game.getAlivePieces()`
 * call used to throw "e.getAlivePieces is not a function" and crash the worker
 * (which then silently fell back to main-thread AI).
 *
 * This test imports the real *.js entry points the worker uses and asserts
 * calculateBestMove / pickBookMove / inBook survive a deserialized game.
 */
import { expect, test, describe, beforeAll } from 'vitest';
import { loadOpeningBook, BOOK_INFO, inBook, pickBookMove } from '../../trischach/js/opening-book.js';
import { calculateBestMove, deserializeGame } from '../../trischach/js/ai-core.js';
import { Game } from '../../trischach/js/game.js';
import { generateBoard } from '../../trischach/js/board.js';

// Mirror main.ts serializeGameForWorker exactly (what the main thread sends
// to the worker), then deserialize via the SAME deserializeGame the worker
// uses. This exercises the real worker code path against the .js modules.
function makeDeserializedGame() {
  const game = new Game();
  game.init(generateBoard());

  const serialized = {
    pieces: game.pieces.map((p: any) => ({
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

describe('TriSchach worker opening book (.js modules)', () => {
  beforeAll(async () => {
    const ok = await loadOpeningBook();
    expect(ok).toBe(true);
  });

  test('compiled book loads with curated positions (> 50)', () => {
    expect(BOOK_INFO.totalPositions).toBeGreaterThan(50);
  });

  test('calculateBestMove on deserialized game does NOT throw getAlivePieces crash', () => {
    const game = makeDeserializedGame();
    // This must NOT throw "e.getAlivePieces is not a function"
    expect(() => calculateBestMove(game, 'fire' as any)).not.toThrow();
    const move = calculateBestMove(game, 'fire' as any);
    expect(move === null || (move && typeof move === 'object')).toBe(true);
  });

  test('pickBookMove / inBook survive deserialized game (boardHash guard)', () => {
    const game = makeDeserializedGame();
    expect(() => inBook(game)).not.toThrow();
    expect(() => pickBookMove(game)).not.toThrow();
    // Either in book (move found) or not — neither path may crash.
    const inBookResult = inBook(game);
    const move = pickBookMove(game);
    if (inBookResult) {
      expect(move).not.toBeNull();
    }
  });
});
