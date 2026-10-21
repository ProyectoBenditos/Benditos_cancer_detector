import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { PlatformShell } from "./PlatformShell";

vi.mock("next/navigation", () => ({ usePathname: () => "/platform" }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

function renderShell() {
  render(
    <PlatformShell userRole="medico" userEmail="medico@ejemplo.com">
      <p>Contenido</p>
    </PlatformShell>
  );
  return {
    toggle: screen.getByRole("button", { name: "Abrir menú" }),
    menu: screen.getByRole("complementary", { name: "Menú lateral" }),
  };
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("PlatformShell — menú en móvil", () => {
  it("arranca cerrado", () => {
    const { toggle, menu } = renderShell();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", menu.id);
    expect(menu).toHaveAttribute("data-open", "false");
  });

  it("el botón lo abre, bloquea el scroll y lleva el foco a Cerrar", () => {
    const { toggle, menu } = renderShell();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(menu).toHaveAttribute("data-open", "true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveFocus();
  });

  it("Esc lo cierra y devuelve el foco al botón", () => {
    const { toggle, menu } = renderShell();
    fireEvent.click(toggle);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(menu).toHaveAttribute("data-open", "false");
    expect(document.body.style.overflow).toBe("");
    expect(toggle).toHaveFocus();
  });

  it("elegir un enlace lo cierra", () => {
    const { toggle, menu } = renderShell();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("link", { name: /Historial DICOM/ }));
    expect(menu).toHaveAttribute("data-open", "false");
  });

  it("tocar el fondo lo cierra", () => {
    const { toggle, menu } = renderShell();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByTestId("menu-backdrop"));
    expect(menu).toHaveAttribute("data-open", "false");
  });
});
