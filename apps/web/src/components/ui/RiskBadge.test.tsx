import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { RiskBadge } from "./RiskBadge";

describe("RiskBadge", () => {
  it("renderiza el texto del nivel ALTO con aria-label apropiado", () => {
    render(<RiskBadge level="ALTO" />);
    const badge = screen.getByLabelText("Riesgo alto");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe("ALTO");
  });

  it("usa estilos brand-danger para nivel ALTO", () => {
    render(<RiskBadge level="ALTO" />);
    const badge = screen.getByLabelText("Riesgo alto");
    expect(badge.className).toContain("brand-danger");
  });

  it("usa estilos amber para nivel MEDIO", () => {
    render(<RiskBadge level="MEDIO" />);
    const badge = screen.getByLabelText("Riesgo medio");
    expect(badge.className).toContain("amber");
  });

  it("usa estilos emerald para nivel BAJO", () => {
    render(<RiskBadge level="BAJO" />);
    const badge = screen.getByLabelText("Riesgo bajo");
    expect(badge.className).toContain("emerald");
  });

  it("renderiza 'Sin análisis' cuando level es null", () => {
    render(<RiskBadge level={null} />);
    expect(screen.getByLabelText("Sin análisis")).toBeInTheDocument();
    expect(screen.getByText("Sin análisis")).toBeInTheDocument();
  });
});
