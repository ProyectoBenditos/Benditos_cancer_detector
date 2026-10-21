import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { BeforeAfterViewer, type ViewerSummary } from "./BeforeAfterViewer";

function renderViewer(summary?: ViewerSummary) {
  render(
    <>
      <button type="button">Guardar valoración</button>
      <BeforeAfterViewer beforeUrl="/estudio.png" heatmapBase64="AAAA" summary={summary} />
    </>
  );
  return screen.getByRole("group", { name: /Visor de tomografía/ });
}

const space = { key: " ", code: "Space" };

/** Indicador de zoom y brillo/contraste en la esquina del lienzo. */
const canvasInfo = () => screen.getByText(/^Zoom \d+%/);

/** Arrastre de (0,0) a (dx,dy) sobre el lienzo con eventos de puntero. */
function dragOn(el: HTMLElement, dx: number, dy: number) {
  fireEvent.pointerDown(el, { clientX: 0, clientY: 0, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: dx, clientY: dy, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: dx, clientY: dy, pointerId: 1 });
}

describe("BeforeAfterViewer — teclado", () => {
  it("Espacio fuera del visor no alterna la IA", () => {
    renderViewer();
    fireEvent.keyDown(screen.getByRole("button", { name: "Guardar valoración" }), space);
    expect(screen.getByText("Parpadeo")).toBeInTheDocument();
    expect(screen.queryByText("TAC Pura")).not.toBeInTheDocument();
  });

  it("Espacio sobre un botón del visor no alterna la IA", () => {
    renderViewer();
    fireEvent.keyDown(screen.getByRole("button", { name: "Acercar (+)" }), space);
    expect(screen.queryByText("TAC Pura")).not.toBeInTheDocument();
  });

  it("Espacio con el visor enfocado alterna la IA", () => {
    const visor = renderViewer();
    visor.focus();
    fireEvent.keyDown(visor, space);
    expect(screen.getByText("TAC Pura")).toBeInTheDocument();
  });

  it("pantalla completa sin API expande el visor y Esc lo cierra", () => {
    const visor = renderViewer();
    fireEvent.click(screen.getByRole("button", { name: "Pantalla completa (F)" }));
    expect(visor).toHaveAttribute("data-fullscreen", "true");
    expect(visor).toHaveAttribute("data-fullscreen-mode", "expanded");

    fireEvent.keyDown(visor, { key: "Escape" });
    expect(visor).toHaveAttribute("data-fullscreen", "false");
  });

  it("Las flechas sobre la cortina no se bloquean", () => {
    renderViewer();
    const slider = screen.getByRole("slider", { name: "Posición de la cortina" });
    expect(fireEvent.keyDown(slider, { key: "ArrowRight" })).toBe(true);
  });
});

describe("BeforeAfterViewer — etiquetas", () => {
  it("el deslizador de opacidad tiene nombre accesible", () => {
    renderViewer();
    fireEvent.click(screen.getByRole("radio", { name: /Superpuesto/ }));
    expect(screen.getByRole("slider", { name: "Intensidad del mapa de calor" })).toBeInTheDocument();
  });
});

describe("BeforeAfterViewer — ayuda", () => {
  it("? con el visor enfocado abre la ayuda dentro del visor", () => {
    const visor = renderViewer();
    fireEvent.keyDown(visor, { key: "?" });
    const dialog = screen.getByRole("dialog", { name: "Atajos del visor" });
    expect(dialog).toHaveTextContent("Mostrar u ocultar la IA (con el visor enfocado)");
    expect(visor).toContainElement(dialog);
  });

  it("el botón de la barra abre la ayuda", () => {
    renderViewer();
    fireEvent.click(screen.getByRole("button", { name: "Atajos de teclado (?)" }));
    expect(screen.getByRole("dialog", { name: "Atajos del visor" })).toBeInTheDocument();
  });

  it("Esc con la ayuda abierta en modo expandido cierra solo la ayuda", () => {
    const visor = renderViewer();
    fireEvent.click(screen.getByRole("button", { name: "Pantalla completa (F)" }));
    fireEvent.keyDown(visor, { key: "?" });
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Atajos del visor" }), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(visor).toHaveAttribute("data-fullscreen", "true");
  });
});

