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

  it("el botón Parpadeo también anuncia", () => {
    renderViewer();
    fireEvent.click(screen.getByText("Parpadeo"));
    expect(screen.getByRole("status")).toHaveTextContent("IA oculta");
  });
});
