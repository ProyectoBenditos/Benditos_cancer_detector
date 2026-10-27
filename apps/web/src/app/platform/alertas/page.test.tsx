import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  loadBlindContext: vi.fn(),
  rows: [] as unknown[],
}));

function makeQuery() {
  const chain: Record<string, unknown> = {};
  ["select", "eq", "order"].forEach((m) => {
    chain[m] = () => chain;
  });
  chain.then = (resolve: (r: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve({ data: mocks.rows, error: null }).then(resolve);
  return chain;
}

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    from: () => makeQuery(),
  }),
}));
vi.mock("@/lib/blindReading", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/blindReading")>()),
  loadBlindContext: mocks.loadBlindContext,
}));

import AlertasPage from "./page";

const NOTE = "Los estudios con lectura ciega pendiente aparecen aquí cuando registras tu impresión.";

function alerta(id: string, ai_score: number) {
  return {
    id,
    original_name: `${id}.dcm`,
    modality: "CT",
    ai_score,
    ai_risk_level: "ALTO",
    ai_recommendation: "Biopsia",
    ai_processed_at: null,
    patient_id_dicom: null,
  };
}

afterEach(cleanup);

describe("AlertasPage: lectura ciega", () => {
  it("quita los estudios pendientes y muestra la nota fija", async () => {
    mocks.rows = [alerta("pendiente", 0.95), alerta("revelado", 0.81)];
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: true, pendingIds: new Set(["pendiente"]) });
    render(await AlertasPage());
    expect(screen.getByText("revelado.dcm")).toBeInTheDocument();
    expect(screen.queryByText("pendiente.dcm")).toBeNull();
    expect(screen.queryByText("95.0%")).toBeNull();
    expect(screen.getByText("1 estudio requiere evaluación urgente")).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
  });

  it("con la lectura ciega activa muestra la nota aunque no haya pendientes", async () => {
    mocks.rows = [];
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: true, pendingIds: new Set() });
    render(await AlertasPage());
    expect(screen.getByText(NOTE)).toBeInTheDocument();
  });

  it("con la lectura ciega apagada no muestra la nota", async () => {
    mocks.rows = [alerta("revelado", 0.81)];
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: false, pendingIds: new Set() });
    render(await AlertasPage());
    expect(screen.getByText("revelado.dcm")).toBeInTheDocument();
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});
