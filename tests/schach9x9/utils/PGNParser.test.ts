import { describe, it, expect } from 'vitest';
import { parsePGN } from '../../../js/schach9x9/utils/PGNImportParser.js';

describe('parsePGN', () => {
  it('parses headers and SAN moves with alternating colors', () => {
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
    expect(moves[0]).toMatchObject({ san: 'e4', color: 'white', moveNumber: 1 });
    expect(moves[1]).toMatchObject({ san: 'e5', color: 'black', moveNumber: 1 });
    expect(moves[2]).toMatchObject({ san: 'Nf3', color: 'white', moveNumber: 2 });
    expect(moves[5]).toMatchObject({ san: 'a6', color: 'black', moveNumber: 3 });
  });

  it('reads the Variant header', () => {
    const pgn = '[Variant "9x9"]\n\n1. e3 d6 *';
    const { headers, moves } = parsePGN(pgn);
    expect(headers.Variant).toBe('9x9');
    expect(moves.length).toBe(2);
    expect(moves[0].san).toBe('e3');
    expect(moves[1].san).toBe('d6');
  });

  it('tolerates comments, NAGs and loosely formatted move numbers', () => {
    const pgn = '1. Nf3 {good} Nc6 2 Nf3again $1';
    const { moves } = parsePGN(pgn);
    expect(moves.length).toBeGreaterThanOrEqual(2);
    expect(moves[0].san).toBe('Nf3');
    expect(moves[1].san).toBe('Nc6');
  });

  it('parses castling notation', () => {
    const pgn = '1. O-O O-O-O *';
    const { moves } = parsePGN(pgn);
    expect(moves[0].san).toBe('O-O');
    expect(moves[1].san).toBe('O-O-O');
  });

  it('returns empty moves for a headers-only PGN', () => {
    const pgn = '[Event "x"]\n[Result "*"]\n';
    const { moves } = parsePGN(pgn);
    expect(moves.length).toBe(0);
  });
});
