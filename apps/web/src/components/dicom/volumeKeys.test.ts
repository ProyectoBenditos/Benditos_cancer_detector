import { describe, expect, it } from "vitest";
import { volumeKeyAction } from "./volumeKeys";

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
