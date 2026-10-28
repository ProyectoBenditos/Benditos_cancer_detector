import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  loadBlindContext: vi.fn(),
  rows: [] as unknown[],
  tableProps: [] as Array<{ uploads: Array<Record<string, unknown>> }>,
}));

function makeQuery() {
  const chain: Record<string, unknown> = {};
  ["select", "order", "or"].forEach((m) => {
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
// Captura las props que el Server Component envía al Client Component (viajan al navegador).
vi.mock("./BatchHistoryTable", () => ({
  BatchHistoryTable: (props: { uploads: Array<Record<string, unknown>> }) => {
    mocks.tableProps.push(props);
    return null;
  },
}));

import UploadsPage from "./page";

function upload(id: string) {
  return {
    id,
    original_name: `${id}.dcm`,
    modality: "CT",
    study_date: null,
    patient_id_dicom: null,
    upload_status: "analyzed",
    created_at: "2026-10-27T10:00:00Z",
    file_type: "dicom",
    ai_score: 0.95,
    ai_risk_level: "ALTO",
    batch_id: "b1",
    metadata_json: {
      case_ref: "Caso-001",
      batch_sequence: 3,
      uploaded_by_email: "medico@example.com",
      subtipo_histologico: { prediccion: "adenocarcinoma", confianza: 0.9 },
      explicabilidad: { metodo: "gradcam" },
      analysis_source_slice: { index: 4, total: 10 },
    },
  };
}

afterEach(() => {
  cleanup();
  mocks.tableProps = [];
});

async function renderPage() {
  render(await UploadsPage({ searchParams: Promise.resolve({}) }));
  return mocks.tableProps[0].uploads;
}

describe("UploadsPage: metadata enviada al navegador", () => {
  it("una fila pendiente no lleva la metadata de IA ni su score", async () => {
    mocks.rows = [upload("pendiente")];
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: true, pendingIds: new Set(["pendiente"]) });
    const [row] = await renderPage();
    expect(row.blind_pending).toBe(true);
    expect(row.ai_score).toBeNull();
    expect(row.metadata_json).toEqual({ case_ref: "Caso-001", batch_sequence: 3 });
    expect(JSON.stringify(row)).not.toContain("subtipo_histologico");
  });

  it("toda fila lleva solo las claves de metadata que la tabla lee (sin email ni IA)", async () => {
    mocks.rows = [upload("revelado"), { ...upload("sin-meta"), metadata_json: null }];
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: false, pendingIds: new Set() });
    const [revelado, sinMeta] = await renderPage();
    expect(revelado.metadata_json).toEqual({ case_ref: "Caso-001", batch_sequence: 3 });
    expect(JSON.stringify(revelado)).not.toContain("medico@example.com");
    expect(JSON.stringify(revelado)).not.toContain("explicabilidad");
    expect(sinMeta.metadata_json).toBeNull();
  });
});
