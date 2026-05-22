import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renderiza el texto del status y aria-label semántico", () => {
    render(<StatusBadge status="processing" />);
    const badge = screen.getByLabelText("Estado: processing");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe("processing");
  });

  it("aplica estilos emerald para ai_completed", () => {
    render(<StatusBadge status="ai_completed" />);
    expect(screen.getByLabelText("Estado: ai_completed").className).toContain("emerald");
  });

  it("aplica estilos amber para processing", () => {
    render(<StatusBadge status="processing" />);
    expect(screen.getByLabelText("Estado: processing").className).toContain("amber");
  });

  it("aplica estilos brand-danger para ai_failed", () => {
    render(<StatusBadge status="ai_failed" />);
    expect(screen.getByLabelText("Estado: ai_failed").className).toContain("brand-danger");
  });

  it("aplica estilos brand-danger para error y critical", () => {
    const { rerender } = render(<StatusBadge status="error" />);
    expect(screen.getByLabelText("Estado: error").className).toContain("brand-danger");
    rerender(<StatusBadge status="critical" />);
    expect(screen.getByLabelText("Estado: critical").className).toContain("brand-danger");
  });

  it("aplica estilos slate (fallback) para status desconocido", () => {
    render(<StatusBadge status="desconocido" />);
    expect(screen.getByLabelText("Estado: desconocido").className).toContain("slate");
  });

  it("normaliza el status a minúsculas para mapear estilos (Processing → amber)", () => {
    render(<StatusBadge status="Processing" />);
    expect(screen.getByLabelText("Estado: Processing").className).toContain("amber");
  });
});
