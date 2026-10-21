import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useViewerFullscreen } from "./useViewerFullscreen";

function setup(el: HTMLElement = document.createElement("div")) {
  const ref = { current: el };
  return { el, ...renderHook(() => useViewerFullscreen(ref)) };
}

afterEach(() => {
  document.body.style.overflow = "";
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
});

describe("useViewerFullscreen", () => {
  it("sin Fullscreen API entra en modo expandido y bloquea el scroll", () => {
    document.body.style.overflow = "auto";
    const { result } = setup();

    act(() => result.current.toggle());
    expect(result.current.mode).toBe("expanded");
    expect(result.current.isFullscreen).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    act(() => result.current.toggle());
    expect(result.current.mode).toBe("none");
    expect(document.body.style.overflow).toBe("auto");
  });

  it("restaura el scroll si se desmonta estando expandido", () => {
    document.body.style.overflow = "auto";
    const { result, unmount } = setup();

    act(() => result.current.toggle());
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("si requestFullscreen se rechaza cae a modo expandido", async () => {
    const el = document.createElement("div");
    el.requestFullscreen = vi.fn().mockRejectedValue(new Error("denied"));
    const { result } = setup(el);

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.mode).toBe("expanded"));
  });

  it("con Fullscreen API usa modo nativo y no toca el scroll", () => {
    const el = document.createElement("div");
    el.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const { result } = setup(el);

    act(() => result.current.toggle());
    expect(el.requestFullscreen).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: el });
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(result.current.mode).toBe("native");
    expect(document.body.style.overflow).toBe("");
  });
});
