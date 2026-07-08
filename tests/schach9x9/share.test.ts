import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gameToFEN, buildShareText, shareCurrentGame } from '../../js/schach9x9/utils/share.js';
import { parseFEN } from '../../js/schach9x9/utils.js';
import { BoardFactory } from '../../js/schach9x9/campaign/BoardFactory.js';
import type { Game, Piece } from '../../js/schach9x9/gameEngine.js';

function makeGame(fen: string, moveCount = 0): Game {
  const parsed = parseFEN(fen);
  const board = BoardFactory.fromFEN(fen) as never;
  return {
    board,
    boardSize: (board as (Piece | null)[][]).length,
    turn: parsed.turn,
    moveHistory: Array.from({ length: moveCount }, () => ({})),
  } as unknown as Game;
}

// Standard 9x9 starting position (white back rank + pawns, black mirrored).
// 9 columns per rank; the king sits between bishop and chancellor with one gap.
const START_FEN_9X9 =
  'rnb1kcbjr/ppppppppp/9/9/9/9/9/PPPPPPPPP/RNBQKEACR w - - 0 1';

describe('gameToFEN', () => {
  it('serializes the starting position and round-trips through parseFEN', () => {
    const game = makeGame(START_FEN_9X9);
    const fen = gameToFEN(game);
    expect(fen).toBe(START_FEN_9X9);

    const reparsed = parseFEN(fen);
    expect(reparsed.turn).toBe('white');
    expect((reparsed.board as (Piece | null)[][]).length).toBe(9);
  });

  it('handles empty squares as run-length numbers', () => {
    const game = makeGame(START_FEN_9X9);
    const fen = gameToFEN(game);
    // The five empty middle ranks (indices 2-6) must compress to "9"
    const middleRanks = fen.split(' ')[0].split('/').slice(2, 7);
    expect(middleRanks).toEqual(['9', '9', '9', '9', '9']);
  });

  it('respects the side to move', () => {
    const game = makeGame('rnbqkcabnr/ppppppppp/9/9/9/9/9/PPPPPPPPP/RNBQKCABNR b - - 0 1');
    expect(gameToFEN(game).split(' ')[1]).toBe('b');
  });

  it('serializes custom piece types (angel e, archbishop a, chancellor c, nightrider j)', () => {
    // 9x9 board: only the last rank is populated with custom pieces + a gap + king
    const fen = '9/9/9/9/9/9/9/9/EACJ4K w - - 0 1';
    const game = makeGame(fen);
    const out = gameToFEN(game);
    // last rank: E A C J [4 empty] K  -> "EACJ4K"
    const lastRank = out.split(' ')[0].split('/')[8];
    expect(lastRank).toBe('EACJ4K');
  });
});

describe('buildShareText', () => {
  it('returns only FEN when no moves have been played', () => {
    const game = makeGame(START_FEN_9X9);
    const text = buildShareText(game);
    expect(text).toBe(`FEN: ${START_FEN_9X9}`);
  });

  it('includes PGN when move history is present', () => {
    const game = makeGame(START_FEN_9X9, 3);
    const text = buildShareText(game);
    expect(text).toContain('FEN:');
    expect(text).toContain('PGN:');
  });
});

describe('shareCurrentGame', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: undefined,
      canShare: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('copies FEN+PGN to the clipboard and returns true', async () => {
    const game = makeGame(START_FEN_9X9);
    const ok = await shareCurrentGame(game);
    expect(ok).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
    const payload = (navigator.clipboard.writeText as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0];
    expect(payload).toContain('FEN:');
  });

  it('prefers the native share sheet when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn() },
      share: shareMock,
      canShare: vi.fn().mockReturnValue(true),
    });
    const game = makeGame(START_FEN_9X9);
    const ok = await shareCurrentGame(game);
    expect(ok).toBe(true);
    expect(shareMock).toHaveBeenCalledOnce();
    expect((navigator.clipboard.writeText as unknown as { mock: { calls: unknown[][] } })).not.toHaveBeenCalled();
  });

  it('returns false when clipboard write fails', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) },
      share: undefined,
      canShare: undefined,
    });
    const game = makeGame(START_FEN_9X9);
    const ok = await shareCurrentGame(game);
    expect(ok).toBe(false);
  });
});
