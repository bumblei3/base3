import type { Meta, StoryObj } from '@storybook/html-vite';
import { PIECE_SVGS } from '../js/schach9x9/assets/pieces/index.js';

/**
 * Renders all Schach9x9 piece SVGs (each skin variant) in a grid.
 * Pure presentational — no game state required.
 */
const meta: Meta = {
  title: 'Schach9x9/Pieces/Piece SVGs',
  tags: ['autodocs'],
  argTypes: {
    color: { control: 'inline-radio', options: ['white', 'black'] },
  },
  args: { color: 'white' },
};

export default meta;

type Story = StoryObj;

const PIECES = ['k', 'q', 'r', 'b', 'n', 'p', 'a', 'c', 'j', 'e', 'g', 'l', 'm', 's', 'w', 'z'];

export const AllPieces: Story = {
  args: { color: 'white' },
  render: (args) => {
    const color = (args.color as 'white' | 'black') ?? 'white';
    const wrap = document.createElement('div');
    wrap.style.cssText =
      'display:grid;grid-template-columns:repeat(4,80px);gap:12px;padding:16px;background:#222;';
    for (const p of PIECES) {
      const cell = document.createElement('div');
      cell.style.cssText = 'width:80px;height:80px;display:flex;align-items:center;justify-content:center;';
      cell.innerHTML = PIECE_SVGS[color][p] ?? `<span style="color:#aaa">${p}?</span>`;
      wrap.appendChild(cell);
    }
    return wrap;
  },
};

export const WhiteSet: Story = {
  args: { color: 'white' },
  render: (args) => AllPieces.render?.(args) ?? document.createElement('div'),
};

export const BlackSet: Story = {
  args: { color: 'black' },
  render: (args) => AllPieces.render?.(args) ?? document.createElement('div'),
};
