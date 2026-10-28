import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  loadBlindContext: vi.fn(),
  rows: [] as unknown[],
  queryError: null as { message: string } | null,
}));

// Query builder fluido: soporta cadenas arbitrarias y es awaitable
function makeQuery() {
  const q: Record<string, unknown> = {};
  const self = q;
  ["select", "eq", "not", "order"].forEach((m) => {
    self[m] = vi.fn().mockReturnValue(self);
  });
  // thenable — permite `await query`
  self["then"] = (
    resolve: (v: { data: unknown[] | null; error: { message: string } | null }) => void,
    reject?: (e: unknown) => void
  ) =>
    Promise.resolve(
      mocks.queryError ? { data: null, error: mocks.queryError } : { data: mocks.rows, error: null },
    ).then(resolve, reject);
  return self;
}

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => makeQuery()),
  }),
}));

vi.mock("@/lib/blindReading", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/blindReading")>()),
  loadBlindContext: mocks.loadBlindContext,
}));

import { GET } from "./route";

function upload(id: string, ai_score: number, ai_risk_level: string) {
  return {
    id,
    original_name: `${id}.dcm`,
    modality: "CT",
    study_date: null,
    ai_risk_level,
    ai_score,
    ai_recommendation: "Seguimiento",
    ai_model_version: "v1.2",
    upload_status: "analyzed",
    created_at: "2026-10-27T10:00:00Z",
    metadata_json: null,
  };
}

describe("GET /platform/reportes/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows = [];
    mocks.queryError = null;
    mocks.loadBlindContext.mockResolvedValue({ enabled: false, pendingIds: new Set() });
  });

  it("devuelve 401 cuando no hay sesión de usuario", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    const req = new NextRequest("http://localhost/platform/reportes/download");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("devuelve CSV (200) cuando el usuario está autenticado", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } } });
    const req = new NextRequest("http://localhost/platform/reportes/download");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
  });

  it("aplica filtro alto_riesgo cuando tipo=alto_riesgo", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } } });
    const req = new NextRequest("http://localhost/platform/reportes/download?tipo=alto_riesgo");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("alto_riesgo");
  });

  it("no incluye los estudios pendientes de lectura ciega", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } } });
    mocks.loadBlindContext.mockResolvedValueOnce({ enabled: true, pendingIds: new Set(["pendiente-1"]) });
    mocks.rows = [upload("pendiente-1", 0.95, "ALTO"), upload("revelado-1", 0.2, "BAJO")];
    const req = new NextRequest("http://localhost/platform/reportes/download");
    const csv = await (await GET(req)).text();
    expect(csv).toContain("revelado-1");
    expect(csv).not.toContain("pendiente-1");
    expect(csv).not.toContain("95.00");
  });

  it("falla cerrado con un texto fijo si no se puede saber qué está pendiente", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } } });
    mocks.loadBlindContext.mockRejectedValueOnce(new Error("detalle interno"));
    mocks.rows = [upload("pendiente-1", 0.95, "ALTO")];
    const req = new NextRequest("http://localhost/platform/reportes/download");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).not.toContain("pendiente-1");
    expect(body).not.toContain("detalle interno");
  });

  it("si la consulta falla responde con un texto fijo, sin el detalle de Supabase", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } } });
    mocks.queryError = { message: 'relation "dicom_uploads" does not exist' };
    const req = new NextRequest("http://localhost/platform/reportes/download");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).not.toContain("dicom_uploads");
    expect(body).not.toContain("does not exist");
    expect(JSON.parse(body)).toEqual({ error: "No se pudo generar el reporte." });
  });
});
