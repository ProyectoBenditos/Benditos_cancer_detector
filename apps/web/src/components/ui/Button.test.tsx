import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { Button, buttonVariants } from "./Button";

describe("Button", () => {
  it("renderiza el children como texto del botón", () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("invoca onClick cuando se hace clic", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Acción</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("aplica disabled y aria-busy cuando loading=true", () => {
    render(<Button loading>Procesando</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("aplica la clase de la variante danger", () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole("button").className).toContain("bg-brand-danger");
  });

  it("respeta el atributo disabled aunque loading sea false", () => {
    render(<Button disabled>No</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("no invoca onClick cuando está disabled", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>No</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("buttonVariants helper", () => {
  it("incluye clases base, variante y tamaño para defaults", () => {
    const cls = buttonVariants();
    expect(cls).toContain("bg-brand-primary");
    expect(cls).toContain("px-5");
  });

  it("incluye clases de la variante secondary y tamaño lg", () => {
    const cls = buttonVariants({ variant: "secondary", size: "lg" });
    expect(cls).toContain("bg-white");
    expect(cls).toContain("px-8");
  });
});
