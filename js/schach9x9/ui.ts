/**
 * UI-Orchestrator für Schach9x9.
 * Importiert und re-exportiert Funktionen aus spezialisierten UI-Modulen.
 * @module ui
 */
// BoardRenderer
export {
  renderBoard,
  initBoardUI,
  getPieceSymbol,
  getPieceText,
  clearPieceCache,
  animateMove,
  showMoveQuality,
  drawGhostTrail,
  flashSquare,
  drawEngineArrow,
} from './ui/BoardRenderer.js';

// ShopUI
export { showShop, updateShopUI } from './ui/ShopUI.js';

// TutorUI
export { setTutorLoading, updateTutorRecommendations, showTutorSuggestions } from './ui/TutorUI.js';

// OverlayManager
export {
  showModal,
  closeModal,
  showPromotionUI,
  showPuzzleOverlay,
  hidePuzzleOverlay,
  updatePuzzleStatus,
  showToast,
  showCampaignVictoryModal,
} from './ui/OverlayManager.js';

// GameStatusUI
export {
  updateMoveHistoryUI,
  updateCapturedUI,
  updateStatus,
  updateOpeningUI,
  updateClockUI,
  updateClockDisplay,
  renderEvalGraph,
  updateStatistics,
  showStatisticsOverlay,
  updateReplayUI,
  enterReplayMode,
  exitReplayMode,
} from './ui/GameStatusUI.js';

// EvaluationBar
export { EvaluationBar } from './ui/EvaluationBar.js';

// OpeningBookUI
export { OpeningBookUI, openingBookUI } from './ui/OpeningBookUI.js';

// PGNGenerator
export { generatePGN, copyPGNToClipboard, downloadPGN } from './utils/PGNGenerator.js';

// PostGameAnalysisUI
export { showPostGameStats, hidePostGameStats } from './ui/PostGameAnalysisUI.js';

// AchievementUI
export { showAchievementsPanel, hideAchievementsPanel, addAchievementsButton } from './ui/AchievementUI.js';

// ArrowRenderer
export { drawArrow, clearArrows, updateLastMoveArrow } from './ui/ArrowRenderer.js';

 import type { Player, GameLike } from './types/game.js';
 import * as AIEngine from './aiEngine.js';
 import { confettiSystem } from './effects.js';

/**
 * Animation für den Schach-Zustand.
 * Nutzt .in-check (pulse-red) + .king-check-flash für sofortiges Feedback.
 */
export function animateCheck(game: GameLike, color: Player): void {
  const kingPos = AIEngine.findKing(game.board, color);
  if (kingPos) {
    const cell = document.querySelector(`.cell[data-r="${kingPos.r}"][data-c="${kingPos.c}"]`);
    if (cell) {
      cell.classList.add('in-check', 'king-check-flash');
      setTimeout(() => {
        cell.classList.remove('king-check-flash');
      }, 1500);
    }
  }
}

/**
 * Animation für den Matt-Zustand.
 * Nutzt .checkmate (roter Glow) + .king-mate-flash.
 */
export function animateCheckmate(game: GameLike, color: Player): void {
  const kingPos = AIEngine.findKing(game.board, color);
  if (kingPos) {
    const cell = document.querySelector(`.cell[data-r="${kingPos.r}"][data-c="${kingPos.c}"]`);
    if (cell) {
      cell.classList.remove('in-check');
      cell.classList.add('checkmate', 'king-mate-flash');
      confettiSystem.spawn();
    }
  }
}
