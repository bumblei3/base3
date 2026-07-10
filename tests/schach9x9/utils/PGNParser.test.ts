import { describe, it, expect } from 'vitest';
import { parsePGN } from '../../../js/schach9x9/utils/PGNParser.js';

describe('parsePGN', () => {
  it('parses headers and SAN moves', () => {
    const pgn = [
      '[Event "Schach 9x9 Game"]',
      '[White "Player"]',
      '[Black "AI"]',
      '[Result "1-0"]',
      '',
      '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0',
    ].join('\n');
    const { headers, moves } = parsePGN(pgn);
    expect(headers.Result).toBe('1-0');
    expect(headers.White).toBe('Player');
    expect(moves.length).toBe(6);
    expect(moves[0]).toMatchObject({ san: 'e4', color: 'white' });
    expect(moves[1]).toMatchObject({ san: 'e5', color: 'black' });
    expect(moves[5].san).toBe('a6');
  });

  it('handles the Variant header', () => {
    const pgn = '[Variant "9x9"]\n\n1. e3 d6 *';
    const { headers, moves } = parsePGN(pgn);
    expect(headers.Variant).toBe('9x9');
    expect(moves.length).toBe(2);
  });

  it('tolerates comments and malformed move numbers', () => {
    const pgn = '1. Nf3 {good} Nc6 2 Nf3again';
    const { moves } = parsePGN(pgn);
    expect(moves.length).toBeGreaterThanOrEqual(2);
  });

  it('assigns move numbers and colors correctly', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6';
    const { moves } = parsePGN(pgn);
    expect(moves.map((m) => m.color)).toEqual(['white', 'black', 'white', 'black']);
    expect(moves[0].moveNumber).toBe(1);
    expect(moves[2].moveNumber).toBe(2);
  });

  it('strips NAGs and variations', () => {
    const pgn = '1. e4 $1 e5 (1... d5 2. exd5) 2. Nf3';
    const { moves } = parsePGN(pgn);
    expect(moves.map((m) => m.san)).toEqual(['e4', 'e5', 'Nf3']);
  });
});
