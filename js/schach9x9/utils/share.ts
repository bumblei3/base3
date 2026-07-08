/**
 * Share / Clipboard helpers for the current game position.
 * Serializes the board to FEN and combines it with the move history (PGN)
 * so a player can copy or share a snapshot of the game.
 * @module share
 */
import { generatePGN } from './PGNGenerator.js';
import type { Game } from '../gameEngine.js';

/**
 * Serialize the current board + side to move into a FEN string.
 * Ranks are written top (row 0) to bottom, files left (col 0) to right,
 * matching the layout `BoardFactory.fromFEN` expects on parse.
 *
 * @param game - Current game state
 * @returns FEN string (board + side to move + default castling/ep/en-passant)
 */
export function gameToFEN(game: Game): string {
  const size = game.boardSize || (game.board ? game.board.length : 9);
  const rows: string[] = [];

  for (let r = 0; r < size; r++) {
    const row = game.board[r];
    let rowStr = '';
    let empty = 0;
    for (let c = 0; c < size; c++) {
      const piece = row ? row[c] ?? null : null;
      if (!piece) {
        empty++;
        continue;
      }
      if (empty > 0) {
        rowStr += String(empty);
        empty = 0;
      }
      const letter = piece.type.toLowerCase();
      rowStr += piece.color === 'white' ? letter.toUpperCase() : letter;
    }
    if (empty > 0) rowStr += String(empty);
    rows.push(rowStr);
  }

  const side = game.turn === 'white' ? 'w' : 'b';
  // Castling / en-passant fields are not tracked on the Game type here;
  // default them so the FEN stays valid and round-trips through fromFEN.
  return `${rows.join('/')} ${side} - - 0 1`;
}

/**
 * Build the shareable text payload: FEN + PGN (if any moves were played).
 */
export function buildShareText(game: Game): string {
  const fen = gameToFEN(game);
  const moves = game.moveHistory && game.moveHistory.length > 0
    ? generatePGN(game, { mode: (game as unknown as { mode?: string }).mode })
    : '';
  return moves ? `FEN: ${fen}\n\nPGN:\n${moves}` : `FEN: ${fen}`;
}

/**
 * Copy the current game (FEN + PGN) to the clipboard, falling back to the
 * Web Share API when available (mobile). Resolves to true on success.
 *
 * @param game - Current game state
 */
export async function shareCurrentGame(game: Game): Promise<boolean> {
  const text = buildShareText(game);

  // Prefer native share sheet on mobile / installable PWA
  const nav = navigator as Navigator & {
    share?: (_data: { title?: string; text?: string }) => Promise<void>;
    canShare?: (_data: { title?: string; text?: string }) => boolean;
  };
  if (nav.share && nav.canShare?.({ text })) {
    try {
      await nav.share({ title: 'Base3 Schachstellung', text });
      return true;
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
