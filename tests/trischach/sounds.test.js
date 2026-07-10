import { expect, test, describe, vi, beforeEach } from "vitest";
import { sounds } from "../../js/trischach/sounds.ts";
import { MockAudioContext } from "../vitest.setup.ts";

describe("Sound System", () => {
  beforeEach(() => {
    // Reset sounds state - rely on global mocks from vitest.setup.ts
    sounds.ctx = null;
    sounds.enabled = true;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("toggle enables/disables sounds", () => {
    sounds.toggle(true);
    expect(sounds.enabled).toBe(true);
    sounds.toggle(false);
    expect(sounds.enabled).toBe(false);
  });

  test("playSelect creates sound nodes", () => {
    sounds.playSelect();
    expect(sounds.ctx).toBeInstanceOf(MockAudioContext);
  });

  test("playMove creates sound nodes", () => {
    sounds.playMove();
    expect(sounds.ctx).toBeInstanceOf(MockAudioContext);
  });

  test("playCombat creates sound nodes", () => {
    sounds.playCombat();
    expect(sounds.ctx).toBeInstanceOf(MockAudioContext);
  });

  test("playWin creates sound nodes", async () => {
    sounds.playWin();
    await vi.runAllTimersAsync();
    expect(sounds.ctx).toBeInstanceOf(MockAudioContext);
  });

  test("playCheck creates sound nodes", () => {
    sounds.playCheck();
    expect(sounds.ctx).toBeInstanceOf(MockAudioContext);
  });

  test("playStalemate creates sound nodes", async () => {
    sounds.playStalemate();
    await vi.runAllTimersAsync();
    expect(sounds.ctx).toBeInstanceOf(MockAudioContext);
  });

  test("playPromotion creates sound nodes", async () => {
    sounds.playPromotion();
    await vi.runAllTimersAsync();
    expect(sounds.ctx).toBeInstanceOf(MockAudioContext);
  });

  test("playMove fails when disabled", () => {
    sounds.enabled = false;
    const ctxBefore = sounds.ctx;
    sounds.playMove();
    expect(sounds.ctx).toBe(ctxBefore);
  });

  test("playCombat fails when disabled", () => {
    sounds.enabled = false;
    const ctxBefore = sounds.ctx;
    sounds.playCombat();
    expect(sounds.ctx).toBe(ctxBefore);
  });
});