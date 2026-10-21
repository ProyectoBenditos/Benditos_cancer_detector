"use client";

import { useEffect, useState } from "react";

export type FullscreenMode = "none" | "native" | "expanded";

/**
 * Pantalla completa del visor. Usa la Fullscreen API cuando existe; si no
 * (iPhone Safari solo la ofrece para video) o el navegador la rechaza (iframe
 * sin allowfullscreen), cae a un modo "expandido" que cubre la ventana con
 * position: fixed y bloquea el scroll del body.
 */
export function useViewerFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [mode, setMode] = useState<FullscreenMode>("none");

  useEffect(() => {
    const onChange = () => {
      const isOurs = document.fullscreenElement != null && document.fullscreenElement === ref.current;
      setMode((prev) => (isOurs ? "native" : prev === "native" ? "none" : prev));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);

  useEffect(() => {
    if (mode !== "expanded") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mode]);

  const exit = () => {
    if (mode === "native") {
      void document.exitFullscreen?.();
    } else if (mode === "expanded") {
      setMode("none");
    }
  };

  const toggle = () => {
    if (mode !== "none") {
      exit();
      return;
    }
    const el = ref.current;
    if (el && typeof el.requestFullscreen === "function") {
      el.requestFullscreen().catch(() => setMode("expanded"));
    } else {
      setMode("expanded");
    }
  };

  return { mode, isFullscreen: mode !== "none", toggle, exit };
}
