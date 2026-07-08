/**
 * Core game type definitions for Schach 9x9
 */
import type { MoveResult } from '../aiEngine.js';
import type { MoveHistoryEntry } from '../gameEngine.js';
export type { MoveResult } from '../aiEngine.js';

export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p' | 'e' | 'a' | 'c' | 'j' | null;

export type Player = 'white' | 'black';
export type GamePhase = 'SETUP' | 'PLAY' | 'END';
export type Board = (Piece | null)[][];
export type GameMode = 'setup' | 'classic' | 'puzzle' | 'campaign' | 'standard8x8';

export interface Square {
  r: number;
  c: number;
}

export interface Piece {
  type: Exclude<PieceType, null>;
  color: Player;
  hasMoved?: boolean;
}

export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isCastling?: boolean;
  isEnPassant?: boolean;
}

export interface GameState {
  board: (Piece | null)[][];
  turn: Player;
  phase: GamePhase;
  mode: GameMode;
  moveHistory: Move[];
  selectedSquare: Square | null;
  validMoves: Square[];
  points: number;
  whiteKingPos: Square | null;
  blackKingPos: Square | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  halfMoveClock: number;
  fullMoveNumber: number;
}

export interface ShopItem {
  piece: PieceType;
  cost: number;
  available: boolean;
}

export interface CampaignLevel {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  maxStars: number;
}

export interface PuzzleState {
  id: string;
  fen?: string;
  solution: Move[];
  currentMoveIndex: number;
  solved: boolean;
  failed: boolean;
  active: boolean;
  puzzleId?: string;
}

export interface Statistics {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  totalMoves: number;
  averageGameLength: number;
  puzzlesSolved: number;
  bestWinStreak: number;
  currentWinStreak: number;
  playerMoves?: number;
  playerBestMoves?: number;
  promotions?: number;
  captures?: { white: number; black: number };
}

/**
 /**
  * Runtime-added methods on the Game instance/prototype.
  * These are patched in App.applyDelegates() (duck-typing / prototype delegation
  * to GameController / MoveController / AIController / TutorController / AnalysisManager).
  * Declared here so the type system can see them.
  */
  export interface GameExtensions {
    // tutorController is declared on Game itself; not duplicated here
    isTutorMove?: (_from: Square, _to: Square) => boolean;
   currentTheme?: string;
   log?: (_message: string) => void;
   getValidMoves?: (_r: number, _c: number, _piece: unknown) => Square[];
   calculateMaterialAdvantage?: (_color?: Player) => number;
   // --- GameController delegations ---
   placeKing?: (_r: number, _c: number, _color: Player) => unknown;
   selectShopPiece?: (_type: string) => unknown;
   placeShopPiece?: (_r: number, _c: number) => unknown;
   finishSetupPhase?: () => unknown;
   setTimeControl?: (_mode: string) => unknown;
   updateClockVisibility?: () => unknown;
   startClock?: () => unknown;
   stopClock?: () => unknown;
   tickClock?: () => unknown;
   updateClockDisplay?: () => unknown;
   updateClockUI?: () => unknown;
   showShop?: (_show: boolean) => unknown;
   updateShopUI?: () => unknown;
   handleCellClick?: (_r: number, _c: number) => unknown;
   resign?: (_color: Player) => unknown;
   offerDraw?: (_color: Player) => unknown;
   acceptDraw?: () => unknown;
   declineDraw?: () => unknown;
   showDrawOfferDialog?: () => unknown;
   // --- MoveController delegations ---
   handlePlayClick?: (_r: number, _c: number) => unknown;
   executeMove?: (_from: Square, _to: Square) => unknown;
   showPromotionUI?: (_r: number, _c: number, _color: Player, _record: MoveHistoryEntry) => unknown;
   animateMove?: (_from: Square, _to: Square, _piece: Piece) => unknown;
   finishMove?: () => unknown;
   undoMove?: () => unknown;
   redoMove?: () => unknown;
   checkDraw?: () => unknown;
   isInsufficientMaterial?: () => unknown;
   getBoardHash?: () => unknown;
   saveGame?: () => unknown;
   loadGame?: () => unknown;
   autoSave?: (_show: boolean) => unknown;
   updateMoveHistoryUI?: () => unknown;
   updateUndoRedoButtons?: () => unknown;
   updateCapturedUI?: () => unknown;
   animateCheck?: (_color: Player) => unknown;
   animateCheckmate?: (_color: Player) => unknown;
   updateStatistics?: () => unknown;
   enterReplayMode?: () => unknown;
   exitReplayMode?: () => unknown;
   replayFirst?: () => unknown;
   replayPrevious?: () => unknown;
   replayNext?: () => unknown;
   replayLast?: () => unknown;
   updateReplayUI?: () => unknown;
   reconstructBoardAtMove?: (_idx: number) => unknown;
   undoMoveForReplay?: (_move: MoveHistoryEntry) => unknown;
   setTheme?: (_theme: string) => unknown;
   applyTheme?: (_theme: string) => unknown;
   // --- AIController delegations ---
   aiSetupKing?: () => unknown;
   aiSetupPieces?: () => unknown;
   aiSetupUpgrades?: () => unknown;
   aiMove?: () => unknown;
   evaluatePosition?: (_color: Player) => unknown;
   updateAIProgress?: (_data: {
     depth?: number;
     maxDepth?: number;
     nodes?: number;
     bestMove?: { from: { r: number; c: number }; to: { r: number; c: number } };
   } | null) => unknown;
   aiEvaluateDrawOffer?: () => unknown;
   aiShouldOfferDraw?: () => unknown;
   aiShouldResign?: () => unknown;
   // --- TutorController delegations ---
   updateBestMoves?: () => unknown;
   getTutorHints?: () => unknown;
   getMoveNotation?: (_move: { _from: Square; _to: Square }) => unknown;
   showTutorSuggestions?: () => unknown;
   getPieceName?: (_type: string) => unknown;
   getThreatenedPieces?: (_pos: Square, _color: Player) => unknown;
   detectTacticalPatterns?: (_move: { _from: Square; _to: Square }) => unknown;
   getDefendedPieces?: (_pos: Square, _color: Player) => unknown;
   analyzeStrategicValue?: (_move: { _from: Square; _to: Square }) => unknown;
   getScoreDescription?: (_score: number) => unknown;
   analyzeMoveWithExplanation?: (_move: { _from: Square; _to: Square }, _score: number, _best: number) => unknown;
   // --- AnalysisManager delegations ---
   toggleThreats?: () => unknown;
   toggleOpportunities?: () => unknown;
   toggleBestMove?: () => unknown;
 }

