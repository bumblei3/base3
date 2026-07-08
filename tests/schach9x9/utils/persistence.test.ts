import { describe, it, expect } from 'vitest';
import { gameToSaveData, saveDataToGame, loadFENIntoGame } from '../../../js/schach9x9/utils/persistence.js';
import { gameToFEN } from '../../../js/schach9x9/utils/share.js';
import { Game } from '../../../js/schach9x9/gameEngine.js';

const START_FEN_9X9 = 'rnb1kcbjr/ppppppppp/9/9/9/9/9/PPPPPPPPP/RNBQKEACR w - - 0 1';

describe('game save round-trip', () => {
  it('serializes and rehydrates board from FEN', () => {
    const game = new Game(15, 'classic');
    const expectedFen = gameToFEN(game);
    const data = gameToSaveData(game, 'slot1');
    expect(data.variant).toBe('schach9x9');
    const state = data.state as { fen: string };
    expect(state.fen).toBe(expectedFen);

    const restored = saveDataToGame(data);
    expect(gameToFEN(restored)).toBe(state.fen);
    expect(gameToFEN(restored)).toBe(expectedFen);
  });

  it('round-trips move history', () => {
    const game = new Game(15, 'classic');
    game.moveHistory = [
      { from: { r: 7, c: 4 }, to: { r: 5, c: 4 } } as never,
      { from: { r: 1, c: 4 }, to: { r: 3, c: 4 } } as never,
    ];
    const data = gameToSaveData(game, 'slot2');
    const state = data.state as { moveHistory: unknown[] };
    expect(state.moveHistory.length).toBe(2);

    const restored = saveDataToGame(data);
    expect(restored.moveHistory.length).toBe(2);
    expect((restored.moveHistory[0] as { from: { r: number } }).from.r).toBe(7);
  });

  it('preserves side to move and mode', () => {
    const game = new Game(15, 'classic');
    game.turn = 'black';
    (game as unknown as { mode: string }).mode = 'upgrade';
    const data = gameToSaveData(game, 'slot3');
    const restored = saveDataToGame(data);
    expect(restored.turn).toBe('black');
    expect((restored as unknown as { mode: string }).mode).toBe('upgrade');
  });
});

describe('loadFENIntoGame', () => {
  it('applies a valid FEN and resets history', () => {
    const game = new Game(15, 'classic');
    const ok = loadFENIntoGame(game, START_FEN_9X9);
    expect(ok).toBe(true);
    expect(gameToFEN(game)).toBe(START_FEN_9X9);
    expect(game.turn).toBe('white');
    expect(game.moveHistory.length).toBe(0);
    expect((game as unknown as { phase: string }).phase).toBe('PLAY');
  });

  it('rejects a malformed FEN', () => {
    const game = new Game(15, 'classic');
    const before = gameToFEN(game);
    const ok = loadFENIntoGame(game, 'not-a-fen');
    expect(ok).toBe(false);
    // board unchanged
    expect(gameToFEN(game)).toBe(before);
  });

  it('honours the side-to-move field', () => {
    const game = new Game(15, 'classic');
    const ok = loadFENIntoGame(game, START_FEN_9X9.replace(' w ', ' b '));
    expect(ok).toBe(true);
    expect(game.turn).toBe('black');
  });
});
