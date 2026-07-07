import type { Meta, StoryObj } from '@storybook/html-vite';
import { PuzzleMenu } from '../js/schach9x9/ui/PuzzleMenu.js';
import type { GameControllerInterface } from '../js/schach9x9/TimeManager.js';

/**
 * Renders the puzzle selection list inside #puzzle-menu-overlay / #puzzle-menu-list.
 * Uses a minimal GameController mock (PuzzleMenu only stores it; renderPuzzleList
 * reads puzzles from the global puzzleManager).
 */
const meta: Meta = {
  title: 'Schach9x9/Puzzle/Puzzle Menu',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const PuzzleList: Story = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:16px;background:#222;';
    wrap.innerHTML = `
      <div id="puzzle-menu-overlay" class="puzzle-menu-overlay">
        <div class="puzzle-menu-content">
          <button id="puzzle-menu-close-btn" class="close-icon-btn">×</button>
          <h2>Puzzles</h2>
          <div id="puzzle-menu-list" class="puzzle-menu-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const fakeController = { game: {}, puzzleMode: false } as unknown as GameControllerInterface;
    const menu = new PuzzleMenu(fakeController);
    menu.renderPuzzleList();

    const overlay = wrap.querySelector('#puzzle-menu-overlay') as HTMLElement;
    if (overlay) overlay.classList.remove('hidden');
    return wrap;
  },
};
