import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const UPLOAD_ID = "11111111-2222-4333-8444-555555555555";

const mocks = vi.hoisted(() => ({
  results: {} as Record<string, { data: unknown; error: unknown }>,
}));

function makeQuery(table: string) {
  const chain: Record<string, unknown> = {};
  ["select", "eq", "single", "maybeSingle"].forEach((m) => {
    chain[m] = () => chain;
  });
  chain.then = (resolve: (r: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(mocks.results[table] ?? { data: null, error: null }).then(resolve);
  return chain;
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    from: (table: string) => makeQuery(table),
    storage: { from: () => ({ createSignedUrl: () => Promise.resolve({ data: null }) }) },
  }),
}));
vi.mock("@/lib/blindReading", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/blindReading")>()),
  loadBlindContext: vi.fn().mockResolvedValue({ enabled: false, pendingIds: new Set() }),
}));
vi.mock("@/components/informe/ReportPrintControls", () => ({ ReportPrintControls: () => null }));
vi.mock("@/components/informe/RiskGaugeBar", () => ({ RiskGaugeBar: () => null }));
vi.mock("@/components/informe/MorphologyBars", () => ({ MorphologyBars: () => null }));
vi.mock("@/components/informe/AnatomicalLungsDiagram", () => ({ AnatomicalLungsDiagram: () => null }));
vi.mock("@/components/informe/HistologicalSubtypeCard", () => ({ HistologicalSubtypeCard: () => null }));

import InformeClinicoPage from "./page";

const UPLOAD = {
  id: UPLOAD_ID,
  original_name: "estudio.dcm",
  storage_path: "u1/estudio.dcm",
  upload_status: "analyzed",
  created_at: "2026-10-27T10:00:00Z",
  ai_risk_level: "ALTO",
  ai_score: 0.95,
  clinical_features: null,
  metadata_json: {},
};

function setResults(overrides: Record<string, { data: unknown; error: unknown }> = {}) {
  mocks.results = {
    dicom_uploads: { data: UPLOAD, error: null },
    upload_reviews: { data: null, error: null },
    upload_initial_impressions: { data: null, error: null },
    dicom_anonymization_audit: { data: null, error: null },
    ...overrides,
  };
}

afterEach(cleanup);

async function renderPage() {
  render(await InformeClinicoPage({ params: Promise.resolve({ id: UPLOAD_ID }) }));
}

describe("Informe: categoría Lung-RADS y conducta", () => {
  it("sin valoración ni impresión no deriva la categoría de la IA aunque el riesgo sea ALTO", async () => {
    setResults();
    await renderPage();
    expect(screen.getAllByText("Sin asignar — pendiente del especialista")).toHaveLength(2);
    expect(screen.queryByText(/Categoría 4B/)).toBeNull();
    expect(screen.queryByText(/riesgo referencial/)).toBeNull();
  });

  it("si la consulta de la impresión falla, se trata como sin impresión", async () => {
    setResults({ upload_initial_impressions: { data: null, error: { message: "relation does not exist" } } });
    await renderPage();
    expect(screen.getAllByText("Sin asignar — pendiente del especialista")).toHaveLength(2);
  });

  it("con impresión 2 la muestra rotulada como impresión inicial", async () => {
    setResults({ upload_initial_impressions: { data: { lung_rads: "2", conducta: "tac_12m" }, error: null } });
    await renderPage();
    expect(screen.getByText("Categoría 2")).toBeInTheDocument();
    expect(screen.getByText("TAC de control a 12 meses")).toBeInTheDocument();
    expect(screen.getAllByText(/Impresión inicial \(antes de la IA\)/)).toHaveLength(2);
  });

  it("con valoración muestra la de la valoración", async () => {
    setResults({
      upload_reviews: { data: { lung_rads: "4A", conducta: "pet_tc", notes: null, nodule_size_mm: null }, error: null },
      upload_initial_impressions: { data: { lung_rads: "2", conducta: "tac_12m" }, error: null },
    });
    await renderPage();
    expect(screen.getByText("Categoría 4A")).toBeInTheDocument();
    expect(screen.getByText("Categoría Lung-RADS Registrada")).toBeInTheDocument();
    expect(screen.getByText("PET-TC")).toBeInTheDocument();
  });
});
