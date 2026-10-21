import { describe, expect, it } from "vitest";
import { useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { useFocusTrap } from "./useFocusTrap";

function Harness({ active, withDialog = false }: { active: boolean; withDialog?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <>
      <button type="button">Fuera</button>
      <div ref={ref} tabIndex={0} data-testid="trap">
        <button type="button">Primero</button>
        <div aria-hidden="true">
          <button type="button">Oculto</button>
        </div>
        <button type="button" disabled>
          Deshabilitado
        </button>
        <button type="button">Último</button>
        {withDialog && (
          <div role="dialog" aria-label="Diálogo">
            <button type="button">En diálogo</button>
          </div>
        )}
      </div>
    </>
  );
}

describe("useFocusTrap", () => {
  it("Tab desde el último vuelve al contenedor", () => {
    render(<Harness active />);
    screen.getByRole("button", { name: "Último" }).focus();
    expect(fireEvent.keyDown(document.activeElement!, { key: "Tab" })).toBe(false);
    expect(screen.getByTestId("trap")).toHaveFocus();
  });

  it("Shift+Tab desde el contenedor va al último", () => {
    render(<Harness active />);
    screen.getByTestId("trap").focus();
    fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Último" })).toHaveFocus();
  });

  it("Tab en medio no intercepta", () => {
    render(<Harness active />);
    screen.getByRole("button", { name: "Primero" }).focus();
    expect(fireEvent.keyDown(document.activeElement!, { key: "Tab" })).toBe(true);
  });

  it("inactivo no intercepta", () => {
    render(<Harness active={false} />);
    screen.getByRole("button", { name: "Último" }).focus();
    expect(fireEvent.keyDown(document.activeElement!, { key: "Tab" })).toBe(true);
  });

  it("no interfiere con un diálogo abierto dentro", () => {
    render(<Harness active withDialog />);
    screen.getByRole("button", { name: "En diálogo" }).focus();
    expect(fireEvent.keyDown(document.activeElement!, { key: "Tab" })).toBe(true);
    expect(screen.getByRole("button", { name: "En diálogo" })).toHaveFocus();
  });
});
