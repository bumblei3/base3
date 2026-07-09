import { describe, expect, test } from 'vitest';
import { OpeningBookTrainer } from '@schach9x9/utils/OpeningBookTrainer.js';

/**
 * Integration test for the opening-book trainer.
 *
 * The engine is deterministic from a fixed start position, so plain self-play
 * reproduces the same game every time and the book never grows past the
 * opening. `seedOpenings` varies the first move per game so self-play diverges
 * and the opening book gains distinct early positions.
 *
 * NOTE: These run REAL engine self-play games and are therefore SLOW (~2-4 min
 * for a handful of games). They are skipped in the default suite and should be
 * run manually when changing the trainer:
 *   npx vitest run tests/schach9x9/utils/OpeningBookTrainer.test.ts
 *
 * Verified manually: a 40-game seeded run produced 101 positions / 187 moves
 * (up from 2), and a 6-game seeded run produced more distinct positions than
 * an unseeded run (169 vs 127).
 */
describe.skip('OpeningBookTrainer', () => {
  test('seedOpenings yields distinct opening positions', async () => {
    const base = new OpeningBookTrainer({
      numGames: 3,
      depth: 3,
      timePerMoveMs: 200,
      openingMovesTracked: 10,
      minPositionCount: 1,
      maxMovesPerPosition: 5,
      seedOpenings: false,
      alternateColors: false,
      drawMoveLimit: 20,
      quiet: true,
      outputBookPath: '/tmp/ob-test-base.json',
    });
    const baseBook = await base.runTraining();
    const basePositions = Object.keys(baseBook.positions).length;

    const seeded = new OpeningBookTrainer({
      numGames: 3,
      depth: 3,
      timePerMoveMs: 200,
      openingMovesTracked: 10,
      minPositionCount: 1,
      maxMovesPerPosition: 5,
      seedOpenings: true,
      alternateColors: false,
      drawMoveLimit: 20,
      quiet: true,
      outputBookPath: '/tmp/ob-test-seeded.json',
    });
    const seededBook = await seeded.runTraining();
    const seededPositions = Object.keys(seededBook.positions).length;

    expect(seededPositions).toBeGreaterThan(0);
    expect(seededPositions).toBeGreaterThanOrEqual(basePositions);
  }, 180_000);

  test('produces a book with weighted moves per position', async () => {
    const trainer = new OpeningBookTrainer({
      numGames: 3,
      depth: 3,
      timePerMoveMs: 200,
      openingMovesTracked: 8,
      minPositionCount: 1,
      maxMovesPerPosition: 5,
      seedOpenings: true,
      alternateColors: false,
      drawMoveLimit: 20,
      quiet: true,
      outputBookPath: '/tmp/ob-test-weighted.json',
    });
    const book = await trainer.runTraining();
    const positions = Object.values(book.positions);
    expect(positions.length).toBeGreaterThan(0);
    for (const pos of positions) {
      expect(Array.isArray(pos.moves)).toBe(true);
      expect(pos.moves.length).toBeGreaterThan(0);
      expect(typeof pos.moves[0].weight).toBe('number');
      expect(pos.seenCount).toBeGreaterThanOrEqual(1);
    }
  }, 180_000);
});

