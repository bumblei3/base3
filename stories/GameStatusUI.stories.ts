import type { Meta, StoryObj } from '@storybook/html-vite';
import { updateStatus, updateMoveHistoryUI } from '../js/schach9x9/ui/GameStatusUI.js';
import type { GameLike } from '../js/schach9x9/types/game.js';

/**
 * Minimal GameLike mock — only the fields the GameStatusUI functions read.
 */
function makeGame(overrides: Partial<GameLike> = {}): GameLike {
  const base: GameLike = {
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
    mode: 'classic',
    lastMoveHighlight: null,
    getValidMoves: () => [],
    points: 25,
    moveHistory: [
      { from: { r: 8, c: 4 }, to: { r: 6, c: 4 } },
      { from: { r: 1, c: 4 }, to: { r: 3, c: 4 } },
      { from: { r: 6, c: 4 }, to: { r: 5, c: 4 } },
    ],
  };
  return { ...base, ...overrides };
}

const meta: Meta = {
  title: 'Schach9x9/Game Status',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const PlayingWhiteTurn: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:16px;background:#222;color:#eee;font-family:sans-serif;';
    wrap.innerHTML = `
      <div id="status-message" class="status-bar"></div>
      <div id="points-display"></div>
      <div id="move-history" class="move-history" role="log" aria-live="polite"></div>
    `;
    document.body.appendChild(wrap);
    const game = makeGame();
    updateStatus(game as any);
    updateMoveHistoryUI(game as any);
    return wrap;
  },
};

export const Checkmate: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:16px;background:#222;color:#eee;font-family:sans-serif;';
    wrap.innerHTML = `
      <div id="status-message" class="status-bar"></div>
      <div id="points-display"></div>
      <div id="move-history" class="move-history" role="log" aria-live="polite"></div>
    `;
    document.body.appendChild(wrap);
    const game = makeGame({ phase: 'CHECK_MATE', turn: 'black' });
    updateStatus(game as any);
    updateMoveHistoryUI(game as any);
    return wrap;
  },
};
