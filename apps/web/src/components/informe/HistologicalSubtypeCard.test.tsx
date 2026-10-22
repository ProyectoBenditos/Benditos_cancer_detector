import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HistologicalSubtypeCard } from "./HistologicalSubtypeCard";

describe("HistologicalSubtypeCard", () => {
  it("no inventa sensibilidad cuando el modelo no aporta esa métrica", () => {
    render(<HistologicalSubtypeCard data={{ prediccion: "Normal", confianza: 0.7 }} />);
    expect(screen.queryByText(/Sensibilidad:/)).not.toBeInTheDocument();
  });
  it("muestra fallback cuando no hay datos de subtipo", () => {
    render(
      <HistologicalSubtypeCard
        data={null}
        pathOrientationFallback="Orientación morfológica de prueba"
      />
    );
    expect(screen.getByText("Orientación Morfopatológica Preliminar:")).toBeInTheDocument();
    expect(screen.getByText("Orientación morfológica de prueba")).toBeInTheDocument();
  });

  it("renderiza correctamente los datos del subtipo histológico", () => {
    const data = {
      prediccion: "Adenocarcinoma Pulmonar",
      confianza: 0.942,
      sensibilidad_referencial: 0.9939,
      probabilidades: {
        "Adenocarcinoma Pulmonar": 0.942,
        "Carcinoma Escamocelular": 0.041,
        "Carcinoma de Células Grandes": 0.012,
        "Tejido Benigno / Normal": 0.005,
      },
      biomarcadores_recomendados: ["TTF-1 (+)", "Napsina A (+)", "p40 (-)"],
    };

    render(
      <HistologicalSubtypeCard
        data={data}
        pathOrientationFallback="Alta espiculación"
      />
    );

    const matches = screen.getAllByText("Adenocarcinoma Pulmonar");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("94.2% Confianza")).toBeInTheDocument();
    expect(screen.getByText(/Sensibilidad: 99.39%/)).toBeInTheDocument();
    expect(screen.getByText("TTF-1 (+)")).toBeInTheDocument();
    expect(screen.getByText("p40 (-)")).toBeInTheDocument();
    expect(screen.getByText(/Alta espiculación/)).toBeInTheDocument();
  });
});
