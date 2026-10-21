import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { BeforeAfterViewer } from "./BeforeAfterViewer";

function renderViewer() {
  render(
    <>
      <button type="button">Guardar valoración</button>
      <BeforeAfterViewer beforeUrl="/estudio.png" heatmapBase64="AAAA" />
    </>
  );
  return screen.getByRole("group", { name: /Visor de tomografía/ });
}

const space = { key: " ", code: "Space" };

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
