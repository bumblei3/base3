/**
 * Shared AI interfaces for both Schach9x9 and Trischach
 */

import type { Move, Piece, GameState, TimeControl, SearchResult, AIPersonality } from '../types';

// Generic game interface for AI
export interface IGame {
  getCurrentTurn(): string;
  getLegalMoves(): Move[];
  makeMove(move: Move): void;
  undoMove(): void;
  getBoard(): Piece[];
  getGameState(): GameState;
  clone(): IGame;
  getFen?(): string;
  setFen?(fen: string): void;
}

// AI Engine interface
export interface IAIEngine {
  // Configuration
  setDepth(depth: number): void;
  setPersonality(personality: AIPersonality | string): void;
  setTimeControl(timeControl: TimeControl): void;

  // Search
  findBestMove(game: IGame): Promise<SearchResult>;
  findBestMoveSync(game: IGame): SearchResult;

  // Analysis
  analyzePosition(game: IGame, depth?: number): Promise<SearchResult>;
  evaluatePosition(game: IGame): number;

  // Control
  stopSearch(): void;
  isSearching(): boolean;

  // Info
  getNodesSearched(): number;
  getCurrentDepth(): number;
  getCurrentScore(): number;
}

// AI Factory for creating engines
export interface IAIFactory {
  createEngine(config?: AIConfig): IAIEngine;
  createWorkerEngine(config?: AIConfig): IAIEngine;
}

export interface AIConfig {
  depth?: number;
  personality?: AIPersonality | string;
  timeControl?: TimeControl;
  useWasm?: boolean;
  wasmPath?: string;
  threads?: number;
  hashSize?: number;
  pondering?: boolean;
}

