import { describe, it, expect } from 'vitest';
import { AnalysisManager } from '@schach9x9/ai/AnalysisManager.js';

describe('AnalysisManager', () => {
  const mockGame = {
    stats: {
      totalMoves: 40,
      captures: { white: 10, black: 5 },
      promotions: 0,
    },
  };

  it('should calculate accuracy based on stats', async () => {
    const manager = new AnalysisManager(mockGame);
    const summary = await manager.runPostGameAnalysis();

    expect(summary.whiteAccuracy).toBeGreaterThan(50);
    expect(summary.whiteAccuracy).toBeLessThan(100);
  });

  it('should give better advice for higher accuracy', () => {
    const manager = new AnalysisManager(mockGame);

    const goodSummary = {
      whiteAccuracy: 95,
      blackAccuracy: 70,
      mistakes: 0,
      blunders: 0,
      keyMoments: [],
    };
    const badSummary = {
      whiteAccuracy: 40,
      blackAccuracy: 70,
      mistakes: 2,
      blunders: 1,
      keyMoments: [],
    };

    const goodAdvice = manager.getMentorAdvice(goodSummary);
    const badAdvice = manager.getMentorAdvice(badSummary);

    expect(goodAdvice).toContain('Hervorragend');
    expect(badAdvice).toContain('Taktik');
    expect(goodAdvice).not.toBe(badAdvice);
  });

  it('should penalize long games in accuracy', async () => {
    const longGame = {
      stats: { totalMoves: 120, captures: { white: 2, black: 2 } },
    };
    const shortGame = {
      stats: { totalMoves: 20, captures: { white: 8, black: 2 } },
    };

    const managerLong = new AnalysisManager(longGame);
    const managerShort = new AnalysisManager(shortGame);

    const summaryLong = await managerLong.runPostGameAnalysis();
    const summaryShort = await managerShort.runPostGameAnalysis();

    expect(summaryShort.whiteAccuracy).toBeGreaterThan(summaryLong.whiteAccuracy);
  });

  it('should handle captures as number', async () => {
    const gameWithNumberCaptures = {
      stats: { totalMoves: 40, captures: 15 },
    };
    const manager = new AnalysisManager(gameWithNumberCaptures);
    const summary = await manager.runPostGameAnalysis();
    expect(summary.whiteAccuracy).toBeGreaterThan(40);
    expect(summary.whiteAccuracy).toBeLessThan(99);
  });

  it('should handle zero moves', async () => {
    const game = {
      stats: { totalMoves: 0, captures: { white: 0, black: 0 } },
    };
    const manager = new AnalysisManager(game);
    const summary = await manager.runPostGameAnalysis();
    expect(summary.whiteAccuracy).toBe(75); // base accuracy
  });

  it('should clamp accuracy to min 40', async () => {
    const game = {
      stats: { totalMoves: 200, captures: { white: 0, black: 0 } },
    };
    const manager = new AnalysisManager(game);
    const summary = await manager.runPostGameAnalysis();
    expect(summary.whiteAccuracy).toBeGreaterThanOrEqual(40);
  });

  it('should clamp accuracy to max 98', async () => {
    const game = {
      stats: { totalMoves: 10, captures: { white: 50, black: 0 } },
    };
    const manager = new AnalysisManager(game);
    const summary = await manager.runPostGameAnalysis();
    expect(summary.whiteAccuracy).toBeLessThanOrEqual(98);
  });

  it('should return all advice tiers', () => {
    const manager = new AnalysisManager(mockGame);

    // > 90: Hervorragend
    expect(manager.getMentorAdvice({ whiteAccuracy: 95 } as any)).toContain('Hervorragend');
    // > 80: Starke
    expect(manager.getMentorAdvice({ whiteAccuracy: 85 } as any)).toContain('Starke');
    // > 65: solide
    expect(manager.getMentorAdvice({ whiteAccuracy: 70 } as any)).toContain('solide');
    // > 50: brenzlige
    expect(manager.getMentorAdvice({ whiteAccuracy: 55 } as any)).toContain('brenzlige');
    // <= 50: Taktik
    expect(manager.getMentorAdvice({ whiteAccuracy: 30 } as any)).toContain('Taktik');
  });

  it('should return default summary structure', async () => {
    const manager = new AnalysisManager(mockGame);
    const summary = await manager.runPostGameAnalysis();

    expect(summary).toHaveProperty('whiteAccuracy');
    expect(summary).toHaveProperty('blackAccuracy');
    expect(summary).toHaveProperty('mistakes');
    expect(summary).toHaveProperty('blunders');
    expect(summary).toHaveProperty('keyMoments');
    expect(summary.keyMoments).toEqual([]);
    expect(summary.mistakes).toBe(0);
    expect(summary.blunders).toBe(0);
  });

  it('should handle missing captures field', async () => {
    const game = {
      stats: { totalMoves: 40 },
    };
    const manager = new AnalysisManager(game as any);
    const summary = await manager.runPostGameAnalysis();
    expect(summary.whiteAccuracy).toBeGreaterThan(0);
  });

  it('should toggle showBestMove', () => {
    const manager = new AnalysisManager(mockGame);
    expect(manager.showBestMove).toBe(false);
    // toggleBestMove requires DOM, but we can test the flag toggle
    // The actual updateArrows() will fail silently without DOM
    const result = manager.toggleBestMove();
    expect(result).toBe(true);
    expect(manager.showBestMove).toBe(true);
    manager.toggleBestMove();
    expect(manager.showBestMove).toBe(false);
  });
});
