import { expect, test, describe } from "vitest";
import { loadOpeningBook, pickBookMove, inBook } from "@trischach/opening-book";
import { Game } from "@trischach/game";
import { generateBoard } from "@trischach/board";

describe("Opening-book moves are applicable in real game", () => {
  test("start position book move is executable via handleCellClick", async () => {
    const ok = await loadOpeningBook();
    expect(ok).toBe(true);

    const game = new Game();
    game.init(generateBoard());

    const inB = inBook(game);
    console.log("inBook(start) =", inB);

    const move = pickBookMove(game);
    console.log("pickBookMove(start) =", move);

    if (move) {
      const piece = game.pieces.find((p: any) => p.id === move.piece.id);
      expect(piece).toBeTruthy();
      game.handleCellClick(piece.pos);
      const result = game.handleCellClick(move.target);
      console.log("handleCellClick result =", result);
      // The book move MUST be executable in the real game state.
      expect(result).toBeTruthy();
      expect((result as any).action).toBe("move");
    } else {
      // If not in book, that's fine — but then auto-battle uses minimax.
      expect(inB).toBe(false);
    }
  });
});