// Personality presets
export const PERSONALITIES: Record<string, AIPersonality> = {
  balanced: {
    name: 'Ausgewogen',
    aggression: 0.5,
    positional: 0.5,
    tactical: 0.5,
    timeManagement: 'normal',
  },
  aggressive: {
    name: 'Aggressiv',
    aggression: 0.8,
    positional: 0.3,
    tactical: 0.7,
    import type { Move, Piece, GameState, TimeControl, SearchResult, AIPersonality, GameResult } from '../types';

    // Generic game interface for AI
    export interface IGame {
      getCurrentTurn(): string;
      getLegalMoves(): Move[];
      makeMove(move: Move): void;
      undoMove(): void;
      getBoard(): Piece[];
      getGameState(): GameState;
      clone(): IGame;
      getFen?(): string;
      setFen?(fen: string): void;
    }

    // AI Engine interface
    export interface IAIEngine {
      // Configuration
      setDepth(depth: number): void;
      setPersonality(personality: AIPersonality | string): void;
      setTimeControl(timeControl: TimeControl): void;

      // Search
      findBestMove(game: IGame): Promise<SearchResult>;
      findBestMoveSync(game: IGame): SearchResult;

      // Analysis
      analyzePosition(game: IGame, depth?: number): Promise<SearchResult>;
      evaluatePosition(game: IGame): number;

      // Control
      stopSearch(): void;
      isSearching(): boolean;

      // Info
      getNodesSearched(): number;
      getCurrentDepth(): number;
      getCurrentScore(): number;
    }

    // AI Factory for creating engines
    export interface IAIFactory {
      createEngine(config?: AIConfig): IAIEngine;
      createWorkerEngine(config?: AIConfig): IAIEngine;
    }

    export interface AIConfig {
      depth?: number;
      personality?: AIPersonality | string;
      timeControl?: TimeControl;
      useWasm?: boolean;
      wasmPath?: string;
      threads?: number;
      hashSize?: number;
      pondering?: boolean;
    }

    // Personality presets
    export const PERSONALITIES: Record<string, AIPersonality> = {
      balanced: {
        name: 'Ausgewogen',
        aggression: 0.5,
        positional: 0.5,
        tactical: 0.5,
        timeManagement: 'normal',
      },
      aggressive: {
        name: 'Aggressiv',
        aggression: 0.8,
        positional: 0.3,
        tactical: 0.7,
        timeManagement: 'fast',
      },
      defensive: {
        name: 'Defensiv',
        aggression: 0.2,
        positional: 0.8,
        tactical: 0.4,
        timeManagement: 'slow',
      },
      tactical: {
        name: 'Taktisch',
        aggression: 0.6,
        positional: 0.4,
        tactical: 0.9,
        timeManagement: 'normal',
      },
      positional: {
        name: 'Positional',
        aggression: 0.3,
        positional: 0.9,
        tactical: 0.3,
        timeManagement: 'slow',
      },
      berserk: {
        name: 'Berserk',
        aggression: 1.0,
        positional: 0.1,
        tactical: 1.0,
        timeManagement: 'fast',
      },
      solid: {
        name: 'Solid',
        aggression: 0.1,
        positional: 1.0,
        tactical: 0.2,
        timeManagement: 'slow',
      },
    };

    // Opening Book interface
    export interface IOpeningBook {
      getMove(game: IGame): Move | null;
      addMove(game: IGame, move: Move, weight?: number): void;
      learnFromGame(game: IGame, result: GameResult): void;
      getBookMoves(game: IGame): Move[];
      save(): Promise<void>;
      load(): Promise<void>;
      getStats(): { positions: number; moves: number; depth: number };
    }

    // Transposition Table Entry
    export interface TTEntry {
      key: bigint;
      depth: number;
      score: number;
      flag: 'exact' | 'lower' | 'upper';
      move?: Move;
      age: number;
    }

    // Transposition Table Interface
    export interface ITranspositionTable {
      get(key: bigint): TTEntry | undefined;
      set(entry: TTEntry): void;
      clear(): void;
      size(): number;
      save(): string;
      load(data: string): void;
    }

    // Search Parameters
    export interface SearchParams {
      depth: number;
      timeLimit?: number;
      nodesLimit?: number;
      pondering: boolean;
      alpha: number;
      beta: number;
      ply: number;
      maxPly: number;
    }

    // Move Ordering
    export interface MoveScore {
      move: Move;
      score: number;
    }

    export interface IMoveOrdering {
      orderMoves(game: IGame, moves: Move[], ttMove?: Move, killerMoves?: Move[][]): MoveScore[];
      updateKiller(move: Move, ply: number): void;
      updateHistory(move: Move, depth: number, bonus: number): void;
      clearHistory(): void;
    }

    // Evaluation Components
    export interface EvaluationComponents {
      material: number;
      positional: number;
      kingSafety: number;
      pawnStructure: number;
      mobility: number;
      threats: number;
      passedPawns: number;
      total: number;
    }

    export interface IEvaluator {
      evaluate(game: IGame): number;
      evaluateComponents(game: IGame): EvaluationComponents;
    }

    // AI Worker communication
    export interface AIWorkerMessage {
      type: 'init' | 'search' | 'stop' | 'ponder' | 'setPosition' | 'config';
      payload: unknown;
      id?: number;
    }

    export interface AIWorkerResponse {
      id: number;
      type: 'ready' | 'bestmove' | 'info' | 'error' | 'ponderhit';
      payload: unknown;
    }

    // Web Worker wrapper
    export interface IAIWorker {
      postMessage(message: AIWorkerMessage): void;
      terminate(): void;
      onmessage: (response: AIWorkerResponse) => void;
      onerror: (error: ErrorEvent) => void;
    }

    // UCI-like interface for external engines
    export interface IUCIEngine {
      init(): Promise<void>;
      setOption(name: string, value: string | number): void;
      position(fen: string, moves: string[]): void;
      go(params: { depth?: number; movetime?: number; nodes?: number; infinite?: boolean }): Promise<{ bestmove: string; ponder?: string; info: Record<string, unknown> }>;
      stop(): void;
      quit(): void;
      isReady(): boolean;
    }

    // Opening book formats
    export interface BookFormat {
      parse(data: string): IOpeningBook | Map<string, Move[]>;
      serialize(book: IOpeningBook | Map<string, Move[]>): string;
    }

    // PGN parsing
    export interface PGNGame {
      headers: Record<string, string>;
      moves: string;
      movesArray: Move[];
      result: GameResult;
    }

    export interface IPGNParser {
      parse(pgn: string): PGNGame[];
      serialize(game: PGNGame): string;
    }