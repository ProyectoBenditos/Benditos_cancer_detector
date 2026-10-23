import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HistologicalSubtypeCard } from "./HistologicalSubtypeCard";

const AVISO =
  "Clasificador entrenado con el dataset CLID; no se ha validado en LIDC-IDRI ni en tomografías de esta plataforma.";

describe("HistologicalSubtypeCard", () => {
  it("no inventa sensibilidad cuando el modelo no aporta esa métrica", () => {
    render(
      <HistologicalSubtypeCard
        data={{ prediccion: "Normal", confianza: 0.7 }}
        riskLevel="MEDIO"
      />
    );
    expect(screen.queryByText(/Sensibilidad:/)).not.toBeInTheDocument();
  });
  it("muestra fallback cuando no hay datos de subtipo", () => {
    render(
      <HistologicalSubtypeCard
        data={null}
        riskLevel="MEDIO"
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
        riskLevel="ALTO"
        pathOrientationFallback="Alta espiculación"
      />
    );

    const matches = screen.getAllByText("Adenocarcinoma Pulmonar");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("94.2% probabilidad del modelo")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sensibilidad en el conjunto de prueba CLID (no aplicable a estas TC): 99.39%"
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Sensibilidad: 99.39%/)).not.toBeInTheDocument();
    expect(screen.getByText("TTF-1 (+)")).toBeInTheDocument();
    expect(screen.getByText("p40 (-)")).toBeInTheDocument();
    expect(screen.getByText(/Alta espiculación/)).toBeInTheDocument();
  });

  const data2 = { prediccion: "Adenocarcinoma Pulmonar", confianza: 0.942 };

  it.each([["BAJO" as const], [null]])(
    "con riesgo %s solo muestra el texto alternativo y no el subtipo",
    (risk) => {
      render(
        <HistologicalSubtypeCard
          data={data2}
          riskLevel={risk}
          pathOrientationFallback="Orientación de prueba"
        />
      );
      expect(screen.getByText("Orientación de prueba")).toBeInTheDocument();
      expect(screen.queryByText("Adenocarcinoma Pulmonar")).not.toBeInTheDocument();
      expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    }
  );

  it("con riesgo alto no usa la palabra Confianza y muestra el aviso de no validación", () => {
    const { container } = render(<HistologicalSubtypeCard data={data2} riskLevel="ALTO" />);
    expect(screen.getByText("94.2% probabilidad del modelo")).toBeInTheDocument();
    expect(screen.queryByText(/Confianza/)).not.toBeInTheDocument();
    expect(screen.getByText(AVISO)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("emerald");
  });

  it("con riesgo medio muestra el subtipo y el aviso", () => {
    render(<HistologicalSubtypeCard data={data2} riskLevel="MEDIO" />);
    expect(screen.getAllByText("Adenocarcinoma Pulmonar").length).toBeGreaterThan(0);
    expect(screen.getByText(AVISO)).toBeInTheDocument();
  });
});
