"use client";

import { useEffect } from "react";

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function isTabbable(el: HTMLElement): boolean {
  if ((el as HTMLButtonElement).disabled) return false;
  if (el.getAttribute("tabindex") === "-1") return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  // Descarta lo oculto con display:none (p. ej. controles solo de móvil).
  return typeof el.checkVisibility === "function" ? el.checkVisibility() : true;
}

/**
 * Contiene Tab y Shift+Tab dentro de `ref` mientras `active`. Pensado para el
 * visor en pantalla completa: sin esto, Tab lleva el foco a la página tapada.
 * Deja pasar los eventos que vienen de un diálogo (el Modal tiene su propia trampa).
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest('[role="dialog"]')) return;

      const candidates = [
        ...(root.tabIndex >= 0 ? [root] : []),
        ...Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)),
      ];
      const items = candidates.filter(isTabbable);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [ref, active]);
}
