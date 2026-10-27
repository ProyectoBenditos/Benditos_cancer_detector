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
  | "openHelp"
  | "toolPan"
  | "toolAdjust"
  | "toolMarker"
  | "toolMeasure"
  | "addMarker";

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
  h: "toolPan",
  H: "toolPan",
  a: "toolAdjust",
  A: "toolAdjust",
  m: "toolMarker",
  M: "toolMarker",
  l: "toolMeasure",
  L: "toolMeasure",
  ArrowUp: "panUp",
  ArrowDown: "panDown",
  ArrowLeft: "panLeft",
  ArrowRight: "panRight",
};

/** Atajos que muestra el modal de ayuda. Mantener en sincronía con resolveViewerKey. */
export const VIEWER_SHORTCUTS: ReadonlyArray<{ keys: string; description: string }> = [
  { keys: "Rueda del ratón", description: "Acercar o alejar hacia el cursor" },
  { keys: "Arrastrar", description: "Mover la imagen (con zoom aplicado)" },
  { keys: "H", description: "Herramienta Mover" },
  {
    keys: "A",
    description:
      "Herramienta Brillo/Contraste (arrastre horizontal = contraste, vertical = brillo; doble clic restablece)",
  },
  { keys: "M", description: "Herramienta Marcador (clic sobre la imagen)" },
  { keys: "Enter", description: "Con Marcador activo, agregar un marcador en el centro; con Medir, fijar un punto en el centro" },
  { keys: "Flechas sobre un marcador", description: "Mover el marcador" },
  { keys: "L", description: "Medir en mm (dos clics o Enter dos veces; solo estudios DICOM calibrados)" },
  { keys: "+ / −", description: "Acercar / alejar" },
  { keys: "Flechas", description: "Mover la imagen" },
  { keys: "0", description: "Restablecer zoom, posición y brillo/contraste" },
  { keys: "Espacio", description: "Mostrar u ocultar la IA (con el visor enfocado)" },
  { keys: "F", description: "Pantalla completa" },
  { keys: "Esc", description: "Descartar el primer punto de una medición o salir de pantalla completa" },
  { keys: "?", description: "Mostrar esta ayuda" },
];

export function resolveViewerKey(e: KeyInput, target: KeyTarget): ViewerAction | null {
  // Ctrl/Cmd/Alt + tecla pertenece al navegador (p. ej. Ctrl+0 = zoom de página).
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === "Escape") return "exitFullscreen";
  // Un campo (deslizador, casilla) conserva sus propias teclas.
  if (target.isFormControl) return null;
  if (e.key === " ") return target.isContainer ? "toggleAi" : null;
  // Sobre un botón, Enter pulsa el botón.
  if (e.key === "Enter") return target.isContainer ? "addMarker" : null;
  return SIMPLE_KEYS[e.key] ?? null;
}

/**
 * Patrón ARIA de radio: flechas con vuelta y Home/End, saltando las opciones
 * deshabilitadas. null si la tecla no aplica.
 */
export function nextRadioIndex(
  key: string,
  current: number,
  disabled: ReadonlyArray<boolean>,
): number | null {
  const n = disabled.length;
  const enabled = (i: number) => !disabled[i];
  const step = (dir: 1 | -1) => {
    for (let k = 1; k <= n; k++) {
      const i = (((current + dir * k) % n) + n) % n;
      if (enabled(i)) return i;
    }
    return null;
  };
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return step(1);
    case "ArrowLeft":
    case "ArrowUp":
      return step(-1);
    case "Home": {
      const i = disabled.findIndex((d) => !d);
      return i === -1 ? null : i;
    }
    case "End": {
      const i = disabled.findLastIndex((d) => !d);
      return i === -1 ? null : i;
    }
    default:
      return null;
  }
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
