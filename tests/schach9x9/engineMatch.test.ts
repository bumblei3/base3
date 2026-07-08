/**
 * Unit tests for EngineMatchRunner internals:
 * - avgDepth must be a true running mean (not a gliding 2-value average)
 * - createResult must produce a real PGN listing instead of a placeholder
 */
import { describe, it, expect, vi } from 'vitest';
import { EngineMatchRunner } from '../../js/schach9x9/engineMatch.js';
import type { EngineConfig, EngineGameStats, MoveRecord } from '../../js/schach9x9/engineMatch.js';
import type { SearchResult } from '../../js/schach9x9/aiEngine.js';

const baseConfig = {
  engineWhite: { name: 'White', personality: 'balanced' as const, color: 'white' as const },
  engineBlack: { name: 'Black', personality: 'balanced' as const, color: 'black' as const },
  numGames: 1,
  alternateColors: false,
  timeControl: { type: 'fixed-depth' as const, baseTimeMs: 1000, incrementMs: 0, maxTimePerMove: 1000 },
  savePgns: false,
};

function makeRunner(): EngineMatchRunner {
  return new EngineMatchRunner(baseConfig as never);
}

function emptyStats(): EngineGameStats {
  return {
    avgDepth: 0, depthCount: 0, maxDepth: 0, totalNodes: 0, totalTimeMs: 0,
    nps: 0, avgTimePerMoveMs: 0, blunders: 0, mistakes: 0, inaccuracies: 0, bestMoves: 0,
  };
}

const whiteConfig = baseConfig.engineWhite as EngineConfig;
const blackConfig = baseConfig.engineBlack as EngineConfig;

describe('EngineMatchRunner.updateStats', () => {
  it('computes a true running mean of depth across moves', () => {
    const runner = makeRunner() as unknown as {
      updateStats: (s: EngineGameStats, r: SearchResult | null, t: number) => void;
    };
    const stats = emptyStats();
    // Depths: 5, 10, 15 -> mean should be 10, NOT the gliding (5+10)/2 style
    runner.updateStats(stats, { score: 0, depth: 5, nodes: 100, pv: [], mate: false, bestMove: null } as unknown as SearchResult, 10);
    runner.updateStats(stats, { score: 0, depth: 10, nodes: 100, pv: [], mate: false, bestMove: null } as unknown as SearchResult, 10);
    runner.updateStats(stats, { score: 0, depth: 15, nodes: 100, pv: [], mate: false, bestMove: null } as unknown as SearchResult, 10);
    expect(stats.depthCount).toBe(3);
    expect(stats.maxDepth).toBe(15);
    expect(stats.avgDepth).toBeCloseTo(10, 5);
  });
});

describe('EngineMatchRunner.createResult (PGN)', () => {
  it('builds a real PGN listing with coordinates, eval tags and result', () => {
    const runner = makeRunner() as unknown as {
      createResult: (
        gameNumber: number, white: EngineConfig, black: EngineConfig,
        result: string, winner: 'white' | 'black' | 'draw' | 'ongoing',
        termination: string, moves: number, whiteStats: EngineGameStats,
        blackStats: EngineGameStats, moveHistory: MoveRecord[], durationMs: number
      ) => { pgn: string };
    };
    const moves: MoveRecord[] = [
      { moveNumber: 1, color: 'white', from: { r: 7, c: 4 }, to: { r: 5, c: 4 }, evalScore: 25, depth: 8, personality: 'balanced' },
      { moveNumber: 1, color: 'black', from: { r: 1, c: 4 }, to: { r: 3, c: 4 }, evalScore: -10, depth: 9, personality: 'balanced' },
    ];
    const res = runner.createResult(
      1, whiteConfig, blackConfig, '1-0', 'white', 'checkmate', 2,
      emptyStats(), emptyStats(), moves, 1234
    );
    expect(res.pgn).not.toContain('placeholder');
    expect(res.pgn).toContain('[White "White"]');
    expect(res.pgn).toContain('[Black "Black"]');
    expect(res.pgn).toContain('[Result "1-0"]');
    // White: row 7 col 4 = e2 -> row 5 col 4 = e4. Black: row 1 col 4 = e8 -> row 3 col 4 = e6.
    expect(res.pgn).toContain('1. e2e4');
    expect(res.pgn).toContain('e8e6');
    expect(res.pgn).toContain('{+0.25}');
    expect(res.pgn).toContain('1-0');
  });
});
