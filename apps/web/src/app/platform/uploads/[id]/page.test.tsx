import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const UPLOAD_ID = "11111111-2222-4333-8444-555555555555";

const mocks = vi.hoisted(() => ({
  loadBlindContext: vi.fn(),
  results: {} as Record<string, { data: unknown; error: unknown }>,
  viewerProps: [] as Array<Record<string, unknown>>,
  workspaceProps: [] as Array<Record<string, unknown>>,
  reviewFormProps: [] as Array<Record<string, unknown>>,
}));

// Cadena de consulta: cualquier método devuelve la cadena; al esperarla resuelve
// el resultado configurado para la tabla.
function makeQuery(table: string) {
  const chain: Record<string, unknown> = {};
  ["select", "eq", "order", "single", "maybeSingle", "returns"].forEach((m) => {
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
    storage: {
      from: () => ({
        createSignedUrl: () => Promise.resolve({ data: { signedUrl: "https://firmada.example/antes.png" } }),
      }),
    },
  }),
}));
vi.mock("@/lib/blindReading", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/blindReading")>()),
  loadBlindContext: mocks.loadBlindContext,
}));
vi.mock("./actions", () => ({
  saveAnnotationAction: vi.fn(),
  deleteAnnotationAction: vi.fn(),
  saveUploadReviewAction: vi.fn(),
}));
// Captura las props que el Server Component envía a los Client Components (viajan al navegador).
vi.mock("@/components/dicom/StudyViewerTabs", () => ({
  StudyViewerTabs: (props: Record<string, unknown>) => {
    mocks.viewerProps.push(props);
    return null;
  },
}));
vi.mock("./BlindReadingWorkspace", () => ({
  BlindReadingWorkspace: (props: Record<string, unknown>) => {
    mocks.workspaceProps.push(props);
    return null;
  },
}));
vi.mock("./ClinicalReviewForm", () => ({
  ClinicalReviewForm: (props: Record<string, unknown>) => {
    mocks.reviewFormProps.push(props);
    return null;
  },
}));
vi.mock("@/components/dicom/AnonymizationCertificate", () => ({
  AnonymizationCertificate: () => null,
}));

import UploadDetailPage from "./page";

const UPLOAD = {
  id: UPLOAD_ID,
  user_id: "u1",
  original_name: "estudio.dcm",
  file_type: "dicom",
  file_size: 2048,
  modality: "CT",
  study_date: null,
  patient_id: null,
  patient_id_dicom: null,
  upload_status: "analyzed",
  storage_path: "u1/estudio.dcm",
  preview_storage_path: "u1/estudio.png",
  created_at: "2026-10-27T10:00:00Z",
  ai_score: 0.937,
  ai_risk_level: "ALTO",
  ai_recommendation: "RECOMENDACION-IA-SECRETA",
  ai_heatmap_base64: "HEATMAP-BASE64-SECRETO",
  ai_model_version: "modelo-v1.2",
  ai_processed_at: "2026-10-27T10:05:00Z",
  model_version: "modelo-v1.2",
  inference_time_ms: 1234,
  predicted_at: "2026-10-27T10:05:00Z",
  clinical_features: null,
  metadata_json: {
    case_ref: "Caso-001",
    lobar_info: { codigo: "LOBULO-IA" },
    subtipo_histologico: { prediccion: "adenocarcinoma", confianza: 0.9 },
    analysis_source_slice: 4,
    volume_metadata: { num_slices: 10 },
  },
};

const IMPRESSION = {
  lung_rads: "2",
  conducta: "tac_12m",
  notes: null,
  markers_snapshot: [],
  revealed_at: "2026-10-27T12:00:00Z",
};

function setResults(overrides: Record<string, { data: unknown; error: unknown }> = {}) {
  mocks.results = {
    dicom_uploads: { data: UPLOAD, error: null },
    upload_reviews: { data: null, error: null },
    upload_initial_impressions: { data: null, error: null },
    upload_annotations: { data: [], error: null },
    dicom_anonymization_audit: { data: null, error: null },
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  mocks.viewerProps = [];
  mocks.workspaceProps = [];
  mocks.reviewFormProps = [];
});

async function renderPage() {
  return render(await UploadDetailPage({ params: Promise.resolve({ id: UPLOAD_ID }) }));
}

describe("UploadDetailPage: lectura ciega pendiente", () => {
  it("no envía al navegador nada derivado de la IA", async () => {
    setResults();
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: true, pendingIds: new Set([UPLOAD_ID]) });
    const { container } = await renderPage();

    expect(mocks.workspaceProps).toHaveLength(1);
    expect(mocks.viewerProps).toHaveLength(0);
    expect(mocks.reviewFormProps).toHaveLength(0);

    const serialized = JSON.stringify(mocks.workspaceProps[0]);
    for (const secret of [
      "0.937",
      "ALTO",
      "RECOMENDACION-IA-SECRETA",
      "HEATMAP-BASE64-SECRETO",
      "heatmap",
      "subtipo_histologico",
      "adenocarcinoma",
      "lobar_info",
      "LOBULO-IA",
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect(mocks.workspaceProps[0].beforeUrl).toBe("https://firmada.example/antes.png");

    expect(screen.queryByRole("link", { name: /Ver Informe Estandarizado/ })).toBeNull();
    expect(screen.queryByText("Metadata de inferencia")).toBeNull();
    expect(screen.queryByText("Resultado del análisis IA")).toBeNull();
    for (const secret of ["93.7%", "RECOMENDACION-IA-SECRETA", "HEATMAP-BASE64-SECRETO", "adenocarcinoma"]) {
      expect(container.innerHTML).not.toContain(secret);
    }
  });
});

describe("UploadDetailPage: estudio revelado con impresión inicial", () => {
  it("muestra la impresión y prellena la valoración cuando aún no hay una", async () => {
    setResults({ upload_initial_impressions: { data: IMPRESSION, error: null } });
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: true, pendingIds: new Set() });
    await renderPage();

    expect(mocks.workspaceProps).toHaveLength(0);
    expect(mocks.viewerProps).toHaveLength(1);
    expect(screen.getByRole("heading", { name: /Impresión inicial \(antes de la IA\)/ })).toBeInTheDocument();
    expect(mocks.reviewFormProps).toHaveLength(1);
    expect(mocks.reviewFormProps[0].impressionDefaults).toEqual({ lung_rads: "2", conducta: "tac_12m" });
    expect(screen.getByRole("link", { name: /Ver Informe Estandarizado/ })).toBeInTheDocument();
  });

  it("con valoración guardada no prellena desde la impresión", async () => {
    setResults({
      upload_initial_impressions: { data: IMPRESSION, error: null },
      upload_reviews: {
        data: { concordancia: "concuerda", lung_rads: "4A", nodule_size_mm: 9, conducta: "pet_tc", notes: null },
        error: null,
      },
    });
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: true, pendingIds: new Set() });
    await renderPage();

    expect(mocks.reviewFormProps[0].impressionDefaults).toBeNull();
  });
});
