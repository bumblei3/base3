import {
  expect,
  test,
  describe,
  beforeEach,
  vi,
  afterEach,
  beforeAll,
} from "vitest";
import fs from "fs";
import path from "path";

// Read index.html to inject into JSDOM
// eslint-disable-next-line no-undef
const htmlPath = path.resolve(__dirname, "../../index.trischach.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");
const bodyMatch = htmlContent.match(
  new RegExp("<body[^>]*>([\\s\\S]*)</body>", "i"),
);
let bodyHTML = bodyMatch ? bodyMatch[1] : htmlContent;
// Remove ALL script tags (including module scripts with src)
bodyHTML = bodyHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
// Also remove self-closing script tags
bodyHTML = bodyHTML.replace(/<script\b[^>]*\/>/gi, "");

// Mock fetch globally BEFORE any module loads (happy-dom SyncFetch uses this)
const fetchMock = vi.hoisted(() => {
  const originalFetch = globalThis.fetch;
  return {
    originalFetch,
    mockFn: async (url, opts) => {
      if (typeof url === "string" && url.startsWith("http://localhost:3000/")) {
        const filePath = url.replace("http://localhost:3000/", "");
        let content = "";
        try {
          content = fs.readFileSync(`./${filePath}`, "utf8");
        } catch (e) {
          content = "";
        }
        const mime = filePath.endsWith(".css")
          ? "text/css"
          : filePath.endsWith(".js")
            ? "application/javascript"
            : "text/plain";
        return new Response(content, { headers: { "Content-Type": mime } });
      }
      return originalFetch(url, opts);
    },
  };
});

beforeAll(() => {
  vi.stubGlobal("fetch", fetchMock.mockFn);
});

