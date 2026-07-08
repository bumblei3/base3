/**
 * PGN import parser for Schach9x9.
 * Parses a PGN string into headers + a flat SAN move list.
 * Does NOT replay moves on a board — that is the caller's job
 * (e.g. App.importPGN replays onto the current game).
 * @module PGNParser
 */

export interface ParsedMove {
  /** Standard Algebraic Notation token (e.g. "e4", "Nf3", "O-O"). */
  san: string;
  color: 'white' | 'black';
  moveNumber: number;
}

export interface ParsedPGN {
  headers: Record<string, string>;
  moves: ParsedMove[];
}

interface Token {
  kind: 'number' | 'move';
  value: number | string;
}

/**
 * Parse a PGN string.
 * @param pgn - Raw PGN text (headers + move list, comments/variations tolerated)
 * @returns Parsed headers and moves
 */
export function parsePGN(pgn: string): ParsedPGN {
  const headers: Record<string, string> = {};
  const moveLines: string[] = [];

  for (const line of pgn.split(/\r?\n/)) {
    const headerMatch = line.match(/^\s*\[(\w+)\s+"([^"]*)"\]/);
    if (headerMatch) {
      headers[headerMatch[1]] = headerMatch[2];
      continue;
    }
    if (line.trim() === '') continue;
    moveLines.push(line);
  }

  const tokens = tokenizeMoves(moveLines.join(' '));

  const moves: ParsedMove[] = [];
  let color: 'white' | 'black' = 'white';
  let moveNumber = 1;

  for (const tok of tokens) {
    if (tok.kind === 'number') {
      moveNumber = tok.value as number;
      continue;
    }
    moves.push({ san: tok.value as string, color, moveNumber });
    color = color === 'white' ? 'black' : 'white';
    if (color === 'white') moveNumber++;
  }

  return { headers, moves };
}

/**
 * Strip comments, variations, NAGs and result tokens, then tokenize
 * into move-number / SAN-move tokens.
 */
function tokenizeMoves(text: string): Token[] {
  let cleaned = text.replace(/\{[^}]*\}/g, ' '); // comments
  cleaned = cleaned.replace(/\([^)]*\)/g, ' '); // variations
  cleaned = cleaned.replace(/\$\d+/g, ' '); // NAGs
  cleaned = cleaned.replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, ' '); // trailing result

  const out: Token[] = [];
  const re = /(\d+)\s*\.+\s*|\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const tok = m[0];
    const num = tok.match(/^(\d+)\s*\.+/);
    if (num) {
      out.push({ kind: 'number', value: parseInt(num[1], 10) });
      continue;
    }
    if (isSanToken(tok)) {
      out.push({ kind: 'move', value: tok });
    }
  }
  return out;
}

const SAN_RE = /^[KQRBNPACJEOSa-h0-9x=+#\-O]+$/;
const RESULT_RE = /^(1-0|0-1|1\/2-1\/2|\*)$/;

function isSanToken(tok: string): boolean {
  if (RESULT_RE.test(tok)) return false;
  return SAN_RE.test(tok);
}
