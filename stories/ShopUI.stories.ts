import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderShopItems } from '../js/schach9x9/ui/ShopUI.js';
import type { GameLike } from '../js/schach9x9/types/game.js';

/**
 * Renders the shop item grid (one button per SHOP_PIECES) inside a #shop-panel
 * container. Uses a minimal GameLike mock (only what renderShopItems reads).
 */
function makeGame(): GameLike {
  return {
    board: [],
    boardSize: 9,
    boardShape: null,
    phase: 'PLAY',
    turn: 'white',
    isAI: false,
    isAnimating: false,
    replayMode: false,
    selectedSquare: null,
    validMoves: null,
    mode: 'shop',
    lastMoveHighlight: null,
    getValidMoves: () => [],
    points: 25,
    moveHistory: [],
  } as GameLike;
}

const meta: Meta = {
  title: 'Schach9x9/Shop/Shop UI',
  tags: ['autodocs'],
  argTypes: {
    points: { control: 'number' },
  },
};

export default meta;

type Story = StoryObj;

export const ShopItems: Story = {
  args: { points: 25 },
  render: (args) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:16px;background:#222;';
    wrap.innerHTML = `
      <div id="shop-panel" class="shop-panel">
        <div class="shop-header"><h2>Truppen anheuern</h2></div>
        <div id="selected-piece-display"></div>
      </div>
    `;
    document.body.appendChild(wrap);
    // points flows through a global-ish game mock; renderShopItems reads DOM only
    const game = makeGame();
    (game as any).points = args.points ?? 25;
    renderShopItems();
    updateShopUiText(game as any);
    return wrap;
  },
};

// Small helper to reflect points in the status display (mirrors ShopManager)
function updateShopUiText(_game: GameLike): void {
  const el = document.getElementById('selected-piece-display');
  if (el) el.textContent = 'Wähle eine Figur zum Kaufen';
}
