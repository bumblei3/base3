import { expect, test, describe, beforeEach, vi, afterEach, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

const htmlPath = path.resolve(__dirname, "../../index.trischach.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");
const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
let bodyHTML = bodyMatch ? bodyMatch[1] : htmlContent;
bodyHTML = bodyHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
bodyHTML = bodyHTML.replace(/<script\b[^>]*\/>/gi, "");

const fetchMock = vi.hoisted(() => {
  const originalFetch = globalThis.fetch;
  return {
    originalFetch,
    mockFn: async (url: any, opts: any) => {
      if (typeof url === "string" && url.startsWith("http://localhost:3000/")) {
        return new Response("", { headers: { "Content-Type": "text/plain" } });
      }
      return originalFetch(url, opts);
    },
  };
});

beforeAll(() => {
  vi.stubGlobal("fetch", fetchMock.mockFn);
});

// Mock the opening book so pickBookMove returns an ILLEGAL move (a piece id
// that does not exist in the game). This reproduces the regression where a
// compiled-book move is not applicable in the current game state and
// handleCellClick returns null, which used to silently stop auto-battle.
vi.mock("../js/trischach/opening-book.ts", () => ({
  inBook: vi.fn(() => true),
  pickBookMove: vi.fn(() => ({
    piece: { id: "nonexistent_piece_999", pos: { q: 0, r: 0 } },
    target: { q: 1, r: 1 } as any,
  })),
  loadOpeningBook: vi.fn(async () => true),
  getBookMoves: vi.fn(() => null),
  boardHash: vi.fn(() => "x"),
}));

// Mock AI so the loop runs fast and deterministically:
// - calculateBestMove returns a GUARANTEED-LEGAL move from the real game's
//   legal actions (no real minimax search, which is CPU-bound).
// - stopPondering / startPondering resolve immediately (no pending ponder).
vi.mock("../js/trischach/ai.ts", async () => {
  const actual = await vi.importActual<any>("../js/trischach/ai.ts");
  return {
    ...actual,
    calculateBestMove: vi.fn((game: any) => {
      const actions = actual.getAllActions(game, game.currentFaction);
      if (!actions || actions.length === 0) return null;
      const a = actions[0];
      return {
        pieceId: a.piece.id,
        targetQ: a.target.q,
        targetR: a.target.r,
        moveType: a.type,
        rps: a.rps,
      };
    }),
    stopPondering: vi.fn(async () => null),
    startPondering: vi.fn(() => {}),
  };
});

describe("Auto Battle survives illegal book move", () => {
  beforeEach(() => {
    document.body.innerHTML = bodyHTML;
    const existingSvg = document.getElementById("board-svg");
    if (existingSvg) existingSvg.remove();
    const boardContainer = document.getElementById("board-container");
    if (boardContainer) {
      const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      newSvg.id = "board-svg";
      newSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      boardContainer.appendChild(newSvg);
    }
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  test("Auto Battle continues past an illegal book move", async () => {
    vi.stubGlobal("fetch", fetchMock.mockFn);
    const mod = await import("@trischach/main");
    const { game } = mod;
    const initialFaction = game.currentFaction;

    const autoBattleBtn = document.getElementById("auto-battle-btn") as HTMLButtonElement;
    autoBattleBtn.click();

    // NOTE: We deliberately use REAL timers + a poll loop, not vi.useFakeTimers().
    // triggerAutoMove() runs an async setTimeout chain that performs dynamic
    // `await import(...)` calls; under fake timers those dynamic imports never
    // resolve, so advanceTimersByTimeAsync cannot flush the await chain and the
    // loop stalls forever (the exact symptom this test used to time out on).
    // With real timers the illegal-book-move fallback (getAllActions -> legal
    // move) executes and the turn advances.
    let progressed = false;
    for (let i = 0; i < 32; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (game.currentFaction !== initialFaction) {
        progressed = true;
        break;
      }
    }

    // A real move happened despite the illegal book move: turn advanced.
    expect(progressed).toBe(true);
    autoBattleBtn.click();
  }, 30000);
});
