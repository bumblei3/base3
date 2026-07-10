export interface ParsedMove {
  san: string;
  color: 'white' | 'black';
  moveNumber: number;
}

export interface ParsedPGN {
  headers: Record<string, string>;
  moves: ParsedMove[];
}

/**
 * Parse a PGN string into headers + SAN move list.
 * Strips comments ({...}), variations ((...)), and NAGs ($n).
 * Does NOT replay moves on a board (that is the replay layer's job).
 */
export function parsePGN(pgn: string): ParsedPGN {
  const headers: Record<string, string> = {};
  const lines = pgn.split(/\r?\n/);
  const moveLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^\s*\[(\w+)\s+"([^"]*)"\]/);
    if (headerMatch) {
      headers[headerMatch[1]] = headerMatch[2];
      continue;
    }
    if (line.trim() === '') continue;
    moveLines.push(line);
  }

  const moveText = moveLines.join(' ');
  const tokens = tokenizeMoves(moveText);

  const moves: ParsedMove[] = [];
  let color: 'white' | 'black' = 'white';
  let moveNumber = 1;

  for (const tok of tokens) {
    if (tok.kind === 'number') {
      moveNumber = tok.value;
      continue;
    }
    if (tok.kind === 'move') {
      moves.push({ san: tok.value, color, moveNumber });
      color = color === 'white' ? 'black' : 'white';
      if (color === 'white') moveNumber++;
    }
  }

  return { headers, moves };
}

function tokenizeMoves(text: string): Array<{ kind: 'number' | 'move'; value: number | string }> {
  // Remove comments, variations, NAGs
  let cleaned = text.replace(/\{[^}]*\}/g, ' ');
  cleaned = cleaned.replace(/\([^)]*\)/g, ' ');
  cleaned = cleaned.replace(/\$\d+/g, ' ');
  // Remove trailing result token
  cleaned = cleaned.replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, ' ');
  const out: Array<{ kind: 'number' | 'move'; value: number | string }> = [];
  const re = /(\d+)\s*\.+|\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const tok = m[0];
    const num = tok.match(/^(\d+)\s*\.+/);
    if (num) {
      out.push({ kind: 'number', value: parseInt(num[1], 10) });
    } else if (
      /^[\w=+#\-OXKQRBNPACJSE]+$/.test(tok) &&
      !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)
    ) {
      out.push({ kind: 'move', value: tok });
    }
  }
  return out;
}
