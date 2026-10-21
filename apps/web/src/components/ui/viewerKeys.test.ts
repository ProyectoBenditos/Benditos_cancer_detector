import { describe, expect, it } from "vitest";
import { isFormControlTarget, nextRadioIndex, resolveViewerKey, VIEWER_SHORTCUTS, type KeyInput } from "./viewerKeys";

const k = (key: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods,
});
const onContainer = { isContainer: true, isFormControl: false };
const onButton = { isContainer: false, isFormControl: false };
const onInput = { isContainer: false, isFormControl: true };

describe("resolveViewerKey", () => {
  it("Espacio alterna la IA solo con el contenedor enfocado", () => {
    expect(resolveViewerKey(k(" "), onContainer)).toBe("toggleAi");
    expect(resolveViewerKey(k(" "), onButton)).toBeNull();
    expect(resolveViewerKey(k(" "), onInput)).toBeNull();
  });

  it("no captura el zoom del navegador", () => {
    expect(resolveViewerKey(k("0", { ctrlKey: true }), onContainer)).toBeNull();
    expect(resolveViewerKey(k("+", { metaKey: true }), onContainer)).toBeNull();
    expect(resolveViewerKey(k("-", { altKey: true }), onContainer)).toBeNull();
  });

  it("las flechas en un control de formulario no desplazan la imagen", () => {
    expect(resolveViewerKey(k("ArrowRight"), onInput)).toBeNull();
    expect(resolveViewerKey(k("ArrowRight"), onButton)).toBe("panRight");
  });

  it("Escape sale de pantalla completa incluso desde un control", () => {
    expect(resolveViewerKey(k("Escape"), onInput)).toBe("exitFullscreen");
  });

  it("mapea los atajos existentes y la ayuda", () => {
    expect(resolveViewerKey(k("+"), onButton)).toBe("zoomIn");
    expect(resolveViewerKey(k("="), onButton)).toBe("zoomIn");
    expect(resolveViewerKey(k("-"), onButton)).toBe("zoomOut");
    expect(resolveViewerKey(k("0"), onButton)).toBe("reset");
    expect(resolveViewerKey(k("f"), onButton)).toBe("toggleFullscreen");
    expect(resolveViewerKey(k("F"), onButton)).toBe("toggleFullscreen");
    expect(resolveViewerKey(k("ArrowUp"), onContainer)).toBe("panUp");
    expect(resolveViewerKey(k("ArrowDown"), onContainer)).toBe("panDown");
    expect(resolveViewerKey(k("ArrowLeft"), onContainer)).toBe("panLeft");
    expect(resolveViewerKey(k("?"), onContainer)).toBe("openHelp");
    expect(resolveViewerKey(k("x"), onContainer)).toBeNull();
  });

  it("teclas de herramienta", () => {
    expect(resolveViewerKey(k("h"), onContainer)).toBe("toolPan");
    expect(resolveViewerKey(k("H"), onButton)).toBe("toolPan");
    expect(resolveViewerKey(k("A"), onButton)).toBe("toolAdjust");
    expect(resolveViewerKey(k("m"), onContainer)).toBe("toolMarker");
    expect(resolveViewerKey(k("L"), onContainer)).toBe("toolMeasure");
    expect(resolveViewerKey(k("m"), onInput)).toBeNull();
    expect(resolveViewerKey(k("a", { ctrlKey: true }), onContainer)).toBeNull();
  });

  it("Enter agrega marcador solo con el contenedor enfocado", () => {
    expect(resolveViewerKey(k("Enter"), onContainer)).toBe("addMarker");
    expect(resolveViewerKey(k("Enter"), onButton)).toBeNull();
    expect(resolveViewerKey(k("Enter"), onInput)).toBeNull();
  });
});

describe("nextRadioIndex", () => {
  const none = [false, false, false, false];

  it("flechas con vuelta", () => {
    expect(nextRadioIndex("ArrowRight", 3, none)).toBe(0);
    expect(nextRadioIndex("ArrowLeft", 0, none)).toBe(3);
    expect(nextRadioIndex("ArrowDown", 1, none)).toBe(2);
    expect(nextRadioIndex("ArrowUp", 1, none)).toBe(0);
  });

  it("Home/End y saltar deshabilitados", () => {
    const measureOff = [false, false, false, true];
    expect(nextRadioIndex("ArrowRight", 2, measureOff)).toBe(0);
    expect(nextRadioIndex("ArrowLeft", 0, measureOff)).toBe(2);
    expect(nextRadioIndex("End", 0, measureOff)).toBe(2);
    expect(nextRadioIndex("Home", 2, measureOff)).toBe(0);
  });

  it("otras teclas no aplican", () => {
    expect(nextRadioIndex("a", 0, none)).toBeNull();
  });
});

describe("VIEWER_SHORTCUTS", () => {
  it("documenta las herramientas y dice Brillo/Contraste, no WW/WL", () => {
    const keys = VIEWER_SHORTCUTS.map((s) => s.keys);
    expect(keys).toEqual(expect.arrayContaining(["H", "A", "M", "L", "Enter"]));
    const text = VIEWER_SHORTCUTS.map((s) => s.description).join(" ");
    expect(text).toContain("Brillo/Contraste");
    expect(text).not.toMatch(/WW|WL/);
  });
});

describe("isFormControlTarget", () => {
  it("reconoce campos de formulario", () => {
    expect(isFormControlTarget(document.createElement("input"))).toBe(true);
    expect(isFormControlTarget(document.createElement("textarea"))).toBe(true);
    expect(isFormControlTarget(document.createElement("select"))).toBe(true);
  });

  it("no trata botones ni contenedores como campos", () => {
    expect(isFormControlTarget(document.createElement("button"))).toBe(false);
    expect(isFormControlTarget(document.createElement("div"))).toBe(false);
    expect(isFormControlTarget(null)).toBe(false);
  });
});
