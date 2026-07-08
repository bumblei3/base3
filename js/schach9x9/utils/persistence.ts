/**
 * Game-state persistence for Schach9x9.
 * Serializes a Game into a storage-friendly object (FEN + move history)
 * and rehydrates it on load. Reuses BoardFactory.fromFEN for the board
 * and gameToFEN for the round-trip, so no separate board codec is needed.
 * @module persistence
 */
import { gameToFEN } from './share.js';
import { BoardFactory } from '../campaign/BoardFactory.js';
import { Game } from '../gameEngine.js';
import type { GameSaveData } from '../../shared/storage/index.js';

export interface Schach9x9SaveState {
  fen: string;
  moveHistory: unknown[];
  mode: string;
  boardSize: number;
  turn: 'white' | 'black';
  phase: string;
  rpsEnabled?: boolean;
}

/**
 * Convert a live Game into a GameSaveData object for storage.
 * @param game - Current game
 * @param slot - Save slot name (mirrored onto the object for portability)
 */
export function gameToSaveData(game: Game, slot: string): GameSaveData {
  const state: Schach9x9SaveState = {
    fen: gameToFEN(game),
    moveHistory: (game.moveHistory ?? []).map((m) => ({ ...m })),
    mode: (game as unknown as { mode?: string }).mode ?? 'classic',
    boardSize: game.boardSize ?? game.board.length,
    turn: game.turn ?? 'white',
    phase: (game as unknown as { phase?: string }).phase ?? 'PLAY',
    rpsEnabled: (game as unknown as { rpsEnabled?: boolean }).rpsEnabled,
  };
  return {
    variant: 'schach9x9',
    state,
    timestamp: Date.now(),
    ...(slot ? { slot } : {}),
  } as GameSaveData & { slot?: string };
}

/**
 * Rehydrate a NEW Game instance from saved data.
 * The caller swaps it into the app (App.loadSavedGame).
 * @param data - Saved game data
 * @returns Fresh Game with the saved board + history
 */
export function saveDataToGame(data: GameSaveData): Game {
  const state = data.state as Schach9x9SaveState;
  const game = new Game();
  game.board = BoardFactory.fromFEN(state.fen) as never;
  if (state.turn === 'white' || state.turn === 'black') {
    game.turn = state.turn;
  }
  (game as unknown as { phase: string }).phase = state.phase || 'PLAY';
  game.moveHistory = state.moveHistory as never;
  (game as unknown as { mode?: string }).mode = state.mode || 'classic';
  if (state.rpsEnabled !== undefined) {
    (game as unknown as { rpsEnabled?: boolean }).rpsEnabled = state.rpsEnabled;
  }
  return game;
}

/**
 * Apply a pasted FEN to a live game: replace the board, set side to move,
 * reset the move history and enter PLAY phase.
 * @param game - Live game to mutate
 * @param fen - FEN string
 * @returns true on success, false if the FEN could not be parsed
 */
export function loadFENIntoGame(game: Game, fen: string): boolean {
  try {
    const tokens = fen.trim().split(/\s+/);
    const boardPart = tokens[0];
    const side = tokens[1];
    if (!boardPart || boardPart.split('/').length < 2) return false;
    if (side !== 'w' && side !== 'b') return false;
    const board = BoardFactory.fromFEN(fen);
    if (!board) return false;
    game.board = board as never;
    if (side === 'w') {
      game.turn = 'white';
    } else if (side === 'b') {
      game.turn = 'black';
    }
    (game as unknown as { phase: string }).phase = 'PLAY';
    game.moveHistory = [];
    return true;
  } catch {
    return false;
  }
}
