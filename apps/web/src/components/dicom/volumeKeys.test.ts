import { describe, expect, it } from "vitest";
import { volumeKeyAction, volumeKeyActionFromEvent } from "./volumeKeys";

describe("volumeKeyActionFromEvent", () => {
  const base = { ctrlKey: false, metaKey: false, altKey: false };
  it("passes plain keys through", () => {
    expect(volumeKeyActionFromEvent({ key: "+", ...base })).toEqual({ type: "zoom", delta: -0.1 });
  });
  it("ignores browser shortcuts with Ctrl, Meta or Alt", () => {
    for (const key of ["+", "-", "0", "ArrowLeft"]) {
      expect(volumeKeyActionFromEvent({ key, ...base, ctrlKey: true })).toBeNull();
      expect(volumeKeyActionFromEvent({ key, ...base, metaKey: true })).toBeNull();
      expect(volumeKeyActionFromEvent({ key, ...base, altKey: true })).toBeNull();
    }
  });
});

describe("volumeKeyAction", () => {
  it("maps arrows to rotation", () => {
    expect(volumeKeyAction("ArrowLeft")).toEqual({ type: "rotate", dx: 0, dy: -0.1 });
    expect(volumeKeyAction("ArrowRight")).toEqual({ type: "rotate", dx: 0, dy: 0.1 });
    expect(volumeKeyAction("ArrowUp")).toEqual({ type: "rotate", dx: -0.1, dy: 0 });
    expect(volumeKeyAction("ArrowDown")).toEqual({ type: "rotate", dx: 0.1, dy: 0 });
  });
  it("maps + = and - to zoom", () => {
    expect(volumeKeyAction("+")).toEqual({ type: "zoom", delta: -0.1 });
    expect(volumeKeyAction("=")).toEqual({ type: "zoom", delta: -0.1 });
    expect(volumeKeyAction("-")).toEqual({ type: "zoom", delta: 0.1 });
  });
  it("maps 0 to reset and ignores other keys", () => {
    expect(volumeKeyAction("0")).toEqual({ type: "reset" });
    expect(volumeKeyAction("a")).toBeNull();
  });
});
