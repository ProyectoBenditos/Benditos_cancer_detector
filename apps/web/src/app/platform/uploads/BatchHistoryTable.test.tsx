import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { BatchHistoryTable, type UploadRecord } from "./BatchHistoryTable";

afterEach(cleanup);

function row(overrides: Partial<UploadRecord>): UploadRecord {
  return {
    id: "u1",
    original_name: "estudio.dcm",
    modality: "CT",
    study_date: null,
    patient_id_dicom: null,
    upload_status: "analyzed",
    created_at: "2026-10-27T10:00:00Z",
    file_type: "dicom",
    ai_score: null,
    ai_risk_level: null,
    batch_id: null,
    metadata_json: null,
    ...overrides,
  };
}

describe("BatchHistoryTable: lectura ciega", () => {
  it("una fila pendiente muestra 'Pendiente de lectura' y no el porcentaje", () => {
    // Aunque llegaran datos de la IA, la fila pendiente no los muestra.
    render(
      <BatchHistoryTable
        uploads={[row({ id: "p1", ai_score: 0.873, ai_risk_level: "ALTO", blind_pending: true })]}
      />,
    );
    const fila = screen.getByText("estudio.dcm").closest("tr")!;
    expect(within(fila).getByText("Pendiente de lectura")).toBeInTheDocument();
    expect(within(fila).queryByText("87.3%")).toBeNull();
    expect(within(fila).queryByText("ALTO")).toBeNull();
  });

  it("una fila no pendiente sigue mostrando riesgo y score", () => {
    render(<BatchHistoryTable uploads={[row({ ai_score: 0.25, ai_risk_level: "BAJO", blind_pending: false })]} />);
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getByText("BAJO")).toBeInTheDocument();
    expect(screen.queryByText("Pendiente de lectura")).toBeNull();
  });

  it("el riesgo más alto y el promedio de un lote ignoran las filas pendientes", () => {
    render(
      <BatchHistoryTable
        uploads={[
          row({ id: "a", original_name: "a.dcm", batch_id: "b1", ai_score: 0.95, ai_risk_level: "ALTO", blind_pending: true }),
          row({ id: "b", original_name: "b.dcm", batch_id: "b1", ai_score: 0.2, ai_risk_level: "BAJO", blind_pending: false }),
        ]}
      />,
    );
    const lote = screen.getAllByText("batch_001")[0].closest("tr")!;
    expect(within(lote).getByText("BAJO")).toBeInTheDocument();
    expect(within(lote).queryByText("ALTO")).toBeNull();
    expect(within(lote).getByText("20.0%")).toBeInTheDocument();

    // Al desplegar, la imagen pendiente muestra la insignia y no su score.
    fireEvent.click(within(lote).getAllByRole("button")[0]);
    const pendiente = screen.getByText("a.dcm").parentElement!.parentElement!;
    expect(within(pendiente).getByText("Pendiente de lectura")).toBeInTheDocument();
    expect(within(pendiente).queryByText("95.0%")).toBeNull();
    expect(within(pendiente).queryByText("ALTO")).toBeNull();
  });

  it("un lote con todas sus imágenes pendientes muestra 'Pendiente de lectura'", () => {
    render(
      <BatchHistoryTable
        uploads={[
          row({ id: "a", batch_id: "b1", blind_pending: true }),
          row({ id: "b", batch_id: "b1", blind_pending: true }),
        ]}
      />,
    );
    const lote = screen.getAllByText("batch_001")[0].closest("tr")!;
    expect(within(lote).getByText("Pendiente de lectura")).toBeInTheDocument();
    expect(within(lote).queryByText("Sin análisis")).toBeNull();
  });
});
