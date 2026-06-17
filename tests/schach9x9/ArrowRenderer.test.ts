/**
 * ArrowRenderer Coverage Tests
 * Target: 80%+ coverage for js/schach9x9/arrows.ts
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ArrowRenderer } from '@schach9x9/arrows';

describe('ArrowRenderer', () => {
  let boardContainer: HTMLElement;
  let board: HTMLElement;

  beforeEach(() => {
    boardContainer = document.createElement('div');
    boardContainer.id = 'board-container';
    boardContainer.style.position = 'relative';
    boardContainer.style.width = '450px';
    boardContainer.style.height = '450px';

    board = document.createElement('div');
    board.id = 'board';
    board.style.width = '100%';
    board.style.height = '100%';
    board.style.position = 'relative';

    // Create 9x9 grid of cells
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r.toString();
        cell.dataset.c = c.toString();
        cell.style.width = '50px';
        cell.style.height = '50px';
        cell.style.position = 'absolute';
        cell.style.left = `${c * 50}px`;
        cell.style.top = `${r * 50}px`;
        board.appendChild(cell);
      }
    }

    boardContainer.appendChild(board);
    document.body.appendChild(boardContainer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('should create SVG layer', () => {
      const renderer = new ArrowRenderer(board);
      const svg = boardContainer.querySelector('#arrow-layer');
      expect(svg).not.toBeNull();
      expect(svg!.tagName).toBe('svg');
      expect(svg!.id).toBe('arrow-layer');
    });

    test('should create arrowhead markers', () => {
      const renderer = new ArrowRenderer(board);
      const svg = boardContainer.querySelector('#arrow-layer') as SVGSVGElement;
      const defs = svg.querySelector('defs');
      expect(defs).not.toBeNull();
      const markers = defs!.querySelectorAll('marker');
      expect(markers.length).toBeGreaterThan(0);
    });

    test('should set cell size from first cell', () => {
      // Mock offsetWidth for cells (JSDOM returns 0)
      const cells = board.querySelectorAll('.cell');
      cells.forEach((cell) => {
        Object.defineProperty(cell, 'offsetWidth', { value: 50, configurable: true });
      });
      const renderer = new ArrowRenderer(board);
      expect(renderer.cellSize).toBe(50);
    });
  });

  describe('drawArrow', () => {
    test('should draw arrow path with correct attributes', () => {
      const renderer = new ArrowRenderer(board);
      renderer.drawArrow(0, 0, 7, 7, 'green');

      const svg = boardContainer.querySelector('#arrow-layer') as SVGSVGElement;
      const path = svg.querySelector('path');
      expect(path).not.toBeNull();
      expect(path!.getAttribute('stroke')).toBe('#22c55e');
      expect(path!.getAttribute('stroke-width')).toBe('5');
      expect(path!.getAttribute('stroke-linecap')).toBe('round');
      expect(path!.getAttribute('fill')).toBe('none');
      expect(path!.classList.contains('tutor-arrow')).toBe(true);
    });

    test('should use gold color by default', () => {
      const renderer = new ArrowRenderer(board);
      renderer.drawArrow(0, 0, 1, 1);

      const svg = boardContainer.querySelector('#arrow-layer') as SVGSVGElement;
      const path = svg.querySelector('path');
      expect(path!.getAttribute('stroke')).toBe('#FFD700');
    });

    test('should calculate correct path for horizontal move', () => {
      const renderer = new ArrowRenderer(board);
      renderer.drawArrow(4, 0, 4, 8, 'red');

      const svg = boardContainer.querySelector('#arrow-layer') as SVGSVGElement;
      const path = svg.querySelector('path');
      const d = path!.getAttribute('d');
      expect(d).toContain('M ');
      expect(d).toContain(' L ');
    });

    test('should calculate correct path for vertical move', () => {
      const renderer = new ArrowRenderer(board);
      renderer.drawArrow(0, 4, 8, 4, 'red');

      const svg = boardContainer.querySelector('#arrow-layer') as SVGSVGElement;
      const path = svg.querySelector('path');
      const d = path!.getAttribute('d');
      expect(d).toContain('M ');
      expect(d).toContain(' L ');
    });

    test('should calculate correct path for diagonal move', () => {
      const renderer = new ArrowRenderer(board);
      renderer.drawArrow(0, 0, 8, 8, 'red');

      const svg = boardContainer.querySelector('#arrow-layer') as SVGSVGElement;
      const path = svg.querySelector('path');
      const d = path!.getAttribute('d');
      expect(d).toContain('M ');
      expect(d).toContain(' L ');
    });

    test('should add glow effect', () => {
      const renderer = new ArrowRenderer(board);
      renderer.drawArrow(0, 0, 7, 7, 'green');

      const svg = boardContainer.querySelector('#arrow-layer') as SVGSVGElement;
      const path = svg.querySelector('path');
      expect(path!.style.filter).toContain('drop-shadow');
    });

    test('should use marker-end for arrowhead', () => {
      const renderer = new ArrowRenderer(board);
      renderer.drawArrow(0, 0, 7, 7, 'green');

      const svg = boardContainer.querySelector('#arrow-layer') as SVGSVGElement;
      const path = svg.querySelector('path');
      expect(path!.getAttribute('marker-end')).toBe('url(#arrowhead-green)');
    });
  });

  describe('clearArrows', () => {
    test('should remove all arrows', () => {
      const renderer = new ArrowRenderer(board);
      renderer.drawArrow(0, 0, 7, 7, 'green');
      renderer.drawArrow(1, 1, 6, 6, 'red');

      let paths = boardContainer.querySelectorAll('.tutor-arrow');
      expect(paths.length).toBe(2);

      renderer.clearArrows();

      paths = boardContainer.querySelectorAll('.tutor-arrow');
      expect(paths.length).toBe(0);
    });
  });

  describe('highlightMove', () => {
    test('should clear existing arrows and draw new one', () => {
      const renderer = new ArrowRenderer(board);
      renderer.drawArrow(0, 0, 7, 7, 'green');
      renderer.highlightMove(1, 1, 6, 6, 'red');

      const paths = boardContainer.querySelectorAll('.tutor-arrow');
      expect(paths.length).toBe(1);
      expect(paths[0].getAttribute('stroke')).toBe('#ef4444');
    });

    test('should store last arrows', () => {
      const renderer = new ArrowRenderer(board);
      renderer.highlightMove(0, 0, 7, 7, 'gold');

      expect(renderer.lastArrows).not.toBeNull();
      expect(renderer.lastArrows!.length).toBe(1);
      expect(renderer.lastArrows![0]).toEqual({
        fromR: 0,
        fromC: 0,
        toR: 7,
        toC: 7,
        colorKey: 'gold',
      });
    });
  });

  describe('highlightMoves', () => {
    test('should draw multiple arrows', () => {
      const renderer = new ArrowRenderer(board);
      renderer.highlightMoves([
        { fromR: 0, fromC: 0, toR: 7, toC: 7, colorKey: 'gold' },
        { fromR: 1, fromC: 1, toR: 6, toC: 6, colorKey: 'silver' },
      ]);

      const paths = boardContainer.querySelectorAll('.tutor-arrow');
      expect(paths.length).toBe(2);
    });

    test('should clear previous arrows before drawing new ones', () => {
      const renderer = new ArrowRenderer(board);
      renderer.drawArrow(0, 0, 7, 7, 'green');
      renderer.highlightMoves([
        { fromR: 1, fromC: 1, toR: 6, toC: 6, colorKey: 'gold' },
      ]);

      const paths = boardContainer.querySelectorAll('.tutor-arrow');
      expect(paths.length).toBe(1);
    });
  });

  describe('redraw', () => {
    test('should redraw stored arrows', () => {
      const renderer = new ArrowRenderer(board);
      renderer.highlightMove(0, 0, 7, 7, 'gold');
      renderer.clearArrows();

      let paths = boardContainer.querySelectorAll('.tutor-arrow');
      expect(paths.length).toBe(0);

      renderer.redraw();

      paths = boardContainer.querySelectorAll('.tutor-arrow');
      expect(paths.length).toBe(1);
    });

    test('should do nothing if no last arrows', () => {
      const renderer = new ArrowRenderer(board);
      renderer.redraw(); // Should not throw
      expect(renderer.lastArrows).toBeNull();
    });
  });

  describe('destroy', () => {
    test('should remove SVG layer from DOM', () => {
      const renderer = new ArrowRenderer(board);
      expect(boardContainer.querySelector('#arrow-layer')).not.toBeNull();

      renderer.destroy();
      expect(boardContainer.querySelector('#arrow-layer')).toBeNull();
    });
  });
});