describe("Main UI & Events", () => {
  beforeEach(() => {
    document.body.innerHTML = bodyHTML;
    
    // Force create SVG element with proper namespace BEFORE module import
    // Remove any existing SVG that might be improperly created by happy-dom
    const existingSvg = document.getElementById("board-svg");
    if (existingSvg) {
      existingSvg.remove();
    }
    const boardContainer = document.getElementById("board-container");
    if (boardContainer) {
      const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      newSvg.id = "board-svg";
      newSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      boardContainer.appendChild(newSvg);
    }

    vi.resetModules(); // Ensure main.js runs cleanly each time
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  test("UI initializes correctly on load", async () => {
    await import("@trischach/main");

    const svg = document.getElementById("board-svg");
    expect(svg.querySelectorAll(".hex-polygon").length).toBeGreaterThan(0);

    const turnEl = document.getElementById("turn-indicator");
    expect(turnEl.textContent).toContain("Feuer");
  });

  test("Board rotate button applies rotation", async () => {
    await import("@trischach/main");
    const rotateBtn = document.getElementById("rotate-btn");
    const svg = document.getElementById("board-svg");

    rotateBtn.click();
    expect(svg.style.transform).toBe("rotate(120deg)");
    rotateBtn.click();
    expect(svg.style.transform).toBe("rotate(240deg)");
  });

  test("Auto Battle toggle button", async () => {
    vi.useFakeTimers();
    await import("@trischach/main");
    const autoBattleBtn = document.getElementById("auto-battle-btn");

    autoBattleBtn.click();
    expect(autoBattleBtn.classList.contains("active")).toBe(true);

    vi.advanceTimersByTime(500);

    autoBattleBtn.click();
    expect(autoBattleBtn.classList.contains("active")).toBe(false);
    vi.useRealTimers();
  });

  test("Restart button resets the game", async () => {
    await import("@trischach/main");
    const restartBtn = document.getElementById("restart-btn");
    const moveLogEl = document.getElementById("move-log");

    moveLogEl.innerHTML = "<div>Fake Move</div>";
    restartBtn.click();

    expect(moveLogEl.innerHTML).toBe("");
    const statusEl = document.getElementById("status");
    expect(statusEl.textContent).toBe("Wähle eine Figur");
  });

  test("Toggles for RPS and Sound", async () => {
    await import("@trischach/main");
    const rpsToggle = document.getElementById("rps-toggle");
    const soundToggle = document.getElementById("sound-toggle");
    const rpsInfoEl = document.getElementById("rps-info");

    rpsToggle.checked = false;
    rpsToggle.dispatchEvent(new Event("change"));
    expect(rpsInfoEl.classList.contains("rps-inactive")).toBe(true);

    rpsToggle.checked = true;
    rpsToggle.dispatchEvent(new Event("change"));
    expect(rpsInfoEl.classList.contains("rps-inactive")).toBe(false);
  });

  test.skip("Simulate gameplay clicks (move and combat)", async () => {
    vi.useFakeTimers();
    await import("@trischach/main");

    // Get the game and renderer from main module
    const { game, renderer } = await import("@trischach/main");

    // Click on a fire pawn
    const firePawn = document.querySelector(
      '.hex-polygon[data-faction="fire"]',
    );
    expect(firePawn).toBeTruthy();
    firePawn.click();

    // Verify piece is selected
    expect(firePawn.classList.contains("selected")).toBe(true);

    // Click on a valid move target
    const validTarget = document.querySelector(".hex-polygon.valid-move");
    expect(validTarget).toBeTruthy();
    validTarget.click();

    // Advance timers to allow combat animation
    vi.advanceTimersByTime(1000);

    // Verify move was made - turn should change
    expect(game.currentFaction).not.toBe("fire");
  });

  test("Auto Battle can be stopped during combat animation", async () => {
    vi.useFakeTimers();
    await import("@trischach/main");

    const autoBattleBtn = document.getElementById("auto-battle-btn");
    autoBattleBtn.click();
    expect(autoBattleBtn.classList.contains("active")).toBe(true);

    // Stop auto battle
    autoBattleBtn.click();
    expect(autoBattleBtn.classList.contains("active")).toBe(false);

    vi.useRealTimers();
  });

  test.skip("UI responds to game over state", async () => {
    vi.useFakeTimers();
    const { game, renderer } = await import("@trischach/main");

    // Simulate game over state
    const { FACTION } = await import("@trischach/board");

    // Create a checkmate scenario - fire queen vs water king
    game.pieces = [];

    const { Hex } = await import("@trischach/hex");
    const { PIECE_TYPE, Piece } = await import("@trischach/pieces");

    // Clear board and set up checkmate position
    game.pieces = [];
    const fireQueen = new Piece(PIECE_TYPE.QUEEN, FACTION.FIRE, new Hex(0, 0));
    const waterKing = new Piece(PIECE_TYPE.KING, FACTION.WATER, new Hex(0, 1));
    game.pieces = [fireQueen, waterKing];
    game._rebuildOccupiedMap();
    game.eliminatedFactions.add(FACTION.NATURE);

    // Execute attack
    game.state = "select_piece";
    game.rpsEnabled = false;

    // Click queen
    const queenHex = document.querySelector(
      '.hex-polygon[data-faction="fire"][data-piece="queen"]',
    );
    queenHex?.click();

    // Click king to capture
    const kingHex = document.querySelector(
      '.hex-polygon[data-faction="water"][data-piece="king"]',
    );
    kingHex?.click();

    // Advance timers
    vi.advanceTimersByTime(500);

    // Should show game over UI
    const statusEl = document.getElementById("status");
    expect(statusEl.textContent.toLowerCase()).toContain("game over");
    vi.useRealTimers();
  });

  test.skip("Auto Battle triggers a normal move", async () => {
    vi.useFakeTimers();
    await import("@trischach/main");

    const { game } = await import("@trischach/main");
    const initialFaction = game.currentFaction;

    const autoBattleBtn = document.getElementById("auto-battle-btn");
    autoBattleBtn.click();

    // Wait for auto move
    vi.advanceTimersByTime(2000);

    // Verify turn changed (auto move happened)
    expect(game.currentFaction).not.toBe(initialFaction);
    vi.useRealTimers();
  });

  test("Auto Battle continues after non-game-over combat", async () => {
    vi.useFakeTimers();
    await import("@trischach/main");

    const autoBattleBtn = document.getElementById("auto-battle-btn");
    autoBattleBtn.click();

    vi.advanceTimersByTime(2000);
    expect(autoBattleBtn.classList.contains("active")).toBe(true);

    autoBattleBtn.click();
    expect(autoBattleBtn.classList.contains("active")).toBe(false);
    vi.useRealTimers();
  });

  test.skip("renderer.onCellClick executes normal move", async () => {
    await import("@trischach/main");
    const { renderer, game } = await import("@trischach/main");

    const initialFaction = game.currentFaction;

    // Call onCellClick with a valid move
    renderer.onCellClick(0, 2);

    expect(game.currentFaction).not.toBe(initialFaction);
  });

  test("triggerAutoMove delays if game state is not SELECT_PIECE", async () => {
    await import("@trischach/main");
    const { game, triggerAutoMove } = await import("@trischach/main");

    // Set state to something other than SELECT_PIECE
    game.state = "move_piece";

    // Should not crash and should return early
    await triggerAutoMove();

    // State should remain unchanged
    expect(game.state).toBe("move_piece");
  });
});