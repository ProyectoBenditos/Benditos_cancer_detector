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

  it("Las flechas sobre la cortina no se bloquean", () => {
    renderViewer();
    const slider = screen.getByRole("slider", { name: "Posición de la cortina" });
    expect(fireEvent.keyDown(slider, { key: "ArrowRight" })).toBe(true);
  });
});