describe("BeforeAfterViewer — herramientas", () => {
  it("arranca con Mover activo", () => {
    renderViewer();
    expect(screen.getByRole("radio", { name: "Mover (H)" })).toHaveAttribute("aria-checked", "true");
  });

  it("las teclas H/A/M cambian la herramienta activa y se anuncian", () => {
    const visor = renderViewer();
    fireEvent.keyDown(visor, { key: "a" });
    expect(screen.getByRole("radio", { name: "Brillo/Contraste (A)" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Herramienta: Brillo/Contraste");
    fireEvent.keyDown(visor, { key: "m" });
    expect(screen.getByRole("radio", { name: "Marcador (M)" })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(visor, { key: "h" });
    expect(screen.getByRole("radio", { name: "Mover (H)" })).toHaveAttribute("aria-checked", "true");
  });

  it("Medir está desactivado con explicación y L lo anuncia", () => {
    const visor = renderViewer();
    const medir = screen.getByRole("radio", { name: "Medir (L)" });
    expect(medir).toHaveAttribute("aria-disabled", "true");
    expect(medir).toHaveAccessibleDescription(/PixelSpacing/);
    fireEvent.click(medir);
    expect(medir).toHaveAttribute("aria-checked", "false");
    fireEvent.keyDown(visor, { key: "l" });
    expect(medir).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("status")).toHaveTextContent(/PixelSpacing/);
  });

  it("flechas recorren la paleta, saltan Medir y no se propagan", () => {
    renderViewer();
    const marcador = screen.getByRole("radio", { name: "Marcador (M)" });
    fireEvent.click(marcador);
    expect(marcador).toHaveAttribute("tabindex", "0");
    marcador.focus();
    expect(fireEvent.keyDown(marcador, { key: "ArrowRight" })).toBe(false);
    const mover = screen.getByRole("radio", { name: "Mover (H)" });
    expect(mover).toHaveAttribute("aria-checked", "true");
    expect(mover).toHaveFocus();
    expect(marcador).toHaveAttribute("tabindex", "-1");
  });

  it("flechas en el selector de modo", () => {
    renderViewer();
    const cortina = screen.getByRole("radio", { name: /Cortina/ });
    cortina.focus();
    fireEvent.keyDown(cortina, { key: "ArrowLeft" });
    const superpuesto = screen.getByRole("radio", { name: /Superpuesto/ });
    expect(superpuesto).toHaveAttribute("aria-checked", "true");
    expect(superpuesto).toHaveFocus();
  });

  it("Espacio anuncia el estado de la IA", () => {
    const visor = renderViewer();
    visor.focus();
    fireEvent.keyDown(visor, space);
    expect(screen.getByRole("status")).toHaveTextContent("IA oculta");
    fireEvent.keyDown(visor, space);
    expect(screen.getByRole("status")).toHaveTextContent("IA visible");
  });

  it("el lienzo muestra el zoom en la esquina", () => {
    renderViewer();
    expect(screen.getByText("Zoom 100%")).toBeInTheDocument();
  });

  it("arrastrar con Brillo/Contraste ajusta solo la TAC; doble clic y 0 restablecen", () => {
    const visor = renderViewer();
    fireEvent.keyDown(visor, { key: "a" });
    const stage = screen.getByRole("group", { name: /Comparativa en cortina/ });
    dragOn(stage, 100, 0);
    expect(canvasInfo()).toHaveTextContent("Zoom 100% · Brillo 100% · Contraste 150%");
    expect(screen.getByAltText("Estudio tomográfico original").style.filter).toBe("brightness(1) contrast(1.5)");
    expect(screen.getByAltText("Detección IA superpuesta").style.filter).toBe("");

    fireEvent.doubleClick(stage);
    expect(canvasInfo()).toHaveTextContent(/^Zoom 100%$/);

    dragOn(stage, 0, -100);
    expect(canvasInfo()).toHaveTextContent("Brillo 150%");
    fireEvent.keyDown(visor, { key: "0" });
    expect(canvasInfo()).toHaveTextContent(/^Zoom 100%$/);
  });

  it("con Mover, arrastrar no cambia el brillo", () => {
    renderViewer();
    const stage = screen.getByRole("group", { name: /Comparativa en cortina/ });
    dragOn(stage, 100, 0);
    expect(canvasInfo()).toHaveTextContent(/^Zoom 100%$/);
  });

  it("el botón Parpadeo también anuncia", () => {
    renderViewer();
    fireEvent.click(screen.getByText("Parpadeo"));
    expect(screen.getByRole("status")).toHaveTextContent("IA oculta");
  });
});

/** Da medidas al lienzo (jsdom no hace layout): 400×400 en (0,0). */
function sizeStage(stage: HTMLElement, size = 400) {
  Object.defineProperty(stage, "clientWidth", { configurable: true, value: size });
  Object.defineProperty(stage, "clientHeight", { configurable: true, value: size });
  stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: size, height: size }) as DOMRect;
}

function addMarkerWithKeyboard(visor: HTMLElement) {
  visor.focus();
  fireEvent.keyDown(visor, { key: "m" });
  fireEvent.keyDown(visor, { key: "Enter" });
}

describe("BeforeAfterViewer — marcadores", () => {
  it("M + Enter agrega el marcador 1 en el centro", () => {
    const visor = renderViewer();
    addMarkerWithKeyboard(visor);
    const pin = screen.getByRole("button", { name: /^Marcador 1: sin clasificar/ });
    expect(pin.style.left).toBe("50%");
    expect(pin.style.top).toBe("50%");
    expect(screen.getByRole("status")).toHaveTextContent("Marcador 1 agregado");
  });

  it("Enter con la herramienta Mover no agrega marcador", () => {
    const visor = renderViewer();
    visor.focus();
    fireEvent.keyDown(visor, { key: "Enter" });
    expect(screen.queryByRole("button", { name: /^Marcador 1/ })).not.toBeInTheDocument();
  });

  it("un clic con Marcador agrega el pin donde se hizo clic; un arrastre no", () => {
    const visor = renderViewer();
    fireEvent.keyDown(visor, { key: "m" });
    const stage = screen.getByRole("group", { name: /Comparativa en cortina/ });
    sizeStage(stage);
    dragOn(stage, 0, 0); // clic en (0,0) → esquina superior izquierda
    const pin = screen.getByRole("button", { name: /^Marcador 1/ });
    expect(pin.style.left).toBe("0%");
    expect(pin.style.top).toBe("0%");
    dragOn(stage, 100, 100);
    expect(screen.queryByRole("button", { name: /^Marcador 2/ })).not.toBeInTheDocument();
  });

  it("las flechas sobre un pin lo mueven y no se propagan", () => {
    const visor = renderViewer();
    addMarkerWithKeyboard(visor);
    const pin = screen.getByRole("button", { name: /^Marcador 1/ });
    expect(fireEvent.keyDown(pin, { key: "ArrowRight" })).toBe(false);
    expect(pin.style.left).toBe("51%");
    fireEvent.keyDown(pin, { key: "ArrowUp" });
    expect(pin.style.top).toBe("49%");
  });

  it("pulsar un pin no crea otro marcador", () => {
    const visor = renderViewer();
    addMarkerWithKeyboard(visor);
    const pin = screen.getByRole("button", { name: /^Marcador 1/ });
    fireEvent.pointerDown(pin, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(pin, { clientX: 0, clientY: 0, pointerId: 1 });
    expect(screen.getAllByRole("button", { name: /^Marcador \d/ })).toHaveLength(1);
  });

  it("en Lado a lado solo un juego de pins es focalizable", () => {
    const visor = renderViewer();
    addMarkerWithKeyboard(visor);
    fireEvent.click(screen.getByRole("radio", { name: /Lado a lado/ }));
    expect(screen.getAllByRole("button", { name: /^Marcador 1/ })).toHaveLength(1);
  });
});

describe("BeforeAfterViewer — panel", () => {
  it("muestra score, riesgo y valoración resumida", () => {
    renderViewer({
      score: 0.82,
      riskLevel: "ALTO",
      review: { concordancia: "discrepa", lung_rads: "4A", conducta: null },
    });
    const panel = screen.getByRole("complementary", { name: "Panel del caso" });
    expect(panel).toHaveTextContent("82.0%");
    expect(panel).toHaveTextContent("ALTO");
    expect(panel).toHaveTextContent("Probabilidad estimada por el modelo, no severidad.");
    expect(panel).toHaveTextContent("Discrepa del resultado IA");
    expect(panel).toHaveTextContent("Los marcadores todavía no se guardan");
  });

  it("sin valoración lo dice", () => {
    renderViewer({ score: 0.3, riskLevel: "BAJO", review: null });
    expect(screen.getByRole("complementary", { name: "Panel del caso" })).toHaveTextContent(
      "Sin valoración registrada."
    );
  });

  it("un marcador nuevo abre su editor con el foco en el tipo y la nota se limita a 1000", () => {
    const visor = renderViewer();
    addMarkerWithKeyboard(visor);
    expect(screen.getByRole("combobox", { name: "Tipo de hallazgo" })).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Nota" })).toHaveAttribute("maxLength", "1000");
  });

  it("editar la nota actualiza la fila y el nombre del pin", () => {
    const visor = renderViewer();
    addMarkerWithKeyboard(visor);
    fireEvent.change(screen.getByRole("combobox", { name: "Tipo de hallazgo" }), {
      target: { value: "solido" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Nota" }), { target: { value: "Borde liso" } });
    expect(screen.getByRole("button", { name: "Marcador 1: nódulo sólido, Borde liso" })).toBeInTheDocument();
    expect(screen.getByText("1000", { exact: false })).toHaveTextContent("10/1000");
  });

  it("el tamaño acepta decimales que empiezan por 0 y se muestra en la fila", () => {
    const visor = renderViewer();
    addMarkerWithKeyboard(visor);
    const mm = screen.getByRole("spinbutton", { name: "Tamaño estimado (mm, opcional)" });
    fireEvent.change(mm, { target: { value: "0" } });
    expect(mm).toHaveValue(0);
    fireEvent.change(mm, { target: { value: "0.5" } });
    expect(screen.getByRole("complementary", { name: "Panel del caso" })).toHaveTextContent("0.5 mm");
  });

  it("escribir atajos en la nota no cambia de herramienta ni alterna la IA", () => {
    const visor = renderViewer();
    addMarkerWithKeyboard(visor);
    const nota = screen.getByRole("textbox", { name: "Nota" });
    for (const key of ["h", "a", "0", "f", "?", " ", "Enter"]) fireEvent.keyDown(nota, { key });
    expect(screen.getByRole("radio", { name: "Marcador (M)" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("TAC Pura")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Marcador \d/ })).toHaveLength(1);
  });

  it("borrar pide confirmación", () => {
    const visor = renderViewer();
    addMarkerWithKeyboard(visor);
    fireEvent.click(screen.getByRole("button", { name: "Borrar marcador 1" }));
    expect(screen.getByRole("button", { name: /^Marcador 1/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: /^Marcador 1/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Borrar marcador 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(screen.queryByRole("button", { name: /^Marcador 1/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Marcador 1 borrado");
  });

  it("seleccionar un pin abre su editor en el panel", () => {
    const visor = renderViewer();
    addMarkerWithKeyboard(visor);
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(screen.queryByRole("textbox", { name: "Nota" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Marcador 1/ }));
    expect(screen.getByRole("textbox", { name: "Nota" })).toBeInTheDocument();
  });
});

describe("BeforeAfterViewer — pantalla completa con panel", () => {
  const enterFullscreen = () => fireEvent.click(screen.getByRole("button", { name: "Pantalla completa (F)" }));

  it("en pantalla completa el panel está dentro del visor", () => {
    const visor = renderViewer({ score: 0.5, riskLevel: "MEDIO", review: null });
    enterFullscreen();
    expect(visor).toContainElement(screen.getByRole("complementary", { name: "Panel del caso" }));
  });

  it("la hoja inferior arranca plegada y se despliega", () => {
    renderViewer();
    enterFullscreen();
    const toggle = screen.getByRole("button", { name: /Panel del caso · 0 marcadores/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("agregar o seleccionar un marcador abre la hoja inferior", () => {
    const visor = renderViewer();
    enterFullscreen();
    addMarkerWithKeyboard(visor);
    const toggle = screen.getByRole("button", { name: /Panel del caso · 1 marcador$/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: /^Marcador 1/ }));
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("en modo expandido Tab desde el último control vuelve al visor", () => {
    const visor = renderViewer();
    enterFullscreen();
    const focusables = visor.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), input, select, textarea'
    );
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(visor).toHaveFocus();
  });

  it("fuera de pantalla completa Tab no se contiene", () => {
    const visor = renderViewer();
    const focusables = visor.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), input, select, textarea'
    );
    const last = focusables[focusables.length - 1];
    last.focus();
    expect(fireEvent.keyDown(last, { key: "Tab" })).toBe(true);
  });

  it("Tab dentro de la ayuda abierta en pantalla completa se queda en la ayuda", () => {
    const visor = renderViewer();
    enterFullscreen();
    fireEvent.keyDown(visor, { key: "?" });
    const cerrar = screen.getByRole("button", { name: "Cerrar modal" });
    cerrar.focus();
    fireEvent.keyDown(cerrar, { key: "Tab" });
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  });
});
