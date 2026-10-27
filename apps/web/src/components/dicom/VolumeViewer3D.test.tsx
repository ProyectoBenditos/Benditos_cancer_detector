import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// La carga queda pendiente: se prueba la barra y el lienzo sin WebGL.
vi.mock("./volumeClient", () => ({
  loadPublicVolume: () => new Promise(() => {}),
  prepareStudyVolume: () => new Promise(() => {}),
}));

import VolumeViewer3D from "./VolumeViewer3D";

afterEach(cleanup);

describe("VolumeViewer3D: accesibilidad", () => {
  it("Escape cierra la pantalla completa y devuelve el foco al botón", () => {
    render(<VolumeViewer3D manifestUrl="/demo/manifest.json" />);
    fireEvent.click(screen.getByRole("button", { name: "Pantalla completa" }));
    const canvas = screen.getByRole("application");
    canvas.focus();

    fireEvent.keyDown(canvas, { key: "Escape" });

    const button = screen.getByRole("button", { name: "Pantalla completa" });
    expect(document.activeElement).toBe(button);
  });

  it("Tab no sale del visor en pantalla completa", () => {
    render(<VolumeViewer3D manifestUrl="/demo/manifest.json" />);
    const toggle = screen.getByRole("button", { name: "Pantalla completa" });
    fireEvent.click(toggle);
    // La opacidad es el último control enfocable del visor: Tab vuelve al primero.
    const last = screen.getByLabelText("Opacidad del parénquima");
    last.focus();

    const notPrevented = fireEvent.keyDown(last, { key: "Tab" });
    expect(notPrevented).toBe(false);
  });

  it("el lienzo se anuncia como aplicación con su etiqueta", () => {
    render(<VolumeViewer3D manifestUrl="/demo/manifest.json" />);
    expect(screen.getByRole("application")).toHaveAccessibleName(/Volumen torácico 3D/);
  });

  it("los iconos de la barra están ocultos al lector de pantalla", () => {
    const { container } = render(<VolumeViewer3D manifestUrl="/demo/manifest.json" />);
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"));
  });
});
