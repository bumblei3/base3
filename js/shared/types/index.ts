/**
 * Shared type definitions for both Schach9x9 and Trischach
 */

// Generic position on a 2D grid
export interface Position {
  row: number;
  col: number;
}

// Generic move representation
export interface Move {
  from: Position;
  to: Position;
  promotion?: string;
  special?: 'castling' | 'en-passant' | 'promotion';
}

// Game state enum
export type GameState = 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout';

// Player color/faction
export type PlayerColor = 'white' | 'black';
export type Faction = 'fire' | 'water' | 'nature';

// Generic piece interface
export interface Piece {
  id: number;
  type: string;
  color?: PlayerColor;
  faction?: Faction;
  position: Position;
  alive: boolean;
  hasMoved?: boolean;
  symbol?: string;
}

// Board size configuration
export interface BoardSize {
  rows: number;
  cols: number;
}

// Time control
export interface TimeControl {
  initial: number;      // ms
  increment: number;    // ms per move
  maxTime?: number;     // ms
}

// AI Personality
export interface AIPersonality {
  name: string;
  aggression: number;   // 0-1
  positional: number;   // 0-1
  tactical: number;     // 0-1
  timeManagement: 'fast' | 'normal' | 'slow';
}

// Search result
export interface SearchResult {
  move: Move | null;
  score: number;
  depth: number;
  nodes: number;
  time: number;
  pv?: Move[];          // Principal variation
}

// Opening book entry
export interface BookEntry {
  moves: Move[];
  weight: number;
  games: number;
  score: number;
  eco?: string;
  name?: string;
}

// Game metadata
export interface GameMetadata {
  id: string;
  variant: 'schach9x9' | 'trischach';
  players: PlayerInfo[];
  timeControl: TimeControl;
  result?: GameResult;
  startedAt: number;
  endedAt?: number;
  moves: Move[];
}

export interface PlayerInfo {
  name: string;
  color?: PlayerColor;
  faction?: Faction;
  isAI: boolean;
  personality?: string;
  elo?: number;
}

export type GameResult = 'white' | 'black' | 'fire' | 'water' | 'nature' | 'draw';

// Events
export interface GameEvent {
  type: string;
  timestamp: number;
  data: unknown;
}

// Serializable game state for storage/replay
export interface SerializableGameState {
  variant: 'schach9x9' | 'trischach';
  board: Piece[];
  currentTurn: PlayerColor | Faction;
  gameState: GameState;
  moveHistory: Move[];
  capturedPieces: Piece[];
  timeRemaining: Record<string, number>;
  metadata: Partial<GameMetadata>;
}