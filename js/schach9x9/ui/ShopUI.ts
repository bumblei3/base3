/**
 * Modul für das Shop-System UI.
 * @module ShopUI
 */
import { SHOP_PIECES, PIECE_VALUES } from '../config.js';
import { PIECE_SVGS } from '../chess-pieces.js';
import { getPieceText } from './BoardRenderer.js';
import type { GameLike } from '../types/game.js';

// Removed top-level await preventing circular dependency
// const { updateTutorRecommendations } = (await import('./TutorUI.js')) as any;

type GameWithSelectedPiece = GameLike & { selectedShopPiece?: string | null };

let shopItemsRendered = false;

/**
 * Builds the shop item buttons (one per SHOP_PIECES entry) inside the
 * #shop-buttons container. Called once; the container may be missing from the
 * static HTML, so we create it lazily if needed.
 */
export function renderShopItems(): void {
  if (shopItemsRendered) return;
  const panel = document.getElementById('shop-panel');
  if (!panel) return;

  let container = document.getElementById('shop-buttons');
  if (!container) {
    container = document.createElement('div');
    container.id = 'shop-buttons';
    container.className = 'shop-buttons';
    // Insert before the tutor recommendations section if present
    const tutorSection = document.getElementById('tutor-recommendations-section');
    if (tutorSection) {
      panel.insertBefore(container, tutorSection);
    } else {
      panel.appendChild(container);
    }
  }

  // Ensure the selected-piece status display exists (used by ShopManager.updateShopUI)
  if (!document.getElementById('selected-piece-display')) {
    const statusEl = document.createElement('div');
    statusEl.id = 'selected-piece-display';
    statusEl.className = 'selected-piece-display';
    container.parentNode?.insertBefore(statusEl, container.nextSibling);
  }

  container.innerHTML = Object.values(SHOP_PIECES)
    .map(p => {
      const symbol = p.symbol as keyof typeof PIECE_SVGS['white'];
      const svg = PIECE_SVGS['white'][symbol] ?? '';
      const cost = PIECE_VALUES[p.symbol as keyof typeof PIECE_VALUES] ?? p.points;
      return `<button class="shop-item" data-piece="${p.symbol}" data-cost="${cost}" title="${p.name} (${cost} Pkt)">
        <span class="shop-item-svg">${svg}</span>
        <span class="shop-item-name">${p.name}</span>
        <span class="shop-item-cost">${cost}</span>
      </button>`;
    })
    .join('');

  shopItemsRendered = true;
}

/**
 * Zeigt oder verbirgt das Shop-Panel.
 * @param game - Die Game-Instanz
 * @param show - Sichtbarkeit
 */
export function showShop(game: GameLike, show: boolean): void {
  const panel = document.getElementById('shop-panel');
  if (!panel) return;

  if (show) {
    renderShopItems();
    panel.classList.remove('hidden');
    document.body.classList.add('setup-mode');
  } else {
    panel.classList.add('hidden');
    document.body.classList.remove('setup-mode');
  }
  updateShopUI(game);
}

/**
 * Aktualisiert die Shop-Anzeige.
 * @param game - Die Game-Instanz
 */
export function updateShopUI(game: GameLike): void {
  const pointsDisplay = document.getElementById('points-display');
  if (pointsDisplay) pointsDisplay.textContent = game.points.toString();

  const tutorPointsDisplay = document.getElementById('tutor-points-display');
  if (tutorPointsDisplay) tutorPointsDisplay.textContent = (game.tutorPoints || 0).toString();

  document.querySelectorAll<HTMLElement>('.shop-item').forEach(btn => {
    const cost = parseInt(btn.dataset.cost || '0');
    if (cost > game.points) {
      btn.classList.add('disabled');
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
    } else {
      btn.classList.remove('disabled');
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  const finishBtn = document.getElementById('finish-setup-btn') as HTMLButtonElement | null;
  if (finishBtn) {
    finishBtn.disabled = false;
    // Show button during upgrade phases or piece placement
    const phase = String(game.phase);
    if (phase === 'SETUP_WHITE_UPGRADES' || phase === 'SETUP_BLACK_UPGRADES') {
      finishBtn.textContent = 'Fertig';
      finishBtn.classList.remove('hidden');
    } else if (phase === 'SETUP_WHITE_PIECES' || phase === 'SETUP_BLACK_PIECES') {
      finishBtn.textContent = 'Fertig'; // Or 'Start Game'
      finishBtn.classList.remove('hidden');
    }
  }

  const statusDisplay = document.getElementById('selected-piece-display');
  const shopGrid = document.getElementById('shop-buttons');
  const tutorSection = document.getElementById('tutor-recommendations-section');
  const shopHeader = document.querySelector('#shop-panel .shop-header h2');
  const phase = String(game.phase);
  const isUpgradePhase = phase === 'SETUP_WHITE_UPGRADES' || phase === 'SETUP_BLACK_UPGRADES';

  if (isUpgradePhase) {
    if (shopHeader) shopHeader.textContent = 'Truppen verbessern';
    if (shopGrid) shopGrid.classList.add('hidden');
    if (tutorSection) tutorSection.classList.add('hidden');
    if (statusDisplay)
      statusDisplay.textContent = 'Klicke auf Figuren auf dem Brett zum Verbessern';
  } else {
    if (shopHeader) shopHeader.textContent = 'Truppen anheuern';
    if (shopGrid) shopGrid.classList.remove('hidden');
    if (tutorSection) tutorSection.classList.remove('hidden');

    if (statusDisplay) {
      const selected = (game as GameWithSelectedPiece).selectedShopPiece;
      if (selected) {
        statusDisplay.textContent = `Platziere: ${getPieceText({ type: selected, color: game.turn })} (${PIECE_VALUES[selected as keyof typeof PIECE_VALUES]} Pkt)`;
      } else {
        statusDisplay.textContent = 'Wähle eine Figur zum Kaufen';
      }
    }
  }

  // Check if UI module is available globally (from App.ts)
  const globalUI = window.UI as { updateTutorRecommendations?: (_game: GameLike) => void } | undefined;
  if (globalUI?.updateTutorRecommendations) {
    globalUI.updateTutorRecommendations(game);
  } else {
    const legacyUpdate = window.updateTutorRecommendations as ((_game: GameLike) => void) | undefined;
    if (legacyUpdate) {
      legacyUpdate(game);
    }
  }
}