/**
 * Subset of Game properties consumed by UI/rendering/tutor modules.
 * Avoids `any` while not requiring the full Game class import.
 * All optional — modules only need a subset.
 */
/** Move record for promotion UI */
export interface MoveRecord {
  from: Square;
  to: Square;
  piece?: PieceType | Piece;
  captured?: PieceType | Piece | null;
  promotion?: PieceType | string;
  evalScore?: number;
  score?: number;
  specialMove?: { type: string; promotedTo?: string };
}

/** Puzzle interface */
export interface Puzzle {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  fen?: string;
  solution: Array<Move | MoveResult | { from: { r: number; c: number }; to: { r: number; c: number }; promotion?: PieceType; piece: PieceType }>;
}

/** Action button for modals */
export interface ModalAction {
  text: string;
  class?: string;
  callback?: () => void;
}

/** Game interface used by UI components (avoids circular deps) */
export interface GameLike {
  board: (Piece | null)[][];
  boardSize: number;
  boardShape: unknown;
  phase: string;
  turn: Player;
  isAI: boolean;
  isAnimating: boolean;
  replayMode: boolean;
  selectedSquare: Square | null;
  validMoves: Square[] | null;
  mode: string;
  lastMoveHighlight: { from: Square; to: Square; piece?: Piece } | null;
  isInCheck?(_color: Player): boolean;
  isSquareUnderAttack?: (_r: number, _c: number, _color: Player) => boolean;
  isTutorMove?: (_from: Square, _to: Square) => boolean;
  playerColor?: Player;
  whiteCorridor?: number | null;
  blackCorridor?: number | null;
  handleCellClick?: (_r: number, _c: number) => void;
  getValidMoves: (_r: number, _c: number, _piece: Piece) => Square[];
  log?: (_message: string) => void;
  points: number;
  tutorPoints?: number;
  moveHistory: Array<{ from: Square; to: Square; piece?: PieceType | Piece; captured?: PieceType | Piece | null; promotion?: PieceType | string; isCheck?: boolean; isCheckmate?: boolean; isCastling?: boolean; isEnPassant?: boolean; specialMove?: { type: string; rookFrom?: Square; rookTo?: Square; rookHadMoved?: boolean; capturedPawnPos?: Square } }>;
  // Tutor-specific (used by MoveAnalyzer)
  kiMentorEnabled?: boolean;
  mentorLevel?: string;
  lastEval?: number;
  bestMoves?: unknown[];
  tutorMode?: string;
  stats?: { accuracies: number[] };
  // Puzzle-specific
  capturedPieces?: { white: Piece[]; black: Piece[] };
  puzzleState?: PuzzleState | null;
  getAllLegalMoves?: (_color: Player) => { from: Square; to: Square }[];
  // Internal rendering state (added by renderBoard)
  _previousBoardState?: (Piece | null)[][];
  _forceFullRender?: boolean;
  // App-level methods used by UI components
  startCampaignLevel?: (_levelId: string) => void;
  // Allow additional properties for dynamic extensions
}
