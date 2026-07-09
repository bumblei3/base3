/**
 * TriSchach RPS (Schere-Stein-Papier) faction combat domain tests.
 *
 * Cycle: fire > nature > water > fire.
 * This is the central combat modifier for TriSchach, so it gets its own
 * focused suite.
 */
import { describe, test, expect } from 'vitest';
import { FACTION, RPS, getRPSResult } from '@trischach/board';

describe('TriSchach RPS cycle', () => {
  test('RPS constant encodes fire>nature>water>fire', () => {
    expect(RPS.fire).toBe('nature');
    expect(RPS.nature).toBe('water');
    expect(RPS.water).toBe('fire');
  });

  test('attacker beats the faction it is strong against (advantage)', () => {
    expect(getRPSResult(FACTION.FIRE, FACTION.NATURE)).toBe('advantage');
    expect(getRPSResult(FACTION.NATURE, FACTION.WATER)).toBe('advantage');
    expect(getRPSResult(FACTION.WATER, FACTION.FIRE)).toBe('advantage');
  });

  test('attacker loses to the faction that beats it (disadvantage)', () => {
    expect(getRPSResult(FACTION.NATURE, FACTION.FIRE)).toBe('disadvantage');
    expect(getRPSResult(FACTION.WATER, FACTION.NATURE)).toBe('disadvantage');
    expect(getRPSResult(FACTION.FIRE, FACTION.WATER)).toBe('disadvantage');
  });

  test('same faction resolves neutral (no RPS effect)', () => {
    expect(getRPSResult(FACTION.FIRE, FACTION.FIRE)).toBe('neutral');
    expect(getRPSResult(FACTION.WATER, FACTION.WATER)).toBe('neutral');
    expect(getRPSResult(FACTION.NATURE, FACTION.NATURE)).toBe('neutral');
  });

  test('result is symmetric in the disadvantage sense', () => {
    // If A has advantage over B, then B has disadvantage against A.
    for (const [a, b] of [
      [FACTION.FIRE, FACTION.NATURE],
      [FACTION.NATURE, FACTION.WATER],
      [FACTION.WATER, FACTION.FIRE],
    ] as const) {
      expect(getRPSResult(a, b)).toBe('advantage');
      expect(getRPSResult(b, a)).toBe('disadvantage');
    }
  });
});

describe('TriSchach FACTION constants', () => {
  test('exactly three factions', () => {
    expect(Object.values(FACTION).sort()).toEqual(['fire', 'nature', 'water']);
  });
});
