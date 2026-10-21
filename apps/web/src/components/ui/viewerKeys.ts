/**
 * Atajos de teclado del visor (función pura, testeada).
 * Los atajos solo actúan cuando el evento viene de dentro del visor; Espacio,
 * además, solo cuando el foco está en el propio contenedor, para que siga
 * pulsando botones y marcando casillas con normalidad (WCAG 2.1.1).
 */

export type ViewerAction =
  | "zoomIn"
  | "zoomOut"
  | "reset"
  | "toggleFullscreen"
  | "exitFullscreen"
  | "panUp"
  | "panDown"
  | "panLeft"
  | "panRight"
  | "toggleAi"
  | "openHelp";

export type KeyInput = { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean };
export type KeyTarget = { isContainer: boolean; isFormControl: boolean };

const SIMPLE_KEYS: Record<string, ViewerAction> = {
  "+": "zoomIn",
  "=": "zoomIn",
  "-": "zoomOut",
  "0": "reset",
  f: "toggleFullscreen",
  F: "toggleFullscreen",
  "?": "openHelp",
  ArrowUp: "panUp",
  ArrowDown: "panDown",
  ArrowLeft: "panLeft",
  ArrowRight: "panRight",
};

/** Atajos que muestra el modal de ayuda. Mantener en sincronía con resolveViewerKey. */
export const VIEWER_SHORTCUTS: ReadonlyArray<{ keys: string; description: string }> = [
  { keys: "Rueda del ratón", description: "Acercar o alejar hacia el cursor" },
  { keys: "Arrastrar", description: "Mover la imagen (con zoom aplicado)" },
  { keys: "+ / −", description: "Acercar / alejar" },
  { keys: "Flechas", description: "Mover la imagen" },
  { keys: "0", description: "Restablecer zoom y posición" },
  { keys: "Espacio", description: "Mostrar u ocultar la IA (con el visor enfocado)" },
  { keys: "F", description: "Pantalla completa" },
  { keys: "Esc", description: "Salir de pantalla completa" },
  { keys: "?", description: "Mostrar esta ayuda" },
];

export function resolveViewerKey(e: KeyInput, target: KeyTarget): ViewerAction | null {
  // Ctrl/Cmd/Alt + tecla pertenece al navegador (p. ej. Ctrl+0 = zoom de página).
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === "Escape") return "exitFullscreen";
  // Un campo (deslizador, casilla) conserva sus propias teclas.
  if (target.isFormControl) return null;
  if (e.key === " ") return target.isContainer ? "toggleAi" : null;
  return SIMPLE_KEYS[e.key] ?? null;
}

export function isFormControlTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable === true
  );
}
